import type { PlayerPosition, User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError, NotFoundError, UnauthorizedError } from '../lib/errors.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { generateAccessToken, generateRefreshToken, getAccessTokenExpiration } from '../lib/jwt.js'
import { buildQuickRegisterCredentials, normalizeWhatsApp } from '../lib/authHelpers.js'
import { toUserProfile } from '../lib/mappers.js'

async function findUserForLogin(identifier: string): Promise<User | null> {
  const trimmed = identifier.trim()
  const byEmail = await prisma.user.findFirst({ where: { email: trimmed, isActive: true } })
  if (byEmail) return byEmail

  const digits = normalizeWhatsApp(trimmed)
  if (digits.length < 8) return null
  const users = await prisma.user.findMany({ where: { isActive: true } })
  return users.find(u => normalizeWhatsApp(u.whatsApp) === digits) ?? null
}

async function authResponse(user: User) {
  const refreshToken = generateRefreshToken()
  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken,
      refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })
  return {
    accessToken: generateAccessToken(user),
    refreshToken,
    expiresAt: getAccessTokenExpiration(),
    user: toUserProfile(user)
  }
}

export async function register(data: {
  name: string
  email: string
  password: string
  birthDate: string
  phone: string
  whatsApp: string
  city: string
  state: string
  primaryPosition: PlayerPosition
  dominantFoot?: 'Right' | 'Left' | 'Both'
  height?: number
  weight?: number
  technicalLevel?: number
}) {
  if (await prisma.user.findFirst({ where: { email: data.email } })) {
    throw new AppError('Email já cadastrado')
  }
  if (await prisma.user.findFirst({ where: { isActive: true, name: { equals: data.name.trim(), mode: 'insensitive' } } })) {
    throw new AppError(`Já existe um jogador com o nome '${data.name.trim()}'`)
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      birthDate: new Date(data.birthDate),
      phone: data.phone,
      whatsApp: data.whatsApp,
      city: data.city,
      state: data.state,
      primaryPosition: data.primaryPosition,
      dominantFoot: data.dominantFoot ?? 'Right',
      height: data.height ?? 1.75,
      weight: data.weight ?? 75,
      technicalLevel: data.technicalLevel ?? 3,
      stats: { create: {} }
    }
  })
  return authResponse(user)
}

export async function quickRegister(data: { name: string; whatsApp: string; primaryPosition: PlayerPosition }) {
  const { digits, email, password } = buildQuickRegisterCredentials(data.whatsApp)

  if (await prisma.user.findFirst({ where: { isActive: true, name: { equals: data.name.trim(), mode: 'insensitive' } } })) {
    throw new AppError(`Já existe um jogador com o nome '${data.name.trim()}'`)
  }

  const users = await prisma.user.findMany({ where: { isActive: true }, select: { whatsApp: true } })
  if (users.some(u => normalizeWhatsApp(u.whatsApp) === digits)) {
    throw new AppError('WhatsApp já cadastrado')
  }
  if (await prisma.user.findFirst({ where: { email } })) {
    throw new AppError('WhatsApp já cadastrado')
  }

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      passwordHash: await hashPassword(password),
      birthDate: new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000),
      phone: data.whatsApp.trim(),
      whatsApp: data.whatsApp.trim(),
      primaryPosition: data.primaryPosition,
      height: 1.75,
      weight: 75,
      technicalLevel: 3,
      stats: { create: {} }
    }
  })
  return authResponse(user)
}

export async function login(identifier: string, password: string) {
  const user = await findUserForLogin(identifier)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError('WhatsApp ou senha inválidos')
  }
  return authResponse(user)
}

export async function refresh(refreshToken: string) {
  const user = await prisma.user.findFirst({
    where: { refreshToken, refreshTokenExpiry: { gt: new Date() }, isActive: true }
  })
  if (!user) throw new UnauthorizedError('Refresh token inválido ou expirado')
  return authResponse(user)
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new NotFoundError('Usuário não encontrado')
  return toUserProfile(user)
}

export async function updateProfile(userId: string, data: {
  name: string
  phone: string
  whatsApp: string
  city: string
  state: string
  primaryPosition: PlayerPosition
  dominantFoot?: 'Right' | 'Left' | 'Both'
  height?: number
  weight?: number
  technicalLevel?: number
  photoUrl?: string | null
}) {
  const duplicate = await prisma.user.findFirst({
    where: {
      isActive: true,
      id: { not: userId },
      name: { equals: data.name.trim(), mode: 'insensitive' }
    }
  })
  if (duplicate) throw new AppError(`Já existe um jogador com o nome '${data.name.trim()}'`)

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone,
      whatsApp: data.whatsApp,
      city: data.city,
      state: data.state,
      primaryPosition: data.primaryPosition,
      dominantFoot: data.dominantFoot ?? 'Right',
      height: data.height ?? 1.75,
      weight: data.weight ?? 75,
      technicalLevel: data.technicalLevel ?? 3,
      photoUrl: data.photoUrl ?? null
    }
  })
  return toUserProfile(user)
}
