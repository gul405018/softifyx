<?php
require_once 'db_config.php';
// checkAuth(); // Optional: Enable for strict security

$action = $_GET['action'] ?? '';

// Robust ID Retrieval: Prefer GET parameter, then session, then default.
$company_id = $_GET['company_id'] ?? $_SESSION['company_id'] ?? 1;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'get_companies') {
        $stmt = $pdo->prepare("SELECT * FROM companies ORDER BY name ASC");
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
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $company_id = $data['company_id'] ?? $_GET['company_id'] ?? $_SESSION['company_id'] ?? 1;

    if ($action === 'save_company') {
        if (!empty($data['id']) || !empty($_GET['company_id'])) {
            $id = $data['id'] ?? $_GET['company_id'];
            $stmt = $pdo->prepare("UPDATE companies SET name = ?, address = ?, phone = ?, fax = ?, email = ?, website = ?, gst = ?, ntn = ?, deals_in = ? WHERE id = ?");
            $stmt->execute([
                $data['name'], $data['address'], $data['phone'], $data['fax'], 
                $data['email'], $data['website'], $data['gst'], $data['ntn'], 
                $data['deals_in'], $id
            ]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO companies (name, address, phone, fax, email, website, gst, ntn, deals_in) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['name'], $data['address'], $data['phone'], $data['fax'], 
                $data['email'], $data['website'], $data['gst'], $data['ntn'], 
                $data['deals_in']
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

    if ($action === 'delete_user' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM user_rights WHERE user_id = ?")->execute([$_GET['id']]);
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
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
    if ($action === 'delete_company' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM companies WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
}
?>
