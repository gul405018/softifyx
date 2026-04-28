<?php
require 'api/db_config.php';
$stmt = $pdo->query('SELECT * FROM vendors');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
$stmt2 = $pdo->query('SELECT * FROM coa_sub WHERE name LIKE "%Vendor%" OR name LIKE "%Supplier%"');
echo "\n--- COA SUB ---\n";
print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));
$stmt3 = $pdo->query('SELECT * FROM coa_list WHERE name LIKE "%aaa%" OR name LIKE "%sss%"');
echo "\n--- COA LIST ---\n";
print_r($stmt3->fetchAll(PDO::FETCH_ASSOC));
