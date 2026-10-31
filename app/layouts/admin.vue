<script setup lang="ts">
import { adminResources } from "~/features/admin/resources";
</script>

<template>
  <NuxtLayout name="default">
    <div
      class="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:px-8"
    >
      <aside class="min-w-0">
        <nav
          aria-label="Разделы администрирования"
          class="rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-24"
        >
          <p
            class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Администрирование
          </p>
          <div
            class="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
          >
            <NuxtLink
              to="/admin"
              exact-active-class="bg-primary/10 text-primary"
              class="shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
              >Обзор</NuxtLink
            >
            <NuxtLink
              v-for="resource in adminResources"
              :key="resource.key"
              :to="`/admin/${resource.slug}`"
              active-class="bg-primary/10 text-primary"
              class="shrink-0 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
              >{{ resource.title }}</NuxtLink
            >
          </div>
        </nav>
      </aside>
      <div class="min-w-0"><slot /></div>
    </div>
  </NuxtLayout>
</template>
