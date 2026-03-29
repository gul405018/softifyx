<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

try {
    $company_id = 1; // Default for now

    // Check if exists
    $check = $pdo->prepare("SELECT id FROM currencies WHERE company_id = ? LIMIT 1");
    $check->execute([$company_id]);
    $existing = $check->fetch();

    if ($existing) {
        $stmt = $pdo->prepare("UPDATE currencies SET country_name = ?, currency_name = ?, symbol = ? WHERE company_id = ?");
        $stmt->execute([$data['country'], $data['name'], $data['symbol'], $company_id]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO currencies (company_id, country_name, currency_name, symbol) VALUES (?, ?, ?, ?)");
        $stmt->execute([$company_id, $data['country'], $data['name'], $data['symbol']]);
    }

    echo json_encode(["status" => "success", "message" => "Currency saved successfully!"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
