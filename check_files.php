<?php
header('Content-Type: text/plain');

echo "--- SoftifyX Diagnostic Tool ---\n\n";

$filesToCheck = [
    'components/navbar.html',
    'components/sidebar.html',
    'assets/js/app.js',
    'Navigation/Maintain/customers.html',
    'Navigation/Maintain/vendors.html',
    'Navigation/Maintain/vendors_suppliers.html'
];

foreach ($filesToCheck as $file) {
    if (file_exists($file)) {
        $size = filesize($file);
        $mtime = date("Y-m-d H:i:s", filemtime($file));
        echo "[FOUND] $file ($size bytes) - Last Modified: $mtime\n";
        
        if (strpos($file, 'navbar.html') !== false) {
            $content = file_get_contents($file);
            if (strpos($content, 'vendors.html') !== false) {
                echo "        -> Navbar Status: UPDATED (points to vendors.html)\n";
            } else {
                echo "        -> Navbar Status: OLD (points to vendors_suppliers.html)\n";
            }
        }
    } else {
        echo "[NOT FOUND] $file\n";
    }
}

echo "\n--- Server Info ---\n";
echo "Root Path: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Current File: " . __FILE__ . "\n";
?>
