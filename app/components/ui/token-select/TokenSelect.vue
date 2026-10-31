<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
defineProps<{ modelValue?: string; options: { value: string; label: string }[]; placeholder?: string; disabled?: boolean; id?: string; label?: string; invalid?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
// Reka reserves the empty value for clearing selection.
const empty = '__corpord_all__';
</script>
<template>
  <Select :model-value="modelValue ? `value:${modelValue}` : empty" :disabled="disabled" @update:model-value="emit('update:modelValue', String($event) === empty ? '' : String($event).slice(6))">
    <SelectTrigger :id="id" :data-value="modelValue || ''" class="w-full bg-card text-foreground" :aria-label="label" :aria-invalid="invalid"><SelectValue :placeholder="placeholder || 'Выберите…'" /></SelectTrigger>
    <SelectContent><SelectItem v-if="!options.some(o => o.value === '')" :value="empty" disabled>{{ placeholder || 'Выберите…' }}</SelectItem><SelectItem v-for="option in options" :key="option.value" :value="option.value ? `value:${option.value}` : empty" :data-value="option.value">{{ option.label }}</SelectItem></SelectContent>
  </Select>
</template>
