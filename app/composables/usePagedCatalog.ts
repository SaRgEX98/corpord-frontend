import type { WatchSource } from 'vue';
import { apiErrorMessage } from '~/utils/api-errors';
export interface CatalogPage<T> { items: T[]; next_cursor: string | null }

/** Cursor pages, bounded DOM, cancellation and stale-response protection. */
export function usePagedCatalog<T>(fetchPage: (q: string, cursor?: string, signal?: AbortSignal) => Promise<CatalogPage<T>>, filterSources: WatchSource[] = []) {
  const items = ref<T[]>([]) as Ref<T[]>;
  const query = ref('');
  const pending = ref(true);
  const error = ref('');
  const nextCursor = ref<string | null>(null);
  let controller: AbortController | undefined;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function load(append = false) {
    if (append && (pending.value || !nextCursor.value)) return;
    const run = ++generation;
    controller?.abort(); controller = new AbortController();
    pending.value = true; error.value = '';
    if (!append) { items.value = []; nextCursor.value = null; }
    try {
      const page = await fetchPage(query.value, append ? nextCursor.value ?? undefined : undefined, controller.signal);
      if (run !== generation) return;
      items.value = (append ? [...items.value, ...page.items] : page.items).slice(-200);
      nextCursor.value = page.next_cursor;
    } catch (cause) { if (run === generation && !controller.signal.aborted) error.value = apiErrorMessage(cause); }
    finally { if (run === generation) pending.value = false; }
  }
  watch(query, () => {
    generation++; controller?.abort(); clearTimeout(timer);
    items.value = []; nextCursor.value = null; pending.value = true;
    timer = setTimeout(() => load(), 250);
  });
  if(filterSources.length)watch(filterSources,()=>{clearTimeout(timer);load();});
  onMounted(() => load());
  onBeforeUnmount(() => { generation++; controller?.abort(); clearTimeout(timer); });
  return {items,query,pending,error,nextCursor,refresh: () => load(),loadMore: () => load(true)};
}
