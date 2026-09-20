<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Правила проєкту
Див. [AGENTS.md](file:///E:/_pet/_parents_feedback_system/AGENTS.md) та Конституцію [`.spec/constitution.md`](file:///E:/_pet/_parents_feedback_system/.spec/constitution.md).
- Мова інтерфейсу: виключно українська.
- Сповіщення: toast (Sonner).
- Економія коду: Ponytail.
- 4-крокова перевірка: typecheck -> lint -> test -> build.
- **Обов'язкова зупинка після планування / для уточнень**: попри дозволи на зміни чи політики автосхвалення, агент зобов'язаний зупинитися після планування/уточнення. Жодного автоматичного переходу до кодування без явного текстового підтвердження користувача у чаті («починай», «роби», «погоджую»).
