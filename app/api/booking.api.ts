import type { ApiClient } from './transport.api';
import type { Availability, Booking, HoldInput, Passenger, PrivatePage } from '../types/domain/booking';
function id(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Некорректный идентификатор записи');
  return value;
}
function page(cursor?: string) { return new URLSearchParams({ limit: '30', ...(cursor ? { cursor } : {}) }); }
export function createBookingApi(api: ApiClient) {
  return {
    availability: (trip: number, boarding: number, alighting: number, signal?: AbortSignal) =>
      api<Availability>(`/trips/${id(trip)}/availability?${new URLSearchParams({ boarding_stop_id: String(id(boarding)), alighting_stop_id: String(id(alighting)) })}`, { signal }),
    hold: (body: HoldInput, key: string, signal?: AbortSignal, sessionVersion?: number) => {
      if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw new Error('Некорректный ключ операции');
      return api<Booking>('/me/bookings', { method: 'POST', body, headers: { 'Idempotency-Key': key }, signal, sessionVersion });
    },
    bookings: (cursor?: string, signal?: AbortSignal) => api<PrivatePage<Booking>>(`/me/bookings?${page(cursor)}`, { signal }),
    booking: (value: number, signal?: AbortSignal) => api<Booking>(`/me/bookings/${id(value)}`, { signal }),
    cancel: (value: number, signal?: AbortSignal, sessionVersion?: number) => api<Booking>(`/me/bookings/${id(value)}/cancel`, { method: 'POST', signal, sessionVersion }),
    passengers: (cursor?: string, signal?: AbortSignal) => api<PrivatePage<Passenger>>(`/me/passengers?${page(cursor)}`, { signal }),
    savePassenger: (full_name: string, value?: number, signal?: AbortSignal, sessionVersion?: number) => api<Passenger>(value ? `/me/passengers/${id(value)}` : '/me/passengers', { method: value ? 'PUT' : 'POST', body: { full_name }, signal, sessionVersion }),
    removePassenger: (value: number, signal?: AbortSignal, sessionVersion?: number) => api<void>(`/me/passengers/${id(value)}`, { method: 'DELETE', signal, sessionVersion }),
  };
}
