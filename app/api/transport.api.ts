import type {
  Bus,
  BusInput,
  CreatedTrip,
  Driver,
  DriverInput,
  MutationResult,
  NamedEntity,
  NamedEntityInput,
  Stop,
  StopInput,
  Trip,
  TripInput,
  TripStop,
  TripStopInput,
  TripSummary,
  User,
  UserInput,
  UserUpdate,
} from "../types/domain/transport";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  retry?: number;
  sessionVersion?: number;
  body?: object;
}
export interface ApiClient {
  <T>(path: string, options?: ApiRequestOptions): Promise<T>;
}

/** Routes retain Gin's trailing slashes so writes never rely on redirects. */
function resource<
  Read,
  Input extends object,
  Update extends object = Partial<Input>,
  Created = MutationResult,
  Updated = MutationResult,
>(api: ApiClient, readPath: string, writePath = `/admin${readPath}`) {
  const item = (base: string, id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new Error("Некорректный идентификатор записи");
    return `${base.replace(/\/$/, "")}/${id}`;
  };
  return {
    async list(): Promise<Read[]> {
      return (await api<Read[] | null>(readPath)) ?? [];
    },
    get: (id: number) => api<Read>(item(readPath, id)),
    create: (body: Input) => api<Created>(writePath, { method: "POST", body }),
    update: (id: number, body: Update) =>
      api<Updated>(item(writePath, id), { method: "PUT", body }),
    remove: (id: number) =>
      api<void>(item(writePath, id), { method: "DELETE" }),
  };
}

export function createTransportApi(api: ApiClient) {
  const trips = resource<Trip, TripInput, Partial<TripInput>, CreatedTrip>(
    api,
    "/trips/",
  );
  const normalizeTrip = (trip: Trip): Trip => ({
    ...trip,
    stops: trip.stops ?? [],
  });
  return {
    buses: resource<Bus, BusInput>(api, "/bus/"),
    busCategories: resource<
      NamedEntity,
      NamedEntityInput,
      NamedEntityInput,
      MutationResult,
      NamedEntity
    >(api, "/bus/categories/"),
    busStatuses: resource<
      NamedEntity,
      NamedEntityInput,
      NamedEntityInput,
      MutationResult,
      NamedEntity
    >(api, "/bus/statuses/"),
    drivers: resource<Driver, DriverInput, DriverInput>(api, "/driver/"),
    driverStatuses: resource<NamedEntity, NamedEntityInput, NamedEntityInput>(
      api,
      "/driver/status/",
    ),
    stops: resource<Stop, StopInput, Partial<StopInput>, Stop>(api, "/stops/"),
    trips: {
      ...trips,
      async list(): Promise<TripSummary[]> {
        return (await api<TripSummary[] | null>("/trips/")) ?? [];
      },
      async all(): Promise<Trip[]> {
        return ((await api<Trip[] | null>("/trips/all")) ?? []).map(
          normalizeTrip,
        );
      },
      async get(id: number): Promise<Trip> {
        return normalizeTrip(await trips.get(id));
      },
    },
    tripStops: resource<
      TripStop,
      TripStopInput,
      Partial<TripStopInput>,
      TripStop
    >(api, "/trip_stops/"),
    users: resource<User, UserInput, UserUpdate, User, User>(
      api,
      "/admin/users",
      "/admin/users",
    ),
    // Compatibility endpoints have the same admin ACL. There is no legacy PUT.
    legacyUsers: (() => {
      const { update: _update, ...legacy } = resource<
        User,
        UserInput,
        UserUpdate,
        User
      >(api, "/users", "/users");
      return legacy;
    })(),
  };
}
export type TransportApi = ReturnType<typeof createTransportApi>;
