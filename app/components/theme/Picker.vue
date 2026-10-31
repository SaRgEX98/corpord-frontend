<script setup lang="ts">
import { Sun, Moon, Monitor } from "lucide-vue-next";
const { preference, setTheme } = useTheme();
const choices = [
  { value: "light" as const, label: "Светлая", icon: Sun },
  { value: "dark" as const, label: "Тёмная", icon: Moon },
  { value: "system" as const, label: "Системная", icon: Monitor },
];
defineProps<{ compact?: boolean }>();
</script>
<template>
  <div
    class="theme-picker"
    :class="{ compact }"
    role="group"
    aria-label="Тема оформления"
  >
    <button
      v-for="choice in choices"
      :key="choice.value"
      type="button"
      :aria-pressed="preference === choice.value"
      :aria-label="choice.label"
      :class="{ selected: preference === choice.value }"
      @click="setTheme(choice.value)"
    >
      <component :is="choice.icon" :size="16" /><span v-if="!compact">{{
        choice.label
      }}</span>
    </button>
  </div>
</template>
<style scoped>
.theme-picker {
  display: flex;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 11px;
  width: fit-content;
  background: var(--muted);
}
button {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 9px 13px;
  border-radius: 7px;
  color: var(--muted-foreground);
  border: 0;
  background: transparent;
}
.selected {
  background: var(--card);
  color: var(--foreground);
  box-shadow: 0 1px 3px #0000000d;
}
.compact {
  padding: 3px;
}
.compact button {
  padding: 7px;
}
@media (max-width: 400px) {
  button {
    padding: 9px;
  }
}
</style>
