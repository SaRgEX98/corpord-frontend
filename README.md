# Corpord frontend

Русскоязычный интерфейс автобусных перевозок: публичные каталоги рейсов, автобусов, водителей и остановок; личный кабинет; административное управление всеми ресурсами Go API.

Стек: Nuxt 4 SPA, Vue 3, TypeScript, Pinia, Tailwind 4, Reka/shadcn, Zod. Нужен Node.js **26.1+**, как в Dockerfile и CI. Зависимости фиксируются `package-lock.json`.

```bash
npm ci
NUXT_PUBLIC_API_BASE=http://localhost:8080/api/v1 npm run dev
```

`NUXT_PUBLIC_API_BASE` — доступный браузеру URL Go API с `/api/v1`. Backend должен разрешать origin frontend в CORS. Для cookie нужны `credentials: include` (уже настроено), согласованные cookie settings и HTTPS при внешнем production-развёртывании. Access token хранится только в памяти.

```bash
npm run typecheck
npm test
npm run build
node .output/server/index.mjs
```

## Возможности

- `/`, `/trips`, `/trips/:id` — поиск и сортировка расписания, маршрут с остановками, автобус и водитель.
- `/buses`, `/drivers`, `/stops` — каталоги, фильтры и карточки.
- `/login`, `/register`, `/auth/callback` — парольная авторизация, Google/Yandex SSO.
- `/me/profile`, `/me/settings` — актуальный профиль, тема и завершение всех сессий.
- `/admin` — обзор и CRUD 9 ресурсов: рейсы, остановки рейсов, автобусы, водители, остановки, пользователи, категории автобусов и статусы автобусов/водителей. Доступ только роли `admin`, проверяемой сервером.

Светлая, тёмная и системная темы сохраняются в браузере. API заказов/бронирования, саморедактирования профиля и управления ролями отсутствуют: такие действия интерфейс не обещает.

## Изолированная браузерная проверка

Нужны Docker, доступный backend image и Chromium. Команда создаёт отдельную сеть, PostgreSQL, Redis и backend, применяет миграции, создаёт тестового администратора, собирает production frontend и запускает Playwright. Контейнеры и временные тестовые credentials удаляются в `finally`. Существующие `.env` и БД не используются.

```bash
# Если системного /usr/bin/chromium нет:
npx playwright install chromium
npm run test:e2e:isolated
```

По умолчанию: API `127.0.0.1:8082`, frontend `127.0.0.1:3101`, backend `ghcr.io/sargex98/corpord-backend:dev`. Можно задать `CORPORD_E2E_BACKEND_IMAGE` (рекомендуется immutable `sha-...`), `CORPORD_E2E_API_PORT`, `CORPORD_E2E_WEB_PORT`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Проверяются CRUD всех ресурсов, сохранение связей/нулей/дат, публичные страницы, восстановление сессии, темы, мобильная ширина и отказ обычному пользователю в admin. Трассы/скриншоты с тестовыми данными исключены из Git.

`npm run test:e2e` применяется только к отдельно подготовленному тестовому окружению; без `CORPORD_E2E_ADMIN_EMAIL` сценарии пропускаются. Параметры: `CORPORD_E2E_BASE_URL`, `CORPORD_E2E_API_URL`, `CORPORD_E2E_ADMIN_EMAIL`, `CORPORD_E2E_ADMIN_PASSWORD`.

Для административного UI необходим [backend PR #13](https://github.com/SaRgEX98/corpord-backend/pull/13): старый образ отдаёт пустую роль. Сначала merge и публикация backend, затем frontend. Harness проверяет роль перед запуском UI и объясняет несовместимость старого образа.

## Ветки, CI и GHCR

PR в `dev`/`main`: `npm ci`, typecheck, unit/contract tests и production build. PR не публикует образ. После merge в `dev` workflow публикует `ghcr.io/sargex98/corpord-frontend:dev` и `sha-<commit>`; `main` получает `latest`. Compose в соседнем `corpord-infra` использует готовые GHCR-образы: локальные изменения исходников не меняют контейнеры. После успешной публикации нужен отдельный `docker compose pull frontend` и пересоздание frontend. Merge и обновление действующего окружения выполняются после ревью владельца.

## Документация

- [Архитектура](docs/ARCHITECTURE.md)
- [Карта API](docs/API_COVERAGE.md)
- [План и ветки агентов](docs/IMPLEMENTATION_PLAN.md)
- [Логотип и prompt](docs/BRAND.md)
- [Результаты проверок и ревью](docs/REVIEW.md)
