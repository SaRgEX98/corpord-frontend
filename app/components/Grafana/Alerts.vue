<!-- components/GrafanaAlerts.vue -->

<template>
  <div class="grid">
    <div
        v-for="a in alerts"
        :key="a.instance"
        class="card"
        :class="a.status"
    >
      <h3>{{ a.instance }}</h3>

      <p class="metric">
        goroutines: {{ a.value }}
      </p>

      <p class="threshold">
        threshold: {{ a.threshold }}
      </p>

      <p class="status">
        {{ a.status }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  alerts: any[]
}>()
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.card {
  padding: 16px;
  border-radius: 12px;
  color: white;
}

.card.ok {
  background: #16a34a;
}

.card.alerting {
  background: #dc2626;
}

.metric {
  font-size: 18px;
  font-weight: bold;
}

.threshold {
  opacity: 0.8;
}
</style>