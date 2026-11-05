# Кабинет и тестовая оплата

Только демонстрационные рейсы и тестовый магазин ЮKassa. Действительный билет,
реальные списания, документы и сохранение карты не входят в интерфейс.
При checkout_enabled=false прежние удержания/отмена работают без checkout API.

BookingCard принимает payment_committing/confirmed и не применяет к ним TTL
первичного held. При checkout_id используется ссылка существующего заказа;
старый hold cancel не показывается. Новое намерение создаётся только явной
кнопкой для своего действующего held с checkout_enabled. Один Idempotency-Key
на intent; network/5xx повторяет тот же hold/key. Двойной клик заблокирован.
401 retry остаётся в общем session-client и сохраняет ключ. Все новые mutations
передают captured sessionVersion; переключение сессии/маршрута abort и очищает PII.

/me/orders разделяет удержания и тестовые заказы. Фильтр status/cursor передаётся
серверу; смена фильтра очищает cursor и устаревшие строки сразу, debounce250ms.
Страница30, окно200, карточки summary без per-row GET/payment reconciliation.
Детали /me/orders/:id и /payment-return запрашивают текущий серверный Checkout.
Query status/payment_id/confirmation_url не подтверждает оплату и не открывает URL.
Auth middleware передаёт локальный return route; LoginForm проверяет и фиксирует
его до async login. External/protocol-relative/encoded separator/control/auth-loop
redirect отвергаются, безопасные детали/участок восстанавливаются после входа.

Ссылка оплаты появляется только по actions.can_view_confirmation и HTTPS URL
из detail.payment, без username/password/control chars. URL не попадает в list,
localStorage, кеш или логи. can_pay без URL означает подготовку существующего
платежа, не повторное создание. Cancel/reconcile только по серверным actions.
Reconcile — явная постановка сверки, никогда не новый POST checkout.

Polling делает GET одного видимого pending заказа, не provider call. Учитывается
next_poll_after_ms с backoff1..30s, не более12 polls/120сек на открытие/ручной refresh.
Пауза hidden tab, остановка terminal/review/unmount/logout; late responses защищены
read sequence/generation/sessionVersion. Сетевая ошибка останавливает polling,
предлагая ручную загрузку. Остановка polling не превращает unknown в failed/paid.

Проверки: tests/checkout.test.mjs — транспорт/cursor/key/session, URL, budgets,
expiry protection и исполнение настоящего detail controller на смене владельца,
маршрута/visibility и terminal. E2E checkout-passenger.spec.ts gated только
CORPORD_E2E_CHECKOUT_FIXTURE disposable fake-provider harness. Он проверяет
committed response loss/replay, login return, return до/после verification, paid,
cancel/fail/unknown/refund, ownership, list без perrow, mobile390/dark.
Fake-provider проверки не доказывают подключение настоящего ЮKassa sandbox.

Login redirect security: tests/login-redirect.test.mjs проверяет обходы URL и
исполняет настоящий onSubmit с изменением route.query во время async login.
