import { defineStore } from 'pinia'
import { spaceRepo, currentSpaceRepo } from '@/services/db'
import { uid } from '@/utils/id'
import { todayStr } from '@/utils/date'
import { useItemStore } from './items'
import { useRecordStore } from './records'

// 删除空间时物品的处理方式：
// - delete：物品连同其保养/维修记录一起删除
// - move：物品连同记录迁移到目标空间
export const DELETE_STRATEGIES = [
  { value: 'move', label: '迁移到其他空间' },
  { value: 'delete', label: '一并删除' }
]

export const useSpaceStore = defineStore('spaces', {
  state: () => ({
    spaces: spaceRepo.get(),
    currentId: currentSpaceRepo.get()
  }),
  getters: {
    currentSpace: (state) => state.spaces.find((s) => s.id === state.currentId) || state.spaces[0],
    spaceName: (state) => (id) => {
      const s = state.spaces.find((x) => x.id === id)
      return s ? s.name : ''
    },
    spaceCount: (state) => state.spaces.length,
    movableSpaces: (state) => (excludeId) => state.spaces.filter((s) => s.id !== excludeId)
  },
  actions: {
    addSpace(name) {
      const space = {
        id: uid('sp_'),
        name: (name || '').trim() || '未命名空间',
        createdAt: todayStr()
      }
      this.spaces.push(space)
      spaceRepo.set(this.spaces)
      this.switchSpace(space.id)
      return space
    },
    renameSpace(id, name) {
      const space = this.spaces.find((s) => s.id === id)
      if (!space) return
      space.name = (name || '').trim() || space.name
      spaceRepo.set(this.spaces)
    },
    switchSpace(id) {
      if (!this.spaces.some((s) => s.id === id)) return
      this.currentId = id
      currentSpaceRepo.set(id)
    },
    // 删除空间。strategy = 'move' 时需传 targetId，物品与记录迁入；
    // strategy = 'delete' 时物品与记录一并删除。至少保留一个空间。
    removeSpace(id, { strategy, targetId } = {}) {
      if (this.spaces.length <= 1) return
      const target = strategy === 'move' ? this.spaces.find((s) => s.id === targetId && s.id !== id) : null
      if (strategy === 'move' && !target) return

      const itemStore = useItemStore()
      const recordStore = useRecordStore()

      if (target) {
        itemStore.reassignSpace(id, target.id)
        recordStore.reassignSpace(id, target.id)
      } else {
        recordStore.removeBySpace(id)
        itemStore.items
          .filter((i) => i.spaceId === id)
          .forEach((i) => itemStore.removeItem(i.id, { silent: true }))
        itemStore.persist()
      }

      this.spaces = this.spaces.filter((s) => s.id !== id)
      spaceRepo.set(this.spaces)

      if (this.currentId === id) {
        this.switchSpace(target ? target.id : this.spaces[0].id)
      }
    }
  }
})
