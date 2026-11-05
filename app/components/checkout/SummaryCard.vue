<script setup lang="ts">
import type { CheckoutSummary } from '~/types/domain/checkout';
import { checkoutLabels, paymentLabels } from '~/utils/checkout';
import { minorPrice, routeDate, routeTime } from '~/utils/route-display';
defineProps<{ order: CheckoutSummary; detail?: boolean }>();
</script>
<template>
  <article class="panel card-pad checkout-card" :aria-label="`Тестовый заказ № ${order.id}`">
    <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="font-semibold">{{ order.boarding_name }} → {{ order.alighting_name }}</h2><span class="badge">{{ checkoutLabels[order.status] || 'Статус уточняется' }}</span></div>
    <p class="form-hint mt-3">Тестовый заказ № {{ order.id }} · Демонстрационный рейс</p>
    <p class="mt-3">{{ routeDate(order.departure_time, order.timezone).split('-').reverse().join('.') }} · {{ routeTime(order.departure_time, order.timezone) }} ({{ order.timezone }})</p>
    <p class="form-hint mt-2">{{ order.passenger_name }} · место {{ order.seat_number }} · {{ minorPrice(order.amount_minor) }}</p>
    <p class="form-hint mt-2">Платёж: {{ paymentLabels[order.payment_status] || 'Результат уточняется' }}</p>
    <p class="form-hint mt-3">Только тестовая оплата. Подтверждение демозаказа не является действительным билетом.</p>
    <template v-if="detail"><dl class="mt-4 text-sm grid gap-3"><div><dt class="text-muted">Прибытие</dt><dd>{{ routeDate(order.arrival_time, order.arrival_timezone || 'UTC').split('-').reverse().join('.') }} · {{ routeTime(order.arrival_time, order.arrival_timezone || 'UTC') }} ({{ order.arrival_timezone || 'UTC; пояс уточняется' }})</dd></div><div v-if="order.status === 'awaiting_payment'"><dt class="text-muted">Первичное удержание до</dt><dd>{{ routeTime(order.hold_expires_at, order.timezone) }} ({{ order.timezone }}). Действительность оплаты проверяется сервером.</dd></div></dl></template>
    <NuxtLink v-else :to="`/me/orders/${order.id}`" class="btn btn-secondary mt-4">Открыть заказ № {{ order.id }}</NuxtLink>
  </article>
</template>
<style scoped>.checkout-card { overflow-wrap: anywhere; }</style>
