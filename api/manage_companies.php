<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, company_name as name, address, phone, fax, email, website, gst_no, ntn_no, deals_in FROM companies ORDER BY id ASC");
        $companies = $stmt->fetchAll();
        echo json_encode(["status" => "success", "data" => $companies]);
    } catch (Throwable $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Delete action
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['action']) && $data['action'] === 'delete' && isset($data['id'])) {
        try {
            $stmt = $pdo->prepare("DELETE FROM companies WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(["status" => "success", "message" => "Company deleted successfully!"]);
        } catch (Throwable $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid delete request"]);
    }
}
?>
