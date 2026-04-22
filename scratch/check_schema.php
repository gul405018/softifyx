<?php
$pdo = new PDO('sqlite:database.db');
$stmt = $pdo->query("PRAGMA table_info(inv_locations)");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
