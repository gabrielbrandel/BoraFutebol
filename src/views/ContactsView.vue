<script setup lang="ts">
defineOptions({ name: 'ContactsView' })

import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { contactsApi } from '@/services/endpoints'
import type { Contact } from '@/types'
import { POSITION_LABELS } from '@/types'
import { whatsappLink, formatPhone } from '@/utils/whatsapp'
import { useDebouncedWatch } from '@/composables/useDebouncedWatch'
import { useCachedQuery } from '@/composables/useCachedQuery'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'
import Avatar from 'primevue/avatar'
import FilterChips from '@/components/FilterChips.vue'
import FilterSheet from '@/components/FilterSheet.vue'
import type { FilterOption } from '@/components/FilterSheet.vue'

const router = useRouter()
const auth = useAuthStore()
const cities = ref<string[]>([])
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

const queryKey = computed(() => JSON.stringify({ type: type.value, search: search.value, city: city.value }))

const { data, loading, refreshing, refresh } = useCachedQuery<Contact[]>(
  () => `contacts:${queryKey.value}`,
  async () => {
    const { data: res } = await contactsApi.getAll({
      type: type.value,
      page: 1,
      pageSize: 50,
      search: search.value || undefined,
      city: city.value || undefined
    })
    return res.success ? res.data.items : []
  },
  { enabled: () => auth.isAuthenticated }
)

const contacts = computed(() => data.value ?? [])

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

onMounted(async () => {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: '/contacts' } })
    return
  }
  await loadCities()
})

watch(type, async () => {
  city.value = null
  await loadCities()
})

useDebouncedWatch([search, city], () => refresh(false))

function openWhatsApp(contact: Contact) {
  const msg = `Olá ${contact.name}, vi seu contato no DateSoccer!`
  window.open(whatsappLink(contact.whatsApp, msg), '_blank')
}

function contactTypeLabel(value: string) {
  return ({ Player: 'Jogador', Referee: 'Juiz', Goalkeeper: 'Goleiro' } as Record<string, string>)[value] || value
}

function contactDetail(contact: Contact) {
  if (contact.type === 'Player') return POSITION_LABELS[contact.detail || ''] || contact.detail
  return contact.detail
}
</script>

<template>
  <div class="page-container contacts-page">
    <RefreshIndicator :visible="refreshing" />
    <h1 class="page-title">Contatos</h1>
    <p class="page-subtitle">Toque no WhatsApp para falar</p>

    <SelectButton v-model="type" :options="typeOptions" option-label="label" option-value="value" class="type-filter" />

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
      <div v-for="contact in contacts" :key="contact.id + contact.type" class="contact-card">
        <Avatar :label="contact.name.charAt(0)" shape="circle" size="large" class="avatar" />
        <div class="info">
          <div class="name-row">
            <strong>{{ contact.name }}</strong>
            <span class="badge">{{ contactTypeLabel(contact.type) }}</span>
          </div>
          <span class="meta">{{ contact.city }}{{ contact.state ? `/${contact.state}` : '' }}</span>
          <span v-if="contactDetail(contact)" class="meta">{{ contactDetail(contact) }}</span>
          <a
            class="whatsapp-row"
            :href="whatsappLink(contact.whatsApp)"
            target="_blank"
            rel="noopener"
            @click.stop
          >
            <i class="pi pi-whatsapp" />
            {{ formatPhone(contact.whatsApp) }}
          </a>
        </div>
        <Button icon="pi pi-whatsapp" severity="success" rounded aria-label="WhatsApp" @click="openWhatsApp(contact)" />
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
  width: 100%;
  margin-bottom: 0.75rem;
  :deep(.p-selectbutton) { width: 100%; display: flex; button { flex: 1; font-size: 0.8rem; } }
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
  padding: 0.875rem 1rem; background: var(--ds-surface);
  border: 1px solid var(--ds-border); border-radius: 12px;
}
.avatar { flex-shrink: 0; background: var(--ds-primary) !important; color: white !important; }
.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 999px; background: var(--ds-bg); color: var(--ds-text-muted); }
.meta { font-size: 0.8rem; color: var(--ds-text-muted); }
.whatsapp-row {
  display: inline-flex; align-items: center; gap: 0.35rem;
  margin-top: 0.25rem; color: #25d366; font-weight: 600; font-size: 0.95rem;
  i { font-size: 1.1rem; }
}
.loading, .empty { text-align: center; padding: 3rem; color: var(--ds-text-muted); }
.loading i, .empty i { font-size: 3rem; display: block; margin-bottom: 1rem; }
.empty small { display: block; margin-top: 0.5rem; font-size: 0.8rem; }
@media (max-width: 640px) { .page-subtitle { display: none; } }
</style>
