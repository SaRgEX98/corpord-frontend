<script setup lang="ts">
definePageMeta({ layout: 'me' });
useHead({ title: 'Проверка тестовой оплаты' });
const route = useRoute();
const id = computed(() => Number(route.params.id));
// Query status/payment_id/redirect cannot confirm an order or supply a payment URL.
</script>
<template><div class="container-page"><NuxtLink to="/me/orders?view=orders" class="text-link">← Тестовые заказы</NuxtLink><h1 class="page-title mt-5 mb-5">Проверка тестовой оплаты</h1><CheckoutDetail :key="id" :order-id="id" returned /></div></template>
