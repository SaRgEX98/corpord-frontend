export type ResourceKey = 'buses' | 'busCategories' | 'busStatuses' | 'drivers' | 'driverStatuses' | 'stops' | 'trips' | 'tripStops' | 'users'
export type AdminRecord = Record<string, unknown> & { id: number }
export interface Field {
  key: string
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'datetime-local' | 'select'
  relation?: ResourceKey
  options?: { value: string; label: string }[]
  optional?: boolean
  min?: number
  max?: number
  integer?: boolean
  help?: string
}
export interface ResourceDefinition {
  key: ResourceKey
  slug: string
  title: string
  singular: string
  description: string
  fields: Field[]
  columns: { key: string; label: string }[]
}
export const tripStatuses = [
  ['scheduled', 'Запланирован'], ['boarding', 'Посадка'], ['departed', 'Отправлен'],
  ['in_transit', 'В пути'], ['arrived', 'Прибыл'], ['completed', 'Завершён'],
  ['cancelled', 'Отменён'], ['delayed', 'Задержан'],
].map(([value, label]) => ({ value: value!, label: label! }))
const named = [{ key: 'name', label: 'Название' }]
const namedColumns = [{ key: 'name', label: 'Название' }]
export const adminResources: ResourceDefinition[] = [
  { key: 'trips', slug: 'trips', title: 'Рейсы', singular: 'рейс', description: 'Расписание, назначение автобусов и водителей, стоимость поездок.', fields: [
    { key: 'bus_id', label: 'Автобус', type: 'select', relation: 'buses' },
    { key: 'driver_id', label: 'Водитель', type: 'select', relation: 'drivers' },
    { key: 'start_time', label: 'Отправление', type: 'datetime-local' },
    { key: 'end_time', label: 'Прибытие', type: 'datetime-local' },
    { key: 'status', label: 'Статус', type: 'select', options: tripStatuses },
    { key: 'base_price', label: 'Базовая цена, ₽', type: 'number', min: 0 },
  ], columns: [{ key: 'route', label: 'Маршрут' }, { key: 'bus_id', label: 'Автобус' }, { key: 'driver_id', label: 'Водитель' }, { key: 'start_time', label: 'Отправление' }, { key: 'status', label: 'Статус' }, { key: 'base_price', label: 'Цена' }] },
  { key: 'tripStops', slug: 'trip-stops', title: 'Остановки рейсов', singular: 'остановку рейса', description: 'Порядок остановок, время прибытия и отправления, цена следующего участка.', fields: [
    { key: 'trip_id', label: 'Рейс', type: 'select', relation: 'trips' },
    { key: 'stop_id', label: 'Остановка', type: 'select', relation: 'stops' },
    { key: 'arrival_time', label: 'Прибытие', type: 'datetime-local' },
    { key: 'departure_time', label: 'Отправление', type: 'datetime-local' },
    { key: 'stop_order', label: 'Номер по порядку', type: 'number', min: 1, integer: true },
    { key: 'price_to_next', label: 'Цена следующего участка, ₽', type: 'number', min: 0 },
  ], columns: [{ key: 'trip_id', label: 'Рейс' }, { key: 'stop_id', label: 'Остановка' }, { key: 'stop_order', label: 'Порядок' }, { key: 'arrival_time', label: 'Прибытие' }, { key: 'departure_time', label: 'Отправление' }, { key: 'price_to_next', label: 'Цена участка' }] },
  { key: 'buses', slug: 'buses', title: 'Автобусы', singular: 'автобус', description: 'Автопарк, вместимость и эксплуатационные статусы.', fields: [
    { key: 'license_plate', label: 'Госномер' }, { key: 'brand', label: 'Марка' },
    { key: 'capacity', label: 'Количество мест', type: 'number', min: 1, integer: true },
    { key: 'category_id', label: 'Категория', type: 'select', relation: 'busCategories' },
    { key: 'status_id', label: 'Статус', type: 'select', relation: 'busStatuses' },
  ], columns: [{ key: 'license_plate', label: 'Госномер' }, { key: 'brand', label: 'Марка' }, { key: 'capacity', label: 'Мест' }, { key: 'category_id', label: 'Категория' }, { key: 'status_id', label: 'Статус' }] },
  { key: 'drivers', slug: 'drivers', title: 'Водители', singular: 'водителя', description: 'Контакты водителей и готовность к рейсам.', fields: [
    { key: 'first_name', label: 'Имя' }, { key: 'last_name', label: 'Фамилия' },
    { key: 'middle_name', label: 'Отчество', optional: true }, { key: 'phone_number', label: 'Телефон' },
    { key: 'status', label: 'Статус', type: 'select', relation: 'driverStatuses' },
  ], columns: [{ key: 'full_name', label: 'Водитель' }, { key: 'phone_number', label: 'Телефон' }, { key: 'status', label: 'Статус' }] },
  { key: 'stops', slug: 'stops', title: 'Остановки', singular: 'остановку', description: 'Названия, адреса и координаты точек маршрута.', fields: [
    { key: 'name', label: 'Название' }, { key: 'address', label: 'Адрес' },
    { key: 'latitude', label: 'Широта', type: 'number', min: -90, max: 90 },
    { key: 'longitude', label: 'Долгота', type: 'number', min: -180, max: 180 },
  ], columns: [{ key: 'name', label: 'Название' }, { key: 'address', label: 'Адрес' }, { key: 'latitude', label: 'Широта' }, { key: 'longitude', label: 'Долгота' }] },
  { key: 'users', slug: 'users', title: 'Пользователи', singular: 'пользователя', description: 'Локальные учётные записи. Роли назначаются на сервере.', fields: [
    { key: 'name', label: 'Имя' }, { key: 'email', label: 'Электронная почта', type: 'email' },
    { key: 'password', label: 'Пароль', type: 'password', help: 'До 72 байт. При редактировании оставьте пустым, чтобы сохранить текущий пароль.' },
  ], columns: [{ key: 'name', label: 'Имя' }, { key: 'email', label: 'Почта' }, { key: 'role', label: 'Роль' }, { key: 'created_at', label: 'Создан' }] },
  { key: 'busCategories', slug: 'bus-categories', title: 'Категории автобусов', singular: 'категорию', description: 'Справочник категорий автопарка.', fields: named, columns: namedColumns },
  { key: 'busStatuses', slug: 'bus-statuses', title: 'Статусы автобусов', singular: 'статус автобуса', description: 'Справочник эксплуатационных статусов.', fields: named, columns: namedColumns },
  { key: 'driverStatuses', slug: 'driver-statuses', title: 'Статусы водителей', singular: 'статус водителя', description: 'Справочник доступности водителей.', fields: named, columns: namedColumns },
]
export const findAdminResource = (slug: string) => adminResources.find(resource => resource.slug === slug)
export const resourceByKey = (key: ResourceKey) => adminResources.find(resource => resource.key === key)!

export function toLocalDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** Keep numeric zeroes; reject empty fields before Number('') can turn them into zero. */
export function buildAdminPayload(resource: ResourceDefinition, values: Record<string, string>, editing = false): { payload: Record<string, unknown>; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const payload: Record<string, unknown> = {}
  for (const field of resource.fields) {
    const raw = values[field.key] ?? ''
    const value = field.type === 'password' ? raw : raw.trim()
    if (field.type === 'password' && editing && value === '') continue
    if (value === '' && !field.optional) { errors[field.key] = 'Заполните поле'; continue }
    if (field.type === 'number' || field.relation) {
      const number = Number(value)
      if (!Number.isFinite(number) || ((field.integer || field.relation) && !Number.isSafeInteger(number)) ||
        (field.relation && number <= 0) || (field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) {
        errors[field.key] = field.relation ? 'Выберите запись из списка' : `Укажите ${field.integer ? 'целое ' : ''}число${field.min !== undefined ? ` от ${field.min}` : ''}${field.max !== undefined ? ` до ${field.max}` : ''}`
      } else payload[field.key] = number
    } else if (field.type === 'datetime-local') {
      const date = new Date(value)
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value) || !Number.isFinite(date.getTime()) || toLocalDateTime(date.toISOString()).slice(0, value.length) !== value) errors[field.key] = 'Укажите корректные дату и время'
      else payload[field.key] = date.toISOString()
    } else if (field.options && !field.options.some(option => option.value === value)) errors[field.key] = 'Выберите значение из списка'
    else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.key] = 'Укажите корректный email'
    else if (field.type === 'password' && new TextEncoder().encode(value).length > 72) errors[field.key] = 'Пароль должен занимать не более 72 байт'
    else payload[field.key] = value
  }
  if (resource.key === 'trips' && payload.start_time && payload.end_time && String(payload.end_time) <= String(payload.start_time)) errors.end_time = 'Прибытие должно быть позже отправления'
  if (resource.key === 'tripStops' && payload.arrival_time && payload.departure_time && String(payload.departure_time) < String(payload.arrival_time)) errors.departure_time = 'Отправление не может быть раньше прибытия'
  return { payload, errors }
}

/** Read DTOs expose some relation names. Never guess an ID when names are ambiguous. */
export function resolveRelationID(field: Field, row: Record<string, unknown>, references: Partial<Record<ResourceKey, AdminRecord[]>>): string {
  const raw = row[field.key]
  if (typeof raw === 'number') return String(raw)
  const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const nested = field.key === 'bus_id' ? row.bus : field.key === 'driver_id' ? row.driver : undefined
  if (typeof record(nested).id === 'number') return String(record(nested).id)
  const name = field.key === 'category_id' ? row.category : field.key === 'status_id' ? row.status : raw
  if (typeof record(name).id === 'number') return String(record(name).id)
  const matches = references[field.relation!]?.filter(item => item.name === name) ?? []
  return matches.length === 1 ? String(matches[0]!.id) : ''
}
