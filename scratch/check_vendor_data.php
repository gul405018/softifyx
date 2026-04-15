<?php
require_once 'api/db_config.php';
session_start();
$session = json_decode($_SESSION['softifyx_session_json'] ?? '{}', true);
$company_id = $session['company_id'] ?? 1;

// Use a known sub_id or find it from the code
$code = '21001';
$stmt = $pdo->prepare("SELECT id FROM coa_sub WHERE code = ? AND company_id = ?");
$stmt->execute([$code, $company_id]);
$sub = $stmt->fetch();

if ($sub) {
    $subId = $sub['id'];
    echo "Found Sub Category ID: $subId for Code: $code\n";
    
    $stmt = $pdo->prepare("SELECT cl.* FROM coa_list cl WHERE cl.sub_id = ? AND cl.company_id = ?");
    $stmt->execute([$subId, $company_id]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($results) . " accounts in coa_list for this sub category:\n";
    print_r($results);
} else {
    echo "Sub Category with code $code not found for company $company_id\n";
}
?>
