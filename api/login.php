<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['username']) || !isset($data['password'])) {
    echo json_encode(["status" => "error", "message" => "Please enter username and password."]);
    exit;
}

try {
    $username = $data['username'];
    $password = $data['password'];
    $company_name = $data['company'] ?? '';
    $year = $data['year'] ?? '';

    // 1. Fetch User
    $stmt = $pdo->prepare("SELECT id, username, password, role, status FROM users WHERE username = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(["status" => "error", "message" => "Invalid username or password."]);
        exit;
    }

    if ($user['status'] !== 'Active') {
        echo json_encode(["status" => "error", "message" => "Your account is inactive. Please contact your administrator."]);
        exit;
    }

    // 2. Verify Password (Hashed and Plain-text fallback for legacy/init)
    if (password_verify($password, $user['password']) || $password === $user['password']) {
        // Successful login
        echo json_encode([
            "status" => "success",
            "message" => "Login successful!",
            "session" => [
                "user_id" => $user['id'],
                "username" => $user['username'],
                "role" => $user['role'],
                "company" => $company_name,
                "year" => $year,
                "loginTime" => time() * 1000 // In milliseconds for consistency
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid username or password."]);
    }

} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => "Server Error: " . $e->getMessage()]);
}
?>
