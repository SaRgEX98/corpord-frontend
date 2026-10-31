<script setup lang="ts">
useHead({
  htmlAttrs: { lang: "ru" },
  titleTemplate: (title) =>
    title ? `${title} · Corpord` : "Corpord — автобусные перевозки",
});
</script>
<template>
  <NuxtLoadingIndicator color="#245ce3" /><a
    href="#main-content"
    class="skip-link"
    >Перейти к содержимому</a
  ><NuxtLayout><NuxtPage /></NuxtLayout>
</template>
<style>
.skip-link {
  position: fixed;
  top: -100px;
  left: 20px;
  z-index: 100;
  background: var(--primary);
  color: var(--primary-foreground);
  padding: 12px;
  border-radius: 8px;
}
.skip-link:focus {
  top: 12px;
}
</style>
