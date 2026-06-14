import type { MatchStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError, NotFoundError } from '../lib/errors.js'
import { normalize, matchesAny } from '../lib/textSearch.js'
import { calculateDistanceKm } from '../lib/geo.js'
import { paginate } from '../lib/response.js'
import { toNumber } from '../lib/mappers.js'
import { generateBalancedTeams, type PlayerForFormation } from '../lib/teamFormation.js'

function mapMatch(match: {
  id: string
  fieldId: string
  date: Date
  time: string
  maxPlayers: number
  participationFee: { toNumber?: () => number } | number
  notes: string | null
  status: MatchStatus
  recurringMatchId: string | null
  field: {
    name: string
    city: string
    address: string
    latitude: number
    longitude: number
    type: string
    mainPhotoUrl: string | null
  }
  referee?: { name: string } | null
  goalkeeper?: { name: string } | null
  createdBy: { name: string }
  mvpUser?: { name: string } | null
  attendances: { status: string; isActive: boolean }[]
}) {
  const confirmedCount = match.attendances.filter(
    a => a.isActive && (a.status === 'Confirmed' || a.status === 'Promoted')
  ).length
  return {
    id: match.id,
    fieldId: match.fieldId,
    fieldName: match.field.name,
    fieldCity: match.field.city,
    fieldAddress: match.field.address,
    fieldType: match.field.type,
    fieldMainPhotoUrl: match.field.mainPhotoUrl,
    date: match.date.toISOString().split('T')[0],
    time: match.time,
    maxPlayers: match.maxPlayers,
    confirmedCount,
    participationFee: toNumber(match.participationFee),
    notes: match.notes,
    status: match.status,
    refereeName: match.referee?.name,
    goalkeeperName: match.goalkeeper?.name,
    createdByName: match.createdBy.name,
    mvpUserName: match.mvpUser?.name,
    recurringMatchId: match.recurringMatchId,
    isRecurring: !!match.recurringMatchId
  }
}

const matchInclude = {
  field: true,
  referee: true,
  goalkeeper: true,
  createdBy: true,
  mvpUser: true,
  attendances: true
} as const

export async function getMatches(opts: {
  page: number
  pageSize: number
  search?: string
  status?: string
  city?: string
  maxPrice?: number
  maxDistanceKm?: number
  userLatitude?: number
  userLongitude?: number
}) {
  let matches = await prisma.match.findMany({
    where: { isActive: true },
    include: matchInclude,
    orderBy: [{ date: 'asc' }, { time: 'asc' }]
  })

  if (opts.status) matches = matches.filter(m => m.status.toLowerCase() === opts.status!.toLowerCase())
  if (opts.maxPrice != null) matches = matches.filter(m => toNumber(m.participationFee) <= opts.maxPrice!)
  if (opts.city) {
    const n = normalize(opts.city)
    matches = matches.filter(m => normalize(m.field.city) === n)
  }
  if (opts.search) {
    const term = normalize(opts.search)
    matches = matches.filter(m => matchesAny(term, m.field.name, m.field.city, m.field.address))
  }
  if (opts.maxDistanceKm != null && opts.userLatitude != null && opts.userLongitude != null) {
    matches = matches.filter(m =>
      calculateDistanceKm(opts.userLatitude!, opts.userLongitude!, m.field.latitude, m.field.longitude) <= opts.maxDistanceKm!
    )
  }

  const total = matches.length
  const items = matches.slice((opts.page - 1) * opts.pageSize, opts.page * opts.pageSize).map(mapMatch)
  return paginate(items, opts.page, opts.pageSize, total)
}

export async function getMatchCities() {
  const rows = await prisma.match.findMany({
    where: { isActive: true },
    include: { field: { select: { city: true } } }
  })
  return [...new Set(rows.map(r => r.field.city).filter(Boolean))].sort()
}

export async function getMatchById(id: string) {
  const match = await prisma.match.findFirst({ where: { id, isActive: true }, include: matchInclude })
  if (!match) throw new NotFoundError('Partida não encontrada')
  return mapMatch(match)
}

export async function createMatch(data: Record<string, unknown>, userId: string) {
  const field = await prisma.field.findUnique({ where: { id: String(data.fieldId) } })
  if (!field) throw new NotFoundError('Campo não encontrado')

  const match = await prisma.match.create({
    data: {
      fieldId: String(data.fieldId),
      date: new Date(String(data.date)),
      time: String(data.time),
      maxPlayers: Number(data.maxPlayers ?? 14),
      refereeId: data.refereeId ? String(data.refereeId) : null,
      goalkeeperId: data.goalkeeperId ? String(data.goalkeeperId) : null,
      participationFee: Number(data.participationFee ?? 0),
      notes: data.notes ? String(data.notes) : null,
      status: 'Open',
      createdById: userId
    },
    include: matchInclude
  })
  return mapMatch(match)
}

export async function updateMatch(id: string, data: Record<string, unknown>) {
  const match = await prisma.match.update({
    where: { id },
    data: {
      fieldId: String(data.fieldId),
      date: new Date(String(data.date)),
      time: String(data.time),
      maxPlayers: Number(data.maxPlayers),
      refereeId: data.refereeId ? String(data.refereeId) : null,
      goalkeeperId: data.goalkeeperId ? String(data.goalkeeperId) : null,
      participationFee: Number(data.participationFee),
      notes: data.notes ? String(data.notes) : null,
      status: (data.status as MatchStatus) ?? 'Open'
    },
    include: matchInclude
  })
  return mapMatch(match)
}

export async function deleteMatch(id: string) {
  await prisma.match.update({ where: { id }, data: { isActive: false, status: 'Cancelled' } })
}

export async function getAttendances(matchId: string) {
  const rows = await prisma.matchAttendance.findMany({
    where: { matchId, isActive: true },
    include: { user: true },
    orderBy: [{ status: 'asc' }, { waitlistPosition: 'asc' }]
  })
  return rows.map(a => ({
    id: a.id,
    userId: a.userId,
    userName: a.user.name,
    userPhotoUrl: a.user.photoUrl,
    primaryPosition: a.user.primaryPosition,
    technicalLevel: a.user.technicalLevel,
    status: a.status,
    waitlistPosition: a.waitlistPosition
  }))
}

export async function confirmAttendance(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { attendances: { where: { isActive: true } } }
  })
  if (!match) throw new NotFoundError('Partida não encontrada')
  if (match.status !== 'Open') throw new AppError('Partida não está aberta para confirmações')

  const existing = match.attendances.find(a => a.userId === userId)
  if (existing) {
    if (existing.status === 'Confirmed' || existing.status === 'Promoted') {
      throw new AppError('Presença já confirmada')
    }
    const updated = await prisma.matchAttendance.update({
      where: { id: existing.id },
      data: { status: 'Confirmed', confirmedAt: new Date(), waitlistPosition: 0 },
      include: { user: true }
    })
    return updated
  }

  const confirmedCount = match.attendances.filter(a => a.status === 'Confirmed' || a.status === 'Promoted').length
  if (confirmedCount >= match.maxPlayers) throw new AppError('Partida lotada. Entre na lista de espera.')

  const attendance = await prisma.matchAttendance.create({
    data: { matchId, userId, status: 'Confirmed', confirmedAt: new Date() },
    include: { user: true }
  })
  await prisma.payment.create({
    data: { matchId, userId, amount: match.participationFee, status: 'Pending' }
  })
  return attendance
}

export async function cancelAttendance(matchId: string, userId: string) {
  const attendance = await prisma.matchAttendance.findFirst({ where: { matchId, userId, isActive: true } })
  if (!attendance) throw new NotFoundError('Presença não encontrada')

  const wasConfirmed = attendance.status === 'Confirmed' || attendance.status === 'Promoted'
  await prisma.matchAttendance.update({
    where: { id: attendance.id },
    data: { status: 'Cancelled' }
  })
  if (wasConfirmed) await promoteFromWaitlist(matchId)
  return attendance
}

export async function joinWaitlist(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { attendances: { where: { isActive: true } } }
  })
  if (!match) throw new NotFoundError('Partida não encontrada')
  if (match.attendances.some(a => a.userId === userId)) {
    throw new AppError('Você já está inscrito nesta partida')
  }
  const waitlistPosition = match.attendances.filter(a => a.status === 'Waitlist').length + 1
  return prisma.matchAttendance.create({
    data: { matchId, userId, status: 'Waitlist', waitlistPosition }
  })
}

export async function generateTeams(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      attendances: {
        where: { isActive: true, status: { in: ['Confirmed', 'Promoted'] } },
        include: { user: true }
      }
    }
  })
  if (!match) throw new NotFoundError('Partida não encontrada')

  const players = match.attendances.map(a => ({
    userId: a.userId,
    name: a.user.name,
    photoUrl: a.user.photoUrl,
    position: a.user.primaryPosition,
    technicalLevel: a.user.technicalLevel
  }))
  const { teamA, teamB, scoreA, scoreB } = generateBalancedTeams(players)

  await prisma.matchTeamAssignment.deleteMany({ where: { matchId } })
  await prisma.matchTeamAssignment.createMany({
    data: [
      ...teamA.map(p => ({ matchId, userId: p.userId, team: 'TeamA' as const, assignedPosition: p.position })),
      ...teamB.map(p => ({ matchId, userId: p.userId, team: 'TeamB' as const, assignedPosition: p.position }))
    ]
  })

  const mapPlayer = (p: PlayerForFormation) => ({
    userId: p.userId,
    name: p.name,
    photoUrl: p.photoUrl ?? null,
    position: p.position,
    technicalLevel: p.technicalLevel
  })

  return {
    matchId,
    teamA: teamA.map(mapPlayer),
    teamB: teamB.map(mapPlayer),
    scoreA,
    scoreB
  }
}

export async function getMessages(matchId: string) {
  const messages = await prisma.matchMessage.findMany({
    where: { matchId, isActive: true },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  })
  return messages.map(m => ({
    id: m.id,
    userId: m.userId,
    userName: m.user.name,
    userPhotoUrl: m.user.photoUrl,
    content: m.content,
    photoUrl: m.photoUrl,
    createdAt: m.createdAt.toISOString()
  }))
}

export async function sendMessage(matchId: string, userId: string, content: string, photoUrl?: string) {
  const message = await prisma.matchMessage.create({
    data: { matchId, userId, content, photoUrl },
    include: { user: true }
  })
  return {
    id: message.id,
    userId: message.userId,
    userName: message.user.name,
    content: message.content,
    photoUrl: message.photoUrl,
    createdAt: message.createdAt.toISOString()
  }
}

export async function voteMvp(matchId: string, voterId: string, votedUserId: string) {
  if (voterId === votedUserId) throw new AppError('Você não pode votar em si mesmo')
  const existing = await prisma.mvpVote.findUnique({
    where: { matchId_voterId: { matchId, voterId } }
  })
  if (existing) throw new AppError('Você já votou nesta partida')

  await prisma.mvpVote.create({ data: { matchId, voterId, votedUserId } })
  const votes = await prisma.mvpVote.findMany({ where: { matchId } })
  const grouped = votes.reduce<Record<string, number>>((acc, v) => {
    acc[v.votedUserId] = (acc[v.votedUserId] ?? 0) + 1
    return acc
  }, {})
  const winner = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (winner) await prisma.match.update({ where: { id: matchId }, data: { mvpUserId: winner } })
}

async function promoteFromWaitlist(matchId: string) {
  const next = await prisma.matchAttendance.findFirst({
    where: { matchId, isActive: true, status: 'Waitlist' },
    orderBy: { waitlistPosition: 'asc' }
  })
  if (!next) return

  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) return

  await prisma.matchAttendance.update({
    where: { id: next.id },
    data: { status: 'Promoted', confirmedAt: new Date(), waitlistPosition: 0 }
  })
  await prisma.payment.create({
    data: { matchId, userId: next.userId, amount: match.participationFee, status: 'Pending' }
  })
  await prisma.notification.create({
    data: {
      userId: next.userId,
      type: 'WaitlistPromotion',
      title: 'Vaga liberada!',
      message: 'Você saiu da lista de espera e foi promovido na partida.',
      relatedMatchId: matchId,
      sentAt: new Date()
    }
  })
}
