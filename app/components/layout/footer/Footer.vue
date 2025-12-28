<script setup lang="ts"></script>

<template>
  <footer class="bg-background text-foreground border-t border-border py-12">
    <div class="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <h3 class="font-bold text-xl mb-2">Corpord</h3>
        <p>Сервис заказа частных автобусов</p>
      </div>
      <div>
        <h4 class="font-semibold mb-2">Ссылки</h4>
        <ul class="space-y-1">
          <li><NuxtLink to="#about">О нас</NuxtLink></li>
          <li><NuxtLink to="#buses">Автобусы</NuxtLink></li>
          <li><NuxtLink to="#routes">Маршруты</NuxtLink></li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-2">Контакты</h4>
        <p>Email: info@corpord.com</p>
        <p>Телефон: +7 999 123-45-67</p>
      </div>
    </div>
    <p class="mt-8 text-center text-sm text-muted-foreground">&copy; 2025 Corpord. Все права защищены.</p>
  </footer>
</template>
