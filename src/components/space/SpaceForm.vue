<script setup>
import { reactive } from 'vue'

const props = defineProps({
  space: { type: Object, default: null }
})
const emit = defineEmits(['save', 'cancel'])

const form = reactive({
  name: props.space?.name || '',
  note: props.space?.note || ''
})

function submit() {
  if (!form.name.trim()) {
    alert('请填写空间名称')
    return
  }
  emit('save', { name: form.name.trim(), note: form.note.trim() })
}
</script>

<template>
  <form class="space-form" @submit.prevent="submit">
    <div class="field">
      <label class="label">空间名称 <em>*</em></label>
      <input v-model="form.name" class="input" placeholder="例如：父母家、出租屋、公司宿舍" maxlength="20" />
    </div>
    <div class="field">
      <label class="label">备注</label>
      <textarea v-model="form.note" class="input" rows="2" maxlength="60" placeholder="选填，如地址、备注说明"></textarea>
    </div>
    <div class="actions">
      <button type="button" class="btn" @click="emit('cancel')">取消</button>
      <button type="submit" class="btn btn-primary">保存</button>
    </div>
  </form>
</template>

<style scoped>
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
em {
  color: #e53e3e;
  font-style: normal;
}
</style>
