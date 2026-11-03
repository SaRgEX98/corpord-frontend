import type { ApiClient } from './transport.api';
import type { LocationSuggestion, RouteCalendar, RouteFilters, RouteResult } from '../types/domain/routes';
function query(values: Record<string, string | number | undefined>) {
  return new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([key,value]) => [key, String(value)])).toString();
}
export function createRoutesApi(api: ApiClient) {
  return {
    suggest: (q: string, origin_id?: string, signal?: AbortSignal, region?:string) => api<{items: LocationSuggestion[]}>(`/locations/suggest?${query({q, origin_id, region, limit: 8})}`, {signal}),
    location: (id: string) => api<LocationSuggestion>(`/locations/${encodeURIComponent(id)}`),
    stops: (id: string) => api<{items: LocationSuggestion[]}>(`/locations/${encodeURIComponent(id)}/stops`),
    stopPage: (city_id: number, q = '', cursor?:string, signal?:AbortSignal) => api<{items: Array<{id:number;name:string;address:string;latitude:number|null;longitude:number|null;effective_timezone:string|null}>;next_cursor:string|null}>(`/catalog/stops?${query({city_id,q,cursor,limit:20})}`, {signal}),
    search: (filters: RouteFilters, cursor?: string, signal?:AbortSignal) => api<{items: RouteResult[]; next_cursor: string | null}>(`/trips/search?${query({...filters, cursor, limit: 20})}`,{signal}),
    calendar: (filters: Pick<RouteFilters, 'from_id' | 'to_id' | 'passengers'>, month: string, signal?:AbortSignal) => api<RouteCalendar>(`/trips/calendar?${query({...filters, month})}`,{signal}),
    quote: (tripId: number, boarding_stop_id: number, alighting_stop_id: number) => api<RouteResult & {expires_at: string | null; reserves_seat: false}>(`/trips/${tripId}/quote`, { method: 'POST', body: { boarding_stop_id, alighting_stop_id, passengers: 1 } }),
  };
}
