<script setup lang="ts">
defineOptions({ name: 'NotificationsView' })

import { computed } from 'vue'
import { notificationsApi } from '@/services/endpoints'
import type { Notification } from '@/types'
import { useCachedQuery } from '@/composables/useCachedQuery'
import { queryCache } from '@/services/queryCache'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'

const { data, loading, refreshing } = useCachedQuery<Notification[]>(
  'notifications:list',
  async () => {
    const { data: res } = await notificationsApi.getAll()
    return res.success ? res.data : []
  },
  { staleMs: 15_000 }
)

const notifications = computed(() => data.value ?? [])

async function markRead(id: string) {
  await notificationsApi.markRead(id)
  const n = notifications.value.find(item => item.id === id)
  if (n) n.isRead = true
  queryCache.invalidate('notifications')
}

const typeIcons: Record<string, string> = {
  MatchReminder: 'pi pi-calendar',
  ScheduleChange: 'pi pi-clock',
  Convocation: 'pi pi-megaphone',
  Cancellation: 'pi pi-times-circle',
  WaitlistPromotion: 'pi pi-arrow-up',
  PaymentReminder: 'pi pi-wallet'
}
</script>

<template>
  <div class="page-container">
    <RefreshIndicator :visible="refreshing" />
    <h1 class="page-title">Notificações</h1>

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <div v-else-if="notifications.length" class="notif-list">
      <div v-for="notif in notifications" :key="notif.id" :class="['notif-item', { unread: !notif.isRead }]">
        <i :class="typeIcons[notif.type] || 'pi pi-bell'" />
        <div class="notif-content">
          <strong>{{ notif.title }}</strong>
          <p>{{ notif.message }}</p>
          <small>{{ new Date(notif.createdAt).toLocaleString('pt-BR') }}</small>
        </div>
        <Button v-if="!notif.isRead" icon="pi pi-check" text rounded @click="markRead(notif.id)" />
      </div>
    </div>

    <div v-else class="empty">
      <i class="pi pi-bell-slash" />
      <p>Nenhuma notificação</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notif-list { display: flex; flex-direction: column; gap: 0.75rem; }
.notif-item {
  display: flex; align-items: flex-start; gap: 1rem; padding: 1rem;
  background: var(--ds-surface); border-radius: var(--ds-radius); border: 1px solid var(--ds-border);
  &.unread { border-left: 4px solid var(--ds-primary); }
  i { font-size: 1.5rem; color: var(--ds-primary); margin-top: 0.25rem; }
}
.notif-content { flex: 1; p { color: var(--ds-text-muted); margin: 0.25rem 0; } small { color: var(--ds-text-muted); } }
.loading, .empty { text-align: center; padding: 3rem; color: var(--ds-text-muted); i { font-size: 3rem; display: block; margin-bottom: 1rem; } }
</style>