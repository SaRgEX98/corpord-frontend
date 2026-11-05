import type { ApiClient } from './transport.api';
import type { CheckoutDetail, CheckoutStatus, CheckoutSummary } from '../types/domain/checkout';
import type { PrivatePage } from '../types/domain/booking';
function id(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Некорректный идентификатор заказа');
  return value;
}
export function createCheckoutApi(api: ApiClient) {
  return {
    create: (hold: number, key: string, signal?: AbortSignal, sessionVersion?: number) => {
      if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw new Error('Некорректный ключ операции');
      return api<CheckoutDetail>('/me/checkouts', { method: 'POST', body: { hold_id: id(hold) }, headers: { 'Idempotency-Key': key }, signal, sessionVersion });
    },
    list: (status?: CheckoutStatus, cursor?: string, signal?: AbortSignal) => api<PrivatePage<CheckoutSummary>>(`/me/checkouts?${new URLSearchParams({ limit: '30', ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) })}`, { signal }),
    detail: (value: number, signal?: AbortSignal, sessionVersion?: number) => api<CheckoutDetail>(`/me/checkouts/${id(value)}`, { signal, sessionVersion }),
    cancel: (value: number, signal?: AbortSignal, sessionVersion?: number) => api<CheckoutDetail>(`/me/checkouts/${id(value)}/cancel`, { method: 'POST', signal, sessionVersion }),
    reconcile: (value: number, signal?: AbortSignal, sessionVersion?: number) => api<void>(`/me/checkouts/${id(value)}/reconcile`, { method: 'POST', signal, sessionVersion }),
  };
}
