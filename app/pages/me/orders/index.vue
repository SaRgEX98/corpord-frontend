<script setup lang="ts">
definePageMeta({ layout: 'me' });
useHead({ title: 'Мои поездки' });
const route = useRoute();
const view = computed(() => route.query.view === 'orders' ? 'orders' : 'holds');
</script>
<template>
  <div class="container-page">
    <div class="page-heading"><div><p class="page-eyebrow">ЛИЧНОЕ ПРОСТРАНСТВО</p><h1 class="page-title">Мои поездки</h1><p class="page-description">Удержания мест и тестовые заказы. Демоподтверждение не является действительным билетом.</p></div><NuxtLink to="/trips" class="btn btn-primary">Выбрать рейс</NuxtLink></div>
    <nav aria-label="Раздел поездок" class="flex flex-wrap gap-3 mb-5"><NuxtLink to="/me/orders" :aria-current="view === 'holds' ? 'page' : undefined" :class="['btn', view === 'holds' ? 'btn-primary' : 'btn-secondary']">Удержания</NuxtLink><NuxtLink to="/me/orders?view=orders" :aria-current="view === 'orders' ? 'page' : undefined" :class="['btn', view === 'orders' ? 'btn-primary' : 'btn-secondary']">Тестовые заказы</NuxtLink></nav>
    <BookingHistory v-if="view === 'holds'" /><CheckoutHistory v-else />
  </div>
</template>
