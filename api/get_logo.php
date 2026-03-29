<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

try {
    $company_id = $_GET['id'] ?? null;
    $company_name = $_GET['name'] ?? null;

    if ($company_id) {
        $stmt = $pdo->prepare("SELECT logo_data FROM companies WHERE id = ?");
        $stmt->execute([$company_id]);
    } elseif ($company_name) {
        $stmt = $pdo->prepare("SELECT logo_data FROM companies WHERE company_name = ?");
        $stmt->execute([$company_name]);
    } else {
        echo json_encode(["status" => "error", "message" => "Missing company ID or name"]);
        exit;
    }

    $row = $stmt->fetch();
    echo json_encode(["status" => "success", "logo" => $row ? $row['logo_data'] : null]);

} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
