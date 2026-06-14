<script setup lang="ts">
defineOptions({ name: 'PaymentsAdminView' })

import { ref, computed } from 'vue'
import { paymentsApi } from '@/services/endpoints'
import { queryCache } from '@/services/queryCache'
import { useCachedQuery } from '@/composables/useCachedQuery'
import type { Payment } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'
import { useToast } from 'primevue/usetoast'

interface PaymentsData {
  payments: Payment[]
  report: Record<string, unknown> | null
}

const toast = useToast()
const period = ref('monthly')

const { data, loading, refreshing, refresh } = useCachedQuery<PaymentsData>(
  () => `admin:payments:${period.value}`,
  async () => {
    const [p, r] = await Promise.all([
      paymentsApi.getAll({ page: 1, pageSize: 50 }),
      paymentsApi.getReport(period.value)
    ])
    return {
      payments: p.data.success ? p.data.data.items : [],
      report: r.data.success ? r.data.data : null
    }
  },
  { staleMs: 20_000 }
)

const payments = computed(() => data.value?.payments ?? [])
const report = computed(() => data.value?.report ?? null)

const periodOptions = [
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' }
]

const statusOptions = [
  { label: 'PIX', value: 'Pix' },
  { label: 'Dinheiro', value: 'Cash' },
  { label: 'Cartão', value: 'Card' }
]

async function markPaid(payment: Payment, method: string) {
  await paymentsApi.update(payment.id, { status: 'Paid', method })
  toast.add({ severity: 'success', summary: 'Pagamento confirmado' })
  queryCache.invalidate('admin:payments')
  await refresh(false)
}
</script>

<template>
  <div class="page-container">
    <RefreshIndicator :visible="refreshing" />
    <h1 class="page-title">Pagamentos</h1>

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <template v-else>
      <div v-if="report" class="stats-grid">
        <div class="stat-card"><div class="stat-value">R$ {{ (report.totalRevenue as number)?.toFixed(2) }}</div><div class="stat-label">Receita</div></div>
        <div class="stat-card"><div class="stat-value">R$ {{ (report.pendingAmount as number)?.toFixed(2) }}</div><div class="stat-label">Pendente</div></div>
        <div class="stat-card"><div class="stat-value">{{ report.totalPayments }}</div><div class="stat-label">Total Pagamentos</div></div>
      </div>

      <div class="filters-bar">
        <Select v-model="period" :options="periodOptions" optionLabel="label" optionValue="value" />
      </div>

      <DataTable :value="payments" stripedRows paginator :rows="10">
        <Column field="userName" header="Jogador" />
        <Column field="matchInfo" header="Partida" />
        <Column field="amount" header="Valor">
          <template #body="{ data }">R$ {{ data.amount.toFixed(2) }}</template>
        </Column>
        <Column field="status" header="Status" />
        <Column field="method" header="Método" />
        <Column header="Ações">
          <template #body="{ data }">
            <Select v-if="data.status === 'Pending'" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="Confirmar" @update:model-value="(v: string) => markPaid(data, v)" />
          </template>
        </Column>
      </DataTable>
    </template>
  </div>
</template>

<style scoped lang="scss">
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.loading { display: flex; justify-content: center; padding: 3rem; }
</style>
