<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usersApi } from '@/services/endpoints'
import type { UserProfile } from '@/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'

const confirm = useConfirm()
const toast = useToast()
const users = ref<UserProfile[]>([])

onMounted(async () => {
  const { data } = await usersApi.getAll({ page: 1, pageSize: 50 })
  if (data.success) users.value = data.data.items
})

function deleteUser(user: UserProfile) {
  confirm.require({
    message: `Remover ${user.name}?`,
    header: 'Confirmar',
    accept: async () => {
      await usersApi.delete(user.id)
      toast.add({ severity: 'success', summary: 'Usuário removido' })
      users.value = users.value.filter(u => u.id !== user.id)
    }
  })
}

async function toggleRole(user: UserProfile) {
  const newRole = user.role === 'Admin' ? 'User' : 'Admin'
  await usersApi.updateRole(user.id, newRole)
  user.role = newRole
  toast.add({ severity: 'info', summary: `Papel alterado para ${newRole}` })
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Gerenciar Usuários</h1>

    <DataTable :value="users" stripedRows paginator :rows="10">
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
