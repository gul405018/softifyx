<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

try {
    $company_id = $data['company_id'] ?? 1; 

    if (!empty($data['id'])) {
        // Update
        $stmt = $pdo->prepare("UPDATE financial_years SET abbreviation = ?, start_date = ?, end_date = ? WHERE id = ? AND company_id = ?");
        $stmt->execute([$data['abbreviation'], $data['startDate'], $data['endDate'], $data['id'], $company_id]);
    } else {
        // Insert
        $stmt = $pdo->prepare("INSERT INTO financial_years (company_id, abbreviation, start_date, end_date) VALUES (?, ?, ?, ?)");
        $stmt->execute([$company_id, $data['abbreviation'], $data['startDate'], $data['endDate']]);
    }

    echo json_encode(["status" => "success", "message" => "Financial Year saved successfully!"]);
} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
