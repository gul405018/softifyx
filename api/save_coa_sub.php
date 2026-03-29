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

    // We search by code for this company
    $stmt = $pdo->prepare("SELECT id FROM coa_sub WHERE company_id = ? AND code = ?");
    $stmt->execute([$company_id, $data['code']]);
    $existing = $stmt->fetch();

    if ($existing) {
        $upd = $pdo->prepare("UPDATE coa_sub SET name = ? WHERE id = ?");
        $upd->execute([$data['name'], $existing['id']]);
    } else {
        $ins = $pdo->prepare("INSERT INTO coa_sub (company_id, main_id, code, name) VALUES (?, (SELECT id FROM coa_main WHERE code = ? AND company_id = ?), ?, ?)");
        $ins->execute([$company_id, $data['mainCode'], $company_id, $data['code'], $data['name']]);
    }

    echo json_encode(["status" => "success", "message" => "Sub Account saved!"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
