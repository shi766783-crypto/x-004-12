// 空间功能端到端验证：内存版 localStorage + 真实 store，跑完即删。
// 运行：node scripts/test-spaces.mjs
import { register } from 'node:module'

// --- 内存版 localStorage ---
const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k)
}
globalThis.alert = (msg) => {
  process._rawDebug('[alert] ' + msg)
}

// --- 把 @/ 别名解析到 src ---
register(new URL('./alias-loader.mjs', import.meta.url))

const assert = (cond, msg) => {
  if (!cond) {
    console.error('❌ ' + msg)
    process.exitCode = 1
  } else {
    console.log('✅ ' + msg)
  }
}

const { createPinia, setActivePinia } = await import('pinia')

// 场景 1：老用户（已有物品/记录，没有空间）首次加载
mem.set(
  'hmm.items',
  JSON.stringify([
    { id: 'it_1', name: '空调', category: 'appliance' },
    { id: 'it_2', name: '沙发', category: 'furniture' }
  ])
)
mem.set('hmm.records', JSON.stringify([{ id: 'rec_1', itemId: 'it_1', type: 'repair', cost: 100 }]))

setActivePinia(createPinia())
const { useSpaceStore } = await import('../src/stores/spaces.js')
const { useItemStore } = await import('../src/stores/items.js')
const { useRecordStore } = await import('../src/stores/records.js')

let spaceStore = useSpaceStore()
let itemStore = useItemStore()
let recordStore = useRecordStore()

assert(spaceStore.spaces.length === 1, '迁移：自动创建 1 个默认空间')
assert(spaceStore.spaces[0].name === '我的家', '迁移：默认空间名为"我的家"')
assert(itemStore.items.every((i) => i.spaceId === spaceStore.spaces[0].id), '迁移：全部物品归入默认空间')
assert(recordStore.records.every((r) => r.spaceId === spaceStore.spaces[0].id), '迁移：全部记录归入默认空间')
assert(!spaceStore.isAllSpaces, '初始视图为具体空间而非"全部空间"')

const home = spaceStore.spaces[0]

// 场景 2：新建第二个空间（父母家），在其中加物品
const parents = spaceStore.addSpace({ name: '父母家', note: '城东' })
assert(spaceStore.currentId === parents.id, '新建空间后自动切换到该空间')
const fridge = itemStore.addItem({ name: '冰箱', category: 'appliance' })
assert(fridge.spaceId === parents.id, '新物品自动归属当前空间')
const rec2 = recordStore.addRecord({ itemId: fridge.id, date: '2026-09-01', type: 'maintenance', cost: 0 })
assert(rec2.spaceId === parents.id, '新记录跟随物品归属空间')

// 场景 3：空间过滤
spaceStore.switchSpace(home.id)
assert(spaceStore.scopedItems.length === 2, '我的家：看到 2 个物品')
assert(spaceStore.scopedRecords.length === 1, '我的家：看到 1 条记录')
spaceStore.switchSpace(parents.id)
assert(spaceStore.scopedItems.length === 1, '父母家：看到 1 个物品')
assert(spaceStore.scopedRecords.length === 1, '父母家：看到 1 条记录')
spaceStore.switchSpace('all')
assert(spaceStore.scopedItems.length === 3, '全部空间：看到 3 个物品')
assert(spaceStore.scopedRecords.length === 2, '全部空间：看到 2 条记录')

// 场景 4：删除空间——迁移模式
// 先在父母家造一条没有对应物品的孤立记录（历史数据可能存在）
recordStore.records.push({ id: 'rec_orphan', itemId: '', spaceId: parents.id, type: 'repair', cost: 50 })
spaceStore.switchSpace(home.id)
const ok = spaceStore.removeSpace(parents.id, { mode: 'move', targetSpaceId: home.id })
assert(ok, '删除父母家（迁移模式）成功')
assert(itemStore.items.length === 3, '迁移删除：物品一个不少')
assert(recordStore.records.length === 3, '迁移删除：记录一个不少（含孤立记录）')
assert(itemStore.itemById(fridge.id).spaceId === home.id, '迁移删除：冰箱已迁入我的家')
assert(recordStore.records.find((r) => r.id === rec2.id).spaceId === home.id, '迁移删除：冰箱的记录跟随迁入')
assert(recordStore.records.find((r) => r.id === 'rec_orphan').spaceId === home.id, '迁移删除：孤立记录也迁入我的家')
assert(!spaceStore.spaces.some((s) => s.id === parents.id), '迁移删除：空间本身已移除')

// 场景 5：删除空间——级联删除模式
const rental = spaceStore.addSpace({ name: '出租房' })
const heater = itemStore.addItem({ name: '热水器' })
recordStore.addRecord({ itemId: heater.id, date: '2026-08-01', type: 'repair', cost: 300 })
const beforeItems = itemStore.items.length
const beforeRecords = recordStore.records.length
const ok2 = spaceStore.removeSpace(rental.id, { mode: 'delete' })
assert(ok2, '删除出租房（级联模式）成功')
assert(itemStore.items.length === beforeItems - 1, '级联删除：空间内物品已删除')
assert(recordStore.records.length === beforeRecords - 1, '级联删除：空间内记录已删除')
assert(spaceStore.currentId === home.id, '级联删除正在查看的空间后回退到剩余空间')

// 场景 6：最后一个空间不允许删除
const ok3 = spaceStore.removeSpace(home.id, { mode: 'delete' })
assert(ok3 === false, '最后一个空间禁止删除')

// 场景 7：全新用户——不产生多余迁移痕迹
mem.clear()
const pinia2 = createPinia()
setActivePinia(pinia2)
// 重新导入以获得全新模块状态
const fresh = await import('../src/stores/spaces.js?fresh=' + Date.now())
const freshItemMod = await import('../src/stores/items.js?fresh=' + Date.now())
const s2 = fresh.useSpaceStore()
const i2 = freshItemMod.useItemStore()
assert(s2.spaces.length === 1 && i2.items.length === 0, '全新用户：1 个空的默认空间')

// 场景 8：悬空 spaceId 自愈（模拟空间键被异常删掉的情况）
mem.clear()
mem.set('hmm.spaces', JSON.stringify([{ id: 'sp_a', name: 'A', note: '', createdAt: '' }]))
mem.set('hmm.items', JSON.stringify([{ id: 'it_x', name: '孤儿物品', spaceId: 'sp_gone' }]))
mem.set('hmm.records', JSON.stringify([{ id: 'rec_x', itemId: 'it_x', spaceId: 'sp_gone' }]))
const s3mod = await import('../src/stores/spaces.js?fresh2=' + Date.now())
const i3mod = await import('../src/stores/items.js?fresh2=' + Date.now())
const r3mod = await import('../src/stores/records.js?fresh2=' + Date.now())
setActivePinia(createPinia())
const s3 = s3mod.useSpaceStore()
const i3 = i3mod.useItemStore()
const r3 = r3mod.useRecordStore()
assert(i3.items[0].spaceId === 'sp_a', '自愈：悬空物品归入首个空间')
assert(r3.records[0].spaceId === 'sp_a', '自愈：悬空记录归入首个空间')

console.log(process.exitCode ? '\n存在失败用例' : '\n全部用例通过')
