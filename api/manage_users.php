<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT id, username, email, role, status FROM users ORDER BY id ASC");
    echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['action']) && $data['action'] === 'delete') {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$data['id']]);
        echo json_encode(["status" => "success", "message" => "User deleted successfully."]);
    } else {
        // Create or Update
        if (isset($data['id']) && $data['id']) {
            $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, role = ?, status = ? WHERE id = ?");
            $stmt->execute([$data['username'], $data['email'], $data['role'], $data['status'], $data['id']]);
            echo json_encode(["status" => "success", "message" => "User updated successfully."]);
        } else {
            // Check for existing username
            $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $check->execute([$data['username']]);
            if ($check->fetch()) {
                echo json_encode(["status" => "error", "message" => "Username already exists."]);
                exit;
            }
            $pass = password_hash($data['password'] ?? '123', PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, password, email, role, status) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$data['username'], $pass, $data['email'], $data['role'], $data['status']]);
            echo json_encode(["status" => "success", "message" => "User created successfully."]);
        }
    }
}
?>
