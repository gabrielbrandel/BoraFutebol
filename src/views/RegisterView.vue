<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { POSITIONS, POSITION_LABELS } from '@/types'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const loading = ref(false)

const form = ref({
  name: '',
  whatsApp: '',
  primaryPosition: 'Midfielder'
})

const positionOptions = POSITIONS.map(p => ({ label: POSITION_LABELS[p], value: p }))

async function handleRegister() {
  loading.value = true
  try {
    const result = await auth.quickRegister(form.value)
    if (result.success) {
      const digits = form.value.whatsApp.replace(/\D/g, '')
      const hint = digits.length >= 6 ? digits.slice(-6) : digits
      toast.add({
        severity: 'success',
        summary: 'Cadastro realizado!',
        detail: `Para entrar de novo, use seu WhatsApp e a senha ${hint}`,
        life: 8000
      })
      router.push('/')
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string; errors?: string[] } } }
    toast.add({
      severity: 'error',
      summary: err.response?.data?.message || 'Erro no cadastro',
      detail: err.response?.data?.errors?.join(', ')
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <button type="button" class="back-home" @click="router.push('/')">
      <i class="pi pi-arrow-left" />
      <span>Início</span>
    </button>

    <div class="auth-card">
      <div class="auth-header">
        <i class="pi pi-flag-fill" />
        <h1>Criar Conta</h1>
        <p>Só o essencial — nome, WhatsApp e posição</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="field">
          <label>Nome</label>
          <InputText v-model="form.name" placeholder="Seu nome" class="w-full" required />
        </div>
        <div class="field">
          <label>WhatsApp</label>
          <InputText v-model="form.whatsApp" placeholder="(44) 99999-9999" class="w-full" required />
        </div>
        <div class="field">
          <label>Posição</label>
          <Select
            v-model="form.primaryPosition"
            :options="positionOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <Button type="submit" label="Cadastrar" icon="pi pi-user-plus" class="w-full" :loading="loading" />
      </form>

      <p class="auth-footer">Já tem conta? <router-link to="/login">Entrar</router-link></p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #16a34a, #0ea5e9);
  padding: 1rem;
  position: relative;
}

.back-home {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(4px);
  font-family: inherit;

  &:hover { background: rgba(255, 255, 255, 0.3); }
  i { font-size: 0.8rem; }
}

.auth-card {
  background: var(--ds-surface);
  padding: 2.5rem;
  border-radius: var(--ds-radius);
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
  i { font-size: 3rem; color: var(--ds-primary); }
  h1 { font-size: 1.75rem; font-weight: 800; margin: 0.5rem 0; }
  p { color: var(--ds-text-muted); }
}

.auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
.field label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; }
.w-full { width: 100%; }
.auth-footer { text-align: center; margin-top: 1.5rem; color: var(--ds-text-muted); }
</style>
