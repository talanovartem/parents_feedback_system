<?php
/**
 * Публічний вхід для учнівського порталу (#/my/...) та форми фідбеку (#/feedback/...).
 * Віддає SPA без пароля вчителя: доступ до ДАНИХ захищено в api.php
 * (код доступу / PIN + ліміт спроб), повна база недоступна без сесії вчителя.
 */
require_once __DIR__ . '/config.php';

session_name(SESSION_NAME);
session_start();

$appFile = file_exists(__DIR__ . '/app.html') ? __DIR__ . '/app.html' : __DIR__ . '/dist/index.html';
if (file_exists($appFile)) {
    echo file_get_contents($appFile);
} else {
    echo "<div style='font-family: sans-serif; text-align: center; padding: 50px;'>";
    echo "<h2>Помилка: Файл інтерфейсу не знайдено</h2>";
    echo "<p>Переконайтеся, що файл app.html завантажено на сервер або запустіть npm run build.</p>";
    echo "</div>";
}