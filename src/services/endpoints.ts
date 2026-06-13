import api from './api'
import type { ApiResponse, AuthResponse, AppSettings, Contact, Referee, Goalkeeper, PagedResult, UserProfile, Field, Match, RecurringMatch, Attendance, TeamFormation, Dashboard, PlayerRanking, Notification, Payment } from '@/types'

export const authApi = {
  register: (data: Record<string, unknown>) => api.post<ApiResponse<AuthResponse>>('/auth/register', data),
  quickRegister: (data: { name: string; whatsApp: string; primaryPosition: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register/quick', data),
  login: (email: string, password: string) => api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }),
  getProfile: () => api.get<ApiResponse<UserProfile>>('/auth/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put<ApiResponse<UserProfile>>('/auth/profile', data)
}

export const settingsApi = {
  get: () => api.get<ApiResponse<AppSettings>>('/settings'),
  update: (data: { onlyAdminCanCreateFields: boolean; onlyAdminCanCreateMatches: boolean }) =>
    api.put<ApiResponse<AppSettings>>('/settings', data)
}

export const contactsApi = {
  getAll: (params?: Record<string, unknown>) => api.get<ApiResponse<PagedResult<Contact>>>('/contacts', { params }),
  getCities: (type: string) => api.get<ApiResponse<string[]>>('/contacts/cities', { params: { type } })
}

export const staffApi = {
  quickStaff: (data: { name: string; whatsApp: string; position: string }) =>
    api.post('/staff/quick', data),
  quickReferee: (data: { name: string; whatsApp: string; position?: string }) =>
    api.post('/staff/referees/quick', { ...data, position: 'referee' }),
  quickGoalkeeper: (data: { name: string; whatsApp: string; position?: string }) =>
    api.post('/staff/goalkeepers/quick', { ...data, position: 'goalkeeper' })
}

export const fieldsApi = {
  getAll: (params?: Record<string, unknown>) => api.get<ApiResponse<PagedResult<Field>>>('/fields', { params }),
  getCities: () => api.get<ApiResponse<string[]>>('/fields/cities'),
  getById: (id: string) => api.get<ApiResponse<Field>>(`/fields/${id}`),
  getMap: (params?: Record<string, unknown>) => api.get<ApiResponse<Field[]>>('/fields/map', { params }),
  create: (data: Record<string, unknown>) => api.post<ApiResponse<Field>>('/fields', data),
  update: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<Field>>(`/fields/${id}`, data),
  delete: (id: string) => api.delete(`/fields/${id}`),
  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ApiResponse<{ url: string }>>('/fields/upload-photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  rate: (id: string, data: Record<string, unknown>) => api.post(`/fields/${id}/rate`, data)
}

export const matchesApi = {
  getAll: (params?: Record<string, unknown>) => api.get<ApiResponse<PagedResult<Match>>>('/matches', { params }),
  getCities: () => api.get<ApiResponse<string[]>>('/matches/cities'),
  getById: (id: string) => api.get<ApiResponse<Match>>(`/matches/${id}`),
  create: (data: Record<string, unknown>) => api.post<ApiResponse<Match>>('/matches', data),
  update: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<Match>>(`/matches/${id}`, data),
  delete: (id: string) => api.delete(`/matches/${id}`),
  getAttendances: (id: string) => api.get<ApiResponse<Attendance[]>>(`/matches/${id}/attendances`),
  confirm: (id: string) => api.post<ApiResponse<Attendance>>(`/matches/${id}/confirm`),
  cancel: (id: string) => api.post<ApiResponse<Attendance>>(`/matches/${id}/cancel`),
  waitlist: (id: string) => api.post<ApiResponse<Attendance>>(`/matches/${id}/waitlist`),
  generateTeams: (id: string) => api.post<ApiResponse<TeamFormation>>(`/matches/${id}/teams`),
  getMessages: (id: string) => api.get(`/matches/${id}/messages`),
  sendMessage: (id: string, data: { content: string; photoUrl?: string }) => api.post(`/matches/${id}/messages`, data),
  voteMvp: (id: string, votedUserId: string) => api.post(`/matches/${id}/mvp`, { votedUserId })
}

export const recurringMatchesApi = {
  getAll: () => api.get<ApiResponse<RecurringMatch[]>>('/recurring-matches'),
  getById: (id: string) => api.get<ApiResponse<RecurringMatch>>(`/recurring-matches/${id}`),
  create: (data: Record<string, unknown>) => api.post<ApiResponse<RecurringMatch>>('/recurring-matches', data),
  update: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<RecurringMatch>>(`/recurring-matches/${id}`, data),
  delete: (id: string) => api.delete(`/recurring-matches/${id}`),
  cancelOccurrence: (id: string, date: string, reason?: string) =>
    api.post(`/recurring-matches/${id}/cancel-occurrence`, { date, reason })
}

export const dashboardApi = {
  get: () => api.get<ApiResponse<Dashboard>>('/dashboard'),
  getRanking: () => api.get<ApiResponse<PlayerRanking[]>>('/dashboard/ranking'),
  getPlayerProfile: (id: string) => api.get(`/dashboard/players/${id}`)
}

export const notificationsApi = {
  getAll: () => api.get<ApiResponse<Notification[]>>('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`)
}

export const paymentsApi = {
  getAll: (params?: Record<string, unknown>) => api.get<ApiResponse<PagedResult<Payment>>>('/payments', { params }),
  update: (id: string, data: Record<string, unknown>) => api.put<ApiResponse<Payment>>(`/payments/${id}`, data),
  getReport: (period: string) => api.get(`/payments/report`, { params: { period } })
}

export const usersApi = {
  getAll: (params?: Record<string, unknown>) => api.get<ApiResponse<PagedResult<UserProfile>>>('/users', { params }),
  delete: (id: string) => api.delete(`/users/${id}`),
  updateRole: (id: string, role: string) => api.put(`/users/${id}/role`, role, { headers: { 'Content-Type': 'application/json' } })
}

export const goalkeepersApi = {
  getAll: (params?: Record<string, unknown>) => api.get<ApiResponse<PagedResult<Goalkeeper>>>('/goalkeepers', { params }),
  create: (data: Record<string, unknown>) => api.post('/goalkeepers', data)
}

export const refereesApi = {
  getAll: (params?: Record<string, unknown>) => api.get<ApiResponse<PagedResult<Referee>>>('/referees', { params }),
  create: (data: Record<string, unknown>) => api.post('/referees', data)
}
