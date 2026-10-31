<script setup lang="ts">
import { ComboboxRoot, ComboboxAnchor, ComboboxInput, ComboboxContent, ComboboxItem, ComboboxPortal, ComboboxViewport } from 'reka-ui';
import { createRoutesApi } from '~/api/routes.api';
import type { LocationSuggestion } from '~/types/domain/routes';
interface Place { id: string; name: string; label: string; kind: string; city: string; region: string; country: string; latitude: number; longitude: number }
const api = useNuxtApp().$api;
const routesApi = createRoutesApi(api);
const emit = defineEmits<{origin:[value:LocationSuggestion];destination:[value:LocationSuggestion]}>();
const cities = ref<LocationSuggestion[]>([]);
const stops = ref<LocationSuggestion[]>([]);
const selected = ref<Place>();
const mappingPending = ref(false);
const mappingError = ref('');
let mappingGeneration = 0;
watch(selected, async value => {
  if (value) term.value = value.label;
  const run = ++mappingGeneration;
  cities.value = []; stops.value = []; mappingError.value = ''; mappingPending.value = false;
  if (!value?.city) return;
  mappingPending.value = true;
  try { const result = await routesApi.suggest(value.city); if (run === mappingGeneration) cities.value = result.items.filter(item => item.type === 'city'); }
  catch { if (run === mappingGeneration) mappingError.value = 'Не удалось загрузить города. Выберите остановку в полях выше.'; }
  finally { if (run === mappingGeneration) mappingPending.value = false; }
});
async function chooseCity(city: LocationSuggestion) {
  const run = ++mappingGeneration; stops.value = []; mappingPending.value = true; mappingError.value = '';
  try { const result = await routesApi.stops(city.id); if (run === mappingGeneration) stops.value = result.items; }
  catch { if (run === mappingGeneration) mappingError.value = 'Не удалось загрузить остановки. Выберите остановку в полях выше.'; }
  finally { if (run === mappingGeneration) mappingPending.value = false; }
}
const term = ref('');
const places = ref<Place[]>([]);
const pending = ref(false);
const unavailable = ref(false);
let generation = 0;
let timer: ReturnType<typeof setTimeout>;
watch(term, value => {
  const run = ++generation;
  if (selected.value && value !== selected.value.label) selected.value = undefined;
  clearTimeout(timer); places.value = []; unavailable.value = false; pending.value = false;
  if (value.trim().length < 3 || value === selected.value?.label) return;
  pending.value = true;
  timer = setTimeout(async () => {
    try { const response = await api<{items: Place[]}>(`/geo/suggest?${new URLSearchParams({q:value,limit:'5'})}`); if (run === generation) places.value = response.items; }
    catch { if (run === generation) unavailable.value = true; }
    finally { if (run === generation) pending.value = false; }
  }, 350);
});
onBeforeUnmount(() => { mappingGeneration++; generation++; clearTimeout(timer); });
</script>
<template>
  <details class="mt-3 text-sm"><summary class="cursor-pointer text-primary">Найти адрес или место на карте</summary>
    <div class="mt-3 max-w-lg"><ComboboxRoot v-model="selected" ignore-filter open-on-focus open-on-click :reset-search-term-on-blur="false" :reset-search-term-on-select="false">
      <ComboboxAnchor><ComboboxInput v-model="term" class="input" aria-label="Поиск адреса или места" placeholder="Улица, автовокзал, достопримечательность" :display-value="(value: any) => value?.label ?? ''" /></ComboboxAnchor>
      <ComboboxPortal><ComboboxContent position="popper" class="z-50 max-h-72 w-[min(440px,calc(100vw-36px))] overflow-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg"><p v-if="pending" role="status" class="p-2">Ищем места…</p><p v-if="unavailable" role="status" class="p-2">Поиск адресов временно недоступен. Выберите город или остановку выше.</p><p v-if="!pending && !unavailable && !places.length" class="p-2 text-muted-foreground">Введите не менее трёх букв. Если место не найдено, попробуйте город.</p><ComboboxViewport><ComboboxItem v-for="place in places" :key="place.id" :value="place" class="cursor-pointer rounded-lg p-3 outline-none data-[highlighted]:bg-accent">{{ place.label }}</ComboboxItem></ComboboxViewport></ComboboxContent></ComboboxPortal>
    </ComboboxRoot></div>
    <p v-if="selected" class="form-hint mt-2">{{ selected.label }}. Для поиска рейса выберите обслуживаемую остановку в этом городе в полях выше. Адрес не является остановкой Corpord.</p>
    <p v-if="mappingPending" role="status" class="form-hint mt-2">Загружаем обслуживаемые остановки…</p>
    <p v-if="mappingError" role="status" class="form-hint mt-2">{{ mappingError }}</p>
    <div v-if="selected && cities.length" class="mt-3"><p class="form-hint">Уточните город, затем выберите остановку:</p><button v-for="city in cities" :key="city.id" type="button" class="btn btn-secondary mt-2 mr-2" @click="chooseCity(city)">{{ city.name }} · {{ city.region }}</button></div>
    <ul v-if="stops.length" class="mt-3 grid gap-2"><li v-for="stop in stops" :key="stop.id" class="rounded-lg border p-3"><strong>{{ stop.name }}</strong><p class="form-hint">{{ stop.address }}</p><button type="button" class="btn btn-secondary mt-2 mr-2" @click="emit('origin',stop)">Отсюда</button><button type="button" class="btn btn-secondary mt-2" @click="emit('destination',stop)">Сюда</button></li></ul>
    <TransportRouteMap v-if="selected" :points="[{name:selected.label,latitude:selected.latitude,longitude:selected.longitude}]" />
    <p class="form-hint mt-2">Геоданные © участники OpenStreetMap · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" class="text-link">ODbL</a></p>
  </details>
</template>
