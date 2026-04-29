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
        converted_to VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (company_id),
        INDEX (serial_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    try {
        $pdo->exec("ALTER TABLE purchase_orders ADD COLUMN converted_to VARCHAR(100) DEFAULT NULL AFTER is_cancelled");
    } catch(Exception $e) {}

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
} catch (Exception $e) {}

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
        $sn = $_GET['serial_no'] ?? null;
        if ($sn) {
            $stmt = $pdo->prepare("SELECT * FROM purchase_orders WHERE serial_no = ? AND company_id = ?");
            $stmt->execute([$sn, $company_id]);
            $po = $stmt->fetch();
            if ($po) {
                $stmtItems = $pdo->prepare("SELECT i.*, inv.code as item_code, inv.name as item_name 
                                           FROM purchase_order_items i 
                                           JOIN inv_items inv ON i.item_coa_id = inv.id 
                                           WHERE i.po_id = ?");
                $stmtItems->execute([$po['id']]);
                $po['items'] = $stmtItems->fetchAll();
                
                // Get Vendor Info
                $stmtVendor = $pdo->prepare("SELECT cl.code, cl.name, v.address, v.telephone, v.st_reg_no, v.ntn_cnic 
                                            FROM coa_list cl 
                                            LEFT JOIN vendors v ON cl.id = v.coa_list_id 
                                            WHERE cl.id = ?");
                $stmtVendor->execute([$po['vendor_coa_id']]);
                $po['vendor'] = $stmtVendor->fetch();
            }
            echo json_encode($po);
        }
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
                    total_further_tax=?, total_incl_tax=?, amount_words=?, terms_conditions=?, remarks=?, is_cancelled=?, converted_to=?
                    WHERE id=? AND company_id=?");
                $stmt->execute([
                    $data['po_date'], $data['delivery_date'], $data['payment_terms'], $data['job_ref'], $data['employee_ref_id'],
                    $data['vendor_coa_id'], $data['total_pieces'], $data['total_qty'], $data['total_excl_tax'], $data['total_tax_amount'],
                    $data['total_further_tax'], $data['total_incl_tax'], $data['amount_words'], $data['terms_conditions'], $data['remarks'], $data['is_cancelled'], $data['converted_to'],
                    $id, $company_id
                ]);
                
                // Clear old items
                $pdo->prepare("DELETE FROM purchase_order_items WHERE po_id=?")->execute([$id]);
            } else {
                // Insert
                $stmt = $pdo->prepare("INSERT INTO purchase_orders (
                    company_id, serial_no, po_date, delivery_date, payment_terms, job_ref, employee_ref_id,
                    vendor_coa_id, total_pieces, total_qty, total_excl_tax, total_tax_amount,
                    total_further_tax, total_incl_tax, amount_words, terms_conditions, remarks, is_cancelled, converted_to
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $company_id, $data['serial_no'], $data['po_date'], $data['delivery_date'], $data['payment_terms'], $data['job_ref'], $data['employee_ref_id'],
                    $data['vendor_coa_id'], $data['total_pieces'], $data['total_qty'], $data['total_excl_tax'], $data['total_tax_amount'],
                    $data['total_further_tax'], $data['total_incl_tax'], $data['amount_words'], $data['terms_conditions'], $data['remarks'], $data['is_cancelled'], $data['converted_to']
                ]);
                $id = $pdo->lastInsertId();
            }
            
            // Insert Items
            $stmtItem = $pdo->prepare("INSERT INTO purchase_order_items (
                po_id, item_coa_id, description, pieces, quantity, unit, rate, 
                value_excl_tax, tax_rate, tax_amount, further_tax_rate, further_tax_amount, value_incl_tax
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($data['items'] as $item) {
                if (!$item['item_coa_id']) continue;
                $stmtItem->execute([
                    $id, $item['item_coa_id'], $item['description'], $item['pieces'], $item['quantity'], $item['unit'], $item['rate'],
                    $item['value_excl_tax'], $item['tax_rate'], $item['tax_amount'], $item['further_tax_rate'], $item['further_tax_amount'], $item['value_incl_tax']
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
}
?>
