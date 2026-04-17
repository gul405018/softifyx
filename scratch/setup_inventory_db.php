<?php
$host = 'localhost';
$db   = 'softifyx';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // 1. Inventory Main Category
    $pdo->exec("CREATE TABLE IF NOT EXISTS `inv_main` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `company_id` int(11) NOT NULL,
      `code` varchar(20) NOT NULL,
      `name` varchar(255) NOT NULL,
      PRIMARY KEY (`id`),
      FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
      UNIQUE KEY `inv_main_code_company` (`code`, `company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 2. Inventory Sub Category
    $pdo->exec("CREATE TABLE IF NOT EXISTS `inv_sub` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `company_id` int(11) NOT NULL,
      `main_id` int(11) NOT NULL,
      `code` varchar(20) NOT NULL,
      `name` varchar(255) NOT NULL,
      PRIMARY KEY (`id`),
      FOREIGN KEY (`main_id`) REFERENCES `inv_main`(`id`) ON DELETE CASCADE,
      UNIQUE KEY `inv_sub_code_company` (`code`, `company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 3. Inventory Items
    $pdo->exec("CREATE TABLE IF NOT EXISTS `inv_items` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `company_id` int(11) NOT NULL,
      `sub_id` int(11) NOT NULL,
      `code` varchar(20) NOT NULL,
      `name` varchar(255) NOT NULL,
      `description` text,
      `brand_name` varchar(255),
      `rack_no` varchar(100),
      `purchase_price` decimal(20,2) DEFAULT 0,
      `selling_price` decimal(20,2) DEFAULT 0,
      `unit` varchar(100),
      `qty_per_piece` decimal(20,2) DEFAULT 0,
      `sales_tax_rate` decimal(20,2) DEFAULT 0,
      `sales_tax_type` enum('Percent', 'Amount') DEFAULT 'Percent',
      `valuation_method` enum('Weighted Average', 'Manual') DEFAULT 'Weighted Average',
      `valuation_cost` decimal(20,2) DEFAULT 0,
      `order_qty` decimal(20,2) DEFAULT 0,
      `is_inactive` tinyint(1) DEFAULT 0,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      FOREIGN KEY (`sub_id`) REFERENCES `inv_sub`(`id`) ON DELETE CASCADE,
      UNIQUE KEY `inv_item_code_company` (`code`, `company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 4. Inventory Brands
    $pdo->exec("CREATE TABLE IF NOT EXISTS `inv_brands` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `company_id` int(11) NOT NULL,
      `name` varchar(255) NOT NULL,
      PRIMARY KEY (`id`),
      FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
      UNIQUE KEY `brand_company` (`name`, `company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    echo "Inventory tables created successfully.";
} catch (\PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
