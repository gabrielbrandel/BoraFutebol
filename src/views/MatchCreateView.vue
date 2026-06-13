<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { matchesApi, fieldsApi, refereesApi, goalkeepersApi } from '@/services/endpoints'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Calendar from 'primevue/calendar'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const toast = useToast()

const fields = ref<{ id: string; name: string }[]>([])
const referees = ref<{ id: string; name: string }[]>([])
const goalkeepers = ref<{ id: string; name: string }[]>([])

const form = ref({
  fieldId: '', date: null as Date | null, time: '20:00',
  maxPlayers: 14, refereeId: '', goalkeeperId: '', participationFee: 35, notes: ''
})

onMounted(async () => {
  if (!settings.loaded) await settings.fetchSettings()
  if (!settings.canCreateMatches(auth.isAdmin)) {
    toast.add({ severity: 'warn', summary: 'Criação de partidas não permitida' })
    router.push('/matches')
    return
  }
  const [f, r, g] = await Promise.all([
    fieldsApi.getAll({ page: 1, pageSize: 50 }),
    refereesApi.getAll({ page: 1, pageSize: 50 }),
    goalkeepersApi.getAll({ page: 1, pageSize: 50 })
  ])
  if (f.data.success) fields.value = f.data.data.items.map(i => ({ id: i.id, name: i.name }))
  if (r.data.success) referees.value = r.data.data.items
  if (g.data.success) goalkeepers.value = g.data.data.items
})

async function submit() {
  try {
    const { data } = await matchesApi.create({
      fieldId: form.value.fieldId,
      date: form.value.date?.toISOString(),
      time: form.value.time,
      maxPlayers: form.value.maxPlayers,
      refereeId: form.value.refereeId || null,
      goalkeeperId: form.value.goalkeeperId || null,
      participationFee: form.value.participationFee,
      notes: form.value.notes || null
    })
    if (data.success) {
      toast.add({ severity: 'success', summary: 'Pelada criada!' })
      router.push(`/matches/${data.data.id}`)
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.add({ severity: 'error', summary: 'Erro', detail: err.response?.data?.message })
  }
}
</script>

<template>
  <div class="page-container narrow">
    <h1 class="page-title">Organizar uma pelada</h1>
    <p class="page-subtitle">Crie um jogo e convide jogadores da comunidade</p>

    <div class="form-card">
      <div class="form-grid">
        <div class="field"><label>Campo</label><Select v-model="form.fieldId" :options="fields" optionLabel="name" optionValue="id" class="w-full" placeholder="Selecione o campo" /></div>
        <div class="field"><label>Data</label><Calendar v-model="form.date" dateFormat="dd/mm/yy" class="w-full" :minDate="new Date()" /></div>
        <div class="field"><label>Horário</label><InputText v-model="form.time" placeholder="20:00" class="w-full" /></div>
        <div class="field"><label>Máx. jogadores</label><InputNumber v-model="form.maxPlayers" class="w-full" /></div>
        <div class="field"><label>Valor por jogador</label><InputNumber v-model="form.participationFee" mode="currency" currency="BRL" locale="pt-BR" class="w-full" /></div>
        <div class="field"><label>Árbitro (opcional)</label><Select v-model="form.refereeId" :options="referees" optionLabel="name" optionValue="id" class="w-full" showClear /></div>
        <div class="field"><label>Goleiro (opcional)</label><Select v-model="form.goalkeeperId" :options="goalkeepers" optionLabel="name" optionValue="id" class="w-full" showClear /></div>
        <div class="field full"><label>Observações</label><InputText v-model="form.notes" class="w-full" placeholder="Ex: levar colete, nível intermediário..." /></div>
      </div>
      <div class="actions">
        <Button label="Cancelar" text @click="router.push('/matches')" />
        <Button label="Criar pelada" icon="pi pi-check" @click="submit" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.narrow { max-width: 560px; }
.form-card { background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 12px; padding: 1.5rem; }
.form-grid { display: grid; gap: 1rem; }
.field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; }
.field.full { grid-column: 1 / -1; }
.w-full { width: 100%; }
.actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
</style>
