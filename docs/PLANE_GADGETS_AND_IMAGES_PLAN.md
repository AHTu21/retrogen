# План: виджеты на плоскости и картинки

Связь с [PLAN.md](../PLAN.md) §3 и §10. Версии: **0.12.x**.

## Ветка

| Ветка | Содержание |
|-------|------------|
| `feature/plane-gadgets-framework` | Гаджеты + картинки (объединённая ветка) |

---

## Эпик A — Виджеты / гаджеты (§10)

### A1 — Модель (MVP) ✅

- [x] Общий тип `BoardGadgetDto` = `timer` \| `randomPick` \| `poll` \| `embed`.
- [x] `client/src/lib/planeGadgets.ts`: нормализация, фабрики, `pickRandomName`.
- [x] `client/src/components/plane/PlaneGadgetLayer.tsx`: рендер по `kind`.
- [x] Синхронизация в `planeState.gadgets`.
- [x] **randomPick**: выбор случайного участника.

### A2 — Расширения ✅

- [x] Короткий опрос (1 вопрос, 2–3 варианта) — `kind: "poll"`.
- [x] Embed iframe (allowlist URL) — `kind: "embed"`.
- [x] Меню «Добавить гаджет» вместо отдельных кнопок.
- [x] Resize гаджетов (ручка в углу при выделении).

---

## Эпик B — Картинки на плоскости (§3)

### B1 — Сетка ✅

- [x] `planeGrid.ts`: шаг 16px, переключатель ⊞, snap при drag/вставке.

### B2 — Хранение ✅

- [x] `POST/GET /api/rooms/:slug/plane-images`.
- [x] Загрузка с диска → server URL.
- [x] Paste из буфера → upload на сервер (fallback data URL).
- [x] Миграция старых data URL в файлы перед сохранением плоскости.

### B3 — Дополнения ✅

- [x] Обрезка (crop UI).
- [x] Выравнивание нескольких картинок (shift+клик, align left/center/right/top/middle/bottom).
- [x] S3 backend (`PLANE_IMAGE_STORAGE=s3`, `@aws-sdk/client-s3`); локальная папка по умолчанию.

---

## Merge и релиз

1. `feature/plane-gadgets-framework` → `main`
2. Релиз **0.12.0** — changelog: гаджеты + сетка + картинки
