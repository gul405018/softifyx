<?php
require_once 'db_config.php';
// checkAuth(); // Optional: Enable for strict security

$action = $_GET['action'] ?? '';

// Robust ID Retrieval: Prefer GET parameter, then session, then default.
$company_id = $_GET['company_id'] ?? $_SESSION['company_id'] ?? 1;

// ONE-TIME MIGRATION: Ensure tables and columns exist
try {
    // 1. Check 'status' in 'companies'
    $stmt = $pdo->query("SHOW COLUMNS FROM companies LIKE 'status'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE companies ADD COLUMN status TINYINT(1) DEFAULT 1");
    }

    // 2. Create 'financial_years' table if missing
    $pdo->exec("CREATE TABLE IF NOT EXISTS financial_years (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        abbreviation VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch (Exception $e) { /* Tables/Columns likely exist */ }

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'get_companies') {
        $stmt = $pdo->prepare("SELECT * FROM companies ORDER BY (id = 1) DESC, name ASC");
        $stmt->execute();
        sendResponse($stmt->fetchAll());
    }
    
    if ($action === 'get_company') {
        $stmt = $pdo->prepare("SELECT * FROM companies WHERE id = ?");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetch());
    }
    
    if ($action === 'get_users') {
        $stmt = $pdo->prepare("SELECT id, username, email, role, status FROM users WHERE company_id = ?");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }
    
    if ($action === 'get_rights' && isset($_GET['user_id'])) {
        $stmt = $pdo->prepare("SELECT * FROM user_rights WHERE user_id = ?");
        $stmt->execute([$_GET['user_id']]);
        sendResponse($stmt->fetchAll());
    }
    
    if ($action === 'get_fy') {
        $stmt = $pdo->prepare("SELECT * FROM financial_years WHERE company_id = ?");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }
    
    if ($action === 'get_currency') {
        $stmt = $pdo->prepare("SELECT * FROM currencies WHERE company_id = ?");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetch());
    }
    
    if ($action === 'get_summary') {
        $stmt = $pdo->prepare("SELECT * FROM dashboard_summary WHERE company_id = ?");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetch());
    }
    
    if ($action === 'get_note') {
        $stmt = $pdo->prepare("SELECT note_text FROM business_notes WHERE company_id = ?");
        $stmt->execute([$company_id]);
        $row = $stmt->fetch();
        sendResponse(['note' => $row ? $row['note_text'] : '']);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $company_id = $data['company_id'] ?? $_GET['company_id'] ?? $_SESSION['company_id'] ?? 1;

    if ($action === 'save_company') {
        $id = $data['id'] ?? $_GET['id'] ?? $_GET['company_id'] ?? null;
        $status = isset($data['status']) ? (int)$data['status'] : 1;
        
        if (!empty($id)) {
            $stmt = $pdo->prepare("UPDATE companies SET name = ?, address = ?, phone = ?, fax = ?, email = ?, website = ?, gst = ?, ntn = ?, deals_in = ?, status = ? WHERE id = ?");
            $stmt->execute([
                $data['name'], $data['address'], $data['phone'], $data['fax'], 
                $data['email'], $data['website'], $data['gst'], $data['ntn'], 
                $data['deals_in'], $status, $id
            ]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO companies (name, address, phone, fax, email, website, gst, ntn, deals_in, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['name'], $data['address'], $data['phone'], $data['fax'], 
                $data['email'], $data['website'], $data['gst'], $data['ntn'], 
                $data['deals_in'], $status
            ]);
        }
        sendResponse(['status' => 'success']);
    }
    
    if ($action === 'save_user') {
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, role = ?, status = ? WHERE id = ?");
            $stmt->execute([$data['username'], $data['email'], $data['role'], $data['status'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO users (company_id, username, password, role, email) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$company_id, $data['username'], $data['password'], $data['role'], $data['email']]);
            $newUserId = $pdo->lastInsertId();
            
            // AUTO-INITIALIZE RIGHTS based on role
            // List of all modules (matching app.js explicitRights)
            $modules = [
                "My Company", "My Logo", "List Of Companies", "User Logins", "User Rights", "Passwords", "Financial Year", 
                "Clear Transactions", "Currency", "BackUp Utility", "Chart of Accounts", "Customers", "Vendors/Suppliers", 
                "Bank Accounts", "Accounts Opening Balances", "Chart Of Inventory", "Inventory Opening Balances", 
                "Inventory Brands", "Inventory Locations", "Item Price Settings", "Item Sales Tax Rates", "Item Pre-Order Levels", 
                "Item Cost Valuation Method", "Chart Of Services", "Voucher Posting Preferences", "Inventory Movement Settings", 
                "Customer Regions", "Business Sectors", "Employees", "Jobs", "Purchase Orders", "Purchases (Sales Tax)", 
                "Purchases (Non Tax)", "Purchases Return/Debit Notes", "Cash Payments", "Bank Payments", "Customer Follow-Up", 
                "Quotations", "Sale Orders", "Delivery Challans", "Sales Tax Invoices", "Sale Invoices (Non Tax)", 
                "Sale Return/Credit Notes", "Cash Receipts", "Bank Receipts", "Inward Gate Passes", "Outward Gate Passes", 
                "Material Issue Notes", "Production Notes", "Inventory Transfers", "Add Inventory Adjustments", 
                "Reduce Inventory Adjustments", "Send Ledger Summary", "Send Payment Reminder", "SMS Templates", 
                "Bulk Messages", "Journal Notes", "General Journal Voucher", "Journal Report", "Print Voucher", 
                "Product Serials Tracking", "Item Below Re-Order Level", "Purchase Order Tracking", "Sale Order Tracking", 
                "Purchase Summary", "Purchase Register", "Party Purchase Summary", "Payments Reports", 
                "Purchase Activity Report - Invoice Wise", "Purchase Activity Report - Party Wise", "Item Purchase Summary", 
                "Item Purchase Analysis", "Accounts Payable Aging", "Material Consumption Report", "Production Report", 
                "Sale Summary", "Sale Register", "Party Sale Summary", "Recovery/Receipts Reports", 
                "Sale Activity Report - Invoice Wise", "Sale Activity Report - Party Wise", "Item Sale Summary", 
                "Item Sale Analysis", "Services Analysis", "Accounts Receivable Aging", "View Inventory Ledgers", 
                "Print Inventory Ledgers", "Item-Wise Profit/Loss", "Inventory Balances", "Job Ledgers", "View Account Ledger", 
                "Print Account Ledger", "Cash & Bank Balances", "Customer Balances", "Vendor Balances", "Trial Balance", 
                "Income Statement", "Balance Sheet"
            ];
            
            $isAllowed = ($data['role'] === 'Admin') ? 1 : 0;
            $stmt = $pdo->prepare("INSERT INTO user_rights (user_id, module_name, is_allowed) VALUES (?, ?, ?)");
            foreach ($modules as $mod) {
                $stmt->execute([$newUserId, $mod, $isAllowed]);
            }
        }
        sendResponse(['status' => 'success']);
    }
    
    if ($action === 'save_rights') {
        $pdo->prepare("DELETE FROM user_rights WHERE user_id = ?")->execute([$data['user_id']]);
        $stmt = $pdo->prepare("INSERT INTO user_rights (user_id, module_name, is_allowed) VALUES (?, ?, ?)");
        foreach ($data['rights'] as $right) {
            $stmt->execute([$data['user_id'], $right['module'], $right['allowed']]);
        }
        sendResponse(['status' => 'success']);
    }

    if ($action === 'save_summary') {
        $stmt = $pdo->prepare("REPLACE INTO dashboard_summary (company_id, sales, cash_opening, cash_receipts, cash_payments, bank_balance, rec_opening, rec_sales, rec_receipts, pay_opening, pay_purchases, pay_payments, new_invoices, customer_receipts, overdue, new_purchases, vendor_payments, outstanding) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $company_id, $data['sales'], $data['cashOpening'], $data['cashReceipts'], $data['cashPayments'], 
            $data['bankBalance'], $data['recOpening'], $data['recSales'], $data['recReceipts'], 
            $data['payOpening'], $data['payPurchases'], $data['payPayments'], $data['newInvoices'], 
            $data['customerReceipts'], $data['overdue'], $data['newPurchases'], $data['vendorPayments'], 
            $data['outstanding']
        ]);
        sendResponse(['status' => 'success']);
    }
    
    if ($action === 'save_fy') {
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE financial_years SET start_date = ?, end_date = ?, abbreviation = ? WHERE id = ?");
            $stmt->execute([$data['start'], $data['end'], $data['abbr'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO financial_years (company_id, start_date, end_date, abbreviation) VALUES (?, ?, ?, ?)");
            $stmt->execute([$company_id, $data['start'], $data['end'], $data['abbr']]);
        }
        sendResponse(['status' => 'success']);
    }

    if ($action === 'delete_user') {
        $userId = $data['id'] ?? $_GET['id'] ?? null;
        if ($userId) {
            $pdo->prepare("DELETE FROM user_rights WHERE user_id = ?")->execute([$userId]);
            $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
            sendResponse(['status' => 'success']);
        } else {
            sendResponse(['error' => 'User ID missing'], 400);
        }
    }
    
    if ($action === 'save_currency') {
        $stmt = $pdo->prepare("REPLACE INTO currencies (company_id, name, symbol) VALUES (?, ?, ?)");
        $stmt->execute([$company_id, $data['name'], $data['symbol']]);
        sendResponse(['status' => 'success']);
    }
    
    if ($action === 'save_logo') {
        $stmt = $pdo->prepare("UPDATE companies SET logo_data = ? WHERE id = ?");
        $stmt->execute([$data['logo'], $company_id]);
        sendResponse(['status' => 'success']);
    }
    
    if ($action === 'save_note') {
        $stmt = $pdo->prepare("REPLACE INTO business_notes (company_id, note_text) VALUES (?, ?)");
        $stmt->execute([$company_id, $data['note']]);
        sendResponse(['status' => 'success']);
    }

    if ($action === 'delete_company' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM companies WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
}
?>
