<script setup lang="ts">
export interface FilterOption {
  label: string
  value: string | null
}

defineProps<{
  visible: boolean
  title: string
  options: FilterOption[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  'update:modelValue': [string | null]
}>()

function select(value: string | null) {
  emit('update:modelValue', value)
  emit('update:visible', false)
}

function close() {
  emit('update:visible', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="visible" class="filter-sheet-overlay" @click.self="close">
        <div class="filter-sheet">
          <div class="sheet-handle" />
          <div class="sheet-header">
            <h3>{{ title }}</h3>
            <button type="button" class="sheet-close" aria-label="Fechar" @click="close">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="sheet-options">
            <button
              v-for="opt in options"
              :key="String(opt.value ?? 'all')"
              type="button"
              class="sheet-option"
              :class="{ active: modelValue === opt.value }"
              @click="select(opt.value)"
            >
              <span>{{ opt.label }}</span>
              <i v-if="modelValue === opt.value" class="pi pi-check" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.filter-sheet-overlay {
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: flex-end; justify-content: center;
}

.filter-sheet {
  width: 100%; max-width: 480px; max-height: 70vh;
  background: var(--ds-surface);
  border-radius: 16px 16px 0 0;
  padding: 0.5rem 1rem 1.5rem;
  overflow: hidden;
  display: flex; flex-direction: column;
}

.sheet-handle {
  width: 36px; height: 4px; border-radius: 999px;
  background: var(--ds-border); margin: 0.5rem auto 0.75rem;
}

.sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.75rem;
  h3 { margin: 0; font-size: 1rem; }
}

.sheet-close {
  background: none; border: none; color: var(--ds-text-muted);
  cursor: pointer; padding: 0.35rem; font-size: 1rem;
}

.sheet-options {
  overflow-y: auto; display: flex; flex-direction: column; gap: 0.25rem;
}

.sheet-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.875rem 0.75rem; border: none; border-radius: 10px;
  background: transparent; color: inherit; font: inherit; cursor: pointer;
  text-align: left; font-size: 0.95rem;

  &:hover { background: var(--ds-bg); }
  &.active { background: color-mix(in srgb, var(--ds-primary) 12%, transparent); color: var(--ds-primary); font-weight: 600; }
  .pi-check { font-size: 0.85rem; }
}

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.2s; }
.sheet-enter-active .filter-sheet, .sheet-leave-active .filter-sheet { transition: transform 0.25s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .filter-sheet, .sheet-leave-to .filter-sheet { transform: translateY(100%); }
</style>
