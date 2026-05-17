# Настройка защиты веток на GitHub

Владелец репозитория: **https://github.com/AHTu21/retrogen** → **Settings**.

Ниже — пошагово. Сначала **`main`**, затем **`staging`**.

---

## 1. Ветка `main` (интеграция)

**Settings** → **Rules** → **Rulesets** → **New branch ruleset** (или *Branch protection rules* → Add rule).

| Поле | Значение |
|------|----------|
| Ruleset name | `Protect main` |
| Enforcement | Active |
| Target branches | Include default branch **`main`** |

**Branch rules** — включить:

- [x] **Restrict deletions**
- [x] **Require a pull request before merging**
  - Required approvals: **0** (или 1, если хотите обязательное ревью)
  - [x] Require approval of the most recent reviewable push (если approvals ≥ 1)
- [x] **Require status checks to pass**
  - Add checks: выберите **`build`** (job из workflow **CI**)
  - [x] Require branches to be up to date before merging
- [x] **Block force pushes**
- [x] **Restrict pushes** (только merge через PR; прямой push в `main` запрещён)

**Save**.

Проверка: `git push origin main` с локального коммита должен быть **отклонён** (если не admin bypass).

---

## 2. Ветка `staging` (тестовый стенд)

Отдельный ruleset **`Protect staging`**:

| Поле | Значение |
|------|----------|
| Target branches | Include by pattern: **`staging`** |

**Branch rules:**

- [x] **Require a pull request before merging**
- [x] **Require status checks to pass** → **`build`**
- [x] **Block force pushes**
- [x] **Restrict pushes** (фичи не в `staging` напрямую)

**Договорённость в команде** (GitHub не всегда ограничивает base/head):

- PR на `staging` только **`main` → `staging`**
- Не merge в `staging` «на бегу» с каждой фичей — только после [чеклиста в WORKFLOW.md](./WORKFLOW.md)

Ветка `staging` уже есть на remote. Обновляется **только** merge такого PR.

---

## 3. Labels (опционально, 1 мин)

**Issues** → **Labels** → New:

| Label | Цвет | Смысл |
|-------|------|--------|
| `version:minor` | | принудительно minor bump на main |
| `version:patch` | | принудительно patch |
| `version:skip` | | не менять версию |
| `qa-request` | | просьба выкатить на стенд после локальных тестов |

---

## 4. Проверка

1. Ветка `test/rules` → PR в `main` → должен запуститься **Actions → CI**.
2. Пока CI красный — merge в `main` недоступен (если checks включены).
3. Сконфликтующий PR — кнопка merge заблокирована до **Resolve conflicts**.

Процесс выкладки на стенд: [WORKFLOW.md](./WORKFLOW.md).
