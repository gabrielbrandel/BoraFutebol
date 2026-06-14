import { ref, watch, onMounted, onActivated, type Ref } from 'vue'
import { queryCache } from '@/services/queryCache'

type KeySource = string | (() => string)

export interface CachedQueryOptions {
  /** Tempo em que o cache é considerado fresco (sem refetch automático). */
  staleMs?: number
  /** Tempo máximo para exibir dados antigos enquanto revalida. */
  cacheMs?: number
  /** Dispara fetch ao montar/ativar (default: true). */
  enabled?: boolean | (() => boolean)
}

export function useCachedQuery<T>(
  keySource: KeySource,
  fetcher: () => Promise<T>,
  options: CachedQueryOptions = {}
) {
  const staleMs = options.staleMs ?? 30_000
  const cacheMs = options.cacheMs ?? 5 * 60_000

  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(true)
  const refreshing = ref(false)
  const error = ref<unknown>(null)

  let requestId = 0

  function resolveKey() {
    return typeof keySource === 'function' ? keySource() : keySource
  }

  function isEnabled() {
    const e = options.enabled
    return typeof e === 'function' ? e() : e !== false
  }

  async function load(background = false) {
    if (!isEnabled()) return

    const key = resolveKey()
    if (!key) return

    const cached = queryCache.getEntry<T>(key)
    const age = cached ? Date.now() - cached.timestamp : Infinity

    if (cached && age < cacheMs) {
      data.value = cached.data
      if (!background) loading.value = false
      if (age < staleMs && !background) return
    }

    if (!background && !data.value) loading.value = true
    refreshing.value = !!data.value

    const id = ++requestId
    try {
      const result = await fetcher()
      if (id !== requestId) return
      data.value = result
      queryCache.set(key, result)
      error.value = null
    } catch (e) {
      if (id !== requestId) return
      error.value = e
    } finally {
      if (id === requestId) {
        loading.value = false
        refreshing.value = false
      }
    }
  }

  watch(
    () => resolveKey(),
    () => load()
  )

  onMounted(() => load())
  onActivated(() => load(true))

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: (background = true) => load(background)
  }
}
