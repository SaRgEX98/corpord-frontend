<script setup lang="ts">
import { ArrowRight, Eye, EyeOff } from 'lucide-vue-next'
import { LoginSchema } from '~/features/auth/ui/login.schema'
import { useAuthStore } from '~/store/auth'
import { apiErrorMessage } from '~/utils/api-errors'
const auth = useAuthStore()
const form = reactive({ email: '', password: '' })
const loading = ref(false)
const visible = ref(false)
const error = ref('')
async function onSubmit() {
 if (loading.value) return
 error.value = ''
 const result = LoginSchema.safeParse(form)
 if (!result.success) { error.value = result.error.issues[0]?.message || 'Проверьте данные'; return }
 loading.value = true
 try { await auth.login(result.data); await navigateTo('/me/profile') } catch (cause) { error.value = apiErrorMessage(cause) } finally { loading.value = false }
}
</script>
<template><form class="form-stack" @submit.prevent="onSubmit"><div v-if="error" class="form-error" role="alert">{{ error }}</div><label class="field" for="login-email">Электронная почта<input id="login-email" v-model="form.email" class="input" type="email" autocomplete="username" placeholder="you@example.com" required :disabled="loading"></label><label class="field" for="login-password">Пароль<span class="password-wrap"><input id="login-password" v-model="form.password" class="input" :type="visible ? 'text' : 'password'" autocomplete="current-password" placeholder="Введите пароль" required :disabled="loading"><button type="button" :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'" :aria-pressed="visible" @click="visible = !visible"><EyeOff v-if="visible" :size="17"/><Eye v-else :size="17"/></button></span></label><button class="btn btn-primary auth-submit" type="submit" :disabled="loading" :aria-busy="loading">{{ loading ? 'Входим…' : 'Войти в аккаунт' }}<ArrowRight v-if="!loading" :size="16"/></button></form><div class="auth-divider"><span>или продолжить с</span></div><div class="sso-buttons"><button type="button" class="btn btn-secondary" :disabled="loading" @click="auth.loginWithGoogle()"><span class="google-letter" aria-hidden="true">G</span>Google</button><button type="button" class="btn btn-secondary" :disabled="loading" @click="auth.loginWithYandex()"><span class="yandex-letter" aria-hidden="true">Я</span>Яндекс</button></div></template>
<style scoped>.auth-submit{width:100%;justify-content:space-between;margin-top:2px;padding:14px 17px}.password-wrap{position:relative}.password-wrap input{padding-right:45px}.password-wrap button{position:absolute;right:12px;top:50%;transform:translateY(-50%);border:0;background:none;color:var(--muted-foreground);padding:4px}.auth-divider{position:relative;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--muted-foreground);margin:26px 0 20px}.auth-divider:before{content:'';height:1px;background:var(--border);position:absolute;inset:50% 0 auto}.auth-divider span{background:var(--card);padding:0 12px;position:relative}.sso-buttons{display:flex;gap:12px}.sso-buttons .btn{width:50%;font-size:12px}.google-letter{font-size:17px;font-weight:750;color:#4285f4}.yandex-letter{font-size:17px;font-weight:650;color:#ee2828}</style>
