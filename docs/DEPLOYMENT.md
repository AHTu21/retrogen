# Развёртывание Retrogen (production)

Монорепо: статика клиента (`client/dist`), API и Socket.IO на Fastify (`server`). В production сервер может отдавать SPA с `NODE_ENV=production`.

## Переменные окружения (сервер)

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | PostgreSQL для Prisma, например `postgresql://user:pass@host:5432/retrogen` |
| `PORT` | Порт HTTP (по умолчанию `3000`) |
| `HOST` | Интерфейс прослушивания (по умолчанию `0.0.0.0`) |
| `NODE_ENV` | `production` — раздача `client/dist` и fallback на `index.html` |
| `RETROGEN_THEME_DENIED_SUBSTRINGS` | Опционально: дополнительные запрещённые подстроки темы через **запятую** (без регистра). Пример: `spam,evil` |
| `JWT_SECRET` | Секрет подписи JWT (минимум 16 символов). В production **обязателен**; без него сервер не стартует. |

## Миграции БД

Перед первым запуском и после обновления кода:

```bash
npm run db:deploy
```

Локально при разработке: `npm run db:migrate` в workspace `server`.

## Сборка

```bash
npm run build
```

## Рекомендуемый production-стек

- **Обратный прокси** (Caddy / nginx): TLS, gzip, заголовки безопасности.
- **Процесс** под systemd/Docker Compose: один контейнер с приложением + отдельный сервис PostgreSQL.
- **Бэкапы**: регулярный снимок БД (`pg_dump`) и политика хранения.
- **Healthchecks**: GET на корень приложения или отдельный endpoint при необходимости (расширение по задаче).

## Socket.IO

Путь **`/socket.io`**. Убедитесь, что прокси не буферизует WebSocket дольше таймаута и пробрасывает `Upgrade`.

## Модерация темы

Базовый список регулярных выражений и опционально `RETROGEN_THEME_DENIED_SUBSTRINGS` описаны в коде сервера (`server/src/config/themeModeration.ts`, `sanitizeTheme`). Отклонённые темы логируются на уровне `warn` при создании комнаты.
