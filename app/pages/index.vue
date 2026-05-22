<!-- pages/index.vue -->

<template>
  <div>
    <h1>Goroutines Alerts</h1>

    <GrafanaAlerts :alerts="alerts" />
  </div>
</template>

<script setup lang="ts">
import { useAlerts } from '~/composables/useAlerts'

const { alerts, fetchAlerts } = useAlerts()

onMounted(() => {
  fetchAlerts()

  setInterval(() => {
    fetchAlerts()
  }, 3000)
})
</script>