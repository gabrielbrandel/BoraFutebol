<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notificationsApi } from '@/services/endpoints'
import type { Notification } from '@/types'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

const notifications = ref<Notification[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await notificationsApi.getAll()
    if (data.success) notifications.value = data.data
  } finally { loading.value = false }
})

async function markRead(id: string) {
  await notificationsApi.markRead(id)
  const n = notifications.value.find(n => n.id === id)
  if (n) n.isRead = true
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
