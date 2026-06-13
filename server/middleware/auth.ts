import type { Context, Next } from 'hono'
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js'
import { verifyAccessToken } from '../lib/jwt.js'

export type AuthVariables = {
  userId: string
  role: string
}

export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Token ausente')
  try {
    const payload = verifyAccessToken(header.slice(7))
    c.set('userId', payload.sub)
    c.set('role', payload.role)
    await next()
  } catch {
    throw new UnauthorizedError('Token inválido')
  }
}

export async function adminMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  if (c.get('role') !== 'Admin') throw new ForbiddenError('Acesso restrito a administradores')
  await next()
}
