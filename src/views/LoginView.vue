<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()

const whatsApp = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    const result = await auth.login(whatsApp.value, password.value)
    if (result.success) {
      toast.add({ severity: 'success', summary: 'Bem-vindo!', detail: `Olá, ${result.data?.user.name}` })
      const redirect = route.query.redirect as string
      router.push(redirect || '/')
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'Erro ao fazer login'
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
        <h1>DateSoccer</h1>
        <p>Entre na sua conta</p>
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="field">
          <label>WhatsApp</label>
          <InputText v-model="whatsApp" placeholder="(44) 99999-9999" class="w-full" required />
        </div>
        <div class="field">
          <label>Senha</label>
          <Password v-model="password" :feedback="false" toggleMask class="w-full" inputClass="w-full" required />
        </div>
        <Button type="submit" label="Entrar" icon="pi pi-sign-in" class="w-full" :loading="loading" />
      </form>

      <p class="auth-footer">
        Não tem conta? <router-link to="/register">Cadastre-se</router-link>
      </p>

      <div class="demo-credentials">
        <small>Demo admin: admin@datesoccer.com / Admin@123</small>
      </div>
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
.demo-credentials { text-align: center; margin-top: 1rem; color: var(--ds-text-muted); }
</style>
