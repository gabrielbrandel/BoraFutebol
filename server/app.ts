import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { AppError } from './lib/errors.js'
import { ok, fail, parsePagination } from './lib/response.js'
import { authMiddleware, adminMiddleware, type AuthVariables } from './middleware/auth.js'
import * as authService from './services/authService.js'
import * as fieldService from './services/fieldService.js'
import * as matchService from './services/matchService.js'
import * as appServices from './services/appServices.js'
import * as recurringService from './services/recurringMatchService.js'

export function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api')

  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,https://datesoccer.vercel.app')
    .split(',')
    .map(o => o.trim())

  app.use('*', cors({ origin: origins, credentials: true }))

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(fail(err.message, err.errors), err.statusCode as 400)
    }
    console.error(err)
    return c.json(fail('Erro interno do servidor'), 500)
  })

  app.get('/health', c => c.json(ok({ status: 'ok' })))

  // Auth
  app.post('/auth/register', async c => {
    const body = await c.req.json()
    const data = await authService.register(body)
    return c.json(ok(data, 'Cadastro realizado com sucesso'))
  })

  app.post('/auth/register/quick', async c => {
    const body = await c.req.json()
    const data = await authService.quickRegister(body)
    return c.json(ok(data, 'Cadastro realizado com sucesso'))
  })

  app.post('/auth/login', async c => {
    const { email, password } = await c.req.json()
    const data = await authService.login(email, password)
    return c.json(ok(data))
  })

  app.post('/auth/refresh', async c => {
    const { refreshToken } = await c.req.json()
    const data = await authService.refresh(refreshToken)
    return c.json(ok(data))
  })

  app.get('/auth/profile', authMiddleware, async c => {
    const userId = c.get('userId')
    const data = await authService.getProfile(userId)
    return c.json(ok(data))
  })

  app.put('/auth/profile', authMiddleware, async c => {
    const userId = c.get('userId')
    const body = await c.req.json()
    const data = await authService.updateProfile(userId, body)
    return c.json(ok(data, 'Perfil atualizado'))
  })

  // Settings
  app.get('/settings', async c => c.json(ok(await appServices.getSettings())))
  app.put('/settings', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    return c.json(ok(await appServices.updateSettings(body), 'Configurações atualizadas'))
  })

  // Fields
  app.get('/fields/cities', async c => c.json(ok(await fieldService.getFieldCities())))
  app.get('/fields/map', async c => {
    const q = c.req.query()
    return c.json(ok(await fieldService.getMapFields(
      q.lat ? Number(q.lat) : undefined,
      q.lng ? Number(q.lng) : undefined,
      q.maxDistance ? Number(q.maxDistance) : undefined
    )))
  })

  app.get('/fields', async c => {
    const q = c.req.query()
    const { page, pageSize, search } = parsePagination(q)
    const data = await fieldService.getAllFields({
      page, pageSize, search,
      city: q.city,
      type: q.type,
      lat: q.lat ? Number(q.lat) : undefined,
      lng: q.lng ? Number(q.lng) : undefined,
      maxDistance: q.maxDistance ? Number(q.maxDistance) : undefined
    })
    return c.json(ok(data))
  })

  app.get('/fields/:id', async c => c.json(ok(await fieldService.getFieldById(c.req.param('id')))))

  app.post('/fields', authMiddleware, async c => {
    await appServices.ensureCanCreateFields(c.get('role') === 'Admin')
    const body = await c.req.json()
    return c.json(ok(await fieldService.createField(body), 'Campo cadastrado'), 201)
  })

  app.put('/fields/:id', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    return c.json(ok(await fieldService.updateField(c.req.param('id'), body), 'Campo atualizado'))
  })

  app.delete('/fields/:id', authMiddleware, adminMiddleware, async c => {
    await fieldService.deleteField(c.req.param('id'))
    return c.json(ok(null, 'Campo removido'))
  })

  app.post('/fields/:id/rate', authMiddleware, async c => {
    const body = await c.req.json()
    await fieldService.rateField(c.req.param('id'), c.get('userId'), body)
    return c.json(ok(null, 'Avaliação registrada'))
  })

  // Matches
  app.get('/matches/cities', async c => c.json(ok(await matchService.getMatchCities())))
  app.get('/matches', async c => {
    const q = c.req.query()
    const { page, pageSize, search } = parsePagination(q)
    const data = await matchService.getMatches({
      page, pageSize, search,
      status: q.status ?? q.filter?.status,
      city: q.city ?? q.filter?.city,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : q.filter?.maxPrice ? Number(q.filter.maxPrice) : undefined,
      maxDistanceKm: q.maxDistanceKm ? Number(q.maxDistanceKm) : undefined,
      userLatitude: q.userLatitude ? Number(q.userLatitude) : undefined,
      userLongitude: q.userLongitude ? Number(q.userLongitude) : undefined
    })
    return c.json(ok(data))
  })

  app.get('/matches/:id', async c => c.json(ok(await matchService.getMatchById(c.req.param('id')))))
  app.get('/matches/:id/attendances', async c => c.json(ok(await matchService.getAttendances(c.req.param('id')))))

  app.post('/matches', authMiddleware, async c => {
    await appServices.ensureCanCreateMatches(c.get('role') === 'Admin')
    const body = await c.req.json()
    return c.json(ok(await matchService.createMatch(body, c.get('userId')), 'Partida criada'), 201)
  })

  app.put('/matches/:id', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    return c.json(ok(await matchService.updateMatch(c.req.param('id'), body), 'Partida atualizada'))
  })

  app.delete('/matches/:id', authMiddleware, adminMiddleware, async c => {
    await matchService.deleteMatch(c.req.param('id'))
    return c.json(ok(null, 'Partida removida'))
  })

  app.post('/matches/:id/confirm', authMiddleware, async c => {
    await matchService.confirmAttendance(c.req.param('id'), c.get('userId'))
    return c.json(ok(null, 'Presença confirmada'))
  })

  app.post('/matches/:id/cancel', authMiddleware, async c => {
    await matchService.cancelAttendance(c.req.param('id'), c.get('userId'))
    return c.json(ok(null, 'Presença cancelada'))
  })

  app.post('/matches/:id/waitlist', authMiddleware, async c => {
    await matchService.joinWaitlist(c.req.param('id'), c.get('userId'))
    return c.json(ok(null, 'Entrou na lista de espera'))
  })

  app.post('/matches/:id/teams', authMiddleware, adminMiddleware, async c => {
    const data = await matchService.generateTeams(c.req.param('id'))
    return c.json(ok(data, 'Times gerados'))
  })

  app.get('/matches/:id/messages', authMiddleware, async c => {
    return c.json(ok(await matchService.getMessages(c.req.param('id'))))
  })

  app.post('/matches/:id/messages', authMiddleware, async c => {
    const body = await c.req.json()
    const data = await matchService.sendMessage(c.req.param('id'), c.get('userId'), body.content, body.photoUrl)
    return c.json(ok(data, 'Mensagem enviada'))
  })

  app.post('/matches/:id/mvp', authMiddleware, async c => {
    const body = await c.req.json()
    await matchService.voteMvp(c.req.param('id'), c.get('userId'), body.votedUserId)
    return c.json(ok(null, 'Voto registrado'))
  })

  // Contacts
  app.get('/contacts/cities', authMiddleware, async c => {
    const type = c.req.query('type') || 'players'
    return c.json(ok(await appServices.getContactCities(type)))
  })

  app.get('/contacts', authMiddleware, async c => {
    const q = c.req.query()
    const { page, pageSize, search } = parsePagination(q)
    const data = await appServices.getContacts(q.type || 'players', page, pageSize, search, q.city)
    return c.json(ok(data))
  })

  // Staff
  app.post('/staff/quick', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    const data = await appServices.quickStaff(body)
    return c.json(ok(data, 'Cadastrado com sucesso'))
  })

  app.post('/staff/referees/quick', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    const data = await appServices.quickStaff({ ...body, position: 'referee' })
    return c.json(ok(data, 'Juiz cadastrado'))
  })

  app.post('/staff/goalkeepers/quick', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    const data = await appServices.quickStaff({ ...body, position: 'goalkeeper' })
    return c.json(ok(data, 'Goleiro cadastrado'))
  })

  // Referees & Goalkeepers
  app.get('/referees', async c => {
    const q = c.req.query()
    const { page, pageSize, search } = parsePagination(q)
    return c.json(ok(await appServices.getReferees(page, pageSize, search)))
  })

  app.get('/goalkeepers', async c => {
    const q = c.req.query()
    const { page, pageSize, search } = parsePagination(q)
    return c.json(ok(await appServices.getGoalkeepers(page, pageSize, search)))
  })

  // Dashboard
  app.get('/dashboard', authMiddleware, adminMiddleware, async c => c.json(ok(await appServices.getDashboard())))
  app.get('/dashboard/ranking', async c => c.json(ok(await appServices.getRanking())))

  // Notifications
  app.get('/notifications', authMiddleware, async c => {
    return c.json(ok(await appServices.getNotifications(c.get('userId'))))
  })

  app.put('/notifications/:id/read', authMiddleware, async c => {
    await appServices.markNotificationRead(c.req.param('id'), c.get('userId'))
    return c.json(ok(null, 'Notificação lida'))
  })

  // Users
  app.get('/users', authMiddleware, adminMiddleware, async c => {
    const q = c.req.query()
    const { page, pageSize, search } = parsePagination(q)
    return c.json(ok(await appServices.getUsers(page, pageSize, search)))
  })

  app.delete('/users/:id', authMiddleware, adminMiddleware, async c => {
    await appServices.deleteUser(c.req.param('id'))
    return c.json(ok(null, 'Usuário removido'))
  })

  app.put('/users/:id/role', authMiddleware, adminMiddleware, async c => {
    const role = await c.req.json()
    const data = await appServices.updateUserRole(c.req.param('id'), role)
    return c.json(ok(data, 'Papel atualizado'))
  })

  // Payments
  app.get('/payments', authMiddleware, adminMiddleware, async c => {
    const q = c.req.query()
    const { page, pageSize } = parsePagination(q)
    return c.json(ok(await appServices.getPayments(page, pageSize, q.status)))
  })

  // Recurring matches
  app.get('/recurring-matches', authMiddleware, adminMiddleware, async c => {
    return c.json(ok(await recurringService.getAllRecurring()))
  })

  app.get('/recurring-matches/:id', authMiddleware, adminMiddleware, async c => {
    return c.json(ok(await recurringService.getRecurringById(c.req.param('id'))))
  })

  app.post('/recurring-matches', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    const data = await recurringService.createRecurring(body, c.get('userId'))
    return c.json(ok(data, 'Agenda recorrente criada'), 201)
  })

  app.put('/recurring-matches/:id', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    const data = await recurringService.updateRecurring(c.req.param('id'), body)
    return c.json(ok(data, 'Agenda recorrente atualizada'))
  })

  app.delete('/recurring-matches/:id', authMiddleware, adminMiddleware, async c => {
    await recurringService.deleteRecurring(c.req.param('id'))
    return c.json(ok(null, 'Agenda recorrente removida'))
  })

  app.post('/recurring-matches/:id/cancel-occurrence', authMiddleware, adminMiddleware, async c => {
    const body = await c.req.json()
    await recurringService.cancelOccurrence(c.req.param('id'), body.date, body.reason)
    return c.json(ok(null, 'Ocorrência cancelada'))
  })

  return app
}

export const app = createApp()
