<script setup lang="ts">
import { adminResources } from "~/features/admin/resources";
import type { ResourceKey } from "~/features/admin/resources";
import { apiErrorMessage } from "~/utils/api-errors";
definePageMeta({ layout: "admin", middleware: ["admin"] });
useHead({ title: "Управление перевозками" });
const http=useNuxtApp().$api;
const counts=ref<Record<string,{value:number|null;approximate:boolean}>>({});
const error=ref('');
const loading=ref(true);
async function load(){
 loading.value=true;error.value='';
 try{counts.value=await http('/admin/catalog-counts');}
 catch(cause){error.value=apiErrorMessage(cause);}
 finally{loading.value=false;}
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
          {{ loading ? "…" : (counts[resource.key]?.value == null ? "—" : `≈ ${counts[resource.key]!.value!.toLocaleString('ru')}`) }}
        </p>
        <p
          v-if="error"
          class="mt-2 text-xs text-destructive"
          role="status"
        >
          {{ error }}
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
