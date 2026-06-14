<script setup lang="ts">
defineOptions({ name: 'MapView' })

import { ref, computed, onMounted, watch } from 'vue'
import { LMap, LTileLayer, LMarker, LPopup, LPolyline } from '@vue-leaflet/vue-leaflet'
import { fieldsApi } from '@/services/endpoints'
import type { Field } from '@/types'
import { FIELD_TYPE_LABELS } from '@/types'
import { useGeolocation } from '@/composables/useGeolocation'
import { useCachedQuery } from '@/composables/useCachedQuery'
import { useThemeStore } from '@/stores/theme'
import FilterChips from '@/components/FilterChips.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import type { FilterOption } from '@/components/FilterSheet.vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

const userIcon = L.divIcon({
  className: 'user-marker',
  html: '<div class="user-marker-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
}) as L.Icon

const fieldIcon = L.divIcon({
  className: 'field-marker',
  html: '<div class="field-marker-pin"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -24]
}) as L.Icon

const theme = useThemeStore()
const { coords, loading: geoLoading, error: geoError, source, resolveLocation } = useGeolocation()

const selectedField = ref<Field | null>(null)
const routeCoords = ref<[number, number][]>([])
const maxDistance = ref<number | null>(null)
const showDistanceSheet = ref(false)
const sheetExpanded = ref(false)
const mapRef = ref<{ leafletObject: L.Map } | null>(null)

const zoom = ref(13)

const userLocation = computed<[number, number]>(() => {
  const c = coords.value
  return c ? [c.lat, c.lng] : [-15.7801, -47.9292]
})

const tileUrl = computed(() =>
  theme.isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
)

const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

const distanceOptions: FilterOption[] = [
  { label: 'Todos', value: null },
  { label: '5 km', value: '5' },
  { label: '10 km', value: '10' },
  { label: '20 km', value: '20' },
  { label: '50 km', value: '50' }
]

const distanceValue = computed({
  get: () => maxDistance.value?.toString() ?? null,
  set: (v: string | null) => { maxDistance.value = v ? Number(v) : null }
})

const distanceChip = computed(() => [{
  id: 'distance',
  label: maxDistance.value ? `${maxDistance.value} km` : 'Distância',
  value: maxDistance.value ? String(maxDistance.value) : null,
  icon: 'pi pi-sliders-h'
}])

const locationHint = computed(() => {
  if (source.value === 'ip') return 'Localização aproximada'
  if (source.value === 'cache' && geoError.value) return 'Última localização salva'
  if (source.value === 'default') return 'Ative o GPS para resultados precisos'
  return null
})

const mapQueryKey = computed(() => JSON.stringify({
  lat: userLocation.value[0].toFixed(4),
  lng: userLocation.value[1].toFixed(4),
  maxDistance: maxDistance.value
}))

const { data: mapFields, loading, refreshing, refresh } = useCachedQuery<Field[]>(
  () => `map:fields:${mapQueryKey.value}`,
  async () => {
    const params: Record<string, unknown> = {
      lat: userLocation.value[0],
      lng: userLocation.value[1]
    }
    if (maxDistance.value) params.maxDistance = maxDistance.value
    const { data } = await fieldsApi.getMap(params)
    return data.success ? data.data : []
  }
)

const fields = computed(() => mapFields.value ?? [])

async function loadFields(background = false) {
  await refresh(background)
}

function flyToUser() {
  mapRef.value?.leafletObject?.flyTo(userLocation.value, zoom.value, { duration: 0.8 })
}

async function getUserLocation() {
  await resolveLocation(true)
  zoom.value = 14
  flyToUser()
  loadFields()
}

function selectField(field: Field) {
  selectedField.value = field
  routeCoords.value = [
    userLocation.value,
    [field.latitude, field.longitude]
  ]
  mapRef.value?.leafletObject?.flyTo([field.latitude, field.longitude], 15, { duration: 0.6 })
}

function openNavigation(field: Field) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&origin=${userLocation.value[0]},${userLocation.value[1]}&destination=${field.latitude},${field.longitude}`,
    '_blank'
  )
}

function toggleSheet() {
  sheetExpanded.value = !sheetExpanded.value
}

watch(maxDistance, () => loadFields(true))

onMounted(async () => {
  await resolveLocation()
  await loadFields()
  flyToUser()
})
</script>

<template>
  <div class="map-page">
    <RefreshIndicator :visible="refreshing" />
    <div class="map-container">
      <l-map
        ref="mapRef"
        :zoom="zoom"
        :center="userLocation"
        :use-global-leaflet="false"
        class="leaflet-map"
      >
        <l-tile-layer :url="tileUrl" :attribution="tileAttribution" />
        <l-marker :lat-lng="userLocation" :icon="userIcon">
          <l-popup>Você está aqui</l-popup>
        </l-marker>
        <l-marker
          v-for="field in fields"
          :key="field.id"
          :lat-lng="[field.latitude, field.longitude]"
          :icon="fieldIcon"
          @click="selectField(field)"
        >
          <l-popup>
            <strong>{{ field.name }}</strong><br>
            R$ {{ field.pricePerPlayer.toFixed(2) }}<br>
            <span v-if="field.distanceKm">{{ field.distanceKm }} km</span>
          </l-popup>
        </l-marker>
        <l-polyline
          v-if="routeCoords.length"
          :lat-lngs="routeCoords"
          color="#16a34a"
          :weight="4"
          :dash-array="'10, 10'"
        />
      </l-map>

      <div class="map-overlay-top">
        <FilterChips :chips="distanceChip" @click="showDistanceSheet = true" @clear="maxDistance = null" />
        <span v-if="locationHint" class="location-hint">
          <i class="pi pi-info-circle" /> {{ locationHint }}
        </span>
      </div>

      <button
        type="button"
        class="locate-fab"
        :disabled="geoLoading"
        aria-label="Minha localização"
        @click="getUserLocation"
      >
        <i v-if="!geoLoading" class="pi pi-compass" />
        <ProgressSpinner v-else style="width: 22px; height: 22px" />
      </button>

      <button type="button" class="list-fab mobile-only" @click="toggleSheet">
        <i class="pi pi-list" />
        <span>{{ fields.length }}</span>
      </button>
    </div>

    <aside class="map-sidebar" :class="{ expanded: sheetExpanded, collapsed: !sheetExpanded }">
      <button type="button" class="sheet-handle mobile-only" @click="toggleSheet">
        <span class="handle-bar" />
        <span class="handle-title">
          {{ fields.length }} campo{{ fields.length === 1 ? '' : 's' }} próximo{{ fields.length === 1 ? '' : 's' }}
        </span>
      </button>

      <div class="sidebar-inner">
        <h2 class="desktop-only">Campos Próximos</h2>

        <p v-if="geoError" class="geo-warning">
          <i class="pi pi-exclamation-triangle" /> {{ geoError }}
        </p>

        <Button
          label="Minha Localização"
          icon="pi pi-compass"
          class="w-full mb-3 desktop-only locate-btn"
          :loading="geoLoading"
          @click="getUserLocation"
        />

        <div v-if="loading" class="loading"><ProgressSpinner style="width: 30px; height: 30px" /></div>

        <div v-else-if="!fields.length" class="empty-list">
          <i class="pi pi-map-marker" />
          <p>Nenhum campo nesta região</p>
          <small>Aumente o raio ou atualize sua localização</small>
        </div>

        <div v-else class="field-list">
          <div
            v-for="field in fields"
            :key="field.id"
            class="field-item"
            :class="{ active: selectedField?.id === field.id }"
            @click="selectField(field)"
          >
            <div class="field-info">
              <strong>{{ field.name }}</strong>
              <span>{{ FIELD_TYPE_LABELS[field.type] }} — R$ {{ field.pricePerPlayer.toFixed(2) }}</span>
              <span v-if="field.distanceKm" class="distance">
                <i class="pi pi-map-marker" /> {{ field.distanceKm }} km
              </span>
            </div>
            <Button icon="pi pi-directions" text rounded severity="success" @click.stop="openNavigation(field)" />
          </div>
        </div>
      </div>
    </aside>

    <FilterSheet
      v-model:visible="showDistanceSheet"
      title="Distância máxima"
      :options="distanceOptions"
      :model-value="distanceValue"
      @update:model-value="distanceValue = $event"
    />
  </div>
</template>

<style scoped lang="scss">
.map-page {
  display: flex;
  height: calc(100dvh - 60px);
  overflow: hidden;
}

.map-container {
  flex: 1;
  position: relative;
  min-width: 0;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.map-overlay-top {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  right: 4rem;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  pointer-events: none;

  :deep(.filter-chips) { pointer-events: auto; }
}

.location-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ds-surface) 92%, transparent);
  border: 1px solid var(--ds-border);
  color: var(--ds-text-muted);
  width: fit-content;
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.locate-fab {
  position: absolute;
  right: 0.75rem;
  bottom: 1rem;
  z-index: 500;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--ds-surface);
  color: var(--ds-primary);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;

  &:disabled { opacity: 0.7; cursor: wait; }
  &:hover { background: color-mix(in srgb, var(--ds-primary) 12%, var(--ds-surface)); }
}

.list-fab {
  position: absolute;
  right: 0.75rem;
  bottom: 4.25rem;
  z-index: 500;
  display: none;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  border: none;
  background: var(--ds-primary);
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
  cursor: pointer;

  i { font-size: 1rem; }
}

.map-sidebar {
  width: 360px;
  background: var(--ds-surface);
  border-left: 1px solid var(--ds-border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  h2 { font-size: 1.15rem; margin-bottom: 0.75rem; }
}

.sidebar-inner {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.locate-btn {
  background: var(--ds-primary) !important;
  border-color: var(--ds-primary) !important;
  color: white !important;
  font-weight: 600;
}

.geo-warning {
  font-size: 0.8rem;
  color: #f59e0b;
  background: color-mix(in srgb, #f59e0b 12%, transparent);
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  display: flex;
  gap: 0.4rem;
  align-items: flex-start;
}

.field-list { display: flex; flex-direction: column; gap: 0.5rem; }

.field-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid var(--ds-border);
  transition: background 0.2s, border-color 0.2s;
  background: var(--ds-bg);

  &:hover, &.active {
    border-color: var(--ds-primary);
    background: color-mix(in srgb, var(--ds-primary) 8%, var(--ds-bg));
  }
}

.field-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;

  strong { font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  span { font-size: 0.8rem; color: var(--ds-text-muted); }
  .distance { color: var(--ds-primary); font-weight: 600; }
}

.empty-list {
  text-align: center;
  padding: 1.5rem 0.5rem;
  color: var(--ds-text-muted);

  i { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
  small { font-size: 0.75rem; }
}

.w-full { width: 100%; }
.mb-3 { margin-bottom: 1rem; }
.loading { text-align: center; padding: 1rem; }

.desktop-only { display: block; }
.mobile-only { display: none; }

:deep(.user-marker) {
  background: none;
  border: none;
}

:deep(.user-marker-dot) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  border: 3px solid white;
  box-shadow: 0 0 0 2px #3b82f6, 0 2px 8px rgb(0 0 0 / 0.35);
}

:deep(.field-marker) {
  background: none;
  border: none;
}

:deep(.field-marker-pin) {
  width: 28px;
  height: 28px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: var(--ds-primary);
  border: 2px solid white;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.35);
}

@media (max-width: 768px) {
  .map-page {
    flex-direction: column;
    height: calc(100dvh - 52px);
    position: relative;
  }

  .desktop-only { display: none !important; }
  .mobile-only { display: flex; }

  .map-container { flex: 1; min-height: 0; }

  .map-sidebar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--ds-border);
    border-radius: 16px 16px 0 0;
    z-index: 600;
    box-shadow: 0 -8px 32px rgb(0 0 0 / 0.15);
    max-height: 55%;
    transition: max-height 0.3s ease;

    &.collapsed {
      max-height: 72px;

      .sidebar-inner { display: none; }
    }

    &.expanded { max-height: 55%; }
  }

  .sheet-handle {
    width: 100%;
    border: none;
    background: var(--ds-surface);
    padding: 0.65rem 1rem 0.5rem;
    cursor: pointer;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .handle-bar {
    width: 40px;
    height: 4px;
    border-radius: 999px;
    background: var(--ds-border);
  }

  .handle-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ds-text-muted);
  }

  .sidebar-inner { padding: 0 1rem 1rem; }

  .locate-fab { bottom: 5.5rem; }
  .list-fab { display: flex; }

  .map-overlay-top {
    right: 0.75rem;
    top: 0.5rem;
  }
}
</style>
