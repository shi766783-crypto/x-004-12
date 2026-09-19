<script setup>
import { ref, computed } from 'vue'
import { useSpaceStore, DELETE_STRATEGIES } from '@/stores/spaces'
import { useItemStore } from '@/stores/items'
import { useRecordStore } from '@/stores/records'
import BaseModal from '@/components/common/BaseModal.vue'

const spaceStore = useSpaceStore()
const itemStore = useItemStore()
const recordStore = useRecordStore()

// mode: list（切换/管理） | create（新建） | rename（重命名） | delete（删除确认）
const mode = ref('list')
const showModal = ref(false)
const nameInput = ref('')
const deleteStrategy = ref('move')
const deleteTargetId = ref('')

const itemCountIn = (id) => itemStore.countBySpace(id)
const recordCountIn = (id) => recordStore.recordsInSpace(id).length

const deletingSpace = ref(null)
const deleteTargets = computed(() =>
  deletingSpace.value ? spaceStore.movableSpaces(deletingSpace.value.id) : []
)
const canConfirmDelete = computed(() => {
  if (!deletingSpace.value) return false
  if (deleteStrategy.value === 'delete') return true
  return !!deleteTargetId.value
})

function open() {
  mode.value = 'list'
  showModal.value = true
}
function close() {
  showModal.value = false
}

function selectSpace(id) {
  spaceStore.switchSpace(id)
  close()
}

function openCreate() {
  nameInput.value = ''
  mode.value = 'create'
}
function submitCreate() {
  if (!nameInput.value.trim()) return
  spaceStore.addSpace(nameInput.value)
  close()
}

const renamingId = ref('')
function openRename(space) {
  renamingId.value = space.id
  nameInput.value = space.name
  mode.value = 'rename'
}
function submitRename() {
  if (!nameInput.value.trim()) return
  spaceStore.renameSpace(renamingId.value, nameInput.value)
  mode.value = 'list'
}

function openDelete(space) {
  deletingSpace.value = space
  deleteStrategy.value = 'move'
  deleteTargetId.value = spaceStore.movableSpaces(space.id)[0]?.id || ''
  mode.value = 'delete'
}
function confirmDelete() {
  if (!canConfirmDelete.value) return
  const payload =
    deleteStrategy.value === 'move'
      ? { strategy: 'move', targetId: deleteTargetId.value }
      : { strategy: 'delete' }
  spaceStore.removeSpace(deletingSpace.value.id, payload)
  mode.value = 'list'
  // 删除的是当前空间时 removeSpace 会自动切换；若删到只剩列表态则关闭
  if (spaceStore.spaceCount <= 1) showModal.value = false
}

const modalTitle = computed(() => {
  if (mode.value === 'create') return '新建家庭空间'
  if (mode.value === 'rename') return '重命名空间'
  if (mode.value === 'delete') return '删除空间'
  return '切换家庭空间'
})

// 供外部（如「我的」页的空间管理入口）直接打开管理弹窗
defineExpose({ open })
</script>

<template>
  <div class="space-switcher">
    <button type="button" class="switcher-btn" @click="open">
      <span class="home-glyph">⌂</span>
      <span class="switcher-name">{{ spaceStore.currentSpace?.name || '选择空间' }}</span>
      <span class="caret">▾</span>
    </button>

    <BaseModal v-if="showModal" :title="modalTitle" @close="close">
      <!-- 空间列表 -->
      <div v-if="mode === 'list'" class="space-list">
        <button
          v-for="s in spaceStore.spaces"
          :key="s.id"
          type="button"
          class="space-row"
          :class="{ active: s.id === spaceStore.currentId }"
          @click="selectSpace(s.id)"
        >
          <span class="space-row-main">
            <span class="space-row-name">{{ s.name }}</span>
            <span class="space-row-meta">{{ itemCountIn(s.id) }} 件物品 · {{ recordCountIn(s.id) }} 条记录</span>
          </span>
          <span v-if="s.id === spaceStore.currentId" class="current-tick">当前</span>
          <span class="space-row-ops" @click.stop>
            <button type="button" class="link-btn" @click="openRename(s)">重命名</button>
            <button
              type="button"
              class="link-btn danger"
              :disabled="spaceStore.spaceCount <= 1"
              :title="spaceStore.spaceCount <= 1 ? '至少保留一个空间' : '删除空间'"
              @click="openDelete(s)"
            >
              删除
            </button>
          </span>
        </button>

        <button type="button" class="btn btn-outline btn-block create-btn" @click="openCreate">
          + 新建家庭空间
        </button>
      </div>

      <!-- 新建空间 -->
      <form v-else-if="mode === 'create'" class="space-form" @submit.prevent="submitCreate">
        <div class="field">
          <label class="label">空间名称</label>
          <input
            v-model="nameInput"
            class="input"
            placeholder="例如：父母家、出租房"
            maxlength="20"
            autofocus
          />
        </div>
        <div class="actions">
          <button type="button" class="btn" @click="mode = 'list'">返回</button>
          <button type="submit" class="btn btn-primary" :disabled="!nameInput.trim()">创建并切换</button>
        </div>
      </form>

      <!-- 重命名 -->
      <form v-else-if="mode === 'rename'" class="space-form" @submit.prevent="submitRename">
        <div class="field">
          <label class="label">空间名称</label>
          <input v-model="nameInput" class="input" maxlength="20" autofocus />
        </div>
        <div class="actions">
          <button type="button" class="btn" @click="mode = 'list'">返回</button>
          <button type="submit" class="btn btn-primary" :disabled="!nameInput.trim()">保存</button>
        </div>
      </form>

      <!-- 删除确认：必须先决定里面的物品如何处理 -->
      <div v-else class="delete-flow">
        <p class="warn-text">
          「{{ deletingSpace?.name }}」中有
          <strong>{{ deletingSpace ? itemCountIn(deletingSpace.id) : 0 }}</strong> 件物品、
          <strong>{{ deletingSpace ? recordCountIn(deletingSpace.id) : 0 }}</strong> 条记录。
          删除前请选择处理方式：
        </p>

        <label class="opt" :class="{ checked: deleteStrategy === 'move' }">
          <input type="radio" v-model="deleteStrategy" value="move" />
          <span class="opt-main">
            <span class="opt-title">迁移到其他空间</span>
            <span class="opt-desc">物品档案、保养提醒与全部记录一起保留</span>
          </span>
        </label>
        <div v-if="deleteStrategy === 'move'" class="opt-extra">
          <select v-model="deleteTargetId" class="input">
            <option value="" disabled>选择目标空间</option>
            <option v-for="s in deleteTargets" :key="s.id" :value="s.id">迁移到：{{ s.name }}</option>
          </select>
          <p v-if="!deleteTargets.length" class="hint-danger">没有其他空间，请先新建一个空间。</p>
        </div>

        <label class="opt danger-opt" :class="{ checked: deleteStrategy === 'delete' }">
          <input type="radio" v-model="deleteStrategy" value="delete" />
          <span class="opt-main">
            <span class="opt-title">一并删除</span>
            <span class="opt-desc">该空间内的物品和所有保养 / 维修记录将永久删除</span>
          </span>
        </label>

        <div class="actions">
          <button type="button" class="btn" @click="mode = 'list'">取消</button>
          <button type="button" class="btn btn-danger" :disabled="!canConfirmDelete" @click="confirmDelete">
            确认删除
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.switcher-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  max-width: 200px;
}
.switcher-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}
.home-glyph {
  font-size: 15px;
  line-height: 1;
}
.switcher-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}
.caret {
  font-size: 10px;
  opacity: 0.85;
}

.space-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.space-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.space-row:hover {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.space-row.active {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.space-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.space-row-name {
  font-weight: 600;
}
.space-row-meta {
  font-size: 12px;
  color: var(--text-muted);
}
.current-tick {
  font-size: 12px;
  color: var(--primary);
  background: #fff;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--primary);
  flex: none;
}
.space-row-ops {
  display: flex;
  gap: 4px;
  flex: none;
}
.link-btn {
  border: none;
  background: none;
  color: var(--primary);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  font-family: inherit;
}
.link-btn.danger {
  color: var(--danger);
}
.link-btn:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.6;
}
.create-btn {
  margin-top: 4px;
}

.space-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.delete-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.warn-text {
  margin: 0;
  font-size: 13px;
  color: var(--text);
}
.opt {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
}
.opt.checked {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.opt.danger-opt.checked {
  border-color: #fca5a5;
  background: #fef2f2;
}
.opt input {
  margin-top: 3px;
}
.opt-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.opt-title {
  font-weight: 600;
  font-size: 14px;
}
.opt-desc {
  font-size: 12px;
  color: var(--text-muted);
}
.opt-extra {
  margin: -4px 0 0 26px;
}
.hint-danger {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--danger);
}
</style>
