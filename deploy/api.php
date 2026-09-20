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

$dataDir = __DIR__ . '/data';
$dbPath = $dataDir . '/database.json';
$defaultDbPath = $dataDir . '/database.default.json';
$backupsDir = $dataDir . '/backups';

// Якщо database.json ще немає (перший запуск), копіюємо його з database.default.json
if (!file_exists($dbPath) && file_exists($defaultDbPath)) {
    @copy($defaultDbPath, $dbPath);
}

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

// POST: Збереження даних з потрійним захистом (атомарний запис + бекапи)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    
    // Перевіряємо валідність JSON
    $decoded = json_decode($rawInput, true);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Некоректний JSON: ' . json_last_error_msg()]);
        exit;
    }

    // 1. Створюємо папку для бекапів, якщо вона відсутня
    if (!is_dir($backupsDir)) {
        @mkdir($backupsDir, 0775, true);
    }

    // 2. Створюємо резервну копію перед перезаписом
    if (file_exists($dbPath) && filesize($dbPath) > 0) {
        // Останній робочий стан
        @copy($dbPath, $dbPath . '.bak');

        // Щоденний архівний зліпок (один на добу)
        $todayBackup = $backupsDir . '/backup_' . date('Y-m-d') . '.json';
        if (!file_exists($todayBackup)) {
            @copy($dbPath, $todayBackup);
        }
    }

    // 3. Атомарний запис через тимчасовий файл (захист від обривів зв'язку та пошкодження)
    $formattedJson = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $tempPath = $dbPath . '.tmp.' . uniqid();
    $written = file_put_contents($tempPath, $formattedJson);

    if ($written === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Не вдалося зберегти файл на диску (перевірте права запису)']);
        exit;
    }

    // Перейменування є атомарною операцією файлової системи
    if (!rename($tempPath, $dbPath)) {
        file_put_contents($dbPath, $formattedJson);
        @unlink($tempPath);
    }

    echo json_encode(['success' => true, 'timestamp' => date('c')]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не підтримується']);
