<script setup lang="ts">
import { confirmationUrl } from '~/utils/checkout';
const props = defineProps<{ orderId: number; returned?: boolean }>();
const { data, pending, working, error, actionError, pollingStopped, refresh, cancel, reconcile } = useCheckoutDetail(() => props.orderId);
const paymentUrl = computed(() => data.value ? confirmationUrl(data.value) : null);
const cancelOpen = ref(false);
watch(() => props.orderId, () => { cancelOpen.value = false; });
</script>
<template>
  <div aria-label="Детали тестового заказа" :aria-busy="pending || working">
    <p class="badge mb-4">Тестовый магазин ЮKassa · реальные списания не выполняются</p>
    <p v-if="returned" class="panel card-pad mb-4" role="status">Вы вернулись со страницы оплаты. Проверяем состояние на сервере: возврат на сайт сам по себе не подтверждает оплату.</p>
    <p v-if="pending && !data" role="status" class="form-hint mb-4">Загружаем заказ…</p>
    <p v-if="error" class="form-error mb-4" role="alert">{{ error }} <button class="text-link" @click="refresh">Повторить загрузку</button></p>
    <template v-if="data">
      <CheckoutSummaryCard :order="data" detail />
      <section class="panel card-pad mt-4" aria-label="Действия с тестовым заказом">
        <p v-if="data.payment_status === 'unknown' || data.status === 'review_required'" role="status" class="form-hint">Результат оплаты пока не определён. Не создавайте новую оплату: состояние этого заказа нужно проверить.</p>
        <p v-else-if="data.status === 'committing'" class="form-hint" role="status">Сервер подтверждает тестовую оплату и место. Первичный срок удержания больше не отменяет этот процесс.</p>
        <p v-else-if="data.status === 'awaiting_payment' && data.actions.can_pay && !paymentUrl" class="form-hint" role="status">Готовим безопасную страницу тестовой оплаты. Новый платёж создавать не нужно.</p>
        <p v-else-if="data.status === 'paid'" class="form-hint" role="status">Место закреплено в демонстрационном заказе. Действительный перевозочный билет не оформляется.</p>
        <p v-if="pollingStopped" class="form-hint mt-3">Автоматическая проверка приостановлена. Статус можно обновить вручную.</p>
        <p v-if="actionError" class="form-error mt-3" role="alert">{{ actionError }}</p>
        <div class="flex flex-wrap gap-3 mt-4">
          <a v-if="paymentUrl" :href="paymentUrl" rel="noreferrer noopener" class="btn btn-primary">Открыть тестовую оплату ЮKassa</a>
          <button class="btn btn-secondary" :disabled="pending || working" @click="refresh">Обновить статус заказа</button>
          <button v-if="data.actions.can_reconcile" class="btn btn-secondary" :disabled="pending || working" @click="reconcile">Запросить сверку оплаты</button>
          <button v-if="data.actions.can_cancel && !cancelOpen" class="btn btn-secondary" :disabled="working" @click="cancelOpen = true">Отменить тестовый заказ</button>
        </div>
        <div v-if="cancelOpen && data.actions.can_cancel" class="mt-4"><p class="form-hint">Запросить отмену? Сервер проверит состояние оплаты и освободит место, когда отмена безопасна.</p><div class="flex flex-wrap gap-3 mt-3"><button class="btn btn-secondary" :disabled="working" @click="cancelOpen = false; cancel()">Подтвердить отмену заказа</button><button class="text-link" :disabled="working" @click="cancelOpen = false">Оставить заказ</button></div></div>
      </section>
    </template>
  </div>
</template>
