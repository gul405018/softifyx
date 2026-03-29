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

    // Check if code exists for this company
    $stmt = $pdo->prepare("SELECT id FROM coa_main WHERE company_id = ? AND code = ?");
    $stmt->execute([$company_id, $data['code']]);
    $existing = $stmt->fetch();

    if ($existing) {
        $upd = $pdo->prepare("UPDATE coa_main SET name = ?, component = ? WHERE id = ?");
        $upd->execute([$data['name'], $data['component'], $existing['id']]);
    } else {
        $ins = $pdo->prepare("INSERT INTO coa_main (company_id, code, name, component) VALUES (?, ?, ?, ?)");
        $ins->execute([$company_id, $data['code'], $data['name'], $data['component']]);
    }

    echo json_encode(["status" => "success", "message" => "Main Account saved!"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
