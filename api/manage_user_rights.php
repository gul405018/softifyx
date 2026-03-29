<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_GET['user_id'] ?? 0;
    $stmt = $pdo->prepare("SELECT right_name, is_allowed FROM user_rights WHERE user_id = ?");
    $stmt->execute([$user_id]);
    echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $user_id = $data['user_id'];
    $rights = $data['rights']; // Array of {right_name, is_allowed}

    try {
        $pdo->beginTransaction();
        // Delete old rights
        $stmt = $pdo->prepare("DELETE FROM user_rights WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Insert new rights
        $stmt = $pdo->prepare("INSERT INTO user_rights (user_id, right_name, is_allowed) VALUES (?, ?, ?)");
        foreach ($rights as $right) {
            $stmt->execute([$user_id, $right['name'], $right['allowed'] ? 1 : 0]);
        }
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "User rights updated successfully."]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
