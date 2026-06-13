<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { contactsApi } from '@/services/endpoints'
import type { Contact } from '@/types'
import { POSITION_LABELS } from '@/types'
import { whatsappLink, formatPhone } from '@/utils/whatsapp'
import { useDebouncedWatch } from '@/composables/useDebouncedWatch'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import ProgressSpinner from 'primevue/progressspinner'
import Avatar from 'primevue/avatar'
import FilterChips from '@/components/FilterChips.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import type { FilterOption } from '@/components/FilterSheet.vue'

const router = useRouter()
const auth = useAuthStore()
const contacts = ref<Contact[]>([])
const cities = ref<string[]>([])
const loading = ref(true)
const search = ref('')
const city = ref<string | null>(null)
const type = ref('players')
const showCitySheet = ref(false)

const typeOptions = [
  { label: 'Jogadores', value: 'players' },
  { label: 'Juízes', value: 'referees' },
  { label: 'Goleiros', value: 'goalkeepers' }
]

const cityOptions = computed<FilterOption[]>(() => [
  { label: 'Todas as cidades', value: null },
  ...cities.value.map(c => ({ label: c, value: c }))
])

const filterChips = computed(() => [
  { id: 'city', label: city.value || 'Cidade', value: city.value, icon: 'pi pi-map-marker' }
])

async function loadCities() {
  try {
    const { data } = await contactsApi.getCities(type.value)
    if (data.success) {
      cities.value = data.data
      if (city.value && !cities.value.includes(city.value)) city.value = null
    }
  } catch {
    cities.value = []
  }
}

async function load() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: '/contacts' } })
    return
  }
  loading.value = true
  try {
    const { data } = await contactsApi.getAll({
      type: type.value,
      page: 1,
      pageSize: 50,
      search: search.value || undefined,
      city: city.value || undefined
    })
    if (data.success) contacts.value = data.data.items
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCities()
  await load()
})

watch(type, async () => {
  city.value = null
  await loadCities()
  await load()
})

useDebouncedWatch([search, city], load)

function openWhatsApp(contact: Contact) {
  const msg = `Olá ${contact.name}, vi seu contato no DateSoccer!`
  window.open(whatsappLink(contact.whatsApp, msg), '_blank')
}

function typeLabel(t: string) {
  return ({ Player: 'Jogador', Referee: 'Juíze', Goalkeeper: 'Goleiro' } as Record<string, string>)[t] || t
}

function detailLabel(c: Contact) {
  if (c.type === 'Player') return POSITION_LABELS[c.detail || ''] || c.detail
  return c.detail
}
</script>

<template>
  <div class="page-container contacts-page">
    <h1 class="page-title">Contatos</h1>
    <p class="page-subtitle">Toque no WhatsApp para falar</p>

    <SelectButton v-model="type" :options="typeOptions" optionLabel="label" optionValue="value" class="type-filter" />

    <div class="search-inline">
      <i class="pi pi-search" />
      <InputText v-model="search" placeholder="Nome ou WhatsApp..." />
    </div>

    <FilterChips v-if="cities.length" :chips="filterChips" @click="showCitySheet = true" @clear="city = null" />

    <FilterSheet
      v-model:visible="showCitySheet"
      title="Escolher cidade"
      :options="cityOptions"
      :model-value="city"
      @update:model-value="city = $event"
    />

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <div v-else-if="contacts.length" class="contact-list">
      <div v-for="c in contacts" :key="c.id + c.type" class="contact-card">
        <Avatar :label="c.name.charAt(0)" shape="circle" size="large" class="avatar" />
        <div class="info">
          <div class="name-row">
            <strong>{{ c.name }}</strong>
            <span class="badge">{{ typeLabel(c.type) }}</span>
          </div>
          <span class="meta">{{ c.city }}{{ c.state ? `/${c.state}` : '' }}</span>
          <span v-if="detailLabel(c)" class="meta">{{ detailLabel(c) }}</span>
          <a class="whatsapp-row" :href="whatsappLink(c.whatsApp)" target="_blank" rel="noopener" @click.stop>
            <i class="pi pi-whatsapp" />
            {{ formatPhone(c.whatsApp) }}
          </a>
        </div>
        <Button icon="pi pi-whatsapp" severity="success" rounded aria-label="WhatsApp" @click="openWhatsApp(c)" />
      </div>
    </div>

    <div v-else class="empty">
      <i class="pi pi-users" />
      <p>Nenhum contato encontrado{{ search ? ` para "${search}"` : '' }}</p>
      <small v-if="search">Tente buscar em Jogadores ou Juízes</small>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contacts-page { padding-bottom: 1rem; }
.type-filter {
  margin-bottom: 0.75rem; width: 100%;
  :deep(.p-selectbutton) { display: flex; width: 100%; button { flex: 1; font-size: 0.8rem; } }
}
.search-inline {
  display: flex; align-items: center; gap: 0.5rem;
  background: var(--ds-surface); border: 1px solid var(--ds-border);
  border-radius: 999px; padding: 0 1rem; margin-bottom: 0.75rem;
  i { color: var(--ds-text-muted); font-size: 0.85rem; }
  :deep(.p-inputtext) { border: none; background: transparent; box-shadow: none; width: 100%; padding: 0.65rem 0; }
}
.contact-list { display: flex; flex-direction: column; gap: 0.75rem; }
.contact-card {
  display: flex; align-items: center; gap: 0.75rem;
  background: var(--ds-surface); border: 1px solid var(--ds-border);
  border-radius: 12px; padding: 0.875rem 1rem;
}
.avatar { flex-shrink: 0; background: var(--ds-primary) !important; color: white !important; }
.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.badge { font-size: 0.7rem; background: var(--ds-bg); padding: 0.15rem 0.5rem; border-radius: 999px; color: var(--ds-text-muted); }
.meta { font-size: 0.8rem; color: var(--ds-text-muted); }
.whatsapp-row {
  display: inline-flex; align-items: center; gap: 0.35rem;
  color: #25d366; font-weight: 600; font-size: 0.95rem; margin-top: 0.25rem;
  i { font-size: 1.1rem; }
}
.loading, .empty { text-align: center; padding: 3rem; color: var(--ds-text-muted); i { font-size: 3rem; display: block; margin-bottom: 1rem; } small { display: block; margin-top: 0.5rem; font-size: 0.8rem; } }
@media (max-width: 640px) { .page-subtitle { display: none; } }
</style>
