<?php
require_once __DIR__ . '/config.php';

session_name(SESSION_NAME);
session_start();

// Заголовки відповіді
header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . '/data';
$dbPath = $dataDir . '/database.json';
$defaultDbPath = $dataDir . '/database.default.json';
$backupsDir = $dataDir . '/backups';

// ─── Допоміжні функції ────────────────────────────────────────────────────────

/** Лічильник невдалих спроб (антибрут у межах сесії, вікно 10 хв, ліміт 10). */
function pfs_throttle_blocked(): bool
{
    $now = time();
    $t = $_SESSION['pfs_fails'] ?? ['count' => 0, 'start' => $now];
    if ($now - $t['start'] > 600) {
        $t = ['count' => 0, 'start' => $now];
        $_SESSION['pfs_fails'] = $t;
    }
    return $t['count'] >= 10;
}

function pfs_throttle_hit(): void
{
    $now = time();
    $t = $_SESSION['pfs_fails'] ?? ['count' => 0, 'start' => $now];
    if ($now - $t['start'] > 600) {
        $t = ['count' => 0, 'start' => $now];
    }
    $t['count']++;
    $_SESSION['pfs_fails'] = $t;
}

function pfs_throttle_reset(): void
{
    unset($_SESSION['pfs_fails']);
}

function pfs_read_db(string $dbPath, string $defaultDbPath): ?array
{
    if (!file_exists($dbPath) && file_exists($defaultDbPath)) {
        @copy($defaultDbPath, $dbPath);
    }
    if (!file_exists($dbPath)) {
        return null;
    }
    $db = json_decode((string)file_get_contents($dbPath), true);
    return is_array($db) ? $db : null;
}

/** Атомарний запис із бекапами. false — помилка диска. */
function pfs_write_db(string $dbPath, string $backupsDir, array $decoded): bool
{
    if (!is_dir($backupsDir)) {
        @mkdir($backupsDir, 0775, true);
    }
    if (file_exists($dbPath) && filesize($dbPath) > 0) {
        @copy($dbPath, $dbPath . '.bak');
        $todayBackup = $backupsDir . '/backup_' . date('Y-m-d') . '.json';
        if (!file_exists($todayBackup)) {
            @copy($dbPath, $todayBackup);
        }
    }
    $formattedJson = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $tempPath = $dbPath . '.tmp.' . uniqid();
    if (file_put_contents($tempPath, $formattedJson) === false) {
        return false;
    }
    if (!rename($tempPath, $dbPath)) {
        file_put_contents($dbPath, $formattedJson);
        @unlink($tempPath);
    }
    return true;
}

function pfs_find(array $db, string $key, string $id): ?array
{
    foreach (($db[$key] ?? []) as $item) {
        if (($item['id'] ?? '') === $id) {
            return $item;
        }
    }
    return null;
}

/** Бонус KP за якісний фідбек. Список стоп-фраз має збігатися з src/utils/feedbackAntiSpam.ts */
function pfs_feedback_bonus(string $insight): int
{
    $len = mb_strlen($insight);
    if ($len < 15) {
        return 0;
    }
    $normalized = mb_strtolower($insight);
    $normalized = preg_replace('/[.,!?:;\—\-\(\)_+\*\/~]/u', ' ', $normalized) ?? $normalized;
    $normalized = trim(preg_replace('/\s+/u', ' ', $normalized) ?? $normalized);
    $stopPhrases = ['все ок', 'все норм', 'все добре', 'все класно', 'все гарно', 'все супер',
        'все нормально', 'все сподобалося', 'все сподобалось', 'все було добре', 'все було норм',
        'нічого', 'хз', 'хз нічого', 'норм', 'ок', 'клас', 'добре', 'не знаю'];
    if (in_array($normalized, $stopPhrases, true)) {
        return 0;
    }
    return $len >= 40 ? 2 : 1;
}

// Дія виходу
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    $_SESSION = [];
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Вихід виконано']);
    exit;
}

// ─── Публічні дії учнівського порталу та фідбеку (без сесії вчителя) ─────────
$action = $_GET['action'] ?? '';

if ($action === 'portal_auth') {
    if (pfs_throttle_blocked()) {
        http_response_code(429);
        echo json_encode(['error' => 'Забагато спроб. Спробуйте через 10 хвилин.']);
        exit;
    }
    $studentId = $_GET['studentId'] ?? '';
    $code = $_GET['code'] ?? '';
    $db = pfs_read_db($dbPath, $defaultDbPath);
    $student = $db ? pfs_find($db, 'students', $studentId) : null;
    $ok = $student !== null
        && $code !== ''
        && isset($student['accessCode'])
        && hash_equals((string)$student['accessCode'], $code);
    if (!$ok) {
        pfs_throttle_hit();
        http_response_code(403);
        echo json_encode(['error' => 'Невірний код доступу']);
        exit;
    }
    pfs_throttle_reset();
    $classId = (string)($student['classId'] ?? '');
    $scoped = [
        'version' => $db['version'] ?? 4,
        'classes' => array_values(array_filter($db['classes'] ?? [], fn($c) => ($c['id'] ?? '') === $classId)),
        'students' => [[
            'id' => $student['id'],
            'classId' => $student['classId'],
            'name' => $student['name'],
            'gender' => $student['gender'] ?? null,
            'notes' => $student['notes'] ?? null,
            'karpatyPoints' => $student['karpatyPoints'] ?? 0,
        ]],
        'criteria' => $db['criteria'] ?? [],
        'lessons' => array_values(array_filter($db['lessons'] ?? [], fn($l) => ($l['classId'] ?? '') === $classId)),
        'records' => [$studentId => $db['records'][$studentId] ?? []],
        'sentReports' => [],
        'savedReports' => [],
        'lessonFeedback' => [],
        'attentionTasks' => array_values(array_filter($db['attentionTasks'] ?? [], fn($t) => ($t['studentId'] ?? '') === $studentId)),
        'kpTransactions' => array_values(array_filter($db['kpTransactions'] ?? [], fn($t) => ($t['studentId'] ?? '') === $studentId)),
    ];
    echo json_encode($scoped);
    exit;
}

if ($action === 'feedback_meta') {
    $lessonId = $_GET['lessonId'] ?? '';
    $db = pfs_read_db($dbPath, $defaultDbPath);
    $lesson = $db ? pfs_find($db, 'lessons', $lessonId) : null;
    if (!$lesson) {
        http_response_code(404);
        echo json_encode(['error' => 'Урок не знайдено']);
        exit;
    }
    $classId = (string)($lesson['classId'] ?? '');
    $students = array_values(array_filter($db['students'] ?? [], fn($s) => ($s['classId'] ?? '') === $classId));
    // PIN та код доступу клієнту не потрібні — перевірка на сервері
    foreach ($students as $i => $s) {
        unset($s['pinCode'], $s['accessCode']);
        $students[$i] = $s;
    }
    $scoped = [
        'version' => $db['version'] ?? 4,
        'classes' => array_values(array_filter($db['classes'] ?? [], fn($c) => ($c['id'] ?? '') === $classId)),
        'students' => $students,
        'criteria' => [],
        'lessons' => [$lesson],
        'records' => [],
        'sentReports' => [],
        'savedReports' => [],
        'lessonFeedback' => [],
        'attentionTasks' => [],
        'kpTransactions' => [],
    ];
    echo json_encode($scoped);
    exit;
}

if ($action === 'feedback_auth') {
    if (pfs_throttle_blocked()) {
        http_response_code(429);
        echo json_encode(['error' => 'Забагато спроб. Спробуйте через 10 хвилин.']);
        exit;
    }
    $studentId = $_GET['studentId'] ?? '';
    $pin = (string)($_GET['pin'] ?? '');
    $db = pfs_read_db($dbPath, $defaultDbPath);
    $student = $db ? pfs_find($db, 'students', $studentId) : null;
    $expected = (string)($student['pinCode'] ?? '');
    if (!$student || ($expected !== '' && !hash_equals($expected, $pin))) {
        pfs_throttle_hit();
        http_response_code(403);
        echo json_encode(['error' => 'Невірний PIN-код']);
        exit;
    }
    pfs_throttle_reset();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'save_feedback') {
    if (pfs_throttle_blocked()) {
        http_response_code(429);
        echo json_encode(['error' => 'Забагато спроб. Спробуйте через 10 хвилин.']);
        exit;
    }
    $input = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'Некоректний JSON']);
        exit;
    }
    $lessonId = (string)($input['lessonId'] ?? '');
    $studentId = (string)($input['studentId'] ?? '');
    $pin = (string)($input['pin'] ?? '');
    $fb = is_array($input['feedback'] ?? null) ? $input['feedback'] : [];

    $db = pfs_read_db($dbPath, $defaultDbPath);
    $lesson = $db ? pfs_find($db, 'lessons', $lessonId) : null;
    $student = $db ? pfs_find($db, 'students', $studentId) : null;
    if (!$db || !$lesson || !$student || ($student['classId'] ?? '') !== ($lesson['classId'] ?? '')) {
        http_response_code(404);
        echo json_encode(['error' => 'Урок або учень не знайдено']);
        exit;
    }
    $expected = (string)($student['pinCode'] ?? '');
    if ($expected !== '' && !hash_equals($expected, $pin)) {
        pfs_throttle_hit();
        http_response_code(403);
        echo json_encode(['error' => 'Невірний PIN-код']);
        exit;
    }
    pfs_throttle_reset();

    $insight = trim((string)($fb['insight'] ?? ''));
    if ($insight === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Порожній відгук']);
        exit;
    }
    $newPts = pfs_feedback_bonus($insight);

    $feedbackId = $studentId . ':' . $lessonId;
    $existing = $db['lessonFeedback'][$feedbackId] ?? null;
    $oldPts = (int)($existing['karpatyPointsEarned'] ?? 0);
    $delta = $newPts - $oldPts;
    $now = date('c');

    $db['lessonFeedback'][$feedbackId] = [
        'id' => $feedbackId,
        'studentId' => $studentId,
        'lessonId' => $lessonId,
        'mood' => (string)($fb['mood'] ?? 'normal'),
        'selfGrade' => (int)($fb['selfGrade'] ?? 3),
        'insight' => $insight,
        'difficulty' => trim((string)($fb['difficulty'] ?? '')) ?: null,
        'bonusGranted' => $newPts > 0,
        'karpatyPointsEarned' => $newPts,
        'createdAt' => $existing['createdAt'] ?? $now,
    ];
    foreach ($db['students'] as $i => $s) {
        if (($s['id'] ?? '') === $studentId) {
            $db['students'][$i]['karpatyPoints'] = ($s['karpatyPoints'] ?? 0) + $delta;
            break;
        }
    }
    if ($delta !== 0) {
        $db['kpTransactions'][] = [
            'id' => 'kp-' . uniqid(),
            'studentId' => $studentId,
            'amount' => $delta,
            'reason' => ($existing ? 'Коригування' : 'Фідбек') . ' фідбеку до уроку (' . ($lesson['date'] ?? '') . ')',
            'createdAt' => $now,
        ];
    }
    $savedBalance = 0;
    foreach ($db['students'] as $s) {
        if (($s['id'] ?? '') === $studentId) {
            $savedBalance = (int)($s['karpatyPoints'] ?? 0);
            break;
        }
    }
    if (!pfs_write_db($dbPath, $backupsDir, $db)) {
        http_response_code(500);
        echo json_encode(['error' => 'Не вдалося зберегти файл на диску']);
        exit;
    }
    echo json_encode(['success' => true, 'karpatyPointsEarned' => $newPts, 'balance' => $savedBalance]);
    exit;
}

// ─── Далі — лише для авторизованого вчителя ──────────────────────────────────
if (empty($_SESSION['authenticated'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Необхідна авторизація']);
    exit;
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

    if (!pfs_write_db($dbPath, $backupsDir, $decoded)) {
        http_response_code(500);
        echo json_encode(['error' => 'Не вдалося зберегти файл на диску (перевірте права запису)']);
        exit;
    }

    echo json_encode(['success' => true, 'timestamp' => date('c')]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не підтримується']);
