<script setup lang="ts">
import { createCatalogQualityApi } from '~/api/catalog-quality.api';
import type { QualityStop, QualityAudit } from '~/types/domain/catalog-quality';
import { apiErrorMessage } from '~/utils/api-errors';

const props = defineProps<{ stop: QualityStop }>();
const emit = defineEmits<{ saved: [stop: QualityStop]; close: [] }>();
const api = createCatalogQualityApi(useNuxtApp().$api);
const city = ref('');
const cityLabel = ref('');
const reason = ref('');
const pending = ref(false);
const error = ref('');
const history = ref<QualityAudit[]>([]);
const historyLoading = ref(false);
const historyError = ref('');
const stale = ref(false);
let controller: AbortController | undefined;
let generation = 0;
async function loadHistory() {
  const run = ++generation;
  controller?.abort(); controller = new AbortController();
  historyLoading.value = true; historyError.value = '';
  try { const page = await api.history(props.stop.id, controller.signal); if (run === generation) history.value = page.items; }
  catch (cause) { if (run === generation && !controller.signal.aborted) historyError.value = apiErrorMessage(cause); }
  finally { if (run === generation) historyLoading.value = false; }
}
watch(() => props.stop.id, () => { city.value = ''; cityLabel.value = ''; reason.value = ''; error.value = ''; stale.value = false; history.value = []; loadHistory(); }, { immediate: true });
async function save() {
  if (pending.value || props.stop.has_trips || stale.value) return;
  pending.value = true; error.value = '';
  try {
    const result = await api.mapping(props.stop.id, { city_id: Number(city.value), version: props.stop.version, reason: reason.value.trim() });
    emit('saved', result);
    await loadHistory();
  } catch (cause) {
    const code = (cause as { data?: { code?: string } })?.data?.code;
    if (code === 'stale_version') stale.value = true;
    error.value = apiErrorMessage(cause);
  } finally { pending.value = false; }
}
onBeforeUnmount(() => { generation++; controller?.abort(); });
</script>

<template>
  <section class="rounded-2xl border border-border bg-card p-5" aria-labelledby="quality-editor-title">
    <div class="flex items-start justify-between gap-3">
      <h2 id="quality-editor-title" class="min-w-0 break-words text-lg font-semibold">{{ stop.name }} · №{{ stop.id }}</h2>
      <button type="button" class="text-link shrink-0" :disabled="pending" @click="emit('close')">Закрыть</button>
    </div>
    <p class="mt-2 text-sm text-muted-foreground">{{ stop.address || 'Адрес неизвестен' }}</p>
    <p class="mt-1 text-sm text-muted-foreground">Координаты: {{ stop.latitude ?? 'неизвестны' }}, {{ stop.longitude ?? 'неизвестны' }}. Часовой пояс: {{ stop.timezone || 'неизвестен' }}.</p>
    <p v-if="stop.has_trips" role="status" class="mt-4 rounded-lg bg-muted p-3 text-sm">Остановка используется в расписании. Привязку менять нельзя.</p>
    <form v-else-if="stop.city_id === null" class="mt-5 space-y-4" @submit.prevent="save">
      <div>
        <label for="quality-city" class="mb-2 block text-sm font-medium">Подтверждённый город</label>
        <AdminRelationPicker id="quality-city" v-model="city" kind="cities" label="Подтверждённый город" :selected-label="cityLabel" :disabled="pending || stale" @selected="cityLabel = `${$event.name} · ${$event.region}`" />
        <p class="mt-2 text-xs text-muted-foreground">Выберите город по подтверждённым данным. Ближайший город не считается доказательством.</p>
      </div>
      <div>
        <label for="quality-reason" class="mb-2 block text-sm font-medium">Основание привязки</label>
        <textarea id="quality-reason" v-model="reason" rows="3" minlength="5" maxlength="500" required :disabled="pending || stale" class="input w-full" placeholder="Источник и причина выбора, от 5 до 500 символов" />
      </div>
      <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
      <p v-if="stale" class="text-sm">Закройте форму и обновите очередь: запись изменил другой редактор.</p>
      <button class="btn btn-primary" type="submit" :disabled="pending || stale || !city || reason.trim().length < 5">{{ pending ? 'Сохраняем…' : 'Сохранить привязку' }}</button>
    </form>
    <p v-else role="status" class="mt-4 text-sm text-primary">Подтверждённый город: {{ stop.city_name }} · {{ stop.region }}.</p>
    <div class="mt-6 border-t border-border pt-4">
      <h3 class="text-sm font-semibold">Последние изменения привязки</h3>
      <p v-if="historyLoading" role="status" class="mt-2 text-sm">Загружаем историю…</p>
      <p v-else-if="historyError" role="status" class="mt-2 text-sm">{{ historyError }} <button class="text-link" @click="loadHistory">Повторить</button></p>
      <p v-else-if="!history.length" class="mt-2 text-sm text-muted-foreground">Ручных изменений пока нет.</p>
      <ol v-else class="mt-3 space-y-3">
        <li v-for="event in history" :key="event.id" class="break-words rounded-lg bg-muted/40 p-3 text-sm">
          <p>Город: {{ event.before.city_id ?? 'не указан' }} → {{ event.after.city_id ?? 'не указан' }}</p>
          <p class="mt-1">{{ event.reason }}</p>
          <p class="mt-1 text-xs text-muted-foreground">Редактор №{{ event.actor_id }} · {{ new Date(event.created_at).toLocaleString('ru') }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
