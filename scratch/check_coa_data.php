<?php
require_once 'api/db_config.php';
try {
    $stmt = $pdo->query("SELECT * FROM coa_main WHERE name LIKE '%Vendor%' OR name LIKE '%Supplier%' OR name LIKE '%Creditor%'");
    echo "MAINS:\n";
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

    $stmt = $pdo->query("SELECT * FROM coa_sub WHERE name LIKE '%Cash Purchase Vendors%'");
    echo "SUBS:\n";
    $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($subs);

    if (!empty($subs)) {
        $subId = $subs[0]['id'];
        $stmt = $pdo->prepare("SELECT * FROM coa_list WHERE sub_id = ?");
        $stmt->execute([$subId]);
        echo "LIST ITEMS for Sub ID $subId:\n";
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
