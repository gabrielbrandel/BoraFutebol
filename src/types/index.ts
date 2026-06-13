export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  errors?: string[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface UserProfile {
  id: string
  name: string
  email: string
  photoUrl?: string
  phone?: string
  whatsApp?: string
  city: string
  state: string
  primaryPosition: string
  technicalLevel: number
  role: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: UserProfile
}

export interface AppSettings {
  onlyAdminCanCreateFields: boolean
  onlyAdminCanCreateMatches: boolean
  usersCanCreateFields: boolean
  usersCanCreateMatches: boolean
}

export interface Contact {
  id: string
  type: string
  name: string
  city: string
  state?: string
  whatsApp: string
  phone?: string
  detail?: string
  pricePerMatch?: number
  averageRating?: number
}

export interface Referee {
  id: string
  name: string
  phone: string
  whatsApp: string
  photoUrl?: string
  city: string
  pricePerMatch: number
  averageRating: number
}

export interface Goalkeeper {
  id: string
  name: string
  city: string
  whatsApp: string
  pricePerMatch: number
  averageRating: number
}

export interface Field {
  id: string
  name: string
  zipCode?: string
  address: string
  latitude: number
  longitude: number
  city: string
  state: string
  mainPhotoUrl?: string
  galleryPhotos?: string
  type: string
  maxPlayers: number
  pricePerPlayer: number
  hasLockerRoom: boolean
  hasBarbecue: boolean
  hasParking: boolean
  hasCoverage: boolean
  averageRating: number
  distanceKm?: number
}

export interface Match {
  id: string
  fieldId: string
  fieldName: string
  fieldAddress: string
  fieldLatitude: number
  fieldLongitude: number
  fieldMainPhotoUrl?: string
  date: string
  time: string
  maxPlayers: number
  confirmedCount: number
  waitlistCount: number
  refereeId?: string
  refereeName?: string
  goalkeeperId?: string
  goalkeeperName?: string
  participationFee: number
  notes?: string
  status: string
  createdById: string
  createdByName: string
  mvpUserId?: string
  mvpUserName?: string
  recurringMatchId?: string
  isRecurring?: boolean
}

export interface RecurringMatch {
  id: string
  fieldId: string
  fieldName: string
  time: string
  maxPlayers: number
  refereeId?: string
  refereeName?: string
  goalkeeperId?: string
  goalkeeperName?: string
  participationFee: number
  notes?: string
  daysOfWeek: number[]
  upcomingOccurrences: { date: string; matchId?: string; status: string }[]
}

export interface Attendance {
  id: string
  userId: string
  userName: string
  userPhotoUrl?: string
  primaryPosition: string
  technicalLevel: number
  status: string
  waitlistPosition: number
  wasPresent: boolean
}

export interface TeamFormation {
  matchId: string
  teamA: TeamPlayer[]
  teamB: TeamPlayer[]
  teamAScore: number
  teamBScore: number
}

export interface TeamPlayer {
  userId: string
  name: string
  photoUrl?: string
  position: string
  technicalLevel: number
}

export interface Dashboard {
  upcomingMatches: { id: string; fieldName: string; date: string; time: string; confirmedCount: number; maxPlayers: number }[]
  topFields: { id: string; name: string; matchCount: number; averageRating: number }[]
  topPlayers: { id: string; name: string; attendanceCount: number; averageRating: number }[]
  attendanceRate: number
  totalRevenue: number
  totalMatchesPlayed: number
  revenueChart: { label: string; value: number }[]
  matchesChart: { label: string; value: number }[]
}

export interface PlayerRanking {
  id: string
  name: string
  photoUrl?: string
  matchesPlayed: number
  goals: number
  assists: number
  mvpCount: number
  averageRating: number
  rank: number
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  relatedMatchId?: string
  createdAt: string
}

export interface Payment {
  id: string
  matchId: string
  matchInfo: string
  userId: string
  userName: string
  amount: number
  status: string
  method?: string
  paidAt?: string
  notes?: string
}

export const POSITIONS = [
  'Goalkeeper', 'Defender', 'RightBack', 'LeftBack',
  'DefensiveMidfielder', 'Midfielder', 'Forward'
] as const

export const POSITION_LABELS: Record<string, string> = {
  Goalkeeper: 'Goleiro',
  Defender: 'Zagueiro',
  RightBack: 'Lateral Direito',
  LeftBack: 'Lateral Esquerdo',
  DefensiveMidfielder: 'Volante',
  Midfielder: 'Meio Campo',
  Forward: 'Atacante'
}

export const FIELD_TYPE_LABELS: Record<string, string> = {
  Society: 'Society',
  Field: 'Campo',
  Futsal: 'Futsal'
}

export const MATCH_STATUS_LABELS: Record<string, string> = {
  Open: 'Aberta',
  Closed: 'Fechada',
  Cancelled: 'Cancelada',
  Finished: 'Finalizada'
}
