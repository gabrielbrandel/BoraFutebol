<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { matchesApi, recurringMatchesApi, fieldsApi, refereesApi, goalkeepersApi } from '@/services/endpoints'
import type { Match, RecurringMatch } from '@/types'
import { MATCH_STATUS_LABELS } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Calendar from 'primevue/calendar'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()
const matches = ref<Match[]>([])
const recurring = ref<RecurringMatch[]>([])
const fields = ref<{ id: string; name: string }[]>([])
const referees = ref<{ id: string; name: string }[]>([])
const goalkeepers = ref<{ id: string; name: string }[]>([])

const showMatchDialog = ref(false)
const showRecurringDialog = ref(false)
const editingMatchId = ref<string | null>(null)
const editingRecurringId = ref<string | null>(null)

const weekDays = [
  { label: 'Dom', value: 0 }, { label: 'Seg', value: 1 }, { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 }, { label: 'Qui', value: 4 }, { label: 'Sex', value: 5 }, { label: 'Sáb', value: 6 }
]

const statusOptions = Object.entries(MATCH_STATUS_LABELS).map(([value, label]) => ({ label, value }))

const matchForm = ref({
  fieldId: '', date: null as Date | null, time: '20:00',
  maxPlayers: 14, refereeId: '', goalkeeperId: '', participationFee: 35, notes: '', status: 'Open'
})

const recurringForm = ref({
  fieldId: '', time: '20:00', maxPlayers: 14, refereeId: '', goalkeeperId: '',
  participationFee: 35, notes: '', daysOfWeek: [] as number[]
})

onMounted(loadAll)

async function loadAll() {
  const [m, r, f, ref, g] = await Promise.all([
    matchesApi.getAll({ page: 1, pageSize: 100 }),
    recurringMatchesApi.getAll(),
    fieldsApi.getAll({ page: 1, pageSize: 50 }),
    refereesApi.getAll({ page: 1, pageSize: 50 }),
    goalkeepersApi.getAll({ page: 1, pageSize: 50 })
  ])
  if (m.data.success) matches.value = m.data.data.items
  if (r.data.success) recurring.value = r.data.data
  if (f.data.success) fields.value = f.data.data.items.map(i => ({ id: i.id, name: i.name }))
  if (ref.data.success) referees.value = ref.data.data.items
  if (g.data.success) goalkeepers.value = g.data.data.items
}

function openCreateMatch() {
  editingMatchId.value = null
  matchForm.value = { fieldId: '', date: null, time: '20:00', maxPlayers: 14, refereeId: '', goalkeeperId: '', participationFee: 35, notes: '', status: 'Open' }
  showMatchDialog.value = true
}

function openEditMatch(match: Match) {
  editingMatchId.value = match.id
  matchForm.value = {
    fieldId: match.fieldId,
    date: new Date(match.date),
    time: match.time,
    maxPlayers: match.maxPlayers,
    refereeId: match.refereeId || '',
    goalkeeperId: match.goalkeeperId || '',
    participationFee: match.participationFee,
    notes: match.notes || '',
    status: match.status
  }
  showMatchDialog.value = true
}

async function saveMatch() {
  try {
    const base = {
      fieldId: matchForm.value.fieldId,
      time: matchForm.value.time,
      maxPlayers: matchForm.value.maxPlayers,
      refereeId: matchForm.value.refereeId || null,
      goalkeeperId: matchForm.value.goalkeeperId || null,
      participationFee: matchForm.value.participationFee,
      notes: matchForm.value.notes || null,
      date: matchForm.value.date?.toISOString()
    }
    if (editingMatchId.value) {
      await matchesApi.update(editingMatchId.value, { ...base, status: matchForm.value.status })
      toast.add({ severity: 'success', summary: 'Partida atualizada!' })
    } else {
      await matchesApi.create(base)
      toast.add({ severity: 'success', summary: 'Partida criada!' })
    }
    showMatchDialog.value = false
    await loadAll()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.add({ severity: 'error', summary: 'Erro', detail: err.response?.data?.message })
  }
}

function deleteMatch(match: Match) {
  confirm.require({
    message: `Cancelar partida em ${match.fieldName}?`,
    header: 'Confirmar',
    accept: async () => {
      await matchesApi.delete(match.id)
      toast.add({ severity: 'success', summary: 'Partida cancelada' })
      await loadAll()
    }
  })
}

function openCreateRecurring() {
  editingRecurringId.value = null
  recurringForm.value = { fieldId: '', time: '20:00', maxPlayers: 14, refereeId: '', goalkeeperId: '', participationFee: 35, notes: '', daysOfWeek: [] }
  showRecurringDialog.value = true
}

function openEditRecurring(item: RecurringMatch) {
  editingRecurringId.value = item.id
  recurringForm.value = {
    fieldId: item.fieldId,
    time: item.time,
    maxPlayers: item.maxPlayers,
    refereeId: item.refereeId || '',
    goalkeeperId: item.goalkeeperId || '',
    participationFee: item.participationFee,
    notes: item.notes || '',
    daysOfWeek: [...item.daysOfWeek]
  }
  showRecurringDialog.value = true
}

function toggleDay(day: number) {
  const idx = recurringForm.value.daysOfWeek.indexOf(day)
  if (idx >= 0) recurringForm.value.daysOfWeek.splice(idx, 1)
  else recurringForm.value.daysOfWeek.push(day)
}

async function saveRecurring() {
  if (!recurringForm.value.daysOfWeek.length) {
    toast.add({ severity: 'warn', summary: 'Selecione pelo menos um dia' })
    return
  }
  try {
    const payload = {
      ...recurringForm.value,
      refereeId: recurringForm.value.refereeId || null,
      goalkeeperId: recurringForm.value.goalkeeperId || null
    }
    if (editingRecurringId.value) {
      await recurringMatchesApi.update(editingRecurringId.value, payload)
      toast.add({ severity: 'success', summary: 'Agenda atualizada!' })
    } else {
      await recurringMatchesApi.create(payload)
      toast.add({ severity: 'success', summary: 'Agenda recorrente criada!' })
    }
    showRecurringDialog.value = false
    await loadAll()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.add({ severity: 'error', summary: 'Erro', detail: err.response?.data?.message })
  }
}

function deleteRecurring(item: RecurringMatch) {
  confirm.require({
    message: `Remover agenda recorrente de ${item.fieldName}?`,
    header: 'Confirmar',
    accept: async () => {
      await recurringMatchesApi.delete(item.id)
      toast.add({ severity: 'success', summary: 'Agenda removida' })
      await loadAll()
    }
  })
}

function cancelOccurrence(item: RecurringMatch, date: string) {
  confirm.require({
    message: `Cancelar pelada de ${new Date(date).toLocaleDateString('pt-BR')}?`,
    header: 'Cancelar dia',
    accept: async () => {
      await recurringMatchesApi.cancelOccurrence(item.id, date)
      toast.add({ severity: 'success', summary: 'Dia cancelado' })
      await loadAll()
    }
  })
}

function formatDays(days: number[]) {
  return days.map(d => weekDays.find(w => w.value === d)?.label).filter(Boolean).join(', ')
}

function statusSeverity(status: string) {
  return ({ Open: 'success', Closed: 'warn', Cancelled: 'danger', Finished: 'info' } as Record<string, string>)[status] || 'secondary'
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Gerenciar Partidas</h1>

    <TabView>
      <TabPanel value="matches" header="Partidas">
        <div class="header-row">
          <p class="subtitle">Partidas avulsas e geradas automaticamente</p>
          <Button label="Nova Partida" icon="pi pi-plus" @click="openCreateMatch" />
        </div>

        <DataTable :value="matches" stripedRows paginator :rows="10">
          <Column field="fieldName" header="Campo" />
          <Column header="Data">
            <template #body="{ data }">
              {{ new Date(data.date).toLocaleDateString('pt-BR') }}
              <Tag v-if="data.isRecurring" value="Recorrente" severity="info" class="ml" />
            </template>
          </Column>
          <Column field="time" header="Horário" />
          <Column header="Jogadores">
            <template #body="{ data }">{{ data.confirmedCount }}/{{ data.maxPlayers }}</template>
          </Column>
          <Column header="Valor">
            <template #body="{ data }">R$ {{ data.participationFee.toFixed(2) }}</template>
          </Column>
          <Column header="Status">
            <template #body="{ data }">
              <Tag :value="MATCH_STATUS_LABELS[data.status] || data.status" :severity="statusSeverity(data.status)" />
            </template>
          </Column>
          <Column header="Ações" style="width: 100px">
            <template #body="{ data }">
              <Button icon="pi pi-pencil" text rounded @click="openEditMatch(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteMatch(data)" />
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <TabPanel value="recurring" header="Recorrentes">
        <div class="header-row">
          <p class="subtitle">Peladas fixas em dias da semana</p>
          <Button label="Nova Agenda" icon="pi pi-plus" @click="openCreateRecurring" />
        </div>

        <div v-for="item in recurring" :key="item.id" class="recurring-card">
          <div class="recurring-header">
            <div>
              <h3>{{ item.fieldName }}</h3>
              <p>{{ formatDays(item.daysOfWeek) }} às {{ item.time }} — R$ {{ item.participationFee.toFixed(2) }}</p>
            </div>
            <div>
              <Button icon="pi pi-pencil" text rounded @click="openEditRecurring(item)" />
              <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteRecurring(item)" />
            </div>
          </div>
          <div class="occurrences">
            <div v-for="occ in item.upcomingOccurrences.slice(0, 8)" :key="occ.date" class="occurrence">
              <span>{{ new Date(occ.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) }}</span>
              <Tag :value="occ.status === 'Cancelled' ? 'Cancelado' : occ.status === 'Open' ? 'Aberta' : 'Agendado'" :severity="occ.status === 'Cancelled' ? 'danger' : 'success'" />
              <Button v-if="occ.status !== 'Cancelled'" icon="pi pi-times" text rounded severity="danger" size="small" v-tooltip="'Cancelar este dia'" @click="cancelOccurrence(item, occ.date)" />
            </div>
          </div>
        </div>
        <p v-if="!recurring.length" class="empty">Nenhuma agenda recorrente cadastrada</p>
      </TabPanel>
    </TabView>

    <Dialog v-model:visible="showMatchDialog" :header="editingMatchId ? 'Editar Partida' : 'Nova Partida'" modal style="width: 500px">
      <div class="form-grid">
        <div class="field"><label>Campo</label><Select v-model="matchForm.fieldId" :options="fields" optionLabel="name" optionValue="id" class="w-full" /></div>
        <div class="field"><label>Data</label><Calendar v-model="matchForm.date" dateFormat="dd/mm/yy" class="w-full" /></div>
        <div class="field"><label>Horário</label><InputText v-model="matchForm.time" placeholder="20:00" class="w-full" /></div>
        <div v-if="editingMatchId" class="field"><label>Status</label><Select v-model="matchForm.status" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full" /></div>
        <div class="field"><label>Máx. Jogadores</label><InputNumber v-model="matchForm.maxPlayers" class="w-full" /></div>
        <div class="field"><label>Árbitro</label><Select v-model="matchForm.refereeId" :options="referees" optionLabel="name" optionValue="id" class="w-full" showClear /></div>
        <div class="field"><label>Goleiro</label><Select v-model="matchForm.goalkeeperId" :options="goalkeepers" optionLabel="name" optionValue="id" class="w-full" showClear /></div>
        <div class="field"><label>Valor</label><InputNumber v-model="matchForm.participationFee" mode="currency" currency="BRL" locale="pt-BR" class="w-full" /></div>
        <div class="field"><label>Observações</label><InputText v-model="matchForm.notes" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="showMatchDialog = false" />
        <Button :label="editingMatchId ? 'Salvar' : 'Criar'" icon="pi pi-check" @click="saveMatch" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showRecurringDialog" :header="editingRecurringId ? 'Editar Agenda' : 'Nova Agenda Recorrente'" modal style="width: 520px">
      <div class="form-grid">
        <div class="field"><label>Campo</label><Select v-model="recurringForm.fieldId" :options="fields" optionLabel="name" optionValue="id" class="w-full" /></div>
        <div class="field"><label>Horário</label><InputText v-model="recurringForm.time" placeholder="20:00" class="w-full" /></div>
        <div class="field"><label>Máx. Jogadores</label><InputNumber v-model="recurringForm.maxPlayers" class="w-full" /></div>
        <div class="field"><label>Valor</label><InputNumber v-model="recurringForm.participationFee" mode="currency" currency="BRL" locale="pt-BR" class="w-full" /></div>
        <div class="field"><label>Árbitro</label><Select v-model="recurringForm.refereeId" :options="referees" optionLabel="name" optionValue="id" class="w-full" showClear /></div>
        <div class="field"><label>Goleiro</label><Select v-model="recurringForm.goalkeeperId" :options="goalkeepers" optionLabel="name" optionValue="id" class="w-full" showClear /></div>
        <div class="field full">
          <label>Dias da semana</label>
          <div class="days-row">
            <Button v-for="d in weekDays" :key="d.value" :label="d.label" size="small"
              :severity="recurringForm.daysOfWeek.includes(d.value) ? 'success' : 'secondary'"
              :outlined="!recurringForm.daysOfWeek.includes(d.value)"
              @click="toggleDay(d.value)" />
          </div>
        </div>
        <div class="field full"><label>Observações</label><InputText v-model="recurringForm.notes" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="showRecurringDialog = false" />
        <Button :label="editingRecurringId ? 'Salvar' : 'Criar'" icon="pi pi-check" @click="saveRecurring" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.subtitle { color: var(--ds-text-muted); margin: 0; }
.form-grid { display: grid; gap: 1rem; }
.field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; }
.field.full { grid-column: 1 / -1; }
.w-full { width: 100%; }
.ml { margin-left: 0.5rem; }
.recurring-card { background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; }
.recurring-header { display: flex; justify-content: space-between; align-items: flex-start; h3 { margin: 0 0 0.25rem; } p { margin: 0; color: var(--ds-text-muted); font-size: 0.875rem; } }
.occurrences { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
.occurrence { display: flex; align-items: center; gap: 0.5rem; background: var(--ds-bg); padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.875rem; }
.days-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.empty { text-align: center; color: var(--ds-text-muted); padding: 2rem; }
</style>
