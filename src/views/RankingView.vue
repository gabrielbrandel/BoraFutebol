<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardApi } from '@/services/endpoints'
import type { PlayerRanking } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'
import ProgressSpinner from 'primevue/progressspinner'

const router = useRouter()
const ranking = ref<PlayerRanking[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await dashboardApi.getRanking()
    if (data.success) ranking.value = data.data
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Ranking de Jogadores</h1>
    <p class="page-subtitle">Os melhores da comunidade</p>

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <DataTable v-else :value="ranking" stripedRows class="ranking-table" @row-click="(e: { data: PlayerRanking }) => router.push(`/players/${e.data.id}`)">
      <Column field="rank" header="#" style="width: 60px">
        <template #body="{ data }">
          <span :class="['rank', { gold: data.rank === 1, silver: data.rank === 2, bronze: data.rank === 3 }]">{{ data.rank }}</span>
        </template>
      </Column>
      <Column header="Jogador">
        <template #body="{ data }">
          <div class="player-cell">
            <Avatar :label="data.name.charAt(0)" shape="circle" />
            <span>{{ data.name }}</span>
          </div>
        </template>
      </Column>
      <Column field="matchesPlayed" header="Jogos" />
      <Column field="goals" header="Gols" />
      <Column field="assists" header="Assist." />
      <Column field="mvpCount" header="MVP" />
      <Column field="averageRating" header="Nota">
        <template #body="{ data }">
          <span class="stars"><i class="pi pi-star-fill" /> {{ data.averageRating.toFixed(1) }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped lang="scss">
.ranking-table { cursor: pointer; }
.player-cell { display: flex; align-items: center; gap: 0.75rem; }
.rank { font-weight: 800; font-size: 1.25rem; &.gold { color: #fbbf24; } &.silver { color: #94a3b8; } &.bronze { color: #d97706; } }
.stars { color: #fbbf24; }
.loading { text-align: center; padding: 4rem; }
</style>
