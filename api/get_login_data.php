<?php
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

try {
    // 1. Fetch Companies
    $stmt = $pdo->query("SELECT id, company_name as name FROM companies ORDER BY name ASC");
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch Users
    $stmt = $pdo->query("SELECT id, username FROM users WHERE status = 'Active' ORDER BY username ASC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Fetch All Financial Years (grouped by company_id for client-side filtering)
    $stmt = $pdo->query("SELECT id, company_id, abbreviation as abbr FROM financial_years ORDER BY abbr DESC");
    $fys = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "companies" => $companies,
        "users" => $users,
        "financial_years" => $fys
    ]);

} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
