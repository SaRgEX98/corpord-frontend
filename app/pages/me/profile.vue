<script setup lang="ts">
definePageMeta({
  layout: 'me',
})

import { useAuth } from '~/composables/useAuth'
const auth = useAuth()
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">Профиль</h1>
    <NuxtImg :src="auth.user.value?.avatar_url" :alt="`${auth.user.value?.avatar_url}`"/>
    <p>Email: {{ auth.user.value?.email }}</p>
    <p>Имя: {{ auth.user.value?.name }}</p>
  </div>
</template>
