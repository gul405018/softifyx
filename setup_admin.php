<?php
header('Content-Type: application/json');
require_once 'includes/db_connect.php';

try {
    $username = 'Administrator';
    $password = '123'; // Default temp password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
    // Check if Administrator exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user) {
        // Update password just in case
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$hashed_password, $user['id']]);
        echo json_encode(["status" => "success", "message" => "Administrator password reset to '123' in database."]);
    } else {
        // Create Administrator
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role, status) VALUES (?, ?, 'Admin', 'Active')");
        $stmt->execute([$username, $hashed_password]);
        echo json_encode(["status" => "success", "message" => "Administrator user created with password '123' in database."]);
    }

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
