<script setup lang="ts">
import {useAuth} from '~/composables/useAuth'
import {useRoute} from 'vue-router'

const auth = useAuth()
const route = useRoute()

const menuItems = [
  {name: 'Профиль', path: '/me/profile'},
  {name: 'Настройки', path: '/me/settings'},
  {name: 'Заказы', path: '/me/orders'},
]

const exit = async () => {
  await auth.logout()
  navigateTo('/login')
}
</script>

<template>
  <div class="flex h-screen bg-background text-foreground">
    <LayoutNavbar/>
    <!-- Sidebar -->
    <aside class="w-64 border-r border-border p-6 flex flex-col">
      <div class="mb-8">
        <p class="font-bold text-lg">Личный кабинет</p>
      </div>
      <nav class="flex flex-col gap-2">
        <NuxtLink
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="px-4 py-2 rounded hover:bg-accent-foreground/10 transition"
            :class="route.path === item.path ? 'bg-accent-foreground/20 font-semibold' : ''"
        >
          {{ item.name }}
        </NuxtLink>
      </nav>
      <div class="mt-auto">
        <UiButton variant="outline" @click="exit" class="w-full px-4 py-2 rounded hover:bg-destructive/90 transition">
          Выйти
        </UiButton>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-6 overflow-auto">
      <slot/>
    </main>
  </div>
</template>
