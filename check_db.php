<?php
require_once 'api/db_config.php';

try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'vendors'");
    if ($stmt->rowCount() > 0) {
        echo "TABLE vendors: EXISTS\n";
        
        $desc = $pdo->query("DESCRIBE vendors");
        while ($row = $desc->fetch(PDO::FETCH_ASSOC)) {
            echo "Field: {$row['Field']} - Type: {$row['Type']}\n";
        }
    } else {
        echo "TABLE vendors: MISSING\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
