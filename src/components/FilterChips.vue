<script setup lang="ts">
export interface FilterChip {
  id: string
  label: string
  value: string | null
  icon?: string
}

defineProps<{ chips: FilterChip[] }>()
const emit = defineEmits<{ click: [string]; clear: [] }>()
</script>

<template>
  <div class="filter-chips">
    <button
      v-for="chip in chips"
      :key="chip.id"
      type="button"
      class="filter-chip"
      :class="{ active: !!chip.value }"
      @click="emit('click', chip.id)"
    >
      <i v-if="chip.icon" :class="chip.icon" />
      <span>{{ chip.label }}</span>
      <i class="pi pi-chevron-down chip-arrow" />
    </button>
    <button
      v-if="chips.some(c => c.value)"
      type="button"
      class="filter-chip clear"
      @click="emit('clear')"
    >
      Limpar
    </button>
  </div>
</template>

<style scoped lang="scss">
.filter-chips {
  display: flex; gap: 0.5rem; overflow-x: auto;
  padding-bottom: 0.25rem; margin-bottom: 1rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.filter-chip {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.75rem; border-radius: 999px;
  border: 1px solid var(--ds-border); background: var(--ds-surface);
  color: var(--ds-text); font-size: 0.8rem; white-space: nowrap;
  cursor: pointer; flex-shrink: 0; font-family: inherit;

  i:not(.chip-arrow) { font-size: 0.75rem; color: var(--ds-text-muted); }
  .chip-arrow { font-size: 0.6rem; color: var(--ds-text-muted); margin-left: 0.1rem; }

  &.active {
    border-color: var(--ds-primary);
    background: color-mix(in srgb, var(--ds-primary) 10%, transparent);
    color: var(--ds-primary);
    i { color: var(--ds-primary); }
  }

  &.clear {
    border-style: dashed; color: var(--ds-text-muted);
    &:hover { border-color: var(--ds-primary); color: var(--ds-primary); }
  }
}
</style>
