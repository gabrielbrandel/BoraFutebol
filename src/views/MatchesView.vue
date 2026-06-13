<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { matchesApi } from '@/services/endpoints'
import type { Match } from '@/types'
import { MATCH_STATUS_LABELS } from '@/types'
import { useDebouncedWatch } from '@/composables/useDebouncedWatch'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import FilterChips from '@/components/FilterChips.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import type { FilterOption } from '@/components/FilterSheet.vue'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const matches = ref<Match[]>([])
const cities = ref<string[]>([])
const loading = ref(true)
const search = ref('')
const statusFilter = ref<string | null>(null)
const cityFilter = ref<string | null>(null)
const maxPrice = ref<number | null>(null)
const maxDistance = ref<number | null>(null)
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const showStatusSheet = ref(false)
const showCitySheet = ref(false)
const showDistanceSheet = ref(false)
const showPriceSheet = ref(false)

const canCreate = computed(() => settings.canCreateMatches(auth.isAdmin))

const statusOptions: FilterOption[] = [
  { label: 'Todas', value: null },
  { label: 'Aberta', value: 'Open' },
  { label: 'Fechada', value: 'Closed' },
  { label: 'Finalizada', value: 'Finished' }
]

const distanceOptions: FilterOption[] = [
  { label: 'Qualquer distância', value: null },
  { label: 'Até 5 km', value: '5' },
  { label: 'Até 10 km', value: '10' },
  { label: 'Até 20 km', value: '20' },
  { label: 'Até 50 km', value: '50' }
]

const priceOptions: FilterOption[] = [
  { label: 'Qualquer valor', value: null },
  { label: 'Até R$ 30', value: '30' },
  { label: 'Até R$ 50', value: '50' },
  { label: 'Até R$ 80', value: '80' },
  { label: 'Até R$ 100', value: '100' }
]

const cityOptions = computed<FilterOption[]>(() => [
  { label: 'Todas as cidades', value: null },
  ...cities.value.map(c => ({ label: c, value: c }))
])

const distanceValue = computed({
  get: () => maxDistance.value?.toString() ?? null,
  set: (v: string | null) => { maxDistance.value = v ? Number(v) : null }
})

const priceValue = computed({
  get: () => maxPrice.value?.toString() ?? null,
  set: (v: string | null) => { maxPrice.value = v ? Number(v) : null }
})

const statusLabel = computed(() =>
  statusOptions.find(o => o.value === statusFilter.value)?.label ?? 'Status'
)

const priceLabel = computed(() =>
  priceOptions.find(o => o.value === priceValue.value)?.label ?? 'Preço'
)

const distanceLabel = computed(() =>
  distanceOptions.find(o => o.value === distanceValue.value)?.label ?? 'Distância'
)

const filterChips = computed(() => [
  { id: 'city', label: cityFilter.value || 'Cidade', value: cityFilter.value, icon: 'pi pi-map-marker' },
  { id: 'status', label: statusFilter.value ? statusLabel.value : 'Status', value: statusFilter.value, icon: 'pi pi-filter' },
  { id: 'distance', label: maxDistance.value ? distanceLabel.value : 'Distância', value: distanceValue.value, icon: 'pi pi-compass' },
  { id: 'price', label: maxPrice.value ? priceLabel.value : 'Preço', value: priceValue.value, icon: 'pi pi-wallet' }
])

async function loadCities() {
  try {
    const { data } = await matchesApi.getCities()
    if (data.success) cities.value = data.data
  } catch {
    cities.value = []
  }
}

async function loadMatches() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: 1, pageSize: 20,
      search: search.value || undefined,
      status: statusFilter.value || undefined,
      city: cityFilter.value || undefined,
      maxPrice: maxPrice.value ?? undefined
    }
    if (maxDistance.value && userLocation.value) {
      params.maxDistanceKm = maxDistance.value
      params.userLatitude = userLocation.value.lat
      params.userLongitude = userLocation.value.lng
    }
    const { data } = await matchesApi.getAll(params)
    if (data.success) matches.value = data.data.items
  } finally {
    loading.value = false
  }
}

function getLocation() {
  navigator.geolocation.getCurrentPosition(
    pos => { userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }; loadMatches() },
    () => loadMatches()
  )
}

onMounted(async () => {
  if (!settings.loaded) await settings.fetchSettings()
  await loadCities()
  getLocation()
})

useDebouncedWatch([search, statusFilter, cityFilter, maxPrice, maxDistance], loadMatches)

function goCreate() {
  if (!auth.isAuthenticated) return router.push({ name: 'login', query: { redirect: '/matches/new' } })
  router.push('/matches/new')
}

function openSheet(id: string) {
  if (id === 'city') showCitySheet.value = true
  else if (id === 'status') showStatusSheet.value = true
  else if (id === 'distance') showDistanceSheet.value = true
  else if (id === 'price') showPriceSheet.value = true
}

function clearFilters() {
  statusFilter.value = null
  cityFilter.value = null
  maxPrice.value = null
  maxDistance.value = null
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}
</script>

<template>
  <div class="page-container">
    <div class="header-row">
      <div>
        <h1 class="page-title">Peladas</h1>
        <p class="page-subtitle">Encontre jogos perto de você</p>
      </div>
      <Button v-if="canCreate" icon="pi pi-plus" rounded class="create-mobile" aria-label="Organizar pelada" @click="goCreate" />
      <Button v-if="canCreate" label="Organizar" icon="pi pi-plus" size="small" class="create-desktop" @click="goCreate" />
    </div>

    <div class="search-inline">
      <i class="pi pi-search" />
      <InputText v-model="search" placeholder="Campo ou cidade..." />
    </div>

    <FilterChips :chips="filterChips" @click="openSheet" @clear="clearFilters" />

    <FilterSheet v-model:visible="showCitySheet" title="Cidade" :options="cityOptions" :model-value="cityFilter" @update:model-value="cityFilter = $event" />
    <FilterSheet v-model:visible="showStatusSheet" title="Status" :options="statusOptions" :model-value="statusFilter" @update:model-value="statusFilter = $event" />
    <FilterSheet v-model:visible="showDistanceSheet" title="Distância" :options="distanceOptions" :model-value="distanceValue" @update:model-value="distanceValue = $event" />
    <FilterSheet v-model:visible="showPriceSheet" title="Preço máximo" :options="priceOptions" :model-value="priceValue" @update:model-value="priceValue = $event" />

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <div v-else-if="matches.length" class="card-grid">
      <div v-for="match in matches" :key="match.id" class="match-card" @click="router.push(`/matches/${match.id}`)">
        <div class="match-card-image">
          <img v-if="match.fieldMainPhotoUrl" :src="match.fieldMainPhotoUrl" :alt="match.fieldName" class="field-photo" />
          <i v-else class="pi pi-flag" />
        </div>
        <div class="match-card-body">
          <h3 class="match-card-title">{{ match.fieldName }}</h3>
          <p class="address">{{ match.fieldAddress }}</p>
          <div class="match-card-meta">
            <span><i class="pi pi-calendar" /> {{ formatDate(match.date) }}</span>
            <span><i class="pi pi-clock" /> {{ match.time }}</span>
            <span><i class="pi pi-users" /> {{ match.confirmedCount }}/{{ match.maxPlayers }}</span>
          </div>
          <div class="match-card-footer">
            <span class="price-tag">R$ {{ match.participationFee.toFixed(2) }}</span>
            <span :class="['status-badge', match.status.toLowerCase()]">{{ MATCH_STATUS_LABELS[match.status] }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <i class="pi pi-calendar" />
      <p>Nenhuma pelada encontrada</p>
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
.address { color: var(--ds-text-muted); font-size: 0.875rem; margin-bottom: 0.5rem; }
.loading, .empty { text-align: center; padding: 3rem; color: var(--ds-text-muted); i { font-size: 3rem; display: block; margin-bottom: 1rem; } }
@media (max-width: 640px) {
  .create-mobile { display: inline-flex; }
  .create-desktop { display: none; }
  .page-subtitle { display: none; }
}
</style>
