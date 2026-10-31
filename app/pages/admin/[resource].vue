<script setup lang="ts">
import { findAdminResource } from '~/features/admin/resources'
definePageMeta({ layout: 'admin', middleware: ['admin'] })
const route = useRoute()
const definition = computed(() => findAdminResource(String(route.params.resource)))
if (!definition.value) throw createError({ statusCode: 404, statusMessage: 'Раздел не найден' })
useHead({ title: () => `${definition.value?.title ?? 'Управление'} — Corpord` })
</script>

<template>
  <AdminResourceManager v-if="definition" :key="definition.key" :resource="definition" />
  <div v-else class="rounded-2xl border border-border bg-card p-8"><h1 class="text-2xl font-semibold">Раздел не найден</h1><NuxtLink to="/admin" class="mt-4 inline-block text-primary underline">Вернуться к обзору</NuxtLink></div>
</template>
