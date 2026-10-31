/** Show API messages only; never expose request URLs, headers or fetch internals. */
export function apiErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object")
    return "Не удалось выполнить запрос. Попробуйте ещё раз.";
  const value = error as {
    data?: { error?: unknown };
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };
  const status = value.statusCode ?? value.status ?? value.response?.status;
  if (status && status >= 500)
    return "Сервис временно недоступен. Попробуйте позже.";
  if (typeof value.data?.error === "string" && value.data.error.trim())
    return value.data.error;
  switch (status) {
    case 400:
      return "Проверьте введённые данные.";
    case 401:
      return "Войдите в аккаунт, чтобы продолжить.";
    case 403:
      return "Для этого действия нужны права администратора.";
    case 404:
      return "Запись не найдена.";
    case 409:
      return "Данные конфликтуют с существующей записью или используются в других записях.";
    default:
      return "Не удалось выполнить запрос. Проверьте подключение и попробуйте ещё раз.";
  }
}
