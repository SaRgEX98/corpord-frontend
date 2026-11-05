# Удержание места и кабинет пассажира

MVP удерживает одно автоматически назначенное место на выбранном участке на
10 минут. Это не оплата и не билет. Для демонстрационных рейсов явно показаны
тестовые расписание, цена и удержание; реальные рейсы без inventory остаются
недоступными для удержания, количество мест не выводится из capacity автобуса.

Детали участка загружают availability после перехода на страницу рейса.
Сохранённые пассажиры запрашиваются только при фокусе выбора, по30, окно100.
Имя можно ввести вручную; никаких документов и платёжных данных не собирается.
Переход через login сохраняет ID участка в redirect.

POST /me/bookings использует Idempotency-Key, сохранённый вместе с неизменяемым
payload и версией сессии. После transport/5xx ошибки ручная повторная попытка
использует тот же ключ; форма блокирует изменение пассажира. Автоматического
повтора при network/5xx нет. Общий session client может повторить401 после refresh
с тем же ключом. При409 показывается причина и availability перепроверяется.

/me/orders — cursor история удержаний, локально раскрываемые детали, явная
проверка статуса и отмена. Список уже содержит все поля карточек: нет per-row
запросов. /me/passengers — создание, изменение, удаление сохранённых имён.
Списки по30 и максимум200 в DOM, AbortController/generation guard, очистка при
смене sessionVersion и размонтировании. Данные не сохраняются в localStorage
или общем публичном кеше. Удаление/изменение шаблона не меняет имя в удержании.

Один таймер на видимую страницу/панель, останавливается при размонтировании.
UI вычисляет expired по expires_at без ожидания фонового worker; остаток никогда
не отрицателен. Часы устройства могут отличаться от серверных, поэтому явная
кнопка проверки статуса запрашивает БД. Продление TTL не предусмотрено.

Проверки: tests/booking.test.mjs исполняет транспорт, сохранение key/body на retry,
401 refresh, запрет другой сессии, boundary expiry, late owner response и окно200.
E2E booking-passenger.spec.ts использует исключительно disposable stack с
CORPORD_E2E_BOOKING_FIXTURE; реальные login/passenger/hold/history/cancel/ACL,
потеря ответа после committed POST, повтор с тем же ключом, simulated device time,
mobile390/dark. Без fixture тест пропускается и ничего не пишет в существующую БД.

The disposable runner now installs a synthetic bookable fixture and exercises the
quality API as well. Until the matching backend feature is merged into its dev
image, set `CORPORD_E2E_BACKEND_IMAGE` to an image containing both booking/quality
migrations and handlers. It must never point at a separately running database;
the runner always creates and destroys its own PostgreSQL/Redis and test accounts.
