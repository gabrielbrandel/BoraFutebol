<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import Card from 'primevue/card'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const settingsStore = useSettingsStore()
const saving = ref(false)

const onlyAdminFields = ref(true)
const onlyAdminMatches = ref(true)

onMounted(async () => {
  await settingsStore.fetchSettings()
  onlyAdminFields.value = settingsStore.settings.onlyAdminCanCreateFields
  onlyAdminMatches.value = settingsStore.settings.onlyAdminCanCreateMatches
})

async function save() {
  saving.value = true
  try {
    await settingsStore.updateSettings({
      onlyAdminCanCreateFields: onlyAdminFields.value,
      onlyAdminCanCreateMatches: onlyAdminMatches.value
    })
    toast.add({ severity: 'success', summary: 'Parâmetros salvos!' })
  } catch {
    toast.add({ severity: 'error', summary: 'Erro ao salvar parâmetros' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Parâmetros do Sistema</h1>
    <p class="page-subtitle">Defina quem pode cadastrar campos e criar partidas — estilo Airbnb ou apenas admin</p>

    <Message severity="info" :closable="false" class="info-msg">
      Quando desativado, qualquer usuário logado poderá cadastrar campos ou criar peladas, como anfitriões no Airbnb.
    </Message>

    <div class="cards">
      <Card>
        <template #title><i class="pi pi-map-marker" /> Cadastro de Campos</template>
        <template #content>
          <div class="setting-row">
            <div>
              <strong>Apenas administradores</strong>
              <p>Somente admins podem adicionar novos campos na plataforma</p>
            </div>
            <ToggleSwitch v-model="onlyAdminFields" />
          </div>
          <p class="hint" v-if="!onlyAdminFields">Usuários verão o botão "Cadastrar meu campo" nas páginas públicas</p>
        </template>
      </Card>

      <Card>
        <template #title><i class="pi pi-calendar" /> Criação de Partidas</template>
        <template #content>
          <div class="setting-row">
            <div>
              <strong>Apenas administradores</strong>
              <p>Somente admins podem criar novas peladas</p>
            </div>
            <ToggleSwitch v-model="onlyAdminMatches" />
          </div>
          <p class="hint" v-if="!onlyAdminMatches">Usuários verão o botão "Organizar pelada" na lista de partidas</p>
        </template>
      </Card>
    </div>

    <Button label="Salvar parâmetros" icon="pi pi-check" :loading="saving" @click="save" />
  </div>
</template>

<style scoped lang="scss">
.info-msg { margin-bottom: 1.5rem; }
.cards { display: grid; gap: 1.5rem; margin-bottom: 1.5rem; max-width: 700px; }
.setting-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; p { margin: 0.25rem 0 0; color: var(--ds-text-muted); font-size: 0.875rem; } }
.hint { margin-top: 1rem; font-size: 0.875rem; color: var(--ds-primary); }
:deep(.p-card-title) { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; }
</style>
