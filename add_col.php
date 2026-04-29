<?php
require 'api/db_config.php';
try {
    $pdo->exec("ALTER TABLE purchase_orders ADD COLUMN converted_to VARCHAR(100) DEFAULT NULL AFTER is_cancelled");
    echo "Success: Column added.";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Success: Column already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
