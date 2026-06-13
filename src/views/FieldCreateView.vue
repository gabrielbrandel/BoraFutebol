<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { fieldsApi } from '@/services/endpoints'
import { lookupCep, geocodeAddress, formatCep, resolveAssetUrl } from '@/utils/address'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import SelectButton from 'primevue/selectbutton'
import FileUpload from 'primevue/fileupload'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const toast = useToast()
const loadingCep = ref(false)
const uploading = ref(false)
const photoMode = ref<'link' | 'upload'>('link')

const form = ref({
  name: '', zipCode: '', address: '', latitude: -23.55, longitude: -46.63,
  city: '', state: 'SP', type: 'Society', maxPlayers: 14,
  pricePerPlayer: 35, hasLockerRoom: false, hasBarbecue: false,
  hasParking: false, hasCoverage: false, mainPhotoUrl: ''
})

const typeOptions = [
  { label: 'Society', value: 'Society' },
  { label: 'Campo', value: 'Field' },
  { label: 'Futsal', value: 'Futsal' }
]

const photoModeOptions = [
  { label: 'Link', value: 'link' },
  { label: 'Upload', value: 'upload' }
]

onMounted(async () => {
  if (!settings.loaded) await settings.fetchSettings()
  if (!settings.canCreateFields(auth.isAdmin)) {
    toast.add({ severity: 'warn', summary: 'Cadastro de campos não permitido' })
    router.push('/fields')
  }
})

async function searchCep() {
  loadingCep.value = true
  try {
    const result = await lookupCep(form.value.zipCode)
    if (!result) { toast.add({ severity: 'warn', summary: 'CEP não encontrado' }); return }
    form.value.zipCode = formatCep(result.cep)
    form.value.address = [result.logradouro, result.bairro].filter(Boolean).join(', ')
    form.value.city = result.localidade
    form.value.state = result.uf
    const coords = await geocodeAddress(form.value.address, form.value.city, form.value.state)
    if (coords) { form.value.latitude = coords.lat; form.value.longitude = coords.lng }
  } finally { loadingCep.value = false }
}

async function onPhotoUpload(event: { files: File[] }) {
  const file = event.files[0]
  if (!file) return
  uploading.value = true
  try {
    const { data } = await fieldsApi.uploadPhoto(file)
    if (data.success && data.data) form.value.mainPhotoUrl = (data.data as { url: string }).url
  } finally { uploading.value = false }
}

async function submit() {
  try {
    await fieldsApi.create({ ...form.value, zipCode: form.value.zipCode || null, mainPhotoUrl: form.value.mainPhotoUrl || null })
    toast.add({ severity: 'success', summary: 'Campo cadastrado com sucesso!' })
    router.push('/fields')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.add({ severity: 'error', summary: 'Erro', detail: err.response?.data?.message })
  }
}
</script>

<template>
  <div class="page-container narrow">
    <h1 class="page-title">Cadastrar meu campo</h1>
    <p class="page-subtitle">Anuncie seu campo para outros jogadores encontrarem — estilo Airbnb</p>

    <div class="form-card">
      <div class="form-grid">
        <div class="field full"><label>Nome do campo</label><InputText v-model="form.name" class="w-full" /></div>
        <div class="field full">
          <label>CEP</label>
          <div class="cep-row">
            <InputText v-model="form.zipCode" placeholder="00000-000" class="w-full" @input="form.zipCode = formatCep(form.zipCode)" />
            <Button label="Buscar" icon="pi pi-search" :loading="loadingCep" @click="searchCep" />
          </div>
        </div>
        <div class="field full"><label>Endereço</label><InputText v-model="form.address" class="w-full" /></div>
        <div class="field"><label>Cidade</label><InputText v-model="form.city" class="w-full" /></div>
        <div class="field"><label>Estado</label><InputText v-model="form.state" maxlength="2" class="w-full" /></div>
        <div class="field"><label>Tipo</label><Select v-model="form.type" :options="typeOptions" optionLabel="label" optionValue="value" class="w-full" /></div>
        <div class="field"><label>Vagas</label><InputNumber v-model="form.maxPlayers" class="w-full" /></div>
        <div class="field"><label>Valor por jogador</label><InputNumber v-model="form.pricePerPlayer" mode="currency" currency="BRL" locale="pt-BR" class="w-full" /></div>
        <div class="field full">
          <label>Foto</label>
          <SelectButton v-model="photoMode" :options="photoModeOptions" optionLabel="label" optionValue="value" />
          <InputText v-if="photoMode === 'link'" v-model="form.mainPhotoUrl" placeholder="URL da imagem" class="w-full mt" />
          <FileUpload v-else mode="basic" accept="image/*" :auto="true" chooseLabel="Enviar foto" class="mt" :disabled="uploading" @select="onPhotoUpload" />
          <img v-if="resolveAssetUrl(form.mainPhotoUrl)" :src="resolveAssetUrl(form.mainPhotoUrl)!" class="preview" />
        </div>
        <div class="checkboxes">
          <label><Checkbox v-model="form.hasLockerRoom" binary /> Vestiário</label>
          <label><Checkbox v-model="form.hasBarbecue" binary /> Churrasqueira</label>
          <label><Checkbox v-model="form.hasParking" binary /> Estacionamento</label>
          <label><Checkbox v-model="form.hasCoverage" binary /> Cobertura</label>
        </div>
      </div>
      <div class="actions">
        <Button label="Cancelar" text @click="router.push('/fields')" />
        <Button label="Publicar campo" icon="pi pi-check" @click="submit" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.narrow { max-width: 640px; }
.form-card { background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 12px; padding: 1.5rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; }
.field.full { grid-column: 1 / -1; }
.w-full { width: 100%; }
.mt { margin-top: 0.75rem; }
.cep-row { display: flex; gap: 0.5rem; }
.checkboxes { display: flex; flex-wrap: wrap; gap: 1rem; grid-column: 1 / -1; label { display: flex; align-items: center; gap: 0.5rem; } }
.preview { margin-top: 0.75rem; max-height: 120px; border-radius: 8px; }
.actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
</style>
