# Retrogen

Монорепозиторий: `client` (Vite + React), `server` (Fastify + Socket.IO + Prisma + PostgreSQL).

## Локальная разработка (PostgreSQL уже установлен)

1. **Создайте базу** в своём инстансе, например в psql или pgAdmin:
   `CREATE DATABASE retrogen;`
2. **Скопируйте** `server/.env.example` → `server/.env` и в `DATABASE_URL` укажите пользователя, пароль и имя базы (как у вас заведено в PostgreSQL, не обязательно пользователь `retrogen` из Docker).
3. **Миграции:** из корня `npm run db:deploy` (или `npm run db:migrate`). После pull с новыми миграциями — снова `db:deploy`.
4. **Prisma Client:** `npm run db:generate` (или автоматически перед `npm run dev` через `predev` в `server`). Без этого после миграций мессенджер и другие новые модели дают **500** на API.
5. **Запуск:** `npm run dev` — клиент http://localhost:5173, API и WebSocket http://localhost:3000.

### Если localhost:5173 отдаёт 404

На Windows иногда на порту **5173** остаётся старый процесс Node (только IPv6 `[::1]`), а новый Vite слушает **127.0.0.1** — тогда `http://localhost:5173` не открывается, а `http://127.0.0.1:5173` работает.

Завершите лишний процесс на 5173 (Диспетчер задач → Node.js) или в PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
```

Затем снова `npm run dev`. API через прокси Vite: `http://localhost:5173/api/...`.

Переменные для сервера читаются из **`server/.env`** (подхватываются и Prisma CLI при запуске из каталога `server`, и самим приложением).

Если `psql` не в `PATH`, добавьте `bin` установки PostgreSQL в переменную окружения или подключайтесь через pgAdmin — на работу приложения это не влияет, нужна только корректная строка `DATABASE_URL`.

## Сборка и Docker (опционально)

- Сборка: `npm run build`
- Полный стек в контейнерах: `docker compose up --build` — приложение на порту 3000, отдельная БД в compose.

Для Docker используется свой `DATABASE_URL` в compose; для локальной разработки достаточно своего PostgreSQL и `server/.env`.

## Production и переменные окружения

См. **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

## Git и совместная разработка

Команда и приглашение в GitHub Collaborators: **[docs/CONTRIBUTORS.md](./docs/CONTRIBUTORS.md)**.

1. Клонируйте репозиторий, в корне: `npm install`.
2. Скопируйте **`server/.env.example` → `server/.env`**, при необходимости **`client/.env.example` → `client/.env`** (файлы `.env` в git не попадают).
3. `npm run db:deploy`, при необходимости `npm run db:generate`, затем `npm run dev`.
4. Перед merge в общую ветку дополняйте **`CHANGELOG.md`** (раздел `[Unreleased]`) или:  
   `npm run changelog:append -- "Краткое описание для пользователя"`.
5. После merge в **`main`** GitHub Actions сам поднимает **2-ю или 3-ю** цифру версии — **[docs/VERSIONING.md](./docs/VERSIONING.md)**. Тест-стенд: ветка **`staging`** — **[docs/WORKFLOW.md](./docs/WORKFLOW.md)**. Защита веток и PR — **[docs/GITHUB_BRANCH_PROTECTION.md](./docs/GITHUB_BRANCH_PROTECTION.md)**. Прод (1-я цифра) — **[docs/ADMIN.md](./docs/ADMIN.md)**.

Удалённый репозиторий (GitHub / GitLab) создаётся у владельца проекта; после `git remote add origin <URL>` — `git push -u origin main`.
