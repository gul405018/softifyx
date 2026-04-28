<?php
require_once 'db_config.php';

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? $_SESSION['company_id'] ?? 1;

// MIGRATION: Ensure coa_opening_balances table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS coa_opening_balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        coa_id INT NOT NULL,
        fy_id INT NOT NULL,
        debit DECIMAL(15,2) DEFAULT 0.00,
        credit DECIMAL(15,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_opening (company_id, coa_id, fy_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'get_coa_main') {
        $stmt = $pdo->prepare("SELECT * FROM coa_main WHERE company_id = ? ORDER BY code ASC");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }
    
    if ($action === 'get_coa_sub' && isset($_GET['main_id'])) {
        $mainId = $_GET['main_id'];
        if ($mainId === 'ALL') {
            $stmt = $pdo->prepare("SELECT * FROM coa_sub WHERE company_id = ? ORDER BY code ASC");
            $stmt->execute([$company_id]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM coa_sub WHERE main_id = ? AND company_id = ? ORDER BY code ASC");
            $stmt->execute([$mainId, $company_id]);
        }
        sendResponse($stmt->fetchAll());
    }
    
    if ($action === 'get_coa_list' && isset($_GET['sub_id'])) {
        $subId = $_GET['sub_id'];
        if ($subId === 'ALL') {
            $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE company_id = ? ORDER BY code ASC");
            $stmt->execute([$company_id]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE sub_id = ? AND company_id = ? ORDER BY code ASC");
            $stmt->execute([$subId, $company_id]);
        }
        sendResponse($stmt->fetchAll());
    }

    // --- Customers & Lookups ---
    if ($action === 'get_customers' && isset($_GET['sub_id'])) {
        $subId = $_GET['sub_id'];
        $stmt = $pdo->prepare("
            SELECT cl.*, c.contact_person, c.address, c.region_id, c.sub_region_id, 
                   c.telephone, c.mobile, c.fax, c.email, c.website, 
                   c.st_reg_no, c.ntn_cnic, c.business_sector_id, c.acc_manager_id, 
                   c.credit_limit, c.credit_terms, c.remarks
            FROM coa_list cl
            LEFT JOIN customers c ON cl.id = c.coa_list_id
            WHERE cl.sub_id = ? AND cl.company_id = ?
            ORDER BY cl.code ASC
        ");
        $stmt->execute([$subId, $company_id]);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_regions') {
        $stmt = $pdo->prepare("SELECT * FROM regions WHERE company_id = ? ORDER BY name ASC");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_sub_regions' && isset($_GET['region_id'])) {
        $stmt = $pdo->prepare("SELECT * FROM sub_regions WHERE region_id = ? ORDER BY name ASC");
        $stmt->execute([$_GET['region_id']]);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_sectors') {
        $stmt = $pdo->prepare("SELECT * FROM business_sectors WHERE company_id = ? ORDER BY name ASC");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_employees') {
        $stmt = $pdo->prepare("SELECT * FROM employees WHERE company_id = ? ORDER BY name ASC");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_departments') {
        $stmt = $pdo->prepare("SELECT * FROM departments WHERE company_id = ? ORDER BY name ASC");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_vendors') {
        $subId = $_GET['sub_id'] ?? null;
        $sql = "
            SELECT cl.*, v.contact_person, v.address, v.telephone, v.mobile, v.fax, v.email, v.website, 
                   v.st_reg_no, v.ntn_cnic, v.credit_terms, v.remarks
            FROM coa_list cl
            LEFT JOIN vendors v ON cl.id = v.coa_list_id
            WHERE cl.company_id = ?
        ";
        $params = [$company_id];
        if ($subId) {
            $sql .= " AND cl.sub_id = ?";
            $params[] = $subId;
        } else {
            $sql .= " AND cl.sub_id IN (
                SELECT id FROM coa_sub WHERE main_id IN (
                    SELECT id FROM coa_main WHERE 
                        LOWER(name) LIKE '%vendor%' OR 
                        LOWER(name) LIKE '%supplier%' OR 
                        LOWER(name) LIKE '%creditor%' OR 
                        LOWER(name) LIKE '%payable%'
                )
            )";
        }
        $sql .= " ORDER BY cl.code ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_banks' && isset($_GET['sub_id'])) {
        $subId = $_GET['sub_id'];
        $stmt = $pdo->prepare("
            SELECT cl.*, b.bank_name, b.branch, b.account_title, b.account_no, 
                   b.contact_person, b.address, b.telephone, b.mobile, b.fax, 
                   b.email, b.website, b.remarks
            FROM coa_list cl
            LEFT JOIN bank_accounts b ON cl.id = b.coa_list_id
            WHERE cl.sub_id = ? AND cl.company_id = ?
            ORDER BY cl.code ASC
        ");
        $stmt->execute([$subId, $company_id]);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_coa_opening_balances' && isset($_GET['fy_id'])) {
        $fyId = $_GET['fy_id'];
        $stmt = $pdo->prepare("
            SELECT cl.id, cl.code, cl.name, 
                   COALESCE(ob.debit, 0) as debit, 
                   COALESCE(ob.credit, 0) as credit
            FROM coa_list cl
            LEFT JOIN coa_opening_balances ob ON cl.id = ob.coa_id AND ob.fy_id = ?
            WHERE cl.company_id = ?
            ORDER BY cl.code ASC
        ");
        $stmt->execute([$fyId, $company_id]);
        sendResponse($stmt->fetchAll());
    }

    if ($action === 'get_coa_balance' && isset($_GET['coa_id'])) {
        $coaId = $_GET['coa_id'];
        $fyId = $_GET['fy_id'] ?? 0;
        
        $stmt = $pdo->prepare("
            SELECT (SUM(debit) - SUM(credit)) as balance 
            FROM (
                SELECT debit, credit FROM coa_opening_balances WHERE coa_id = ? AND fy_id = ?
                UNION ALL
                SELECT debit, credit FROM voucher_details WHERE coa_id = ?
            ) as t
        ");
        $stmt->execute([$coaId, $fyId, $coaId]);
        sendResponse($stmt->fetch());
    }

    if ($action === 'get_fys') {
        $stmt = $pdo->prepare("SELECT id, abbreviation FROM financial_years WHERE company_id = ? ORDER BY start_date DESC");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'save_coa_main') {
        $status = 'success';
        $newId = null;
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE coa_main SET code = ?, name = ?, component = ? WHERE id = ?");
            $stmt->execute([$data['code'], $data['name'], $data['component'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO coa_main (company_id, code, name, component) VALUES (?, ?, ?, ?)");
            $stmt->execute([$company_id, $data['code'], $data['name'], $data['component']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => $status, 'id' => $newId]);
    }

    if ($action === 'save_coa_sub') {
        $status = 'success';
        $newId = null;
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE coa_sub SET code = ?, name = ? WHERE id = ?");
            $stmt->execute([$data['code'], $data['name'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO coa_sub (company_id, main_id, code, name) VALUES (?, ?, ?, ?)");
            $stmt->execute([$company_id, $data['main_id'], $data['code'], $data['name']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => $status, 'id' => $newId]);
    }

    if ($action === 'save_coa_list') {
        $status = 'success';
        $newId = null;
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE coa_list SET code = ?, name = ? WHERE id = ?");
            $stmt->execute([$data['code'], $data['name'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO coa_list (company_id, sub_id, code, name) VALUES (?, ?, ?, ?)");
            $stmt->execute([$company_id, $data['sub_id'], $data['code'], $data['name']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => $status, 'id' => $newId]);
    }

    if ($action === 'save_customer') {
        $pdo->beginTransaction();
        try {
            $coaId = $data['id'] ?? null;
            if ($coaId) {
                $stmt = $pdo->prepare("UPDATE coa_list SET code = ?, name = ? WHERE id = ?");
                $stmt->execute([$data['code'], $data['name'], $coaId]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO coa_list (company_id, sub_id, code, name) VALUES (?, ?, ?, ?)");
                $stmt->execute([$company_id, $data['sub_id'], $data['code'], $data['name']]);
                $coaId = $pdo->lastInsertId();
            }

            // Check if customer entry exists
            $stmt = $pdo->prepare("SELECT id FROM customers WHERE coa_list_id = ?");
            $stmt->execute([$coaId]);
            $custExists = $stmt->fetch();

            if ($custExists) {
                $sql = "UPDATE customers SET 
                        contact_person = ?, address = ?, region_id = ?, sub_region_id = ?, 
                        telephone = ?, mobile = ?, fax = ?, email = ?, website = ?, 
                        st_reg_no = ?, ntn_cnic = ?, business_sector_id = ?, acc_manager_id = ?, 
                        credit_limit = ?, credit_terms = ?, remarks = ?
                        WHERE coa_list_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['contact_person'], $data['address'], $data['region_id'], $data['sub_region_id'],
                    $data['telephone'], $data['mobile'], $data['fax'], $data['email'], $data['website'],
                    $data['st_reg_no'], $data['ntn_cnic'], $data['business_sector_id'], $data['acc_manager_id'],
                    $data['credit_limit'], $data['credit_terms'], $data['remarks'], $coaId
                ]);
            } else {
                $sql = "INSERT INTO customers (
                        company_id, coa_list_id, contact_person, address, region_id, sub_region_id, 
                        telephone, mobile, fax, email, website, 
                        st_reg_no, ntn_cnic, business_sector_id, acc_manager_id, 
                        credit_limit, credit_terms, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $company_id, $coaId, $data['contact_person'], $data['address'], $data['region_id'], $data['sub_region_id'],
                    $data['telephone'], $data['mobile'], $data['fax'], $data['email'], $data['website'],
                    $data['st_reg_no'], $data['ntn_cnic'], $data['business_sector_id'], $data['acc_manager_id'],
                    $data['credit_limit'], $data['credit_terms'], $data['remarks']
                ]);
            }
            $pdo->commit();
            sendResponse(['status' => 'success', 'id' => $coaId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // --- Lookup Saves ---
    if ($action === 'save_region') {
        $newId = $data['id'] ?? null;
        if ($newId) {
            $pdo->prepare("UPDATE regions SET name = ? WHERE id = ?")->execute([$data['name'], $newId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO regions (company_id, name) VALUES (?, ?)");
            $stmt->execute([$company_id, $data['name']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => 'success', 'id' => $newId]);
    }

    if ($action === 'save_sub_region') {
        $newId = $data['id'] ?? null;
        if ($newId) {
            $pdo->prepare("UPDATE sub_regions SET name = ? WHERE id = ?")->execute([$data['name'], $newId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO sub_regions (region_id, name) VALUES (?, ?)");
            $stmt->execute([$data['region_id'], $data['name']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => 'success', 'id' => $newId]);
    }

    if ($action === 'save_sector') {
        $newId = $data['id'] ?? null;
        if ($newId) {
            $pdo->prepare("UPDATE business_sectors SET name = ? WHERE id = ?")->execute([$data['name'], $newId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO business_sectors (company_id, name) VALUES (?, ?)");
            $stmt->execute([$company_id, $data['name']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => 'success', 'id' => $newId]);
    }

    if ($action === 'save_employee') {
        $status = 'success';
        $newId = null;
        if (isset($data['id'])) {
            $sql = "UPDATE employees SET 
                    name = ?, father_name = ?, address = ?, telephone = ?, email = ?, nic_no = ?,
                    dob = ?, joining_date = ?, salary = ?, designation = ?, department_id = ?,
                    remarks = ?, reference = ?, job_left = ?, leaving_date = ?
                    WHERE id = ? AND company_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['name'], $data['father_name'], $data['address'], $data['telephone'], $data['email'], $data['nic_no'],
                $data['dob'], $data['joining_date'], $data['salary'], $data['designation'], $data['department_id'],
                $data['remarks'], $data['reference'], $data['job_left'], $data['leaving_date'],
                $data['id'], $company_id
            ]);
            $newId = $data['id'];
        } else {
            $sql = "INSERT INTO employees (
                    company_id, name, father_name, address, telephone, email, nic_no, 
                    dob, joining_date, salary, designation, department_id, 
                    remarks, reference, job_left, leaving_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $company_id, $data['name'], $data['father_name'], $data['address'], $data['telephone'], $data['email'], $data['nic_no'],
                $data['dob'], $data['joining_date'], $data['salary'], $data['designation'], $data['department_id'],
                $data['remarks'], $data['reference'], $data['job_left'], $data['leaving_date']
            ]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => $status, 'id' => $newId]);
    }
    if ($action === 'save_vendor') {
        $pdo->beginTransaction();
        try {
            $coaId = $data['id'] ?? null;
            if ($coaId) {
                $stmt = $pdo->prepare("UPDATE coa_list SET code = ?, name = ? WHERE id = ?");
                $stmt->execute([$data['code'], $data['name'], $coaId]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO coa_list (company_id, sub_id, code, name) VALUES (?, ?, ?, ?)");
                $stmt->execute([$company_id, $data['sub_id'], $data['code'], $data['name']]);
                $coaId = $pdo->lastInsertId();
            }

            // Check if vendor entry exists
            $stmt = $pdo->prepare("SELECT id FROM vendors WHERE coa_list_id = ?");
            $stmt->execute([$coaId]);
            $vendExists = $stmt->fetch();

            if ($vendExists) {
                $sql = "UPDATE vendors SET 
                        contact_person = ?, address = ?, telephone = ?, mobile = ?, fax = ?, 
                        email = ?, website = ?, st_reg_no = ?, ntn_cnic = ?, 
                        credit_terms = ?, remarks = ?
                        WHERE coa_list_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['contact_person'], $data['address'], $data['telephone'], $data['mobile'], $data['fax'],
                    $data['email'], $data['website'], $data['st_reg_no'], $data['ntn_cnic'],
                    $data['credit_terms'], $data['remarks'], $coaId
                ]);
            } else {
                $sql = "INSERT INTO vendors (
                        company_id, coa_list_id, contact_person, address, telephone, mobile, 
                        fax, email, website, st_reg_no, ntn_cnic, credit_terms, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $company_id, $coaId, $data['contact_person'], $data['address'], $data['telephone'], $data['mobile'],
                    $data['fax'], $data['email'], $data['website'], $data['st_reg_no'], $data['ntn_cnic'],
                    $data['credit_terms'], $data['remarks']
                ]);
            }
            $pdo->commit();
            sendResponse(['status' => 'success', 'id' => $coaId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    if ($action === 'save_bank') {
        $pdo->beginTransaction();
        try {
            $coaId = $data['id'] ?? null;
            if ($coaId) {
                $stmt = $pdo->prepare("UPDATE coa_list SET code = ?, name = ? WHERE id = ?");
                $stmt->execute([$data['code'], $data['name'], $coaId]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO coa_list (company_id, sub_id, code, name) VALUES (?, ?, ?, ?)");
                $stmt->execute([$company_id, $data['sub_id'], $data['code'], $data['name']]);
                $coaId = $pdo->lastInsertId();
            }

            // Check if bank entry exists
            $stmt = $pdo->prepare("SELECT id FROM bank_accounts WHERE coa_list_id = ?");
            $stmt->execute([$coaId]);
            $bankExists = $stmt->fetch();

            if ($bankExists) {
                $sql = "UPDATE bank_accounts SET 
                        bank_name = ?, branch = ?, account_title = ?, account_no = ?, 
                        contact_person = ?, address = ?, telephone = ?, mobile = ?, fax = ?, 
                        email = ?, website = ?, remarks = ?
                        WHERE coa_list_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $data['bank_name'], $data['branch'], $data['account_title'], $data['account_no'],
                    $data['contact_person'], $data['address'], $data['telephone'], $data['mobile'], $data['fax'],
                    $data['email'], $data['website'], $data['remarks'], $coaId
                ]);
            } else {
                $sql = "INSERT INTO bank_accounts (
                        company_id, coa_list_id, bank_name, branch, account_title, account_no, 
                        contact_person, address, telephone, mobile, fax, email, website, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $company_id, $coaId, $data['bank_name'], $data['branch'], $data['account_title'], $data['account_no'],
                    $data['contact_person'], $data['address'], $data['telephone'], $data['mobile'], $data['fax'],
                    $data['email'], $data['website'], $data['remarks']
                ]);
            }
            $pdo->commit();
            sendResponse(['status' => 'success', 'id' => $coaId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendResponse(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'delete_coa_main' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM coa_main WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
    if ($action === 'delete_coa_sub' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM coa_sub WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
    if ($action === 'delete_coa_list' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM coa_list WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
    if ($action === 'delete_region' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM regions WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
    if ($action === 'delete_sub_region' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM sub_regions WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
    if ($action === 'delete_sector' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM business_sectors WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }

    if ($action === 'delete_employee' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM employees WHERE id = ? AND company_id = ?")->execute([$_GET['id'], $company_id]);
        sendResponse(['status' => 'success']);
    }

    if ($action === 'save_coa_opening_balances') {
        if (!isset($data['fy_id']) || !isset($data['balances'])) {
            sendResponse(['error' => 'Missing data'], 400);
        }
        $fyId = $data['fy_id'];
        $stmt = $pdo->prepare("INSERT INTO coa_opening_balances (company_id, coa_id, fy_id, debit, credit) 
                               VALUES (?, ?, ?, ?, ?) 
                               ON DUPLICATE KEY UPDATE debit = VALUES(debit), credit = VALUES(credit)");
        foreach ($data['balances'] as $row) {
            $stmt->execute([$company_id, $row['coa_id'], $fyId, $row['debit'], $row['credit']]);
        }
        sendResponse(['status' => 'success']);
    }

    if ($action === 'import_coa_opening_balances' && isset($data['fy_id'])) {
        $currentFyId = $data['fy_id'];
        $prevFyId = $data['from_fy_id'] ?? null;
        
        if (!$prevFyId) {
            // Fallback to auto-detecting previous FY if not provided
            $stmt = $pdo->prepare("SELECT id FROM financial_years WHERE company_id = ? AND id < ? ORDER BY id DESC LIMIT 1");
            $stmt->execute([$company_id, $currentFyId]);
            $prevFy = $stmt->fetch();
            if ($prevFy) $prevFyId = $prevFy['id'];
        }
        
        if (!$prevFyId) {
            sendResponse(['error' => 'No financial year found to import from.'], 404);
        }
        
        // Import logic: Duplicate chosen year's opening balances
        $stmt = $pdo->prepare("
            INSERT INTO coa_opening_balances (company_id, coa_id, fy_id, debit, credit)
            SELECT company_id, coa_id, ?, debit, credit
            FROM coa_opening_balances
            WHERE fy_id = ? AND company_id = ?
            ON DUPLICATE KEY UPDATE debit = VALUES(debit), credit = VALUES(credit)
        ");
        $stmt->execute([$currentFyId, $prevFyId, $company_id]);
        sendResponse(['status' => 'success', 'imported_from' => $prevFyId]);
    }

    if ($action === 'delete_vendor' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM coa_list WHERE id = ? AND company_id = ?")->execute([$_GET['id'], $company_id]);
        sendResponse(['status' => 'success']);
    }
    if ($action === 'delete_bank' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM coa_list WHERE id = ? AND company_id = ?")->execute([$_GET['id'], $company_id]);
        sendResponse(['status' => 'success']);
    }
}
?>
