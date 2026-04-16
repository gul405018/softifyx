<?php
require_once 'api/db_config.php';
header('Content-Type: text/plain');

$targetCode = '21001001';

echo "--- Searching for Code $targetCode ---\n";
$stmt = $pdo->prepare("SELECT * FROM coa_list WHERE code = ?");
$stmt->execute([$targetCode]);
$record = $stmt->fetch();

if ($record) {
    print_r($record);
    
    echo "\n--- Parent Sub Account Info ---\n";
    $stmt = $pdo->prepare("SELECT * FROM coa_sub WHERE id = ?");
    $stmt->execute([$record['sub_id']]);
    print_r($stmt->fetch());
} else {
    echo "Record $targetCode not found in coa_list.\n";
    
    echo "\n--- Scanning all coa_list to find similar names ---\n";
    $stmt = $pdo->prepare("SELECT id, sub_id, code, name, company_id FROM coa_list WHERE name LIKE '%Retail%' OR name LIKE '%Purchase%'");
    $stmt->execute();
    print_r($stmt->fetchAll());
}
?>
