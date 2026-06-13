<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import BottomNav from '@/components/BottomNav.vue'
import Menubar from 'primevue/menubar'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Drawer from 'primevue/drawer'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settings = useSettingsStore()
const theme = useThemeStore()
const adminDrawer = ref(false)

onMounted(() => settings.fetchSettings())

const menuItems = computed(() => [
  { label: 'Início', icon: 'pi pi-home', command: () => router.push('/') },
  { label: 'Peladas', icon: 'pi pi-calendar', command: () => router.push('/matches') },
  { label: 'Campos', icon: 'pi pi-map-marker', command: () => router.push('/fields') },
  { label: 'Contatos', icon: 'pi pi-whatsapp', command: () => router.push('/contacts') },
  { label: 'Mapa', icon: 'pi pi-globe', command: () => router.push('/map') },
  { label: 'Ranking', icon: 'pi pi-trophy', command: () => router.push('/ranking') }
])

const adminLinks = [
  { label: 'Dashboard', icon: 'pi pi-chart-bar', to: '/dashboard' },
  { label: 'Partidas', icon: 'pi pi-calendar', to: '/admin/matches' },
  { label: 'Campos', icon: 'pi pi-map-marker', to: '/admin/fields' },
  { label: 'Juízes & Goleiros', icon: 'pi pi-id-card', to: '/admin/staff' },
  { label: 'Pagamentos', icon: 'pi pi-wallet', to: '/admin/payments' },
  { label: 'Usuários', icon: 'pi pi-users', to: '/admin/users' },
  { label: 'Parâmetros', icon: 'pi pi-sliders-h', to: '/admin/settings' }
]
</script>

<template>
  <div class="layout">
    <header class="mobile-header">
      <router-link to="/" class="logo">
        <i class="pi pi-flag-fill" />
        <span>DateSoccer</span>
      </router-link>
      <div class="mobile-actions">
        <Button
          :icon="theme.isDark ? 'pi pi-sun' : 'pi pi-moon'"
          text rounded size="small"
          @click="theme.toggle()"
        />
        <Button
          v-if="auth.isAuthenticated"
          icon="pi pi-bell"
          text rounded size="small"
          @click="router.push('/notifications')"
        />
        <Button
          v-if="auth.isAdmin"
          icon="pi pi-cog"
          text rounded size="small"
          @click="adminDrawer = true"
        />
        <router-link v-if="!auth.isAuthenticated" to="/login" class="auth-pill">
          Entrar
        </router-link>
      </div>
    </header>

    <Menubar :model="menuItems" class="navbar desktop-nav">
      <template #start>
        <router-link to="/" class="logo">
          <i class="pi pi-flag-fill" />
          <span>DateSoccer</span>
        </router-link>
      </template>
      <template #end>
        <div class="nav-end">
          <Button
            :icon="theme.isDark ? 'pi pi-sun' : 'pi pi-moon'"
            text rounded
            @click="theme.toggle()"
          />
          <template v-if="auth.isAuthenticated">
            <Button icon="pi pi-bell" text rounded @click="router.push('/notifications')" />
            <Button v-if="auth.isAdmin" icon="pi pi-cog" text rounded @click="adminDrawer = true" v-tooltip="'Admin'" />
            <Button text @click="router.push('/profile')" class="profile-btn">
              <Avatar :label="auth.user?.name?.charAt(0)" shape="circle" />
              <span>{{ auth.user?.name }}</span>
            </Button>
            <Button icon="pi pi-sign-out" text rounded severity="danger" @click="auth.logout(); router.push('/login')" />
          </template>
          <template v-else>
            <Button label="Entrar" text @click="router.push('/login')" />
            <Button label="Cadastrar" @click="router.push('/register')" />
          </template>
        </div>
      </template>
    </Menubar>

    <Drawer v-model:visible="adminDrawer" position="right" header="Painel Admin" class="admin-drawer">
      <div class="admin-nav">
        <Button
          v-for="link in adminLinks"
          :key="link.to"
          :label="link.label"
          :icon="link.icon"
          text
          class="w-full"
          @click="router.push(link.to); adminDrawer = false"
        />
      </div>
    </Drawer>

    <main class="main-content" :class="{ 'no-padding': route.name === 'map', 'has-bottom-nav': route.name !== 'map' }">
      <router-view />
    </main>

    <footer class="footer desktop-only">
      <p>&copy; {{ new Date().getFullYear() }} DateSoccer - Organize suas peladas</p>
    </footer>

    <BottomNav />
    <ConfirmDialog />
    <Toast position="top-center" class="mobile-toast" />
  </div>
</template>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.mobile-header {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  background: var(--ds-surface);
  border-bottom: 1px solid var(--ds-border);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.mobile-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.navbar {
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--ds-border);
  background: var(--ds-surface) !important;
  padding: 0.5rem 1rem;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ds-primary);
  text-decoration: none;

  i { font-size: 1.35rem; }
}

.nav-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.profile-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.main-content {
  flex: 1;
  &.no-padding { padding: 0; }
}

.footer {
  text-align: center;
  padding: 1.5rem;
  color: var(--ds-text-muted);
  font-size: 0.875rem;
  border-top: 1px solid var(--ds-border);
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.w-full { width: 100%; justify-content: flex-start; }

.auth-pill {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ds-primary);
  text-decoration: none;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--ds-primary);
  border-radius: 999px;
  margin-left: 0.25rem;
  white-space: nowrap;

  &:hover { background: color-mix(in srgb, var(--ds-primary) 10%, transparent); }
}

@media (max-width: 768px) {
  .desktop-nav, .desktop-only { display: none !important; }
  .mobile-header { display: flex; }
  .main-content.has-bottom-nav {
    padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
  }
  :deep(.page-container) {
    padding: 1rem;
  }
}

@media (min-width: 769px) {
  .mobile-header { display: none; }
}
</style>
