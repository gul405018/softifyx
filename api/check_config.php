<?php
/**
 * SoftifyX ERP - Diagnostics Script
 * Run this to check database health and column names.
 */
header('Content-Type: application/json');
require_once '../includes/db_connect.php';

$report = [
    "status" => "running",
    "timestamp" => date('Y-m-d H:i:s'),
    "checks" => []
];

function check_table($pdo, $tableName, &$report) {
    try {
        $stmt = $pdo->query("DESCRIBE `$tableName`");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $report['checks'][$tableName] = [
            "exists" => true,
            "columns" => array_column($columns, 'Field')
        ];
    } catch (Exception $e) {
        $report['checks'][$tableName] = [
            "exists" => false,
            "error" => $e->getMessage()
        ];
    }
}

try {
    // 1. Check Connection
    $stmt = $pdo->query("SELECT VERSION() as v");
    $v = $stmt->fetch();
    $report['db_version'] = $v['v'];
    
    // 2. Check Tables
    check_table($pdo, 'companies', $report);
    check_table($pdo, 'users', $report);
    check_table($pdo, 'financial_years', $report);
    
    $report['status'] = "completed";

} catch (Throwable $e) {
    $report['status'] = "error";
    $report['error_overall'] = $e->getMessage();
}

echo json_encode($report, JSON_PRETTY_PRINT);
?>
