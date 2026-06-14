<script setup lang="ts">
defineProps<{ visible?: boolean }>()
</script>

<template>
  <Transition name="refresh-fade">
    <div v-if="visible" class="refresh-indicator" aria-hidden="true">
      <i class="pi pi-sync spin" />
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.refresh-indicator {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 0.65rem);
  right: 0.75rem;
  z-index: 1200;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  box-shadow: var(--ds-shadow);
  color: var(--ds-primary);
  pointer-events: none;

  .spin {
    font-size: 0.85rem;
    animation: spin 0.9s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.refresh-fade-enter-active,
.refresh-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.refresh-fade-enter-from,
.refresh-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
