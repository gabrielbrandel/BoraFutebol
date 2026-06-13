export function normalize(value?: string | null): string {
  if (!value?.trim()) return ''
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function matches(haystack: string | null | undefined, normalizedTerm: string): boolean {
  if (!normalizedTerm) return true
  if (!haystack?.trim()) return false
  return normalize(haystack).includes(normalizedTerm)
}

export function matchesAny(normalizedTerm: string, ...haystacks: (string | null | undefined)[]): boolean {
  return haystacks.some(h => matches(h, normalizedTerm))
}

export function matchesCity(storedCity?: string | null, filterCity?: string | null): boolean {
  if (!filterCity?.trim()) return true
  return normalize(storedCity) === normalize(filterCity)
}
