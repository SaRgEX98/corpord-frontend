<script setup lang="ts">
import { createBookingApi } from '~/api/booking.api';
import { useAuthStore } from '~/store/auth';
import { bookingError } from '~/utils/booking';
import type { Passenger } from '~/types/domain/booking';
definePageMeta({ layout: 'me' });
useHead({ title: 'Пассажиры' });
const auth = useAuthStore();
const api = createBookingApi(useNuxtApp().$api);
const { items, nextCursor, pending, error, refresh, loadMore } = usePrivatePages<Passenger>(api.passengers);
const name = ref('');
const editing = ref<number | undefined>();
const removing = ref<number | null>(null);
const saving = ref(false);
const mutationError = ref('');
const notice = ref('');
const input = ref<HTMLInputElement | null>(null);
let controller = new AbortController();
function reset() { controller.abort(); controller = new AbortController(); name.value = ''; editing.value = undefined; removing.value = null; saving.value = false; mutationError.value = ''; notice.value = ''; }
watch(() => auth.sessionVersion, reset, { flush: 'sync' });
onBeforeUnmount(reset);
function edit(passenger: Passenger) { editing.value = passenger.id; name.value = passenger.full_name; mutationError.value = ''; notice.value = ''; nextTick(() => input.value?.focus()); }
function clear() { editing.value = undefined; name.value = ''; mutationError.value = ''; }
async function save() {
  if (saving.value) return;
  if (!name.value.trim()) { mutationError.value = 'Укажите имя пассажира.'; input.value?.focus(); return; }
  const version = auth.sessionVersion; const edited = editing.value; saving.value = true; mutationError.value = ''; notice.value = '';
  try {
    const value = await api.savePassenger(name.value.trim(), edited, controller.signal, version);
    if (version !== auth.sessionVersion) return;
    if (edited) items.value = items.value.map(person => person.id === value.id ? value : person);
    else await refresh();
    if (version === auth.sessionVersion) { clear(); notice.value = 'Имя пассажира сохранено.'; }
  } catch (cause) { if (version === auth.sessionVersion) mutationError.value = bookingError(cause); }
  finally { if (version === auth.sessionVersion) saving.value = false; }
}
async function remove(id: number) {
  if (saving.value) return;
  const version = auth.sessionVersion; saving.value = true; mutationError.value = ''; notice.value = '';
  try {
    await api.removePassenger(id, controller.signal, version);
    if (version !== auth.sessionVersion) return;
    items.value = items.value.filter(person => person.id !== id); removing.value = null;
    if (editing.value === id) clear();
    notice.value = 'Сохранённое имя удалено. История удержаний сохранена.';
  } catch (cause) { if (version === auth.sessionVersion) mutationError.value = bookingError(cause); }
  finally { if (version === auth.sessionVersion) saving.value = false; }
}
</script>
<template>
  <div class="container-page">
    <div class="page-heading"><div><p class="page-eyebrow">ЛИЧНОЕ ПРОСТРАНСТВО</p><h1 class="page-title">Пассажиры</h1><p class="page-description">Сохраните имена для следующей поездки. Документы и платёжные данные не нужны.</p></div></div>
    <form class="panel card-pad grid gap-3 mb-5" @submit.prevent="save"><h2 class="section-label">{{ editing ? 'Редактировать пассажира' : 'Добавить пассажира' }}</h2><label for="passenger-name" class="field">Имя пассажира</label><input id="passenger-name" ref="input" v-model="name" class="input" autocomplete="name" maxlength="160" required :disabled="saving" /><p v-if="mutationError" role="alert" class="form-error">{{ mutationError }}</p><p v-if="notice" role="status" class="form-hint">{{ notice }}</p><div class="flex flex-wrap gap-3"><button class="btn btn-primary" :disabled="saving">{{ saving ? 'Сохраняем…' : 'Сохранить пассажира' }}</button><button v-if="editing" type="button" class="btn btn-secondary" :disabled="saving" @click="clear">Отменить редактирование</button></div></form>
    <section aria-label="Сохранённые пассажиры" :aria-busy="pending" class="grid gap-3"><article v-for="person in items" :key="person.id" class="panel card-pad passenger-row"><h2 class="font-semibold">{{ person.full_name }}</h2><div v-if="removing !== person.id" class="flex flex-wrap gap-3 mt-3"><button class="text-link" :disabled="saving" @click="edit(person)">Редактировать</button><button class="text-link" :disabled="saving" @click="removing = person.id">Удалить</button></div><div v-else class="mt-3"><p class="form-hint">Удалить сохранённое имя? Имена в прошлых удержаниях сохранятся.</p><div class="flex flex-wrap gap-3 mt-3"><button class="btn btn-secondary" :disabled="saving" @click="remove(person.id)">Подтвердить удаление</button><button class="text-link" :disabled="saving" @click="removing = null">Оставить</button></div></div></article><p v-if="pending" role="status" class="form-hint">Загружаем пассажиров…</p><p v-if="error" role="alert" class="form-error">{{ error }} <button class="text-link" @click="refresh">Повторить</button></p><p v-if="!pending && !error && !items.length" class="form-hint">Сохранённых пассажиров пока нет.</p><button v-if="nextCursor" class="btn btn-secondary justify-self-start" :disabled="pending" @click="loadMore">Показать ещё</button></section>
  </div>
</template>
<style scoped>.passenger-row { overflow-wrap: anywhere; }</style>
