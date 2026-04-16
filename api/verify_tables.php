<?php
require_once 'db_config.php';

echo "<h1>Database Table Verification</h1>";

function checkTable($pdo, $tableName) {
    try {
        $stmt = $pdo->query("DESCRIBE `$tableName` ");
        echo "<h3>Table: $tableName</h3>";
        echo "<table border='1'><tr><th>Field</th><th>Type</th></tr>";
        while($row = $stmt->fetch()) {
            echo "<tr><td>{$row['Field']}</td><td>{$row['Type']}</td></tr>";
        }
        echo "</table>";
    } catch (Exception $e) {
        echo "<p style='color:red'>Error describing $tableName: " . $e->getMessage() . "</p>";
    }
}

checkTable($pdo, 'coa_list');
checkTable($pdo, 'vendors');
checkTable($pdo, 'customers');
checkTable($pdo, 'coa_sub');

echo "<h2>PHP Info</h2>";
echo "PHP Version: " . phpversion();
?>
