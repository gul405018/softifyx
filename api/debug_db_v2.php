<?php
include 'db_config.php';
header('Content-Type: application/json');

try {
    $results = [];
    
    // Check main categories
    $results['categories'] = $pdo->query("SELECT * FROM inv_main_categories")->fetchAll(PDO::FETCH_ASSOC);
    
    // Check sub categories
    $results['sub_categories'] = $pdo->query("SELECT * FROM inv_sub_categories")->fetchAll(PDO::FETCH_ASSOC);
    
    // Check brands
    $results['brands'] = $pdo->query("SELECT * FROM inv_brands")->fetchAll(PDO::FETCH_ASSOC);
    
    // Check items
    $results['items'] = $pdo->query("SELECT * FROM inv_items")->fetchAll(PDO::FETCH_ASSOC);
    
    // Check active session
    $results['session'] = $_SESSION;
    
    echo json_encode($results, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
