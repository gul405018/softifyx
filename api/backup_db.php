<?php
// Increase memory and timeout for large exports
ini_set('memory_limit', '256M');
set_time_limit(300);

require_once '../includes/db_connect.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'export';

if ($action === 'export') {
    $tables = ['companies', 'users', 'user_rights', 'financial_years', 'currencies', 'coa_main', 'coa_sub', 'coa_list', 'inventory', 'vouchers'];
    $output = "-- SoftifyX Database Backup\n";
    $output .= "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
    $output .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

    foreach ($tables as $table) {
        $output .= "DROP TABLE IF EXISTS `$table`;\n";
        
        // Structure
        $stmt = $pdo->query("SHOW CREATE TABLE `$table` ");
        $create = $stmt->fetch();
        $output .= $create['Create Table'] . ";\n\n";
        
        // Data
        $stmt = $pdo->query("SELECT * FROM `$table` ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rows as $row) {
            $cols = array_keys($row);
            $vals = array_map(function($v) use ($pdo) {
                if ($v === null) return 'NULL';
                return $pdo->quote($v);
            }, array_values($row));
            
            $output .= "INSERT INTO `$table` (`" . implode("`, `", $cols) . "`) VALUES (" . implode(", ", $vals) . ");\n";
        }
        $output .= "\n";
    }
    
    $output .= "SET FOREIGN_KEY_CHECKS=1;\n";

    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="softifyx_backup_' . date('Ymd_His') . '.sql"');
    echo $output;
    exit;

} elseif ($action === 'restore') {
    if (!isset($_FILES['backup_file'])) {
        echo json_encode(["status" => "error", "message" => "No backup file uploaded."]);
        exit;
    }

    $sql = file_get_contents($_FILES['backup_file']['tmp_name']);
    try {
        $pdo->beginTransaction();
        $pdo->exec($sql);
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Database restored successfully!"]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
