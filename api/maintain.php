<?php
require_once 'db_config.php';

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? $_SESSION['company_id'] ?? 1;

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
        $subId = (int)$_GET['sub_id'];
        $stmt = $pdo->prepare("
            SELECT cl.*, c.contact_person, c.address, c.telephone, c.mobile, c.fax, c.email, c.website, 
                   c.st_reg_no, c.ntn_cnic, c.credit_limit, c.credit_terms, c.remarks,
                   r.name as region_name, sr.name as sub_region_name, s.name as sector_name, u.username as manager_name
            FROM coa_list cl
            LEFT JOIN customers c ON cl.id = c.coa_list_id
            LEFT JOIN regions r ON c.region_id = r.id
            LEFT JOIN sub_regions sr ON c.sub_region_id = sr.id
            LEFT JOIN business_sectors s ON c.business_sector_id = s.id
            LEFT JOIN users u ON c.acc_manager_id = u.id
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

    if ($action === 'get_vendors' && isset($_GET['sub_id'])) {
        $subId = (int)$_GET['sub_id'];
        $stmt = $pdo->prepare("
            SELECT cl.*, v.contact_person, v.address, v.telephone, v.mobile, v.fax, v.email, v.website, 
                   v.st_reg_no, v.ntn_cnic, v.credit_terms, v.remarks
            FROM coa_list cl
            LEFT JOIN vendors v ON cl.id = v.coa_list_id
            WHERE cl.sub_id = ? AND cl.company_id = ?
            ORDER BY cl.code ASC
        ");
        $stmt->execute([$subId, $company_id]);
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
            if (!$coaId && isset($data['code'])) {
                // Smart Sync: Check if this code already exists in coa_list
                $stmt = $pdo->prepare("SELECT id FROM coa_list WHERE company_id = ? AND code = ?");
                $stmt->execute([$company_id, $data['code']]);
                $existing = $stmt->fetch();
                if ($existing) $coaId = $existing['id'];
            }

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
            if (!$coaId && isset($data['code'])) {
                // Smart Sync: Check if this code already exists in coa_list
                $stmt = $pdo->prepare("SELECT id FROM coa_list WHERE company_id = ? AND code = ?");
                $stmt->execute([$company_id, $data['code']]);
                $existing = $stmt->fetch();
                if ($existing) $coaId = $existing['id'];
            }

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
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'delete_coa_main' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM coa_main WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
    if ($action === 'delete_coa_sub' && isset($_GET['id'])) {
        // Safety Guard: Check if empty
        $stmt = $pdo->prepare("SELECT id FROM coa_list WHERE sub_id = ? LIMIT 1");
        $stmt->execute([$_GET['id']]);
        if ($stmt->fetch()) {
            sendResponse(['status' => 'error', 'message' => 'Cannot delete: This category still contains account records.'], 400);
        }
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

    if ($action === 'delete_vendor' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM coa_list WHERE id = ? AND company_id = ?")->execute([$_GET['id'], $company_id]);
        sendResponse(['status' => 'success']);
    }
}
?>
