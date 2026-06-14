<script setup lang="ts">
defineOptions({ name: 'StaffAdminView' })

import { ref, computed } from 'vue'
import { staffApi, refereesApi, goalkeepersApi } from '@/services/endpoints'
import { queryCache } from '@/services/queryCache'
import { useCachedQuery } from '@/composables/useCachedQuery'
import type { Referee, Goalkeeper } from '@/types'
import { whatsappLink, formatPhone } from '@/utils/whatsapp'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'
import { useToast } from 'primevue/usetoast'

interface StaffRow {
  id: string
  name: string
  whatsApp: string
  position: string
}

const toast = useToast()

const { data, loading, refreshing, refresh } = useCachedQuery<StaffRow[]>(
  'admin:staff',
  async () => {
    const [r, g] = await Promise.all([
      refereesApi.getAll({ page: 1, pageSize: 50 }),
      goalkeepersApi.getAll({ page: 1, pageSize: 50 })
    ])

    const rows: StaffRow[] = []
    if (r.data.success) {
      rows.push(...r.data.data.items.map((item: Referee) => ({
        id: item.id,
        name: item.name,
        whatsApp: item.whatsApp,
        position: 'Juiz'
      })))
    }
    if (g.data.success) {
      rows.push(...g.data.data.items.map((item: Goalkeeper) => ({
        id: item.id,
        name: item.name,
        whatsApp: item.whatsApp,
        position: 'Goleiro'
      })))
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name))
  },
  { staleMs: 30_000 }
)

const staff = computed(() => data.value ?? [])

const form = ref({ name: '', whatsApp: '', position: 'referee' })

const positionOptions = [
  { label: 'Juiz', value: 'referee' },
  { label: 'Goleiro', value: 'goalkeeper' }
]

const positionLabel = computed(() =>
  positionOptions.find(o => o.value === form.value.position)?.label ?? 'Posição'
)

async function save() {
  if (!form.value.name.trim() || !form.value.whatsApp.trim()) {
    toast.add({ severity: 'warn', summary: 'Preencha nome e WhatsApp' })
    return
  }
  try {
    await staffApi.quickStaff(form.value)
    toast.add({ severity: 'success', summary: `${positionLabel.value} cadastrado!` })
    form.value = { name: '', whatsApp: '', position: form.value.position }
    queryCache.invalidate('admin:staff')
    queryCache.invalidate('admin:matches')
    await refresh(false)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.add({ severity: 'error', summary: 'Erro', detail: err.response?.data?.message })
  }
}
</script>

<template>
  <div class="page-container">
    <RefreshIndicator :visible="refreshing" />
    <h1 class="page-title">Juízes & Goleiros</h1>
    <p class="page-subtitle">Cadastro rápido — nome, WhatsApp e posição</p>

    <div class="quick-form">
      <InputText v-model="form.name" placeholder="Nome" class="field-input" />
      <InputText v-model="form.whatsApp" placeholder="WhatsApp" class="field-input" />
      <Select
        v-model="form.position"
        :options="positionOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Posição"
        class="field-input"
      />
      <Button label="Salvar" icon="pi pi-plus" class="save-btn" @click="save" />
    </div>

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <DataTable v-else :value="staff" stripedRows paginator :rows="10" class="mt">
      <Column field="name" header="Nome" />
      <Column header="WhatsApp">
        <template #body="{ data }">
          <a :href="whatsappLink(data.whatsApp)" target="_blank" class="wa-link">
            <i class="pi pi-whatsapp" /> {{ formatPhone(data.whatsApp) }}
          </a>
        </template>
      </Column>
      <Column field="position" header="Posição" />
    </DataTable>
  </div>
</template>

<style scoped lang="scss">
.quick-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.field-input { flex: 1 1 140px; min-width: 120px; }

.save-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.mt { margin-top: 1rem; }

.loading { display: flex; justify-content: center; padding: 3rem; }

.wa-link {
  color: #25d366;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  text-decoration: none;
}
</style>
