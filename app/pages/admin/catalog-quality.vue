<script setup lang="ts">
import { createCatalogQualityApi } from '~/api/catalog-quality.api';
import type { QualityStop, QualitySummary } from '~/types/domain/catalog-quality';
import { apiErrorMessage } from '~/utils/api-errors';
definePageMeta({ layout: 'admin', middleware: ['admin'] });
useHead({ title: 'Качество справочника' });
const api = createCatalogQualityApi(useNuxtApp().$api);
const items = ref<QualityStop[]>([]);
const summary = ref<QualitySummary>();
const selected = ref<QualityStop>();
const next = ref<string | null>(null);
const query = ref('');
const pending = ref(false);
const error = ref('');
const summaryError = ref('');
const notice = ref('');
let generation = 0;
let controller: AbortController | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let summaryController: AbortController | undefined;
let summaryGeneration = 0;
async function load(append = false) {
  if (append && (pending.value || !next.value)) return;
  const run = ++generation;
  controller?.abort(); controller = new AbortController(); pending.value = true; error.value = '';
  if (!append) { items.value = []; next.value = null; }
  try {
    const page = await api.queue(query.value, append ? next.value ?? undefined : undefined, controller.signal);
    if (run !== generation) return;
    items.value = (append ? [...items.value, ...page.items] : page.items).slice(-200);
    next.value = page.next_cursor;
  } catch (cause) { if (run === generation && !controller.signal.aborted) error.value = apiErrorMessage(cause); }
  finally { if (run === generation) pending.value = false; }
}
async function loadSummary() {
  const run = ++summaryGeneration;
  summaryController?.abort(); summaryController = new AbortController();
  summaryError.value = '';
  try { const result = await api.summary(summaryController.signal); if (run === summaryGeneration) summary.value = result; }
  catch (cause) { if (run === summaryGeneration && !summaryController.signal.aborted) summaryError.value = apiErrorMessage(cause); }
}
function saved(stop: QualityStop) {
  items.value = items.value.filter(row => row.id !== stop.id);
  selected.value = stop;
  notice.value = 'Привязка сохранена. Остановка удалена из очереди.';
  loadSummary();
}
watch(query, () => { generation++; controller?.abort(); clearTimeout(timer); selected.value = undefined; timer = setTimeout(() => load(), 250); });
onMounted(() => { load(); loadSummary(); });
onBeforeUnmount(() => { generation++; summaryGeneration++; controller?.abort(); summaryController?.abort(); clearTimeout(timer); });
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-3xl font-semibold">Качество справочника</h1>
      <p class="mt-3 max-w-3xl text-sm text-muted-foreground">Остановки без подтверждённого города. Ручная привязка сохраняется с основанием и историей изменений.</p>
      <p v-if="summary" class="mt-3 text-sm">Без города: <strong>{{ summary.unmapped_stops.toLocaleString('ru') }}</strong>. Используются в расписании: <strong>{{ summary.protected_unmapped_stops.toLocaleString('ru') }}</strong>.</p>
      <p v-if="summaryError" role="status" class="mt-2 text-sm">{{ summaryError }} <button type="button" class="text-link" @click="loadSummary">Обновить сводку</button></p>
    </header>
    <div class="flex flex-wrap gap-3">
      <div class="min-w-0 flex-1"><label for="quality-search" class="sr-only">Поиск остановок без города</label><input id="quality-search" v-model="query" maxlength="120" class="input w-full" type="search" placeholder="Название или адрес остановки" /></div>
      <button type="button" class="btn btn-secondary" :disabled="pending" @click="selected = undefined; load()">Обновить очередь</button>
    </div>
    <p v-if="notice" role="status" class="text-sm text-primary">{{ notice }}</p>
    <AdminQualityMapping v-if="selected" :stop="selected" @saved="saved" @close="selected = undefined" />
    <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }} <button type="button" class="text-link" @click="load()">Повторить</button></p>
    <p v-if="pending" role="status" class="text-sm">Загружаем очередь…</p>
    <ul class="space-y-3" aria-label="Остановки без города">
      <li v-for="stop in items" :key="stop.id" class="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div class="min-w-0 flex-1"><h2 class="break-words font-medium">{{ stop.name }} · №{{ stop.id }}</h2><p class="mt-1 break-words text-sm text-muted-foreground">{{ stop.address || 'Адрес неизвестен' }}</p><p class="mt-1 text-xs text-muted-foreground">{{ stop.latitude ?? '—' }}, {{ stop.longitude ?? '—' }} · {{ stop.has_trips ? 'Используется в расписании' : 'Нет привязанных рейсов' }}</p></div>
        <button type="button" class="btn btn-secondary" @click="selected = stop; notice = ''">Проверить<span class="sr-only"> {{ stop.name }} №{{ stop.id }}</span></button>
      </li>
    </ul>
    <p v-if="!pending && !error && !items.length" class="text-sm text-muted-foreground">Остановки не найдены.</p>
    <button v-if="next" type="button" class="btn btn-secondary" :disabled="pending" @click="load(true)">Показать ещё</button>
  </section>
</template>
