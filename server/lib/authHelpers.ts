export function normalizeWhatsApp(value: string): string {
  return value.replace(/\D/g, '')
}

export function buildQuickRegisterCredentials(whatsApp: string) {
  const digits = normalizeWhatsApp(whatsApp)
  if (digits.length < 8) throw new Error('WhatsApp inválido')
  const email = `${digits}@datesoccer.app`
  const password = digits.length >= 6 ? digits.slice(-6) : digits.padStart(6, '0')
  return { digits, email, password }
}
