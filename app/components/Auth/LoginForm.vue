<script setup lang="ts">
import { LoginSchema } from '~/features/auth/ui/login.schema'
import { useAuthStore } from '~/store/auth'

const auth = useAuthStore()

const form = useForm({
  validationSchema: toTypedSchema(LoginSchema),
  initialValues: {
    email: '',
    password: '',
  }
})

const onSubmit = form.handleSubmit(async (values) => {
  await auth.login(values)
  await navigateTo('/')
})
</script>

<template>
  <form @submit.prevent="onSubmit" method="post" class="w-full space-y-6">
    <UiFormField v-slot="{ componentField }" name="email">
      <UiFormItem>
        <UiFormLabel>Email</UiFormLabel>
        <UiFormControl>
          <UiInput type="email" placeholder="you@example.com" v-bind="componentField"/>
        </UiFormControl>
        <UiFormMessage></UiFormMessage>
      </UiFormItem>
    </UiFormField>

    <UiFormField v-slot="{ componentField }" name="password">
      <UiFormItem>
        <UiFormLabel>Пароль</UiFormLabel>
        <UiFormControl>
          <UiInput type="password" placeholder="••••••••" v-bind="componentField" />
        </UiFormControl>
        <UiFormMessage></UiFormMessage>
      </UiFormItem>
    </UiFormField>
    <UiButton type="submit" class="w-full">Войти</UiButton>
  </form>
  <div class="flex flex-row gap-4 mt-4 justify-center items-center">
    <UiButton type="button" variant="outline" @click="auth.loginWithGoogle()">
      Google
    </UiButton>
    <UiButton type="button" variant="outline" @click="auth.loginWithYandex()">
      Яндекс
    </UiButton>
  </div>
</template>

