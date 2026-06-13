import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: {
      id: SETTINGS_ID,
      onlyAdminCanCreateFields: true,
      onlyAdminCanCreateMatches: true
    }
  })

  if (await prisma.user.count()) {
    console.log('Seed já aplicado')
    return
  }

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@datesoccer.com',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      birthDate: new Date('1990-01-01'),
      phone: '11999999999',
      whatsApp: '11999999999',
      city: 'São Paulo',
      state: 'SP',
      primaryPosition: 'Midfielder',
      role: 'Admin',
      height: 1.75,
      weight: 75,
      technicalLevel: 4,
      stats: { create: {} }
    }
  })

  const player = await prisma.user.create({
    data: {
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: await bcrypt.hash('Player@123', 10),
      birthDate: new Date('1995-05-15'),
      phone: '11988888888',
      whatsApp: '11988888888',
      city: 'São Paulo',
      state: 'SP',
      primaryPosition: 'Forward',
      height: 1.78,
      weight: 72,
      technicalLevel: 3,
      stats: { create: { matchesPlayed: 25, goals: 12, attendanceCount: 20 } }
    }
  })

  const fields = await Promise.all([
    prisma.field.create({
      data: {
        name: 'Arena Society SP',
        address: 'Av. Paulista, 1000',
        latitude: -23.5614,
        longitude: -46.6558,
        city: 'São Paulo',
        state: 'SP',
        type: 'Society',
        maxPlayers: 14,
        pricePerPlayer: 35,
        hasLockerRoom: true,
        hasParking: true,
        hasCoverage: true,
        averageRating: 4.5
      }
    }),
    prisma.field.create({
      data: {
        name: 'Campo do Morumbi',
        address: 'Rua Morumbi, 500',
        latitude: -23.6237,
        longitude: -46.7196,
        city: 'São Paulo',
        state: 'SP',
        type: 'Field',
        maxPlayers: 22,
        pricePerPlayer: 25,
        hasLockerRoom: true,
        hasBarbecue: true,
        hasParking: true,
        averageRating: 4.2
      }
    }),
    prisma.field.create({
      data: {
        name: 'FUT7 Maringá',
        address: 'Av. Brasil',
        latitude: -23.4205,
        longitude: -51.9332,
        city: 'Maringá',
        state: 'PR',
        type: 'Society',
        maxPlayers: 14,
        pricePerPlayer: 30,
        averageRating: 4.0
      }
    })
  ])

  const referee = await prisma.referee.create({
    data: { name: 'Carlos Mendes', phone: '11977777777', whatsApp: '11977777777', city: 'São Paulo', pricePerMatch: 80, averageRating: 4.8 }
  })

  const goalkeeper = await prisma.goalkeeper.create({
    data: { name: 'Pedro Goleiro', city: 'São Paulo', whatsApp: '11955555555', pricePerMatch: 50, averageRating: 4.6 }
  })

  await prisma.goalkeeper.create({
    data: { name: 'Marcos Keeper', city: 'São Paulo', whatsApp: '11944444444', pricePerMatch: 45, averageRating: 4.1 }
  })

  const matchDate = new Date()
  matchDate.setDate(matchDate.getDate() + 3)

  await prisma.match.create({
    data: {
      fieldId: fields[0].id,
      date: matchDate,
      time: '20:00',
      maxPlayers: 14,
      refereeId: referee.id,
      goalkeeperId: goalkeeper.id,
      participationFee: 35,
      notes: 'Pelada society - nível intermediário',
      status: 'Open',
      createdById: admin.id
    }
  })

  console.log('Seed aplicado:', { admin: admin.email, player: player.email })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
