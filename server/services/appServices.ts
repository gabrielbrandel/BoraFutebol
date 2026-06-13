import { prisma } from '../lib/prisma.js'
import { ForbiddenError } from '../lib/errors.js'
import { normalize, matchesAny, matchesCity } from '../lib/textSearch.js'
import { paginate } from '../lib/response.js'
import { toNumber } from '../lib/mappers.js'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export async function getSettings() {
  const settings = await getOrCreate()
  return {
    onlyAdminCanCreateFields: settings.onlyAdminCanCreateFields,
    onlyAdminCanCreateMatches: settings.onlyAdminCanCreateMatches,
    usersCanCreateFields: !settings.onlyAdminCanCreateFields,
    usersCanCreateMatches: !settings.onlyAdminCanCreateMatches
  }
}

export async function updateSettings(data: { onlyAdminCanCreateFields: boolean; onlyAdminCanCreateMatches: boolean }) {
  const settings = await prisma.appSettings.update({
    where: { id: SETTINGS_ID },
    data
  })
  return {
    onlyAdminCanCreateFields: settings.onlyAdminCanCreateFields,
    onlyAdminCanCreateMatches: settings.onlyAdminCanCreateMatches,
    usersCanCreateFields: !settings.onlyAdminCanCreateFields,
    usersCanCreateMatches: !settings.onlyAdminCanCreateMatches
  }
}

export async function ensureCanCreateFields(isAdmin: boolean) {
  if (isAdmin) return
  const settings = await getOrCreate()
  if (settings.onlyAdminCanCreateFields) {
    throw new ForbiddenError('Apenas administradores podem cadastrar campos')
  }
}

export async function ensureCanCreateMatches(isAdmin: boolean) {
  if (isAdmin) return
  const settings = await getOrCreate()
  if (settings.onlyAdminCanCreateMatches) {
    throw new ForbiddenError('Apenas administradores podem criar partidas')
  }
}

async function getOrCreate() {
  const existing = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
  if (existing) return existing
  return prisma.appSettings.create({
    data: {
      id: SETTINGS_ID,
      onlyAdminCanCreateFields: true,
      onlyAdminCanCreateMatches: true
    }
  })
}

export async function getContacts(type: string, page: number, pageSize: number, search?: string, city?: string) {
  const normalized = (type || 'players').toLowerCase()
  if (['referees', 'juizes', 'árbitros', 'arbitros'].includes(normalized)) {
    return getRefereeContacts(page, pageSize, search, city)
  }
  if (['goalkeepers', 'goleiros'].includes(normalized)) {
    return getGoalkeeperContacts(page, pageSize, search, city)
  }
  return getPlayerContacts(page, pageSize, search, city)
}

export async function getContactCities(type: string) {
  const normalized = (type || 'players').toLowerCase()
  if (['referees', 'juizes', 'árbitros', 'arbitros'].includes(normalized)) {
    return distinctCities(await prisma.referee.findMany({ where: { isActive: true }, select: { city: true } }))
  }
  if (['goalkeepers', 'goleiros'].includes(normalized)) {
    return distinctCities(await prisma.goalkeeper.findMany({ where: { isActive: true }, select: { city: true } }))
  }
  return distinctCities(await prisma.user.findMany({ where: { isActive: true, role: 'User' }, select: { city: true } }))
}

function distinctCities(rows: { city: string }[]) {
  return [...new Set(rows.map(r => r.city).filter(Boolean))].sort()
}

async function getPlayerContacts(page: number, pageSize: number, search?: string, city?: string) {
  let users = await prisma.user.findMany({ where: { isActive: true, role: 'User' }, orderBy: { name: 'asc' } })
  users = filterContacts(users, city, search, u => u.city, u => u.name, u => u.city, u => u.whatsApp, u => u.phone)
  const items = users.slice((page - 1) * pageSize, page * pageSize).map(u => ({
    id: u.id,
    type: 'Player',
    name: u.name,
    city: u.city,
    state: u.state,
    whatsApp: u.whatsApp,
    phone: u.phone,
    detail: u.primaryPosition
  }))
  return paginate(items, page, pageSize, users.length)
}

async function getRefereeContacts(page: number, pageSize: number, search?: string, city?: string) {
  let rows = await prisma.referee.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  rows = filterContacts(rows, city, search, r => r.city, r => r.name, r => r.city, r => r.whatsApp, r => r.phone)
  const items = rows.slice((page - 1) * pageSize, page * pageSize).map(r => ({
    id: r.id,
    type: 'Referee',
    name: r.name,
    city: r.city,
    whatsApp: r.whatsApp,
    phone: r.phone,
    detail: 'Árbitro',
    pricePerMatch: toNumber(r.pricePerMatch),
    averageRating: toNumber(r.averageRating)
  }))
  return paginate(items, page, pageSize, rows.length)
}

async function getGoalkeeperContacts(page: number, pageSize: number, search?: string, city?: string) {
  let rows = await prisma.goalkeeper.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  rows = filterContacts(rows, city, search, g => g.city, g => g.name, g => g.city, g => g.whatsApp)
  const items = rows.slice((page - 1) * pageSize, page * pageSize).map(g => ({
    id: g.id,
    type: 'Goalkeeper',
    name: g.name,
    city: g.city,
    whatsApp: g.whatsApp,
    detail: 'Goleiro',
    pricePerMatch: toNumber(g.pricePerMatch),
    averageRating: toNumber(g.averageRating)
  }))
  return paginate(items, page, pageSize, rows.length)
}

function filterContacts<T>(
  items: T[],
  city: string | undefined,
  search: string | undefined,
  getCity: (item: T) => string,
  ...searchFields: ((item: T) => string | null | undefined)[]
) {
  if (city) items = items.filter(i => matchesCity(getCity(i), city))
  if (search) {
    const term = normalize(search)
    items = items.filter(i => matchesAny(term, ...searchFields.map(f => f(i))))
  }
  return items
}

export async function quickStaff(data: { name: string; whatsApp: string; position: string }) {
  const position = data.position.toLowerCase()
  if (position === 'goalkeeper' || position === 'goleiro') {
    return prisma.goalkeeper.create({
      data: { name: data.name, whatsApp: data.whatsApp, city: '' }
    })
  }
  return prisma.referee.create({
    data: {
      name: data.name,
      phone: data.whatsApp,
      whatsApp: data.whatsApp,
      city: ''
    }
  })
}

export async function getReferees(page: number, pageSize: number, search?: string) {
  let rows = await prisma.referee.findMany({ where: { isActive: true } })
  if (search) {
    const term = normalize(search)
    rows = rows.filter(r => matchesAny(term, r.name, r.city))
  }
  const items = rows.slice((page - 1) * pageSize, page * pageSize).map(r => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    whatsApp: r.whatsApp,
    city: r.city,
    pricePerMatch: toNumber(r.pricePerMatch),
    averageRating: toNumber(r.averageRating)
  }))
  return paginate(items, page, pageSize, rows.length)
}

export async function getGoalkeepers(page: number, pageSize: number, search?: string) {
  let rows = await prisma.goalkeeper.findMany({ where: { isActive: true } })
  if (search) {
    const term = normalize(search)
    rows = rows.filter(g => matchesAny(term, g.name, g.city))
  }
  const items = rows.slice((page - 1) * pageSize, page * pageSize).map(g => ({
    id: g.id,
    name: g.name,
    city: g.city,
    whatsApp: g.whatsApp,
    pricePerMatch: toNumber(g.pricePerMatch),
    averageRating: toNumber(g.averageRating)
  }))
  return paginate(items, page, pageSize, rows.length)
}

export async function getDashboard() {
  const [matches, payments, users, fields] = await Promise.all([
    prisma.match.count({ where: { isActive: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'Paid' } }),
    prisma.user.count({ where: { isActive: true, role: 'User' } }),
    prisma.field.count({ where: { isActive: true } })
  ])
  return {
    totalMatches: matches,
    totalRevenue: toNumber(payments._sum.amount),
    totalPlayers: users,
    totalFields: fields,
    upcomingMatches: [],
    topFields: [],
    topPlayers: []
  }
}

export async function getRanking() {
  const stats = await prisma.playerStats.findMany({
    include: { user: true },
    orderBy: { matchesPlayed: 'desc' },
    take: 20
  })
  return stats.map((s, i) => ({
    rank: i + 1,
    userId: s.userId,
    name: s.user.name,
    photoUrl: s.user.photoUrl,
    matchesPlayed: s.matchesPlayed,
    goals: s.goals,
    mvpCount: s.mvpCount,
    averageRating: toNumber(s.averageRating)
  }))
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true }
  })
}

export async function getUsers(page: number, pageSize: number, search?: string) {
  let users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  if (search) {
    const term = normalize(search)
    users = users.filter(u => matchesAny(term, u.name, u.email, u.city))
  }
  const items = users.slice((page - 1) * pageSize, page * pageSize).map(toUserListItem)
  return paginate(items, page, pageSize, users.length)
}

function toUserListItem(u: { id: string; name: string; email: string; city: string; role: string }) {
  return { id: u.id, name: u.name, email: u.email, city: u.city, role: u.role }
}

export async function deleteUser(id: string) {
  await prisma.user.update({ where: { id }, data: { isActive: false } })
}

export async function updateUserRole(id: string, role: 'User' | 'Admin') {
  return prisma.user.update({ where: { id }, data: { role } })
}

export async function getPayments(page: number, pageSize: number, status?: string) {
  const where = { isActive: true, ...(status ? { status: status as 'Pending' | 'Paid' | 'Cancelled' } : {}) }
  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { user: true, match: { include: { field: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.payment.count({ where })
  ])
  const items = rows.map(p => ({
    id: p.id,
    matchId: p.matchId,
    userId: p.userId,
    userName: p.user.name,
    fieldName: p.match.field.name,
    amount: toNumber(p.amount),
    status: p.status,
    method: p.method,
    paidAt: p.paidAt?.toISOString()
  }))
  return paginate(items, page, pageSize, total)
}
