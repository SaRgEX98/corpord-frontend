<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>
<template><NuxtLink to="/" class="brand-logo" aria-label="Corpord — главная"><img src="/brand/corpord-mark.png" alt="" width="36" height="36"><span v-if="!compact">corpord<span class="brand-dot">.</span></span></NuxtLink></template>
<style scoped>.brand-logo{display:inline-flex;gap:10px;align-items:center;font-size:26px;font-weight:800;letter-spacing:-1.2px;color:inherit}.brand-logo img{object-fit:contain;border-radius:9px}.brand-dot{color:#b9ec83}</style>
