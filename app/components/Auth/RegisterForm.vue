<!-- app/components/auth/LoginForm.vue -->
<script setup lang="ts">
import type { RegisterRequestDto } from '~/types/dto/auth.dto'

const emit = defineEmits<{
  submit: [RegisterRequestDto]
}>()

const form = reactive<RegisterRequestDto>({
  email: '',
  password: '',
  name: '',
})

const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    emit('submit', { ...form })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <UiFormField label="Email">
      <UiInput
          v-model="form.email"
          type="email"
          placeholder="you@example.com"
          required
      />
    </UiFormField>

    <UiFormField label="Пароль">
      <UiInput
          v-model="form.password"
          type="password"
          required
      />
    </UiFormField>
    <UiFormField label="Имя">
      <UiInput
          v-model="form.password"
          type="text"
          required
      />
    </UiFormField>

    <UiButton class="w-full" :disabled="loading">
      Войти
    </UiButton>
  </form>
</template>
