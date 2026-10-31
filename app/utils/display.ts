export function displayDate(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Не указано'
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}
export function displayTime(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
export function displayPrice(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value) }
export function displayDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return 'Время в пути не указано'
  const minutes = Math.round((Date.parse(end) - Date.parse(start)) / 60000)
  if (!Number.isFinite(minutes) || minutes < 0) return 'Время в пути не указано'
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`
}
export const tripStatusLabels: Record<string, string> = { scheduled: 'По расписанию', boarding: 'Посадка', departed: 'Отправлен', in_transit: 'В пути', arrived: 'Прибыл', completed: 'Завершён', cancelled: 'Отменён', delayed: 'Задерживается' }
