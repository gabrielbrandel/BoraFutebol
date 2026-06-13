import type { FieldType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { NotFoundError, AppError } from '../lib/errors.js'
import { normalize, matchesAny, matchesCity } from '../lib/textSearch.js'
import { calculateDistanceKm } from '../lib/geo.js'
import { paginate } from '../lib/response.js'
import { toNumber } from '../lib/mappers.js'

function mapField(field: {
  id: string
  name: string
  zipCode: string | null
  address: string
  latitude: number
  longitude: number
  city: string
  state: string
  mainPhotoUrl: string | null
  galleryPhotos: string[]
  type: FieldType
  maxPlayers: number
  pricePerPlayer: { toNumber?: () => number } | number
  hasLockerRoom: boolean
  hasBarbecue: boolean
  hasParking: boolean
  hasCoverage: boolean
  averageRating: { toNumber?: () => number } | number
}, distanceKm?: number) {
  return {
    id: field.id,
    name: field.name,
    zipCode: field.zipCode,
    address: field.address,
    latitude: field.latitude,
    longitude: field.longitude,
    city: field.city,
    state: field.state,
    mainPhotoUrl: field.mainPhotoUrl,
    galleryPhotos: field.galleryPhotos,
    type: field.type,
    maxPlayers: field.maxPlayers,
    pricePerPlayer: toNumber(field.pricePerPlayer),
    hasLockerRoom: field.hasLockerRoom,
    hasBarbecue: field.hasBarbecue,
    hasParking: field.hasParking,
    hasCoverage: field.hasCoverage,
    averageRating: toNumber(field.averageRating),
    distanceKm
  }
}

export async function getAllFields(opts: {
  page: number
  pageSize: number
  search?: string
  city?: string
  type?: string
  lat?: number
  lng?: number
  maxDistance?: number
}) {
  let fields = await prisma.field.findMany({ where: { isActive: true } })

  if (opts.city) {
    const n = normalize(opts.city)
    fields = fields.filter(f => normalize(f.city) === n)
  }
  if (opts.type) {
    fields = fields.filter(f => f.type.toLowerCase() === opts.type!.toLowerCase())
  }
  if (opts.search) {
    const term = normalize(opts.search)
    fields = fields.filter(f => matchesAny(term, f.name, f.city, f.address, f.state, f.zipCode))
  }

  let dtos = fields.map(f => {
    const distanceKm =
      opts.lat != null && opts.lng != null
        ? calculateDistanceKm(opts.lat, opts.lng, f.latitude, f.longitude)
        : undefined
    return mapField(f, distanceKm)
  })

  if (opts.maxDistance != null && opts.lat != null && opts.lng != null) {
    dtos = dtos.filter(f => (f.distanceKm ?? Infinity) <= opts.maxDistance!)
  }

  const total = dtos.length
  const items = dtos.slice((opts.page - 1) * opts.pageSize, opts.page * opts.pageSize)
  return paginate(items, opts.page, opts.pageSize, total)
}

export async function getFieldCities() {
  const cities = await prisma.field.findMany({
    where: { isActive: true, city: { not: '' } },
    select: { city: true },
    distinct: ['city'],
    orderBy: { city: 'asc' }
  })
  return cities.map(c => c.city)
}

export async function getFieldById(id: string) {
  const field = await prisma.field.findUnique({ where: { id } })
  if (!field || !field.isActive) throw new NotFoundError('Campo não encontrado')
  return mapField(field)
}

export async function getMapFields(lat?: number, lng?: number, maxDistance?: number) {
  const fields = await prisma.field.findMany({ where: { isActive: true } })
  let result = fields.map(f => {
    const distanceKm = lat != null && lng != null
      ? calculateDistanceKm(lat, lng, f.latitude, f.longitude)
      : undefined
    return {
      id: f.id,
      name: f.name,
      latitude: f.latitude,
      longitude: f.longitude,
      type: f.type,
      pricePerPlayer: toNumber(f.pricePerPlayer),
      averageRating: toNumber(f.averageRating),
      distanceKm
    }
  })
  if (maxDistance != null && lat != null && lng != null) {
    result = result
      .filter(f => (f.distanceKm ?? Infinity) <= maxDistance)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
  }
  return result
}

export async function createField(data: Record<string, unknown>) {
  await ensureUniqueFieldName(String(data.name))
  const field = await prisma.field.create({
    data: {
      name: String(data.name),
      zipCode: data.zipCode ? String(data.zipCode) : null,
      address: String(data.address ?? ''),
      latitude: Number(data.latitude ?? -23.55),
      longitude: Number(data.longitude ?? -46.63),
      city: String(data.city ?? ''),
      state: String(data.state ?? ''),
      mainPhotoUrl: data.mainPhotoUrl ? String(data.mainPhotoUrl) : null,
      type: (data.type as FieldType) ?? 'Society',
      maxPlayers: Number(data.maxPlayers ?? 14),
      pricePerPlayer: Number(data.pricePerPlayer ?? 0),
      hasLockerRoom: Boolean(data.hasLockerRoom),
      hasBarbecue: Boolean(data.hasBarbecue),
      hasParking: Boolean(data.hasParking),
      hasCoverage: Boolean(data.hasCoverage)
    }
  })
  return mapField(field)
}

export async function updateField(id: string, data: Record<string, unknown>) {
  const existing = await prisma.field.findUnique({ where: { id } })
  if (!existing || !existing.isActive) throw new NotFoundError('Campo não encontrado')
  await ensureUniqueFieldName(String(data.name), id)
  const field = await prisma.field.update({
    where: { id },
    data: {
      name: String(data.name),
      zipCode: data.zipCode ? String(data.zipCode) : null,
      address: String(data.address ?? existing.address),
      latitude: Number(data.latitude ?? existing.latitude),
      longitude: Number(data.longitude ?? existing.longitude),
      city: String(data.city ?? existing.city),
      state: String(data.state ?? existing.state),
      mainPhotoUrl: data.mainPhotoUrl != null ? String(data.mainPhotoUrl) : existing.mainPhotoUrl,
      type: (data.type as FieldType) ?? existing.type,
      maxPlayers: Number(data.maxPlayers ?? existing.maxPlayers),
      pricePerPlayer: Number(data.pricePerPlayer ?? toNumber(existing.pricePerPlayer)),
      hasLockerRoom: Boolean(data.hasLockerRoom ?? existing.hasLockerRoom),
      hasBarbecue: Boolean(data.hasBarbecue ?? existing.hasBarbecue),
      hasParking: Boolean(data.hasParking ?? existing.hasParking),
      hasCoverage: Boolean(data.hasCoverage ?? existing.hasCoverage)
    }
  })
  return mapField(field)
}

export async function deleteField(id: string) {
  await prisma.field.update({ where: { id }, data: { isActive: false } })
}

export async function rateField(fieldId: string, userId: string, data: {
  grassRating: number
  lightingRating: number
  structureRating: number
  locationRating: number
  comment?: string
  matchId?: string
}) {
  const field = await prisma.field.findUnique({ where: { id: fieldId } })
  if (!field) throw new NotFoundError('Campo não encontrado')

  await prisma.fieldRating.create({
    data: {
      fieldId,
      userId,
      matchId: data.matchId,
      grassRating: data.grassRating,
      lightingRating: data.lightingRating,
      structureRating: data.structureRating,
      locationRating: data.locationRating,
      comment: data.comment
    }
  })

  const avg = (data.grassRating + data.lightingRating + data.structureRating + data.locationRating) / 4
  const count = await prisma.fieldRating.count({ where: { fieldId } })
  const current = toNumber(field.averageRating)
  await prisma.field.update({
    where: { id: fieldId },
    data: { averageRating: (current * count + avg) / (count + 1) }
  })
}

async function ensureUniqueFieldName(name: string, excludeId?: string) {
  const existing = await prisma.field.findFirst({
    where: {
      isActive: true,
      name: { equals: name.trim(), mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  })
  if (existing) throw new AppError(`Já existe um campo com o nome '${name.trim()}'`)
}
