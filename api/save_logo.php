<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

try {
    $company_id = 1;

    // Check if exists
    $check = $pdo->prepare("SELECT id FROM companies WHERE id = ? LIMIT 1");
    $check->execute([$company_id]);
    $existing = $check->fetch();

    if ($existing) {
        $stmt = $pdo->prepare("UPDATE companies SET logo_data = ? WHERE id = ?");
        $stmt->execute([$data['logo'], $company_id]);
    } else {
        // This case shouldn't really happen if company exists, but for safety:
        $stmt = $pdo->prepare("UPDATE companies SET logo_data = ? WHERE id = ?");
        $stmt->execute([$data['logo'], $company_id]);
    }

    echo json_encode(["status" => "success", "message" => "Logo saved successfully!"]);
} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
