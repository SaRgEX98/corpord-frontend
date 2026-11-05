import type { WatchSource } from 'vue';
import { useAuthStore } from '~/store/auth';
import { apiErrorMessage } from '~/utils/api-errors';
import type { PrivatePage } from '~/types/domain/booking';
/** Private pages never survive logout/account changes; no per-row fetches. */
export function usePrivatePages<T>(fetchPage: (cursor?: string, signal?: AbortSignal) => Promise<PrivatePage<T>>, filterSources: WatchSource[] = []) {
  const auth = useAuthStore();
  const items = ref<T[]>([]) as Ref<T[]>;
  const nextCursor = ref<string | null>(null);
  const pending = ref(false);
  const error = ref('');
  let generation = 0;
  let filterTimer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  function reset() { clearTimeout(filterTimer); generation++; controller?.abort(); items.value = []; nextCursor.value = null; error.value = ''; pending.value = false; }
  async function load(append = false) {
    if (!auth.isAuthenticated || (append && (pending.value || !nextCursor.value))) return;
    const run = ++generation; const version = auth.sessionVersion;
    controller?.abort(); const operation = new AbortController(); controller = operation;
    pending.value = true; error.value = '';
    if (!append) { items.value = []; nextCursor.value = null; }
    try {
      const page = await fetchPage(append ? nextCursor.value ?? undefined : undefined, operation.signal);
      if (run !== generation || version !== auth.sessionVersion) return;
      items.value = (append ? [...items.value, ...page.items] : page.items).slice(-200);
      nextCursor.value = page.next_cursor;
    } catch (cause) { if (run === generation && !operation.signal.aborted) error.value = apiErrorMessage(cause); }
    finally { if (run === generation) pending.value = false; }
  }
  watch(() => auth.sessionVersion, reset, { flush: 'sync' });
  watch(() => auth.isAuthenticated, value => { if (value) load(); });
  if (filterSources.length) watch(filterSources, () => {
    reset();
    filterTimer = setTimeout(() => load(), 250);
  });
  onMounted(() => load());
  onBeforeUnmount(reset);
  return { items, nextCursor, pending, error, refresh: () => { clearTimeout(filterTimer); return load(); }, loadMore: () => load(true) };
}
