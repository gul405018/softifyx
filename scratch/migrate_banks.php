<?php
require_once 'api/db_config.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS bank_accounts (
        id int(11) NOT NULL AUTO_INCREMENT,
        company_id int(11) NOT NULL,
        coa_list_id int(11) NOT NULL,
        bank_name varchar(255),
        branch varchar(255),
        account_title varchar(255),
        account_no varchar(100),
        contact_person varchar(255),
        address text,
        telephone varchar(100),
        mobile varchar(100),
        fax varchar(100),
        email varchar(255),
        website varchar(255),
        remarks text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (coa_list_id) REFERENCES coa_list(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $pdo->exec($sql);
    echo "Success: bank_accounts table created or already exists.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
