<script setup lang="ts">
import {
  BusFront,
  UsersRound,
  MapPin,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
} from "lucide-vue-next";
import type { Bus, Driver, Stop } from "~/types/domain/transport";
import { apiErrorMessage } from "~/utils/api-errors";
const props = defineProps<{ kind: "buses" | "drivers" | "stops" }>();
const api = useTransportApi();
const settings = {
  buses: {
    title: "Автопарк",
    subtitle:
      "Автобусы для ваших маршрутов. Узнайте вместимость, категорию и статус транспорта.",
    eyebrow: "ТРАНСПОРТ ДЛЯ ПОЕЗДКИ",
    icon: BusFront,
    singular: "Автобус",
  },
  drivers: {
    title: "Водители",
    subtitle:
      "Люди за рулём ваших поездок. Контактная информация и актуальные статусы.",
    eyebrow: "КОМАНДА В ДВИЖЕНИИ",
    icon: UsersRound,
    singular: "Водитель",
  },
  stops: {
    title: "Остановки",
    subtitle:
      "Точки отправления и прибытия. Найдите нужный адрес и координаты остановки.",
    eyebrow: "ТОЧКИ ВАШЕГО МАРШРУТА",
    icon: MapPin,
    singular: "Остановка",
  },
};
const config = computed(() => settings[props.kind]);
const {
  data: records,
  pending,
  error,
  refresh,
} = await useAsyncData(
  `public-${props.kind}`,
  async (): Promise<(Bus | Driver | Stop)[]> => {
    if (props.kind === "buses") return api.buses.list();
    if (props.kind === "drivers") return api.drivers.list();
    return api.stops.list();
  },
  { default: () => [] },
);
const query = ref("");
const status = ref("");
const category = ref("");
function title(record: Bus | Driver | Stop) {
  if ("brand" in record) return record.brand;
  if ("first_name" in record)
    return `${record.last_name} ${record.first_name} ${record.middle_name || ""}`.trim();
  return record.name;
}
function recordStatus(record: Bus | Driver | Stop) {
  return "status" in record ? record.status : "";
}
const statuses = computed(() => [
  ...new Set(records.value.map(recordStatus).filter(Boolean)),
]);
const categories = computed(() => [
  ...new Set(
    records.value
      .filter((r): r is Bus => "brand" in r)
      .map((r) => r.category)
      .filter(Boolean),
  ),
]);
const filtered = computed(() =>
  records.value.filter((record) => {
    const haystack = [
      title(record),
      "license_plate" in record ? record.license_plate : "",
      "address" in record ? record.address : "",
      "phone_number" in record ? record.phone_number : "",
    ]
      .join(" ")
      .toLocaleLowerCase("ru");
    return (
      (!query.value ||
        haystack.includes(query.value.trim().toLocaleLowerCase("ru"))) &&
      (!status.value || recordStatus(record) === status.value) &&
      (!category.value ||
        ("category" in record && record.category === category.value))
    );
  }),
);
const errorMessage = computed(() =>
  error.value ? apiErrorMessage(error.value) : null,
);
useHead({ title: computed(() => config.value.title) });
</script>
<template>
  <div class="container-page">
    <div class="page-heading">
      <div>
        <p class="page-eyebrow">{{ config.eyebrow }}</p>
        <h1 class="page-title">{{ config.title }}</h1>
        <p class="page-description">{{ config.subtitle }}</p>
      </div>
      <span class="resource-title-icon"
        ><component :is="config.icon" :size="34" :stroke-width="1.3"
      /></span>
    </div>
    <div class="resource-toolbar panel">
      <label class="resource-search"
        ><Search :size="17" /><input
          v-model="query"
          :placeholder="
            kind === 'stops'
              ? 'Название или адрес остановки'
              : kind === 'buses'
                ? 'Марка или госномер автобуса'
                : 'Имя или телефон водителя'
          "
          :aria-label="`Поиск: ${config.title.toLowerCase()}`" /></label
      ><select
        v-if="categories.length"
        v-model="category"
        class="input toolbar-select"
        aria-label="Категория автобуса"
      >
        <option value="">Все категории</option>
        <option v-for="item in categories" :key="item" :value="item">
          {{ item }}
        </option></select
      ><select
        v-if="statuses.length"
        v-model="status"
        class="input toolbar-select"
        aria-label="Статус"
      >
        <option value="">Все статусы</option>
        <option v-for="item in statuses" :key="item" :value="item">
          {{ item }}
        </option>
      </select>
    </div>
    <p v-if="!pending && !error" class="result-count">
      Найдено: {{ filtered.length }}
    </p>
    <TransportDataState
      :pending="pending"
      :error="errorMessage"
      :empty="!filtered.length"
      :title="
        query || status || category ? 'Ничего не найдено' : 'Каталог пока пуст'
      "
      :description="
        query || status || category
          ? 'Измените запрос или фильтры.'
          : 'Записи появятся здесь после добавления.'
      "
      @retry="refresh"
    />
    <div v-if="!pending && !error" class="resource-grid">
      <NuxtLink
        v-for="record in filtered"
        :key="record.id"
        :to="`/${kind}/${record.id}`"
        class="resource-card panel"
        ><div class="resource-card-top">
          <div class="resource-icon">
            <component :is="config.icon" :size="27" :stroke-width="1.4" />
          </div>
          <span v-if="recordStatus(record)" class="badge">{{
            recordStatus(record)
          }}</span
          ><span v-else class="badge">№ {{ record.id }}</span>
        </div>
        <h2>{{ title(record) }}</h2>
        <template v-if="'brand' in record"
          ><p class="resource-subtitle">{{ record.license_plate }}</p>
          <div class="resource-facts">
            <span><UsersRound :size="13" />{{ record.capacity }} мест</span
            ><span>{{ record.category }}</span>
          </div></template
        ><template v-else-if="'first_name' in record"
          ><p class="resource-subtitle">Водитель № {{ record.id }}</p>
          <div class="resource-facts">
            <span>{{ record.phone_number }}</span>
          </div></template
        ><template v-else
          ><p class="resource-subtitle stop-address">{{ record.address }}</p>
          <div class="resource-facts">
            <span
              >{{ record.latitude.toFixed(4) }},
              {{ record.longitude.toFixed(4) }}</span
            >
          </div></template
        >
        <div class="resource-card-footer">
          <span>Подробнее</span><ArrowUpRight :size="16" /></div
      ></NuxtLink>
    </div>
  </div>
</template>
<style scoped>
.resource-title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  background: var(--muted);
  border-radius: 20px;
  color: var(--primary);
}
.resource-toolbar {
  padding: 15px;
  display: flex;
  gap: 12px;
}
.resource-search {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  padding: 0 8px;
  color: var(--muted-foreground);
  min-width: 0;
}
.resource-search input {
  border: 0;
  background: none;
  color: var(--foreground);
  font-size: 12px;
  width: 100%;
  min-height: 42px;
  min-width: 0;
}
.resource-search svg {
  flex-shrink: 0;
}
.toolbar-select {
  width: 170px;
  font-size: 11px;
  background: var(--background);
}
.result-count {
  font-size: 11px;
  color: var(--muted-foreground);
  margin: 24px 0 17px;
}
.resource-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.resource-card {
  padding: 23px;
  transition:
    border-color 0.15s,
    transform 0.15s;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.resource-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.resource-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 24px;
}
.resource-icon {
  padding: 13px;
  border-radius: 13px;
  background: var(--muted);
  color: var(--primary);
}
.resource-card h2 {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: -0.025em;
}
.resource-subtitle {
  font-size: 11px;
  color: var(--muted-foreground);
  margin-top: 7px;
  line-height: 1.6;
}
.stop-address {
  min-height: 36px;
}
.resource-facts {
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 10px;
  color: var(--muted-foreground);
}
.resource-facts span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.resource-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  font-weight: 650;
  color: var(--primary);
  border-top: 1px solid var(--border);
  padding-top: 17px;
  margin-top: 22px;
}
.resource-card .badge {
  font-size: 9px;
  max-width: 130px;
  overflow-wrap: anywhere;
}
@media (max-width: 1250px) {
  .resource-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .resource-toolbar {
    flex-wrap: wrap;
  }
  .resource-search {
    flex-basis: 100%;
  }
  .toolbar-select {
    flex: 1;
  }
}
@media (max-width: 600px) {
  .resource-title-icon {
    display: none;
  }
  .resource-grid {
    grid-template-columns: 1fr;
    gap: 13px;
  }
  .resource-card {
    padding: 22px;
  }
  .resource-card-top {
    margin-bottom: 18px;
  }
  .resource-toolbar {
    padding: 11px;
  }
  .toolbar-select {
    min-width: 120px;
  }
  .resource-facts {
    margin-top: 18px;
  }
}
</style>
