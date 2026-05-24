# Эпик §10: JSON-документ стикера (`textDoc`)

**Ветка:** `feature/sticker-json`  
**Статус:** реализовано (миграция БД + API + клиент); batch-скрипт — опционально

## Цель

- Хранить канонический документ TipTap как **JSON** (ProseMirror JSON).
- Поле `Card.text` (HTML) — **кэш** для отчётов, поиска, старых клиентов, `dangerouslySetInnerHTML` в режиме просмотра.
- Миграция: при первом сохранении или batch — HTML → JSON.

## Схема БД

```prisma
model Card {
  text     String  @default("")  // HTML-кэш
  textDoc  Json?                 // TipTap/PM JSON, nullable для старых карточек
}
```

## API

- `PATCH card`: опционально `textDoc` (object); сервер пишет `text` + `textDoc`.
- `GET room`: отдаёт `textDoc` в DTO карточек.
- Валидация: размер `textDoc` (как лимит HTML).

## Клиент

- Загрузка: если `textDoc` — `editor.commands.setContent(textDoc)`; иначе HTML из `text`.
- Сохранение: `getJSON()` + `getHTML()` в одном запросе.
- Отчёт / MD / PNG — по-прежнему из HTML-кэша.

## Фазы

1. [x] Prisma + migration + API + типы  
2. [x] RoomPage save/load + `StickerEditorApi.getJson/setContent`  
3. [ ] Скрипт batch-миграции `scripts/migrate-card-text-to-json.mjs` (опционально)  
4. [ ] CHANGELOG `[0.9.0]` после merge в `main`  

## Не в этой фазе

- Удаление HTML с сервера (оставляем дубль до стабилизации).
