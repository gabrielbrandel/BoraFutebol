import { describe, it, expect } from 'vitest'
import { buildQuickRegisterCredentials, normalizeWhatsApp } from '../lib/authHelpers.js'

describe('authHelpers', () => {
  it('normaliza whatsapp removendo caracteres', () => {
    expect(normalizeWhatsApp('(44) 99999-8888')).toBe('44999998888')
  })

  it('gera email e senha a partir do whatsapp', () => {
    const creds = buildQuickRegisterCredentials('44999998888')
    expect(creds.email).toBe('44999998888@datesoccer.app')
    expect(creds.password).toBe('998888')
    expect(creds.digits).toBe('44999998888')
  })

  it('rejeita whatsapp curto', () => {
    expect(() => buildQuickRegisterCredentials('123')).toThrow('WhatsApp inválido')
  })
})
