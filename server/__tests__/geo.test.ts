import { describe, it, expect } from 'vitest'
import { calculateDistanceKm } from '../lib/geo.js'

describe('geo', () => {
  it('calcula distância entre SP e Maringá aproximadamente', () => {
    const sp = { lat: -23.5505, lng: -46.6333 }
    const maringa = { lat: -23.4205, lng: -51.9332 }
    const distance = calculateDistanceKm(sp.lat, sp.lng, maringa.lat, maringa.lng)
    expect(distance).toBeGreaterThan(300)
    expect(distance).toBeLessThan(600)
  })

  it('retorna 0 para o mesmo ponto', () => {
    expect(calculateDistanceKm(-23.55, -46.63, -23.55, -46.63)).toBe(0)
  })
})
