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
    $check = $pdo->prepare("SELECT id FROM company_logos WHERE company_id = ? LIMIT 1");
    $check->execute([$company_id]);
    $existing = $check->fetch();

    if ($existing) {
        $stmt = $pdo->prepare("UPDATE company_logos SET logo_data = ? WHERE company_id = ?");
        $stmt->execute([$data['logo'], $company_id]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO company_logos (company_id, logo_data) VALUES (?, ?)");
        $stmt->execute([$company_id, $data['logo']]);
    }

    echo json_encode(["status" => "success", "message" => "Logo saved successfully!"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
