export interface Passenger {
  id: number;
  full_name: string;
  created_at: string;
  updated_at: string;
}
export interface Booking {
  id: number;
  trip_id: number;
  boarding_stop_id: number;
  alighting_stop_id: number;
  boarding_name: string;
  alighting_name: string;
  departure_time: string;
  arrival_time: string;
  timezone: string;
  arrival_timezone: string | null;
  passenger_name: string;
  status: 'held' | 'cancelled' | 'expired';
  seat_number: number;
  amount_minor: number;
  currency: 'RUB';
  is_demo: boolean;
  created_at: string;
  expires_at: string;
  cancelled_at: string | null;
}
export interface Availability {
  trip_id: number;
  boarding_stop_id: number;
  alighting_stop_id: number;
  is_demo: boolean;
  bookable: boolean;
  status: 'available' | 'sold_out' | 'unknown';
  seats: number | null;
  hold_seconds: number;
}
export type HoldInput = {
  trip_id: number; boarding_stop_id: number; alighting_stop_id: number;
} & ({ passenger_id: number; passenger_name?: never } | { passenger_name: string; passenger_id?: never });
export interface PrivatePage<T> { items: T[]; next_cursor: string | null }
