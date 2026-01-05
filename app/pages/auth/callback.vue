<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'auth-callback',
})
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <span>Авторизация…</span>
  </div>
</template>
