<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['name'])) {
    echo json_encode(["status" => "error", "message" => "No company name received"]);
    exit;
}

try {
    $name = $data['name'];
    $id = $data['id'] ?? null;

    // Check if we already have this company (by ID or exact name)
    if ($id) {
        $check = $pdo->prepare("SELECT id FROM companies WHERE id = ? LIMIT 1");
        $check->execute([$id]);
    } else {
        $check = $pdo->prepare("SELECT id FROM companies WHERE company_name = ? LIMIT 1");
        $check->execute([$name]);
    }
    
    $existing = $check->fetch();

    if ($existing) {
        $updateId = $existing['id'];
        $stmt = $pdo->prepare("UPDATE companies SET company_name = ?, address = ?, phone = ?, fax = ?, email = ?, website = ?, ntn_no = ?, gst_no = ?, deals_in = ? WHERE id = ?");
        $stmt->execute([
            $name, 
            $data['address'] ?? '', 
            $data['phone'] ?? '', 
            $data['fax'] ?? '', 
            $data['email'] ?? '', 
            $data['website'] ?? '', 
            $data['ntn'] ?? '', 
            $data['gst'] ?? '', 
            $data['dealsIn'] ?? '',
            $updateId
        ]);
        $message = "Company settings updated successfully!";
    } else {
        $stmt = $pdo->prepare("INSERT INTO companies (company_name, address, phone, fax, email, website, ntn_no, gst_no, deals_in) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $name, 
            $data['address'] ?? '', 
            $data['phone'] ?? '', 
            $data['fax'] ?? '', 
            $data['email'] ?? '', 
            $data['website'] ?? '', 
            $data['ntn'] ?? '', 
            $data['gst'] ?? '',
            $data['dealsIn'] ?? ''
        ]);
        $updateId = $pdo->lastInsertId();
        $message = "New company created successfully!";
    }

    echo json_encode(["status" => "success", "message" => $message, "id" => $updateId]);
} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
