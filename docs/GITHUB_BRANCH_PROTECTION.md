# Настройка защиты веток на GitHub (один раз)

Владелец репозитория: **Settings → Rules → Rulesets** (или **Branches → Branch protection rules**).

## Ветка `main`

**Цель:** код только через PR, конфликты решены до merge, сборка зелёная.

Рекомендуемые правила:

| Правило | Значение |
|---------|----------|
| Branch name pattern | `main` |
| Restrict deletions | включить |
| Require a pull request before merging | включить |
| Required approvals | `0` или `1` (на ваш выбор) |
| Dismiss stale approvals | по желанию |
| Require status checks to pass | включить |
| Required check | **`build`** (workflow CI) |
| Require branches to be up to date | **включить** — перед merge нужен `git merge main` / Update branch |
| Do not allow bypassing | включить для всех, кроме админа при необходимости |
| Restrict pushes | никто не пушит напрямую в `main` (только merge PR) |

После сохранения: прямой `git push origin main` будет отклонён; только merge PR.

---

## Ветка `staging`

**Цель:** на тест попадает только осознанный снимок с `main`.

| Правило | Значение |
|---------|----------|
| Branch name pattern | `staging` |
| Require pull request | включить |
| Allowed merge sources | только из `main` (если доступно в ruleset) или договорённость: PR только `main` → `staging` |
| Require status checks | **`build`** на PR в `staging` |
| Restrict pushes | не пушить фичи напрямую в `staging` |

Создать ветку (если ещё нет), один раз с локальной `main`:

```bash
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

---

## Проверка

1. Создайте тестовую ветку, PR в `main` — должен запуститься **Actions → CI**.
2. Пока CI не зелёный — merge недоступен (если включены checks).
3. Смоделируйте конфликт — кнопка Merge должна быть заблокирована до resolve.

Подробный процесс: [WORKFLOW.md](./WORKFLOW.md).
