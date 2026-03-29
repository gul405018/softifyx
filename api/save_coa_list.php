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

    $stmt = $pdo->prepare("SELECT id FROM coa_list WHERE company_id = ? AND code = ?");
    $stmt->execute([$company_id, $data['code']]);
    $existing = $stmt->fetch();

    if ($existing) {
        $upd = $pdo->prepare("UPDATE coa_list SET name = ? WHERE id = ?");
        $upd->execute([$data['name'], $existing['id']]);
    } else {
        // Find sub_id from subCode
        $ins = $pdo->prepare("INSERT INTO coa_list (company_id, sub_id, code, name) VALUES (?, (SELECT id FROM coa_sub WHERE code = ? AND company_id = ?), ?, ?)");
        $ins->execute([$company_id, $data['subCode'], $company_id, $data['code'], $data['name']]);
    }

    echo json_encode(["status" => "success", "message" => "Account List saved!"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
