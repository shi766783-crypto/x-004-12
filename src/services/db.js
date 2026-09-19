// 数据仓库层：每个实体一个 repo，封装存储键与读写。
// Store 通过 repo 读写，UI 层不感知 localStorage 细节。

import { load, save } from './storage'
import { uid } from '@/utils/id'
import { todayStr } from '@/utils/date'

const KEYS = {
  spaces: 'hmm.spaces',
  currentSpaceId: 'hmm.currentSpaceId',
  items: 'hmm.items',
  records: 'hmm.records',
  technicians: 'hmm.technicians',
  reviews: 'hmm.reviews',
  user: 'hmm.user'
}

export const spaceRepo = {
  get: () => load(KEYS.spaces, []),
  set: (list) => save(KEYS.spaces, list)
}

export const currentSpaceRepo = {
  get: () => load(KEYS.currentSpaceId, ''),
  set: (id) => save(KEYS.currentSpaceId, id)
}

export const itemRepo = {
  get: () => load(KEYS.items, []),
  set: (list) => save(KEYS.items, list)
}

export const recordRepo = {
  get: () => load(KEYS.records, []),
  set: (list) => save(KEYS.records, list)
}

export const technicianRepo = {
  get: () => load(KEYS.technicians, []),
  set: (list) => save(KEYS.technicians, list)
}

export const reviewRepo = {
  get: () => load(KEYS.reviews, []),
  set: (list) => save(KEYS.reviews, list)
}

export const userRepo = {
  get: () => load(KEYS.user, []),
  set: (list) => save(KEYS.user, list)
}

// 多空间迁移：旧版本只有一个默认家。
// 在任何业务 store 初始化前调用一次（幂等）：
// 没有空间数据时创建「我的家」，并把历史物品 / 记录全部归入该空间。
export function ensureSpacesMigrated() {
  let spaces = spaceRepo.get()
  if (!Array.isArray(spaces)) spaces = []

  if (!spaces.length) {
    spaces = [{ id: uid('sp_'), name: '我的家', createdAt: todayStr() }]
    spaceRepo.set(spaces)
  }

  const defaultId = spaces[0].id
  let currentId = currentSpaceRepo.get()
  if (!spaces.some((s) => s.id === currentId)) {
    currentId = defaultId
    currentSpaceRepo.set(currentId)
  }

  // 历史物品没有 spaceId，统一归入默认空间
  const items = itemRepo.get()
  if (Array.isArray(items) && items.some((i) => !i.spaceId)) {
    itemRepo.set(items.map((i) => ({ spaceId: defaultId, ...i })))
  }

  // 历史记录没有 spaceId，优先跟随物品，找不到物品则归入默认空间
  const records = recordRepo.get()
  if (Array.isArray(records) && records.some((r) => !r.spaceId)) {
    const spaceOfItem = new Map(itemRepo.get().map((i) => [i.id, i.spaceId || defaultId]))
    recordRepo.set(
      records.map((r) => ({
        spaceId: spaceOfItem.get(r.itemId) || defaultId,
        ...r
      }))
    )
  }

  return { spaces, currentId }
}
