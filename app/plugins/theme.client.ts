import type { ThemePreference } from "~/composables/useTheme";
export default defineNuxtPlugin(() => {
  const theme = useTheme();
  try {
    const stored = localStorage.getItem("corpord-theme");
    if (stored === "light" || stored === "dark" || stored === "system")
      theme.preference.value = stored as ThemePreference;
  } catch {
    /* A usable system theme does not require localStorage. */
  }
  theme.apply();
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = () => theme.apply();
  media.addEventListener("change", update);
  const storage = (event: StorageEvent) => {
    if (event.key !== "corpord-theme") return;
    theme.preference.value =
      event.newValue === "dark" || event.newValue === "light"
        ? event.newValue
        : "system";
    theme.apply();
  };
  window.addEventListener("storage", storage);
});
