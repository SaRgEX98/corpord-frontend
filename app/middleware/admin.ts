import { useAuthStore } from "~/store/auth";

export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore();
  await auth.ensureSession();
  if (!auth.isAuthenticated) return navigateTo("/login");
  if (!auth.isAdmin)
    throw createError({
      statusCode: 403,
      statusMessage: "Доступ только для администратора",
      fatal: true,
    });
});
