# PR #28 — Profile foundation (0.15.0 → 0.22.0)

Ветка: `feature/profile-foundation` → `main`

## Версия релиза

**0.22.0** (`client/package.json`) — итоговая версия PR после merge.

## Кратко

Единый центр настроек `/profile`, облачная синхронизация prefs, медиа на сервере, email-уведомления, мост с мессенджером и комнатой, исправления входа и навигации.

## CHANGELOG по версиям

### 0.22.0 — Вход и навигация

- Исправлен залипший UI при переходе на `/login` (React Router 7: remount `Routes` по pathname).
- Кнопки «Войти» вызывают `navigate()` + `returnTo=/profile`.
- Русские сообщения об ошибках входа; подсказка при недоступном backend.
- Обновление сессии на `/profile` при возврате на вкладку.

### 0.21.0 — Дайджест, S3, pull в мессенджере

- Еженедельный дайджест (scheduler), рассылка новостей (admin API), `UserNotificationLog`.
- Медиа профиля: `local` / **S3** + CDN redirect.
- Pull облака при открытии панели «Профиль» в мессенджере.

### 0.20.0 — Email «Завершение ретро»

- Письмо участникам `RoomMember` после `POST /api/rooms/:slug/end`.
- SMTP (`RETROGEN_SMTP_*`) или лог в консоль.

### 0.19.0 — Messenger cloud bridge

- Общий `profileAvatarUpload.ts`; аватар на сервере из мессенджера.
- Push prefs в облако после commit; sync UX «Локально» + «Повторить».

### 0.18.0 — Медиа и конфликты

- `POST/GET/DELETE /api/auth/me/profile/media/{avatar|wallpaper}`.
- Conflict banner (мои / сервер / объединить).

### 0.17.0 — Cloud sync MVP

- `GET/PATCH /api/auth/me/profile`, `User.profileJson`.
- Pull/push, карточки в Identity и Security.

### 0.16.0–0.16.1 — Notifications, org/billing, polish

- Секция «Уведомления», preview «Организация» и «Тариф».
- Identity bridge в комнату, `useProfilePrefsDraft`.

### 0.15.0 — Foundation

- Заполнение профиля, emoji, lobby events, roadmap-панели.

## Миграции и env

```bash
npm run db:push -w server   # или db:migrate, если история миграций чистая
```

Опционально в `server/.env`:

- `RETROGEN_SMTP_*`, `RETROGEN_APP_URL`
- `RETROGEN_PROFILE_MEDIA_BACKEND=s3` + `RETROGEN_S3_*`
- `RETROGEN_NOTIFICATIONS_SCHEDULER=false` — отключить scheduler

## Test plan

- [ ] `npm run dev` — client :5173, server :3000
- [ ] Гость → «Войти в аккаунт» → форма входа → возврат на `/profile` с сессией
- [ ] Cloud sync: pill «Синхронизировано» / «Локально»
- [ ] Аватар в `/profile` и мессенджере
- [ ] Уведомления, экспорт JSON в «Безопасность»
- [ ] Имя/emoji в комнате (chip)
