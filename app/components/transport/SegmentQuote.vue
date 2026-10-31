<script setup lang="ts">
import { createRoutesApi } from '~/api/routes.api';
import { apiErrorMessage } from '~/utils/api-errors';
import { routeErrorMessage, minorPrice, routeDate, routeTime } from '~/utils/route-display';
const props = defineProps<{tripId: number; boarding: number; alighting: number}>();
const api = createRoutesApi(useNuxtApp().$api);
const {data, pending, error, refresh} = await useAsyncData(() => `segment-quote-${props.tripId}-${props.boarding}-${props.alighting}`, () => api.quote(props.tripId, props.boarding, props.alighting));
</script>
<template>
  <section class="panel card-pad mb-5" aria-label="Актуальная цена выбранного участка">
    <h2 class="section-label">Выбранный участок</h2>
    <p v-if="pending" role="status" class="form-hint mt-3">Проверяем актуальную цену…</p>
    <p v-else-if="error" role="alert" class="form-error mt-3">{{ routeErrorMessage(error, apiErrorMessage) }} <button class="text-link" @click="refresh()">Повторить</button></p>
    <template v-else-if="data"><p class="mt-3 font-semibold">{{ data.boarding_name }} → {{ data.alighting_name }}</p><p class="form-hint mt-2">{{ routeDate(data.departure_time,data.timezone).split('-').reverse().join('.') }} · {{ routeTime(data.departure_time,data.timezone) }} ({{ data.timezone }}) → {{ routeTime(data.arrival_time,data.arrival_timezone) }} ({{ data.arrival_timezone || 'UTC; пояс уточняется' }})</p><p class="mt-3 text-2xl font-semibold">{{ data.price ? minorPrice(data.price.amount_minor) : 'Тариф уточняется' }}</p><p class="form-hint mt-2">Цена перепроверена для одного пассажира. Свободные места уточняются. Место не забронировано.</p></template>
  </section>
</template>
