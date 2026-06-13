<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/endpoints'
import { POSITIONS, POSITION_LABELS } from '@/types'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const loading = ref(false)

const adminLinks = [
  { label: 'Dashboard', desc: 'Visão geral e métricas', icon: 'pi pi-chart-bar', to: '/dashboard' },
  { label: 'Partidas', desc: 'Peladas e recorrentes', icon: 'pi pi-calendar', to: '/admin/matches' },
  { label: 'Campos', desc: 'Quadras e endereços', icon: 'pi pi-map-marker', to: '/admin/fields' },
  { label: 'Juízes & Goleiros', desc: 'Cadastro rápido', icon: 'pi pi-id-card', to: '/admin/staff' },
  { label: 'Pagamentos', desc: 'Financeiro das peladas', icon: 'pi pi-wallet', to: '/admin/payments' },
  { label: 'Usuários', desc: 'Gerenciar jogadores', icon: 'pi pi-users', to: '/admin/users' },
  { label: 'Parâmetros', desc: 'Permissões do sistema', icon: 'pi pi-sliders-h', to: '/admin/settings' }
]

const form = ref({
  name: '', phone: '', whatsApp: '', city: '', state: '',
  primaryPosition: 'Midfielder', dominantFoot: 'Right',
  height: 1.75, weight: 75, technicalLevel: 3, photoUrl: ''
})

const positionOptions = POSITIONS.map(p => ({ label: POSITION_LABELS[p], value: p }))

onMounted(async () => {
  await auth.fetchProfile()
  if (auth.user) {
    form.value.name = auth.user.name
    form.value.whatsApp = auth.user.whatsApp || ''
    form.value.primaryPosition = auth.user.primaryPosition
    form.value.phone = auth.user.phone || auth.user.whatsApp || ''
    form.value.city = auth.user.city || ''
    form.value.state = auth.user.state || ''
    form.value.technicalLevel = auth.user.technicalLevel
  }
})

async function save() {
  loading.value = true
  try {
    const { data } = await authApi.updateProfile(form.value)
    if (data.success) {
      toast.add({ severity: 'success', summary: 'Perfil atualizado!' })
      await auth.fetchProfile()
    }
  } finally { loading.value = false }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Meu Perfil</h1>
    <p class="page-subtitle">{{ auth.user?.email }}</p>

    <form @submit.prevent="save" class="profile-form">
      <div class="form-grid">
        <div class="field"><label>Nome</label><InputText v-model="form.name" class="w-full" required /></div>
        <div class="field"><label>WhatsApp</label><InputText v-model="form.whatsApp" class="w-full" required /></div>
        <div class="field"><label>Posição</label><Select v-model="form.primaryPosition" :options="positionOptions" optionLabel="label" optionValue="value" class="w-full" /></div>
      </div>
      <Button type="submit" label="Salvar" icon="pi pi-save" :loading="loading" />
    </form>

    <section v-if="auth.isAdmin" class="admin-section">
      <div class="admin-header">
        <div class="admin-badge"><i class="pi pi-shield" /></div>
        <div>
          <h2>Painel Admin</h2>
          <p>Gerencie partidas, campos e configurações</p>
        </div>
      </div>
      <div class="admin-grid">
        <button
          v-for="link in adminLinks"
          :key="link.to"
          type="button"
          class="admin-card"
          @click="router.push(link.to)"
        >
          <span class="admin-card-icon"><i :class="link.icon" /></span>
          <span class="admin-card-text">
            <strong>{{ link.label }}</strong>
            <small>{{ link.desc }}</small>
          </span>
          <i class="pi pi-chevron-right admin-card-arrow" />
        </button>
      </div>
    </section>

    <Button label="Sair da conta" icon="pi pi-sign-out" severity="danger" outlined class="logout-btn" @click="auth.logout(); router.push('/login')" />
  </div>
</template>

<style scoped lang="scss">
.profile-form { max-width: 700px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.field label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; }
.w-full { width: 100%; }

.admin-section {
  margin-top: 2rem;
  padding: 1.25rem;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: 16px;
}

.admin-header {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 1.25rem;

  h2 { font-size: 1.05rem; margin: 0 0 0.15rem; }
  p { margin: 0; font-size: 0.8rem; color: var(--ds-text-muted); }
}

.admin-badge {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--ds-primary) 15%, transparent);
  color: var(--ds-primary);
  i { font-size: 1.25rem; }
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.625rem;
}

.admin-card {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--ds-bg);
  border: 1px solid var(--ds-border);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, transform 0.15s;
  color: inherit;
  font: inherit;

  &:hover {
    border-color: var(--ds-primary);
    transform: translateY(-1px);
  }
}

.admin-card-icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--ds-primary) 12%, transparent);
  color: var(--ds-primary);
  i { font-size: 1rem; }
}

.admin-card-text {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem;
  strong { font-size: 0.9rem; }
  small { font-size: 0.75rem; color: var(--ds-text-muted); }
}

.admin-card-arrow { font-size: 0.75rem; color: var(--ds-text-muted); flex-shrink: 0; }

.logout-btn { margin-top: 1.5rem; width: 100%; }

@media (max-width: 640px) {
  .admin-grid { grid-template-columns: 1fr; }
}
</style>
