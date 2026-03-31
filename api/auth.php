<?php
require_once 'db_config.php';

// SoftifyX Auth API - Simplified for Single-Business (ID 1)
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'login') {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        
        // --- SINGLE-BUSINESS LOCK ---
        // All logins are now permanently linked to Company ID 1
        $companyId = 1; 
        
        // Auth User within this business
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND password = ? AND company_id = ?");
        $stmt->execute([$username, $password, $companyId]);
        $user = $stmt->fetch();
        
        if ($user) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['company_id'] = $companyId;
            $_SESSION['role'] = $user['role'];
            
            sendResponse([
                'status' => 'success',
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'company_id' => $companyId
                ]
            ]);
        } else {
            sendResponse(['error' => 'Invalid username or password for your business.'], 401);
        }
    }
}

if ($action === 'logout') {
    session_destroy();
    sendResponse(['status' => 'success']);
}

if ($action === 'check') {
    if (isset($_SESSION['user_id'])) {
        sendResponse(['status' => 'logged_in', 'user' => $_SESSION]);
    } else {
        sendResponse(['status' => 'logged_out']);
    }
}
?>
