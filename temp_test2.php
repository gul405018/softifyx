<?php
require 'api/db_config.php';
$stmt = $pdo->query("
    SELECT cl.id, cl.code, cl.name 
    FROM coa_list cl
    LEFT JOIN vendors v ON cl.id = v.coa_list_id
    WHERE cl.sub_id IN (
        SELECT id FROM coa_sub WHERE main_id IN (
            SELECT id FROM coa_main WHERE 
                LOWER(name) LIKE '%vendor%' OR 
                LOWER(name) LIKE '%supplier%' OR 
                LOWER(name) LIKE '%creditor%' OR 
                LOWER(name) LIKE '%payable%'
        )
    )
");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
