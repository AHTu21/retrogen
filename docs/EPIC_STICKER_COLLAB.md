# Эпик: совместное редактирование одного стикера

**Ветка:** `feature/sticker-collab` (после `feature/sticker-json` желательно)  
**Статус:** реализовано (Yjs + Socket.IO + TipTap Collaboration)

## Цель

Два участника **одновременно** правят **текст одного стикера** (курсоры, без затирания друг друга).  
**Не путать** с `planeLive` — там только превью **перемещения** блоков/стикеров на доске.

## Стек (MIT, без TipTap Cloud)

| Слой | Технология |
|------|------------|
| CRDT | [Yjs](https://yjs.dev/) |
| Редактор | `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor` |
| Транспорт | Существующий **Socket.IO** (`server/src/socket.ts`), канал `stickerCollab` |
| Документ | Один `Y.Doc` на пару `(roomSlug, cardId)` пока открыт edit |

## События (черновик)

```
client → server: stickerCollab:join { slug, cardId }
client → server: stickerCollab:update { slug, cardId, update: Uint8Array }
server → room: stickerCollab:sync { cardId, update }
client → server: stickerCollab:leave { slug, cardId }
```

Сохранение на сервер (`updateCard`) — по blur / таймеру из **согласованного** Yjs state → JSON + HTML.

## Фазы

1. [x] ACL: `roomAccessStatus`, комната не `ended`, карточка в комнате  
2. [x] Сервер: `stickerCollab:join|update|awareness|leave`, in-memory `Y.Doc`, rate limit  
3. [x] Клиент: `StickerCollabProvider` + TipTap Collaboration при `editingCardId`  
4. [x] При collab не перезаписываем редактор из `editDrafts` при входе в edit  
5. [x] UI: `CollaborationCursor`, цвет по `participantKey`  
6. [ ] E2E: два браузера, один стикер (ручной QA)  

## Риски

- Сложность выше JSON-эпика в 3–5 раз.  
- Нагрузка на socket при большом числе одновermенных редакторов.  
- Нужен **отдельный PR** и QA, не смешивать с JSON в один merge.

## Не делаем

- TipTap Cloud / Hocuspocus Cloud как обязательный backend (можно self-host Hocuspocus позже как альтернатива).
