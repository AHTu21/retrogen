# Settings Hub — центр настроек Retrogen

Сквозное окно настроек: единая точка входа для параметров приложения, профиля и модулей (доска, мессенджер, …). Работает поверх любой страницы без навигации.

## Цели

- **Один вход** — пункт «Настройки» в overflow-меню и `Ctrl+,` открывают одно окно.
- **Микросервисная архитектура** — каждый модуль регистрирует раздел; ядро не знает деталей панелей.
- **Окно как у desktop-приложения** — перетаскивание, resize (угол), пресеты S/M/L, полноэкранный режим.
- **Persist** — размер, позиция, последний раздел → `localStorage` (`retrogen_settings_hub_v1`).

## Не входит (пока)

- Серверная синхронизация layout между устройствами.
- Поиск по настройкам (заложены `keywords` в registry).
- Полная замена страницы `/profile` — hub дублирует ключевые разделы и даёт deep-link в профиль.

## Слои

```
main.tsx
  SettingsHubProvider   ← context, prefs draft, auth, layout state
  App
  SettingsHubOverlay    ← portal в document.body

settings/
  settingsHubTypes.ts     ← ID разделов, layout, events
  settingsHubLayout.ts   ← persist, presets, clamp
  settingsHubRegistry.ts ← метаданные разделов (группы, status)
  SettingsHubProvider.tsx
  SettingsHubWindow.tsx  ← drag, resize, fullscreen, backdrop
  SettingsHubNav.tsx
  SettingsHubContent.tsx ← switch по section
  panels/                ← UI разделов (переиспользуют profile/messenger)
```

## API для интеграции

```ts
import { useSettingsHub, openSettingsHub } from "../settings";

// React
const { open, close, setSection } = useSettingsHub();
open({ section: "board" });

// Вне React
openSettingsHub({ section: "chat" });

// Custom event
window.dispatchEvent(new CustomEvent("retrogen-settings-open", { detail: { section: "general" } }));
```

## Реестр разделов

| ID | Группа | Статус | Источник данных |
|----|--------|--------|-----------------|
| `general` | Приложение | ready | `theme.ts`, `profileHelpPrefs` |
| `profile` | Аккаунт | ready | `profilePrefs` (draft autosave) |
| `notifications` | Аккаунт | ready | `profilePrefs.notifications` |
| `security` | Аккаунт | ready | session, backup |
| `board` | Модули | ready | `ProfileRoomPanel` |
| `chat` | Модули | ready | `messengerProfileAppearance` |
| `workshop` | Модули | soon | placeholder → `/workshop` |

### Добавление нового раздела

1. Добавить `SettingsSectionId` в `settingsHubTypes.ts`.
2. Запись в `SETTINGS_SECTIONS` (`settingsHubRegistry.ts`).
3. Панель в `settings/panels/`.
4. Ветка в `SettingsHubContent.tsx`.

## Поведение окна

| Действие | Результат |
|----------|-----------|
| Drag за шапку | Сдвиг окна (только режим window) |
| Угол SE | Resize, min 520×400 |
| S / M / L | Пресеты 720×520 / 960×640 / 1180×760, центрирование |
| ⤢ | Fullscreen (`layout.mode = fullscreen`) |
| Esc (fullscreen) | Вернуться в window |
| Esc (window) | Закрыть hub |
| Клик по backdrop | Закрыть |
| `Ctrl+,` | Toggle hub |

## Фазы развития

### Фаза 1 (текущая) — MVP hub
- [x] Provider + overlay + window chrome
- [x] 6 рабочих разделов + workshop stub
- [x] Overflow menu → hub
- [x] Autosave profile prefs в hub

### Фаза 2 — Deep links
- [ ] URL `?settings=board` или hash `#settings-board`
- [ ] Кнопки «⚙» в RoomPage / MessagesPage с `open({ section })`

### Фаза 3 — Registry plugins
- [ ] `registerSettingsSection()` для lazy-loaded панелей
- [ ] Поиск по `keywords`

### Фаза 4 — Server
- [ ] Sync notification prefs с API
- [ ] Облачный backup из hub без перехода в profile

## Тесты

- `settingsHubLayout.test.ts` — clamp, presets, localStorage round-trip.

## Связанные файлы

- `client/src/main.tsx` — монтирование provider
- `client/src/components/RetrogenOverflowMenu.tsx` — пункт «Настройки»
- `client/src/pages/profile/*` — переиспользуемые панели
- `client/src/lib/messengerProfileAppearance.ts` — чат отдельно от profilePrefs
