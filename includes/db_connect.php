<?php
/**
 * SoftifyX ERP - Database Connection
 * 
 * Live Credentials for Hostinger
 */

$host = 'localhost';
$db   = 'u245697138_SoftifyXTech';
$user = 'u245697138_softifyx123';
$pass = 'Naimat@.123';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     error_log($e->getMessage());
     die("Database connection failed. Please check your credentials.");
}
?>
