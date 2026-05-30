const MESSAGES: Record<string, string> = {
  invalid_credentials: "Неверный email или пароль.",
  credentials_required: "Введите email и пароль.",
  invalid_email: "Некорректный email.",
  invalid_password: "Пароль: от 8 до 128 символов.",
  email_taken: "Этот email уже зарегистрирован.",
  unauthorized: "Сессия истекла — войдите снова.",
};

export function authErrorMessage(code: string | undefined, status?: number): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (status === 401) return MESSAGES.unauthorized;
  if (code) return code;
  return "Не удалось выполнить запрос. Проверьте, что сервер запущен (порт 3000).";
}

export function wrapAuthNetworkError(err: unknown): Error {
  if (err instanceof TypeError) {
    return new Error(
      "Не удалось связаться с сервером. Запустите backend: npm run dev -w server (порт 3000) и откройте сайт через http://localhost:5173",
    );
  }
  return err instanceof Error ? err : new Error("Ошибка сети");
}

/** Безопасный путь возврата после входа (только внутренние маршруты). */
export function safeAuthReturnTo(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/home";
  if (t.startsWith("/login") || t.startsWith("/register")) return "/home";
  return t;
}
