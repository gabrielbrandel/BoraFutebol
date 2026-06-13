<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tabs = computed(() => {
  const items = [
    { label: 'Início', icon: 'pi pi-home', to: '/' },
    { label: 'Peladas', icon: 'pi pi-calendar', to: '/matches' },
    { label: 'Campos', icon: 'pi pi-map-marker', to: '/fields' },
    { label: 'Contatos', icon: 'pi pi-whatsapp', to: '/contacts' },
    { label: auth.isAuthenticated ? 'Perfil' : 'Entrar', icon: 'pi pi-user', to: auth.isAuthenticated ? '/profile' : '/login' }
  ]
  return items
})

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function go(to: string) {
  router.push(to)
}
</script>

<template>
  <nav class="bottom-nav">
    <button
      v-for="tab in tabs"
      :key="tab.to"
      type="button"
      class="nav-item"
      :class="{ active: isActive(tab.to) }"
      @click="go(tab.to)"
    >
      <i :class="tab.icon" />
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped lang="scss">
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1100;
  background: var(--ds-surface);
  border-top: 1px solid var(--ds-border);
  padding: 0.35rem 0 calc(0.35rem + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgb(0 0 0 / 0.08);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.35rem 0.25rem;
  border: none;
  background: none;
  color: var(--ds-text-muted);
  font-size: 0.65rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;

  i { font-size: 1.25rem; }

  &.active {
    color: var(--ds-primary);
    font-weight: 600;
  }
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
  }
}
</style>
