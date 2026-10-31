<script setup lang="ts">
import { parseDate, today } from '@internationalized/date';
import type { DateValue } from 'reka-ui';
import { CalendarRoot } from 'reka-ui';
import { CalendarCell, CalendarCellTrigger, CalendarGrid, CalendarGridBody, CalendarGridHead, CalendarGridRow, CalendarHeadCell, CalendarHeader, CalendarHeading, CalendarNextButton, CalendarPrevButton } from '~/components/ui/calendar';
import type { RouteCalendar } from '~/types/domain/routes';
import { minorPrice } from '~/utils/route-display';
const props = defineProps<{ modelValue: string; calendar: RouteCalendar | null; pending: boolean; error: string; timezone: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string]; month: [value: string]; retry: [] }>();
// Reka 2.x indexes weekStartsOn relative to the locale: ru-RU starts on Monday at 0.
const placeholder = shallowRef<DateValue>(props.modelValue ? parseDate(props.modelValue) : today(props.timezone || 'UTC'));
const selected = computed(() => props.modelValue ? parseDate(props.modelValue) : undefined);
const dayMap = computed(() => new Map(props.calendar?.days.map(day => [day.date, day]) ?? []));
const label = (date: string) => { const day = dayMap.value.get(date); return day?.status === 'no_trips' ? 'Нет рейсов' : day?.status === 'sold_out' ? 'Мест нет' : day?.min_price_minor != null ? `от ${minorPrice(day.min_price_minor)}` : 'Уточняется'; };
watch(() => props.timezone, value => { if (!props.modelValue && value) placeholder.value = today(value); });
watch(placeholder, value => emit('month', value.toString().slice(0,7)));
watch(() => props.modelValue, value => { if (value) placeholder.value = parseDate(value); });
</script>
<template>
  <section class="panel p-4" aria-label="Календарь цен">
    <p class="mb-3 text-xs text-muted-foreground">Дата и время отправления: {{ timezone || 'выберите место отправления' }}. Цены за одного пассажира.</p>
    <p v-if="pending" role="status" class="mb-3 text-sm">Обновляем цены…</p>
    <div v-if="error" role="alert" class="mb-3 text-sm text-destructive">{{ error }} <button type="button" class="text-link" @click="emit('retry')">Повторить</button></div>
    <CalendarRoot v-slot="{grid,weekDays}" v-model:placeholder="placeholder" :model-value="selected" locale="ru-RU" :week-starts-on="0" weekday-format="short" prevent-deselect fixed-weeks :is-date-unavailable="date => !pending && !error && ['no_trips','sold_out'].includes(dayMap.get(date.toString())?.status ?? '')" @update:model-value="emit('update:modelValue', $event?.toString() ?? '')">
      <CalendarHeader><CalendarPrevButton /><CalendarHeading /><CalendarNextButton /></CalendarHeader>
      <CalendarGrid v-for="month in grid" :key="month.value.toString()" class="w-full mt-3">
        <CalendarGridHead><CalendarGridRow class="grid grid-cols-7"><CalendarHeadCell v-for="day in weekDays" :key="day" class="w-auto">{{ day }}</CalendarHeadCell></CalendarGridRow></CalendarGridHead>
        <CalendarGridBody><CalendarGridRow v-for="(week,index) in month.rows" :key="index" class="grid grid-cols-7 mt-1"><CalendarCell v-for="date in week" :key="date.toString()" :date="date">
          <CalendarCellTrigger :day="date" :month="month.value" :aria-label="`${date.toString()}: ${pending ? 'Загрузка' : error ? 'Цена недоступна' : label(date.toString())}`" class="h-16 w-full flex-col gap-1 text-sm data-[outside-view]:opacity-30">
            <span>{{ date.day }}</span><small class="block text-[9px] sm:text-xs">{{ pending ? '…' : error ? '—' : label(date.toString()) }}</small>
          </CalendarCellTrigger>
        </CalendarCell></CalendarGridRow></CalendarGridBody>
      </CalendarGrid>
    </CalendarRoot>
    <p class="mt-3 text-xs text-muted-foreground">«Нет рейсов» — день недоступен. Наличие расписания не гарантирует свободные места; доступность уточняется.</p>
  </section>
</template>
