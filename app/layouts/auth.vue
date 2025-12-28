<script setup lang="ts">
useHead({
  title: 'Login'
})
</script>

<!-- app/layouts/auth.vue -->
<template>
  <div class="min-h-screen grid grid-cols-1 md:grid-cols-2">
    <!-- Левая часть (бренд / иллюстрация) -->
    <div class="hidden md:flex flex-col justify-between bg-muted p-10">
      <div class="text-xl font-semibold">
        Corpord
      </div>

      <div class="text-sm text-muted-foreground">
        Сервис заказа частных автобусов
      </div>
    </div>

    <!-- Правая часть (форма) -->
    <div class="flex items-center justify-center p-6">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>


<style scoped>

</style>