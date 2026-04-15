<?php
require 'api/db_config.php';
$stmt = $pdo->prepare("SELECT cl.*, v.id as vendor_id FROM coa_list cl LEFT JOIN vendors v ON cl.id = v.coa_list_id WHERE cl.name LIKE '%Retail%'");
$stmt->execute();
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
