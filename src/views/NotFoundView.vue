<template>
  <div class="page-container" style="text-align: center; padding: 4rem;">
    <i class="pi pi-exclamation-triangle" style="font-size: 4rem; color: var(--ds-primary);" />
    <h1 class="page-title">Página não encontrada</h1>
    <p class="page-subtitle">A página que você procura não existe</p>
    <router-link to="/"><Button label="Voltar ao Início" icon="pi pi-home" /></router-link>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
</script>
