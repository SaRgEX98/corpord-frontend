<script setup lang="ts">
import { createCheckoutApi } from '~/api/checkout.api';
import { useAuthStore } from '~/store/auth';
import { checkoutError, createCheckoutIntent, uncertainCheckoutError } from '~/utils/checkout';
const props = defineProps<{ holdId: number; canStart: boolean }>();
const auth = useAuthStore();
const api = createCheckoutApi(useNuxtApp().$api);
const pending = ref(false);
const uncertain = ref(false);
const error = ref('');
let intent: ReturnType<typeof createCheckoutIntent> | undefined;
let controller = new AbortController();
let generation = 0;
function reset() { generation++; controller.abort(); controller = new AbortController(); pending.value = false; uncertain.value = false; error.value = ''; intent = undefined; }
watch(() => auth.sessionVersion, reset, { flush: 'sync' });
watch(() => props.holdId, reset, { flush: 'sync' });
onBeforeUnmount(reset);
async function start() {
  if (pending.value || !auth.isAuthenticated || (!props.canStart && !intent)) return;
  intent ??= createCheckoutIntent(props.holdId, auth.sessionVersion);
  const current = intent; const run = generation;
  if (!current.validFor(auth.sessionVersion)) return;
  pending.value = true; error.value = '';
  try {
    const result = await api.create(current.holdId, current.key, controller.signal, current.ownerVersion);
    if (run !== generation || !current.validFor(auth.sessionVersion)) return;
    if (!Number.isSafeInteger(result.id) || result.id <= 0) throw new Error('invalid order');
    await navigateTo(`/me/orders/${result.id}`);
  } catch (cause) {
    if (run !== generation || !current.validFor(auth.sessionVersion)) return;
    error.value = checkoutError(cause); uncertain.value = uncertainCheckoutError(cause);
    if (!uncertain.value) intent = undefined;
  } finally { if (run === generation) pending.value = false; }
}
</script>
<template>
  <div v-if="canStart || uncertain" class="mt-4">
    <p class="form-hint">Только тестовая оплата ЮKassa. Подтверждение демозаказа не является действительным билетом.</p>
    <p v-if="error" role="alert" class="form-error mt-3">{{ error }}</p>
    <p v-if="uncertain" role="status" class="form-hint mt-3">Ответ не получен. Повторяем ту же операцию с тем же ключом. Можно проверить <NuxtLink to="/me/orders?view=orders" class="text-link">тестовые заказы</NuxtLink>.</p>
    <button class="btn btn-primary mt-3" :disabled="pending" @click="start">{{ pending ? 'Готовим заказ…' : uncertain ? 'Повторить создание того же заказа' : 'Перейти к тестовой оплате' }}</button>
  </div>
</template>
