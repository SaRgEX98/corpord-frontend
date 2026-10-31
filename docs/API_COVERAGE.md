# Покрытие API фронтендом

Контракт проверен 2026-10-31 по `corpord-backend` commit
`b6b1e941f9a63fb975a68265c57465ae8b0e3ae9`: `internal/handler/handler.go`,
`internal/handler/auth.go`, моделям Go и `docs/swagger.json`.
Базовый URL задаётся `NUXT_PUBLIC_API_BASE` и включает `/api/v1`.

`useTransportApi()` использует общий клиент с Bearer access token в памяти и
`credentials: include`. Ниже `:id` — положительный числовой ID.
CRUD означает `list()`, `get(id)`, `create(input)`, `update(id,input)`, `remove(id)`.

| API-модуль | Чтение | Создание / обновление / удаление | Экран |
| --- | --- | --- | --- |
| `buses` | GET `/bus/`, `/bus/:id` | POST `/admin/bus/`, PUT/DELETE `/admin/bus/:id` | Автобусы, административный раздел |
| `busCategories` | GET `/bus/categories/`, `/bus/categories/:id` | POST `/admin/bus/categories/`, PUT/DELETE `/admin/bus/categories/:id` | Категории автобусов |
| `busStatuses` | GET `/bus/statuses/`, `/bus/statuses/:id` | POST `/admin/bus/statuses/`, PUT/DELETE `/admin/bus/statuses/:id` | Статусы автобусов |
| `drivers` | GET `/driver/`, `/driver/:id` | POST `/admin/driver/`, PUT/DELETE `/admin/driver/:id` | Водители |
| `driverStatuses` | GET `/driver/status/`, `/driver/status/:id` | POST `/admin/driver/status/`, PUT/DELETE `/admin/driver/status/:id` | Статусы водителей |
| `stops` | GET `/stops/`, `/stops/:id` | POST `/admin/stops/`, PUT/DELETE `/admin/stops/:id` | Остановки |
| `trips` | `list`: GET `/trips/`; `all`: GET `/trips/all`; `get`: GET `/trips/:id` | POST `/admin/trips/`, PUT/DELETE `/admin/trips/:id` | Каталог и карточка рейса, управление рейсами |
| `tripStops` | GET `/trip_stops/`, `/trip_stops/:id` | POST `/admin/trip_stops/`, PUT/DELETE `/admin/trip_stops/:id` | Остановки рейсов |
| `users` | GET `/admin/users`, `/admin/users/:id` | POST `/admin/users`, PUT/DELETE `/admin/users/:id` | Пользователи |
| `authApi` / `useAuth` | GET `/users/me` | POST `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout/all` | Регистрация, вход, профиль, настройки, выход |

Все административные изменения и управление пользователями проверяются backend
по актуальной роли `admin`. Пользовательские роли: `user`, `admin`.
Middleware `auth.global` защищает `/me` и `/admin`, `admin` отвергает обычного
пользователя с 403. Frontend middleware дополняет серверную проверку прав.

## Совместимость и SSO

`legacyUsers` поддерживает GET `/users`, GET `/users/:id`, POST `/users`,
DELETE `/users/:id`. Это четыре административных alias, а не альтернативные
пользовательские функции. Интерфейс использует канонический `users`;
несуществующий PUT `/users/:id` не вызывается.

GET `/auth/{provider}` открывается полной навигацией браузера для Google/Yandex.
GET `/auth/{provider}/callback` принадлежит backend: проверяет state/PKCE,
устанавливает HttpOnly cookie и перенаправляет браузер на `/auth/callback`.
Frontend callback выполняет общий refresh и загрузку `/users/me`.
Эти две Swagger-операции не являются JSON-запросами frontend.

## Особенности форматов

- Автобусы возвращают названия `category`, `status`, а не relation ID.
  Ввод использует `category_id`, `status_id`. ID нельзя выдумывать из названий:
  при неоднозначности пользователь должен явно выбрать значение справочника.
- Водители возвращают `status` как строку; `DriverInput.status` — числовой ID.
  Обновление водителя требует полный ввод; большинство других обновлений частичные.
- `/trips/` возвращает компактные `TripSummary` с `trip_id`, названиями крайних
  остановок и без вложенных сущностей. Рейсы без остановок могут отсутствовать
  в этом списке по SQL backend. Для управления всеми рейсами используется `/trips/all`.
- `/trips/all` и `/trips/:id` возвращают `Trip`: отдельные ID рейса, автобуса,
  водителя, связи остановки и вложенной остановки. `end_time` может быть `null`.
  Вложенные остановки упорядочены сервером по `stop_order`.
- Все `null`-списки нормализуются в `[]`, включая `Trip.stops`.
- Создание автобуса, водителя и справочников возвращает `{message}`;
  остановки, рейса, связи остановки и пользователя — созданную запись.
  Обновление категории/статуса автобуса и пользователя возвращает запись;
  остальные обновления возвращают `{message}`. DELETE возвращает пустой 204.
- API не предоставляет саморедактирование профиля, смену роли, бронирование,
  оплату и изменение заказа. Интерфейс не должен обещать эти операции.

## Проверки

`tests/fixtures/backend-contract.json` фиксирует все 58 Swagger-операций.
`tests/transport-api.test.mjs` сопоставляет вызовы клиента всем 56 JSON-операциям,
проверяет пути, методы, частичные обновления с нулевыми значениями, пустые списки,
различие краткой/подробной модели рейса и ошибки.
`tests/session-client.test.mjs` проверяет настоящий ofetch с подменённым transport:
общий refresh, запоздалый 401, ограничение повторов и отсутствие повторной записи
после сетевой ошибки/5xx. Изменение backend требует обновления снимка и тестов.
