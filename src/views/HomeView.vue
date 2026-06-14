<script setup lang="ts">
defineOptions({ name: 'HomeView' })

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { matchesApi } from '@/services/endpoints'
import type { Match } from '@/types'
import { MATCH_STATUS_LABELS } from '@/types'
import { useCachedQuery } from '@/composables/useCachedQuery'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'

const router = useRouter()

const { data, loading, refreshing } = useCachedQuery<Match[]>(
  'home:upcoming-matches',
  async () => {
    const { data: res } = await matchesApi.getAll({ page: 1, pageSize: 6, status: 'Open' })
    return res.success ? res.data.items : []
  }
)

const matches = computed(() => data.value ?? [])

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}
</script>

<template>
  <div>
    <RefreshIndicator :visible="refreshing" />
    <section class="hero">
      <div class="hero-content">
        <h1>Organize suas <span>peladas</span></h1>
        <p>Encontre jogos de futebol society, campo e futsal perto de você. Confirme presença, forme times e divirta-se!</p>
        <div class="hero-actions">
          <Button label="Ver Peladas" icon="pi pi-search" size="large" class="hero-btn-primary" @click="router.push('/matches')" />
          <Button label="Explorar Mapa" icon="pi pi-map" size="large" class="hero-btn-map" @click="router.push('/map')" />
        </div>
      </div>
    </section>

    <div class="page-container">
      <section class="features">
        <div class="feature-card">
          <i class="pi pi-users" />
          <h3>Formação de Times</h3>
          <p>Algoritmo inteligente que balanceia jogadores por posição e nível técnico</p>
        </div>
        <div class="feature-card">
          <i class="pi pi-map-marker" />
          <h3>Campos Próximos</h3>
          <p>Encontre campos com distância, rotas e filtros por raio</p>
        </div>
        <div class="feature-card">
          <i class="pi pi-trophy" />
          <h3>Ranking & MVP</h3>
          <p>Estatísticas, medalhas e votação do melhor jogador</p>
        </div>
        <div class="feature-card">
          <i class="pi pi-wallet" />
          <h3>Controle Financeiro</h3>
          <p>Pagamentos PIX, dinheiro e cartão com relatórios</p>
        </div>
      </section>

      <section class="upcoming">
        <h2 class="page-title">Próximas Peladas</h2>
        <p class="page-subtitle">Jogos abertos para inscrição</p>

        <div v-if="loading" class="loading"><ProgressSpinner /></div>

        <div v-else-if="matches.length" class="card-grid">
          <div v-for="match in matches" :key="match.id" class="match-card" @click="router.push(`/matches/${match.id}`)">
            <div class="match-card-image">
              <img v-if="match.fieldMainPhotoUrl" :src="match.fieldMainPhotoUrl" :alt="match.fieldName" class="field-photo" />
              <i v-else class="pi pi-flag" />
            </div>
            <div class="match-card-body">
              <h3 class="match-card-title">{{ match.fieldName }}</h3>
              <div class="match-card-meta">
                <span><i class="pi pi-calendar" /> {{ formatDate(match.date) }} às {{ match.time }}</span>
                <span><i class="pi pi-users" /> {{ match.confirmedCount }}/{{ match.maxPlayers }}</span>
              </div>
              <div class="match-card-footer">
                <span class="price-tag">R$ {{ match.participationFee.toFixed(2) }}</span>
                <span class="status-badge open">{{ MATCH_STATUS_LABELS[match.status] }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty">
          <i class="pi pi-calendar-times" />
          <p>Nenhuma pelada disponível no momento</p>
          <Button label="Ver todas" @click="router.push('/matches')" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.hero {
  background: linear-gradient(135deg, #16a34a 0%, #0ea5e9 100%);
  color: white;
  padding: 4rem 2rem;
  text-align: center;

  h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    margin-bottom: 1rem;
    span { color: #fef08a; }
  }

  p {
    font-size: 1.125rem;
    max-width: 600px;
    margin: 0 auto 2rem;
    opacity: 0.9;
  }
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

:deep(.hero-btn-primary) {
  background: white !important;
  color: #15803d !important;
  border: 2px solid white !important;
  font-weight: 700;
}

:deep(.hero-btn-map) {
  background: rgb(0 0 0 / 0.25) !important;
  color: white !important;
  border: 2px solid white !important;
  font-weight: 700;
  backdrop-filter: blur(4px);

  &:hover {
    background: rgb(255 255 255 / 0.15) !important;
    color: white !important;
  }
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin: -3rem auto 3rem;
  position: relative;
  z-index: 1;
  padding: 0 1.5rem;
  max-width: 1280px;
}

.feature-card {
  background: var(--ds-surface);
  padding: 1.5rem;
  border-radius: var(--ds-radius);
  box-shadow: var(--ds-shadow);
  text-align: center;
  border: 1px solid var(--ds-border);

  i { font-size: 2rem; color: var(--ds-primary); margin-bottom: 0.75rem; }
  h3 { margin-bottom: 0.5rem; }
  p { color: var(--ds-text-muted); font-size: 0.875rem; }
}

.loading, .empty {
  text-align: center;
  padding: 3rem;
  color: var(--ds-text-muted);

  i { font-size: 3rem; margin-bottom: 1rem; display: block; }
}
</style>