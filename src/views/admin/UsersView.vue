<script setup lang="ts">
defineOptions({ name: 'UsersAdminView' })

import { computed } from 'vue'
import { usersApi } from '@/services/endpoints'
import { queryCache } from '@/services/queryCache'
import { useCachedQuery } from '@/composables/useCachedQuery'
import type { UserProfile } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import RefreshIndicator from '@/components/RefreshIndicator.vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'

const confirm = useConfirm()
const toast = useToast()

const { data, loading, refreshing, refresh } = useCachedQuery<UserProfile[]>(
  'admin:users',
  async () => {
    const { data: res } = await usersApi.getAll({ page: 1, pageSize: 50 })
    return res.success ? res.data.items : []
  },
  { staleMs: 30_000 }
)

const users = computed(() => data.value ?? [])

function deleteUser(user: UserProfile) {
  confirm.require({
    message: `Remover ${user.name}?`,
    header: 'Confirmar',
    accept: async () => {
      await usersApi.delete(user.id)
      toast.add({ severity: 'success', summary: 'Usuário removido' })
      queryCache.invalidate('admin:users')
      await refresh(false)
    }
  })
}

async function toggleRole(user: UserProfile) {
  const newRole = user.role === 'Admin' ? 'User' : 'Admin'
  await usersApi.updateRole(user.id, newRole)
  toast.add({ severity: 'info', summary: `Papel alterado para ${newRole}` })
  queryCache.invalidate('admin:users')
  await refresh(false)
}
</script>

<template>
  <div class="page-container">
    <RefreshIndicator :visible="refreshing" />
    <h1 class="page-title">Gerenciar Usuários</h1>

    <div v-if="loading" class="loading"><ProgressSpinner /></div>

    <DataTable v-else :value="users" stripedRows paginator :rows="10">
      <Column field="name" header="Nome" />
      <Column field="email" header="Email" />
      <Column field="city" header="Cidade" />
      <Column field="role" header="Papel" />
      <Column header="Ações">
        <template #body="{ data }">
          <Button :icon="data.role === 'Admin' ? 'pi pi-user-minus' : 'pi pi-user-plus'" text rounded @click="toggleRole(data)" v-tooltip="data.role === 'Admin' ? 'Remover Admin' : 'Tornar Admin'" />
          <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteUser(data)" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped lang="scss">
.loading { display: flex; justify-content: center; padding: 3rem; }
</style>
