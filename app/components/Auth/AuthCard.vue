<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
<template>
  <section class="auth-card">
    <div class="auth-card-heading">
      <p class="page-eyebrow">ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="auth-description">{{ description }}</p>
    </div>
    <slot />
  </section>
</template>
<style scoped>
.auth-card {
  width: 100%;
}
.auth-card-heading {
  margin-bottom: 30px;
}
.auth-card h1 {
  font-size: 31px;
  font-weight: 750;
  line-height: 1.2;
}
.auth-description {
  font-size: 12px;
  color: var(--muted-foreground);
  line-height: 1.7;
  margin-top: 12px;
}
.auth-card :deep(.auth-prompt) {
  font-size: 11px;
  line-height: 1.8;
  text-align: center;
  color: var(--muted-foreground);
  margin-top: 25px;
}
.auth-card :deep(.auth-prompt a) {
  color: var(--primary);
  font-weight: 650;
  margin-left: 4px;
}
</style>
