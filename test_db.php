<?php
header('Content-Type: text/plain');
try {
    $pdo = new PDO('mysql:host=localhost;dbname=softifyx_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $tables = $pdo->query("SHOW TABLES LIKE 'inv_%'")->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables Found:\n" . implode("\n", $tables) . "\n\n";
    
    if (in_array('inv_items', $tables)) {
        echo "Structure of inv_items:\n";
        $cols = $pdo->query("DESCRIBE inv_items")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cols as $c) echo $c['Field'] . " - " . $c['Type'] . "\n";
    } else {
        echo "inv_items TABLE MISSING!\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
