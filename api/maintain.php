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
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
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
}
?>
