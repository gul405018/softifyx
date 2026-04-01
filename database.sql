-- ========================================================
-- SoftifyX ERP MySQL Database Schema
-- Optimized for Hostinger Deployment
-- ========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- 1. Companies Table (Administrator: My Company & List of Companies)
CREATE TABLE IF NOT EXISTS `companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL UNIQUE,
  `address` text,
  `phone` varchar(100),
  `fax` varchar(100),
  `email` varchar(255),
  `website` varchar(255),
  `gst` varchar(100),
  `ntn` varchar(100),
  `deals_in` varchar(255),
  `logo_data` LONGTEXT, -- Stores Base64 Logo (Administrator: My Logo)
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table (Administrator: User Logins)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) DEFAULT NULL, -- Link to company if needed
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin', 'Operator', 'Viewer') DEFAULT 'Operator',
  `email` varchar(255),
  `status` enum('Active', 'Inactive') DEFAULT 'Active',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. User Rights Table (Administrator: User Rights)
CREATE TABLE IF NOT EXISTS `user_rights` (
  `user_id` int(11) NOT NULL,
  `module_name` varchar(100) NOT NULL,
  `is_allowed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`user_id`, `module_name`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Financial Years Table (Administrator: Financial Year)
CREATE TABLE IF NOT EXISTS `financial_years` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `abbreviation` varchar(10) NOT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Currencies Table (Administrator: Currency)
CREATE TABLE IF NOT EXISTS `currencies` (
  `company_id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT 'Pakistani Rupee',
  `symbol` varchar(5) DEFAULT 'Rs.',
  `abbreviation` varchar(5) DEFAULT 'PKR',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  `id` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Chart of Accounts - Level 1 (Maintain: Chart of Accounts)
CREATE TABLE IF NOT EXISTS `coa_main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `code` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `component` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `main_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Chart of Accounts - Level 2 (Maintain: Chart of Accounts)
CREATE TABLE IF NOT EXISTS `coa_sub` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `main_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`main_id`) REFERENCES `coa_main`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `sub_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Chart of Accounts - Level 3 (Maintain: Chart of Accounts)
CREATE TABLE IF NOT EXISTS `coa_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `sub_id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`sub_id`) REFERENCES `coa_sub`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `list_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Dashboard Summary Table (For Real-time Sync of Home View)
CREATE TABLE IF NOT EXISTS `dashboard_summary` (
  `company_id` int(11) NOT NULL,
  `sales` decimal(20,2) DEFAULT 0,
  `cash_opening` decimal(20,2) DEFAULT 0,
  `cash_receipts` decimal(20,2) DEFAULT 0,
  `cash_payments` decimal(20,2) DEFAULT 0,
  `bank_balance` decimal(20,2) DEFAULT 0,
  `rec_opening` decimal(20,2) DEFAULT 0,
  `rec_sales` decimal(20,2) DEFAULT 0,
  `rec_receipts` decimal(20,2) DEFAULT 0,
  `pay_opening` decimal(20,2) DEFAULT 0,
  `pay_purchases` decimal(20,2) DEFAULT 0,
  `pay_payments` decimal(20,2) DEFAULT 0,
  `new_invoices` int(11) DEFAULT 0,
  `customer_receipts` decimal(20,2) DEFAULT 0,
  `overdue` decimal(20,2) DEFAULT 0,
  `new_purchases` int(11) DEFAULT 0,
  `vendor_payments` decimal(20,2) DEFAULT 0,
  `outstanding` decimal(20,2) DEFAULT 0,
  PRIMARY KEY (`id`),
  `id` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial Setup: Create Administrator User
-- IMPORTANT: Passwords will be handled by auth.php (plaintext for now to match current localStorage logic, but recommend hashing in future)
-- INSERT INTO `companies` (name) VALUES ('Softifyx Default');
-- INSERT INTO `users` (company_id, username, password, role) VALUES (1, 'Administrator', '123', 'Admin');

COMMIT;
