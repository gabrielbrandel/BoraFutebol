import type { User } from '@prisma/client'

export function toUserProfile(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl,
    phone: user.phone,
    whatsApp: user.whatsApp,
    city: user.city,
    state: user.state,
    primaryPosition: user.primaryPosition,
    technicalLevel: user.technicalLevel,
    role: user.role
  }
}

export function toNumber(value: { toNumber?: () => number } | number | null | undefined): number {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }
  return Number(value)
}
