const STORAGE_PREFIX = 'ds-cache:'

export interface CacheEntry<T> {
  data: T
  timestamp: number
}

const memory = new Map<string, CacheEntry<unknown>>()

function readStorage<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry<T>
  } catch {
    return null
  }
}

function writeStorage<T>(key: string, entry: CacheEntry<T>) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    /* quota exceeded — memory cache still works */
  }
}

export const queryCache = {
  getEntry<T>(key: string): CacheEntry<T> | null {
    const mem = memory.get(key) as CacheEntry<T> | undefined
    if (mem) return mem
    const stored = readStorage<T>(key)
    if (stored) {
      memory.set(key, stored)
      return stored
    }
    return null
  },

  set<T>(key: string, data: T) {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    memory.set(key, entry)
    writeStorage(key, entry)
  },

  invalidate(keyOrPrefix?: string) {
    if (!keyOrPrefix) {
      memory.clear()
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i)
          if (k?.startsWith(STORAGE_PREFIX)) sessionStorage.removeItem(k)
        }
      } catch { /* ignore */ }
      return
    }

    for (const key of memory.keys()) {
      if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) memory.delete(key)
    }
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i)
        if (k?.startsWith(STORAGE_PREFIX)) {
          const id = k.slice(STORAGE_PREFIX.length)
          if (id === keyOrPrefix || id.startsWith(`${keyOrPrefix}:`)) sessionStorage.removeItem(k)
        }
      }
    } catch { /* ignore */ }
  }
}
