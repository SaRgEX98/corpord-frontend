/** Read models follow the Go JSON contract; input models carry relation IDs. */
export type { User, UserInput, UserUpdate } from "./user";

export interface NamedEntity {
  id: number;
  name: string;
}
export interface NamedEntityInput {
  name: string;
}
export interface MutationResult {
  message: string;
}

export interface Bus {
  id: number;
  license_plate: string;
  brand: string;
  capacity: number;
  category: string;
  status: string;
}
export interface BusInput {
  license_plate: string;
  brand: string;
  capacity: number;
  category_id: number;
  status_id: number;
}
export interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  phone_number: string;
  status: string;
}
export interface DriverInput {
  first_name: string;
  last_name: string;
  middle_name?: string;
  phone_number: string;
  status: number;
}
export interface StopInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}
export interface Stop extends StopInput {
  id: number;
  created_at?: string;
  updated_at?: string;
}
export type TripStatus =
  | "scheduled"
  | "boarding"
  | "departed"
  | "in_transit"
  | "arrived"
  | "completed"
  | "cancelled"
  | "delayed";
export interface TripSummary {
  trip_id: number;
  license_plate: string;
  brand: string;
  driver_name: string;
  start_stop: string;
  end_stop: string;
  start_time: string;
  end_time: string;
  base_price: number;
}
export interface TripInput {
  bus_id: number;
  driver_id: number;
  start_time: string;
  end_time: string;
  status: TripStatus;
  base_price: number;
}
export interface CreatedTrip extends TripInput {
  id: number;
  created_at: string;
  updated_at: string;
}
export interface Trip {
  id: number;
  bus: Bus;
  driver: Driver;
  start_time: string;
  end_time: string | null;
  status: TripStatus;
  base_price: number;
  stops: TripStopDetail[];
  created_at: string;
  updated_at: string;
}
export interface TripStopInput {
  trip_id: number;
  stop_id: number;
  arrival_time: string;
  departure_time: string;
  stop_order: number;
  price_to_next: number;
}
export interface TripStop extends TripStopInput {
  id: number;
}
export interface TripStopDetail extends TripStop {
  stop: Stop;
}
