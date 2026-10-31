<script setup lang="ts">
import { nextTick, onMounted, ref, computed } from "vue";
import { apiErrorMessage } from "~/utils/api-errors";
import {
  buildAdminPayload,
  resourceByKey,
  toLocalDateTime,
  tripStatuses,
  resolveRelationID,
} from "~/features/admin/resources";
import type {
  AdminRecord,
  ResourceDefinition,
  ResourceKey,
} from "~/features/admin/resources";

const props = defineProps<{ resource: ResourceDefinition }>();
// Each metadata entry is paired with its backend resource; runtime validation builds its writable fields.
interface ResourceApi {
  list: () => Promise<AdminRecord[]>;
  get: (id: number) => Promise<AdminRecord>;
  create: (input: Record<string, unknown>) => Promise<unknown>;
  update: (id: number, input: Record<string, unknown>) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
}
const transport = useTransportApi();
const service = (key: ResourceKey) => transport[key] as unknown as ResourceApi;
const listResource = async (key: ResourceKey): Promise<AdminRecord[]> =>
  key === "trips"
    ? ((await transport.trips.all()) as unknown as AdminRecord[])
    : await service(key).list();
const rows = ref<AdminRecord[]>([]);
const references = ref<Partial<Record<ResourceKey, AdminRecord[]>>>({});
const loading = ref(true);
const error = ref("");
const success = ref("");
const referenceErrors = ref<Partial<Record<ResourceKey, string>>>({});
const query = ref("");
const busy = ref(false);
const detailLoading = ref<number | null>(null);
const editor = ref<"create" | "edit" | "detail" | null>(null);
const current = ref<AdminRecord | null>(null);
const values = ref<Record<string, string>>({});
const validation = ref<Record<string, string>>({});
const formError = ref("");
const panelHeading = ref<HTMLElement | null>(null);
const createButton = ref<HTMLButtonElement | null>(null);
const deleteDialog = ref<HTMLDialogElement | null>(null);
const deleteCancel = ref<HTMLButtonElement | null>(null);
const deleteTarget = ref<AdminRecord | null>(null);
const deleteError = ref("");
let actionTrigger: HTMLElement | null = null;
const relations = computed(() => [
  ...new Set(
    props.resource.fields.flatMap((field) =>
      field.relation ? [field.relation] : [],
    ),
  ),
]);
const editing = computed(() => editor.value === "edit");
const timezone = computed(
  () => Intl.DateTimeFormat().resolvedOptions().timeZone,
);
const visibleRows = computed(() => {
  const search = query.value.trim().toLocaleLowerCase("ru");
  return search
    ? rows.value.filter((row) =>
        [
          String(row.id),
          ...props.resource.columns.map((column) => display(row, column.key)),
        ]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(search),
      )
    : rows.value;
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
function fullName(row: Record<string, unknown>) {
  return [row.last_name, row.first_name, row.middle_name]
    .filter(Boolean)
    .join(" ");
}
function routeName(row: Record<string, unknown>) {
  const stops = Array.isArray(row.stops) ? row.stops : [];
  const first = asRecord(asRecord(stops[0]).stop).name;
  const last = asRecord(asRecord(stops[stops.length - 1]).stop).name;
  return first ? `${first} → ${last}` : "Маршрут без остановок";
}
function recordLabel(key: ResourceKey, row: Record<string, unknown>): string {
  if (key === "cities") return `${row.name} · ${row.region}`;
  if (key === "buses") return `${row.brand} · ${row.license_plate}`;
  if (key === "drivers") return fullName(row);
  if (key === "trips")
    return `Рейс №${row.id} · ${routeName(row)} · ${dateLabel(row.start_time)}`;
  if (key === "tripStops")
    return `${display(row, "stop_id")} · №${row.stop_order}`;
  return String(row.name || row.email || `№${row.id}`);
}
function dateLabel(value: unknown) {
  if (typeof value !== "string" || !value) return "Не указано";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
    : "Некорректная дата";
}
function display(row: Record<string, unknown>, key: string): string {
  if (key === "full_name") return fullName(row);
  if (key === "route") return routeName(row);
  if (key === "role")
    return row.role === "admin"
      ? "Администратор"
      : row.role === "user"
        ? "Пользователь"
        : row.role === "moderator"
          ? "Модератор"
          : String(row.role ?? "—");
  if (key.endsWith("_time") || key.endsWith("_at")) return dateLabel(row[key]);
  if (key === "base_price" || key === "price_to_next")
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
    }).format(Number(row[key] ?? 0));
  if (key === "status" && props.resource.key === "trips")
    return (
      tripStatuses.find((status) => status.value === row.status)?.label ??
      String(row.status ?? "—")
    );
  if (key === "bus_id" && row.bus)
    return recordLabel("buses", asRecord(row.bus));
  if (key === "driver_id" && row.driver)
    return recordLabel("drivers", asRecord(row.driver));
  if (key === "category_id" && row.category)
    return typeof row.category === "string"
      ? row.category
      : String(asRecord(row.category).name);
  if (key === "status_id" && row.status)
    return typeof row.status === "string"
      ? row.status
      : String(asRecord(row.status).name);
  const field = props.resource.fields.find((item) => item.key === key);
  if (field?.relation) {
    const reference = references.value[field.relation]?.find(
      (item) => item.id === Number(row[key]),
    );
    if (reference) return recordLabel(field.relation, reference);
    if (typeof row[key] === "string" && !/^\d+$/.test(String(row[key])))
      return String(row[key]);
    return row[key] ? `№${row[key]}` : "Не указано";
  }
  return row[key] === null || row[key] === undefined || row[key] === ""
    ? "—"
    : String(row[key]);
}

async function loadReferences() {
  await Promise.all(
    relations.value.map(async (key) => {
      try {
        references.value[key] = await listResource(key);
        delete referenceErrors.value[key];
      } catch (cause) {
        referenceErrors.value[key] = apiErrorMessage(cause);
      }
    }),
  );
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    rows.value = await listResource(props.resource.key);
  } catch (cause) {
    error.value = apiErrorMessage(cause);
  } finally {
    loading.value = false;
  }
}
async function refresh() {
  await Promise.all([load(), loadReferences()]);
}
onMounted(refresh);

function prepareValues(row?: AdminRecord) {
  const result: Record<string, string> = {};
  for (const field of props.resource.fields) {
    if (field.type === "password") result[field.key] = "";
    else if (row && field.relation)
      result[field.key] = resolveRelationID(field, row, references.value);
    else if (row && field.type === "datetime-local")
      result[field.key] = toLocalDateTime(row[field.key]);
    else if (row) result[field.key] = String(row[field.key] ?? "");
    else
      result[field.key] =
        field.key === "status" && field.options
          ? "scheduled"
          : field.type === "number" && field.min === 0
            ? "0"
            : "";
  }
  values.value = result;
}
async function focusPanel() {
  await nextTick();
  panelHeading.value?.focus();
}
async function startCreate(event: MouseEvent) {
  actionTrigger = event.currentTarget as HTMLElement;
  current.value = null;
  prepareValues();
  editor.value = "create";
  formError.value = "";
  validation.value = {};
  success.value = "";
  await focusPanel();
}
async function openRow(
  row: AdminRecord,
  mode: "edit" | "detail",
  event?: MouseEvent,
) {
  if (busy.value || detailLoading.value !== null) return;
  if (event) actionTrigger = event.currentTarget as HTMLElement;
  detailLoading.value = row.id;
  formError.value = "";
  error.value = "";
  validation.value = {};
  success.value = "";
  try {
    current.value = await service(props.resource.key).get(row.id);
    prepareValues(current.value);
    editor.value = mode;
    await focusPanel();
  } catch (cause) {
    error.value = apiErrorMessage(cause);
  } finally {
    detailLoading.value = null;
  }
}
function closePanel() {
  if (busy.value) return;
  editor.value = null;
  values.value = {}; // Do not retain user passwords after closing the form.
  current.value = null;
  nextTick(() =>
    (actionTrigger?.isConnected ? actionTrigger : createButton.value)?.focus(),
  );
}
async function submit() {
  if (busy.value || editor.value === "detail") return;
  formError.value = "";
  success.value = "";
  const result = buildAdminPayload(props.resource, values.value, editing.value);
  validation.value = result.errors;
  for (const field of props.resource.fields.filter((item) => item.relation)) {
    if (
      !references.value[field.relation!]?.some(
        (row) => row.id === result.payload[field.key],
      )
    )
      validation.value[field.key] =
        "Выберите существующую запись; при необходимости обновите справочник";
  }
  if (Object.keys(validation.value).length) {
    formError.value = "Проверьте отмеченные поля.";
    await focusPanel();
    return;
  }
  const wasEditing = editing.value;
  busy.value = true;
  try {
    if (editing.value && current.value)
      await service(props.resource.key).update(
        current.value.id,
        result.payload,
      );
    else await service(props.resource.key).create(result.payload);
    editor.value = null;
    current.value = null;
    values.value = {};
    success.value = wasEditing ? "Изменения сохранены." : "Запись создана.";
    await load();
    await nextTick();
    createButton.value?.focus();
  } catch (cause) {
    formError.value = apiErrorMessage(cause);
  } finally {
    busy.value = false;
  }
}
async function askDelete(row: AdminRecord, event: MouseEvent) {
  if (busy.value) return;
  actionTrigger = event.currentTarget as HTMLElement;
  deleteTarget.value = row;
  deleteError.value = "";
  await nextTick();
  deleteDialog.value?.showModal();
  deleteCancel.value?.focus();
}
function cancelDelete() {
  if (busy.value) return;
  deleteDialog.value?.close();
  deleteTarget.value = null;
  nextTick(() =>
    (actionTrigger?.isConnected ? actionTrigger : createButton.value)?.focus(),
  );
}
async function remove() {
  if (busy.value || !deleteTarget.value) return;
  busy.value = true;
  deleteError.value = "";
  success.value = "";
  try {
    await service(props.resource.key).remove(deleteTarget.value.id);
    if (current.value?.id === deleteTarget.value.id) {
      editor.value = null;
      current.value = null;
      values.value = {};
    }
    deleteDialog.value?.close();
    deleteTarget.value = null;
    success.value = "Запись удалена.";
    await load();
    await nextTick();
    createButton.value?.focus();
  } catch (cause) {
    deleteError.value = apiErrorMessage(cause);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="space-y-6 min-w-0">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm text-muted-foreground">Управление перевозками</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight">
          {{ resource.title }}
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
          {{ resource.description }}
        </p>
      </div>
      <button
        ref="createButton"
        type="button"
        class="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        :disabled="busy || detailLoading !== null"
        @click="startCreate"
      >
        + Добавить {{ resource.singular }}
      </button>
    </header>
    <p
      v-if="success"
      role="status"
      class="rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm"
    >
      {{ success }}
    </p>
    <div
      v-if="error"
      role="alert"
      class="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
    >
      <p>{{ error }}</p>
      <button
        type="button"
        class="mt-2 font-medium underline"
        :disabled="busy || loading"
        @click="refresh"
      >
        Повторить загрузку
      </button>
    </div>

    <section
      v-if="editor"
      class="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      aria-labelledby="editor-title"
      :aria-busy="busy"
    >
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="editor-title"
          ref="panelHeading"
          tabindex="-1"
          class="text-xl font-semibold outline-none"
        >
          {{
            editor === "detail"
              ? "Карточка"
              : editing
                ? "Редактирование"
                : "Новая запись"
          }}<span
            v-if="current"
            class="ml-2 text-sm font-normal text-muted-foreground"
            >№{{ current.id }}</span
          >
        </h2>
        <button
          type="button"
          class="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          :disabled="busy"
          @click="closePanel"
        >
          Закрыть
        </button>
      </div>
      <template v-if="editor === 'detail' && current">
        <dl class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="field in resource.fields.filter(
              (item) => item.type !== 'password',
            )"
            :key="field.key"
          >
            <dt class="text-xs font-medium text-muted-foreground">
              {{ field.label }}
            </dt>
            <dd class="mt-1 break-words text-sm">
              {{ display(current, field.key) }}
            </dd>
          </div>
          <div v-if="resource.key === 'users'">
            <dt class="text-xs font-medium text-muted-foreground">Роль</dt>
            <dd class="mt-1 text-sm">{{ display(current, "role") }}</dd>
          </div>
          <template v-for="key in ['created_at', 'updated_at']" :key="key"
            ><div v-if="current[key]">
              <dt class="text-xs font-medium text-muted-foreground">
                {{ key === "created_at" ? "Создано" : "Обновлено" }}
              </dt>
              <dd class="mt-1 text-sm">{{ dateLabel(current[key]) }}</dd>
            </div></template
          >
        </dl>
        <div
          v-if="resource.key === 'trips'"
          class="mt-6 border-t border-border pt-5"
        >
          <h3 class="font-medium">Остановки по маршруту</h3>
          <ol
            v-if="Array.isArray(current.stops) && current.stops.length"
            class="mt-3 space-y-3"
          >
            <li
              v-for="stop in current.stops"
              :key="asRecord(stop).id as number"
              class="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/50 p-3 text-sm"
            >
              <span
                >{{ asRecord(stop).stop_order }}.
                {{ asRecord(asRecord(stop).stop).name }}</span
              ><span class="text-muted-foreground"
                >{{ dateLabel(asRecord(stop).arrival_time) }} →
                {{ dateLabel(asRecord(stop).departure_time) }}</span
              >
            </li>
          </ol>
          <p v-else class="mt-2 text-sm text-muted-foreground">
            Остановки ещё не назначены.
          </p>
          <NuxtLink
            to="/admin/trip-stops"
            class="mt-3 inline-flex text-sm font-medium text-primary underline"
            >Управление остановками рейсов</NuxtLink
          >
        </div>
        <button
          type="button"
          class="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          :disabled="detailLoading !== null || busy"
          @click="openRow(current!, 'edit', $event)"
        >
          Редактировать
        </button>
      </template>
      <form v-else novalidate @submit.prevent="submit">
        <p
          v-if="formError"
          role="alert"
          class="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {{ formError }}
        </p>
        <p
          v-if="
            resource.fields.some((field) => field.type === 'datetime-local')
          "
          class="mb-5 text-sm text-muted-foreground"
        >
          Дата и время — в часовом поясе {{ timezone }}. На сервер отправляется
          точное время с часовым поясом.
        </p>
        <div class="grid gap-5 sm:grid-cols-2">
          <div
            v-for="field in resource.fields"
            :key="field.key"
            class="space-y-2"
          >
            <label :for="`admin-${field.key}`" class="block text-sm font-medium"
              >{{ field.label
              }}<span
                v-if="
                  !field.optional && !(field.type === 'password' && editing)
                "
                aria-hidden="true"
                class="ml-1 text-destructive"
                >*</span
              ><span v-else class="ml-1 text-xs text-muted-foreground"
                >(необязательно)</span
              ></label
            >
            <UiTokenSelect
              v-if="field.type === 'select'"
              :id="`admin-${field.key}`"
              v-model="values[field.key]"
              :label="field.label"
              :invalid="!!validation[field.key]"
              :aria-describedby="`help-${field.key}`"
              :disabled="busy || !!(field.relation && referenceErrors[field.relation])"
              :options="field.relation ? [...(field.optional ? [{value:'',label:'Не указан'}] : []), ...(references[field.relation] ?? []).map(option => ({ value: String(option.id), label: `${recordLabel(field.relation!, option)} · №${option.id}` }))] : (field.options ?? [])"
            />
            <input
              v-else
              :id="`admin-${field.key}`"
              v-model="values[field.key]"
              :type="field.type ?? 'text'"
              :min="field.min"
              :max="field.max"
              :step="
                field.type === 'datetime-local' || field.integer
                  ? 1
                  : field.type === 'number'
                    ? 'any'
                    : undefined
              "
              :autocomplete="field.type === 'password' ? 'new-password' : 'off'"
              class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring disabled:opacity-50"
              :disabled="busy || (editing && field.immutable)"
              :required="
                !field.optional && !(field.type === 'password' && editing)
              "
              :aria-invalid="!!validation[field.key]"
              :aria-describedby="`help-${field.key}`"
            />
            <div :id="`help-${field.key}`" class="text-xs">
              <p v-if="validation[field.key]" class="text-destructive">
                {{ validation[field.key] }}
              </p>
              <p v-if="field.help" class="text-muted-foreground">
                {{ field.help }}
              </p>
              <template v-if="field.relation">
                <p
                  v-if="referenceErrors[field.relation]"
                  role="alert"
                  class="text-destructive"
                >
                  Не удалось загрузить справочник:
                  {{ referenceErrors[field.relation] }}
                  <button
                    type="button"
                    class="underline"
                    :disabled="busy"
                    @click="loadReferences"
                  >
                    Повторить
                  </button>
                </p>
                <p
                  v-else-if="!references[field.relation]?.length"
                  class="text-muted-foreground"
                >
                  Справочник пуст.
                  <NuxtLink
                    :to="`/admin/${resourceByKey(field.relation).slug}`"
                    class="text-primary underline"
                    >Добавить запись</NuxtLink
                  >
                </p>
                <p
                  v-else-if="editing && !values[field.key]"
                  class="text-muted-foreground"
                >
                  Выберите связь явно: API вернул название без однозначного
                  идентификатора.
                </p>
              </template>
            </div>
          </div>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            class="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            :disabled="busy || relations.some((key) => !!referenceErrors[key])"
          >
            {{ busy ? "Сохранение…" : "Сохранить" }}</button
          ><button
            type="button"
            class="rounded-xl border border-border px-4 py-2.5 text-sm disabled:opacity-50"
            :disabled="busy"
            @click="closePanel"
          >
            Отмена
          </button>
        </div>
      </form>
    </section>

    <section
      class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-label="Список записей"
      :aria-busy="loading"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"
      >
        <label class="flex min-w-0 flex-1 items-center gap-3 text-sm"
          ><span class="sr-only">Поиск в списке</span
          ><input
            v-model="query"
            type="search"
            placeholder="Поиск в списке…"
            class="w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm"
          /><span class="shrink-0 text-muted-foreground"
            >{{ visibleRows.length }} из {{ rows.length }}</span
          ></label
        ><button
          type="button"
          class="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          :disabled="loading || busy"
          @click="refresh"
        >
          Обновить
        </button>
      </div>
      <p
        v-if="loading"
        role="status"
        class="p-10 text-center text-sm text-muted-foreground"
      >
        Загрузка записей…
      </p>
      <div v-else-if="!visibleRows.length" class="p-10 text-center">
        <p class="font-medium">
          {{
            query
              ? "Ничего не найдено"
              : error
                ? "Список недоступен"
                : "Записей пока нет"
          }}
        </p>
        <p class="mt-2 text-sm text-muted-foreground">
          {{
            query
              ? "Попробуйте другой поисковый запрос."
              : error
                ? "Повторите загрузку после устранения ошибки."
                : "Добавьте первую запись с помощью кнопки выше."
          }}
        </p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">
            {{
              resource.title
            }}. Время указано в
            {{
              timezone
            }}.
          </caption>
          <thead class="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="p-4 font-medium">ID</th>
              <th
                v-for="column in resource.columns"
                :key="column.key"
                scope="col"
                class="whitespace-nowrap p-4 font-medium"
              >
                {{ column.label }}
              </th>
              <th scope="col" class="p-4 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="row in visibleRows"
              :key="row.id"
              class="hover:bg-muted/30"
            >
              <td class="p-4 tabular-nums text-muted-foreground">
                {{ row.id }}
              </td>
              <td
                v-for="column in resource.columns"
                :key="column.key"
                class="max-w-xs p-4"
              >
                {{ display(row, column.key) }}
              </td>
              <td class="p-4">
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-md border border-border px-2 py-1.5 text-xs disabled:opacity-50"
                    :disabled="busy || detailLoading !== null"
                    :aria-label="`Открыть ${resource.singular} №${row.id}`"
                    @click="openRow(row, 'detail', $event)"
                  >
                    {{
                      detailLoading === row.id ? "Загрузка…" : "Открыть"
                    }}</button
                  ><button
                    type="button"
                    class="rounded-md border border-border px-2 py-1.5 text-xs disabled:opacity-50"
                    :disabled="busy || detailLoading !== null"
                    :aria-label="`Изменить ${resource.singular} №${row.id}`"
                    @click="openRow(row, 'edit', $event)"
                  >
                    Изменить</button
                  ><button
                    type="button"
                    class="rounded-md px-2 py-1.5 text-xs text-destructive disabled:opacity-50"
                    :disabled="busy || detailLoading !== null"
                    v-if="resource.deletable !== false"
                    :aria-label="`Удалить ${resource.singular} №${row.id}`"
                    @click="askDelete(row, $event)"
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <dialog
      ref="deleteDialog"
      class="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/60"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      @cancel="busy ? $event.preventDefault() : cancelDelete()"
    >
      <h2 id="delete-title" class="text-xl font-semibold">
        Удалить {{ resource.singular }}?
      </h2>
      <p
        id="delete-description"
        class="mt-3 break-words text-sm text-muted-foreground"
      >
        Запись №{{ deleteTarget?.id
        }}{{
          deleteTarget ? `: ${recordLabel(resource.key, deleteTarget)}` : ""
        }}
        будет удалена. Восстановить её через интерфейс нельзя. Связанные данные
        могут препятствовать удалению.
      </p>
      <p v-if="deleteError" role="alert" class="mt-3 text-sm text-destructive">
        {{ deleteError }}
      </p>
      <div class="mt-6 flex justify-end gap-3">
        <button
          ref="deleteCancel"
          type="button"
          class="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
          :disabled="busy"
          @click="cancelDelete"
        >
          Отмена</button
        ><button
          type="button"
          class="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
          :disabled="busy"
          @click="remove"
        >
          {{ busy ? "Удаление…" : "Удалить" }}
        </button>
      </div>
    </dialog>
  </section>
</template>
