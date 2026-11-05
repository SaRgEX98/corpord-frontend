<script setup lang="ts">
import { createCheckoutApi } from '~/api/checkout.api';
import type { CheckoutStatus, CheckoutSummary } from '~/types/domain/checkout';
import { checkoutStatuses } from '~/types/domain/checkout';
import { checkoutLabels } from '~/utils/checkout';
const api = createCheckoutApi(useNuxtApp().$api);
const status = ref<CheckoutStatus | ''>('');
const { items, nextCursor, pending, error, refresh, loadMore } = usePrivatePages<CheckoutSummary>((cursor, signal) => api.list(status.value || undefined, cursor, signal), [() => status.value]);
</script>
<template>
  <div><div class="mb-5 max-w-sm"><label for="checkout-filter" class="field">Статус тестового заказа</label><select id="checkout-filter" v-model="status" class="input mt-2"><option value="">Все статусы</option><option v-for="value in checkoutStatuses" :key="value" :value="value">{{ checkoutLabels[value] }}</option></select></div>
    <section aria-label="Тестовые заказы" :aria-busy="pending" class="grid gap-4">
      <CheckoutSummaryCard v-for="order in items" :key="order.id" :order="order" />
      <p v-if="pending" role="status" class="form-hint">Загружаем тестовые заказы…</p>
      <p v-if="error" role="alert" class="form-error">{{ error }} <button class="text-link" @click="refresh">Повторить</button></p>
      <p v-if="!pending && !error && !items.length" class="form-hint">Тестовых заказов с этим статусом пока нет.</p>
      <button v-if="nextCursor" class="btn btn-secondary justify-self-start" :disabled="pending" @click="loadMore">Показать ещё</button>
    </section>
  </div>
</template>
