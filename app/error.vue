<script setup lang="ts">
import { ArrowLeft, RotateCw } from "lucide-vue-next";
const props = defineProps<{
  error: { statusCode?: number; message?: string };
}>();
const missing = computed(() => props.error.statusCode === 404);
useHead({
  title: computed(() =>
    missing.value ? "Страница не найдена · Corpord" : "Ошибка · Corpord",
  ),
});
</script>
<template>
  <div class="error-page">
    <BrandLogo />
    <main id="main-content">
      <p class="error-number">{{ error.statusCode || "Ой" }}</p>
      <h1>
        {{
          missing
            ? "Кажется, мы свернули не туда."
            : "На маршруте небольшая задержка."
        }}
      </h1>
      <p>
        {{
          missing
            ? "Этой страницы нет. Вернёмся к расписанию и выберем новый маршрут."
            : "Не удалось открыть страницу. Попробуйте вернуться к расписанию."
        }}
      </p>
      <button
        class="btn btn-primary"
        @click="clearError({ redirect: '/trips' })"
      >
        <ArrowLeft :size="15" />К расписанию
      </button>
    </main>
    <span>Corpord · На пути к новым местам</span>
  </div>
</template>
<style scoped>
.error-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 35px;
  background: var(--background);
}
.error-page > main {
  margin: auto;
  text-align: center;
  max-width: 550px;
  padding: 60px 0;
}
.error-number {
  font-size: 90px;
  letter-spacing: -0.09em;
  font-weight: 750;
  color: var(--primary);
  margin-bottom: 20px;
}
.error-page h1 {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.3;
}
.error-page main > p:not(.error-number) {
  font-size: 13px;
  line-height: 1.8;
  color: var(--muted-foreground);
  margin: 20px 0 30px;
}
.error-page > span {
  text-align: center;
  font-size: 10px;
  color: var(--muted-foreground);
}
</style>
