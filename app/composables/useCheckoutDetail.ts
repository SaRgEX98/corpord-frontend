import { createCheckoutApi } from '~/api/checkout.api';
import { useAuthStore } from '~/store/auth';
import { checkoutError, checkoutPollDelay } from '~/utils/checkout';
import type { CheckoutDetail } from '~/types/domain/checkout';
/** Poll just the visible order; never create/reconcile a payment during a read. */
export function useCheckoutDetail(orderId: () => number) {
  const auth = useAuthStore();
  const api = createCheckoutApi(useNuxtApp().$api);
  const data = ref<CheckoutDetail | null>(null);
  const pending = ref(false);
  const working = ref(false);
  const error = ref('');
  const actionError = ref('');
  const pollingStopped = ref(false);
  let mounted = false;
  let generation = 0;
  let readSequence = 0;
  let readController: AbortController | undefined;
  let mutationController: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let polls = 0;
  let started = Date.now();
  function visible() { return mounted && document.visibilityState !== 'hidden'; }
  function stopTimer() { clearTimeout(timer); timer = undefined; }
  function reset() {
    generation++; readSequence++; stopTimer(); readController?.abort(); mutationController?.abort();
    data.value = null; error.value = ''; actionError.value = ''; pending.value = false; working.value = false;
    polls = 0; started = Date.now(); pollingStopped.value = false;
  }
  function schedule() {
    stopTimer();
    if (!data.value || !visible() || working.value || !auth.isAuthenticated) return;
    const delay = checkoutPollDelay(data.value, polls, Date.now() - started);
    pollingStopped.value = delay === null && ['awaiting_payment', 'committing', 'cancel_pending', 'refund_pending'].includes(data.value.status);
    if (delay !== null) timer = setTimeout(() => { polls++; void load(false); }, delay);
  }
  async function load(manual = true) {
    if (!auth.isAuthenticated || !mounted || working.value) return;
    if (!manual && (!visible() || Date.now() - started >= 120000)) { stopTimer(); pollingStopped.value = true; return; }
    if (manual) { polls = 0; started = Date.now(); pollingStopped.value = false; }
    stopTimer();
    const id = orderId();
    if (!Number.isSafeInteger(id) || id <= 0) { data.value = null; error.value = 'Заказ не найден.'; return; }
    const version = auth.sessionVersion; const run = generation; const sequence = ++readSequence;
    readController?.abort(); const operation = new AbortController(); readController = operation;
    pending.value = true; error.value = '';
    try {
      const result = await api.detail(id, operation.signal, version);
      if (run !== generation || sequence !== readSequence || version !== auth.sessionVersion) return;
      data.value = result; schedule();
    } catch (cause) {
      if (run !== generation || sequence !== readSequence || operation.signal.aborted) return;
      error.value = checkoutError(cause);
      // Read errors stop polling; retry is an explicit user action.
      pollingStopped.value = true;
    } finally { if (run === generation && sequence === readSequence) pending.value = false; }
  }
  async function action(kind: 'cancel' | 'reconcile') {
    if (!data.value || working.value || !auth.isAuthenticated) return;
    if (kind === 'cancel' ? !data.value.actions.can_cancel : !data.value.actions.can_reconcile) return;
    const version = auth.sessionVersion; const run = generation; const id = data.value.id;
    stopTimer(); readSequence++; readController?.abort(); pending.value = false; working.value = true; actionError.value = '';
    const operation = new AbortController(); mutationController = operation;
    try {
      if (kind === 'cancel') {
        const result = await api.cancel(id, operation.signal, version);
        if (run !== generation || version !== auth.sessionVersion) return;
        data.value = result;
      } else await api.reconcile(id, operation.signal, version);
    } catch (cause) { if (run === generation && version === auth.sessionVersion && !operation.signal.aborted) actionError.value = checkoutError(cause); }
    finally {
      if (run === generation && version === auth.sessionVersion) { working.value = false; await load(); }
    }
  }
  function visibilityChanged() {
    if (!visible()) { stopTimer(); readSequence++; readController?.abort(); pending.value = false; }
    else if (!working.value && auth.isAuthenticated) void load(false);
  }
  watch(() => auth.sessionVersion, reset, { flush: 'sync' });
  watch(() => auth.isAuthenticated, value => { if (value && mounted) void load(); });
  watch(orderId, () => { reset(); if (mounted) void load(); });
  onMounted(() => { mounted = true; document.addEventListener('visibilitychange', visibilityChanged); void load(); });
  onBeforeUnmount(() => { mounted = false; document.removeEventListener('visibilitychange', visibilityChanged); reset(); });
  return { data, pending, working, error, actionError, pollingStopped, refresh: () => load(), cancel: () => action('cancel'), reconcile: () => action('reconcile') };
}
