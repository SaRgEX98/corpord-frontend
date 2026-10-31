<script setup lang="ts">
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  Search,
  CalendarDays,
  BusFront,
  Clock3,
  MapPin,
  X,
} from "lucide-vue-next";
import { apiErrorMessage } from "~/utils/api-errors";
import {
  displayDate,
  displayTime,
  displayDuration,
  displayPrice,
} from "~/utils/display";
const props = defineProps<{ home?: boolean }>();
const api = useTransportApi();
const {
  data: trips,
  pending,
  error,
  refresh,
} = await useAsyncData("public-trips", () => api.trips.list(), {
  default: () => [],
});
const route = useRoute();
const from = ref(typeof route.query.from === "string" ? route.query.from : "");
const to = ref(typeof route.query.to === "string" ? route.query.to : "");
const date = ref(typeof route.query.date === "string" ? route.query.date : "");
const sort = ref("departure");
const applied = reactive({ from: from.value, to: to.value, date: date.value });
const filtered = computed(() => {
  const result = trips.value.filter(
    (trip) =>
      (!applied.from ||
        (trip.start_stop || "")
          .toLocaleLowerCase("ru")
          .includes(applied.from.toLocaleLowerCase("ru"))) &&
      (!applied.to ||
        (trip.end_stop || "")
          .toLocaleLowerCase("ru")
          .includes(applied.to.toLocaleLowerCase("ru"))) &&
      (!applied.date || localDate(trip.start_time) === applied.date),
  );
  return [...result].sort((a, b) =>
    sort.value === "price"
      ? a.base_price - b.base_price
      : Date.parse(a.start_time) - Date.parse(b.start_time),
  );
});
const hasFilters = computed(
  () => !!(applied.from || applied.to || applied.date),
);
const origins = computed(() => [
  ...new Set(trips.value.map((t) => t.start_stop).filter(Boolean)),
]);
const destinations = computed(() => [
  ...new Set(trips.value.map((t) => t.end_stop).filter(Boolean)),
]);
function localDate(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function search() {
  applied.from = from.value.trim();
  applied.to = to.value.trim();
  applied.date = date.value;
}
function reset() {
  from.value = "";
  to.value = "";
  date.value = "";
  search();
}
function swap() {
  [from.value, to.value] = [to.value, from.value];
}
const errorMessage = computed(() =>
  error.value ? apiErrorMessage(error.value) : null,
);
</script>
<template>
  <div class="container-page trip-page">
    <div class="page-heading">
      <div>
        <p class="page-eyebrow">ВАШ СЛЕДУЮЩИЙ МАРШРУТ</p>
        <h1 class="page-title">
          {{ home ? "Давайте отправимся в путь." : "Рейсы и маршруты" }}
        </h1>
        <p class="page-description">
          Расписание, остановки и транспорт — всё, чтобы спланировать поездку.
        </p>
      </div>
      <div class="heading-stamp">
        <ArrowUpRight :size="36" :stroke-width="1.1" /><span
          >Всё начинается<br />с движения</span
        >
      </div>
    </div>
    <section class="journey-banner">
      <div class="banner-copy">
        <span class="banner-label"><span></span> ПОЕЗДКИ В ВАШЕМ РИТМЕ</span>
        <h2>Ближе к тому,<br />что важно.</h2>
        <p>
          Найдите свой маршрут и узнайте<br class="desktop-break" />
          все детали до отправления.
        </p>
        <a href="#trip-search" class="banner-link"
          >Выбрать направление <ArrowUpRight :size="16"
        /></a>
      </div>
      <div class="route-art" aria-hidden="true">
        <div class="art-orbit orbit-one"></div>
        <div class="art-orbit orbit-two"></div>
        <div class="art-orbit orbit-three"></div>
        <div class="art-stop stop-one"><span></span>Отправление</div>
        <div class="art-stop stop-two"><span></span>Новая история</div>
        <div class="art-bus"><BusFront :size="60" :stroke-width="1.1" /></div>
        <div class="art-route-line"></div>
        <span class="art-cross cross-one">+</span
        ><span class="art-cross cross-two">+</span
        ><span class="art-coordinate">55°45′ N &nbsp; 37°37′ E</span>
      </div>
    </section>
    <form id="trip-search" class="search-panel panel" @submit.prevent="search">
      <label class="search-field"
        ><span><MapPin :size="13" /> ОТКУДА</span
        ><input
          v-model="from"
          list="trip-origins"
          placeholder="Город или остановка"
          aria-label="Место отправления" /><datalist id="trip-origins">
          <option
            v-for="origin in origins"
            :key="origin"
            :value="origin"
          /></datalist></label
      ><button
        type="button"
        class="swap-button"
        aria-label="Поменять направления местами"
        @click="swap"
      >
        <ArrowLeftRight :size="17" /></button
      ><label class="search-field"
        ><span><MapPin :size="13" /> КУДА</span
        ><input
          v-model="to"
          list="trip-destinations"
          placeholder="Город или остановка"
          aria-label="Место прибытия" /><datalist id="trip-destinations">
          <option
            v-for="destination in destinations"
            :key="destination"
            :value="destination"
          /></datalist></label
      ><label class="search-field date-field"
        ><span><CalendarDays :size="13" /> ДАТА ОТПРАВЛЕНИЯ</span
        ><input
          v-model="date"
          type="date"
          aria-label="Дата отправления" /></label
      ><button class="btn btn-primary search-button" type="submit">
        <Search :size="17" /> Найти рейс
      </button>
    </form>
    <div class="results-heading">
      <div>
        <h2>
          Доступные рейсы
          <span v-if="!pending && !error">{{ filtered.length }}</span>
        </h2>
        <p>Время указано в часовом поясе вашего устройства.</p>
      </div>
      <label class="sort-control"
        >Сначала
        <select v-model="sort" aria-label="Сортировка рейсов">
          <option value="departure">по отправлению</option>
          <option value="price">по стоимости</option>
        </select></label
      >
    </div>
    <button v-if="hasFilters" class="clear-filter" @click="reset">
      <X :size="13" />Сбросить фильтры
    </button>
    <TransportDataState
      :pending="pending"
      :error="errorMessage"
      :empty="!filtered.length"
      :title="
        hasFilters ? 'Рейсы не найдены' : 'Расписание пока не опубликовано'
      "
      :description="
        hasFilters
          ? 'Попробуйте другое направление или дату отправления.'
          : 'Как только появятся рейсы, вы увидите их здесь.'
      "
      @retry="refresh"
    />
    <div v-if="!pending && !error && filtered.length" class="trip-list">
      <article
        v-for="trip in filtered"
        :key="trip.trip_id"
        class="trip-card panel"
      >
        <div class="trip-main">
          <div class="trip-meta">
            <span class="badge badge-blue">Рейс № {{ trip.trip_id }}</span
            ><span class="trip-date"
              ><CalendarDays :size="12" />{{
                displayDate(trip.start_time)
              }}</span
            >
          </div>
          <div class="trip-route">
            <div class="trip-endpoint">
              <strong>{{ displayTime(trip.start_time) }}</strong
              ><span>{{ trip.start_stop || "Отправление не указано" }}</span>
            </div>
            <div class="trip-duration">
              <span>{{ displayDuration(trip.start_time, trip.end_time) }}</span>
              <div><i></i><span></span><ArrowRight :size="13" /></div>
              <small>Время в пути</small>
            </div>
            <div class="trip-endpoint">
              <strong>{{ displayTime(trip.end_time) }}</strong
              ><span>{{ trip.end_stop || "Прибытие не указано" }}</span>
            </div>
          </div>
          <div class="trip-bottom">
            <span
              ><BusFront :size="14" />{{ trip.brand }}
              <span class="plate">{{ trip.license_plate }}</span></span
            ><span v-if="trip.driver_name">{{ trip.driver_name }}</span>
          </div>
        </div>
        <div class="trip-price">
          <span>Базовая стоимость</span
          ><strong>{{ displayPrice(trip.base_price) }} <small>₽</small></strong
          ><NuxtLink :to="`/trips/${trip.trip_id}`" class="btn btn-primary"
            >Подробнее <ArrowUpRight :size="15"
          /></NuxtLink>
        </div>
      </article>
    </div>
    <div class="catalog-note">
      <Clock3 :size="17" />
      <p>
        Изучите маршрут перед поездкой. В карточке рейса — остановки,
        расписание, автобус и водитель.
      </p>
    </div>
  </div>
</template>

<style scoped>
.page-heading {
  margin-bottom: 28px;
}
.heading-stamp {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 4px;
}
.heading-stamp > span {
  font-size: 10px;
  line-height: 1.6;
  color: var(--muted-foreground);
}
.journey-banner {
  display: flex;
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: #dfeaf0;
  min-height: 270px;
  color: #172c40;
}
.banner-copy {
  position: relative;
  z-index: 1;
  padding: 32px 36px;
}
.banner-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.12em;
}
.banner-label > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #30765e;
}
.banner-copy h2 {
  font-size: 40px;
  font-weight: 750;
  line-height: 1.12;
  margin-top: 18px;
  letter-spacing: -1.8px;
}
.banner-copy p {
  font-size: 11px;
  line-height: 1.7;
  color: #5b6f7e;
  margin-top: 13px;
}
.banner-link {
  display: inline-flex;
  align-items: center;
  gap: 22px;
  font-size: 10px;
  font-weight: 750;
  margin-top: 20px;
}
.route-art {
  position: absolute;
  right: 0;
  top: 0;
  width: 53%;
  height: 100%;
  overflow: hidden;
}
.art-orbit {
  position: absolute;
  border: 1px solid #acc3cb60;
  border-radius: 50%;
  width: 400px;
  height: 400px;
  left: 28px;
  top: -60px;
  transform: rotate(-28deg);
}
.orbit-two {
  width: 570px;
  height: 570px;
  left: -55px;
  top: -146px;
}
.orbit-three {
  width: 230px;
  height: 230px;
  left: 113px;
  top: 25px;
}
.art-bus {
  position: absolute;
  top: 100px;
  left: 43%;
  background: #233f55;
  color: #e6f4ef;
  padding: 18px 28px;
  border-radius: 21px;
  transform: rotate(-12deg);
  box-shadow: 15px 22px 0 #b2c8ca45;
}
.art-stop {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 9px;
  letter-spacing: 0.02em;
  color: #365566;
}
.art-stop span {
  width: 13px;
  height: 13px;
  border: 4px solid #d3e3e5;
  background: #254f63;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #93b0b9;
}
.stop-one {
  top: 52px;
  left: 48px;
}
.stop-two {
  bottom: 41px;
  right: 32px;
}
.art-route-line {
  position: absolute;
  inset: 70px 88px 62px 53px;
  border: 2px dashed #86aab3;
  border-left: 0;
  border-bottom-right-radius: 90px;
  border-top-right-radius: 90px;
  transform: rotate(17deg);
}
.art-cross {
  position: absolute;
  color: #82a0ac;
  font-size: 22px;
}
.cross-one {
  top: 35px;
  right: 42px;
}
.cross-two {
  bottom: 30px;
  left: 44px;
}
.art-coordinate {
  position: absolute;
  right: 22px;
  top: 15px;
  color: #6a899a;
  font-size: 7px;
  letter-spacing: 0.1em;
}
.search-panel {
  display: grid;
  grid-template-columns: 1fr 30px 1fr 1fr auto;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 19px 21px;
}
.search-field {
  display: flex;
  flex-direction: column;
  gap: 11px;
  min-width: 0;
}
.search-field > span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.04em;
}
.search-field input {
  background: transparent;
  border: 0;
  min-width: 0;
  max-width: 100%;
  font-size: 12px;
  padding: 0;
  outline-offset: 5px;
}
.search-field input::placeholder {
  color: var(--muted-foreground);
}
.swap-button {
  border: 1px solid var(--border);
  color: var(--muted-foreground);
  background: var(--card);
  border-radius: 50%;
  width: 29px;
  height: 29px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.date-field {
  padding-left: 18px;
  border-left: 1px solid var(--border);
}
.search-button {
  padding: 14px 19px;
  font-size: 11px;
}
.results-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin: 34px 0 20px;
}
.results-heading h2 {
  font-size: 20px;
  font-weight: 750;
  display: flex;
  gap: 10px;
  align-items: center;
}
.results-heading h2 span {
  font-size: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 7px;
  color: var(--muted-foreground);
}
.results-heading p {
  font-size: 10px;
  color: var(--muted-foreground);
  margin-top: 8px;
}
.sort-control {
  font-size: 10px;
  color: var(--muted-foreground);
  white-space: nowrap;
}
.sort-control select {
  border: 0;
  background: transparent;
  color: var(--foreground);
  margin-left: 4px;
  font-weight: 600;
  max-width: 160px;
}
.trip-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.trip-card {
  display: grid;
  grid-template-columns: 1fr 180px;
  transition: border-color 0.15s;
}
.trip-card:hover {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
}
.trip-main {
  padding: 22px 25px 16px;
}
.trip-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}
.trip-meta .badge {
  font-size: 9px;
}
.trip-date {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  color: var(--muted-foreground);
}
.trip-route {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
  margin-top: 20px;
}
.trip-endpoint strong {
  font-size: 29px;
  letter-spacing: -0.05em;
  font-weight: 650;
}
.trip-endpoint > span {
  display: block;
  font-size: 11px;
  margin-top: 5px;
  font-weight: 550;
  line-height: 1.6;
}
.trip-duration {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  color: var(--muted-foreground);
  font-size: 9px;
  gap: 6px;
  padding: 0 15px;
}
.trip-duration > div {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 3px;
}
.trip-duration > div > span {
  flex: 1;
  height: 1px;
  background: var(--border);
}
.trip-duration i {
  height: 5px;
  width: 5px;
  border-radius: 50%;
  border: 1px solid var(--muted-foreground);
}
.trip-duration small {
  font-size: 8px;
  opacity: 0.8;
}
.trip-bottom {
  border-top: 1px solid var(--border);
  margin-top: 21px;
  padding-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted-foreground);
  font-size: 9px;
}
.trip-bottom > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.plate {
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 3px 5px;
  font-size: 8px;
}
.trip-price {
  border-left: 1px dashed var(--border);
  padding: 25px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
}
.trip-price > span {
  font-size: 9px;
  color: var(--muted-foreground);
}
.trip-price > strong {
  font-size: 26px;
  font-weight: 750;
  letter-spacing: -1px;
  margin: 8px 0 20px;
}
.trip-price > strong small {
  font-size: 18px;
  font-weight: 450;
}
.trip-price .btn {
  width: 100%;
  font-size: 11px;
  padding: 10px 12px;
}
.catalog-note {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted-foreground);
  padding: 22px 2px;
}
.catalog-note svg {
  flex-shrink: 0;
}
.catalog-note p {
  font-size: 10px;
  line-height: 1.7;
}
.clear-filter {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--primary);
  border: 0;
  background: none;
  font-size: 11px;
  padding: 0 0 15px;
}
@media (min-width: 1500px) {
  .journey-banner {
    min-height: 290px;
  }
  .banner-copy {
    padding: 35px 40px;
  }
  .banner-copy h2 {
    font-size: 45px;
  }
}
@media (max-width: 1200px) {
  .search-panel {
    grid-template-columns: 1fr 25px 1fr 1fr;
    gap: 10px;
  }
  .search-button {
    grid-column: 1/-1;
  }
  .trip-price {
    padding: 20px 14px;
  }
  .trip-card {
    grid-template-columns: 1fr 158px;
  }
  .trip-main {
    padding: 20px;
  }
  .trip-duration {
    padding: 0 3px;
  }
  .trip-bottom > span:last-child {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
@media (max-width: 700px) {
  .heading-stamp {
    display: none;
  }
  .journey-banner {
    min-height: 265px;
  }
  .banner-copy {
    padding: 27px;
  }
  .banner-copy h2 {
    font-size: 35px;
  }
  .route-art {
    right: -50px;
    width: 55%;
    opacity: 0.7;
  }
  .art-bus {
    left: 37%;
    top: 105px;
    padding: 15px;
    transform: rotate(-15deg);
  }
  .art-bus svg {
    width: 45px;
  }
  .art-stop,
  .art-coordinate {
    display: none;
  }
  .search-panel {
    grid-template-columns: 1fr 28px 1fr;
    gap: 18px;
    padding: 20px;
  }
  .date-field {
    grid-column: 1/3;
    border: 0;
    padding: 0;
  }
  .search-button {
    grid-column: 3;
    min-width: 0;
    padding: 11px;
  }
  .search-field input {
    font-size: 11px;
  }
  .results-heading {
    align-items: flex-start;
  }
  .results-heading h2 {
    font-size: 19px;
  }
  .sort-control {
    padding-top: 5px;
  }
  .sort-control select {
    display: block;
    margin: 4px 0 0;
  }
  .trip-card {
    grid-template-columns: 1fr;
  }
  .trip-main {
    padding: 20px;
  }
  .trip-price {
    flex-direction: row;
    align-items: center;
    border-left: 0;
    border-top: 1px dashed var(--border);
    padding: 15px 20px;
    gap: 10px;
  }
  .trip-price > span {
    display: none;
  }
  .trip-price > strong {
    font-size: 23px;
    white-space: nowrap;
    margin: 0 auto 0 0;
  }
  .trip-price .btn {
    width: auto;
    min-width: 140px;
  }
  .trip-endpoint strong {
    font-size: 26px;
  }
  .trip-route {
    gap: 8px;
  }
  .trip-endpoint > span {
    font-size: 10px;
  }
  .trip-bottom {
    gap: 8px;
  }
  .trip-bottom > span:last-child {
    display: none;
  }
  .catalog-note {
    align-items: flex-start;
  }
  .art-orbit {
    left: -10px;
  }
  .orbit-two {
    left: -95px;
  }
  .orbit-three {
    left: 75px;
  }
}
@media (max-width: 380px) {
  .banner-copy {
    padding: 23px;
  }
  .banner-copy h2 {
    font-size: 31px;
  }
  .route-art {
    right: -90px;
  }
  .search-panel {
    padding: 16px;
    gap: 17px 10px;
  }
  .search-button {
    font-size: 10px;
    gap: 5px;
  }
  .search-button svg {
    width: 14px;
  }
  .trip-main {
    padding: 17px;
  }
  .trip-price {
    padding: 15px 17px;
  }
  .trip-duration {
    font-size: 8px;
  }
}
</style>
