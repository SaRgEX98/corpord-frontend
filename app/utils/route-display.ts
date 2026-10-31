export function routeDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || "UTC", year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function routeTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: timezone || "UTC", hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
export function minorPrice(amount: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: amount % 100 === 0 ? 0 : 2 }).format(amount / 100);
}
export function validRouteDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}

export function routeErrorMessage(error: unknown, fallback: (error: unknown) => string) {
  const code = (error as {data?: {code?: string}})?.data?.code;
  if (code === 'timezone_required') return 'Расписание выбранной остановки уточняется. Выберите другой город или остановку.';
  if (code === 'price_unavailable') return 'Тариф выбранного участка уточняется. Попробуйте другой рейс.';
  if (code === 'trip_unavailable') return 'Этот рейс уже недоступен. Выполните поиск снова.';
  return fallback(error);
}
