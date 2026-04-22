<?php
require_once 'api/db_config.php';
try {
    $stmt = $pdo->query("SELECT * FROM inv_locations");
    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($locations, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
