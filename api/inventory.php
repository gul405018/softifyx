<?php
header('Content-Type: application/json');
require_once 'db_config.php';

// MIGRATION: Ensure Inventory tables exist
try {
    // 1. Main Categories
    $pdo->exec("CREATE TABLE IF NOT EXISTS inv_main_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        code VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        UNIQUE KEY `inv_main_code_company` (`code`, `company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 2. Sub Categories
    $pdo->exec("CREATE TABLE IF NOT EXISTS inv_sub_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        main_id INT NOT NULL,
        code VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        FOREIGN KEY (main_id) REFERENCES inv_main_categories(id) ON DELETE CASCADE,
        UNIQUE KEY `inv_sub_code_company` (`code`, `company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 3. Brands
    $pdo->exec("CREATE TABLE IF NOT EXISTS inv_brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 4. Inventory Items
    $pdo->exec("CREATE TABLE IF NOT EXISTS inv_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        sub_id INT NOT NULL,
        code VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        brand_id INT,
        rack_no VARCHAR(100),
        purchase_price DECIMAL(20,2) DEFAULT 0,
        selling_price DECIMAL(20,2) DEFAULT 0,
        unit VARCHAR(50),
        qty_per_piece DECIMAL(20,2) DEFAULT 0,
        tax_rate DECIMAL(10,2) DEFAULT 0,
        tax_type VARCHAR(20) DEFAULT 'Percent',
        valuation_method VARCHAR(50) DEFAULT 'Weighted Average',
        valuation_cost DECIMAL(20,2) DEFAULT 0,
        order_qty DECIMAL(20,2) DEFAULT 0,
        is_inactive TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sub_id) REFERENCES inv_sub_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (brand_id) REFERENCES inv_brands(id) ON DELETE SET NULL,
        UNIQUE KEY `inv_item_code_company` (`code`, `company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 5. Inventory Locations
    $pdo->exec("CREATE TABLE IF NOT EXISTS inv_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_default TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Seed default location if empty for company
    $checkLoc = $pdo->prepare("SELECT id FROM inv_locations LIMIT 1");
    $checkLoc->execute();
    if (!$checkLoc->fetch()) {
        $pdo->exec("INSERT INTO inv_locations (company_id, name, is_default) VALUES (1, 'Main Store', 1)");
    }

    // 6. Inventory Opening Balances
    $pdo->exec("CREATE TABLE IF NOT EXISTS inv_opening_balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        item_id INT NOT NULL,
        fy_id INT NOT NULL,
        location_id INT NOT NULL,
        pieces DECIMAL(20,2) DEFAULT 0,
        quantity DECIMAL(20,2) DEFAULT 0,
        rate DECIMAL(20,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES inv_items(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES inv_locations(id) ON DELETE CASCADE,
        UNIQUE KEY `inv_ob_unique` (company_id, item_id, fy_id, location_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

} catch (Exception $e) {
    // Silently continue if tables exist or other minor issues, 
    // real errors will be caught in the action block or PDO setup.
}

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? $_POST['company_id'] ?? $_SESSION['company_id'] ?? 1;

try {
    switch ($action) {
        case 'get_inventory_tree':
            // Fetch all categories and subcategories
            $mains = $pdo->prepare("SELECT * FROM inv_main_categories WHERE company_id = ? ORDER BY code");
            $mains->execute([$company_id]);
            $main_list = $mains->fetchAll(PDO::FETCH_ASSOC);

            $subs = $pdo->prepare("SELECT * FROM inv_sub_categories WHERE company_id = ? ORDER BY code");
            $subs->execute([$company_id]);
            $sub_list = $subs->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['mains' => $main_list, 'subs' => $sub_list]);
            break;

        case 'get_items':
            $sub_id = $_GET['sub_id'] ?? 0;
            $active_only = isset($_GET['active_only']) && $_GET['active_only'] == 1;
            
            $query = "SELECT i.*, b.name as brand_name 
                      FROM inv_items i 
                      LEFT JOIN inv_brands b ON i.brand_id = b.id
                      WHERE i.sub_id = :sub_id AND i.company_id = :company_id";
            
            if ($active_only) {
                $query .= " AND i.is_inactive = 0";
            }
            
            $query .= " ORDER BY i.code";
            
            $stmt = $pdo->prepare($query);
            $stmt->execute(['sub_id' => $sub_id, 'company_id' => $company_id]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_main':
            $data = json_decode(file_get_contents('php://input'), true);
            if (isset($data['id'])) {
                $stmt = $pdo->prepare("UPDATE inv_main_categories SET name = ?, code = ? WHERE id = ? AND company_id = ?");
                $stmt->execute([$data['name'], $data['code'], $data['id'], $company_id]);
                echo json_encode(['status' => 'success', 'id' => $data['id']]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO inv_main_categories (company_id, code, name) VALUES (?, ?, ?)");
                $stmt->execute([$company_id, $data['code'], $data['name']]);
                echo json_encode(['status' => 'success', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'save_sub':
            $data = json_decode(file_get_contents('php://input'), true);
            if (isset($data['id'])) {
                $stmt = $pdo->prepare("UPDATE inv_sub_categories SET name = ?, code = ?, main_id = ? WHERE id = ? AND company_id = ?");
                $stmt->execute([$data['name'], $data['code'], $data['main_id'], $data['id'], $company_id]);
                echo json_encode(['status' => 'success', 'id' => $data['id']]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO inv_sub_categories (company_id, main_id, code, name) VALUES (?, ?, ?, ?)");
                $stmt->execute([$company_id, $data['main_id'], $data['code'], $data['name']]);
                echo json_encode(['status' => 'success', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'save_item':
            $data = json_decode(file_get_contents('php://input'), true);
            $fields = [
                'company_id', 'sub_id', 'code', 'name', 'description', 'brand_id', 'rack_no',
                'purchase_price', 'selling_price', 'unit', 'qty_per_piece', 'tax_rate',
                'tax_type', 'valuation_method', 'valuation_cost', 'order_qty', 'is_inactive'
            ];
            
            if (isset($data['id'])) {
                $setPart = implode(', ', array_map(fn($f) => "$f = :$f", array_slice($fields, 1)));
                $stmt = $pdo->prepare("UPDATE inv_items SET $setPart WHERE id = :id AND company_id = :company_id");
                $data['company_id'] = $company_id;
                $stmt->execute($data);
                echo json_encode(['status' => 'success', 'id' => $data['id']]);
            } else {
                $cols = implode(', ', $fields);
                $params = implode(', ', array_map(fn($f) => ":$f", $fields));
                $stmt = $pdo->prepare("INSERT INTO inv_items ($cols) VALUES ($params)");
                $data['company_id'] = $company_id;
                // Clean data for brand_id nulls
                if (empty($data['brand_id'])) $data['brand_id'] = null;
                $stmt->execute($data);
                echo json_encode(['status' => 'success', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'delete_main':
            $id = $_GET['id'] ?? 0;
            // Check if has sub-categories
            $check = $pdo->prepare("SELECT COUNT(*) FROM inv_sub_categories WHERE main_id = ?");
            $check->execute([$id]);
            if ($check->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Cannot delete Category because it still has Sub-Categories.']);
                exit;
            }
            $stmt = $pdo->prepare("DELETE FROM inv_main_categories WHERE id = ? AND company_id = ?");
            $stmt->execute([$id, $company_id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_sub':
            $id = $_GET['id'] ?? 0;
            // Check if has items
            $check = $pdo->prepare("SELECT COUNT(*) FROM inv_items WHERE sub_id = ?");
            $check->execute([$id]);
            if ($check->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Cannot delete Sub-Category because it still has Inventory Items.']);
                exit;
            }
            $stmt = $pdo->prepare("DELETE FROM inv_sub_categories WHERE id = ? AND company_id = ?");
            $stmt->execute([$id, $company_id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'delete_item':
            $id = $_GET['id'] ?? 0;
            $stmt = $pdo->prepare("DELETE FROM inv_items WHERE id = ? AND company_id = ?");
            $stmt->execute([$id, $company_id]);
            echo json_encode(['status' => 'success']);
            break;

        case 'get_brands':
            $stmt = $pdo->prepare("SELECT * FROM inv_brands WHERE company_id = ? ORDER BY name");
            $stmt->execute([$company_id]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_brand':
            $data = json_decode(file_get_contents('php://input'), true);
            if (isset($data['id']) && $data['id'] > 0) {
                // UPDATE
                $stmt = $pdo->prepare("UPDATE inv_brands SET name = ? WHERE id = ? AND company_id = ?");
                $stmt->execute([$data['name'], $data['id'], $company_id]);
                echo json_encode(['status' => 'success', 'id' => $data['id']]);
            } else {
                // INSERT
                $stmt = $pdo->prepare("INSERT INTO inv_brands (company_id, name) VALUES (?, ?)");
                $stmt->execute([$company_id, $data['name']]);
                echo json_encode(['status' => 'success', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'delete_brand':
            $id = $_GET['id'] ?? 0;
            // Check if brand is used by any item
            $check = $pdo->prepare("SELECT COUNT(*) FROM inv_items WHERE brand_id = ?");
            $check->execute([$id]);
            if ($check->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Cannot delete Brand because it is linked to Inventory Items.']);
                exit;
            }
            $stmt = $pdo->prepare("DELETE FROM inv_brands WHERE id = ? AND company_id = ?");
            $stmt->execute([$id, $company_id]);
            echo json_encode(['status' => 'success']);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Invalid action']);
            break;
        case 'get_locations':
            $stmt = $pdo->prepare("SELECT * FROM inv_locations WHERE company_id = ? ORDER BY is_default DESC, name ASC");
            $stmt->execute([$company_id]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'get_inv_opening_balances':
            $fy_id = $_GET['fy_id'] ?? 0;
            $location_id = $_GET['location_id'] ?? 0;
            
            // Fetch all items and left join with balances for specific FY/Location
            $stmt = $pdo->prepare("
                SELECT i.id as item_id, i.code, i.name, i.unit,
                       COALESCE(ob.pieces, 0) as pieces,
                       COALESCE(ob.quantity, 0) as quantity,
                       COALESCE(ob.rate, 0) as rate
                FROM inv_items i
                LEFT JOIN inv_opening_balances ob ON i.id = ob.item_id AND ob.fy_id = :fy AND ob.location_id = :loc
                WHERE i.company_id = :co
                ORDER BY i.code ASC
            ");
            $stmt->execute(['fy' => $fy_id, 'loc' => $location_id, 'co' => $company_id]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_inv_opening_balances':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['fy_id']) || !isset($data['location_id']) || !isset($data['balances'])) {
                echo json_encode(['error' => 'Missing data']);
                exit;
            }
            
            $fy_id = $data['fy_id'];
            $location_id = $data['location_id'];
            
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO inv_opening_balances (company_id, item_id, fy_id, location_id, pieces, quantity, rate)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE pieces = VALUES(pieces), quantity = VALUES(quantity), rate = VALUES(rate)
                ");
                
                foreach ($data['balances'] as $row) {
                    $stmt->execute([
                        $company_id, $row['item_id'], $fy_id, $location_id, 
                        $row['pieces'], $row['quantity'], $row['rate']
                    ]);
                }
                $pdo->commit();
                echo json_encode(['status' => 'success']);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
            break;

        case 'import_inv_opening_balances':
            $data = json_decode(file_get_contents('php://input'), true);
            $current_fy = $data['fy_id'];
            $from_fy = $data['from_fy_id'];
            $location_id = $data['location_id'];

            $stmt = $pdo->prepare("
                INSERT INTO inv_opening_balances (company_id, item_id, fy_id, location_id, pieces, quantity, rate)
                SELECT company_id, item_id, ?, location_id, pieces, quantity, rate
                FROM inv_opening_balances
                WHERE fy_id = ? AND company_id = ? AND location_id = ?
                ON DUPLICATE KEY UPDATE pieces = VALUES(pieces), quantity = VALUES(quantity), rate = VALUES(rate)
            ");
            $stmt->execute([$current_fy, $from_fy, $company_id, $location_id]);
            echo json_encode(['status' => 'success']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
