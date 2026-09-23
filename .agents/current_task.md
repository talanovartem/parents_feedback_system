# 📋 Поточний статус та контекст завдань проєкту

> **Останнє оновлення:** 2026-09-23  
> **Проєкт:** parents_feedback_system  
> **Конституція:** [`.spec/constitution.md`](file:///e:/_pet/_parents_feedback_system/.spec/constitution.md)  
> **Інструкції для агентів:** [`AGENTS.md`](file:///e:/_pet/_parents_feedback_system/AGENTS.md)  
> **Синхронізація (Kasetto):** `kasetto.yaml` (Antigravity, Cline, OpenCode, Claude Code, Cursor)  

---
---

## 🛠 Аудит 2026-09-23: усунено 13 прогалин (пріоритетний список для майбутніх сесій)

1. **Краш модалок** — `WeeklyKpModal` / `AttentionTasksModal`: `if (!isOpen) return null` був **перед** `useMemo` → React «Rendered more hooks». Перенесено під усі хуки. В `eslint.config.js` увімкнено `react-hooks/rules-of-hooks: error` + `exhaustive-deps: warn` — ЛИШАТИ увімкненими.
2. **Публічний вхід** — `portal.php` віддає SPA без пароля вчителя; `api.php` має публічні дії з серверною перевіркою: `portal_auth` (обмежена база лише цього учня), `feedback_meta` (без PIN), `feedback_auth`, `save_feedback`. Антибрут: 10 спроб / 10 хв (`$_SESSION['pfs_fails']`, `hash_equals`). У dev — `?public=1` (`isPublicEntry()` у `src/services/publicAccess.ts`). Посилання для учнів будувати ТІЛЬКИ через `getPublicEntryUrl` / `getStudentPortalHash` / `getLessonFeedbackHash`.
3. **KP подвійний облік** — `src/utils/feedbackStore.ts` `applyFeedbackToDb`: баланс коригується на РІЗНИЦЮ балів + транзакція в `kpTransactions`. Стоп-фрази на сервері мають збігатися з `feedbackAntiSpam.ts`. У `WeeklyKpModal` — кнопка скасування тижневого нарахування (`handleRevokeWeeklyKp`).
4. **Видалення учня** чистить: `records`, `attentionTasks`, `kpTransactions`, `lessonFeedback`, `savedReports`, `sentReports`.
5. **Захист від затирання** — `storage.ts`: конфлікт-ревізія перед POST (`serverStamp`), при розбіжності — toast «НЕ збережено». Кеш localStorage НЕ брати, якщо сервер відповів (навіть помилкою). `getApiUrl` — через `import.meta.env.DEV` (не через порт 5173).
6. **Часові зони** — НЕ писати `new Date().toISOString().slice(0,10)` для «сьогодні»; використовувати `src/utils/localDate.ts`. ISO-тиждень — `src/utils/weeklyKp.ts` (`isoWeek`).
7. **Копіювання уроку** — чиста `src/utils/lessonResults.ts` `applyCopyLessonResults`: захист «той самий клас», дзеркальна семантика (немає запису в джерелі → очищення цілі).
8. **Коди/PIN** — `accessCode` унікальний при додаванні та в міграції v4; **нові учні обов'язково отримують `pinCode`** (`handleAddStudent`); AccessGate — рівно 6 цифр, помилка через toast (стаття 1.2).
9. **KP-рекомендації** — уроки без записів НЕ рахувати «100% відвідуваністю» (`calcRecommendedKp`).
10. **Тести: 60** (було 39) — `weeklyKp`, `lessonResults`, `feedbackStore`, `localDate`.
11. **`LessonTableCard` 1048 → 162 рядки**: `LessonCardHeader.tsx`, `LessonTableView.tsx`, `LessonCardsView.tsx`, спільні пропси — `lessonCardProps.ts`.
12. **`guessGender`** — винятки чоловічих імен на «-а» (Микола, Ілля, Кузьма, Сава), перевірка обох слів.
13. **Default пароль** — `index.php` показує попередження, доки `TEACHER_PASSWORD === 'teacher2026'`.

> ⚠️ Не зроблено: PHP-публічні дії без автотестів (прогнати в браузері: portal.php → вхід за кодом); vite-попередження `chunk > 500 kB` не блокує.

---

## 🚀 Щойно реалізовано (Вересень 2026)

## 🚀 Щойно реалізовано (Вересень 2026)

### 1. Важливі примітки / Борги учнів («Потребує уваги»)
- **Модель даних:** Інтерфейс `AttentionTask` у `src/types/feedback.ts` (`id`, `studentId`, `classId`, `lessonId?`, `date`, `text`, `isCompleted`, `createdAt`, `completedAt?`). Поле `attentionTasks?: AttentionTask[]` у `DatabaseSchema`.
- **UI Дзвіночок 🔔:** У верхній панелі навігації (`App.tsx`) розміщено кнопку дзвіночка з червоним пульсуючим бейджем кількості активних завдань. Лічильник не зникає, доки завдання не виконано.
- **Модальне вікно `AttentionTasksModal.tsx`:** Фільтрація (Активні / Усі), фільтр за класом, форма швидкого створення завдання з вибором учня та дати, кнопка відмітки «✓ Виконано».
- **Візуальний індикатор ⚠️:** У журналі уроків та розкладі (`LessonTableCard.tsx`) біля імені учня відображається значок `⚠️` з підказкою, якщо учень має активні борги/зауваження.
- **Картка учня (`StudentPage.tsx`):** Окремий виразний блок «Потребує уваги» зі списком усіх актуальних заборгованостей.

### 2. Щотижневе нарахування внутрішньої валюти KP (Карпатики 🏔️)
- **Модель даних:** `KpTransaction` у `src/types/feedback.ts` (`id`, `studentId`, `amount`, `reason`, `weekPeriod`, `createdAt`). Масив `kpTransactions?: KpTransaction[]` у `DatabaseSchema`. Баланс накопичується в `student.karpatyPoints`.
- **UI Кнопка `KP 🏔️`:** У хедері додана кнопка виклику `WeeklyKpModal.tsx`.
- **Розумний калькулятор `WeeklyKpModal.tsx`:**
  - Автоматичний розрахунок за тиждень: відвідуваність (+5 KP за 100%, +2 KP за 1 пропуск), середній бал (+5 за >=10, +3 за >=7), наявність фідбеку учня (+2), відсутність боргів (+1).
  - Можливість ручного коригування сум, швидка кнопка «Рекомендоване для всіх», захист від повторного нарахування за один тиждень.
  - Журнал транзакцій з історією нарахувань.

### 3. Учнівський портал за прямим посиланням / QR-кодом із 6-значним кодом доступу
- **Коди доступу:** Поле `student.accessCode` (6 цифр). Автоматична генерація у міграції v4 (`migration.ts`) та при створенні нових учнів.
- **QR-генератор `src/utils/qrCodeGenerator.ts`:** Автономний генератор QR-кодів на чистому TypeScript (Reed-Solomon EC level M, SVG) без сторонніх npm-бібліотек.
- **Роутинг:** Роут `#/my/:studentId` (`useRouter.ts`) відкриває повноцінний автономний кабінет учня `StudentPortalPage.tsx`.
- **Двохетапний захист:**
  1. Введення 6-значного коду доступу з автозбереженням сесії в `sessionStorage`.
  2. Персональний дашборд: баланс KP 🏔️ з історією, блок «Потрібно виконати» (активні завдання/борги), відвідуваність, середній бал, перелік останніх уроків з оцінками.
- **Друк та роздача:** У `StudentPinsModal.tsx` та `StudentPage.tsx` додано коди доступу, копіювання посилання в кабінет та відображення QR-коду.

---

## 🧪 Стан верифікації
- `npm run typecheck` — ✅ 0 помилок
- `npm run lint` — ✅ 0 помилок
- `npm run test` — ✅ 39/39 тестів пройдено
- `npm run build` — ✅ збірка успішна, пакет `deploy/` сформовано

---

## 📌 Наступні кроки для агентів (Cline, Antigravity тощо)
- При роботі завжди дотримуватися 4-крокової перевірки (`typecheck` -> `lint` -> `test` -> `build`).
- Мова UI — виключно українська.
- Сповіщення — лише Sonner Toast.
- Зміни обов'язково фіксувати в git з детальним описом.
