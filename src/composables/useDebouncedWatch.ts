import { watch, type WatchSource } from 'vue'

export function useDebouncedWatch(sources: WatchSource<unknown> | WatchSource<unknown>[], callback: () => void, delay = 400) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  watch(sources, () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(callback, delay)
  })
}
