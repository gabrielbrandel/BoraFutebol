import { describe, it, expect } from 'vitest'
import { normalize, matches, matchesAny, matchesCity } from '../lib/textSearch.js'

describe('textSearch', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalize('Maringá')).toBe('maringa')
    expect(normalize('  MARCO  ')).toBe('marco')
  })

  it('encontra termo parcial sem acento', () => {
    expect(matches('Arena Sumaré Society', 'maring')).toBe(false)
    expect(matches('Maringá', 'maring')).toBe(true)
    expect(matches('Marcos Keeper', 'marco')).toBe(true)
  })

  it('matchesAny busca em vários campos', () => {
    const term = normalize('maringa')
    expect(matchesAny(term, 'Campo X', 'Maringá', 'Rua 1')).toBe(true)
    expect(matchesAny(term, 'São Paulo', 'SP', 'Rua 1')).toBe(false)
  })

  it('matchesCity compara cidades normalizadas', () => {
    expect(matchesCity('Maringá', 'maringa')).toBe(true)
    expect(matchesCity('São Paulo', 'maringa')).toBe(false)
  })
})
