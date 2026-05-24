# Инструкция администратора

## Прод-срез (1-я цифра версии)

**MAJOR** (`0.7.4` → `1.0.0`) — это не каждый merge в `main`, а осознанный «отдали стабильную сборку во вне» (отдельный деплой, тег, снимок для пользователей).

### Когда повышать MAJOR

- Готовы назвать сборку **стабильной для внешних пользователей**
- Пройдены smoke-тесты на стенде, миграции БД применены на прод-БД
- В `CHANGELOG.md` перенесены пункты из `[Unreleased]` в секцию `## [1.0.0] — дата`

### Шаги (пока вручную)

1. Убедиться, что `main` актуален и собирается: `npm run build`.
2. Локально (или в CI позже):

   ```bash
   npm run release:prod -- --dry-run   # посмотреть 0.x.y → 1.0.0
   npm run release:prod                # записать версию в package.json
   ```

3. Оформить **CHANGELOG**: новая секция `## [1.0.0] — ГГГГ-ММ-ДД`, очистить/оставить `[Unreleased]`.
4. Коммит: `chore(release): prod v1.0.0` (версии + changelog).
5. Тег и push:

   ```bash
   git tag v1.0.0
   git push origin main --tags
   ```

6. GitHub → **Releases** → описание из changelog.
7. Деплой прод-окружения по [DEPLOYMENT.md](./DEPLOYMENT.md) (отдельный процесс, env, БД).

### Что **не** делать

- Не полагаться на автоматический bump в `main` для MAJOR — workflow меняет только **MINOR/PATCH**.
- Не ставить тег `v1.0.0` без обновления changelog и без проверки миграций.

### Тестовый стенд (`staging`)

Не каждый merge в `main` сразу на стенде. Выкладка только когда на `main` прошли **локальные** build/smoke, затем PR **`main` → `staging`** — на стенде одна **стабильная** версия `X.Y.Z` для отчётов тестировщиков. Подробно: [WORKFLOW.md](./WORKFLOW.md). Прод — только после QA на стенде.

### Позже (когда дойдёте)

- Кнопка **workflow_dispatch** «Release production» в GitHub Actions  
- Environment **production** с approval на деплой  

Пока зафиксировано только это руководство; автоматизацию прода добавим отдельно.

---

## Labels на GitHub

Для обычных merge в `main` см. [VERSIONING.md](./VERSIONING.md):

- `version:minor`, `version:patch`, `version:skip`

---

## Доступ и секреты

- Секреты только в `server/.env` на сервере, не в git.
- Collaborators: Settings → Collaborators в репозитории.
