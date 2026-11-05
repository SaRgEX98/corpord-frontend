<script setup lang="ts">
import type { Booking } from '~/types/domain/booking';
import { effectiveBookingStatus, holdRemaining } from '~/utils/booking';
import { minorPrice, routeDate, routeTime } from '~/utils/route-display';
const props = defineProps<{ booking: Booking; now: number; pending?: boolean }>();
defineEmits<{ cancel: []; refresh: [] }>();
const status = computed(() => effectiveBookingStatus(props.booking, props.now));
const labels = { held: 'Место удерживается', expired: 'Время удержания истекло', cancelled: 'Удержание отменено', payment_committing: 'Подтверждаем тестовую оплату', confirmed: 'Место подтверждено в демозаказе' };
const details = ref(false);
</script>
<template>
  <article class="panel card-pad booking-card" :aria-label="`Удержание № ${booking.id}`">
    <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="font-semibold">{{ booking.boarding_name }} → {{ booking.alighting_name }}</h2><span class="badge">{{ labels[status] }}</span></div>
    <p v-if="booking.is_demo" class="form-hint mt-2">Демонстрационный рейс · тестовая цена</p>
    <p class="mt-3">{{ routeDate(booking.departure_time, booking.timezone).split('-').reverse().join('.') }} · {{ routeTime(booking.departure_time, booking.timezone) }} ({{ booking.timezone }})</p>
    <p class="form-hint mt-2">{{ booking.passenger_name }} · место {{ booking.seat_number }} · {{ minorPrice(booking.amount_minor) }}</p>
    <p v-if="status === 'held' && !booking.checkout_id" role="status" class="mt-3 font-semibold">Осталось {{ holdRemaining(booking.expires_at, now) }}</p>
    <p class="form-hint mt-2">{{ booking.checkout_enabled || booking.checkout_id ? 'Только тестовые операции. Действительный билет не оформляется.' : 'Это удержание места. Оплата не подключена, билет не оформлен.' }}</p>
    <button class="text-link mt-3" :aria-expanded="details" @click="details = !details">{{ details ? 'Скрыть детали' : 'Детали удержания' }}</button>
    <dl v-if="details" class="mt-3 text-sm grid gap-2"><div><dt class="text-muted">Номер удержания</dt><dd>{{ booking.id }}</dd></div><div><dt class="text-muted">Прибытие</dt><dd>{{ routeDate(booking.arrival_time, booking.arrival_timezone || 'UTC').split('-').reverse().join('.') }}, {{ routeTime(booking.arrival_time, booking.arrival_timezone || 'UTC') }} ({{ booking.arrival_timezone || 'UTC; пояс уточняется' }})</dd></div><div><dt class="text-muted">Удержание до</dt><dd>{{ routeTime(booking.expires_at, booking.timezone) }} ({{ booking.timezone }})</dd></div></dl>
    <div class="flex flex-wrap gap-3 mt-4"><button v-if="status === 'held' && !booking.checkout_id" class="btn btn-secondary" :disabled="pending" @click="$emit('cancel')">Отменить удержание</button><button class="text-link" :disabled="pending" @click="$emit('refresh')">Проверить статус</button></div>
    <NuxtLink v-if="booking.checkout_id" :to="`/me/orders/${booking.checkout_id}`" class="btn btn-primary mt-4">Открыть тестовый заказ</NuxtLink>
    <CheckoutStart v-else-if="booking.checkout_enabled" :hold-id="booking.id" :can-start="status === 'held'" />
  </article>
</template>
<style scoped>.booking-card { overflow-wrap: anywhere; }</style>
