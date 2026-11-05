import type { Booking, HoldInput } from '../types/domain/booking';
import { apiErrorMessage } from './api-errors.ts';
export function effectiveBookingStatus(booking: Pick<Booking, 'status' | 'expires_at'>, now = Date.now()) {
  return booking.status === 'held' && Date.parse(booking.expires_at) <= now ? 'expired' : booking.status;
}
export function holdRemaining(expiresAt: string, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function bookingError(error: unknown) {
  const code = (error as { data?: { code?: string } })?.data?.code;
  const messages: Record<string, string> = {
    sold_out: 'На выбранном участке больше нет свободных мест.',
    hold_limit: 'У вас уже пять активных удержаний. Отмените ненужное в разделе «Мои поездки».',
    idempotency_conflict: 'Параметры этой операции изменились. Проверьте историю удержаний перед новой попыткой.',
    trip_unavailable: 'Рейс уже недоступен. Выберите другое отправление.',
    checkout_in_progress: 'Для удержания уже оформляется тестовый заказ. Откройте заказ, чтобы проверить оплату или отмену.',
    paid_order: 'Место подтверждено тестовой оплатой. Откройте заказ для просмотра статуса.',
    inventory_unavailable: 'Перевозчик пока не предоставил остатки мест. Удержание недоступно.',
  };
  return (code && messages[code]) || apiErrorMessage(error);
}
/** One intent survives a lost response; a new identity can never reuse it. */
export function createHoldIntent(input: HoldInput, ownerVersion: number, key = crypto.randomUUID()) {
  const body = Object.freeze({ ...input }) as HoldInput;
  return { key, body, ownerVersion, validFor: (version: number) => version === ownerVersion };
}
