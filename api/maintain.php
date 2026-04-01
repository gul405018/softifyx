<?php
require_once 'db_config.php';

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? $_SESSION['company_id'] ?? 1;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'get_coa_main') {
        $stmt = $pdo->prepare("SELECT * FROM coa_main ORDER BY code ASC");
        $stmt->execute();
        sendResponse($stmt->fetchAll());
    }
    
    if ($action === 'get_coa_sub' && isset($_GET['main_id'])) {
        $stmt = $pdo->prepare("SELECT * FROM coa_sub WHERE main_id = ? ORDER BY code ASC");
        $stmt->execute([$_GET['main_id']]);
        sendResponse($stmt->fetchAll());
    }
    
    if ($action === 'get_coa_list' && isset($_GET['sub_id'])) {
        $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE sub_id = ? ORDER BY code ASC");
        $stmt->execute([$_GET['sub_id']]);
        sendResponse($stmt->fetchAll());
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'save_coa_main') {
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE coa_main SET code = ?, name = ?, component = ? WHERE id = ?");
            $stmt->execute([$data['code'], $data['name'], $data['component'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO coa_main (code, name, component) VALUES (?, ?, ?)");
            $stmt->execute([$data['code'], $data['name'], $data['component']]);
        }
        sendResponse(['status' => 'success']);
    }
    
    if ($action === 'save_coa_sub') {
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE coa_sub SET code = ?, name = ? WHERE id = ?");
            $stmt->execute([$data['code'], $data['name'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO coa_sub (main_id, code, name) VALUES (?, ?, ?)");
            $stmt->execute([$data['main_id'], $data['code'], $data['name']]);
        }
        sendResponse(['status' => 'success']);
    }

    if ($action === 'save_coa_list') {
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("UPDATE coa_list SET code = ?, name = ? WHERE id = ?");
            $stmt->execute([$data['code'], $data['name'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO coa_list (sub_id, code, name) VALUES (?, ?, ?)");
            $stmt->execute([$data['sub_id'], $data['code'], $data['name']]);
        }
        sendResponse(['status' => 'success']);
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
