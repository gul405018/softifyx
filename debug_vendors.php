<?php
require_once 'api/db_config.php';

header('Content-Type: text/plain');

$company_id = 1; // Assuming company 1 for debug

echo "--- COA SUB --- \n";
$stmt = $pdo->prepare("SELECT id, code, name FROM coa_sub WHERE company_id = ?");
$stmt->execute([$company_id]);
$subs = $stmt->fetchAll();
print_r($subs);

echo "\n--- COA LIST (for all subs) --- \n";
$stmt = $pdo->prepare("SELECT id, sub_id, code, name FROM coa_list WHERE company_id = ?");
$stmt->execute([$company_id]);
$list = $stmt->fetchAll();
print_r($list);

echo "\n--- VENDORS TABLE --- \n";
$stmt = $pdo->prepare("SELECT coa_list_id, contact_person FROM vendors WHERE company_id = ?");
$stmt->execute([$company_id]);
$vends = $stmt->fetchAll();
print_r($vends);
?>
