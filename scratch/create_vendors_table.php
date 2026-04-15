<?php
require_once 'api/db_config.php';

$sql = "CREATE TABLE IF NOT EXISTS `vendors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `coa_list_id` int(11) NOT NULL,
  `contact_person` varchar(255),
  `address` text,
  `telephone` varchar(100),
  `mobile` varchar(100),
  `fax` varchar(100),
  `email` varchar(255),
  `website` varchar(255),
  `st_reg_no` varchar(100),
  `ntn_cnic` varchar(100),
  `credit_terms` varchar(255) DEFAULT 'CASH',
  `remarks` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`coa_list_id`) REFERENCES `coa_list`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

try {
    $pdo->exec($sql);
    echo "Table 'vendors' created successfully or already exists.";
} catch (PDOException $e) {
    echo "Error creating table: " . $e->getMessage();
}
?>
