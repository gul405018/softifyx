<?php
require 'api/db_config.php';
$stmt = $pdo->prepare("SELECT cl.id, cl.code, cl.name, cl.sub_id, cs.name as sub_name, cs.code as sub_code FROM coa_list cl LEFT JOIN coa_sub cs ON cl.sub_id = cs.id WHERE cl.name LIKE '%Retail%'");
$stmt->execute();
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);
file_put_contents('scratch/debug_coa.txt', print_r($data, true));
?>
