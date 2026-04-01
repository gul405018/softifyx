<?php
require_once 'db_config.php';
try {
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode(['tables' => $tables]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
