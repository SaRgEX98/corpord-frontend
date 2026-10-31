export type ThemePreference = "light" | "dark" | "system";
export function useTheme() {
  const preference = useState<ThemePreference>(
    "theme-preference",
    () => "system",
  );
  const resolved = useState<"light" | "dark">("theme-resolved", () => "light");
  function apply() {
    if (!import.meta.client) return;
    const dark =
      preference.value === "dark" ||
      (preference.value === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    resolved.value = dark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = resolved.value;
  }
  function setTheme(value: ThemePreference) {
    preference.value = value;
    try {
      localStorage.setItem("corpord-theme", value);
    } catch {
      /* Storage can be disabled. */
    }
    apply();
  }
  return { preference, resolved, setTheme, apply };
}
