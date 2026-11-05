<script setup lang="ts">
definePageMeta({ layout: 'me' });
useHead({ title: 'Тестовый заказ' });
const route = useRoute();
const id = computed(() => Number(route.params.id));
</script>
<template><div class="container-page"><NuxtLink to="/me/orders?view=orders" class="text-link">← Тестовые заказы</NuxtLink><h1 class="page-title mt-5 mb-5">Тестовый заказ № {{ Number.isSafeInteger(id) && id > 0 ? id : '—' }}</h1><CheckoutDetail :key="id" :order-id="id" /></div></template>
