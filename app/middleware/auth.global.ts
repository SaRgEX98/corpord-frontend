import { useAuthStore } from "~/store/auth";

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();
  // Callback explicitly rotates the cookie installed by the backend.
  if (to.path === "/auth/callback") return;
  // Also hydrate navigation on public pages after a browser reload.
  await auth.ensureSession();
  if (/^\/(me|admin)(\/|$)/.test(to.path) && !auth.isAuthenticated) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
