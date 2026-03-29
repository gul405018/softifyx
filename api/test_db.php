<?php
/**
 * SoftifyX ERP - Connection Test
 * 
 * Open this file in your browser after uploading to Hostinger.
 * Example: https://yourdomain.com/api/test_db.php
 */

require_once '../includes/db_connect.php';

header('Content-Type: application/json');

try {
    // Check if the PDO object exists and is connected
    if (isset($pdo)) {
        // Try a simple query
        $stmt = $pdo->query("SELECT VERSION() as version");
        $row = $stmt->fetch();
        
        echo json_encode([
            "status" => "success",
            "message" => "Connected to Database successfully!",
            "database_version" => $row['version'],
            "server_time" => date('Y-m-d H:i:s')
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
