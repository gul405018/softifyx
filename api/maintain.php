<?php
require_once 'db_config.php';

// Global Error Catching to prevent 500 errors
set_exception_handler(function($e) {
    header('Content-Type: application/json', true, 500);
    echo json_encode(['status' => 'error', 'message' => 'System Fatal Error: ' . $e->getMessage()]);
    exit;
});

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? $_SESSION['company_id'] ?? 1;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        if ($action === 'get_coa_main') {
            $stmt = $pdo->prepare("SELECT * FROM coa_main WHERE company_id = :id ORDER BY code ASC");
            $stmt->execute(['id' => $company_id]);
            sendResponse($stmt->fetchAll());
        }
        
        if ($action === 'get_coa_sub' && isset($_GET['main_id'])) {
            if ($_GET['main_id'] === 'ALL') {
                $stmt = $pdo->prepare("SELECT * FROM coa_sub WHERE company_id = :id ORDER BY code ASC");
                $stmt->execute(['id' => $company_id]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM coa_sub WHERE main_id = :mid AND company_id = :cid ORDER BY code ASC");
                $stmt->execute(['mid' => $_GET['main_id'], 'cid' => $company_id]);
            }
            sendResponse($stmt->fetchAll());
        }
        
        if ($action === 'get_coa_list' && isset($_GET['sub_id'])) {
            if ($_GET['sub_id'] === 'ALL') {
                $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE company_id = :cid ORDER BY code ASC");
                $stmt->execute(['cid' => $company_id]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE sub_id = :sid AND company_id = :cid ORDER BY code ASC");
                $stmt->execute(['sid' => $_GET['sub_id'], 'cid' => $company_id]);
            }
            sendResponse($stmt->fetchAll());
        }

        if (($action === 'get_customers' || $action === 'get_vendors') && (isset($_GET['sub_id']) || isset($_GET['main_id']))) {
            $subId = isset($_GET['sub_id']) && $_GET['sub_id'] !== 'undefined' ? (int)$_GET['sub_id'] : null;
            $mainId = isset($_GET['main_id']) && $_GET['main_id'] !== 'undefined' ? (int)$_GET['main_id'] : null;
            $subCode = $_GET['sub_code'] ?? null;
            $prefix = $subCode ? $subCode . '%' : null;

            if ($action === 'get_customers') {
                $sql = "SELECT cl.*, c.contact_person, c.address, c.telephone, c.mobile, c.fax, c.email, c.website, 
                               c.st_reg_no, c.ntn_cnic, c.credit_limit, c.credit_terms, c.remarks,
                               r.name as region_name, sr.name as sub_region_name, s.name as sector_name, u.username as manager_name
                        FROM coa_list cl
                        LEFT JOIN customers c ON cl.id = c.coa_list_id
                        LEFT JOIN regions r ON c.region_id = r.id
                        LEFT JOIN sub_regions sr ON c.sub_region_id = sr.id
                        LEFT JOIN business_sectors s ON c.business_sector_id = s.id
                        LEFT JOIN users u ON c.acc_manager_id = u.id 
                        WHERE ((:subId IS NOT NULL AND cl.sub_id = :subId) OR (:prefix IS NOT NULL AND cl.code LIKE :prefix))
                        AND cl.company_id = :cid
                        ORDER BY cl.code ASC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['subId' => $subId, 'prefix' => $prefix, 'cid' => $company_id]);
            } else {
                $sql = "SELECT cl.*, v.contact_person, v.address, v.telephone, v.mobile, v.fax, v.email, v.website, 
                               v.st_reg_no, v.ntn_cnic, v.credit_terms, v.remarks
                        FROM coa_list cl
                        LEFT JOIN vendors v ON cl.id = v.coa_list_id
                        WHERE ((:subId IS NOT NULL AND cl.sub_id = :subId) OR (:prefix IS NOT NULL AND cl.code LIKE :prefix))
                        AND cl.company_id = :cid
                        ORDER BY cl.code ASC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['subId' => $subId, 'prefix' => $prefix, 'cid' => $company_id]);
            }
            sendResponse($stmt->fetchAll());
        }

        // Generic lookups
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

    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    try {
        if ($action === 'save_coa_main') {
            if (isset($data['id'])) {
                $stmt = $pdo->prepare("UPDATE coa_main SET code = ?, name = ?, component = ? WHERE id = ?");
                $stmt->execute([$data['code'], $data['name'], $data['component'], $data['id']]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO coa_main (company_id, code, name, component) VALUES (?, ?, ?, ?)");
                $stmt->execute([$company_id, $data['code'], $data['name'], $data['component']]);
            }
            sendResponse(['status' => 'success']);
        }

        if ($action === 'save_coa_sub') {
            if (isset($data['id'])) {
                $stmt = $pdo->prepare("UPDATE coa_sub SET code = ?, name = ? WHERE id = ?");
                $stmt->execute([$data['code'], $data['name'], $data['id']]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO coa_sub (company_id, main_id, code, name) VALUES (?, ?, ?, ?)");
                $stmt->execute([$company_id, $data['main_id'], $data['code'], $data['name']]);
            }
            sendResponse(['status' => 'success']);
        }

        if ($action === 'save_coa_list') {
            if (isset($data['id'])) {
                $stmt = $pdo->prepare("UPDATE coa_list SET code = ?, name = ? WHERE id = ?");
                $stmt->execute([$data['code'], $data['name'], $data['id']]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO coa_list (company_id, sub_id, code, name) VALUES (?, ?, ?, ?)");
                $stmt->execute([$company_id, $data['sub_id'], $data['code'], $data['name']]);
            }
            sendResponse(['status' => 'success']);
        }

        if ($action === 'save_customer') {
            $pdo->beginTransaction();
            $coaId = $data['id'] ?? null;
            if (!$coaId && isset($data['code'])) {
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

            $stmt = $pdo->prepare("SELECT id FROM customers WHERE coa_list_id = ?");
            $stmt->execute([$coaId]);
            if ($stmt->fetch()) {
                $sql = "UPDATE customers SET contact_person=?, address=?, region_id=?, sub_region_id=?, telephone=?, mobile=?, fax=?, email=?, website=?, st_reg_no=?, ntn_cnic=?, business_sector_id=?, acc_manager_id=?, credit_limit=?, credit_terms=?, remarks=? WHERE coa_list_id=?";
                $pdo->prepare($sql)->execute([$data['contact_person'], $data['address'], $data['region_id'], $data['sub_region_id'], $data['telephone'], $data['mobile'], $data['fax'], $data['email'], $data['website'], $data['st_reg_no'], $data['ntn_cnic'], $data['business_sector_id'], $data['acc_manager_id'], $data['credit_limit'], $data['credit_terms'], $data['remarks'], $coaId]);
            } else {
                $sql = "INSERT INTO customers (company_id, coa_list_id, contact_person, address, region_id, sub_region_id, telephone, mobile, fax, email, website, st_reg_no, ntn_cnic, business_sector_id, acc_manager_id, credit_limit, credit_terms, remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                $pdo->prepare($sql)->execute([$company_id, $coaId, $data['contact_person'], $data['address'], $data['region_id'], $data['sub_region_id'], $data['telephone'], $data['mobile'], $data['fax'], $data['email'], $data['website'], $data['st_reg_no'], $data['ntn_cnic'], $data['business_sector_id'], $data['acc_manager_id'], $data['credit_limit'], $data['credit_terms'], $data['remarks']]);
            }
            $pdo->commit();
            sendResponse(['status' => 'success', 'id' => $coaId]);
        }

        if ($action === 'save_vendor') {
            $pdo->beginTransaction();
            $coaId = $data['id'] ?? null;
            if (!$coaId && isset($data['code'])) {
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

            $stmt = $pdo->prepare("SELECT id FROM vendors WHERE coa_list_id = ?");
            $stmt->execute([$coaId]);
            if ($stmt->fetch()) {
                $sql = "UPDATE vendors SET contact_person=?, address=?, telephone=?, mobile=?, fax=?, email=?, website=?, st_reg_no=?, ntn_cnic=?, credit_terms=?, remarks=? WHERE coa_list_id=?";
                $pdo->prepare($sql)->execute([$data['contact_person'], $data['address'], $data['telephone'], $data['mobile'], $data['fax'], $data['email'], $data['website'], $data['st_reg_no'], $data['ntn_cnic'], $data['credit_terms'], $data['remarks'], $coaId]);
            } else {
                $sql = "INSERT INTO vendors (company_id, coa_list_id, contact_person, address, telephone, mobile, fax, email, website, st_reg_no, ntn_cnic, credit_terms, remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
                $pdo->prepare($sql)->execute([$company_id, $coaId, $data['contact_person'], $data['address'], $data['telephone'], $data['mobile'], $data['fax'], $data['email'], $data['website'], $data['st_reg_no'], $data['ntn_cnic'], $data['credit_terms'], $data['remarks']]);
            }
            $pdo->commit();
            sendResponse(['status' => 'success', 'id' => $coaId]);
        }

        if ($action === 'save_region') {
            if (isset($data['id'])) { $pdo->prepare("UPDATE regions SET name=? WHERE id=?")->execute([$data['name'], $data['id']]); }
            else { $pdo->prepare("INSERT INTO regions (company_id, name) VALUES (?,?)")->execute([$company_id, $data['name']]); }
            sendResponse(['status' => 'success']);
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || (isset($_GET['method']) && $_GET['method'] === 'DELETE')) {
    try {
        if ($action === 'delete_coa_list' && isset($_GET['id'])) {
            $pdo->prepare("DELETE FROM coa_list WHERE id = ?")->execute([$_GET['id']]);
            sendResponse(['status' => 'success']);
        }
        if ($action === 'delete_vendor' && isset($_GET['id'])) {
            $pdo->prepare("DELETE FROM coa_list WHERE id = ? AND company_id = ?")->execute([$_GET['id'], $company_id]);
            sendResponse(['status' => 'success']);
        }
    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>
