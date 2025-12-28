<script setup lang="ts">
definePageMeta({
  public: true,
})
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- Hero секция с поиском маршрута -->
    <HeroMain />

    <!-- Лендинговые секции -->
    <section class="py-16 bg-background text-foreground">
      <div class="max-w-6xl mx-auto px-6 space-y-12">
        <div class="text-center space-y-4">
          <h2 class="text-4xl font-bold">Почему выбирают нас</h2>
          <p class="text-lg text-muted-foreground">Удобные автобусы, гибкие маршруты и профессиональные водители</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="p-6 border rounded-lg shadow hover:shadow-lg transition">
            <h3 class="font-semibold text-xl mb-2">Комфорт</h3>
            <p>Современные автобусы с удобными сидениями и кондиционером.</p>
          </div>
          <div class="p-6 border rounded-lg shadow hover:shadow-lg transition">
            <h3 class="font-semibold text-xl mb-2">Гибкость</h3>
            <p>Заказывайте маршрут под свои потребности в любое время.</p>
          </div>
          <div class="p-6 border rounded-lg shadow hover:shadow-lg transition">
            <h3 class="font-semibold text-xl mb-2">Профессиональные водители</h3>
            <p>Опытные водители с большим стажем безопасно доставят вас.</p>
          </div>
        </div>
      </div>
    </section>

    <LayoutFooter/>
  </div>
</template>
