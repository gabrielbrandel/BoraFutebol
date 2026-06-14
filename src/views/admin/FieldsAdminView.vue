<script setup lang="ts">
defineOptions({ name: 'FieldsAdminView' })

import { ref, computed } from 'vue'
import { fieldsApi } from '@/services/endpoints'
import { queryCache } from '@/services/queryCache'
import { useCachedQuery } from '@/composables/useCachedQuery'
import type { Field } from '@/types'
import { FIELD_TYPE_LABELS } from '@/types'
import { lookupCep, geocodeAddress, formatCep, resolveAssetUrl } from '@/utils/address'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import SelectButton from 'primevue/selectbutton'
import FileUpload from 'primevue/fileupload'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const { data, loading, refreshing, refresh } = useCachedQuery<Field[]>(
  'admin:fields',
  async () => {
    const { data: res } = await fieldsApi.getAll({ page: 1, pageSize: 50 })
    return res.success ? res.data.items : []
  },
  { staleMs: 20_000 }
)

const fields = computed(() => data.value ?? [])

async function reloadFields() {
  queryCache.invalidate('admin:fields')
  queryCache.invalidate('fields')
  queryCache.invalidate('map')
  await refresh(false)
}
const showDialog = ref(false)
const editingId = ref<string | null>(null)
const loadingCep = ref(false)
const uploading = ref(false)
const photoMode = ref<'link' | 'upload'>('link')

const emptyForm = () => ({
  name: '', zipCode: '', address: '', latitude: -23.55, longitude: -46.63,
  city: '', state: 'SP', type: 'Society', maxPlayers: 14,
  pricePerPlayer: 35, hasLockerRoom: false, hasBarbecue: false,
  hasParking: false, hasCoverage: false, mainPhotoUrl: ''
})

const form = ref(emptyForm())

const typeOptions = [
  { label: 'Society', value: 'Society' },
  { label: 'Campo', value: 'Field' },
  { label: 'Futsal', value: 'Futsal' }
]

const photoModeOptions = [
  { label: 'Link da imagem', value: 'link' },
  { label: 'Upload', value: 'upload' }
]

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  photoMode.value = 'link'
  showDialog.value = true
}

function openEdit(field: Field) {
  editingId.value = field.id
  form.value = {
    name: field.name,
    zipCode: field.zipCode || '',
    address: field.address,
    latitude: field.latitude,
    longitude: field.longitude,
    city: field.city,
    state: field.state,
    type: field.type,
    maxPlayers: field.maxPlayers,
    pricePerPlayer: field.pricePerPlayer,
    hasLockerRoom: field.hasLockerRoom,
    hasBarbecue: field.hasBarbecue,
    hasParking: field.hasParking,
    hasCoverage: field.hasCoverage,
    mainPhotoUrl: field.mainPhotoUrl || ''
  }
  photoMode.value = field.mainPhotoUrl?.startsWith('/uploads') ? 'upload' : 'link'
  showDialog.value = true
}

async function searchCep() {
  loadingCep.value = true
  try {
    const result = await lookupCep(form.value.zipCode)
    if (!result) {
      toast.add({ severity: 'warn', summary: 'CEP não encontrado' })
      return
    }
    form.value.zipCode = formatCep(result.cep)
    form.value.address = [result.logradouro, result.bairro].filter(Boolean).join(', ')
    form.value.city = result.localidade
    form.value.state = result.uf

    const coords = await geocodeAddress(form.value.address, form.value.city, form.value.state)
    if (coords) {
      form.value.latitude = coords.lat
      form.value.longitude = coords.lng
    }
    toast.add({ severity: 'success', summary: 'Endereço preenchido pelo CEP' })
  } finally {
    loadingCep.value = false
  }
}

async function onPhotoUpload(event: { files: File[] }) {
  const file = event.files[0]
  if (!file) return
  uploading.value = true
  try {
    const { data } = await fieldsApi.uploadPhoto(file)
    if (data.success && data.data) {
      form.value.mainPhotoUrl = (data.data as { url: string }).url
      toast.add({ severity: 'success', summary: 'Foto enviada!' })
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Erro ao enviar foto' })
  } finally {
    uploading.value = false
  }
}

async function saveField() {
  try {
    const payload = { ...form.value, zipCode: form.value.zipCode || null, mainPhotoUrl: form.value.mainPhotoUrl || null }
    if (editingId.value) {
      await fieldsApi.update(editingId.value, payload)
      toast.add({ severity: 'success', summary: 'Campo atualizado!' })
    } else {
      await fieldsApi.create(payload)
      toast.add({ severity: 'success', summary: 'Campo cadastrado!' })
    }
    showDialog.value = false
    await reloadFields()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.add({ severity: 'error', summary: 'Erro ao salvar', detail: err.response?.data?.message || 'Tente novamente' })
  }
}

function deleteField(field: Field) {
  confirm.require({
    message: `Remover o campo "${field.name}"?`,
    header: 'Confirmar',
    accept: async () => {
      await fieldsApi.delete(field.id)
      toast.add({ severity: 'success', summary: 'Campo removido' })
      await reloadFields()
    }
  })
}

function fieldPhoto(url?: string) {
  return resolveAssetUrl(url)
}
</script>

<template>
  <div class="page-container">
    <RefreshIndicator :visible="refreshing" />
    <div class="header-row">
      <h1 class="page-title">Gerenciar Campos</h1>
      <Button label="Novo Campo" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <DataTable v-else :value="fields" stripedRows paginator :rows="10">
      <Column header="Foto" style="width: 80px">
        <template #body="{ data }">
          <img v-if="fieldPhoto(data.mainPhotoUrl)" :src="fieldPhoto(data.mainPhotoUrl)!" :alt="data.name" class="thumb" />
          <i v-else class="pi pi-image text-muted" />
        </template>
      </Column>
      <Column field="name" header="Nome" />
      <Column field="city" header="Cidade" />
      <Column field="type" header="Tipo">
        <template #body="{ data }">{{ FIELD_TYPE_LABELS[data.type] || data.type }}</template>
      </Column>
      <Column field="maxPlayers" header="Vagas" />
      <Column field="pricePerPlayer" header="Valor">
        <template #body="{ data }">R$ {{ data.pricePerPlayer.toFixed(2) }}</template>
      </Column>
      <Column header="Ações" style="width: 120px">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" text rounded @click="openEdit(data)" />
          <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteField(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showDialog"
      :header="editingId ? 'Editar Campo' : 'Novo Campo'"
      modal
      :dismissableMask="false"
      style="width: 600px"
    >
      <div class="form-grid">
        <div class="field full"><label>Nome</label><InputText v-model="form.name" class="w-full" /></div>

        <div class="field full cep-row">
          <label>CEP</label>
          <div class="cep-input">
            <InputText v-model="form.zipCode" placeholder="00000-000" class="w-full" @input="form.zipCode = formatCep(form.zipCode)" />
            <Button label="Buscar" icon="pi pi-search" :loading="loadingCep" @click="searchCep" />
          </div>
        </div>

        <div class="field full"><label>Endereço</label><InputText v-model="form.address" class="w-full" /></div>
        <div class="field"><label>Cidade</label><InputText v-model="form.city" class="w-full" /></div>
        <div class="field"><label>Estado</label><InputText v-model="form.state" maxlength="2" class="w-full" /></div>
        <div class="field"><label>Tipo</label><Select v-model="form.type" :options="typeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full" /></div>
        <div class="field"><label>Latitude</label><InputNumber v-model="form.latitude" :minFractionDigits="4" class="w-full" /></div>
        <div class="field"><label>Longitude</label><InputNumber v-model="form.longitude" :minFractionDigits="4" class="w-full" /></div>
        <div class="field"><label>Vagas</label><InputNumber v-model="form.maxPlayers" class="w-full" /></div>
        <div class="field"><label>Valor/Jogador</label><InputNumber v-model="form.pricePerPlayer" mode="currency" currency="BRL" locale="pt-BR" class="w-full" /></div>

        <div class="field full photo-section">
          <label>Foto do campo</label>
          <SelectButton v-model="photoMode" :options="photoModeOptions" optionLabel="label" optionValue="value" />
          <InputText v-if="photoMode === 'link'" v-model="form.mainPhotoUrl" placeholder="https://... ou data:image/..." class="w-full mt" />
          <div v-else class="upload-area mt">
            <FileUpload mode="basic" accept="image/*" :auto="true" chooseLabel="Escolher imagem" :disabled="uploading" @select="onPhotoUpload" />
          </div>
          <img v-if="fieldPhoto(form.mainPhotoUrl)" :src="fieldPhoto(form.mainPhotoUrl)!" class="preview" alt="Prévia da foto" />
        </div>

        <div class="checkboxes">
          <label><Checkbox v-model="form.hasLockerRoom" binary /> Vestiário</label>
          <label><Checkbox v-model="form.hasBarbecue" binary /> Churrasqueira</label>
          <label><Checkbox v-model="form.hasParking" binary /> Estacionamento</label>
          <label><Checkbox v-model="form.hasCoverage" binary /> Cobertura</label>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="showDialog = false" />
        <Button :label="editingId ? 'Salvar' : 'Criar'" icon="pi pi-check" @click="saveField" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; }
.field.full { grid-column: 1 / -1; }
.w-full { width: 100%; }
.mt { margin-top: 0.75rem; }
.cep-input { display: flex; gap: 0.5rem; }
.checkboxes { display: flex; flex-wrap: wrap; gap: 1rem; grid-column: 1 / -1; label { display: flex; align-items: center; gap: 0.5rem; } }
.thumb { width: 56px; height: 40px; object-fit: cover; border-radius: 6px; }
.preview { margin-top: 0.75rem; max-width: 100%; max-height: 120px; border-radius: 8px; object-fit: cover; }
.text-muted { color: var(--ds-text-muted); }
.photo-section { display: flex; flex-direction: column; gap: 0.5rem; }
.loading { display: flex; justify-content: center; padding: 3rem; }
</style>
