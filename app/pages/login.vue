<!-- app/pages/auth.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})
</script>

<template>
  <AuthCard
      title="Вход в систему"
      description="Введите email и пароль"
  >
    <AuthLoginForm/>

    <p class="mt-4 text-sm text-center text-muted-foreground">
      Нет аккаунта?
      <NuxtLink to="/register" class="underline">
        Зарегистрироваться
      </NuxtLink>
    </p>
  </AuthCard>
</template>
