-- SoftifyX ERP - Final Unified Schema
-- Hostinger MySQL Compatibility

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- 1. Companies Table (Multi-Tenant Core)
CREATE TABLE IF NOT EXISTS `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `fax` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `gst_no` varchar(100) DEFAULT NULL,
  `ntn_no` varchar(100) DEFAULT NULL,
  `deals_in` text DEFAULT NULL,
  `logo_data` longtext DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` enum('Admin', 'Operator', 'Viewer') DEFAULT 'Operator',
  `status` enum('Active', 'Inactive') DEFAULT 'Active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default Admin User (Password: admin123)
-- INSERT IGNORE INTO `users` (`username`, `password`, `role`, `status`) VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Active');

-- 3. User Rights Table
CREATE TABLE IF NOT EXISTS `user_rights` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `right_name` varchar(100) NOT NULL,
  `is_allowed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Financial Years Table
CREATE TABLE IF NOT EXISTS `financial_years` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `abbreviation` varchar(20) NOT NULL, -- e.g., 2024-25
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_closed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Currencies Table
CREATE TABLE IF NOT EXISTS `currencies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `country_name` varchar(100) NOT NULL,
  `currency_name` varchar(100) NOT NULL,
  `symbol` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Chart of Accounts (Level 1: Main)
CREATE TABLE IF NOT EXISTS `coa_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `code` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `component` varchar(100) DEFAULT NULL, -- e.g., Current Assets, Income
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Chart of Accounts (Level 2: Sub)
CREATE TABLE IF NOT EXISTS `coa_sub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `main_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`main_id`) REFERENCES `coa_main`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Chart of Accounts (Level 3: Detailed List)
CREATE TABLE IF NOT EXISTS `coa_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `sub_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`sub_id`) REFERENCES `coa_sub`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Inventory Table
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `rate` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Vouchers (Transactional Data - To be cleared)
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `voucher_no` varchar(50) NOT NULL,
  `voucher_date` date NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
