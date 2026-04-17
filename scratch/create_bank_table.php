<?php
require_once 'api/db_config.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        coa_list_id INT NOT NULL,
        bank_name VARCHAR(255),
        branch VARCHAR(255),
        account_title VARCHAR(255),
        account_no VARCHAR(100),
        contact_person VARCHAR(255),
        address TEXT,
        telephone VARCHAR(50),
        mobile VARCHAR(50),
        fax VARCHAR(50),
        email VARCHAR(100),
        website VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (company_id),
        INDEX (coa_list_id),
        FOREIGN KEY (coa_list_id) REFERENCES coa_list(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $pdo->exec($sql);
    echo "Table 'bank_accounts' created successfully (or already exists).";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
