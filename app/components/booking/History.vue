<script setup lang="ts">
import { createBookingApi } from '~/api/booking.api';
import { useAuthStore } from '~/store/auth';
import { bookingError } from '~/utils/booking';
import type { Booking } from '~/types/domain/booking';
const auth = useAuthStore();
const api = createBookingApi(useNuxtApp().$api);
const { items, nextCursor, pending, error, refresh, loadMore } = usePrivatePages<Booking>(api.bookings);
const now = useBookingClock();
const mutation = ref<number | null>(null);
const mutationError = ref('');
let controller = new AbortController();
function reset() { controller.abort(); controller = new AbortController(); mutation.value = null; mutationError.value = ''; }
watch(() => auth.sessionVersion, reset, { flush: 'sync' });
onBeforeUnmount(reset);
async function update(id: number, cancel = false) {
  if (mutation.value !== null) return;
  const version = auth.sessionVersion; mutation.value = id; mutationError.value = '';
  try {
    const value = await (cancel ? api.cancel(id, controller.signal, version) : api.booking(id, controller.signal));
    if (version === auth.sessionVersion) items.value = items.value.map(item => item.id === id ? value : item);
  } catch (cause) { if (version === auth.sessionVersion) mutationError.value = bookingError(cause); }
  finally { if (version === auth.sessionVersion) mutation.value = null; }
}
</script>
<template>
  <div>
    <p v-if="mutationError" class="form-error mb-4" role="alert">{{ mutationError }}</p>
    <section aria-label="История удержаний" :aria-busy="pending" class="grid gap-4">
      <BookingCard v-for="booking in items" :key="booking.id" :booking="booking" :now="now" :pending="mutation !== null" @cancel="update(booking.id, true)" @refresh="update(booking.id)" />
      <p v-if="pending" role="status" class="form-hint">Загружаем удержания…</p>
      <p v-if="error" role="alert" class="form-error">{{ error }} <button class="text-link" @click="refresh">Повторить</button></p>
      <div v-if="!pending && !error && !items.length" class="panel card-pad"><h2 class="font-semibold">Удержаний пока нет</h2><p class="form-hint mt-3">Найдите рейс, откройте выбранный участок и проверьте доступность мест.</p></div>
      <button v-if="nextCursor" class="btn btn-secondary justify-self-start" :disabled="pending" @click="loadMore">Показать ещё</button>
    </section>
  </div>
</template>
