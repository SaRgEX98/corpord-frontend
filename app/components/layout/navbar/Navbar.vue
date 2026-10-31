<script setup lang="ts">
import { Menu, X, ArrowUpRight, UserRound } from "lucide-vue-next";
import { useAuthStore } from "~/store/auth";
const auth = useAuthStore();
const route = useRoute();
const open = ref(false);
watch(
  () => route.path,
  () => {
    open.value = false;
  },
);
</script>
<template>
  <header class="topbar">
    <div class="topbar-brand">
      <BrandLogo /><span class="topbar-divider"></span
      ><span class="brand-description">Автобусные перевозки</span>
    </div>
    <div class="topbar-actions">
      <span class="network-label"><span></span> Всё для вашей поездки</span
      ><NuxtLink
        :to="auth.isAuthenticated ? '/me/profile' : '/login'"
        class="account-link"
        ><UserRound :size="15" /><span>{{
          auth.isAuthenticated ? auth.user?.name || "Личный кабинет" : "Войти"
        }}</span
        ><ArrowUpRight :size="14" /></NuxtLink
      ><button
        class="mobile-menu"
        :aria-expanded="open"
        aria-controls="mobile-navigation"
        :aria-label="open ? 'Закрыть меню' : 'Открыть меню'"
        @click="open = !open"
      >
        <X v-if="open" :size="22" /><Menu v-else :size="22" />
      </button>
    </div>
  </header>
  <div v-if="open" id="mobile-navigation" class="mobile-navigation">
    <LayoutSidebar mobile />
  </div>
</template>
<style scoped>
.topbar {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 36px;
  border-bottom: 1px solid var(--border);
  background: var(--card);
  gap: 20px;
}
.topbar-brand,
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 22px;
}
.topbar-brand :deep(.brand-logo) {
  font-size: 25px;
}
.topbar-divider {
  height: 24px;
  width: 1px;
  background: var(--border);
}
.brand-description,
.network-label {
  font-size: 11px;
  color: var(--muted-foreground);
}
.network-label {
  display: flex;
  align-items: center;
  gap: 7px;
}
.network-label > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #65a848;
}
.account-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}
.mobile-menu {
  display: none;
  background: none;
  border: 0;
  color: var(--foreground);
}
.mobile-navigation {
  display: none;
}
@media (min-width: 1024px) {
  .topbar-brand {
    visibility: hidden;
  }
}
@media (max-width: 1200px) {
  .network-label {
    display: none;
  }
}
@media (max-width: 1023px) {
  .topbar {
    height: 72px;
    padding: 0 24px;
  }
  .mobile-menu {
    display: block;
  }
  .mobile-navigation {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    top: 72px;
    background: var(--navy);
    z-index: 30;
    border-top: 1px solid #ffffff20;
  }
  .brand-description,
  .topbar-divider {
    display: none;
  }
}
@media (max-width: 600px) {
  .topbar {
    padding: 0 18px;
  }
  .topbar-actions {
    gap: 16px;
  }
  .account-link span {
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
