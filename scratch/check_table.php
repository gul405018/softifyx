<?php
require_once 'api/db_config.php';
try {
    $stmt = $pdo->prepare("DESCRIBE employees");
    $stmt->execute();
    echo json_encode($stmt->fetchAll());
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
