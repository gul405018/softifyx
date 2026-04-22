<?php
require_once 'api/db_config.php';
$company_id = 1;
try {
    $stmt = $pdo->prepare("SELECT * FROM inv_locations WHERE company_id = ? ORDER BY is_default DESC, name ASC");
    $stmt->execute([$company_id]);
    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($locations);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
