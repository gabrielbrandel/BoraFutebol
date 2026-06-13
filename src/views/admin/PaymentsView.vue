<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { paymentsApi } from '@/services/endpoints'
import type { Payment } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const payments = ref<Payment[]>([])
const period = ref('monthly')
const report = ref<Record<string, unknown> | null>(null)

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

onMounted(load)
watch(period, load)

async function load() {
  const [p, r] = await Promise.all([
    paymentsApi.getAll({ page: 1, pageSize: 50 }),
    paymentsApi.getReport(period.value)
  ])
  if (p.data.success) payments.value = p.data.data.items
  if (r.data.success) report.value = r.data.data
}

async function markPaid(payment: Payment, method: string) {
  await paymentsApi.update(payment.id, { status: 'Paid', method })
  toast.add({ severity: 'success', summary: 'Pagamento confirmado' })
  await load()
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Pagamentos</h1>

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
  </div>
</template>

<style scoped lang="scss">
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
</style>
