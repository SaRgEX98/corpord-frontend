<script setup lang="ts">
definePageMeta({
  public: true,
})

import { useAuth } from '~/composables/useAuth'

const auth = useAuth()
</script>

<template>
  <nav class="bg-background/80 backdrop-blur-md sticky top-0 w-full z-50 shadow-md">
    <div class="max-w-[80dvw] mx-auto px-6 py-3 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2">
        <NuxtImg src="/svg/logo.svg" alt="logo" width="48" height="48" />
        <span class="font-bold text-xl text-foreground">Corpord</span>
      </NuxtLink>

      <!-- Навигация десктоп -->
      <div class="hidden md:flex gap-8 font-medium items-center text-foreground">
        <NuxtLink to="#about" class="hover:text-accent-foreground transition">О нас</NuxtLink>
        <NuxtLink to="#buses" class="hover:text-accent-foreground transition">Автобусы</NuxtLink>
        <NuxtLink to="#routes" class="hover:text-accent-foreground transition">Маршруты</NuxtLink>
        <NuxtLink to="#orders" class="hover:text-accent-foreground transition">Заказы</NuxtLink>
      </div>

      <!-- Кнопки / профиль -->
      <div class="hidden md:flex items-center gap-4">
        <!-- Кнопка Войти -->
        <NuxtLink v-if="!auth.isAuthenticated.value" to="/login">
          <UiButton variant="default">Войти</UiButton>
        </NuxtLink>

        <!-- Avatar + Dropdown для авторизованного пользователя -->
        <UiDropdownMenu v-else>
          <UiDropdownMenuTrigger asChild>
            <UiButton class="flex items-center">
              <UiAvatar>
                <AvatarImage :src="auth.user.value?.avatar_url || '/svg/logo.svg'" />
                <AvatarFallback class="w-full h-full text-center text-2xl">{{ auth.user.value?.name?.[0]?.toUpperCase() || 'U' }}</AvatarFallback>
              </UiAvatar>
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="bg-background text-foreground shadow-lg rounded-lg min-w-[160px]">
            <UiDropdownMenuItem asChild>
              <NuxtLink to="/me/profile" class="block w-full px-4 py-2 hover:bg-accent-foreground/10 rounded">
                Профиль
              </NuxtLink>
            </UiDropdownMenuItem>
            <UiDropdownMenuItem asChild>
              <NuxtLink to="/me/settings" class="block w-full px-4 py-2 hover:bg-accent-foreground/10 rounded">
                Настройки
              </NuxtLink>
            </UiDropdownMenuItem>
            <UiDropdownMenuItem asChild>
              <button @click="auth.logout()" class="block w-full text-left px-4 py-2 hover:bg-accent-foreground/10 rounded">
                Выйти
              </button>
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>

      <!-- Mobile menu button -->
      <button class="md:hidden text-foreground">
        &#9776;
      </button>
    </div>
  </nav>
</template>
