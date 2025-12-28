<!-- app/components/auth/AuthCard.vue -->
<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>{{ title }}</UiCardTitle>
      <UiCardDescription v-if="description">
        {{ description }}
      </UiCardDescription>
    </UiCardHeader>

    <UiCardContent>
      <slot />
    </UiCardContent>
  </UiCard>
</template>
