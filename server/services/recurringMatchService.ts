import { prisma } from '../lib/prisma.js'
import { AppError, NotFoundError } from '../lib/errors.js'
import { toNumber } from '../lib/mappers.js'

function mapRecurring(r: {
  id: string
  fieldId: string
  time: string
  maxPlayers: number
  participationFee: { toNumber?: () => number } | number
  notes: string | null
  daysOfWeek: string
  refereeId: string | null
  goalkeeperId: string | null
  field: { name: string; city: string }
  referee?: { name: string } | null
  goalkeeper?: { name: string } | null
  cancellations: { date: Date; reason: string | null }[]
  generatedMatches: { id: string; date: Date; status: string }[]
}) {
  return {
    id: r.id,
    fieldId: r.fieldId,
    fieldName: r.field.name,
    fieldCity: r.field.city,
    time: r.time,
    maxPlayers: r.maxPlayers,
    participationFee: toNumber(r.participationFee),
    notes: r.notes,
    daysOfWeek: r.daysOfWeek.split(',').map(Number),
    refereeId: r.refereeId,
    goalkeeperId: r.goalkeeperId,
    refereeName: r.referee?.name,
    goalkeeperName: r.goalkeeper?.name,
    cancellations: r.cancellations.map(c => ({
      date: c.date.toISOString().split('T')[0],
      reason: c.reason
    })),
    upcomingOccurrences: r.generatedMatches
      .filter(m => m.status === 'Open')
      .map(m => ({ matchId: m.id, date: m.date.toISOString().split('T')[0] }))
  }
}

const include = {
  field: true,
  referee: true,
  goalkeeper: true,
  cancellations: true,
  generatedMatches: true
} as const

export async function getAllRecurring() {
  const rows = await prisma.recurringMatch.findMany({
    where: { isActive: true },
    include,
    orderBy: { field: { name: 'asc' } }
  })
  return rows.map(mapRecurring)
}

export async function getRecurringById(id: string) {
  const row = await prisma.recurringMatch.findFirst({ where: { id, isActive: true }, include })
  if (!row) throw new NotFoundError('Partida recorrente não encontrada')
  return mapRecurring(row)
}

export async function createRecurring(data: Record<string, unknown>, userId: string) {
  const days = (data.daysOfWeek as number[]) ?? []
  if (!days.length) throw new AppError('Selecione ao menos um dia da semana')

  const row = await prisma.recurringMatch.create({
    data: {
      fieldId: String(data.fieldId),
      time: String(data.time),
      maxPlayers: Number(data.maxPlayers ?? 14),
      refereeId: data.refereeId ? String(data.refereeId) : null,
      goalkeeperId: data.goalkeeperId ? String(data.goalkeeperId) : null,
      participationFee: Number(data.participationFee ?? 0),
      notes: data.notes ? String(data.notes) : null,
      daysOfWeek: [...days].sort((a, b) => a - b).join(','),
      createdById: userId
    }
  })
  await generateOccurrences()
  return getRecurringById(row.id)
}

export async function updateRecurring(id: string, data: Record<string, unknown>) {
  const days = (data.daysOfWeek as number[]) ?? []
  if (!days.length) throw new AppError('Selecione ao menos um dia da semana')

  await prisma.recurringMatch.update({
    where: { id },
    data: {
      fieldId: String(data.fieldId),
      time: String(data.time),
      maxPlayers: Number(data.maxPlayers),
      refereeId: data.refereeId ? String(data.refereeId) : null,
      goalkeeperId: data.goalkeeperId ? String(data.goalkeeperId) : null,
      participationFee: Number(data.participationFee),
      notes: data.notes ? String(data.notes) : null,
      daysOfWeek: [...days].sort((a, b) => a - b).join(',')
    }
  })
  await generateOccurrences()
  return getRecurringById(id)
}

export async function deleteRecurring(id: string) {
  await prisma.recurringMatch.update({ where: { id }, data: { isActive: false } })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  await prisma.match.updateMany({
    where: { recurringMatchId: id, date: { gte: today }, status: 'Open' },
    data: { status: 'Cancelled' }
  })
}

export async function cancelOccurrence(id: string, date: string, reason?: string) {
  const recurring = await prisma.recurringMatch.findUnique({ where: { id } })
  if (!recurring) throw new NotFoundError('Partida recorrente não encontrada')

  const occurrenceDate = new Date(date)
  await prisma.recurringMatchCancellation.upsert({
    where: { recurringMatchId_date: { recurringMatchId: id, date: occurrenceDate } },
    update: { reason },
    create: { recurringMatchId: id, date: occurrenceDate, reason }
  })

  await prisma.match.updateMany({
    where: { recurringMatchId: id, date: occurrenceDate, status: 'Open' },
    data: { status: 'Cancelled' }
  })
}

export async function generateOccurrences() {
  const recurringList = await prisma.recurringMatch.findMany({
    where: { isActive: true },
    include: { cancellations: true }
  })

  const horizon = new Date()
  horizon.setDate(horizon.getDate() + 56)

  for (const recurring of recurringList) {
    const days = recurring.daysOfWeek.split(',').map(Number)
    const cancelledDates = new Set(
      recurring.cancellations.map(c => c.date.toISOString().split('T')[0])
    )

    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)

    while (cursor <= horizon) {
      const day = cursor.getDay()
      const dateKey = cursor.toISOString().split('T')[0]

      if (days.includes(day) && !cancelledDates.has(dateKey)) {
        const exists = await prisma.match.findFirst({
          where: { recurringMatchId: recurring.id, date: new Date(cursor) }
        })
        if (!exists) {
          await prisma.match.create({
            data: {
              fieldId: recurring.fieldId,
              date: new Date(cursor),
              time: recurring.time,
              maxPlayers: recurring.maxPlayers,
              refereeId: recurring.refereeId,
              goalkeeperId: recurring.goalkeeperId,
              participationFee: recurring.participationFee,
              notes: recurring.notes,
              status: 'Open',
              createdById: recurring.createdById,
              recurringMatchId: recurring.id
            }
          })
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }
}
