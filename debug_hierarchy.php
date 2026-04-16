<?php
require_once 'api/db_config.php';
header('Content-Type: text/plain');

$company_id = 1;

echo "--- MAIN ACCOUNTS ---\n";
$stmt = $pdo->prepare("SELECT id, code, name FROM coa_main WHERE company_id = ?");
$stmt->execute([$company_id]);
$mains = $stmt->fetchAll();
print_r($mains);

echo "\n--- SUB ACCOUNTS ---\n";
$stmt = $pdo->prepare("SELECT id, main_id, code, name FROM coa_sub WHERE company_id = ?");
$stmt->execute([$company_id]);
$subs = $stmt->fetchAll();
print_r($subs);

echo "\n--- LIST ACCOUNTS (First 20) ---\n";
$stmt = $pdo->prepare("SELECT id, sub_id, code, name FROM coa_list WHERE company_id = ? LIMIT 20");
$stmt->execute([$company_id]);
$list = $stmt->fetchAll();
print_r($list);
?>
