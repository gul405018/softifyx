<?php
require_once 'db_config.php';

// SoftifyX Auth API
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'login') {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        $companyName = $data['company'] ?? '';
        
        // 1. Find Company
        $stmt = $pdo->prepare("SELECT id FROM companies WHERE name = ?");
        $stmt->execute([$companyName]);
        $company = $stmt->fetch();
        
        if (!$company) {
            // Auto-create company if none exist (similar to localStorage logic)
            $stmt = $pdo->prepare("INSERT INTO companies (name) VALUES (?)");
            $stmt->execute([$companyName]);
            $companyId = $pdo->lastInsertId();
            
            // Auto-create Admin for new company
            $stmt = $pdo->prepare("INSERT INTO users (company_id, username, password, role) VALUES (?, ?, ?, 'Admin')");
            $stmt->execute([$companyId, 'Administrator', '123']);
        } else {
            $companyId = $company['id'];
        }
        
        // 2. Auth User
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
            sendResponse(['error' => 'Invalid credentials'], 401);
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
