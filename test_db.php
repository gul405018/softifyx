<?php
// SoftifyX ERP Database Connection Diagnostic Tool
require_once 'api/db_config.php';

header('Content-Type: text/plain');
echo "=== SoftifyX ERP Database Connection Diagnostic ===\n\n";

try {
    // 1. Check Connection
    echo "[1] Checking MySQL Connection... ";
    if ($pdo) {
        echo "OK! Connected to " . $db . " as user " . $user . "\n";
    }

    // 2. Check Tables
    echo "[2] Checking Required Tables...\n";
    $tables = ['companies', 'users', 'user_rights', 'dashboard_summary', 'financial_years', 'currencies', 'coa_main', 'coa_sub', 'coa_list'];
    
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT 1 FROM `$table` LIMIT 1");
            echo "   - Table '$table': FOUND\n";
        } catch (PDOException $e) {
            echo "   - Table '$table': MISSING or ERROR (" . $e->getMessage() . ")\n";
        }
    }

    // 3. User Count test
    echo "\n[3] Checking User Data...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $rowCount = $stmt->fetchColumn();
    echo "   - Number of users in database: " . $rowCount . "\n";

} catch (Exception $e) {
    echo "\nFATAL ERROR: " . $e->getMessage() . "\n";
}

echo "\nIf everything says 'OK' and 'FOUND', the database is correctly configured.";
?>
