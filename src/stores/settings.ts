import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { settingsApi } from '@/services/endpoints'
import type { AppSettings } from '@/types'

const defaultSettings: AppSettings = {
  onlyAdminCanCreateFields: true,
  onlyAdminCanCreateMatches: true,
  usersCanCreateFields: false,
  usersCanCreateMatches: false
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...defaultSettings })
  const loaded = ref(false)

  const usersCanCreateFields = computed(() => settings.value.usersCanCreateFields)
  const usersCanCreateMatches = computed(() => settings.value.usersCanCreateMatches)

  async function fetchSettings() {
    try {
      const { data } = await settingsApi.get()
      if (data.success) settings.value = data.data
    } catch {
      settings.value = { ...defaultSettings }
    } finally {
      loaded.value = true
    }
  }

  async function updateSettings(payload: { onlyAdminCanCreateFields: boolean; onlyAdminCanCreateMatches: boolean }) {
    const { data } = await settingsApi.update(payload)
    if (data.success) settings.value = data.data
    return data
  }

  function canCreateFields(isAdmin: boolean) {
    return isAdmin || settings.value.usersCanCreateFields
  }

  function canCreateMatches(isAdmin: boolean) {
    return isAdmin || settings.value.usersCanCreateMatches
  }

  return {
    settings, loaded, usersCanCreateFields, usersCanCreateMatches,
    fetchSettings, updateSettings, canCreateFields, canCreateMatches
  }
})
