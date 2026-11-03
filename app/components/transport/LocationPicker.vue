<script setup lang="ts">
import { ComboboxRoot, ComboboxAnchor, ComboboxInput, ComboboxContent, ComboboxItem, ComboboxPortal, ComboboxViewport } from 'reka-ui';
import { createRoutesApi } from '~/api/routes.api';
import { createReadCache } from '~/utils/read-cache';
import type { LocationSuggestion } from '~/types/domain/routes';
const props = defineProps<{ modelValue: LocationSuggestion | null; label: string; originId?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: LocationSuggestion | null] }>();
const http=useNuxtApp().$api;
const api = createRoutesApi(http);
const term = ref(props.modelValue?.name ?? '');
const items = ref<LocationSuggestion[]>([]);
const loading = ref(false);
const failed = ref(false);
const cache=createReadCache(32);
const region=ref('');
const regionItems=ref<Array<{id:number;name:string}>>([]);
let controller:AbortController|undefined;
const focused=ref(false);
let generation = 0;
let timer: ReturnType<typeof setTimeout>;
function schedule() {
  const run = ++generation;
  controller?.abort();
  clearTimeout(timer);
  if(!focused.value){loading.value=false;return;}
  controller=new AbortController();
  clearTimeout(timer);
  loading.value = true;
  failed.value = false;
  items.value = []; regionItems.value=[];
  timer = setTimeout(async () => {
    try {
      const key=JSON.stringify([term.value,props.originId,region.value]);
      const cached=cache.get<{items:LocationSuggestion[]}>(key);
      const response=cached ?? await api.suggest(term.value,props.originId,controller?.signal,region.value || undefined);
      if(run!==generation)return;
      items.value=response.items;cache.set(key,response);
      if(!region.value && term.value.trim().length>=2){
        const regions=await http<{items:Array<{id:number;name:string}>}>(`/catalog/regions?${new URLSearchParams({q:term.value,limit:'5'})}`,{signal:controller?.signal}).catch(()=>({items:[]}));
        if(run===generation)regionItems.value=regions.items ?? [];
      }
    }
    catch { if (run === generation) failed.value = true; }
    finally { if (run === generation) loading.value = false; }
  }, 250);
}
watch(term, () => {
  if (term.value !== props.modelValue?.name) emit('update:modelValue', null);
  schedule();
});
watch(() => props.originId, schedule);
function chooseRegion(value:string){region.value=value;term.value='';items.value=[];regionItems.value=[];focused.value=true;schedule();}
watch(() => props.modelValue, value => { if (value) term.value = value.name; });
onBeforeUnmount(() => { generation++; controller?.abort(); clearTimeout(timer); });
</script>
<template>
  <div>
  <p v-if="region" class="mb-1 text-xs text-muted-foreground">{{ region }} <button type="button" class="text-link" @click="chooseRegion('')">Все регионы</button></p>
  <ComboboxRoot :model-value="modelValue" ignore-filter open-on-focus open-on-click :reset-search-term-on-blur="false" :reset-search-term-on-select="false" @update:model-value="typeof $event === 'string' ? chooseRegion($event) : emit('update:modelValue', $event as LocationSuggestion)">
    <ComboboxAnchor><ComboboxInput v-model="term" class="input" :aria-label="label" placeholder="Город, регион или остановка" :display-value="(value: any) => value?.name ?? ''" @focus="focused=true; schedule()" @blur="focused=false" /></ComboboxAnchor>
    <ComboboxPortal><ComboboxContent position="popper" align="start" :side-offset="8" class="z-50 max-h-80 w-[min(340px,calc(100vw-36px))] overflow-y-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
      <p v-if="loading" role="status" class="p-3 text-sm text-muted-foreground">Ищем города и остановки…</p>
      <p v-else-if="failed" role="status" class="p-3 text-sm text-destructive">Не удалось загрузить подсказки. Введите запрос снова.</p>
      <p v-else-if="!items.length && !regionItems.length" class="p-3 text-sm text-muted-foreground">Подходящих остановок нет. Попробуйте название города.</p>
      <ComboboxViewport>
      <ComboboxItem v-for="entry in regionItems" :key="`region:${entry.id}`" :value="entry.name" class="cursor-pointer rounded-lg p-3 text-sm outline-none data-[highlighted]:bg-accent"><strong>{{ entry.name }}</strong><span class="block text-xs text-muted-foreground">Регион · выбрать город</span></ComboboxItem>
      <ComboboxItem v-for="item in items" :key="item.id" :value="item" class="cursor-pointer rounded-lg p-3 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
        <strong class="block">{{ item.name }}</strong><span class="block text-xs text-muted-foreground">{{ [item.type==='stop' ? item.city_name : '',item.region, item.type === 'city' ? 'Город' : item.address].filter(Boolean).join(' · ') }}</span><span v-if="!item.served" class="block text-xs text-muted-foreground">Нет опубликованных направлений</span>
      </ComboboxItem></ComboboxViewport>
    </ComboboxContent></ComboboxPortal>
  </ComboboxRoot>
  </div>
</template>
