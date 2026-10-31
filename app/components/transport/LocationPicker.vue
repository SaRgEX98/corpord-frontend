<script setup lang="ts">
import { ComboboxRoot, ComboboxAnchor, ComboboxInput, ComboboxContent, ComboboxItem, ComboboxPortal, ComboboxViewport } from 'reka-ui';
import { createRoutesApi } from '~/api/routes.api';
import type { LocationSuggestion } from '~/types/domain/routes';
const props = defineProps<{ modelValue: LocationSuggestion | null; label: string; originId?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: LocationSuggestion | null] }>();
const api = createRoutesApi(useNuxtApp().$api);
const term = ref(props.modelValue?.name ?? '');
const items = ref<LocationSuggestion[]>([]);
const loading = ref(false);
const failed = ref(false);
let generation = 0;
let timer: ReturnType<typeof setTimeout>;
function schedule() {
  const run = ++generation;
  clearTimeout(timer);
  loading.value = true;
  failed.value = false;
  items.value = [];
  timer = setTimeout(async () => {
    try { const response = await api.suggest(term.value, props.originId); if (run === generation) items.value = response.items; }
    catch { if (run === generation) failed.value = true; }
    finally { if (run === generation) loading.value = false; }
  }, 250);
}
watch(term, () => {
  if (term.value !== props.modelValue?.name) emit('update:modelValue', null);
  schedule();
});
watch(() => props.originId, schedule);
watch(() => props.modelValue, value => { if (value) term.value = value.name; });
onBeforeUnmount(() => { generation++; clearTimeout(timer); });
</script>
<template>
  <ComboboxRoot :model-value="modelValue" ignore-filter open-on-focus open-on-click :reset-search-term-on-blur="false" :reset-search-term-on-select="false" @update:model-value="emit('update:modelValue', $event as LocationSuggestion)">
    <ComboboxAnchor><ComboboxInput v-model="term" class="input" :aria-label="label" placeholder="Город или остановка" :display-value="(value: any) => value?.name ?? ''" @focus="schedule" /></ComboboxAnchor>
    <ComboboxPortal><ComboboxContent position="popper" align="start" :side-offset="8" class="z-50 max-h-80 w-[min(340px,calc(100vw-36px))] overflow-y-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
      <p v-if="loading" role="status" class="p-3 text-sm text-muted-foreground">Ищем города и остановки…</p>
      <p v-else-if="failed" role="status" class="p-3 text-sm text-destructive">Не удалось загрузить подсказки. Введите запрос снова.</p>
      <p v-else-if="!items.length" class="p-3 text-sm text-muted-foreground">Подходящих остановок нет. Попробуйте название города.</p>
      <ComboboxViewport><ComboboxItem v-for="item in items" :key="item.id" :value="item" class="cursor-pointer rounded-lg p-3 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
        <strong class="block">{{ item.name }}</strong><span class="block text-xs text-muted-foreground">{{ [item.region, item.type === 'city' ? 'Город' : item.address].filter(Boolean).join(' · ') }}</span><span v-if="!item.served" class="block text-xs text-muted-foreground">Нет опубликованных направлений</span>
      </ComboboxItem></ComboboxViewport>
    </ComboboxContent></ComboboxPortal>
  </ComboboxRoot>
</template>
