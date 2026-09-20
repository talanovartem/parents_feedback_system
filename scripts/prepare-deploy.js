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
const phpFiles = ['index.php', 'api.php', 'config.php'];
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

// 4. Копіюємо папку data (з базою даних та .htaccess)
const dataDir = path.resolve(rootDir, 'data');
if (fs.existsSync(dataDir)) {
  fs.cpSync(dataDir, path.resolve(deployDir, 'data'), { recursive: true });
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
const readmeContent = `=== ІНСТРУКЦІЯ З РОЗГОРТАННЯ НА ХОСТИНГУ ===

1. ЗАВАНТАЖЕННЯ:
   Завантажте УВЕСЬ вміст цієї папки ("deploy") у кореневу папку вашого сайту на хостингу
   (зазвичай це папка "public_html", "www" або "httpdocs").

2. ЗМІНА ПАРОЛЯ:
   Відкрийте файл config.php на хостингу в будь-якому редакторі та замініть:
   define('TEACHER_PASSWORD', 'teacher2026');
   на ваш власний пароль.

3. ПРАВА ДОСТУПУ (chmod):
   Переконайтеся, що папка data/ та файл data/database.json мають права на запис
   (chmod 775 або 777), щоб система могла зберігати оцінки та зміни на диску.

4. ВХІД:
   Відкрийте адресу вашого сайту у браузері, введіть пароль та користуйтесь!
`;
fs.writeFileSync(path.resolve(deployDir, 'README_DEPLOY.txt'), readmeContent, 'utf-8');

console.log('✅ Готово! Усі необхідні файли зібрано в папку: deploy/');
