<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "guest" });
useHead({ title: "Вход" });
</script>
<template>
  <AuthCard
    title="С возвращением."
    description="Войдите, чтобы перейти в личный кабинет."
    ><AuthLoginForm />
    <p class="auth-prompt">
      Ещё нет аккаунта?<NuxtLink to="/register">Зарегистрироваться</NuxtLink>
    </p></AuthCard
  >
</template>
