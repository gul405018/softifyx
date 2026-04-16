<?php
require_once 'db_config.php';

echo "<h1>Nuclear Repair & Sync Tool</h1>";

try {
    $pdo->beginTransaction();

    // 1. RE-LINK COA_LIST TO COA_SUB BASED ON CODE PREFIX
    echo "<h2>Step 1: Repairing Hierarchy Links...</h2>";
    $stmt = $pdo->query("SELECT id, code, name FROM coa_sub");
    $subs = $stmt->fetchAll();
    
    foreach ($subs as $sub) {
        $prefix = $sub['code'];
        $stmt = $pdo->prepare("UPDATE coa_list SET sub_id = ? WHERE code LIKE ?");
        $stmt->execute([$sub['id'], $prefix . '%']);
        $count = $stmt->rowCount();
        if ($count > 0) {
            echo "Linked $count items to Category: {$sub['name']} (Code: $prefix)<br>";
        }
    }

    // 2. ENSURE VENDOR/CUSTOMER BASE ENTRIES EXIST
    echo "<h2>Step 2: verifying Profile Integrity...</h2>";
    
    // Auto-create missing Vendor entries for accounts that look like vendors
    $stmt = $pdo->query("SELECT id, company_id, name FROM coa_list WHERE (name LIKE '%Vendor%' OR name LIKE '%Supplier%' OR name LIKE '%Purchase%') AND id NOT IN (SELECT coa_list_id FROM vendors)");
    $orphans = $stmt->fetchAll();
    foreach ($orphans as $o) {
        $pdo->prepare("INSERT IGNORE INTO vendors (company_id, coa_list_id, remarks) VALUES (?, ?, ?)")
            ->execute([$o['company_id'], $o['id'], 'Auto-synced by Nuclear Fix']);
        echo "Created Vendor Profile for: {$o['name']}<br>";
    }

    $pdo->commit();
    echo "<h2 style='color:green'>SUCCESS: Everything has been synchronized and repaired!</h2>";
    echo "<p>Please go back to the Vendor Form and press <b>Ctrl + F5</b>.</p>";

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "<h2 style='color:red'>ERROR: " . $e->getMessage() . "</h2>";
}
?>
