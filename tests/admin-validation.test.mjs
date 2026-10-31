import test from "node:test";
import assert from "node:assert/strict";
import {
  adminResources,
  buildAdminPayload,
  toLocalDateTime,
  resolveRelationID,
} from "../app/features/admin/resources.ts";
const resource = (key) => adminResources.find((item) => item.key === key);
const trip = {
  bus_id: "12",
  driver_id: "34",
  start_time: "2026-11-01T10:00",
  end_time: "2026-11-01T11:00",
  status: "scheduled",
  base_price: "0",
};

test("trip payload preserves distinct bus and driver identifiers and converts local time to RFC3339", () => {
  const { payload, errors } = buildAdminPayload(resource("trips"), trip);
  assert.deepEqual(errors, {});
  assert.equal(payload.bus_id, 12);
  assert.equal(payload.driver_id, 34);
  assert.equal(payload.base_price, 0);
  assert.equal(payload.start_time, new Date(trip.start_time).toISOString());
  assert.equal(
    toLocalDateTime(payload.start_time).slice(0, 16),
    trip.start_time,
  );
});
test("trip validation rejects unsupported status, blank relation, negative price and reverse schedule", () => {
  const { errors } = buildAdminPayload(resource("trips"), {
    ...trip,
    bus_id: "",
    status: "unknown",
    base_price: "-1",
    end_time: "2026-11-01T09:00",
  });
  for (const key of ["bus_id", "status", "base_price", "end_time"])
    assert.ok(errors[key]);
});
test("coordinates preserve zero and enforce geographic bounds and finite numbers", () => {
  const values = {
    name: "Остановка",
    address: "Адрес",
    latitude: "0",
    longitude: "0",
  };
  assert.deepEqual(buildAdminPayload(resource("stops"), values), {
    payload: { name: "Остановка", address: "Адрес", latitude: 0, longitude: 0, city_id: 0, timezone: "" },
    errors: {},
  });
  for (const latitude of ["", "91", "-91", "Infinity", "NaN"])
    assert.ok(
      buildAdminPayload(resource("stops"), { ...values, latitude }).errors
        .latitude,
    );
  assert.ok(
    buildAdminPayload(resource("stops"), { ...values, longitude: "181" }).errors
      .longitude,
  );
});
test("trip stop accepts simultaneous arrival/departure but rejects reversed times and fractional order", () => {
  const values = {
    trip_id: "2",
    stop_id: "7",
    arrival_time: trip.start_time,
    departure_time: trip.start_time,
    stop_order: "1",
    price_to_next: "0",
  };
  assert.deepEqual(buildAdminPayload(resource("tripStops"), values).errors, {});
  const { errors } = buildAdminPayload(resource("tripStops"), {
    ...values,
    stop_order: "1.5",
    departure_time: "2026-11-01T09:00",
  });
  assert.ok(errors.stop_order);
  assert.ok(errors.departure_time);
});
test("user updates omit blank passwords and validate bcrypt byte limit without trimming passwords", () => {
  const values = { name: "Имя", email: "test@example.test", password: "" };
  const { payload, errors } = buildAdminPayload(
    resource("users"),
    values,
    true,
  );
  assert.deepEqual(errors, {});
  assert.equal(Object.hasOwn(payload, "password"), false);
  assert.ok(buildAdminPayload(resource("users"), values).errors.password);
  assert.ok(
    buildAdminPayload(resource("users"), {
      ...values,
      password: "я".repeat(37),
    }).errors.password,
  );
  assert.equal(
    buildAdminPayload(resource("users"), { ...values, password: " secret " })
      .payload.password,
    " secret ",
  );
});
test("datetime validation rejects normalized invalid dates rather than changing the date silently", () => {
  const { errors } = buildAdminPayload(resource("trips"), {
    ...trip,
    start_time: "2026-02-31T10:00",
  });
  assert.ok(errors.start_time);
});

test("relation edit values preserve nested identity IDs and require explicit choice for duplicate names", () => {
  const busField = resource("trips").fields.find(
    (item) => item.key === "bus_id",
  );
  const driverField = resource("trips").fields.find(
    (item) => item.key === "driver_id",
  );
  const statusField = resource("drivers").fields.find(
    (item) => item.key === "status",
  );
  const categoryField = resource("buses").fields.find(
    (item) => item.key === "category_id",
  );
  assert.equal(
    resolveRelationID(busField, { id: 10, bus: { id: 12 } }, {}),
    "12",
  );
  assert.equal(
    resolveRelationID(driverField, { id: 10, driver: { id: 34 } }, {}),
    "34",
  );
  assert.equal(
    resolveRelationID(
      statusField,
      { status: "Готов" },
      { driverStatuses: [{ id: 4, name: "Готов" }] },
    ),
    "4",
  );
  assert.equal(
    resolveRelationID(
      categoryField,
      { category: "Туристический" },
      {
        busCategories: [
          { id: 2, name: "Туристический" },
          { id: 7, name: "Туристический" },
        ],
      },
    ),
    "",
  );
  assert.equal(
    resolveRelationID(
      statusField,
      { status: "Удалённый статус" },
      { driverStatuses: [] },
    ),
    "",
  );
});

test("numeric Vue input models normalize before string validation", () => {
  const bus = resource("buses");
  const result = buildAdminPayload(bus, {
    license_plate: "TEST123",
    brand: "Test Bus",
    capacity: 48,
    category_id: "1",
    status_id: "1",
  });
  assert.deepEqual(result.errors, {});
  assert.equal(result.payload.capacity, 48);
  const stop = buildAdminPayload(resource("stops"), {
    name: "Zero",
    address: "Equator",
    latitude: 0,
    longitude: 0,
  });
  assert.deepEqual(stop.errors, {});
  assert.equal(stop.payload.latitude, 0);
});
