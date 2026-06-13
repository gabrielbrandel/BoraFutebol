import { ref } from 'vue'

const STORAGE_KEY = 'ds_last_location'

export interface GeoCoords {
  lat: number
  lng: number
}

export type GeoSource = 'gps' | 'cache' | 'ip' | 'default'

function loadCached(): GeoCoords | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as GeoCoords
  } catch { /* ignore */ }
  return null
}

function saveCached(coords: GeoCoords) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coords))
}

async function fetchByIp(): Promise<GeoCoords | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return { lat: data.latitude, lng: data.longitude }
    }
  } catch { /* ignore */ }
  return null
}

function tryGps(forceFresh: boolean): Promise<GeoCoords | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: forceFresh ? 20000 : 12000,
        maximumAge: forceFresh ? 0 : 120000
      }
    )
  })
}

export function useGeolocation() {
  const coords = ref<GeoCoords | null>(loadCached())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const source = ref<GeoSource>(coords.value ? 'cache' : 'default')

  async function resolveLocation(forceGps = false): Promise<GeoCoords> {
    loading.value = true
    error.value = null

    const cached = loadCached()
    if (cached && !forceGps) {
      coords.value = cached
      source.value = 'cache'
    }

    const gps = await tryGps(forceGps)
    if (gps) {
      coords.value = gps
      source.value = 'gps'
      saveCached(gps)
      loading.value = false
      return gps
    }

    if (forceGps && cached) {
      coords.value = cached
      source.value = 'cache'
      error.value = 'GPS indisponível. Usando última localização salva.'
      loading.value = false
      return cached
    }

    if (!cached) {
      const ip = await fetchByIp()
      if (ip) {
        coords.value = ip
        source.value = 'ip'
        saveCached(ip)
        error.value = 'Localização aproximada pela rede. Toque no botão de localização para usar o GPS.'
        loading.value = false
        return ip
      }
    }

    const fallback = cached ?? { lat: -15.7801, lng: -47.9292 }
    coords.value = fallback
    source.value = cached ? 'cache' : 'default'
    if (!cached) {
      error.value = 'Ative a permissão de localização do navegador para ver campos perto de você.'
    } else if (forceGps) {
      error.value = 'GPS indisponível. Usando última localização salva.'
    }
    loading.value = false
    return fallback
  }

  return { coords, loading, error, source, resolveLocation }
}
