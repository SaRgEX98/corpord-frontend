<script setup lang="ts">
import { ArrowLeftRight, ArrowUpRight, Search } from 'lucide-vue-next';
import { createRoutesApi } from '~/api/routes.api';
import type { LocationSuggestion, RouteCalendar, RouteFilters, RouteResult } from '~/types/domain/routes';
import { routeErrorMessage, minorPrice, routeDate, routeTime, validRouteDate } from '~/utils/route-display';
import { apiErrorMessage } from '~/utils/api-errors';
const api = createRoutesApi(useNuxtApp().$api);
const route = useRoute();
const router = useRouter();
const from = ref<LocationSuggestion | null>(null);
const to = ref<LocationSuggestion | null>(null);
const date = ref('');
const month = ref(new Date().toISOString().slice(0,7));
const sort = ref<'departure' | 'price'>('departure');
const calendar = ref<RouteCalendar | null>(null);
const calendarPending = ref(false);
const calendarError = ref('');
const items = ref<RouteResult[]>([]);
const pending = ref(false);
const error = ref('');
const searched = ref(false);
const nextCursor = ref<string | null>(null);
let restoreGeneration = 0;
const restoring = ref(false);
let calendarGeneration = 0;
let searchGeneration = 0;
let writingQuery = false;
const ready = computed(() => !!from.value && !!to.value && from.value.id !== to.value.id);
const timezone = computed(() => calendar.value?.timezone || from.value?.timezone || '');
const filters = (): RouteFilters => ({ from_id: from.value!.id, to_id: to.value!.id, date: date.value, passengers: 1, sort: sort.value });
function invalidateSearch() { searchGeneration++; items.value = []; pending.value = false; searched.value = false; nextCursor.value = null; error.value = ''; }
async function loadCalendar() {
  const run = ++calendarGeneration;
  calendar.value = null; calendarError.value = ''; calendarPending.value = false;
  if (!ready.value) return;
  calendarPending.value = true;
  try { const response = await api.calendar(filters(), month.value); if (run === calendarGeneration) calendar.value = response; }
  catch (cause) { if (run === calendarGeneration) calendarError.value = routeErrorMessage(cause, apiErrorMessage); }
  finally { if (run === calendarGeneration) calendarPending.value = false; }
}
watch([() => from.value?.id, () => to.value?.id], () => { if (restoring.value) return; invalidateSearch(); loadCalendar(); });
watch(month, () => { if (!restoring.value) loadCalendar(); });
watch(sort, () => { if (searched.value) search(); });
watch(date, () => { if (searched.value) invalidateSearch(); });
async function search(append = false) {
  if (!ready.value) { error.value = 'Выберите разные города или остановки из подсказок.'; return; }
  if (!validRouteDate(date.value)) { error.value = 'Выберите дату отправления в календаре.'; return; }
  const run = ++searchGeneration;
  pending.value = true; error.value = ''; searched.value = true;
  if (!append) items.value = [];
  const current = filters();
  try {
    const response = await api.search(current, append ? nextCursor.value ?? undefined : undefined);
    if (run !== searchGeneration) return;
    items.value = append ? [...items.value, ...response.items] : response.items;
    nextCursor.value = response.next_cursor;
    writingQuery = true;
    try { await router.replace({ query: { from_id: current.from_id, to_id: current.to_id, from_name: from.value?.name, to_name: to.value?.name, date: current.date, sort: current.sort } }); } finally { writingQuery = false; }
  } catch (cause) { if (run === searchGeneration) error.value = routeErrorMessage(cause, apiErrorMessage); }
  finally { if (run === searchGeneration) pending.value = false; }
}
async function chooseDate(value: string) { date.value = value; await nextTick(); if (ready.value && validRouteDate(value)) search(); }
function swap() { [from.value, to.value] = [to.value, from.value]; }
async function restore() {
  const run = ++restoreGeneration;
  const q = route.query;
  restoring.value = true;
  invalidateSearch();
  calendarGeneration++; calendar.value = null;
  function validID(id: unknown): id is string { return typeof id === 'string' && /^(city|stop):[1-9]\d*$/.test(id); }
  const originId = validID(q.from_id) ? q.from_id : '';
  const destinationId = validID(q.to_id) ? q.to_id : '';
  date.value = typeof q.date === 'string' && validRouteDate(q.date) ? q.date : '';
  if (date.value) month.value = date.value.slice(0,7);
  sort.value = q.sort === 'price' ? 'price' : 'departure';
  try {
    const [origin,destination] = await Promise.all([originId ? api.location(originId) : null, destinationId ? api.location(destinationId) : null]);
    if (run !== restoreGeneration) return;
    from.value = origin; to.value = destination;
    await nextTick();
    restoring.value = false;
    loadCalendar();
    if (ready.value && date.value) search();
  } catch (cause) {
    if (run !== restoreGeneration) return;
    from.value = null; to.value = null;
    await nextTick(); restoring.value = false;
    error.value = routeErrorMessage(cause, apiErrorMessage);
  }
}
watch(() => route.query, q => {
  if (writingQuery) return;
  if (q.from_id === from.value?.id && q.to_id === to.value?.id && q.date === date.value && (q.sort || 'departure') === sort.value) return;
  restore();
});
onMounted(restore);
onBeforeUnmount(() => { restoreGeneration++; calendarGeneration++; searchGeneration++; });
</script>
<template>
  <form id="trip-search" class="panel mt-5 p-4" @submit.prevent="search()">
    <div class="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr_auto]">
      <div class="field"><span>Откуда</span><TransportLocationPicker v-model="from" label="Место отправления" /></div>
      <button type="button" class="btn btn-secondary justify-self-center" aria-label="Поменять направления местами" @click="swap"><ArrowLeftRight :size="17" /></button>
      <div class="field"><span>Куда</span><TransportLocationPicker v-model="to" label="Место прибытия" :origin-id="from?.id" /></div>
      <button class="btn btn-primary" type="submit" :disabled="pending"><Search :size="16" />Найти рейс</button>
    </div>
    <p class="form-hint mt-3">Выберите город или остановку из подсказок. Цена и расписание относятся к выбранному участку маршрута.</p>
    <TransportPlaceSearch @origin="from = $event" @destination="to = $event" />
  </form>
  <div v-if="ready" class="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <TransportPriceCalendar :model-value="date" @update:model-value="chooseDate" :calendar="calendar" :pending="calendarPending" :error="calendarError" :timezone="timezone" @month="month = $event" @retry="loadCalendar" />
    <div class="panel p-5"><p class="text-sm">{{ date ? `Выбрано: ${date.split('-').reverse().join('.')}` : 'Выберите день отправления в календаре.' }}</p><p class="form-hint mt-2">Цены рассчитываются сервером для одного пассажира. Свободные места уточняются; поиск не создаёт бронь.</p><TransportRouteMap :points="[from, to].filter((point): point is LocationSuggestion => !!point)" /></div>
  </div>
  <div class="my-6 flex flex-wrap items-center justify-between gap-3"><h2 class="section-label">Результаты поиска</h2><div class="w-52"><UiTokenSelect v-model="sort" label="Сортировка рейсов" :options="[{value:'departure',label:'По отправлению'},{value:'price',label:'По стоимости'}]" /></div></div>
  <p v-if="restoring" role="status" class="form-hint">Восстанавливаем выбранное направление…</p>
  <p v-if="!ready && !error && !restoring" class="form-hint">Начните с выбора направления. Подсказки учитывают опубликованные маршруты.</p>
  <p v-if="error" role="alert" class="form-error">{{ error }} <button class="text-link" @click="search()">Повторить</button></p>
  <p v-if="pending" role="status" class="form-hint">Ищем рейсы…</p>
  <p v-if="searched && !pending && !error && !items.length" class="form-hint">Рейсы на выбранную дату не найдены. Попробуйте другой день или направление.</p>
  <div class="grid gap-3">
    <article v-for="item in items" :key="`${item.trip_id}:${item.boarding_stop_id}:${item.alighting_stop_id}`" class="panel p-5">
      <div class="flex flex-wrap items-start justify-between gap-4"><div><span class="badge">Рейс № {{ item.trip_id }}</span><p class="mt-3 text-lg font-semibold">{{ item.boarding_name }} → {{ item.alighting_name }}</p><p class="mt-2 text-sm">{{ routeDate(item.departure_time, item.timezone).split('-').reverse().join('.') }} · {{ routeTime(item.departure_time, item.timezone) }} → {{ routeTime(item.arrival_time, item.arrival_timezone) }}</p><p class="form-hint">Отправление: {{ item.timezone }} · Прибытие: {{ item.arrival_timezone || "UTC (пояс остановки уточняется)" }}</p><p class="form-hint">{{ item.availability.status === 'sold_out' ? 'Мест нет' : item.availability.status === 'available' ? 'Места доступны' : 'Свободные места уточняются' }}</p></div>
      <div class="flex flex-col items-end gap-3"><strong class="text-2xl">{{ item.price ? minorPrice(item.price.amount_minor) : "Тариф уточняется" }}</strong><NuxtLink :to="{path:`/trips/${item.trip_id}`,query:{boarding_stop_id:item.boarding_stop_id,alighting_stop_id:item.alighting_stop_id}}" class="btn btn-primary">Подробнее <ArrowUpRight :size="15" /></NuxtLink></div></div>
    </article>
  </div>
  <button v-if="nextCursor" class="btn btn-secondary mt-4" :disabled="pending" @click="search(true)">Показать ещё</button>
</template>
