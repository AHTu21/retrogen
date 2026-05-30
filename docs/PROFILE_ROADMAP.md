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
  useProfilePrefsDraft.ts  — draft + autosave/commit (ProfilePage, messenger)
  useProfilePrefsSync.ts   — read-only sync (RoomPage)
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

### Два хранилища «профиля» в UI

| Ключ / модуль | Что хранит | Где UI |
|---------------|------------|--------|
| `retrogen_profile_v1` / `profilePrefs` | Identity, комната, блокнот | `/profile`, мессенджер (данные), комната |
| `retrogen_messenger_profile_appearance_v1` | Фоны, форма аватара, цвета подписей | Только мессенджер → «Оформление» |

---

## Фазы

### Фаза A — Room identity bridge ✅

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

### Фаза B — Unified draft hook ✅

**Цель:** один паттерн load → edit → autosave/commit для ProfilePage и мессенджера.

**API:** `reload`, `discard`, `replacePrefs`, `flashHint`, `onAfterCommit`, `saveStatus`.

| Режим | autosaveMs | Где |
|-------|------------|-----|
| Autosave | 450 | ProfilePage |
| Manual | 0 | MessengerInboxSidebar |

---

### Фаза C — Legacy cleanup ✅

- Удалены `profileShell` / `hubClasses` / `fieldClass` из `profileHubTheme.ts` (живой UI — `profileDesign.ts`).
- Пол/день рождения убраны из UI мессенджера; поля остаются в `profilePrefs` для бэкапа.
- Граница `messengerProfileAppearance` ↔ `profilePrefs` задокументирована в коде и roadmap.

### Фаза D — Locked → MVP ✅ (профиль)

| Секция | Статус |
|--------|--------|
| `#notifications` | **MVP** — toggles в sidebar, prefs в `profilePrefs.notifications` |
| `#organization`, `#billing` | **Preview** — UI-панели (roadmap-функции, тарифы); backend Team+ позже |

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
| 0.15.0 | Foundation: completion, emoji, lobby events |
| 0.16.0 | Notifications MVP, org/billing preview, room identity bridge, useProfilePrefsDraft |
