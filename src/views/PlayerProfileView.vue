<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { dashboardApi } from '@/services/endpoints'
import Avatar from 'primevue/avatar'
import ProgressSpinner from 'primevue/progressspinner'
import { POSITION_LABELS } from '@/types'

const route = useRoute()
const profile = ref<Record<string, unknown> | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await dashboardApi.getPlayerProfile(route.params.id as string)
    if (data.success) profile.value = data.data
  } finally { loading.value = false }
})

const medalIcons: Record<string, string> = {
  TenMatches: 'pi pi-flag',
  FiftyMatches: 'pi pi-star',
  HundredMatches: 'pi pi-crown',
  TopScorer: 'pi pi-bolt',
  Mvp: 'pi pi-trophy',
  MostPresent: 'pi pi-check-circle',
  Quality: 'pi pi-heart'
}
</script>

<template>
  <div class="page-container">
    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <template v-else-if="profile">
      <div class="profile-header">
        <Avatar :label="(profile.name as string).charAt(0)" size="xlarge" shape="circle" />
        <div>
          <h1 class="page-title">{{ profile.name }}</h1>
          <p class="page-subtitle">{{ profile.city }}/{{ profile.state }} — {{ POSITION_LABELS[profile.primaryPosition as string] }}</p>
          <div class="stars">
            <i v-for="n in (profile.technicalLevel as number)" :key="n" class="pi pi-star-fill" />
          </div>
        </div>
      </div>

      <div class="stats-grid" v-if="profile.stats">
        <div class="stat-card"><div class="stat-value">{{ (profile.stats as Record<string, number>).matchesPlayed }}</div><div class="stat-label">Jogos</div></div>
        <div class="stat-card"><div class="stat-value">{{ (profile.stats as Record<string, number>).goals }}</div><div class="stat-label">Gols</div></div>
        <div class="stat-card"><div class="stat-value">{{ (profile.stats as Record<string, number>).assists }}</div><div class="stat-label">Assistências</div></div>
        <div class="stat-card"><div class="stat-value">{{ (profile.stats as Record<string, number>).mvpCount }}</div><div class="stat-label">MVPs</div></div>
        <div class="stat-card"><div class="stat-value">{{ (profile.stats as Record<string, number>).wins }}</div><div class="stat-label">Vitórias</div></div>
      </div>

      <section v-if="(profile.medals as unknown[])?.length" class="medals-section">
        <h2>Medalhas</h2>
        <div class="medal-grid">
          <div v-for="medal in (profile.medals as { type: string; earnedAt: string }[])" :key="medal.type" class="medal-item">
            <i :class="medalIcons[medal.type] || 'pi pi-star'" />
            <span>{{ medal.type }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.profile-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.medals-section h2 { margin-bottom: 1rem; }
.stars { color: #fbbf24; }
.loading { text-align: center; padding: 4rem; }
</style>
