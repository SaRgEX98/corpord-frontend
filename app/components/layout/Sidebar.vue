<script setup lang="ts">
import {
  Route,
  BusFront,
  UsersRound,
  MapPin,
  ArrowUpRight,
  CircleUserRound,
  SlidersHorizontal,
  ShieldCheck,
  MoveUpRight,
} from "lucide-vue-next";
import { useAuthStore } from "~/store/auth";
defineProps<{ mobile?: boolean }>();
const auth = useAuthStore();
const links = [
  { to: "/trips", label: "Рейсы и маршруты", icon: Route },
  { to: "/buses", label: "Автопарк", icon: BusFront },
  { to: "/drivers", label: "Водители", icon: UsersRound },
  { to: "/stops", label: "Остановки", icon: MapPin },
];
</script>
<template>
  <aside class="sidebar" :class="{ mobile }">
    <div class="sidebar-brand">
      <BrandLogo /><span>На пути к новым местам</span>
    </div>
    <nav aria-label="Основная навигация">
      <p class="nav-caption">ПЛАНИРУЙТЕ ПОЕЗДКУ</p>
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav-link"
        :class="{
          active:
            $route.path.startsWith(link.to) ||
            ($route.path === '/' && link.to === '/trips'),
        }"
        ><component :is="link.icon" :size="18" /><span>{{ link.label }}</span
        ><MoveUpRight :size="13" class="nav-arrow"
      /></NuxtLink>
      <p class="nav-caption account-caption">ЛИЧНОЕ ПРОСТРАНСТВО</p>
      <NuxtLink
        :to="auth.isAuthenticated ? '/me/profile' : '/login'"
        class="nav-link"
        :class="{ active: $route.path === '/me/profile' }"
        ><CircleUserRound :size="18" /><span>Личный кабинет</span></NuxtLink
      ><NuxtLink
        v-if="auth.isAuthenticated"
        to="/me/settings"
        class="nav-link"
        :class="{ active: $route.path === '/me/settings' }"
        ><SlidersHorizontal :size="18" /><span>Настройки</span></NuxtLink
      ><NuxtLink
        v-if="auth.isAdmin"
        to="/admin"
        class="nav-link"
        :class="{ active: $route.path.startsWith('/admin') }"
        ><ShieldCheck :size="18" /><span>Управление</span></NuxtLink
      >
    </nav>
    <div class="sidebar-bottom">
      <div class="sidebar-note">
        <div class="note-icon"><Route :size="23" /></div>
        <p>Хорошая поездка<br />начинается с плана.</p>
        <NuxtLink to="/trips"
          >Выбрать маршрут <ArrowUpRight :size="14"
        /></NuxtLink>
      </div>
      <div class="sidebar-foot">
        <span>© {{ new Date().getFullYear() }} Corpord</span
        ><span>В движении.</span>
      </div>
    </div>
  </aside>
</template>
<style scoped>
.sidebar {
  width: 248px;
  flex-shrink: 0;
  background: var(--navy);
  color: #c3ccda;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 32px 20px 22px;
  position: sticky;
  top: 0;
  height: 100dvh;
}
.sidebar-brand {
  padding: 0 10px 42px;
  color: white;
}
.sidebar-brand > span {
  display: block;
  color: #7f91aa;
  font-size: 10px;
  letter-spacing: 0.02em;
  margin-top: 9px;
}
.nav-caption {
  font-size: 9px;
  letter-spacing: 0.13em;
  color: #7f91aa;
  padding: 0 14px;
  margin-bottom: 13px;
  font-weight: 600;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-radius: 9px;
  font-size: 12px;
  margin: 4px 0;
  transition: background 0.15s;
}
.nav-link:hover {
  background: #ffffff0d;
  color: white;
}
.nav-link.active {
  background: #2e63e5;
  color: white;
}
.nav-arrow {
  margin-left: auto;
  opacity: 0.65;
}
.account-caption {
  margin-top: 34px;
}
.sidebar-bottom {
  margin-top: auto;
  padding-top: 35px;
}
.sidebar-note {
  border: 1px solid #ffffff13;
  background: #ffffff04;
  border-radius: 13px;
  padding: 19px 17px;
}
.note-icon {
  color: #b7e88d;
  margin-bottom: 14px;
}
.sidebar-note p {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  letter-spacing: -0.02em;
  color: #f0f4fb;
}
.sidebar-note a {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 10px;
  color: #b7e88d;
  margin-top: 18px;
}
.sidebar-foot {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #7f91aa;
  padding: 22px 3px 0;
}
.mobile {
  position: static;
  width: 100%;
  height: auto;
  min-height: 0;
  padding: 18px;
}
.mobile .sidebar-brand,
.mobile .sidebar-bottom {
  display: none;
}
.mobile nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
}
.mobile .nav-caption {
  grid-column: 1/-1;
  margin: 8px 0;
}
.mobile .nav-link {
  font-size: 12px;
}
@media (max-width: 1023px) {
  .sidebar:not(.mobile) {
    display: none;
  }
}
</style>
