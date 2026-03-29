<?php
header('Content-Type: application/json');
require_once 'includes/db_connect.php';

try {
    $results = [];

    // 1. Create/Update Administrator
    $username = 'Administrator';
    $password = '123';
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user) {
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$hashed_password, $user['id']]);
        $results[] = "Administrator password reset to '123'.";
    } else {
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role, status) VALUES (?, ?, 'Admin', 'Active')");
        $stmt->execute([$username, $hashed_password]);
        $results[] = "Administrator user created (Password: 123).";
    }

    // 2. Create Default Company (if none exist)
    $stmt = $pdo->query("SELECT COUNT(*) FROM companies");
    if ($stmt->fetchColumn() == 0) {
        $stmt = $pdo->prepare("INSERT INTO companies (company_name, address, phone, email) VALUES (?, ?, ?, ?)");
        $stmt->execute(['Sample Company Ltd', 'Main Street, City', '+92 000 0000000', 'info@sample.com']);
        $company_id = $pdo->lastInsertId();
        $results[] = "Default 'Sample Company Ltd' created.";

        // 3. Create Default Financial Year for this company
        $stmt = $pdo->prepare("INSERT INTO financial_years (company_id, abbreviation, start_date, end_date) VALUES (?, ?, ?, ?)");
        $stmt->execute([$company_id, '2024-25', '2024-07-01', '2025-06-30']);
        $results[] = "Default Financial Year '2024-25' created.";
    } else {
        $results[] = "Companies already exist, skipping default company creation.";
    }

    echo json_encode(["status" => "success", "messages" => $results]);

} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
