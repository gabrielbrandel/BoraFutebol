<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { fieldsApi } from '@/services/endpoints'
import type { Field } from '@/types'
import { FIELD_TYPE_LABELS } from '@/types'
import { resolveAssetUrl } from '@/utils/address'
import { useDebouncedWatch } from '@/composables/useDebouncedWatch'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import FilterChips from '@/components/FilterChips.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import type { FilterOption } from '@/components/FilterSheet.vue'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const fields = ref<Field[]>([])
const cities = ref<string[]>([])
const loading = ref(true)
const search = ref('')
const city = ref<string | null>(null)
const type = ref<string | null>(null)
const showCitySheet = ref(false)
const showTypeSheet = ref(false)

const canCreate = computed(() => settings.canCreateFields(auth.isAdmin))

const typeOptions: FilterOption[] = [
  { label: 'Todos os tipos', value: null },
  { label: 'Society', value: 'Society' },
  { label: 'Campo', value: 'Field' },
  { label: 'Futsal', value: 'Futsal' }
]

const cityOptions = computed<FilterOption[]>(() => [
  { label: 'Todas as cidades', value: null },
  ...cities.value.map(c => ({ label: c, value: c }))
])

const filterChips = computed(() => [
  { id: 'city', label: city.value || 'Cidade', value: city.value, icon: 'pi pi-map-marker' },
  { id: 'type', label: type.value ? FIELD_TYPE_LABELS[type.value] || type.value : 'Tipo', value: type.value, icon: 'pi pi-flag' }
])

onMounted(async () => {
  if (!settings.loaded) await settings.fetchSettings()
  await loadCities()
  await load()
})

useDebouncedWatch([search, city, type], load)

async function loadCities() {
  try {
    const { data } = await fieldsApi.getCities()
    if (data.success) cities.value = data.data
  } catch {
    cities.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await fieldsApi.getAll({
      page: 1,
      pageSize: 20,
      search: search.value || undefined,
      city: city.value || undefined,
      type: type.value || undefined
    })
    if (data.success) fields.value = data.data.items
  } finally {
    loading.value = false
  }
}

function fieldImage(field: Field) {
  return resolveAssetUrl(field.mainPhotoUrl)
}

function goCreate() {
  if (!auth.isAuthenticated) return router.push({ name: 'login', query: { redirect: '/fields/new' } })
  router.push('/fields/new')
}

function openSheet(id: string) {
  if (id === 'city') showCitySheet.value = true
  else if (id === 'type') showTypeSheet.value = true
}

function clearFilters() {
  city.value = null
  type.value = null
}
</script>

<template>
  <div class="page-container">
    <div class="header-row">
      <div>
        <h1 class="page-title">Campos</h1>
        <p class="page-subtitle">Encontre quadras perto de você</p>
      </div>
      <Button v-if="canCreate" icon="pi pi-plus" rounded class="create-mobile" aria-label="Cadastrar campo" @click="goCreate" />
      <Button v-if="canCreate" label="Cadastrar" icon="pi pi-plus" size="small" class="create-desktop" @click="goCreate" />
    </div>

    <div class="search-inline">
      <i class="pi pi-search" />
      <InputText v-model="search" placeholder="Nome, cidade ou endereço..." />
    </div>

    <FilterChips :chips="filterChips" @click="openSheet" @clear="clearFilters" />

    <FilterSheet
      v-model:visible="showCitySheet"
      title="Escolher cidade"
      :options="cityOptions"
      :model-value="city"
      @update:model-value="city = $event"
    />
    <FilterSheet
      v-model:visible="showTypeSheet"
      title="Tipo de campo"
      :options="typeOptions"
      :model-value="type"
      @update:model-value="type = $event"
    />

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <div v-else-if="!fields.length" class="empty">
      <i class="pi pi-map-marker" />
      <p>Nenhum campo encontrado{{ search ? ` para "${search}"` : '' }}</p>
      <small v-if="search">Tente buscar só parte do nome ou da cidade</small>
    </div>

    <div v-else class="card-grid">
      <div v-for="field in fields" :key="field.id" class="match-card">
        <div class="match-card-image">
          <img v-if="fieldImage(field)" :src="fieldImage(field)!" :alt="field.name" class="field-photo" />
          <i v-else class="pi pi-map-marker" />
        </div>
        <div class="match-card-body">
          <h3 class="match-card-title">{{ field.name }}</h3>
          <p class="address">
            <span class="address-line"><i class="pi pi-map-marker" /> {{ field.city }}/{{ field.state }}</span>
            <span class="address-line muted">{{ field.address }}</span>
          </p>
          <div class="tags">
            <Tag :value="FIELD_TYPE_LABELS[field.type]" />
            <Tag v-if="field.hasLockerRoom" value="Vestiário" severity="info" />
            <Tag v-if="field.hasParking" value="Estacionamento" severity="info" />
          </div>
          <div class="match-card-footer">
            <span class="price-tag">R$ {{ field.pricePerPlayer.toFixed(2) }}/jogador</span>
            <span class="stars"><i class="pi pi-star-fill" /> {{ field.averageRating.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.header-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 0.75rem; gap: 0.5rem;
}
.create-mobile { display: none; }
.create-desktop { display: inline-flex; }
.search-inline {
  display: flex; align-items: center; gap: 0.5rem;
  background: var(--ds-surface); border: 1px solid var(--ds-border);
  border-radius: 999px; padding: 0 1rem; margin-bottom: 0.75rem;
  i { color: var(--ds-text-muted); font-size: 0.85rem; }
  :deep(.p-inputtext) { border: none; background: transparent; box-shadow: none; width: 100%; padding: 0.65rem 0; }
}
.address {
  display: flex; flex-direction: column; gap: 0.2rem;
  font-size: 0.875rem; margin-bottom: 0.75rem;
  .address-line { display: flex; align-items: center; gap: 0.35rem; }
  .muted { color: var(--ds-text-muted); font-size: 0.8rem; padding-left: 1.25rem; }
}
.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.stars { color: #fbbf24; font-weight: 600; }
.loading, .empty { text-align: center; padding: 3rem; color: var(--ds-text-muted); }
.empty i { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
.empty small { display: block; margin-top: 0.5rem; font-size: 0.8rem; }

@media (max-width: 640px) {
  .create-mobile { display: inline-flex; }
  .create-desktop { display: none; }
  .page-subtitle { display: none; }
}
</style>
