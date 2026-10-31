<script setup lang="ts">
import { adminResources } from "~/features/admin/resources";
import type { ResourceKey } from "~/features/admin/resources";
import { apiErrorMessage } from "~/utils/api-errors";
definePageMeta({ layout: "admin", middleware: ["admin"] });
useHead({ title: "Управление перевозками" });
const transport = useTransportApi();
const counts = ref<Partial<Record<ResourceKey, number>>>({});
const errors = ref<Partial<Record<ResourceKey, string>>>({});
const loading = ref(true);
async function load() {
  if (!loading.value) loading.value = true;
  await Promise.all(
    adminResources.map(async (resource) => {
      try {
        const rows =
          resource.key === "trips"
            ? await transport.trips.all()
            : await transport[resource.key].list();
        counts.value[resource.key] = rows.length;
        delete errors.value[resource.key];
      } catch (cause) {
        errors.value[resource.key] = apiErrorMessage(cause);
        delete counts.value[resource.key];
      }
    }),
  );
  loading.value = false;
}
onMounted(load);
</script>

<template>
  <section class="space-y-7">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm text-muted-foreground">
          Рабочее пространство администратора
        </p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight">
          Управление перевозками
        </h1>
        <p class="mt-3 max-w-2xl text-sm text-muted-foreground">
          Планируйте рейсы, управляйте автопарком и поддерживайте справочники в
          актуальном состоянии.
        </p>
      </div>
      <button
        type="button"
        class="rounded-xl border border-border bg-card px-4 py-2.5 text-sm disabled:opacity-50"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? "Загрузка…" : "Обновить" }}
      </button>
    </header>
    <p v-if="loading" role="status" class="sr-only">
      Загружаем состояние разделов.
    </p>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="resource in adminResources"
        :key="resource.key"
        :to="`/admin/${resource.slug}`"
        class="group flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div class="flex items-start justify-between gap-4">
          <h2 class="text-base font-semibold">{{ resource.title }}</h2>
          <span
            aria-hidden="true"
            class="text-primary transition group-hover:translate-x-1"
            >↗</span
          >
        </div>
        <p class="mt-3 text-3xl font-semibold tabular-nums">
          {{ loading ? "…" : (counts[resource.key] ?? "—") }}
        </p>
        <p
          v-if="errors[resource.key]"
          class="mt-2 text-xs text-destructive"
          role="status"
        >
          {{ errors[resource.key] }}
        </p>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ resource.description }}
        </p>
        <span class="mt-auto pt-5 text-xs font-medium text-primary"
          >Открыть раздел →</span
        >
      </NuxtLink>
    </div>
    <div class="rounded-2xl border border-border bg-muted/30 p-5">
      <h2 class="font-semibold">Порядок настройки</h2>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
        Начните со статусов и категорий, добавьте автобусы, водителей и
        остановки. Затем создайте рейс и назначьте ему остановки по порядку.
        Время отображается в часовом поясе вашего устройства.
      </p>
    </div>
  </section>
</template>
