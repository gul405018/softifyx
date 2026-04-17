<?php
header('Content-Type: application/json');
require_once 'config.php'; // Assuming config.php contains $pdo

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? 1;

function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // 1. Get Main Categories
    if ($action === 'get_main_categories') {
        $stmt = $pdo->prepare("SELECT * FROM inv_main WHERE company_id = ? ORDER BY code ASC");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }

    // 2. Get Sub Categories
    if ($action === 'get_sub_categories') {
        $main_id = $_GET['main_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT * FROM inv_sub WHERE company_id = ? AND main_id = ? ORDER BY code ASC");
        $stmt->execute([$company_id, $main_id]);
        sendResponse($stmt->fetchAll());
    }

    // 3. Get Items
    if ($action === 'get_items') {
        $sub_id = $_GET['sub_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT * FROM inv_items WHERE company_id = ? AND sub_id = ? ORDER BY code ASC");
        $stmt->execute([$company_id, $sub_id]);
        sendResponse($stmt->fetchAll());
    }

    // 4. Get Brands
    if ($action === 'get_brands') {
        $stmt = $pdo->prepare("SELECT * FROM inv_brands WHERE company_id = ? ORDER BY name ASC");
        $stmt->execute([$company_id]);
        sendResponse($stmt->fetchAll());
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Save Main Category
    if ($action === 'save_main_category') {
        if (isset($data['id']) && $data['id'] > 0) {
            $stmt = $pdo->prepare("UPDATE inv_main SET name = ?, code = ? WHERE id = ? AND company_id = ?");
            $stmt->execute([$data['name'], $data['code'], $data['id'], $company_id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO inv_main (company_id, code, name) VALUES (?, ?, ?)");
            $stmt->execute([$company_id, $data['code'], $data['name']]);
        }
        sendResponse(['status' => 'success']);
    }

    // Save Sub Category
    if ($action === 'save_sub_category') {
        if (isset($data['id']) && $data['id'] > 0) {
            $stmt = $pdo->prepare("UPDATE inv_sub SET name = ?, code = ? WHERE id = ? AND company_id = ?");
            $stmt->execute([$data['name'], $data['code'], $data['id'], $company_id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO inv_sub (company_id, main_id, code, name) VALUES (?, ?, ?, ?)");
            $stmt->execute([$company_id, $data['main_id'], $data['code'], $data['name']]);
        }
        sendResponse(['status' => 'success']);
    }

    // Save Item
    if ($action === 'save_item') {
        $fields = [
            'name', 'code', 'description', 'brand_name', 'rack_no',
            'purchase_price', 'selling_price', 'unit', 'qty_per_piece',
            'sales_tax_rate', 'sales_tax_type', 'valuation_method',
            'valuation_cost', 'order_qty', 'is_inactive'
        ];
        
        if (isset($data['id']) && $data['id'] > 0) {
            $sql = "UPDATE inv_items SET " . implode(' = ?, ', $fields) . " = ? WHERE id = ? AND company_id = ?";
            $params = [];
            foreach ($fields as $f) $params[] = $data[$f] ?? null;
            $params[] = $data['id'];
            $params[] = $company_id;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        } else {
            $sql = "INSERT INTO inv_items (company_id, sub_id, " . implode(', ', $fields) . ") VALUES (?, ?, " . implode(', ', array_fill(0, count($fields), '?')) . ")";
            $params = [$company_id, $data['sub_id']];
            foreach ($fields as $f) $params[] = $data[$f] ?? null;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }
        sendResponse(['status' => 'success']);
    }

    // Delete Main
    if ($action === 'delete_main_category') {
        // Check for children
        $chk = $pdo->prepare("SELECT count(*) as count FROM inv_sub WHERE main_id = ?");
        $chk->execute([$data['id']]);
        if ($chk->fetch()['count'] > 0) {
            sendResponse(['error' => 'Cannot delete. Category contains sub-categories.'], 400);
        }
        $stmt = $pdo->prepare("DELETE FROM inv_main WHERE id = ? AND company_id = ?");
        $stmt->execute([$data['id'], $company_id]);
        sendResponse(['status' => 'success']);
    }

    // Delete Sub
    if ($action === 'delete_sub_category') {
        // Check for children
        $chk = $pdo->prepare("SELECT count(*) as count FROM inv_items WHERE sub_id = ?");
        $chk->execute([$data['id']]);
        if ($chk->fetch()['count'] > 0) {
            sendResponse(['error' => 'Cannot delete. Sub-category contains items.'], 400);
        }
        $stmt = $pdo->prepare("DELETE FROM inv_sub WHERE id = ? AND company_id = ?");
        $stmt->execute([$data['id'], $company_id]);
        sendResponse(['status' => 'success']);
    }

    // Delete Item
    if ($action === 'delete_item') {
        // In future: Check if used in transactions
        $stmt = $pdo->prepare("DELETE FROM inv_items WHERE id = ? AND company_id = ?");
        $stmt->execute([$data['id'], $company_id]);
        sendResponse(['status' => 'success']);
    }

    // Save Brand
    if ($action === 'save_brand') {
        $stmt = $pdo->prepare("INSERT INTO inv_brands (company_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)");
        $stmt->execute([$company_id, $data['name']]);
        sendResponse(['status' => 'success']);
    }
}
?>
