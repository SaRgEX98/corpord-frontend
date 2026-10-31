<script setup lang="ts">
import { ArrowRight, Eye, EyeOff } from "lucide-vue-next";
import { RegisterSchema } from "~/features/auth/ui/login.schema";
import { useAuthStore } from "~/store/auth";
import { apiErrorMessage } from "~/utils/api-errors";
const auth = useAuthStore();
const form = reactive({ name: "", email: "", password: "" });
const loading = ref(false);
const visible = ref(false);
const error = ref("");
async function onSubmit() {
  if (loading.value) return;
  error.value = "";
  const result = RegisterSchema.safeParse(form);
  if (!result.success) {
    error.value = result.error.issues[0]?.message || "Проверьте данные";
    return;
  }
  loading.value = true;
  try {
    await auth.register(result.data);
    await navigateTo("/me/profile");
  } catch (cause) {
    error.value = apiErrorMessage(cause);
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <form class="form-stack" @submit.prevent="onSubmit">
    <div v-if="error" class="form-error" role="alert">{{ error }}</div>
    <label class="field" for="register-name"
      >Ваше имя<input
        id="register-name"
        v-model="form.name"
        class="input"
        type="text"
        autocomplete="name"
        placeholder="Как к вам обращаться"
        required
        :disabled="loading" /></label
    ><label class="field" for="register-email"
      >Электронная почта<input
        id="register-email"
        v-model="form.email"
        class="input"
        type="email"
        autocomplete="username"
        placeholder="you@example.com"
        required
        :disabled="loading" /></label
    ><label class="field" for="register-password"
      >Пароль<span class="password-wrap"
        ><input
          id="register-password"
          v-model="form.password"
          class="input"
          :type="visible ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="Придумайте надёжный пароль"
          required
          aria-describedby="password-hint"
          :disabled="loading" /><button
          type="button"
          :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'"
          :aria-pressed="visible"
          @click="visible = !visible"
        >
          <EyeOff v-if="visible" :size="17" /><Eye
            v-else
            :size="17"
          /></button></span
      ><span id="password-hint" class="form-hint"
        >До 72 байт UTF-8. Рекомендуем длинный уникальный пароль.</span
      ></label
    ><button
      class="btn btn-primary auth-submit"
      type="submit"
      :disabled="loading"
      :aria-busy="loading"
    >
      {{ loading ? "Создаём аккаунт…" : "Создать аккаунт"
      }}<ArrowRight v-if="!loading" :size="16" />
    </button>
  </form>
</template>
<style scoped>
.auth-submit {
  width: 100%;
  justify-content: space-between;
  margin-top: 2px;
  padding: 14px 17px;
}
.password-wrap {
  position: relative;
}
.password-wrap input {
  padding-right: 45px;
}
.password-wrap button {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: none;
  color: var(--muted-foreground);
  padding: 4px;
}
</style>
