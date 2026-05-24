# TipTap — вне текущего PR (отдельные ветки)

Задачи, которые **не входят** в merge TipTap (`feature/tiptap-poc` → `main`).

## §10 — JSON (`textDoc`) — сделано в `main`

| Задача | Статус |
|--------|--------|
| Поле `Card.textDoc` (JSON) + `Card.text` (HTML-кэш) | ✅ |
| Сохранение `getJSON()` + `getHTML()` | ✅ |
| Batch на сервере | опционально, см. [EPIC_STICKER_JSON.md](./EPIC_STICKER_JSON.md) |

## Ветка: `feature/sticker-collab` (следующий эпик)

| Задача | Зачем |
|--------|--------|
| Совместное редактирование текста одного стикера | Yjs / TipTap Collaboration — CRDT |
| Разрешение конфликтов двух курсоров в одной ячейке | Отдельно от `planeLive` (раскладка доски) |

## Не планируем

См. [WHY_NOT_TIPTAP_PRO_AND_WHOLE_BOARD.md](./WHY_NOT_TIPTAP_PRO_AND_WHOLE_BOARD.md):

- **TipTap Pro / Cloud** — только MIT-пакеты из npm, свой collab через Yjs
- Перепись **всей доски** на TipTap — только текст стикера

## Опционально (низкий приоритет)

- E2E-тесты редактора (Playwright)
- Дальнейшее уменьшение бандла (вынос редких extensions)

См. также [TIPTAP_MIGRATION.md](./TIPTAP_MIGRATION.md), [STICKER_EDITOR_BACKLOG.md](./STICKER_EDITOR_BACKLOG.md) §10.
