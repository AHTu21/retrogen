# Профиль Retrogen — план развития

Архитектура: **prefs в localStorage** (`retrogen_profile_v1`) + события **`retrogen-profile`** / **`retrogen-lobby-prefs`**. UI — **list-detail** (`profileDesign.ts`), секции — **`profileHubTheme.ts`**.

---

## Слои кода

```
lib/
  profilePrefs.ts          — схема, load/save, sanitization
  profileUser.ts           — displayHandle, displayNameWithStatus, initials
  roomActorProfile.ts      — identity участника в комнате (из prefs + auth)
  profileCompletion.ts     — задачи заполнения (%)
  useProfilePrefsSync.ts   — read + commit + event bus
  useLobbyPrefsSync.ts     — visited/favorites revision
  profileBackup.ts         — JSON export/import v1

pages/profile/
  ProfilePage.tsx          — orchestrator (draft + autosave + auth sync)
  ProfileSectionPanels.tsx — router секций
  panels/*                 — one panel per section
  profile*Ui.tsx           — presentation blocks per section

pages/RoomPage.tsx         — потребитель prefs (оформление + identity)
components/room/           — UI комнаты, связанный с профилем
```

**Правило зависимостей:** `lib/` не импортирует из `pages/`. Общие хелперы имени — только в `lib/profileUser.ts`.

---

## Фазы

### Фаза A — Room identity bridge ✅ (в работе)

**Цель:** то, что пользователь настраивает в «Личные данные», видно в комнате (имя на стикерах, chip в шапке).

| Задача | Файлы |
|--------|--------|
| Единый resolver identity | `lib/roomActorProfile.ts` |
| Chip в шапке комнаты | `components/room/RoomActorIdentityChip.tsx` |
| RoomPage: prefs hook, имя из профиля | `RoomPage.tsx` |
| Убрать мёртвый `retrogen_guest_name` | `RoomPage.tsx` |

**Логика имени:**
- **API / authorDisplayName / @mentions** — plain `displayHandle` (без emoji).
- **UI (шапка, collab label)** — `displayNameWithStatus` (с emoji).

---

### Фаза B — Unified draft hook

**Цель:** один паттерн load → edit → autosave для ProfilePage и мессенджера.

```
useProfilePrefsDraft()
  prefs, setPrefs, isDirty, commit, discard
  + refresh on retrogen-profile только если !isDirty
```

| Заменить | Файл |
|----------|------|
| ~80 строк manual state | `ProfilePage.tsx` |
| profileDraft + hook | `MessengerInboxSidebar.tsx` |

---

### Фаза C — Legacy cleanup

- Удалить `@deprecated profileShell` из `profileHubTheme.ts`
- Gender/birthDate — только legacy storage; UI только в messenger modal или убрать
- `messengerProfileAppearance` — документировать границу с `profilePrefs`

---

### Фаза D — Locked → MVP

| Секция | MVP |
|--------|-----|
| `#notifications` | Email-тумблеры (local), форма без backend |
| `#organization` | Read-only placeholder org |
| `#billing` | Tariff card stub |

Разблокировка: `locked: false`, `navHidden: false` в `PROFILE_NAV`.

---

### Фаза E — Cloud sync (бэклог)

- PATCH `/api/me/profile` — notepad, room theme, identity
- Merge strategy: server wins vs local draft
- GDPR export через API

---

## События и sync

| Событие | Когда | Подписчики |
|---------|-------|------------|
| `retrogen-profile` | save prefs | ProfilePage†, RoomPage, messenger hook |
| `retrogen-lobby-prefs` | visited/favorites | useLobbyPrefsSync, ProfilePage |

† ProfilePage не перезагружает prefs при `isDirty` (черновик).

---

## Дизайн UI (константы)

Все секции `/profile` — токены `ProfileDesign` (`profileDesign.ts`). Комната использует **свои** zinc/sky классы; chip профиля — **нейтральный pill**, не дублирует profileDesign (разные контексты).

---

## Версии

| Версия | Содержание |
|--------|------------|
| 0.15.0 | Foundation: completion, emoji, lobby events, roadmap |
| 0.16.0 | Room identity bridge (Фаза A) |
| 0.17.0 | useProfilePrefsDraft (Фаза B) |
