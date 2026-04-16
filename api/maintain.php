<?php
// SoftifyX Master Maintenance API - Final "Pure & Strict" Version
$host = 'localhost';
$db   = 'u245697138_naimat123';
$user = 'u245697138_naimat123';
$pass = 'Naimat@.123';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    header('Content-Type: application/json', true, 500);
    echo json_encode(['error' => 'DB Connection Failed: ' . $e->getMessage()]);
    exit;
}

function sendResponse($data, $status = 200) {
    header('Content-Type: application/json', true, $status);
    echo json_encode($data);
    exit;
}

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? 1;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        if ($action === 'get_coa_main') {
            $stmt = $pdo->prepare("SELECT * FROM coa_main WHERE company_id = ? ORDER BY code ASC");
            $stmt->execute([$company_id]);
            sendResponse($stmt->fetchAll());
        }
        if ($action === 'get_coa_sub') {
            $stmt = $pdo->prepare("SELECT * FROM coa_sub WHERE company_id = ? ORDER BY code ASC");
            $stmt->execute([$company_id]);
            sendResponse($stmt->fetchAll());
        }
        if ($action === 'get_coa_list') {
            $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE company_id = ? ORDER BY code ASC");
            $stmt->execute([$company_id]);
            sendResponse($stmt->fetchAll());
        }

        // --- STRICT VENDOR/CUSTOMER RETRIEVAL ---
        if ($action === 'get_vendors' || $action === 'get_customers') {
            $subCode = $_GET['sub_code'] ?? '';
            if (empty($subCode)) sendResponse([]); // Safety: Never return everything

            $prefix = $subCode . '%';
            $table = ($action === 'get_vendors') ? 'vendors' : 'customers';
            
            // STRICT QUERY: Must match the prefix exactly. No wide logic.
            $sql = "SELECT cl.*, t.* FROM coa_list cl 
                    LEFT JOIN $table t ON cl.id = t.coa_list_id 
                    WHERE cl.code LIKE ? AND cl.company_id = ? 
                    ORDER BY cl.code ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$prefix, $company_id]);
            sendResponse($stmt->fetchAll());
        }

        // Lookups
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

    } catch (Exception $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    try {
        if ($action === 'save_vendor') {
            $pdo->beginTransaction();
            $coaId = $data['id'] ?? null;
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

        if ($action === 'save_customer') {
            $pdo->beginTransaction();
            $coaId = $data['id'] ?? null;
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
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendResponse(['error' => $e->getMessage()], 500);
    }
}
?>
