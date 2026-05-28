# План реализации мессенджера для текущего кода Retrogen

Документ переводит `docs/MESSENGER_TZ_REVISED.md` в практический пошаговый план внедрения мессенджера в текущую архитектуру Retrogen.

## 1. Что важно учитывать в текущем коде

Текущий Retrogen уже даёт хорошую основу, но она ориентирована не на мессенджер, а на комнаты, доску и realtime-обновления по комнате:

- фронтенд уже использует маршруты в `client/src/App.tsx`, но отдельного layout-слоя для всего приложения нет;
- HTTP-запросы централизованы в `client/src/api.ts`;
- сокеты создаются через `client/src/lib/socketClient.ts`;
- сервер построен вокруг `server/src/index.ts`, `server/src/routes.ts` и `server/src/socket.ts`;
- Prisma уже содержит `User`, `Room`, `RoomMember`, но не содержит сущностей `Chat`, `Message`, `Attachment`, `Receipt`.

Из этого следуют 4 базовых проектных решения:

1. **Не делать socket-first мессенджер на первом этапе.**  
   Для текущей архитектуры лучше использовать существующий паттерн: `HTTP -> DB -> socket fanout`.  
   То есть создание/редактирование сообщения идёт через REST, а сокет используется для realtime-доставки, typing, presence и receipt-событий.

2. **Не встраивать мессенджер в `RoomPage` как единственный чат.**  
   Комнатный чат может стать отдельной фазой позже, но по ТЗ нужен полноценный мессенджер с личными чатами, группами и каналами. Значит нужен отдельный домен мессенджера, а не "ещё один блок в комнате".

3. **Не перегружать `server/src/routes.ts` новой бизнес-логикой.**  
   Роуты можно зарегистрировать из существующего entrypoint, но доменную логику мессенджера лучше выделить в отдельные модули.

4. **Сначала web-only MVP.**  
   Без звонков, без E2EE, без desktop и без "полностью свободного конструктора" интерфейса. Иначе объём становится несоразмерным текущему коду.

## 2. Рекомендуемая целевая архитектура MVP

## 2.1. Доменная модель

Для MVP нужен отдельный домен мессенджера со следующими сущностями:

- `Chat`
- `ChatMember`
- `Message`
- `MessageAttachment`
- `MessageReceipt`
- `ChatMuteSetting` или `UserChatSetting`

Опционально, но не обязательно в первой миграции:

- `ChatDraft`
- `UserPresenceSnapshot`
- `ChatPin`

## 2.2. Frontend-архитектура

На клиенте рекомендуется ввести отдельный раздел:

- `/messages` - список чатов и стартовый экран;
- `/messages/:chatId` - открытый чат.

Точки интеграции:

- `client/src/App.tsx` - добавить route-ы;
- `client/src/components/RetrogenOverflowMenu.tsx` - добавить вход в мессенджер;
- `client/src/api.ts` - добавить messenger REST-клиент;
- `client/src/lib/socketClient.ts` - добавить socket-auth через Bearer token;
- `client/src/types.ts` - ввести типы чатов, сообщений, receipt и event payload.

## 2.3. Backend-архитектура

На сервере рекомендуется ввести отдельный модуль мессенджера:

- `server/src/chat/chatRoutes.ts`
- `server/src/chat/chatService.ts`
- `server/src/chat/chatSocket.ts`
- `server/src/chat/chatAccess.ts`

Если пока не хочется заводить каталог, минимально допустим плоский старт:

- `server/src/chatRoutes.ts`
- `server/src/chat.ts`
- `server/src/chatSocket.ts`

Важно: `server/src/routes.ts` должен остаться маршрутизатором домена комнаты, а не превращаться в второй монолит.

## 2.4. Realtime-модель

Для текущего проекта логичнее использовать такую схему:

- HTTP создаёт сообщение и пишет его в БД;
- сервер после записи делает `io.to(chatRoom).emit(...)`;
- клиент обновляет UI локально через patch/event stream.

Сокет-комнаты:

- `user:${userId}` - персональные события пользователя, глобальные unread-счётчики, приглашения;
- `chat:${chatId}` - события одного чата;
- позже, при необходимости: `presence:${chatId}` как логическое разделение эфемерных событий.

## 3. Порядок внедрения

Ниже план разбит на реалистичные волны, которые можно делать последовательно и проверять после каждой итерации.

## 3.1. Этап 0. Архитектурная фиксация scope

### Цель

Зафиксировать границы MVP до начала разработки, чтобы не смешать в одной ветке текстовый чат, звонки, uploads на 10 ГБ, E2EE и desktop.

### Что решить

1. В MVP входят:
   - личные чаты;
   - групповые чаты;
   - 2 системных канала;
   - текст;
   - reply;
   - базовые вложения;
   - unread/read;
   - поиск;
   - уведомления;
   - персональные настройки.
2. В MVP не входят:
   - звонки;
   - E2EE;
   - desktop;
   - полностью свободный конструктор интерфейса;
   - большие resumable uploads.
3. Зафиксировать размер вложений для MVP. Рекомендация: `100 МБ`.
4. Утвердить, что source of truth для сообщений - БД, а не socket-only память.

### Результат этапа

- согласованный scope;
- утверждённый список сущностей;
- согласованный лимит вложений;
- согласованный первый набор REST и socket событий.

## 3.2. Этап 1. Подготовка схемы данных Prisma

### Цель

Добавить в БД минимальный набор сущностей, чтобы можно было хранить чаты, сообщения, участников и статусы прочтения.

### Основные изменения

Файл:

- `server/prisma/schema.prisma`

Нужно добавить:

- `enum ChatKind { direct group channel system }`
- `enum ChatMemberRole { owner admin member }`
- `enum MessageKind { text system file }`
- `enum ReceiptKind { delivered read }`

Модели:

- `Chat`
- `ChatMember`
- `Message`
- `MessageAttachment`
- `MessageReceipt`

### Рекомендованный минимальный состав полей

`Chat`:

- `id`
- `kind`
- `title`
- `description`
- `avatarUrl`
- `createdById`
- `createdAt`
- `updatedAt`
- `lastMessageId`
- `isArchived`

`ChatMember`:

- `chatId`
- `userId`
- `role`
- `joinedAt`
- `lastReadMessageId`
- `mutedUntil`

`Message`:

- `id`
- `chatId`
- `authorId`
- `kind`
- `text`
- `replyToMessageId`
- `clientMessageId`
- `createdAt`
- `updatedAt`
- `editedAt`
- `deletedAt`

`MessageAttachment`:

- `id`
- `messageId`
- `storageKey`
- `originalName`
- `mimeType`
- `sizeBytes`
- `checksum`
- `createdAt`

`MessageReceipt`:

- `messageId`
- `userId`
- `kind`
- `createdAt`

### Что важно учесть

1. Для direct chat нужен уникальный механизм, чтобы не создавать дубль диалога между одной и той же парой пользователей.
2. Для дедупликации исходящих сообщений нужен `clientMessageId`.
3. `lastReadMessageId` лучше держать на уровне участника чата, а не как отдельное вычисление на клиенте.

### Итог этапа

- новая Prisma schema;
- миграция;
- сгенерированный Prisma client;
- документированная ER-модель чата.

## 3.3. Этап 2. Backend-скелет мессенджера

### Цель

Выделить новую серверную зону ответственности под мессенджер, не раздувая текущие файлы комнаты.

### Основные изменения

Файлы:

- `server/src/index.ts`
- `server/src/routes.ts`
- новые `server/src/chat/...`

### Что сделать

1. Зарегистрировать chat routes из общего entrypoint сервера.
2. Вынести chat business logic в отдельный service module.
3. Ввести отдельный access helper для чатов:
   - чтение чата;
   - отправка сообщений;
   - управление участниками;
   - модерация.
4. Не смешивать ACL чатов и ACL комнат, но переиспользовать стиль текущих helper-функций.

### Рекомендуемый набор route-модулей

- `chatRoutes.ts` - HTTP endpoints
- `chatService.ts` - create/list/send/read/update logic
- `chatAccess.ts` - access checks
- `chatSocket.ts` - websocket registration
- `chatDto.ts` - сериализация DTO

### Итог этапа

- backend-каркас мессенджера подключён;
- доменная логика не лежит в `rooms.ts`;
- сервер готов к REST и socket-этапам.

## 3.4. Этап 3. Auth и доступ в сокетах

### Цель

Сделать нормальную пользовательскую авторизацию в Socket.IO, потому что сейчас сокеты знают только `roomUnlockToken`.

### Основные изменения

Файлы:

- `client/src/lib/socketClient.ts`
- `server/src/socket.ts`
- новый `server/src/chat/chatSocket.ts`
- auth helper на сервере

### Что сделать

1. Клиент должен передавать Bearer token в `socket.auth`.
2. Сервер должен уметь извлекать пользователя из socket handshake.
3. После подключения авторизованный пользователь должен автоматически входить в комнату `user:${userId}`.
4. Вход в `chat:${chatId}` должен сопровождаться server-side проверкой membership.

### Важный выбор

Для первой версии не нужно переводить отправку сообщений на socket-команды.  
Достаточно:

- `POST /api/chats/:id/messages` создаёт сообщение;
- сервер рассылает событие в `chat:${id}`;
- клиент получает новое сообщение и reconcile-ит локальный optimistic state.

### Итог этапа

- пользователь авторизован в HTTP и socket одинаково;
- доступны персональные realtime-события;
- появляется база для presence, typing и unread.

## 3.5. Этап 4. REST API MVP

### Цель

Собрать минимальный REST-контур, на котором уже можно построить живой интерфейс.

### Рекомендуемые endpoints

Список чатов и чат:

- `GET /api/chats`
- `GET /api/chats/:chatId`
- `POST /api/chats/direct`
- `POST /api/chats/group`

Участники:

- `POST /api/chats/:chatId/members`
- `DELETE /api/chats/:chatId/members/:userId`
- `PATCH /api/chats/:chatId/members/:userId`

Сообщения:

- `GET /api/chats/:chatId/messages?cursor=...`
- `POST /api/chats/:chatId/messages`
- `PATCH /api/chats/:chatId/messages/:messageId`
- `DELETE /api/chats/:chatId/messages/:messageId`
- `POST /api/chats/:chatId/read`

Поиск:

- `GET /api/chats/:chatId/search?q=...`

Настройки:

- `PATCH /api/chats/:chatId/settings`

### Что делать не надо

На этом этапе не нужно:

- делать пересылку;
- добавлять reactions;
- усложнять system channels moderation;
- строить сложную полнотекстовую индексацию.

Для MVP достаточно cursor pagination и простого поиска по `ILIKE` / `contains`-стратегии.

### Итог этапа

- backend закрывает базовые сценарии личных и групповых чатов;
- API можно использовать для фронтенда без заглушек.

## 3.6. Этап 5. Realtime: сообщения, typing, presence, read

### Цель

Добавить живую синхронизацию поверх REST without rewriting the whole architecture.

### События MVP

Server -> client:

- `chat:message.created`
- `chat:message.updated`
- `chat:message.deleted`
- `chat:receipt.updated`
- `chat:typing`
- `chat:presence`
- `chat:list.updated`

Client -> server:

- `chat:join`
- `chat:leave`
- `chat:typing`
- `chat:presence.ping`

### Что можно делать через in-memory state

Допустимо хранить в памяти:

- typing;
- online/presence snapshot;
- временные socket membership map.

Не нужно хранить только в памяти:

- сообщения;
- receipt history;
- unread counters;
- attachment metadata.

### Что переиспользовать из существующего кода

1. Паттерн Socket.IO rooms из `server/src/socket.ts`.
2. Паттерн эфемерных событий из `server/src/stickerCollabSocket.ts`.
3. Клиентский socket factory из `client/src/lib/socketClient.ts`.
4. Паттерн `snapshot + socket patches` из `RoomPage`.

### Итог этапа

- чат живо обновляется у всех участников;
- typing и read status работают без polling;
- архитектура остаётся совместимой с текущим приложением.

## 3.7. Этап 6. Frontend shell мессенджера

### Цель

Встроить новый раздел в текущую навигацию Retrogen.

### Основные изменения

Файлы:

- `client/src/App.tsx`
- `client/src/components/RetrogenOverflowMenu.tsx`
- `client/src/api.ts`
- `client/src/types.ts`
- новые `client/src/pages/MessagesPage.tsx`
- новые `client/src/components/messages/...`
- новые `client/src/lib/messages/...`

### Что сделать

1. Добавить route-ы:
   - `/messages`
   - `/messages/:chatId`
2. Добавить вход в мессенджер в главное меню.
3. Добавить API-клиент для:
   - списка чатов;
   - списка сообщений;
   - создания чата;
   - отправки сообщения;
   - read receipt;
   - управления участниками.
4. Вынести типы DTO в `client/src/types.ts` или соседний messenger types module.

### UI-состав MVP

Страница мессенджера должна состоять из:

- левой колонки со списком чатов;
- центральной панели текущего диалога;
- шапки чата;
- сообщения;
- composer с reply;
- локального состояния загрузки, ошибок и reconnect.

### Итог этапа

- мессенджер доступен из интерфейса;
- пользователь может войти в список чатов и открыть диалог.

## 3.8. Этап 7. Отправка сообщений и optimistic UI

### Цель

Сделать отправку сообщений быстрой и отзывчивой без ожидания round-trip.

### Что сделать

1. При отправке сообщения создавать локальную запись с `tmp-*` ID.
2. Генерировать `clientMessageId`.
3. После успешного ответа REST заменять временное сообщение серверным.
4. При приходе socket event сверять его с optimistic entry и не дублировать сообщение.
5. При ошибке перевести сообщение в статус `ошибка` и дать retry.

### Что переиспользовать

Паттерн optimistic reconcile уже есть в `RoomPage`, его стоит использовать как образец, а не придумывать новую модель состояния.

### Итог этапа

- отправка кажется мгновенной;
- дубликаты подавляются;
- сетевые ошибки понятны пользователю.

## 3.9. Этап 8. Вложения и storage

### Цель

Добавить базовый, но рабочий upload pipeline, которого сейчас в проекте нет.

### Основные изменения

Файлы:

- `server/src/index.ts`
- новый storage module
- новые upload endpoints
- клиентские file attach components

### Рекомендуемый подход для MVP

1. Использовать локальное файловое хранилище на сервере для dev/staging.
2. Ввести абстракцию storage provider, чтобы позже перейти на S3/совместимое хранилище.
3. Добавить `multipart` обработку.
4. Раздавать загруженные файлы через отдельный контролируемый маршрут, а не через "голую" директорию без проверки прав.

### Минимальный pipeline

1. Клиент выбирает файл.
2. Клиент грузит файл на `POST /api/uploads`.
3. Сервер валидирует размер/MIME/имя.
4. Сервер сохраняет файл и возвращает metadata.
5. Клиент использует attachment metadata при отправке сообщения.

### Итог этапа

- в чате можно прикладывать файлы;
- хранение отделено от UI;
- есть путь к дальнейшему переходу на объектное хранилище.

## 3.10. Этап 9. Unread, поиск, mute, настройки

### Цель

Довести мессенджер до рабочего продуктового состояния, а не только до демо переписки.

### Что сделать

1. Unread counters:
   - вычисление по `lastReadMessageId`;
   - обновление списка чатов и `user:${userId}` room.
2. Read receipts:
   - mark as read при открытии чата и достижении нижней границы viewport;
   - fanout в чат.
3. Поиск:
   - поиск по тексту;
   - поиск по имени вложения;
   - подсветка совпадений.
4. Настройки:
   - mute на период;
   - звуковые уведомления;
   - тема/плотность/размер шрифта;
   - локальные настройки превью медиа.
5. Черновики:
   - локальное сохранение по chatId.

### Итог этапа

- мессенджер пригоден для повседневного использования внутри продукта;
- список чатов и уведомления ведут себя ожидаемо.

## 3.11. Этап 10. Тесты, диагностика, стабилизация

### Цель

Снизить риск регрессий и обеспечить поддержку после запуска.

### Что проверить

Backend:

- создание direct chat без дублей;
- отправка сообщения;
- receipt flow;
- ACL для чтения и публикации;
- пагинация истории;
- вложения и размерные лимиты.

Frontend:

- route `/messages`;
- открытие чата;
- optimistic sending;
- reconnect;
- dedupe после socket event;
- ошибки upload/send.

Realtime:

- join/leave chat room;
- typing debounce;
- online/offline transitions;
- unread counter patch;
- mark-as-read fanout.

### Наблюдаемость

Нужно добавить:

- логирование ошибок отправки;
- логирование socket reconnect;
- метрики создания сообщений и upload failures;
- алерты по росту ошибок realtime или upload.

### Итог этапа

- MVP готов к релизу на staging;
- команда понимает, где смотреть логи и как воспроизводить проблемы.

## 4. Разбиение по поставкам

Чтобы не зависнуть в "вечной разработке", рекомендуется такой порядок инкрементов.

## Инкремент 1

- Prisma schema;
- backend skeleton;
- direct chats;
- список чатов;
- отправка текста;
- чтение истории;
- basic realtime.

## Инкремент 2

- group chats;
- read receipts;
- unread counters;
- search;
- mute/settings;
- системные каналы.

## Инкремент 3

- attachments;
- drag-and-drop;
- preview;
- локальные drafts;
- browser notifications.

## Инкремент 4

- модерирование;
- роли;
- удаление/редактирование сообщений;
- подготовка к каналам пользователей;
- hardening и observability.

## 5. Приоритет файлов для первой реальной разработки

Если переходить от плана к коду, менять разумнее всего в таком порядке:

1. `server/prisma/schema.prisma`
2. `server/src/index.ts`
3. новые `server/src/chat/...`
4. `server/src/socket.ts`
5. `client/src/types.ts`
6. `client/src/api.ts`
7. `client/src/lib/socketClient.ts`
8. `client/src/App.tsx`
9. `client/src/components/RetrogenOverflowMenu.tsx`
10. новые `client/src/pages/MessagesPage.tsx`
11. новые `client/src/components/messages/...`

## 6. Что я рекомендую делать прямо следующим шагом

Самая безопасная следующая итерация для этой ветки:

1. Спроектировать и добавить Prisma-модели `Chat`, `ChatMember`, `Message`, `MessageReceipt`, `MessageAttachment`.
2. Поднять backend skeleton мессенджера с direct chats и текстовыми сообщениями.
3. Добавить route `/messages` и простую страницу inbox на фронтенде.
4. Подключить realtime-обновление новых сообщений через `chat:${chatId}`.

Это даст первый вертикальный slice мессенджера на текущем стеке Retrogen без попытки решить все продуктовые требования сразу.
