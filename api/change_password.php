<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

try {
    $user_id = $data['user_id'];
    $old_password = $data['old_password'];
    $new_password = $data['new_password'];

    // Verify old password
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($old_password, $user['password'])) {
        echo json_encode(["status" => "error", "message" => "Invalid old password."]);
        exit;
    }

    // Update with new password
    $hash = password_hash($new_password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hash, $user_id]);

    echo json_encode(["status" => "success", "message" => "Password changed successfully!"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
