<script setup>
import { ref, computed } from 'vue'
import { useItemStore } from '@/stores/items'
import { useSpaceStore } from '@/stores/spaces'
import { CATEGORIES } from '@/constants'
import ItemCard from '@/components/item/ItemCard.vue'
import ItemForm from '@/components/item/ItemForm.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const itemStore = useItemStore()
const spaceStore = useSpaceStore()

const keyword = ref('')
const category = ref('')
const showForm = ref(false)

const scopedItems = computed(() => itemStore.itemsInSpace(spaceStore.currentId))

const filtered = computed(() => {
  return scopedItems.value.filter((i) => {
    const kw = keyword.value.trim().toLowerCase()
    const matchKw = !kw || (i.name + (i.brandModel || '')).toLowerCase().includes(kw)
    return matchKw && (!category.value || i.category === category.value)
  })
})

function openAdd() {
  showForm.value = true
}
function onSave(payload) {
  itemStore.addItem({ ...payload, spaceId: payload.spaceId || spaceStore.currentId })
  showForm.value = false
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">物品档案</h1>
        <p class="page-sub">{{ spaceStore.currentSpace?.name }} · 共 {{ scopedItems.length }} 件物品</p>
      </div>
      <button class="btn btn-primary" @click="openAdd">+ 添加物品</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input grow" placeholder="搜索名称 / 品牌型号" />
      <select v-model="category" class="input" style="max-width: 140px">
        <option value="">全部类别</option>
        <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>
    </div>

    <div v-if="filtered.length" class="grid">
      <ItemCard v-for="i in filtered" :key="i.id" :item="i" />
    </div>
    <EmptyState v-else title="没有匹配的物品" desc="试试调整搜索条件，或添加一个新物品" />

    <BaseModal v-if="showForm" title="添加物品" @close="showForm = false">
      <ItemForm
        :spaces="spaceStore.spaces"
        :current-space-id="spaceStore.currentId"
        @save="onSave"
        @cancel="showForm = false"
      />
    </BaseModal>
  </div>
</template>
