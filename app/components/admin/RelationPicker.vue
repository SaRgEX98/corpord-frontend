<script setup lang="ts">
import { ComboboxRoot,ComboboxAnchor,ComboboxInput,ComboboxContent,ComboboxItem,ComboboxPortal,ComboboxViewport } from 'reka-ui';
import type { ResourceKey, AdminRecord } from '~/features/admin/resources';
const props=defineProps<{modelValue?:string;kind:ResourceKey;label:string;id:string;disabled?:boolean;invalid?:boolean;optional?:boolean;selectedLabel?:string}>();
const emit=defineEmits<{'update:modelValue':[value:string];selected:[record:AdminRecord]}>();
const api=useTransportApi();
const term=ref('');
const items=ref<AdminRecord[]>([]);
const next=ref<string|null>(null);
const pending=ref(false);
const failed=ref(false);
const focused=ref(false);
let generation=0;
let controller:AbortController|undefined;
let timer:ReturnType<typeof setTimeout>|undefined;
function optionLabel(row:AdminRecord):string {
  return [row.name ?? row.brand ?? [row.last_name,row.first_name].filter(Boolean).join(' ') ?? '',row.license_plate ?? row.region ?? row.route ?? '',`№${row.id}`].filter(Boolean).join(' · ');
}
async function load(append=false) {
  if(append && (pending.value || !next.value))return;
  const run=++generation;controller?.abort();controller=new AbortController();pending.value=true;failed.value=false;
  if(!append){items.value=[];next.value=null;}
  try {const page=await api[props.kind].page(term.value,append ? next.value ?? undefined:undefined,controller.signal);
    if(run!==generation)return;
    items.value=(append?[...items.value,...page.items]:page.items) as AdminRecord[];
    items.value=items.value.slice(-100);next.value=page.next_cursor;
  } catch {if(run===generation && !controller.signal.aborted)failed.value=true;}
  finally {if(run===generation)pending.value=false;}
}
watch(term,()=>{generation++;controller?.abort();clearTimeout(timer);if(focused.value)timer=setTimeout(()=>load(),250);});
function select(row:AdminRecord){focused.value=false;emit('selected',row);emit('update:modelValue',String(row.id));term.value='';}
onBeforeUnmount(()=>{generation++;controller?.abort();clearTimeout(timer);});
</script>
<template>
  <div>
    <p v-if="modelValue" class="mb-2 text-xs text-muted-foreground">Выбрано: {{ selectedLabel || `№${modelValue}` }} <button v-if="optional" type="button" class="text-link" @click="emit('update:modelValue','')">Очистить</button></p>
    <ComboboxRoot :disabled="disabled" ignore-filter open-on-focus open-on-click @update:model-value="select($event as AdminRecord)">
      <ComboboxAnchor><ComboboxInput :id="id" :data-value="modelValue ?? ''" v-model="term" class="input w-full" :aria-label="label" :aria-invalid="invalid" placeholder="Введите название или номер" @focus="focused=true;load()" @blur="focused=false" /></ComboboxAnchor>
      <ComboboxPortal><ComboboxContent position="popper" class="z-50 max-h-80 w-[min(420px,calc(100vw-36px))] overflow-y-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
        <p v-if="pending" role="status" class="p-3 text-sm">Загружаем…</p>
        <p v-if="failed" role="status" class="p-3 text-sm">Не удалось загрузить. <button type="button" class="text-link" @click="load()">Повторить</button></p>
        <ComboboxViewport><ComboboxItem v-for="row in items" :key="row.id" :data-value="String(row.id)" :value="row" class="cursor-pointer rounded-lg p-3 text-sm outline-none data-[highlighted]:bg-accent">{{ optionLabel(row) }}</ComboboxItem></ComboboxViewport>
        <button v-if="next" type="button" :disabled="pending" class="btn btn-secondary m-2" @click="load(true)">Показать ещё</button>
        <p v-if="!pending && !failed && !items.length" class="p-3 text-sm">Ничего не найдено.</p>
      </ComboboxContent></ComboboxPortal>
    </ComboboxRoot>
  </div>
</template>
