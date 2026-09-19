<script setup>
import { ref } from 'vue'
import { useSpaceStore } from '@/stores/spaces'
import SpaceForm from '@/components/space/SpaceForm.vue'
import DeleteSpaceModal from '@/components/space/DeleteSpaceModal.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const spaceStore = useSpaceStore()

const showForm = ref(false)
const editing = ref(null)
const deleting = ref(null)

function openAdd() {
  editing.value = null
  showForm.value = true
}
function openEdit(space) {
  editing.value = space
  showForm.value = true
}
function onSave(payload) {
  if (editing.value) {
    spaceStore.updateSpace(editing.value.id, payload)
  } else {
    spaceStore.addSpace(payload)
  }
  showForm.value = false
}
function switchTo(id) {
  spaceStore.switchSpace(id)
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">家庭空间</h1>
        <p class="page-sub">为自己家、父母家、出租房等分别建档，数据互不混淆</p>
      </div>
      <button class="btn btn-primary" @click="openAdd">+ 新建空间</button>
    </div>

    <div v-if="spaceStore.spaces.length" class="space-list">
      <div v-for="s in spaceStore.spaces" class="card space-card" :key="s.id">
        <div class="space-main" @click="switchTo(s.id)">
          <div class="space-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path fill="currentColor" d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />
            </svg>
          </div>
          <div class="space-info">
            <div class="space-name-row">
              <span class="space-name">{{ s.name }}</span>
              <span v-if="spaceStore.currentId === s.id" class="tag current-tag">当前查看</span>
            </div>
            <div class="space-meta">
              <span>{{ spaceStore.itemCountBySpace[s.id] || 0 }} 个物品</span>
              <span v-if="s.note" class="space-note">· {{ s.note }}</span>
            </div>
          </div>
        </div>
        <div class="space-ops">
          <button class="btn btn-sm" @click="switchTo(s.id)">切换</button>
          <button class="btn btn-sm" @click="openEdit(s)">编辑</button>
          <button class="btn btn-sm btn-danger" @click="deleting = s">删除</button>
        </div>
      </div>
    </div>
    <EmptyState v-else title="还没有家庭空间" desc="创建第一个空间，开始为家里的物品建档" />

    <BaseModal
      v-if="showForm"
      :title="editing ? '编辑空间' : '新建空间'"
      @close="showForm = false"
    >
      <SpaceForm :space="editing" @save="onSave" @cancel="showForm = false" />
    </BaseModal>

    <BaseModal
      v-if="deleting"
      :title="'删除空间：' + deleting.name"
      @close="deleting = null"
    >
      <DeleteSpaceModal :space="deleting" @close="deleting = null" @deleted="deleting = null" />
    </BaseModal>
  </div>
</template>

<style scoped>
.space-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.space-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.space-main {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  flex: 1;
  min-width: 200px;
}
.space-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--primary-soft);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.space-info {
  min-width: 0;
}
.space-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.space-name {
  font-size: 16px;
  font-weight: 600;
}
.current-tag {
  background: var(--primary-soft);
  color: var(--primary);
}
.space-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
.space-note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.space-ops {
  display: flex;
  gap: 8px;
  flex: none;
}
</style>
