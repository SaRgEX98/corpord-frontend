/** One clock per visible booking surface, stopped when the surface disappears. */
export function useBookingClock() {
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | undefined;
  onMounted(() => { now.value = Date.now(); timer = setInterval(() => { now.value = Date.now(); }, 1000); });
  onBeforeUnmount(() => clearInterval(timer));
  return now;
}
