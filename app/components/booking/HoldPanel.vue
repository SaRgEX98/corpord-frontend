<script setup lang="ts">
import { createBookingApi } from '~/api/booking.api';
import { useAuthStore } from '~/store/auth';
import { bookingError, createHoldIntent } from '~/utils/booking';
import type { Availability, Booking, Passenger, HoldInput } from '~/types/domain/booking';
const props = defineProps<{ tripId: number; boarding: number; alighting: number }>();
const auth = useAuthStore();
const api = createBookingApi(useNuxtApp().$api);
const route = useRoute();
const now = useBookingClock();
const stock = ref<Availability | null>(null);
const stockPending = ref(false);
const stockError = ref('');
const error = ref('');
const pending = ref(false);
const booking = ref<Booking | null>(null);
const name = ref('');
const passengerId = ref('');
const passengers = ref<Passenger[]>([]);
const passengerCursor = ref<string | null>(null);
const passengerPending = ref(false);
const passengerError = ref('');
let passengersLoaded = false;
let intent: ReturnType<typeof createHoldIntent> | undefined;
const uncertain = ref(false);
let generation = 0;
let stockGeneration = 0;
let stockController: AbortController | undefined;
let privateController = new AbortController();
const loginTo = computed(() => ({ path: '/login', query: { redirect: route.fullPath } }));
async function availability() {
  const run = ++stockGeneration;
  stockController?.abort(); const operation = new AbortController(); stockController = operation;
  stockPending.value = true; stockError.value = '';
  try { const value = await api.availability(props.tripId, props.boarding, props.alighting, operation.signal); if (run === stockGeneration) stock.value = value; }
  catch (cause) { if (run === stockGeneration && !operation.signal.aborted) stockError.value = bookingError(cause); }
  finally { if (run === stockGeneration) stockPending.value = false; }
}
function clearPrivate() {
  generation++; privateController.abort(); privateController = new AbortController();
  intent = undefined; uncertain.value = false; booking.value = null; name.value = ''; passengerId.value = ''; passengers.value = []; passengerCursor.value = null;
  passengersLoaded = false; passengerError.value = ''; passengerPending.value = false; pending.value = false; error.value = '';
}
async function loadPassengers(append = false) {
  if (!auth.isAuthenticated || passengerPending.value || (!append && passengersLoaded) || (append && !passengerCursor.value)) return;
  const version = auth.sessionVersion; const run = generation;
  passengerPending.value = true; passengerError.value = '';
  try {
    const page = await api.passengers(append ? passengerCursor.value ?? undefined : undefined, privateController.signal);
    if (version !== auth.sessionVersion || run !== generation) return;
    const selected = passengers.value.find(person => String(person.id) === passengerId.value);
    const window = (append ? [...passengers.value, ...page.items] : page.items).slice(-100);
    passengers.value = selected && !window.some(person => person.id === selected.id) ? [selected, ...window.slice(-99)] : window;
    passengerCursor.value = page.next_cursor; passengersLoaded = true;
  } catch (cause) { if (run === generation) passengerError.value = bookingError(cause); }
  finally { if (run === generation) passengerPending.value = false; }
}
async function submit() {
  if (pending.value || !auth.isAuthenticated || booking.value) return;
  if (!intent) {
    if (!passengerId.value && !name.value.trim()) { error.value = 'Укажите имя пассажира или выберите сохранённого.'; return; }
    const person = passengerId.value ? { passenger_id: Number(passengerId.value) } : { passenger_name: name.value.trim() };
    intent = createHoldIntent({ trip_id: props.tripId, boarding_stop_id: props.boarding, alighting_stop_id: props.alighting, ...person } as HoldInput, auth.sessionVersion);
  }
  const current = intent; const run = generation;
  if (!current.validFor(auth.sessionVersion)) return;
  pending.value = true; error.value = '';
  try {
    const value = await api.hold(current.body, current.key, privateController.signal, current.ownerVersion);
    if (run !== generation || !current.validFor(auth.sessionVersion)) return;
    booking.value = value; uncertain.value = false; intent = undefined; await availability();
  } catch (cause) {
    if (run !== generation || !current.validFor(auth.sessionVersion)) return;
    error.value = bookingError(cause);
    const status = (cause as { statusCode?: number; status?: number }).statusCode ?? (cause as { status?: number }).status;
    // A transport/5xx failure may follow a committed hold. Retry the frozen intent.
    uncertain.value = !status || status >= 500;
    if (!uncertain.value) intent = undefined;
    if (status === 409) await availability();
  } finally { if (run === generation) pending.value = false; }
}
async function updateBooking(cancel = false) {
  if (!booking.value || pending.value) return;
  const version = auth.sessionVersion; const run = generation; pending.value = true; error.value = '';
  try {
    const value = await (cancel ? api.cancel(booking.value.id, privateController.signal, version) : api.booking(booking.value.id, privateController.signal));
    if (run === generation && version === auth.sessionVersion) { booking.value = value; await availability(); }
  } catch (cause) { if (run === generation) error.value = bookingError(cause); }
  finally { if (run === generation) pending.value = false; }
}
watch(() => auth.sessionVersion, clearPrivate, { flush: 'sync' });
watch(() => [props.tripId, props.boarding, props.alighting], () => { clearPrivate(); stock.value = null; availability(); });
onMounted(availability);
onBeforeUnmount(() => { clearPrivate(); stockGeneration++; stockController?.abort(); });
</script>
<template>
  <section class="panel card-pad mb-5" aria-label="Удержание места">
    <h2 class="section-label">Удержать место на 10 минут</h2>
    <p class="form-hint mt-3">Один пассажир на выбранном участке. Доступность тестовой оплаты проверяется после удержания.</p>
    <p v-if="stockPending" role="status" class="form-hint mt-3">Проверяем свободные места…</p>
    <p v-if="stockError" class="form-error mt-3" role="alert">{{ stockError }} <button class="text-link" @click="availability">Повторить проверку</button></p>
    <template v-if="stock"><p v-if="stock.is_demo" class="badge mt-3">Демонстрационное удержание · тестовая цена</p><p v-if="stock.status === 'unknown'" class="form-hint mt-3">Перевозчик не предоставил остатки мест. Онлайн-удержание пока недоступно.</p><p v-else-if="stock.status === 'sold_out'" class="form-hint mt-3">На этом участке свободных мест нет.</p><p v-else class="form-hint mt-3">Свободных мест на участке: {{ stock.seats }}. Доступность перепроверяется при удержании.</p></template>
    <p v-if="error" class="form-error mt-3" role="alert">{{ error }}</p>
    <BookingCard v-if="booking" class="mt-4" :booking="booking" :now="now" :pending="pending" @cancel="updateBooking(true)" @refresh="updateBooking()" />
    <template v-else-if="stock?.bookable || uncertain">
      <NuxtLink v-if="!auth.isAuthenticated" :to="loginTo" class="btn btn-primary mt-4">Войти для удержания места</NuxtLink>
      <form v-else class="grid gap-3 mt-4" @submit.prevent="submit">
        <label for="hold-passenger" class="field">Сохранённый пассажир</label>
        <select id="hold-passenger" v-model="passengerId" class="input" :disabled="pending || uncertain" @focus="loadPassengers()"><option value="">Ввести имя вручную</option><option v-for="person in passengers" :key="person.id" :value="String(person.id)">{{ person.full_name }}</option></select>
        <p v-if="passengerPending" role="status" class="form-hint">Загружаем пассажиров…</p>
        <p v-if="passengerError" role="alert" class="form-error">{{ passengerError }} <button type="button" class="text-link" @click="loadPassengers()">Повторить</button></p>
        <button v-if="passengerCursor" type="button" class="text-link justify-self-start" :disabled="passengerPending || pending || uncertain" @click="loadPassengers(true)">Ещё пассажиры</button>
        <template v-if="!passengerId"><label for="hold-name" class="field">Имя пассажира</label><input id="hold-name" v-model="name" class="input" autocomplete="name" maxlength="160" :disabled="pending || uncertain" :required="!passengerId" /></template>
        <p v-if="uncertain" class="form-hint" role="status">Ответ не получен. Повторная попытка проверит ту же операцию и не продлит удержание. Также можно проверить <NuxtLink to="/me/orders" class="text-link">мои поездки</NuxtLink>.</p>
        <button class="btn btn-primary justify-self-start" :disabled="pending || (!uncertain && !stock?.bookable)">{{ pending ? 'Проверяем удержание…' : uncertain ? 'Повторить ту же операцию' : 'Удержать место на 10 минут' }}</button>
      </form>
    </template>
  </section>
</template>
