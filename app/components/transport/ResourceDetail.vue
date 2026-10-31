<script setup lang="ts">
import {
  ArrowLeft,
  BusFront,
  UserRound,
  MapPin,
  ArrowUpRight,
} from "lucide-vue-next";
import type { Bus, Driver, Stop } from "~/types/domain/transport";
import { apiErrorMessage } from "~/utils/api-errors";
import { displayDate } from "~/utils/display";
const props = defineProps<{ kind: "buses" | "drivers" | "stops" }>();
const route = useRoute();
const api = useTransportApi();
const id = computed(() => Number(route.params.id));
const {
  data: record,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `public-${props.kind}-${id.value}`,
  async (): Promise<Bus | Driver | Stop> => {
    if (props.kind === "buses") return api.buses.get(id.value);
    if (props.kind === "drivers") return api.drivers.get(id.value);
    return api.stops.get(id.value);
  },
);
const titles = { buses: "Автопарк", drivers: "Водители", stops: "Остановки" };
const title = computed(() => {
  const r = record.value;
  if (!r) return titles[props.kind];
  return "brand" in r
    ? r.brand
    : "first_name" in r
      ? `${r.last_name} ${r.first_name} ${r.middle_name || ""}`.trim()
      : r.name;
});
useHead({ title });
const errorMessage = computed(() =>
  error.value ? apiErrorMessage(error.value) : null,
);
</script>
<template>
  <div class="container-page">
    <NuxtLink :to="`/${kind}`" class="back-link"
      ><ArrowLeft :size="15" />{{ titles[kind] }}</NuxtLink
    ><TransportDataState
      :pending="pending"
      :error="errorMessage"
      @retry="refresh"
    /><template v-if="record && !pending && !error"
      ><div class="page-heading">
        <div>
          <p class="page-eyebrow">
            {{
              kind === "buses"
                ? "ТРАНСПОРТ"
                : kind === "drivers"
                  ? "КОМАНДА"
                  : "ТОЧКА МАРШРУТА"
            }}
            № {{ record.id }}
          </p>
          <h1 class="page-title">{{ title }}</h1>
          <p v-if="'address' in record" class="page-description">
            {{ record.address }}
          </p>
        </div>
        <span v-if="'status' in record" class="badge badge-blue">{{
          record.status
        }}</span>
      </div>
      <div class="detail-grid">
        <section class="panel card-pad">
          <div class="detail-resource-header">
            <span class="large-resource-icon"
              ><BusFront
                v-if="kind === 'buses'"
                :size="36"
                :stroke-width="1.2" /><UserRound
                v-else-if="kind === 'drivers'"
                :size="36"
                :stroke-width="1.2" /><MapPin
                v-else
                :size="36"
                :stroke-width="1.2"
            /></span>
            <div>
              <h2 class="section-label">
                {{
                  kind === "buses"
                    ? "Об автобусе"
                    : kind === "drivers"
                      ? "Информация о водителе"
                      : "Об остановке"
                }}
              </h2>
              <p>Данные из каталога Corpord</p>
            </div>
          </div>
          <dl v-if="'brand' in record" class="info-list">
            <div>
              <dt>Марка</dt>
              <dd>{{ record.brand }}</dd>
            </div>
            <div>
              <dt>Государственный номер</dt>
              <dd>{{ record.license_plate }}</dd>
            </div>
            <div>
              <dt>Вместимость</dt>
              <dd>{{ record.capacity }} мест</dd>
            </div>
            <div>
              <dt>Категория</dt>
              <dd>{{ record.category }}</dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{{ record.status }}</dd>
            </div>
            <div>
              <dt>Номер в каталоге</dt>
              <dd>{{ record.id }}</dd>
            </div>
          </dl>
          <dl v-else-if="'first_name' in record" class="info-list">
            <div>
              <dt>Фамилия</dt>
              <dd>{{ record.last_name }}</dd>
            </div>
            <div>
              <dt>Имя</dt>
              <dd>{{ record.first_name }}</dd>
            </div>
            <div>
              <dt>Отчество</dt>
              <dd>{{ record.middle_name || "Не указано" }}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>{{ record.phone_number }}</dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{{ record.status }}</dd>
            </div>
          </dl>
          <dl v-else class="info-list">
            <div>
              <dt>Название</dt>
              <dd>{{ record.name }}</dd>
            </div>
            <div>
              <dt>Адрес</dt>
              <dd>{{ record.address }}</dd>
            </div>
            <div>
              <dt>Широта</dt>
              <dd>{{ record.latitude }}</dd>
            </div>
            <div>
              <dt>Долгота</dt>
              <dd>{{ record.longitude }}</dd>
            </div>
            <div>
              <dt>Добавлена</dt>
              <dd>{{ displayDate(record.created_at) }}</dd>
            </div>
            <div>
              <dt>Обновлена</dt>
              <dd>{{ displayDate(record.updated_at) }}</dd>
            </div>
          </dl>
        </section>
        <aside class="panel card-pad resource-aside">
          <MapPin :size="26" :stroke-width="1.5" />
          <h2>Продолжим путешествие?</h2>
          <p>Посмотрите расписание рейсов, остановки и детали маршрутов.</p>
          <NuxtLink to="/trips" class="btn btn-primary"
            >К расписанию <ArrowUpRight :size="14"
          /></NuxtLink>
        </aside></div
    ></template>
  </div>
</template>
<style scoped>
.detail-resource-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
}
.large-resource-icon {
  padding: 15px;
  border-radius: 16px;
  color: var(--primary);
  background: var(--muted);
}
.detail-resource-header p {
  font-size: 11px;
  color: var(--muted-foreground);
  margin-top: 8px;
}
.resource-aside {
  align-self: start;
}
.resource-aside > svg {
  color: var(--primary);
  margin-bottom: 25px;
}
.resource-aside h2 {
  font-size: 21px;
  font-weight: 700;
  line-height: 1.4;
}
.resource-aside p {
  font-size: 12px;
  color: var(--muted-foreground);
  line-height: 1.8;
  margin-top: 13px;
}
.resource-aside .btn {
  margin-top: 25px;
  width: 100%;
}
</style>
