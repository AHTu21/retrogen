# PR — Profile 0.21.0 + 0.22.0 (follow-up к #28)

Ветка → `main`. Дополняет merge #28: в `main` осталась только линия до **0.20.0**.

## Версия

**0.22.0** (`package.json` root / client / server)

## 0.21.0 — Дайджест, S3, мессенджер

- Еженедельный дайджест (`scheduler`, `UserNotificationLog`), product broadcast (admin API).
- Медиа профиля: `local` / **S3** + CDN redirect.
- Pull облака при открытии «Профиль» в мессенджере.
- Admin: `/api/admin/notifications/*`.

## 0.22.0 — Вход и навигация

- React Router 7: remount `Routes` при смене URL (фикс залипшего `/login`).
- `returnTo=/profile`, русские ошибки auth, refetch сессии на focus.

## Миграции

```bash
npm run db:push -w server
```

`server/.env.example` — SMTP, S3, `RETROGEN_NOTIFICATIONS_SCHEDULER`.

## Test plan

- [ ] `npm run dev` — вход с `/profile` → `/login` → обратно с сессией
- [ ] `db:push` — таблица `UserNotificationLog`
- [ ] Уведомления: toggles; при настроенном SMTP — дайджест (admin или scheduler)
- [ ] Аватар: local и при `RETROGEN_PROFILE_MEDIA_BACKEND=s3`
- [ ] Мессенджер: панель профиля подтягивает облако
