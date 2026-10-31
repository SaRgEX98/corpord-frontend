export interface LocationSuggestion {
  id: string; type: 'city' | 'stop'; name: string; region: string; timezone: string | null;
  served: boolean; rank_reason: 'match' | 'connected' | 'popular'; address: string;
  latitude: number | null; longitude: number | null;
}
export interface RoutePrice { amount_minor: number; currency: 'RUB'; rule_version: string; calculated_at: string }
export interface RouteResult {
  trip_id: number; boarding_stop_id: number; alighting_stop_id: number;
  boarding_name: string; alighting_name: string; departure_time: string; arrival_time: string;
  timezone: string; arrival_timezone: string; status: string; price: RoutePrice | null;
  availability: { status: 'unknown' | 'available' | 'sold_out'; seats: number | null };
}
export interface CalendarDay { date: string; status: 'unknown' | 'no_trips' | 'available' | 'sold_out'; min_price_minor: number | null; trip_count: number }
export interface RouteCalendar { timezone: string; month: string; calculated_at: string; rule_version: string; days: CalendarDay[] }
export interface RouteFilters { from_id: string; to_id: string; date: string; passengers: number; sort: 'departure' | 'price' }
