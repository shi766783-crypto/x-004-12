<script setup>
import { ref, computed, watch } from 'vue'
import { useSpaceStore } from '@/stores/spaces'

const props = defineProps({
  space: { type: Object, required: true }
})
const emit = defineEmits(['close', 'deleted'])

const spaceStore = useSpaceStore()

const mode = ref('move')
const targetSpaceId = ref('')
const confirmed = ref(false)

const itemCount = computed(() => spaceStore.itemCountBySpace[props.space.id] || 0)
const targets = computed(() => spaceStore.spaces.filter((s) => s.id !== props.space.id))
const isLast = computed(() => spaceStore.spaces.length <= 1)
const canSubmit = computed(() =>
  isLast.value
    ? false
    : mode.value === 'move'
      ? Boolean(targetSpaceId.value)
      : confirmed.value
)

watch(targets, (list) => {
  if (!targetSpaceId.value && list.length) targetSpaceId.value = list[0].id
}, { immediate: true })

function submit() {
  if (!canSubmit.value) return
  const ok = spaceStore.removeSpace(props.space.id, {
    mode: mode.value,
    targetSpaceId: targetSpaceId.value
  })
  if (ok) emit('deleted')
}
</script>

<template>
  <div class="delete-space">
    <div class="warn-box">
      <strong>确定要删除「{{ space.name }}」吗？</strong>
      <p>
        该空间下有 <b>{{ itemCount }}</b> 个物品。空间删除后不可恢复，请先选择这些物品的处理方式。
      </p>
    </div>

    <div v-if="isLast" class="last-tip">这是唯一的空间，无法删除。如需继续，请先创建新空间。</div>

    <template v-else>
      <label class="option" :class="{ active: mode === 'move' }">
        <input v-model="mode" type="radio" value="move" />
        <div class="option-body">
          <div class="option-title">把物品迁移到其他空间</div>
          <div class="option-desc">物品及其保养/维修记录都会保留，仅更换归属空间。</div>
          <select v-if="mode === 'move'" v-model="targetSpaceId" class="input">
            <option v-for="t in targets" :key="t.id" :value="t.id">迁移到：{{ t.name }}</option>
          </select>
        </div>
      </label>

      <label class="option danger" :class="{ active: mode === 'delete' }">
        <input v-model="mode" type="radio" value="delete" />
        <div class="option-body">
          <div class="option-title">连同物品一起删除</div>
          <div class="option-desc">
            将永久删除该空间下全部 {{ itemCount }} 个物品，以及它们的保养 / 维修记录。
          </div>
        </div>
      </label>

      <label v-if="mode === 'delete'" class="confirm-check">
        <input v-model="confirmed" type="checkbox" />
        我已知晓物品与记录将被永久删除，无法恢复
      </label>

      <div class="actions">
        <button type="button" class="btn" @click="emit('close')">取消</button>
        <button
          type="button"
          class="btn"
          :class="mode === 'delete' ? 'btn-danger' : 'btn-primary'"
          :disabled="!canSubmit"
          @click="submit"
        >
          确认删除
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.warn-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.warn-box p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
.option {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 10px;
}
.option.active {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.option.danger.active {
  border-color: #fca5a5;
  background: #fef2f2;
}
.option-body {
  flex: 1;
}
.option-title {
  font-weight: 600;
  font-size: 14px;
}
.option-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin: 2px 0 8px;
}
.option .input {
  max-width: 260px;
}
.confirm-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--danger);
  margin: 4px 0 12px;
  cursor: pointer;
}
.last-tip {
  font-size: 13px;
  color: var(--warn);
  background: var(--bg-soft);
  border-radius: 8px;
  padding: 10px 12px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-danger:disabled,
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
