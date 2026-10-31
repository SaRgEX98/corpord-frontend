<script setup lang="ts">
import { useAuthStore } from "~/store/auth";
import { apiErrorMessage } from "~/utils/api-errors";
definePageMeta({ layout: "auth" });
useHead({ title: "Выход" });
const auth = useAuthStore();
const error = ref("");
const pending = ref(false);
async function exit() {
  pending.value = true;
  error.value = "";
  try {
    await auth.logout();
    await navigateTo("/login");
  } catch (cause) {
    error.value = apiErrorMessage(cause);
  } finally {
    pending.value = false;
  }
}
onMounted(exit);
</script>
<template>
  <div>
    <TransportDataState
      :pending="pending"
      :error="error"
      @retry="exit"
    /><NuxtLink
      v-if="error"
      to="/login"
      class="btn btn-secondary"
      style="margin-top: 20px"
      >К странице входа</NuxtLink
    >
  </div>
</template>
