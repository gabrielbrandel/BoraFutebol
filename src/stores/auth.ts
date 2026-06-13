import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/endpoints'
import type { UserProfile } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))

  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')

  function setAuth(token: string, refresh: string, userData: UserProfile) {
    accessToken.value = token
    refreshToken.value = refresh
    user.value = userData
    localStorage.setItem('accessToken', token)
    localStorage.setItem('refreshToken', refresh)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function logout() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.clear()
  }

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password)
    if (data.success) setAuth(data.data.accessToken, data.data.refreshToken, data.data.user)
    return data
  }

  async function register(formData: Record<string, unknown>) {
    const { data } = await authApi.register(formData)
    if (data.success) setAuth(data.data.accessToken, data.data.refreshToken, data.data.user)
    return data
  }

  async function quickRegister(formData: { name: string; whatsApp: string; primaryPosition: string }) {
    const { data } = await authApi.quickRegister(formData)
    if (data.success) setAuth(data.data.accessToken, data.data.refreshToken, data.data.user)
    return data
  }

  async function fetchProfile() {
    if (!accessToken.value) return
    try {
      const { data } = await authApi.getProfile()
      if (data.success) user.value = data.data
    } catch {
      logout()
    }
  }

  function init() {
    const stored = localStorage.getItem('user')
    if (stored && accessToken.value) user.value = JSON.parse(stored)
  }

  init()

  return { user, accessToken, isAuthenticated, isAdmin, login, register, quickRegister, logout, fetchProfile, setAuth }
})
