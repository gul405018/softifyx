<?php
header('Content-Type: application/json');
require_once 'db_config.php';

// MIGRATION: Ensure Purchase Order tables exist
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        serial_no INT NOT NULL,
        po_date DATE,
        delivery_date DATE,
        payment_terms TEXT,
        job_ref VARCHAR(255),
        employee_ref_id INT,
        vendor_coa_id INT,
        total_pieces DECIMAL(15,2) DEFAULT 0,
        total_qty DECIMAL(15,2) DEFAULT 0,
        total_excl_tax DECIMAL(15,2) DEFAULT 0,
        total_tax_amount DECIMAL(15,2) DEFAULT 0,
        total_further_tax DECIMAL(15,2) DEFAULT 0,
        total_incl_tax DECIMAL(15,2) DEFAULT 0,
        amount_words TEXT,
        terms_conditions TEXT,
        remarks TEXT,
        is_cancelled TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (company_id),
        INDEX (serial_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_id INT NOT NULL,
        item_coa_id INT NOT NULL,
        description TEXT,
        pieces DECIMAL(15,2) DEFAULT 0,
        quantity DECIMAL(15,2) DEFAULT 0,
        unit VARCHAR(50),
        rate DECIMAL(15,2) DEFAULT 0,
        value_excl_tax DECIMAL(15,2) DEFAULT 0,
        tax_rate DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        further_tax_rate DECIMAL(15,2) DEFAULT 0,
        further_tax_amount DECIMAL(15,2) DEFAULT 0,
        value_incl_tax DECIMAL(15,2) DEFAULT 0,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS purchase_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        serial_no INT NOT NULL,
        is_tax_invoice TINYINT(1) DEFAULT 0,
        invoice_date DATE,
        invoice_type VARCHAR(50),
        vendor_invoice_no VARCHAR(100),
        vendor_invoice_date DATE,
        purchase_order_no VARCHAR(100),
        purchase_order_date DATE,
        payment_terms VARCHAR(255),
        expense_account VARCHAR(50),
        vendor_coa_id INT NOT NULL,
        inventory_location_id INT,
        job_no VARCHAR(100),
        employee_ref VARCHAR(100),
        amount_in_words VARCHAR(255),
        remarks TEXT,
        carriage_freight DECIMAL(15,2) DEFAULT 0,
        additional_discount DECIMAL(15,2) DEFAULT 0,
        net_total DECIMAL(15,2) DEFAULT 0,
        amount_paid DECIMAL(15,2) DEFAULT 0,
        is_cancelled TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (company_id),
        INDEX (serial_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS purchase_invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        item_coa_id INT NOT NULL,
        description TEXT,
        pieces DECIMAL(15,2) DEFAULT 0,
        quantity DECIMAL(15,2) DEFAULT 0,
        unit VARCHAR(50),
        rate DECIMAL(15,2) DEFAULT 0,
        gross_amount DECIMAL(15,2) DEFAULT 0,
        discount_percent DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        sales_tax_rate DECIMAL(15,2) DEFAULT 0,
        sales_tax_amount DECIMAL(15,2) DEFAULT 0,
        further_tax_rate DECIMAL(15,2) DEFAULT 0,
        further_tax_amount DECIMAL(15,2) DEFAULT 0,
        net_amount DECIMAL(15,2) DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {
}

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? 1;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'get_next_serial') {
        $stmt = $pdo->prepare("SELECT MAX(serial_no) as max_sn FROM purchase_orders WHERE company_id = ?");
        $stmt->execute([$company_id]);
        $row = $stmt->fetch();
        echo json_encode(['next_sn' => ($row['max_sn'] ?? 0) + 1]);
    }

    if ($action === 'get_po') {
        $sn = $_GET['serial_no'] ?? 0;
        $stmt = $pdo->prepare("SELECT * FROM purchase_orders WHERE serial_no=? AND company_id=?");
        $stmt->execute([$sn, $company_id]);
        $po = $stmt->fetch();
        if ($po) {
            $stmt = $pdo->prepare("SELECT poi.*, inv.item_code as code, inv.item_name as name 
                                   FROM purchase_order_items poi 
                                   JOIN inv_items inv ON poi.item_coa_id = inv.id 
                                   WHERE poi.po_id=?");
            $stmt->execute([$po['id']]);
            $po['items'] = $stmt->fetchAll();

            $stmt = $pdo->prepare("SELECT * FROM vendors WHERE coa_list_id=?");
            $stmt->execute([$po['vendor_coa_id']]);
            $po['vendor'] = $stmt->fetch();

            if (!$po['vendor']) {
                $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE id=?");
                $stmt->execute([$po['vendor_coa_id']]);
                $coa = $stmt->fetch();
                if ($coa) {
                    $po['vendor'] = ['code' => $coa['account_code'], 'name' => $coa['account_name']];
                }
            }
        }
        echo json_encode($po);
    }

    if ($action === 'get_next_invoice_serial') {
        $stmt = $pdo->prepare("SELECT MAX(serial_no) as max_sn FROM purchase_invoices WHERE company_id = ?");
        $stmt->execute([$company_id]);
        $row = $stmt->fetch();
        echo json_encode(['next_sn' => ($row['max_sn'] ?? 0) + 1]);
    }

    if ($action === 'get_invoice') {
        $sn = $_GET['serial_no'] ?? 0;
        $stmt = $pdo->prepare("SELECT * FROM purchase_invoices WHERE serial_no=? AND company_id=?");
        $stmt->execute([$sn, $company_id]);
        $inv = $stmt->fetch();
        if ($inv) {
            $stmt = $pdo->prepare("SELECT pii.*, itm.code as code, itm.name as name 
                                   FROM purchase_invoice_items pii 
                                   JOIN inv_items itm ON pii.item_coa_id = itm.id 
                                   WHERE pii.invoice_id=?");
            $stmt->execute([$inv['id']]);
            $inv['items'] = $stmt->fetchAll();

            $stmt = $pdo->prepare("SELECT * FROM vendors WHERE coa_list_id=?");
            $stmt->execute([$inv['vendor_coa_id']]);
            $inv['vendor'] = $stmt->fetch();

            if (!$inv['vendor']) {
                $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE id=?");
                $stmt->execute([$inv['vendor_coa_id']]);
                $coa = $stmt->fetch();
                if ($coa) {
                    $inv['vendor'] = ['code' => $coa['account_code'], 'name' => $coa['account_name']];
                }
            }
        }
        echo json_encode($inv ?: []);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'save_po') {
        try {
            $pdo->beginTransaction();
            $id = $data['id'] ?? null;

            if ($id) {
                // Update
                $stmt = $pdo->prepare("UPDATE purchase_orders SET 
                    po_date=?, delivery_date=?, payment_terms=?, job_ref=?, employee_ref_id=?, 
                    vendor_coa_id=?, total_pieces=?, total_qty=?, total_excl_tax=?, total_tax_amount=?, 
                    total_further_tax=?, total_incl_tax=?, amount_words=?, terms_conditions=?, remarks=?, is_cancelled=?
                    WHERE id=? AND company_id=?");
                $stmt->execute([
                    $data['po_date'],
                    $data['delivery_date'],
                    $data['payment_terms'],
                    $data['job_ref'],
                    $data['employee_ref_id'],
                    $data['vendor_coa_id'],
                    $data['total_pieces'],
                    $data['total_qty'],
                    $data['total_excl_tax'],
                    $data['total_tax_amount'],
                    $data['total_further_tax'],
                    $data['total_incl_tax'],
                    $data['amount_words'],
                    $data['terms_conditions'],
                    $data['remarks'],
                    $data['is_cancelled'],
                    $id,
                    $company_id
                ]);

                // Clear old items
                $pdo->prepare("DELETE FROM purchase_order_items WHERE po_id=?")->execute([$id]);
            } else {
                // Insert
                $stmt = $pdo->prepare("INSERT INTO purchase_orders (
                    company_id, serial_no, po_date, delivery_date, payment_terms, job_ref, employee_ref_id,
                    vendor_coa_id, total_pieces, total_qty, total_excl_tax, total_tax_amount,
                    total_further_tax, total_incl_tax, amount_words, terms_conditions, remarks, is_cancelled
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $company_id,
                    $data['serial_no'],
                    $data['po_date'],
                    $data['delivery_date'],
                    $data['payment_terms'],
                    $data['job_ref'],
                    $data['employee_ref_id'],
                    $data['vendor_coa_id'],
                    $data['total_pieces'],
                    $data['total_qty'],
                    $data['total_excl_tax'],
                    $data['total_tax_amount'],
                    $data['total_further_tax'],
                    $data['total_incl_tax'],
                    $data['amount_words'],
                    $data['terms_conditions'],
                    $data['remarks'],
                    $data['is_cancelled']
                ]);
                $id = $pdo->lastInsertId();
            }

            // Insert Items
            $stmtItem = $pdo->prepare("INSERT INTO purchase_order_items (
                po_id, item_coa_id, description, pieces, quantity, unit, rate, 
                value_excl_tax, tax_rate, tax_amount, further_tax_rate, further_tax_amount, value_incl_tax
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            foreach ($data['items'] as $item) {
                if (!$item['item_coa_id'])
                    continue;
                $stmtItem->execute([
                    $id,
                    $item['item_coa_id'],
                    $item['description'],
                    $item['pieces'],
                    $item['quantity'],
                    $item['unit'],
                    $item['rate'],
                    $item['value_excl_tax'],
                    $item['tax_rate'],
                    $item['tax_amount'],
                    $item['further_tax_rate'],
                    $item['further_tax_amount'],
                    $item['value_incl_tax']
                ]);
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'id' => $id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    if ($action === 'delete_po') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM purchase_orders WHERE id=? AND company_id=?");
            $stmt->execute([$id, $company_id]);
            echo json_encode(['status' => 'success']);
        }
    }

    if ($action === 'delete_invoice') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM purchase_invoices WHERE id=? AND company_id=?");
            $stmt->execute([$id, $company_id]);
            echo json_encode(['status' => 'success']);
        }
    }

    if ($action === 'save_invoice') {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;

        $fields = [
            'company_id' => $company_id,
            'serial_no' => $data['serial_no'],
            'is_tax_invoice' => $data['is_tax_invoice'] ? 1 : 0,
            'invoice_date' => $data['invoice_date'] ?: null,
            'invoice_type' => $data['invoice_type'],
            'vendor_invoice_no' => $data['vendor_invoice_no'],
            'vendor_invoice_date' => $data['vendor_invoice_date'] ?: null,
            'purchase_order_no' => $data['purchase_order_no'],
            'purchase_order_date' => $data['purchase_order_date'] ?: null,
            'payment_terms' => $data['payment_terms'],
            'expense_account' => $data['expense_account'],
            'vendor_coa_id' => $data['vendor_coa_id'],
            'inventory_location_id' => $data['inventory_location_id'] ?: null,
            'job_no' => $data['job_no'],
            'employee_ref' => $data['employee_ref'],
            'amount_in_words' => $data['amount_in_words'],
            'remarks' => $data['remarks'],
            'carriage_freight' => $data['carriage_freight'] ?: 0,
            'additional_discount' => $data['additional_discount'] ?: 0,
            'net_total' => $data['net_total'] ?: 0,
            'amount_paid' => $data['amount_paid'] ?: 0
        ];

        if ($id) {
            $setClause = implode(', ', array_map(function ($k) {
                return "$k = ?"; }, array_keys($fields)));
            $stmt = $pdo->prepare("UPDATE purchase_invoices SET $setClause WHERE id=? AND company_id=?");
            $values = array_values($fields);
            $values[] = $id;
            $values[] = $company_id;
            $stmt->execute($values);
            $pdo->prepare("DELETE FROM purchase_invoice_items WHERE invoice_id=?")->execute([$id]);
        } else {
            $cols = implode(', ', array_keys($fields));
            $placeholders = implode(', ', array_fill(0, count($fields), '?'));
            $stmt = $pdo->prepare("INSERT INTO purchase_invoices ($cols) VALUES ($placeholders)");
            $stmt->execute(array_values($fields));
            $id = $pdo->lastInsertId();
        }

        if (!empty($data['items'])) {
            $stmt = $pdo->prepare("INSERT INTO purchase_invoice_items (invoice_id, item_coa_id, description, pieces, quantity, unit, rate, gross_amount, discount_percent, discount_amount, sales_tax_rate, sales_tax_amount, further_tax_rate, further_tax_amount, net_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['items'] as $item) {
                $stmt->execute([
                    $id,
                    $item['item_coa_id'],
                    $item['description'],
                    $item['pieces'] ?: 0,
                    $item['quantity'] ?: 0,
                    $item['unit'],
                    $item['rate'] ?: 0,
                    $item['gross_amount'] ?: 0,
                    $item['discount_percent'] ?: 0,
                    $item['discount_amount'] ?: 0,
                    $item['sales_tax_rate'] ?: 0,
                    $item['sales_tax_amount'] ?: 0,
                    $item['further_tax_rate'] ?: 0,
                    $item['further_tax_amount'] ?: 0,
                    $item['net_amount'] ?: 0
                ]);
            }
        }
        echo json_encode(['status' => 'success', 'id' => $id]);
    }
}
?>