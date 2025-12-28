<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})
</script>

<template>
  <AuthCard
      title="Регистрация"
      description="Создайте новый аккаунт"
  >
    <AuthRegisterForm />

    <p class="mt-4 text-sm text-center text-muted-foreground">
      Уже есть аккаунт?
      <NuxtLink to="/login" class="underline">
        Войти
      </NuxtLink>
    </p>
  </AuthCard>
</template>
