# План: виджеты на плоскости и картинки

Связь с [PLAN.md](../PLAN.md) §3 и §10. Версии: **0.12.x** (гаджеты), **0.12.x / 0.13.x** (картинки).

## Ветки

| Ветка | Содержание | PR |
|-------|------------|-----|
| `feature/plane-gadgets-framework` | Модель гаджета, каталог, random pick, рефактор таймера | → `main` |
| `feature/plane-images-grid-storage` | Сетка, загрузка картинок на сервер | → `main` (после или параллельно) |

---

## Эпик A — Виджеты / гаджеты (§10)

### A1 — Модель (MVP) ✅ в ветке `feature/plane-gadgets-framework`

- [x] Общий тип `BoardGadgetDto` = `timer` \| `randomPick` (discriminated union).
- [x] `client/src/lib/planeGadgets.ts`: нормализация, фабрики, `pickRandomName`.
- [x] `client/src/components/plane/PlaneGadgetLayer.tsx`: рендер по `kind`.
- [x] Синхронизация в `planeState.gadgets` (как таймер сейчас).
- [x] **randomPick**: выбор случайного участника по именам авторов стикеров + гость.

### A2 — Следующий шаг (отложено)

- [ ] Короткий опрос (1 вопрос, 2–3 варианта) — `kind: "poll"`.
- [ ] Embed iframe (allowlist URL) — `kind: "embed"`, CSP.
- [ ] Меню «Добавить гаджет» вместо отдельных кнопок на каждый тип.
- [ ] Resize гаджетов (сейчас только drag).

---

## Эпик B — Картинки на плоскости (§3, опционально)

### B1 — Сетка и выравнивание ✅ `feature/plane-images-grid-storage`

- [x] `client/src/lib/planeGrid.ts`: шаг 16px, `snapPlaneCoord`.
- [x] Переключатель «⊞» в левой панели (`retrogen_plane_snap_grid`).
- [x] Snap при отпускании после drag картинки/гаджета и при вставке с диска.

### B2 — Хранение на сервере ✅ та же ветка (MVP)

- [x] `POST /api/rooms/:slug/plane-images` (multipart, image/*, до 4 МБ).
- [x] `GET /api/rooms/:slug/plane-images/:imageRef` — отдача файла.
- [x] Загрузка с диска → URL в `memes[].src` (fallback data URL при ошибке).
- [ ] Paste из буфера: по-прежнему data URL (или сжатие + upload — позже).
- [ ] Миграция старых data URL в файлы при сохранении плоскости — позже.

### B3 — Отложено

- [ ] Обрезка (crop UI).
- [ ] Выравнивание нескольких картинок друг к другу (align left/center).
- [ ] CDN / S3 вместо локальной папки `data/plane-images`.

---

## Порядок merge

1. `feature/plane-gadgets-framework` → `main`
2. `feature/plane-images-grid-storage` → `main` (rebase на актуальный `main`)
3. Релиз **0.12.0** — changelog user: гаджеты + сетка + картинки на сервере

## Проверка

- Два браузера в одной комнате: таймер, random pick, картинка с диска — видны у обоих после сохранения плоскости / live preview.
- Без `db:migrate` для B2 (только файлы на диске).
- `npm run dev` после pull: `predev` → `prisma generate`.
