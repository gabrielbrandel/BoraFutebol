<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/services/endpoints'
import type { Dashboard } from '@/types'
import { Bar, Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'
import ProgressSpinner from 'primevue/progressspinner'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

const dashboard = ref<Dashboard | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await dashboardApi.get()
    if (data.success) dashboard.value = data.data
  } finally {
    loading.value = false
  }
})

const revenueChartData = () => ({
  labels: dashboard.value?.revenueChart.map(c => c.label) || [],
  datasets: [{ label: 'Receita (R$)', data: dashboard.value?.revenueChart.map(c => c.value) || [], backgroundColor: '#16a34a' }]
})

const matchesChartData = () => ({
  labels: dashboard.value?.matchesChart.map(c => c.label) || [],
  datasets: [{ label: 'Jogos', data: dashboard.value?.matchesChart.map(c => c.value) || [], borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)', fill: true, tension: 0.4 }]
})
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Dashboard</h1>
    <p class="page-subtitle">Visão geral do sistema</p>

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <template v-else-if="dashboard">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">R$ {{ dashboard.totalRevenue.toFixed(2) }}</div>
          <div class="stat-label">Receita Total</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ dashboard.totalMatchesPlayed }}</div>
          <div class="stat-label">Jogos Realizados</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ dashboard.attendanceRate.toFixed(0) }}%</div>
          <div class="stat-label">Taxa de Comparecimento</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ dashboard.upcomingMatches.length }}</div>
          <div class="stat-label">Próximas Partidas</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>Receita Mensal</h3>
          <Bar :data="revenueChartData()" :options="{ responsive: true, plugins: { legend: { display: false } } }" />
        </div>
        <div class="chart-card">
          <h3>Jogos por Mês</h3>
          <Line :data="matchesChartData()" :options="{ responsive: true, plugins: { legend: { display: false } } }" />
        </div>
      </div>

      <div class="tables-grid">
        <div class="table-card">
          <h3>Campos Mais Utilizados</h3>
          <div v-for="field in dashboard.topFields" :key="field.id" class="table-row">
            <span>{{ field.name }}</span>
            <span>{{ field.matchCount }} jogos</span>
            <span class="stars"><i class="pi pi-star-fill" /> {{ field.averageRating.toFixed(1) }}</span>
          </div>
        </div>
        <div class="table-card">
          <h3>Jogadores Mais Presentes</h3>
          <div v-for="player in dashboard.topPlayers" :key="player.id" class="table-row">
            <span>{{ player.name }}</span>
            <span>{{ player.attendanceCount }} presenças</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.chart-card { background: var(--ds-surface); padding: 1.5rem; border-radius: var(--ds-radius); border: 1px solid var(--ds-border); h3 { margin-bottom: 1rem; } }
.tables-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
.table-card { background: var(--ds-surface); padding: 1.5rem; border-radius: var(--ds-radius); border: 1px solid var(--ds-border); h3 { margin-bottom: 1rem; } }
.table-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--ds-border); &:last-child { border: none; } }
.stars { color: #fbbf24; }
.loading { text-align: center; padding: 4rem; }
</style>
