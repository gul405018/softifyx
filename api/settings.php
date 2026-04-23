<?php
header('Content-Type: application/json');
require_once 'db_config.php';

// MIGRATION: Ensure Settings table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS company_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        UNIQUE KEY `unique_setting_per_company` (company_id, setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {}

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? 1;

switch ($action) {
    case 'get_setting':
        $key = $_GET['key'] ?? '';
        $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE company_id = ? AND setting_key = ?");
        $stmt->execute([$company_id, $key]);
        $row = $stmt->fetch();
        echo json_encode(['value' => $row ? $row['setting_value'] : null]);
        break;

    case 'save_setting':
        $data = json_decode(file_get_contents('php://input'), true);
        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';
        
        $stmt = $pdo->prepare("INSERT INTO company_settings (company_id, setting_key, setting_value) 
                               VALUES (?, ?, ?) 
                               ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $stmt->execute([$company_id, $key, $value]);
        echo json_encode(['status' => 'success']);
        break;
}
?>
