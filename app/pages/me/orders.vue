<script setup lang="ts">
import { ArrowUpRight, Route } from "lucide-vue-next";
definePageMeta({ layout: "me" });
useHead({ title: "Поездки" });
</script>
<template>
  <div class="container-page">
    <div class="page-heading">
      <div>
        <p class="page-eyebrow">ВАШИ ПОЕЗДКИ</p>
        <h1 class="page-title">Планируйте следующий маршрут</h1>
        <p class="page-description">
          Онлайн-бронирование и история заказов пока недоступны. Сейчас в
          Corpord можно изучить расписание, остановки, автобусы и водителей.
        </p>
      </div>
    </div>
    <NuxtLink to="/trips" class="btn btn-primary"
      >Посмотреть рейсы<ArrowUpRight :size="15"
    /></NuxtLink>
  </div>
</template>
