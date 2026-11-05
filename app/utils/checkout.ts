import type { CheckoutDetail, CheckoutStatus, PaymentStatus } from '../types/domain/checkout';
import { apiErrorMessage } from './api-errors.ts';
export const checkoutLabels: Record<CheckoutStatus, string> = {
  awaiting_payment: 'Ожидает тестовой оплаты', committing: 'Подтверждаем оплату и место', paid: 'Тестовая оплата подтверждена',
  cancel_pending: 'Отмена обрабатывается', cancelled: 'Заказ отменён', expired: 'Время оплаты истекло',
  review_required: 'Требуется проверка оплаты', refund_pending: 'Тестовый возврат обрабатывается', refunded: 'Тестовый возврат выполнен',
};
export const paymentLabels: Record<PaymentStatus, string> = {
  not_started: 'Платёж готовится', pending: 'Ожидает оплаты', authorized: 'Сумма авторизована', processing: 'Обрабатывается',
  succeeded: 'Тестовая оплата выполнена', canceled: 'Платёж отменён', unknown: 'Результат пока неизвестен', refunding: 'Возврат обрабатывается', refunded: 'Средства возвращены в тестовом режиме',
};
/** Only a server-supplied HTTPS URL may leave the app; route/query values never enter here. */
export function confirmationUrl(detail: CheckoutDetail): string | null {
  if (!detail.test || !detail.is_demo || !detail.actions.can_view_confirmation) return null;
  try {
    const value = detail.payment?.confirmation_url;
    if (typeof value !== 'string' || value.length > 4096 || /[\u0000-\u0020]/.test(value)) return null;
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function checkoutPollDelay(detail: Pick<CheckoutDetail, 'status' | 'next_poll_after_ms'>, polls: number, elapsed: number): number | null {
  if (polls >= 12 || elapsed >= 120000 || !['awaiting_payment', 'committing', 'cancel_pending', 'refund_pending'].includes(detail.status)) return null;
  const hint = detail.next_poll_after_ms;
  if (hint === null || !Number.isFinite(hint) || hint <= 0) return null;
  return Math.min(30000, Math.max(1000, hint, Math.min(15000, 1000 * 2 ** Math.min(polls, 4))));
}
export function checkoutError(error: unknown) {
  const code = (error as { data?: { code?: string } })?.data?.code;
  const messages: Record<string, string> = {
    hold_expired: 'Удержание уже истекло. Выберите рейс и удержите место заново.',
    checkout_exists: 'Для этого удержания уже есть заказ. Проверьте статус удержания или откройте раздел «Тестовые заказы».',
    idempotency_conflict: 'Эта операция уже выполнялась с другими параметрами. Проверьте тестовые заказы перед новой попыткой.',
    checkout_in_progress: 'Оплата или отмена ещё обрабатывается. Проверьте состояние заказа.',
    paid_order: 'Тестовая оплата уже подтверждена. Отмена удержания для этого заказа недоступна.',
    not_payable: 'Для этого удержания тестовая оплата недоступна.',
    rate_limited: 'Проверка уже запрошена. Подождите немного перед следующей попыткой.',
    payments_disabled: 'Тестовая оплата сейчас отключена. Удержание не является билетом.',
    provider_unavailable: 'Платёжный сервис временно недоступен. Повторите ту же операцию или проверьте тестовые заказы.',
  };
  return (code && messages[code]) || apiErrorMessage(error);
}
export function createCheckoutIntent(holdId: number, ownerVersion: number, key = crypto.randomUUID()) {
  return Object.freeze({ holdId, key, ownerVersion, validFor: (version: number) => version === ownerVersion });
}
export function uncertainCheckoutError(error: unknown) {
  const value = error as { statusCode?: number; status?: number; response?: { status?: number } };
  const status = value?.statusCode ?? value?.status ?? value?.response?.status;
  return !status || status >= 500;
}
