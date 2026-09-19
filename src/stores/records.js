import { defineStore } from 'pinia'
import { recordRepo } from '@/services/db'
import { uid } from '@/utils/id'
import { todayStr, nextDueDate } from '@/utils/date'
import { useItemStore } from './items'
import { useTechnicianStore } from './technicians'

export const useRecordStore = defineStore('records', {
  state: () => ({
    records: recordRepo.get()
  }),
  getters: {
    recordById: (state) => (id) => state.records.find((r) => r.id === id),
    recordsByItem: (state) => (itemId) => state.records.filter((r) => r.itemId === itemId),
    recordsInSpace: (state) => (spaceId) => state.records.filter((r) => r.spaceId === spaceId)
  },
  actions: {
    addRecord(payload) {
      const itemStore = useItemStore()
      const record = {
        id: uid('rec_'),
        createdAt: todayStr(),
        onTime: false,
        ...payload
      }

      // 记录默认跟随物品所属空间
      if (!record.spaceId && record.itemId) {
        const item = itemStore.itemById(record.itemId)
        if (item) record.spaceId = item.spaceId
      }

      // 保养类记录：判断是否在到期日前完成（用于"保养准时"成就与保养达人榜）
      if (record.type === 'maintenance') {
        const item = itemStore.itemById(record.itemId)
        const due = item ? nextDueDate(item) : null
        record.onTime = due ? record.date <= due : true
      }

      this.records.unshift(record)
      recordRepo.set(this.records)

      // 联动 1：保养/更换刷新物品上次保养日期
      if (record.itemId && (record.type === 'maintenance' || record.type === 'replacement')) {
        itemStore.applyMaintenance(record.itemId, record.date)
      }
      // 联动 2：师傅接单量 +1
      if (record.technicianId) {
        useTechnicianStore().incrementOrder(record.technicianId)
      }
      return record
    },
    removeRecord(id) {
      this.records = this.records.filter((r) => r.id !== id)
      recordRepo.set(this.records)
    },
    // 空间迁移：空间内记录整体移到目标空间
    reassignSpace(fromId, toId) {
      this.records.forEach((r) => {
        if (r.spaceId === fromId) r.spaceId = toId
      })
      recordRepo.set(this.records)
    },
    // 删除空间：空间内记录级联删除
    removeBySpace(spaceId) {
      this.records = this.records.filter((r) => r.spaceId !== spaceId)
      recordRepo.set(this.records)
    }
  }
})
