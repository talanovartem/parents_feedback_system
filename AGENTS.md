# Проєкт parents_feedback_system — інструкції для ШІ-агентів

> Усі агенти діють за єдиною **Конституцією** у [`.spec/constitution.md`](file:///.spec/constitution.md).
> Цей документ — швидкий довідник.

## Ключові джерела

| Джерело | Що містить |
|---|---|
| `.spec/constitution.md` | **Вищий закон** проєкту: українська мова UI, toast-сповіщення, локальний JSON-рушій, Ponytail (економія коду), 4-крокова перевірка. |
| `.agents/skills/` | Навички — `*.SKILL.md` (ponytail, ponytail-review, bmad-agile-workflow, spec-driven-development, frontend-modularity, testing-vitest тощо). |
| `kasetto.yaml` | Декларація project-scope sync: Antigravity, OpenCode, Cline, Claude Code, Cursor. |

## Як працювати

1. **Мова UI** — виключно українська (`.spec/constitution.md`, 1.1).
2. **Сповіщення** — лише **toast** (Sonner); жодних червоних/зелених текстів під формами.
3. **Економія коду (Ponytail)** — дотримуйся драбини рішень (`.agents/skills/ponytail/SKILL.md`). Видалення коду завжди краще за додавання. Жодних надлишкових бібліотек та абстракцій.
4. **Брейншторм та архітектура** — при появі нових великих функцій спершу проводити обговорення вимог (`/grill-me`), формувати специфікацію перед кодуванням (`bmad-agile-workflow`).
5. **4-крокова перевірка після змін**:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
   - `npm run build`

## CodeGraph
У репозиторії налаштовано CodeGraph. Використовуйте MCP-інструмент `codegraph_explore` або команду `codegraph explore` для швидкої навігації та розуміння структури зв'язків.
