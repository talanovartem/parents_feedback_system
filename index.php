<?php
require_once __DIR__ . '/config.php';

session_name(SESSION_NAME);
session_start();

// Обробка виходу
if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: index.php');
    exit;
}

$error = '';

// Обробка форми логіну
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    $enteredPassword = $_POST['password'];

    if ($enteredPassword === TEACHER_PASSWORD) {
        $_SESSION['authenticated'] = true;
        header('Location: index.php');
        exit;
    } else {
        $error = 'Невірний пароль. Спробуйте ще раз.';
    }
}

// Якщо ще не авторизовані — показуємо сучасну форму входу
if (empty($_SESSION['authenticated'])) {
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Вхід | Журнал зворотного зв'язку</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4 antialiased">
    <div class="bg-white rounded-3xl shadow-xl border border-slate-200/80 w-full max-w-md p-8 sm:p-10 space-y-6">
        <div class="text-center space-y-3">
            <div class="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
            </div>
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Журнал зворотного зв'язку</h1>
            <p class="text-xs text-slate-500 max-w-xs mx-auto">
                Система захищена паролем для збереження конфіденційності даних учнів
            </p>
        </div>

        <?php if (TEACHER_PASSWORD === 'teacher2026'): ?>
            <div class="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                ⚠️ Ще не змінено пароль за замовчуванням. Відкрийте <code class="font-mono">config.php</code> та встановіть власний пароль.
            </div>
        <?php endif; ?>

        <?php if (!empty($error)): ?>
            <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <svg class="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <form method="POST" action="index.php" class="space-y-4">
            <div>
                <label for="password" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Пароль вчителя
                </label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required 
                    autofocus
                    placeholder="Введіть пароль..."
                    class="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                >
            </div>

            <button 
                type="submit" 
                class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-[0.98]"
            >
                Увійти до системи
            </button>
        </form>
    </div>
</body>
</html>
<?php
    exit;
}

// Авторизований користувач: віддаємо зібраний SPA додаток
$appFile = file_exists(__DIR__ . '/app.html') ? __DIR__ . '/app.html' : __DIR__ . '/dist/index.html';
if (file_exists($appFile)) {
    echo file_get_contents($appFile);
} else {
    echo "<div style='font-family: sans-serif; text-align: center; padding: 50px;'>";
    echo "<h2>Помилка: Файл інтерфейсу не знайдено</h2>";
    echo "<p>Переконайтеся, що файл app.html завантажено на сервер або запустіть npm run build.</p>";
    echo "</div>";
}
