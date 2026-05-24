# Настройка защиты веток на GitHub

Репозиторий: **https://github.com/AHTu21/retrogen**

---

## Важно: приватный репозиторий на Free

На экране **Rules → Rulesets** GitHub пишет:

> *Rulesets won't be enforced on this private repository until you move to GitHub Team.*

То есть **Rulesets для вашего текущего плана не заработают**. Варианты:

| Вариант | Защита веток | Когда имеет смысл |
|---------|----------------|------------------|
| **A. GitHub Pro** (личный, платный) | Классические **Branch protection rules** на private | Оставить repo приватным, минимальная оплата |
| **B. Organization + Team** | Rulesets + защита | Команда, несколько репо |
| **C. Public repository** | Rulesets / protection на Free | Если код можно открыть |
| **D. Без платной защиты** | Только **договорённость + CI** | CI на PR есть, но merge **не блокируется** сервером |

**CI (workflow `build`) у вас уже работает** на каждый PR — красная галочка видна, но без платной защиты GitHub **не запретит** merge при красном CI.

Процесс (PR, staging, версии) описан в [WORKFLOW.md](./WORKFLOW.md) — его соблюдаете вы; технический запрет — только с A/B/C.

---

## Рекомендуемый путь: Branch protection (не Rulesets)

Если есть **GitHub Pro** или репозиторий **public**:

**Settings** → **Branches** (в левом меню, не Rulesets) → **Add branch ruleset** / **Add classic branch protection rule**.

Если пункта **Branches** нет или правила «не enforced» — у вас вариант **D** ниже.

### Правило для `main`

| Поле | Значение |
|------|----------|
| Branch name pattern | `main` |
| Require a pull request before merging | включить |
| Require status checks to pass | **`build`** |
| Require branches to be up to date before merging | включить |
| Do not allow bypassing | по желанию |
| Allow force pushes | выключить |
| Allow deletions | выключить |

### Правило для `staging`

Второе правило:

| Поле | Значение |
|------|----------|
| Branch name pattern | `staging` |
| Require a pull request before merging | включить |
| Require status checks | **`build`** |
| Force push / delete | запретить |

PR только **`main` → `staging`** — договорённость в команде ([WORKFLOW.md](./WORKFLOW.md)).

---

## Если Rulesets доступны (Team или public)

**Settings** → **Rules** → **Rulesets** → **New branch ruleset**:

### `Protect main`

- Target: branch **`main`**
- Require PR, status check **`build`**, up to date, block force push, restrict pushes

### `Protect staging`

- Target: **`staging`**
- Require PR, **`build`**, block force push, restrict pushes

---

## Вариант D: без платной защиты (ваш случай на Free + private)

Сделайте так:

1. **Не пушить в `main` / `staging` напрямую** — только merge PR (договорённость).
2. На каждый PR смотреть **Actions → CI** — merge только если зелёный.
3. Конфликты — GitHub всё равно **не даст merge** при conflicts в PR (это бесплатно).
4. Code review: второй человек жмёт Approve перед merge.
5. Выкладка на стенд — только PR `main` → `staging` по [WORKFLOW.md](./WORKFLOW.md).

Позже, когда подключите Pro/Team/public — включите Branch protection по таблицам выше.

---

## Labels

**Issues** → **Labels**:

- `version:minor`, `version:patch`, `version:skip`
- `qa-request` — готовы выкатить на стенд после локальных тестов

---

## Проверка

1. PR из feature-ветки → в **Checks** есть **CI / build**.
2. При конфликте — кнопка Merge неактивна (работает и на Free).
3. Если включили Branch protection — merge без зелёного `build` недоступен.
