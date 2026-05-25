# Сводка сессии: мессенджер Retrogen (25.05.2026)

Документ для восстановления контекста после перезагрузки ПК. Содержит итоги диалога, принятые решения, созданные файлы и следующий шаг.

---

## Текущее состояние репозитория

| Параметр | Значение |
|----------|----------|
| Ветка | `feature/chat` |
| База | `main` синхронизирован с `origin/main` (коммит `5653992`, релиз 0.9.0) |
| Dev-сервер | После `npm install` перезапускали: клиент `http://localhost:5173/`, API `http://localhost:3000/` |

### Локальные незакоммиченные изменения (не от мессенджера)

- `README.md` (modified)
- `docs/CONTRIBUTORS.md` (untracked)
- `scripts/backup-to-nas.ps1` (untracked)

### Созданные в этой сессии документы (мессенджер)

- `docs/MESSENGER_TZ_REVISED.md` — улучшенное ТЗ
- `docs/MESSENGER_IMPLEMENTATION_PLAN.md` — пошаговый план реализации
- `docs/SESSION_CHAT_MESSENGER_2026-05-25.md` — этот файл
- Canvas (вне git, в Cursor): `canvases/messenger-spec-review.canvas.tsx`, `canvases/messenger-implementation-plan.canvas.tsx`

---

## Хронология диалога

### 1. Запуск проекта

- Команда: `npm run dev` из корня монорепо.
- Поднимаются `server` (tsx) и `client` (Vite).
- После обновления `main` старый dev-процесс падал из-за отсутствующих пакетов (`yjs`, `html-to-image` и др.) — исправлено через `npm install` и перезапуск.

### 2. Подтягивание `main`

- `git fetch` + `git pull --ff-only origin main`
- Было отставание на **14 коммитов** (sticker collab, sticker JSON, release 0.9.0).
- Локальные правки (`README.md`, `docs/CONTRIBUTORS.md`, `scripts/backup-to-nas.ps1`) сохранены, конфликтов не было.

### 3. Ветка для фичи

- Создана и активирована: **`feature/chat`**
- Формат имени как у других веток: `feature/...`

### 4. Улучшение ТЗ мессенджера

Исходник: `C:\Users\Atarun\Downloads\Создание мессенджера для Retrogen.docx`

**Что исправили в ТЗ:**

| Проблема | Решение |
|----------|---------|
| Лимит файлов 10 ГБ vs 10 МБ | MVP: **100 МБ** на файл, настраиваемо на сервере |
| «Любые файлы любого формата» | Allow/block list; превью только для известных типов |
| «Свободный конструктор» UI | MVP: тема, шрифт, плотность, пресеты; полный layout — позже |
| «Автономный режим» | Offline-first: кеш, черновики, очередь, досылка после reconnect |
| E2EE + поиск + модерация | MVP: HTTPS/WSS + at rest; E2EE — отдельная фаза |
| Звонки в одном релизе с чатом | Audio/video — Phase 3 |

**Добавленные блоки:** роли, жизненный цикл сообщений, поиск, антиспам, блокировки, observability, retention, интеграции с Retrogen, критерии приёмки MVP, открытые вопросы.

Полный текст: **`docs/MESSENGER_TZ_REVISED.md`**

### 5. План реализации под текущий код

Полный текст: **`docs/MESSENGER_IMPLEMENTATION_PLAN.md`**

**Архитектурные решения для Retrogen:**

1. **Не socket-first** — паттерн как сейчас: `HTTP → DB → Socket.IO fanout`.
2. **Отдельный раздел** `/messages`, не только чат внутри `RoomPage`.
3. **Отдельный server-модуль** `server/src/chat/...`, не раздувать `routes.ts` / `rooms.ts`.
4. **MVP web-only** — без звонков, E2EE, desktop, «свободного конструктора».

**Socket-комнаты (план):**

- `user:{userId}` — персональные события, unread
- `chat:{chatId}` — сообщения, typing, receipts

**Prisma (план, ещё не в коде):**

- `Chat`, `ChatMember`, `Message`, `MessageAttachment`, `MessageReceipt`

**Ключевые файлы для старта кода:**

1. `server/prisma/schema.prisma`
2. `server/src/index.ts` + новые `server/src/chat/...`
3. `server/src/socket.ts` (Bearer в handshake)
4. `client/src/types.ts`, `client/src/api.ts`, `client/src/lib/socketClient.ts`
5. `client/src/App.tsx`, `client/src/components/RetrogenOverflowMenu.tsx`
6. `client/src/pages/MessagesPage.tsx` + `client/src/components/messages/...`

**Следующий шаг по плану (не начат в коде):**

1. Prisma-модели мессенджера + миграция  
2. Backend skeleton (direct chat + текст)  
3. Route `/messages` + inbox на клиенте  
4. Realtime `chat:{id}`

---

## Что переиспользовать из текущего кода

| Область | Файлы / паттерн |
|---------|------------------|
| Маршруты | `client/src/App.tsx` |
| Меню входа | `client/src/components/RetrogenOverflowMenu.tsx` |
| HTTP + Bearer | `client/src/api.ts`, `client/src/lib/authToken.ts` |
| Socket factory | `client/src/lib/socketClient.ts` |
| Optimistic UI (образец) | `client/src/pages/RoomPage.tsx` (`tmp-*`, reconcile) |
| Room access (образец ACL) | `server/src/roomAccess.ts`, `server/src/roomsAcl.ts` |
| Socket rooms | `server/src/socket.ts` (`room:`, `lobby`) |
| Ephemeral realtime (образец) | `server/src/stickerCollabSocket.ts` |
| Пользователи | `User`, `RoomMember` в `server/prisma/schema.prisma` |

**Пробелы:** нет Chat/Message/Attachment; socket не шлёт user JWT (только `roomUnlockToken`); нет upload pipeline.

---

## Команды для быстрого старта после перезагрузки

```powershell
cd C:\Users\Atarun\Project\Atarun\Retrogen
git status
git branch
npm install
npm run dev
```

Открыть в браузере: `http://localhost:5173/`

Продолжить разработку на ветке `feature/chat`.

---

## Открытые вопросы к заказчику (из ТЗ)

1. Лимит вложений в MVP: 100 МБ достаточно?
2. Пользовательские каналы в MVP или только системные «Новости» / «Поддержка»?
3. Редактирование/удаление сообщений в MVP?
4. Web-push в первом релизе?
5. Юридические требования к хранению переписки?

---

## Как продолжить в Cursor

Напишите, например:

> Продолжаем мессенджер на `feature/chat`. Начни этап 1: Prisma schema по `docs/MESSENGER_IMPLEMENTATION_PLAN.md`.

Или приложите этот файл: `@docs/SESSION_CHAT_MESSENGER_2026-05-25.md`

---

*Сохранено автоматически по запросу пользователя перед перезагрузкой компьютера.*
