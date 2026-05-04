<?php
header('Content-Type: application/json');
require_once 'db_config.php';

// MIGRATION: Ensure Cash Payment tables exist
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS cash_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        serial_no INT NOT NULL,
        payment_date DATE,
        payment_type ENUM('Vendor', 'Petty') DEFAULT 'Vendor',
        job_id INT,
        employee_id INT,
        cash_account_coa_id INT,
        paid_to_coa_id INT,
        prepayment_advance DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        amount_in_words VARCHAR(255),
        remarks TEXT,
        is_cancelled TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (company_id),
        INDEX (serial_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS cash_payment_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id INT NOT NULL,
        invoice_no VARCHAR(100),
        invoice_date DATE,
        paid_amount DECIMAL(15,2) DEFAULT 0,
        wht_rate DECIMAL(15,2) DEFAULT 0,
        wht_amount DECIMAL(15,2) DEFAULT 0,
        gst_rate DECIMAL(15,2) DEFAULT 0,
        gst_amount DECIMAL(15,2) DEFAULT 0,
        advance_adjusted DECIMAL(15,2) DEFAULT 0,
        discount_received DECIMAL(15,2) DEFAULT 0,
        total_debited DECIMAL(15,2) DEFAULT 0,
        FOREIGN KEY (payment_id) REFERENCES cash_payments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

} catch (PDOException $e) {
    echo json_encode(['error' => 'Database Migration Failed: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? 1;

if ($action === 'get_next_serial') {
    $stmt = $pdo->prepare("SELECT MAX(serial_no) as max_sn FROM cash_payments WHERE company_id = ?");
    $stmt->execute([$company_id]);
    $row = $stmt->fetch();
    echo json_encode(['next_sn' => ($row['max_sn'] ?? 0) + 1]);
    exit;
}

if ($action === 'search_parties') {
    $q = $_GET['q'] ?? '';
    $q = "%$q%";
    $stmt = $pdo->prepare("
        SELECT cl.id, cl.code, cl.name 
        FROM coa_list cl
        INNER JOIN coa_sub cs ON cl.sub_id = cs.id
        INNER JOIN coa_main cm ON cs.main_id = cm.id
        WHERE cl.company_id = ? 
        AND (cl.name LIKE ? OR cl.code LIKE ?)
        AND (
            LOWER(cm.name) LIKE '%vendor%' OR LOWER(cm.name) LIKE '%supplier%' OR LOWER(cm.name) LIKE '%creditor%' OR LOWER(cm.name) LIKE '%payable%' OR
            LOWER(cm.name) LIKE '%customer%' OR LOWER(cm.name) LIKE '%debtor%' OR LOWER(cm.name) LIKE '%receivable%'
        )
        LIMIT 20
    ");
    $stmt->execute([$company_id, $q, $q]);
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'search_cash_accounts') {
    $q = $_GET['q'] ?? '';
    $q = "%$q%";
    $stmt = $pdo->prepare("
        SELECT cl.id, cl.code, cl.name 
        FROM coa_list cl
        INNER JOIN coa_sub cs ON cl.sub_id = cs.id
        INNER JOIN coa_main cm ON cs.main_id = cm.id
        WHERE cl.company_id = ? 
        AND (cl.name LIKE ? OR cl.code LIKE ?)
        AND (
            LOWER(cm.name) LIKE '%cash%' OR LOWER(cm.name) LIKE '%bank%' OR
            LOWER(cs.name) LIKE '%cash%' OR LOWER(cs.name) LIKE '%bank%'
        )
        LIMIT 20
    ");
    $stmt->execute([$company_id, $q, $q]);
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'save') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;

    try {
        $pdo->beginTransaction();

        if ($id) {
            $stmt = $pdo->prepare("UPDATE cash_payments SET payment_date=?, payment_type=?, job_id=?, employee_id=?, cash_account_coa_id=?, paid_to_coa_id=?, prepayment_advance=?, total_amount=?, amount_in_words=?, remarks=?, is_cancelled=? WHERE id=? AND company_id=?");
            $stmt->execute([
                $data['payment_date'], $data['payment_type'], $data['job_id'], $data['employee_id'],
                $data['cash_account_coa_id'], $data['paid_to_coa_id'], $data['prepayment_advance'],
                $data['total_amount'], $data['amount_in_words'], $data['remarks'], $data['is_cancelled'],
                $id, $company_id
            ]);
            $pdo->prepare("DELETE FROM cash_payment_items WHERE payment_id=?")->execute([$id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO cash_payments (company_id, serial_no, payment_date, payment_type, job_id, employee_id, cash_account_coa_id, paid_to_coa_id, prepayment_advance, total_amount, amount_in_words, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $company_id, $data['serial_no'], $data['payment_date'], $data['payment_type'],
                $data['job_id'], $data['employee_id'], $data['cash_account_coa_id'], $data['paid_to_coa_id'],
                $data['prepayment_advance'], $data['total_amount'], $data['amount_in_words'], $data['remarks']
            ]);
            $id = $pdo->lastInsertId();
        }

        if (!empty($data['items'])) {
            $stmt = $pdo->prepare("INSERT INTO cash_payment_items (payment_id, invoice_no, invoice_date, paid_amount, wht_rate, wht_amount, gst_rate, gst_amount, advance_adjusted, discount_received, total_debited) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['items'] as $item) {
                $stmt->execute([
                    $id, $item['invoice_no'], $item['invoice_date'], $item['paid_amount'],
                    $item['wht_rate'], $item['wht_amount'], $item['gst_rate'], $item['gst_amount'],
                    $item['advance_adjusted'], $item['discount_received'], $item['total_debited']
                ]);
            }
        }

        $pdo->commit();
        echo json_encode(['status' => 'success', 'id' => $id]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'get') {
    $id = $_GET['id'] ?? null;
    $sn = $_GET['serial_no'] ?? null;
    
    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM cash_payments WHERE id = ? AND company_id = ?");
        $stmt->execute([$id, $company_id]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM cash_payments WHERE serial_no = ? AND company_id = ?");
        $stmt->execute([$sn, $company_id]);
    }
    
    $payment = $stmt->fetch();
    if ($payment) {
        $stmt = $pdo->prepare("SELECT * FROM cash_payment_items WHERE payment_id = ?");
        $stmt->execute([$payment['id']]);
        $payment['items'] = $stmt->fetchAll();
        
        // Fetch account names
        $stmt = $pdo->prepare("SELECT code, name FROM coa_list WHERE id = ?");
        $stmt->execute([$payment['cash_account_coa_id']]);
        $payment['cash_account'] = $stmt->fetch();
        
        $stmt->execute([$payment['paid_to_coa_id']]);
        $payment['paid_to'] = $stmt->fetch();
        
        echo json_encode($payment);
    } else {
        echo json_encode(null);
    }
    exit;
}

if ($action === 'delete') {
    $id = $_GET['id'] ?? null;
    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM cash_payments WHERE id = ? AND company_id = ?");
        $stmt->execute([$id, $company_id]);
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
    }
    exit;
}
