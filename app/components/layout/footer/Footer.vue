<template>
  <footer class="page-footer">
    <span>Corpord — автобусы, маршруты, поездки.</span>
    <div>
      <NuxtLink to="/stops">Остановки</NuxtLink
      ><NuxtLink to="/buses">Автопарк</NuxtLink><ThemePicker compact />
    </div>
  </footer>
</template>
<style scoped>
.page-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  border-top: 1px solid var(--border);
  padding: 20px 40px;
  font-size: 10px;
  color: var(--muted-foreground);
}
.page-footer > div {
  display: flex;
  align-items: center;
  gap: 20px;
}
@media (max-width: 600px) {
  .page-footer {
    padding: 20px 18px;
    align-items: flex-start;
    flex-direction: column;
  }
  .page-footer > div {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
