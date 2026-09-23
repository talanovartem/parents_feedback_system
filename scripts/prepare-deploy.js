import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const deployDir = path.resolve(rootDir, 'deploy');

console.log('📦 Збирання готового пакету для хостингу в папку deploy/...');

// 1. Створюємо чи очищаємо deploy
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}
fs.mkdirSync(deployDir, { recursive: true });

// 2. Копіюємо PHP бекенд та конфіг
const phpFiles = ['index.php', 'portal.php', 'api.php', 'config.php'];
for (const file of phpFiles) {
  const src = path.resolve(rootDir, file);
  const dest = path.resolve(deployDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// 3. Копіюємо скомпільований frontend
const distDir = path.resolve(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  // Копіюємо dist/index.html як app.html для безпечної роздачі через index.php
  const distHtml = path.resolve(distDir, 'index.html');
  if (fs.existsSync(distHtml)) {
    fs.copyFileSync(distHtml, path.resolve(deployDir, 'app.html'));
  }

  // Копіюємо всі статичні файли (favicon.svg тощо), крім index.html
  const distEntries = fs.readdirSync(distDir);
  for (const entry of distEntries) {
    if (entry === 'index.html') continue;
    const src = path.resolve(distDir, entry);
    const dest = path.resolve(deployDir, entry);
    fs.cpSync(src, dest, { recursive: true });
  }
} else {
  console.warn('⚠️ Папку dist/ не знайдено! Спочатку запустіть vite build.');
}

// 4. Налаштовуємо папку data для безпечного деплою (без затирання живої бази)
const deployDataDir = path.resolve(deployDir, 'data');
fs.mkdirSync(deployDataDir, { recursive: true });
fs.mkdirSync(path.resolve(deployDataDir, 'backups'), { recursive: true });

// Захисний .htaccess для папки data/ та data/backups/
const dataHtaccess = path.resolve(rootDir, 'data/.htaccess');
if (fs.existsSync(dataHtaccess)) {
  fs.copyFileSync(dataHtaccess, path.resolve(deployDataDir, '.htaccess'));
}

// Замість бойової database.json кладемо database.default.json
// Якщо на хостингу ще немає бази, api.php автоматично створить database.json з цього файлу.
// Якщо база на хостингу вже є, вона НІКОЛИ не перезапишеться цим файлом!
const srcDb = path.resolve(rootDir, 'data/database.json');
if (fs.existsSync(srcDb)) {
  fs.copyFileSync(srcDb, path.resolve(deployDataDir, 'database.default.json'));
}

// 5. Створюємо кореневий .htaccess для захисту app.html
const htaccessContent = `DirectoryIndex index.php

# Захист: прямий доступ до app.html заборонено, доступ лише через авторизований index.php
<Files "app.html">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order deny,allow
        Deny from all
    </IfModule>
</Files>
`;
fs.writeFileSync(path.resolve(deployDir, '.htaccess'), htaccessContent, 'utf-8');

// 6. Створюємо інструкцію README_DEPLOY.txt усередині deploy
const readmeContent = `=== ІНСТРУКЦІЯ З РОЗГОРТАННЯ ТА ОНОВЛЕННЯ НА ХОСТИНГУ ===

1. ПЕРШЕ РОЗГОРТАННЯ:
   Завантажте УВЕСЬ вміст цієї папки ("deploy") у кореневу папку вашого сайту на хостингу
   (зазвичай це папка "public_html", "www" або "httpdocs").
   При першому запуску система автоматично створить файл "data/database.json"
   з початкового шаблону "data/database.default.json".

2. ОНОВЛЕННЯ КОДУ (БЕЗПЕЧНИЙ ДЕПЛОЙ):
   Коли виходить нова версія програми, ви можете сміливо перезаписувати всі файли
   із папки "deploy" на хостинг.
   ВАЖЛИВО: Ваш живий файл "data/database.json" із внесеними уроками та оцінками
   НІКОЛИ НЕ БУДЕ ПЕРЕЗАПИСАНО, оскільки в пакеті оновлення його навмисно немає!

3. ЗМІНА ПАРОЛЯ:
   Відкрийте файл config.php на хостингу в будь-якому редакторі та замініть:
   define('TEACHER_PASSWORD', 'teacher2026');
   на ваш власний пароль.

4. ПРАВА ДОСТУПУ (chmod):
   Переконайтеся, що папка data/ та її підпапка data/backups/ мають права на запис
   (chmod 775 або 777), щоб система могла зберігати оцінки та автоматичні бекапи на диску.

5. АВТО-БЕКАПИ:
   Перед кожним збереженням оцінок система автоматично створює:
   - "data/database.json.bak" (останній попередній робочий стан)
   - "data/backups/backup_РРРР-ММ-ДД.json" (щоденний архів)
`;
fs.writeFileSync(path.resolve(deployDir, 'README_DEPLOY.txt'), readmeContent, 'utf-8');

console.log('✅ Готово! Усі необхідні файли зібрано в папку: deploy/');
