<?php
require_once 'db.php';

$sql = "
-- 1. Inventory Main Categories
CREATE TABLE IF NOT EXISTS `inv_main_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `inv_main_code_company` (`code`, `company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Inventory Sub Categories
CREATE TABLE IF NOT EXISTS `inv_sub_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `main_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`main_id`) REFERENCES `inv_main_categories`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `inv_sub_code_company` (`code`, `company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Inventory Brands
CREATE TABLE IF NOT EXISTS `inv_brands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Inventory Items
CREATE TABLE IF NOT EXISTS `inv_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `sub_id` int(11) NOT NULL,
  `code` varchar(30) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `brand_id` int(11),
  `rack_no` varchar(100),
  `purchase_price` decimal(20,2) DEFAULT 0,
  `selling_price` decimal(20,2) DEFAULT 0,
  `unit` varchar(50) DEFAULT 'Pcs',
  `qty_per_piece` decimal(20,2) DEFAULT 1,
  `tax_rate` decimal(10,2) DEFAULT 0,
  `tax_type` enum('Percent', 'Amount') DEFAULT 'Percent',
  `valuation_method` enum('Weighted Average', 'Manual') DEFAULT 'Weighted Average',
  `valuation_cost` decimal(20,2) DEFAULT 0,
  `order_qty` decimal(20,2) DEFAULT 0,
  `is_inactive` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`sub_id`) REFERENCES `inv_sub_categories`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`brand_id`) REFERENCES `inv_brands`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `inv_item_code_company` (`code`, `company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

try {
    $pdo->exec($sql);
    echo "Inventory tables created successfully.";
} catch (PDOException $e) {
    echo "Error creating tables: " . $e->getMessage();
}
?>
