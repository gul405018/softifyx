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

    $check = $pdo->prepare("SELECT id FROM companies WHERE id = ? LIMIT 1");
    $check->execute([$company_id]);
    $existing = $check->fetch();

    if ($existing) {
        $stmt = $pdo->prepare("UPDATE companies SET company_name = ?, address = ?, phone = ?, fax = ?, email = ?, website = ?, ntn_no = ?, gst_no = ? WHERE id = ?");
        $stmt->execute([
            $data['name'], 
            $data['address'], 
            $data['phone'], 
            $data['fax'] ?? '', 
            $data['email'], 
            $data['website'] ?? '', 
            $data['ntn'], 
            $data['gst'], 
            $company_id
        ]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO companies (company_name, address, phone, fax, email, website, ntn_no, gst_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['name'], 
            $data['address'], 
            $data['phone'], 
            $data['fax'] ?? '', 
            $data['email'], 
            $data['website'] ?? '', 
            $data['ntn'], 
            $data['gst']
        ]);
    }

    echo json_encode(["status" => "success", "message" => "Company settings updated successfully!"]);
} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
