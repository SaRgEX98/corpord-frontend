<script setup lang="ts">
import { ArrowLeft, Palette, ShieldCheck, LogOut } from "lucide-vue-next";
import { AlertDialogRoot, AlertDialogTrigger, AlertDialogPortal, AlertDialogOverlay, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "reka-ui";
import { useAuthStore } from "~/store/auth";
import { apiErrorMessage } from "~/utils/api-errors";
definePageMeta({ layout: "me" });
useHead({ title: "Настройки" });
const auth = useAuthStore();
const dialogOpen = ref(false);
const loading = ref(false);
const error = ref("");
function confirmRevoke() {
  error.value = "";
  dialogOpen.value = true;
}
async function revokeAll() {
  if (loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    await auth.logoutAll();
    dialogOpen.value = false;
    await navigateTo("/login");
  } catch (cause) {
    error.value = apiErrorMessage(cause);
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <AlertDialogRoot :open="dialogOpen" @update:open="!loading && (dialogOpen = $event)">
  <div class="container-page">
    <NuxtLink to="/me/profile" class="back-link"
      ><ArrowLeft :size="15" />Личный кабинет</NuxtLink
    >
    <div class="page-heading">
      <div>
        <p class="page-eyebrow">ПОД ВАШ РИТМ</p>
        <h1 class="page-title">Настройки</h1>
        <p class="page-description">
          Внешний вид приложения и безопасность вашего аккаунта.
        </p>
      </div>
    </div>
    <div class="settings-stack">
      <section class="panel card-pad">
        <div class="settings-heading">
          <Palette :size="21" />
          <div>
            <h2 class="section-label">Оформление</h2>
            <p>Выберите тему или используйте настройки вашего устройства.</p>
          </div>
        </div>
        <ThemePicker />
        <p class="settings-note">Предпочтение сохраняется в этом браузере.</p>
      </section>
      <section class="panel card-pad">
        <div class="settings-heading">
          <ShieldCheck :size="21" />
          <div>
            <h2 class="section-label">Безопасность</h2>
            <p>Завершите сеансы на всех устройствах, включая текущее.</p>
          </div>
        </div>
        <AlertDialogTrigger as-child><button class="btn btn-secondary" @click="confirmRevoke">
          <LogOut :size="15" />Выйти на всех устройствах
        </button></AlertDialogTrigger>
        <p class="settings-note">
          Для продолжения работы потребуется войти снова.
        </p>
      </section>
    </div>
    <AlertDialogPortal>
    <AlertDialogOverlay class="revoke-overlay" />
    <AlertDialogContent class="revoke-dialog" @escape-key-down="loading && $event.preventDefault()">
      <AlertDialogTitle as="h2">Завершить все сеансы?</AlertDialogTitle>
      <AlertDialogDescription as="p">
        Вы выйдете из аккаунта на всех устройствах, включая это. После этого
        можно будет войти снова.
      </AlertDialogDescription>
      <div v-if="error" class="form-error" role="alert">{{ error }}</div>
      <div class="dialog-actions">
        <AlertDialogCancel
          class="btn btn-secondary"
          :disabled="loading"

        >
          Отмена</AlertDialogCancel
        ><button
          class="btn btn-danger"
          :disabled="loading"
          :aria-busy="loading"
          @click="revokeAll"
        >
          {{ loading ? "Завершаем…" : "Завершить сеансы" }}
        </button>
      </div>
    </AlertDialogContent>
    </AlertDialogPortal>
  </div>
  </AlertDialogRoot>
</template>
<style scoped>
.settings-stack {
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.settings-heading {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 26px;
}
.settings-heading > svg {
  color: var(--primary);
  margin-top: 1px;
  flex-shrink: 0;
}
.settings-heading p {
  font-size: 12px;
  line-height: 1.8;
  color: var(--muted-foreground);
  margin-top: 8px;
}
.settings-note {
  font-size: 10px;
  color: var(--muted-foreground);
  margin-top: 14px;
  line-height: 1.7;
}
.revoke-dialog {
  position: fixed;
  z-index: 101;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 17px;
  padding: 28px;
  max-width: 450px;
  width: calc(100% - 36px);
  background: var(--card);
  color: var(--foreground);
  box-shadow: 0 25px 100px #0003;
}
.revoke-overlay {
  position: fixed;
  z-index: 100;
  inset: 0;
  background: #07142699;
  backdrop-filter: blur(3px);
}
.revoke-dialog h2 {
  font-size: 22px;
  font-weight: 700;
}
.revoke-dialog > p {
  font-size: 12px;
  color: var(--muted-foreground);
  line-height: 1.8;
  margin: 15px 0 24px;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
@media (max-width: 420px) {
  .dialog-actions {
    flex-direction: column-reverse;
  }
  .dialog-actions .btn {
    width: 100%;
  }
}
</style>
