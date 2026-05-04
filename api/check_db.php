<?php
require_once 'db_config.php';
try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'purchase_returns'");
    $exists = $stmt->rowCount() > 0;
    
    $stmt2 = $pdo->query("DESCRIBE purchase_returns");
    $columns = $stmt2->fetchAll();
    
    echo json_encode([
        'table_exists' => $exists,
        'columns' => $columns,
        'db_name' => $db
    ]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
