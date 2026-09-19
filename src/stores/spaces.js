import { defineStore } from 'pinia'
import { spaceRepo, currentSpaceRepo, itemRepo, recordRepo } from '@/services/db'
import { uid } from '@/utils/id'
import { todayStr } from '@/utils/date'
import { useItemStore } from './items'
import { useRecordStore } from './records'

// 全部空间视图的特殊 id
export const ALL_SPACES = 'all'

// 首次启动 / 老用户升级：没有任何空间时创建默认空间"我的家"，
// 并把历史物品与记录归到该空间下，保证旧数据可见。
// 在模块加载阶段执行（仅依赖 repo），确保其他 store 实例化前 localStorage 已完成迁移。
function bootstrap() {
  let spaces = spaceRepo.get()
  let current = currentSpaceRepo.get()

  if (!Array.isArray(spaces) || !spaces.length) {
    const home = {
      id: uid('sp_'),
      name: '我的家',
      note: '',
      createdAt: todayStr()
    }
    spaces = [home]
    spaceRepo.set(spaces)

    const items = itemRepo.get()
    if (items.length) {
      itemRepo.set(items.map((i) => ({ ...i, spaceId: home.id })))
    }
    const records = recordRepo.get()
    if (records.length) {
      recordRepo.set(records.map((r) => ({ ...r, spaceId: home.id })))
    }

    current = home.id
    currentSpaceRepo.set(current)
  } else {
    // 修正指向已删除空间的悬空数据，统一归入第一个空间
    const validIds = new Set(spaces.map((s) => s.id))
    const fallback = spaces[0].id
    const items = itemRepo.get()
    let itemsChanged = false
    const nextItems = items.map((i) => {
      if (!i.spaceId || !validIds.has(i.spaceId)) {
        itemsChanged = true
        return { ...i, spaceId: fallback }
      }
      return i
    })
    if (itemsChanged) itemRepo.set(nextItems)

    const records = recordRepo.get()
    let recordsChanged = false
    const nextRecords = records.map((r) => {
      if (!r.spaceId || !validIds.has(r.spaceId)) {
        recordsChanged = true
        return { ...r, spaceId: fallback }
      }
      return r
    })
    if (recordsChanged) recordRepo.set(nextRecords)

    if (current !== ALL_SPACES && !validIds.has(current)) {
      current = fallback
      currentSpaceRepo.set(current)
    }
  }

  return { spaces, current }
}

// 模块加载即完成数据迁移
bootstrap()

export const useSpaceStore = defineStore('spaces', {
  state: () => ({
    spaces: spaceRepo.get(),
    currentId: currentSpaceRepo.get()
  }),
  getters: {
    currentSpace: (state) => state.spaces.find((s) => s.id === state.currentId) || null,
    isAllSpaces: (state) => state.currentId === ALL_SPACES,
    spaceById: (state) => (id) => state.spaces.find((s) => s.id === id) || null,
    spaceName: (state) => (id) => state.spaces.find((s) => s.id === id)?.name || '未分组',

    // —— 按当前空间过滤的业务数据 ——
    scopedItems() {
      const items = useItemStore().items
      return this.currentId === ALL_SPACES ? items : items.filter((i) => i.spaceId === this.currentId)
    },
    scopedRecords() {
      const records = useRecordStore().records
      return this.currentId === ALL_SPACES
        ? records
        : records.filter((r) => r.spaceId === this.currentId)
    },
    // 每个空间的物品数，用于空间列表与删除提示
    itemCountBySpace() {
      const counter = {}
      for (const s of this.spaces) counter[s.id] = 0
      for (const i of useItemStore().items) {
        if (counter[i.spaceId] == null) counter[i.spaceId] = 0
        counter[i.spaceId] += 1
      }
      return counter
    }
  },
  actions: {
    switchSpace(id) {
      this.currentId = id
      currentSpaceRepo.set(id)
    },
    addSpace(payload) {
      const space = {
        id: uid('sp_'),
        name: (payload.name || '').trim() || '未命名空间',
        note: (payload.note || '').trim(),
        createdAt: todayStr()
      }
      this.spaces.push(space)
      spaceRepo.set(this.spaces)
      this.switchSpace(space.id)
      return space
    },
    updateSpace(id, payload) {
      const idx = this.spaces.findIndex((s) => s.id === id)
      if (idx === -1) return
      this.spaces[idx] = {
        ...this.spaces[idx],
        name: (payload.name || '').trim() || this.spaces[idx].name,
        note: (payload.note ?? this.spaces[idx].note).trim()
      }
      spaceRepo.set(this.spaces)
    },

    // 删除空间。
    // mode: 'move'  -> 物品与记录迁移到 targetSpaceId
    //        'delete' -> 空间内物品及其记录一并删除
    removeSpace(id, { mode, targetSpaceId } = {}) {
      if (this.spaces.length <= 1) {
        alert('至少需要保留一个空间')
        return false
      }
      if (mode === 'move') {
        if (!targetSpaceId || targetSpaceId === id || !this.spaceById(targetSpaceId)) {
          alert('请选择要迁入的空间')
          return false
        }
        const itemStore = useItemStore()
        const recordStore = useRecordStore()
        for (const item of itemStore.itemsBySpace(id)) {
          itemStore.updateItem(item.id, { spaceId: targetSpaceId })
          recordStore.moveRecordsByItem(item.id, targetSpaceId)
        }
        // 兜底：没有对应物品、直接挂在空间上的记录也一起迁走
        let orphanMoved = false
        recordStore.records = recordStore.records.map((r) => {
          if (r.spaceId === id && (!r.itemId || !itemStore.itemById(r.itemId))) {
            orphanMoved = true
            return { ...r, spaceId: targetSpaceId }
          }
          return r
        })
        if (orphanMoved) recordRepo.set(recordStore.records)
      } else if (mode === 'delete') {
        const itemStore = useItemStore()
        const recordStore = useRecordStore()
        const removeItemIds = new Set(itemStore.itemsBySpace(id).map((i) => i.id))
        for (const itemId of removeItemIds) itemStore.removeItem(itemId)
        // 记录跟随物品：空间内物品的记录 + 直接归属该空间的记录都清掉
        for (const r of recordStore.records.filter(
          (x) => x.spaceId === id || (x.itemId && removeItemIds.has(x.itemId))
        )) {
          recordStore.removeRecord(r.id)
        }
      } else {
        return false
      }

      this.spaces = this.spaces.filter((s) => s.id !== id)
      spaceRepo.set(this.spaces)
      if (this.currentId === id) this.switchSpace(this.spaces[0].id)
      return true
    }
  }
})
