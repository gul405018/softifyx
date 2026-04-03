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

    if ($action === 'get_regions') {
        $stmt = $pdo->prepare("SELECT * FROM regions WHERE company_id = ? ORDER BY name ASC");
        $stmt->execute([$company_id]);
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

    if ($action === 'get_customer_details' && isset($_GET['coa_id'])) {
        $stmt = $pdo->prepare("SELECT * FROM customers_ext WHERE coa_list_id = ? AND company_id = ?");
        $stmt->execute([$_GET['coa_id'], $company_id]);
        sendResponse($stmt->fetch() ?: (object)[]);
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
            $newId = $data['id'];
        } else {
            $stmt = $pdo->prepare("INSERT INTO coa_list (company_id, sub_id, code, name) VALUES (?, ?, ?, ?)");
            $stmt->execute([$company_id, $data['sub_id'], $data['code'], $data['name']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => $status, 'id' => $newId]);
    }

    if ($action === 'save_region') {
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE regions SET name = ?, type = ?, parent_id = ? WHERE id = ?");
            $stmt->execute([$data['name'], $data['type'], $data['parent_id'], $data['id']]);
            $newId = $data['id'];
        } else {
            $stmt = $pdo->prepare("INSERT INTO regions (company_id, name, type, parent_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([$company_id, $data['name'], $data['type'], $data['parent_id']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => 'success', 'id' => $newId]);
    }

    if ($action === 'save_sector') {
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE business_sectors SET name = ? WHERE id = ?");
            $stmt->execute([$data['name'], $data['id']]);
            $newId = $data['id'];
        } else {
            $stmt = $pdo->prepare("INSERT INTO business_sectors (company_id, name) VALUES (?, ?)");
            $stmt->execute([$company_id, $data['name']]);
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => 'success', 'id' => $newId]);
    }

    if ($action === 'save_employee') {
        $fields = ['name', 'father_name', 'address', 'telephone', 'email', 'nic', 'dob', 'joining_date', 'salary', 'designation', 'department', 'remarks', 'reference', 'job_left', 'leaving_date'];
        $vals = array_map(fn($f) => $data[$f] ?? null, $fields);
        if (isset($data['id'])) {
            $setStr = implode(' = ?, ', $fields) . ' = ?';
            $stmt = $pdo->prepare("UPDATE employees SET $setStr WHERE id = ?");
            $stmt->execute(array_merge($vals, [$data['id']]));
            $newId = $data['id'];
        } else {
            $cols = implode(', ', $fields);
            $placeholders = implode(', ', array_fill(0, count($fields), '?'));
            $stmt = $pdo->prepare("INSERT INTO employees (company_id, $cols) VALUES (?, $placeholders)");
            $stmt->execute(array_merge([$company_id], $vals));
            $newId = $pdo->lastInsertId();
        }
        sendResponse(['status' => 'success', 'id' => $newId]);
    }

    if ($action === 'save_customer_full') {
        $pdo->beginTransaction();
        try {
            // 1. Sync coa_list
            $coaId = $data['coa_id'] ?? null;
            if ($coaId) {
                $stmt = $pdo->prepare("UPDATE coa_list SET code = ?, name = ? WHERE id = ?");
                $stmt->execute([$data['code'], $data['name'], $coaId]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO coa_list (company_id, sub_id, code, name) VALUES (?, ?, ?, ?)");
                $stmt->execute([$company_id, $data['sub_id'], $data['code'], $data['name']]);
                $coaId = $pdo->lastInsertId();
            }

            // 2. Sync customers_ext
            $extFields = ['contact_person', 'address', 'region_id', 'sub_region_id', 'telephone', 'mobile', 'fax', 'email', 'website', 'st_reg', 'ntn_cnic', 'sector_id', 'manager_id', 'credit_limit', 'credit_terms', 'remarks'];
            $extVals = array_map(fn($f) => $data[$f] ?? null, $extFields);
            
            $stmt = $pdo->prepare("SELECT coa_list_id FROM customers_ext WHERE coa_list_id = ?");
            $stmt->execute([$coaId]);
            if ($stmt->fetch()) {
                $setStr = implode(' = ?, ', $extFields) . ' = ?';
                $stmt = $pdo->prepare("UPDATE customers_ext SET $setStr WHERE coa_list_id = ?");
                $stmt->execute(array_merge($extVals, [$coaId]));
            } else {
                $cols = implode(', ', $extFields);
                $placeholders = implode(', ', array_fill(0, count($extFields), '?'));
                $stmt = $pdo->prepare("INSERT INTO customers_ext (company_id, coa_list_id, $cols) VALUES (?, ?, $placeholders)");
                $stmt->execute(array_merge([$company_id, $coaId], $extVals));
            }

            $pdo->commit();
            sendResponse(['status' => 'success', 'coa_id' => $coaId]);
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

    if ($action === 'delete_sector' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM business_sectors WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }

    if ($action === 'delete_employee' && isset($_GET['id'])) {
        $pdo->prepare("DELETE FROM employees WHERE id = ?")->execute([$_GET['id']]);
        sendResponse(['status' => 'success']);
    }
}
?>
