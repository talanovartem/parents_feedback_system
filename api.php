<?php
require_once __DIR__ . '/config.php';

session_name(SESSION_NAME);
session_start();

// Заголовки відповіді
header('Content-Type: application/json; charset=utf-8');

// Дія виходу
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    $_SESSION = [];
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Вихід виконано']);
    exit;
}

// Перевірка авторизації
if (empty($_SESSION['authenticated'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Необхідна авторизація']);
    exit;
}

$dbPath = __DIR__ . '/data/database.json';

// GET: Отримання даних
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($dbPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Файл бази даних не знайдено']);
        exit;
    }
    readfile($dbPath);
    exit;
}

// POST: Збереження даних
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    
    // Перевіряємо валідність JSON
    $decoded = json_decode($rawInput, true);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Некоректний JSON: ' . json_last_error_msg()]);
        exit;
    }

    // Записуємо у файл у гарному форматі UTF-8
    $written = file_put_contents(
        $dbPath,
        json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );

    if ($written === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Не вдалося зберегти файл на диску (перевірте права запису)']);
        exit;
    }

    echo json_encode(['success' => true, 'timestamp' => date('c')]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не підтримується']);
