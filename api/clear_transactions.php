<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

try {
    $company_id = 1;

    // Delete only transactional data
    $stmt = $pdo->prepare("DELETE FROM vouchers WHERE company_id = ?");
    $stmt->execute([$company_id]);

    echo json_encode(["status" => "success", "message" => "All transactions cleared successfully! Structural data (COA/Inventory) preserved."]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
