import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { settingsApi } from '@/services/endpoints'
import { queryCache } from '@/services/queryCache'
import type { AppSettings } from '@/types'

const defaultSettings: AppSettings = {
  onlyAdminCanCreateFields: true,
  onlyAdminCanCreateMatches: true,
  usersCanCreateFields: false,
  usersCanCreateMatches: false
}

const CACHE_KEY = 'settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...defaultSettings })
  const loaded = ref(false)
  const refreshing = ref(false)

  const usersCanCreateFields = computed(() => settings.value.usersCanCreateFields)
  const usersCanCreateMatches = computed(() => settings.value.usersCanCreateMatches)

  async function fetchFromApi() {
    const { data } = await settingsApi.get()
    if (data.success) {
      settings.value = data.data
      queryCache.set(CACHE_KEY, data.data)
    }
  }

  async function fetchSettings(background = false) {
    const cached = queryCache.getEntry<AppSettings>(CACHE_KEY)
    if (cached) {
      settings.value = cached.data
      loaded.value = true
      if (Date.now() - cached.timestamp < 60_000 && !background) return
    }

    refreshing.value = !!cached
    try {
      await fetchFromApi()
    } catch {
      if (!cached) settings.value = { ...defaultSettings }
    } finally {
      loaded.value = true
      refreshing.value = false
    }
  }

  async function updateSettings(payload: { onlyAdminCanCreateFields: boolean; onlyAdminCanCreateMatches: boolean }) {
    const { data } = await settingsApi.update(payload)
    if (data.success) {
      settings.value = data.data
      queryCache.set(CACHE_KEY, data.data)
    }
    return data
  }

  function canCreateFields(isAdmin: boolean) {
    return isAdmin || settings.value.usersCanCreateFields
  }

  function canCreateMatches(isAdmin: boolean) {
    return isAdmin || settings.value.usersCanCreateMatches
  }

  return {
    settings, loaded, refreshing, usersCanCreateFields, usersCanCreateMatches,
    fetchSettings, updateSettings, canCreateFields, canCreateMatches
  }
})
