import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import type { User } from '@prisma/client'

const secret = process.env.JWT_SECRET || 'DateSoccer_SuperSecretKey_2024_MinLength32Chars!'
const issuer = process.env.JWT_ISSUER || 'DateSoccer'
const audience = process.env.JWT_AUDIENCE || 'DateSoccerApp'
const accessMinutes = Number(process.env.JWT_ACCESS_MINUTES || 60)

export function generateAccessToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    secret,
    { expiresIn: `${accessMinutes}m`, issuer, audience }
  )
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

export function getAccessTokenExpiration(): Date {
  return new Date(Date.now() + accessMinutes * 60 * 1000)
}

export function verifyAccessToken(token: string): { sub: string; role: string } {
  const payload = jwt.verify(token, secret, { issuer, audience }) as jwt.JwtPayload
  return { sub: String(payload.sub), role: String(payload.role) }
}
