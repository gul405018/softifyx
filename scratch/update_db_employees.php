<?php
require_once 'api/db_config.php';

header('Content-Type: text/plain');
echo "Applying Database Updates...\n";

$sql = "
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `father_name` varchar(255),
  `address` text,
  `telephone` varchar(100),
  `email` varchar(255),
  `nic_no` varchar(100),
  `dob` date,
  `joining_date` date,
  `salary` decimal(20,2) DEFAULT 0,
  `designation` varchar(255),
  `department_id` int(11),
  `remarks` text,
  `reference` varchar(255),
  `job_left` tinyint(1) DEFAULT 0,
  `leaving_date` date,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed some departments
INSERT IGNORE INTO `departments` (id, company_id, name) VALUES 
(1, 1, 'Administration'),
(2, 1, 'Sales'),
(3, 1, 'Accounts'),
(4, 1, 'Store'),
(5, 1, 'Production');
";

try {
    $pdo->exec($sql);
    echo "Database updates applied successfully!\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
