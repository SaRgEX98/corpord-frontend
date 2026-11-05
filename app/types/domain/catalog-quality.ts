export interface QualityStop {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city_id: number | null;
  city_name: string | null;
  region: string | null;
  timezone: string | null;
  version: string;
  has_trips: boolean;
}
export interface QualitySummary {
  unmapped_stops: number;
  protected_unmapped_stops: number;
}
export interface QualityAudit {
  id: number;
  actor_id: number;
  created_at: string;
  reason: string;
  before: { city_id: number | null; timezone: string | null };
  after: { city_id: number | null; timezone: string | null };
}
