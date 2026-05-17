# Версионирование Retrogen

Три цифры **`MAJOR.MINOR.PATCH`** (пример: `0.7.3`).

| Цифра | Смысл | Когда меняется |
|-------|--------|----------------|
| **1-я (MAJOR)** | Стабильный срез «во вне», отдельный прод | **Вручную** — см. [ADMIN.md](./ADMIN.md) |
| **2-я (MINOR)** | Крупное обновление в **`main`** | **Автоматически** при merge в `main`, если merge «большой» |
| **3-я (PATCH)** | Небольшое обновление в **`main`** | **Автоматически** при merge в `main`, если merge «малый» |

Ветка **`staging`** (тестовый стенд) **не меняет** версию повторно — на стенде та же цифра, что в `main` после PR `main` → `staging`. См. [WORKFLOW.md](./WORKFLOW.md).

Отображение в UI: поле `version` в **`client/package.json`** (окно «О программе»).

---

## Что считается при merge в `main`

Анализируется diff merge-коммита (учитываемые пути):

- `client/src/**`, `server/src/**`, `server/prisma/**`
- `client/vite.config.ts`, `client/tsconfig.json`, `server/tsconfig.json`

**Не учитываются:** только `*.md`, `docs/`, `.cursor/`, `scripts/`, `package-lock.json`, `dist/`.

### Малый merge → **PATCH** (+1 к 3-й цифре)

Все условия одновременно:

- ≤ **8** учитываемых файлов  
- ≤ **250** строк (сумма добавлений и удалений)  
- нет изменений в `server/prisma/migrations/` (кроме `migration_lock.toml`)  
- нет изменения `server/prisma/schema.prisma`  
- нет «сквозняка»: ≥2 файла в `client/src` **и** ≥2 в `server/src`  
- ни один файл не изменён больше чем на **400** строк  

### Большой merge → **MINOR** (+1 ко 2-й, 3-я → 0)

Если **хотя бы одно**:

- > **250** строк в учитываемых файлах  
- > **8** файлов  
- любая правка в **`server/prisma/migrations/`** или **`schema.prisma`**  
- ≥2 файла client **и** ≥2 server  
- один файл > **400** строк изменений  

### Версию **не** менять

- Только docs / lockfile / changelog без кода в учитываемых путях  
- Label PR **`version:skip`** или в сообщении коммита **`[version:skip]`**  

---

## Labels и заголовок PR (переопределение)

| Label / маркер | Эффект |
|----------------|--------|
| `version:minor` или `[minor]` в заголовке PR | принудительно **MINOR** |
| `version:patch` или `[patch]` в заголовке PR | принудительно **PATCH** |
| `version:skip` или `[version:skip]` | не менять версию |

Создайте labels в GitHub: **Settings → Labels** → `version:minor`, `version:patch`, `version:skip`.

---

## Автоматика в CI

Workflow **`.github/workflows/version-bump.yml`**: после push в `main` скрипт `scripts/bump-version-on-merge.mjs` обновляет версию в **`package.json` (корень, client, server)** и **`package-lock.json`**, затем бот пушит отдельный коммит:

`chore(version): bump to v0.7.0`

Это **п.5 автоматизации**: в `main` сначала ваш merge с кодом, сразу следом — коммит только с номером версии (в «О программе» и в lockfile одна цифра). Такой коммит **не** запускает повторный bump (защита от цикла).

Локальная проверка без записи:

```bash
npm run version:bump-dry-run
```

---

## CHANGELOG

Автоматика **не** переносит `[Unreleased]` в релизные секции — по-прежнему вручную (или `npm run changelog:append`). При прод-срезе см. [ADMIN.md](./ADMIN.md).
