<?php
require_once '../api/db_config.php';

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS coa_opening_balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        coa_id INT NOT NULL,
        fy_id INT NOT NULL,
        debit DECIMAL(15,2) DEFAULT 0.00,
        credit DECIMAL(15,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_opening (company_id, coa_id, fy_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    echo "Table 'coa_opening_balances' created successfully.\n";
} catch (PDOException $e) {
    echo "Error creating table: " . $e->getMessage() . "\n";
}
?>
