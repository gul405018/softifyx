<?php
require_once 'db_config.php';
header('Content-Type: application/json');

$debug = [];

try {
    // 1. Check Companies
    $stmt = $pdo->query("SELECT * FROM companies");
    $debug['companies'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Check Users
    $stmt = $pdo->query("SELECT id, username, company_id, role FROM users");
    $debug['users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($debug, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
