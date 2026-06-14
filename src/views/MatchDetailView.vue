<script setup lang="ts">
defineOptions({ name: 'MatchDetailView' })

import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { matchesApi } from '@/services/endpoints'
import { queryCache } from '@/services/queryCache'
import { useCachedQuery } from '@/composables/useCachedQuery'
import type { Match, Attendance, TeamFormation } from '@/types'
import { MATCH_STATUS_LABELS, POSITION_LABELS } from '@/types'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Avatar from 'primevue/avatar'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'
import { useToast } from 'primevue/usetoast'

interface MatchDetailData {
  match: Match | null
  attendances: Attendance[]
}

type ChatMessage = { id: string; userId: string; userName: string; content: string; createdAt: string }

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const teams = ref<TeamFormation | null>(null)
const newMessage = ref('')
const actionLoading = ref(false)

const matchId = computed(() => route.params.id as string)

const { data, loading, refreshing, refresh } = useCachedQuery<MatchDetailData>(
  () => `match-detail:${matchId.value}`,
  async () => {
    const [matchRes, attRes] = await Promise.all([
      matchesApi.getById(matchId.value),
      matchesApi.getAttendances(matchId.value)
    ])
    return {
      match: matchRes.data.success ? matchRes.data.data : null,
      attendances: attRes.data.success ? attRes.data.data : []
    }
  },
  { staleMs: 15_000, cacheMs: 3 * 60_000 }
)

const { data: messagesData, refresh: refreshMessages } = useCachedQuery<ChatMessage[]>(
  () => `match-messages:${matchId.value}`,
  async () => {
    const { data: res } = await matchesApi.getMessages(matchId.value)
    if (!res.success) return []
    return res.data.data || res.data
  },
  { enabled: false, staleMs: 10_000 }
)

const match = computed(() => data.value?.match ?? null)
const attendances = computed(() => data.value?.attendances ?? [])
const messages = computed(() => messagesData.value ?? [])

const isFull = computed(() => match.value ? match.value.confirmedCount >= match.value.maxPlayers : false)
const myAttendance = computed(() => attendances.value.find(a => a.userId === auth.user?.id))

async function reloadMatch() {
  queryCache.invalidate(`match-detail:${matchId.value}`)
  await refresh(false)
}

async function confirmPresence() {
  actionLoading.value = true
  try {
    const { data: res } = await matchesApi.confirm(matchId.value)
    if (res.success) {
      toast.add({ severity: 'success', summary: 'Presença confirmada!' })
      await reloadMatch()
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.add({ severity: 'error', summary: err.response?.data?.message || 'Erro' })
  } finally { actionLoading.value = false }
}

async function cancelPresence() {
  actionLoading.value = true
  try {
    await matchesApi.cancel(matchId.value)
    toast.add({ severity: 'info', summary: 'Presença cancelada' })
    await reloadMatch()
  } finally { actionLoading.value = false }
}

async function joinWaitlist() {
  actionLoading.value = true
  try {
    await matchesApi.waitlist(matchId.value)
    toast.add({ severity: 'success', summary: 'Adicionado à lista de espera' })
    await reloadMatch()
  } finally { actionLoading.value = false }
}

async function generateTeams() {
  const { data: res } = await matchesApi.generateTeams(matchId.value)
  if (res.success) teams.value = res.data
}

async function loadMessages() {
  await refreshMessages(false)
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  await matchesApi.sendMessage(matchId.value, { content: newMessage.value })
  newMessage.value = ''
  queryCache.invalidate(`match-messages:${matchId.value}`)
  await refreshMessages(false)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function openNavigation() {
  if (!match.value) return
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${match.value.fieldLatitude},${match.value.fieldLongitude}`, '_blank')
}
</script>

<template>
  <div>
    <RefreshIndicator :visible="refreshing" />

    <div class="page-container" v-if="!loading && match">
      <Button icon="pi pi-arrow-left" label="Voltar" text @click="router.back()" class="mb-3" />

      <div class="match-header">
        <div>
          <h1 class="page-title">{{ match.fieldName }}</h1>
          <p class="page-subtitle">
            <i class="pi pi-map-marker" /> {{ match.fieldAddress }} —
            {{ formatDate(match.date) }} às {{ match.time }}
          </p>
        </div>
        <div class="header-actions">
          <span class="price-tag">R$ {{ match.participationFee.toFixed(2) }}</span>
          <span :class="['status-badge', match.status.toLowerCase()]">{{ MATCH_STATUS_LABELS[match.status] }}</span>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item"><i class="pi pi-users" /><span>{{ match.confirmedCount }}/{{ match.maxPlayers }} jogadores</span></div>
        <div v-if="match.refereeName" class="info-item"><i class="pi pi-user" /><span>Árbitro: {{ match.refereeName }}</span></div>
        <div v-if="match.goalkeeperName" class="info-item"><i class="pi pi-shield" /><span>Goleiro: {{ match.goalkeeperName }}</span></div>
        <div v-if="match.waitlistCount" class="info-item"><i class="pi pi-clock" /><span>{{ match.waitlistCount }} na lista de espera</span></div>
      </div>

      <div class="action-bar" v-if="auth.isAuthenticated && match.status === 'Open'">
        <template v-if="!myAttendance || myAttendance.status === 'Cancelled'">
          <Button v-if="!isFull" label="Confirmar Presença" icon="pi pi-check" :loading="actionLoading" @click="confirmPresence" />
          <Button v-else label="Entrar na Lista de Espera" icon="pi pi-clock" severity="warn" :loading="actionLoading" @click="joinWaitlist" />
        </template>
        <template v-else-if="myAttendance.status === 'Confirmed' || myAttendance.status === 'Promoted'">
          <Button label="Cancelar Presença" icon="pi pi-times" severity="danger" outlined :loading="actionLoading" @click="cancelPresence" />
        </template>
        <template v-else-if="myAttendance.status === 'Waitlist'">
          <span class="waitlist-info"><i class="pi pi-clock" /> Você está na posição {{ myAttendance.waitlistPosition }} da lista de espera</span>
          <Button label="Sair da Lista" severity="danger" text :loading="actionLoading" @click="cancelPresence" />
        </template>
        <Button label="Navegar até o Campo" icon="pi pi-directions" severity="secondary" outlined @click="openNavigation" />
      </div>

      <p v-if="match.notes" class="notes"><i class="pi pi-info-circle" /> {{ match.notes }}</p>

      <Tabs value="0" class="mt-4">
        <TabList>
          <Tab value="0">Participantes</Tab>
          <Tab value="1">Times</Tab>
          <Tab value="2" @click="loadMessages">Chat</Tab>
        </TabList>
        <TabPanels>
        <TabPanel value="0">
          <div class="attendees-list">
            <div v-for="att in attendances.filter(a => a.status !== 'Cancelled')" :key="att.id" class="player-item">
              <Avatar :label="att.userName.charAt(0)" shape="circle" />
              <div class="flex-1">
                <strong>{{ att.userName }}</strong>
                <span class="position">{{ POSITION_LABELS[att.primaryPosition] }}</span>
              </div>
              <div class="stars">
                <i v-for="n in att.technicalLevel" :key="n" class="pi pi-star-fill" />
              </div>
              <span :class="['status-badge', att.status.toLowerCase()]">{{ att.status }}</span>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="1">
          <div class="teams-section">
            <Button v-if="auth.isAdmin" label="Gerar Times Automaticamente" icon="pi pi-sync" @click="generateTeams" class="mb-3" />
            <div v-if="teams" class="team-formation">
              <div class="team-panel team-a">
                <div class="team-header">Time A</div>
                <div class="team-score">{{ teams.teamAScore }}</div>
                <div v-for="p in teams.teamA" :key="p.userId" class="player-item">
                  <Avatar :label="p.name.charAt(0)" shape="circle" size="small" />
                  <span>{{ p.name }}</span>
                  <span class="position">{{ POSITION_LABELS[p.position] }}</span>
                </div>
              </div>
              <div class="vs">VS</div>
              <div class="team-panel team-b">
                <div class="team-header">Time B</div>
                <div class="team-score">{{ teams.teamBScore }}</div>
                <div v-for="p in teams.teamB" :key="p.userId" class="player-item">
                  <Avatar :label="p.name.charAt(0)" shape="circle" size="small" />
                  <span>{{ p.name }}</span>
                  <span class="position">{{ POSITION_LABELS[p.position] }}</span>
                </div>
              </div>
            </div>
            <p v-else class="empty-teams">Clique em "Gerar Times" para formar os times automaticamente</p>
          </div>
        </TabPanel>

        <TabPanel value="2">
          <div class="chat-container">
            <div class="chat-messages">
              <div v-for="msg in messages" :key="msg.id" :class="['message-bubble', { own: msg.userId === auth.user?.id }]">
                <strong>{{ msg.userName }}</strong>
                <p>{{ msg.content }}</p>
                <small>{{ new Date(msg.createdAt).toLocaleTimeString('pt-BR') }}</small>
              </div>
            </div>
            <div v-if="auth.isAuthenticated" class="chat-input">
              <InputText v-model="newMessage" placeholder="Digite sua mensagem..." class="flex-1" @keyup.enter="sendMessage" />
              <Button icon="pi pi-send" @click="sendMessage" />
            </div>
          </div>
        </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
    <div v-else-if="loading" class="loading"><ProgressSpinner /></div>
  </div>
</template>

<style scoped lang="scss">
.match-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
.header-actions { display: flex; align-items: center; gap: 1rem; }
.info-grid { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 1.5rem; }
.info-item { display: flex; align-items: center; gap: 0.5rem; color: var(--ds-text-muted); i { color: var(--ds-primary); } }
.action-bar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; margin-bottom: 1.5rem; padding: 1rem; background: var(--ds-surface); border-radius: var(--ds-radius); border: 1px solid var(--ds-border); }
.waitlist-info { color: var(--ds-text-muted); }
.notes { padding: 1rem; background: var(--ds-surface); border-radius: var(--ds-radius); border-left: 4px solid var(--ds-primary); margin-bottom: 1rem; }
.position { font-size: 0.8rem; color: var(--ds-text-muted); display: block; }
.vs { font-size: 2rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.empty-teams { text-align: center; color: var(--ds-text-muted); padding: 2rem; }
.loading { display: flex; justify-content: center; padding: 4rem; }
.mt-4 { margin-top: 1.5rem; }
.mb-3 { margin-bottom: 1rem; }
.flex-1 { flex: 1; }
</style>
