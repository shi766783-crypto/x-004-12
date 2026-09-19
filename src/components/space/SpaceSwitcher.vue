<script setup>
import { computed } from 'vue'
import { useSpaceStore, ALL_SPACES } from '@/stores/spaces'

const spaceStore = useSpaceStore()

const currentLabel = computed(() =>
  spaceStore.isAllSpaces ? '全部空间' : spaceStore.currentSpace?.name || '选择空间'
)

function onChange(e) {
  spaceStore.switchSpace(e.target.value)
}
</script>

<template>
  <div class="space-switcher">
    <svg class="home-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z"
      />
    </svg>
    <select
      class="space-select"
      :value="spaceStore.currentId"
      :aria-label="'切换家庭空间'"
      @change="onChange"
    >
      <option :value="ALL_SPACES">全部空间</option>
      <option v-for="s in spaceStore.spaces" :key="s.id" :value="s.id">{{ s.name }}</option>
    </select>
    <router-link class="manage-link" to="/spaces" title="管理空间">管理</router-link>
  </div>
</template>

<style scoped>
.space-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding: 4px 6px 4px 12px;
}
.home-icon {
  color: #fff;
  flex: none;
}
.space-select {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  max-width: 130px;
}
.space-select option {
  color: var(--text);
}
.manage-link {
  font-size: 12px;
  color: #fff;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.2);
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.manage-link:hover {
  background: rgba(255, 255, 255, 0.32);
}
@media (max-width: 480px) {
  .space-select {
    max-width: 90px;
  }
}
</style>
