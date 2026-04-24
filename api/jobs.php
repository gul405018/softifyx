<?php
header('Content-Type: application/json');
require_once 'db_config.php';

// MIGRATION: Ensure Jobs table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS job_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        job_no INT NOT NULL,
        job_date DATE,
        description TEXT,
        order_no_date VARCHAR(255),
        exp_delivery_date DATE,
        job_incharge_id INT,
        estimated_cost DECIMAL(15,2) DEFAULT 0.00,
        value_of_job DECIMAL(15,2) DEFAULT 0.00,
        is_completed TINYINT DEFAULT 0,
        completion_date DATE,
        delivery_ref_dt VARCHAR(255),
        coa_list_id INT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (company_id),
        INDEX (coa_list_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {}

$action = $_GET['action'] ?? '';
$company_id = $_GET['company_id'] ?? 1;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'get_jobs') {
        $stmt = $pdo->prepare("
            SELECT j.*, cl.name as customer_name, cl.code as customer_code 
            FROM job_cards j
            LEFT JOIN coa_list cl ON j.coa_list_id = cl.id
            WHERE j.company_id = ? 
            ORDER BY j.job_no DESC
        ");
        $stmt->execute([$company_id]);
        echo json_encode($stmt->fetchAll());
    }
    
    if ($action === 'get_all_customers') {
        // Fetch all customers for autocomplete
        $stmt = $pdo->prepare("
            SELECT cl.id, cl.code, cl.name, c.contact_person, c.address, c.telephone
            FROM coa_list cl
            JOIN customers c ON cl.id = c.coa_list_id
            WHERE cl.company_id = ?
            ORDER BY cl.code ASC
        ");
        $stmt->execute([$company_id]);
        echo json_encode($stmt->fetchAll());
    }

    if ($action === 'get_next_job_no') {
        $stmt = $pdo->prepare("SELECT MAX(job_no) as max_no FROM job_cards WHERE company_id = ?");
        $stmt->execute([$company_id]);
        $row = $stmt->fetch();
        echo json_encode(['next_no' => ($row['max_no'] ?? 0) + 1]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'save_job') {
        $id = $data['id'] ?? null;
        if ($id) {
            $sql = "UPDATE job_cards SET 
                    job_no = ?, job_date = ?, description = ?, order_no_date = ?, 
                    exp_delivery_date = ?, job_incharge_id = ?, estimated_cost = ?, 
                    value_of_job = ?, is_completed = ?, completion_date = ?, 
                    delivery_ref_dt = ?, coa_list_id = ?, remarks = ?
                    WHERE id = ? AND company_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['job_no'], $data['job_date'], $data['description'], $data['order_no_date'],
                $data['exp_delivery_date'], $data['job_incharge_id'], $data['estimated_cost'],
                $data['value_of_job'], $data['is_completed'], $data['completion_date'],
                $data['delivery_ref_dt'], $data['coa_list_id'], $data['remarks'],
                $id, $company_id
            ]);
        } else {
            $sql = "INSERT INTO job_cards (
                    company_id, job_no, job_date, description, order_no_date, 
                    exp_delivery_date, job_incharge_id, estimated_cost, 
                    value_of_job, is_completed, completion_date, 
                    delivery_ref_dt, coa_list_id, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $company_id, $data['job_no'], $data['job_date'], $data['description'], $data['order_no_date'],
                $data['exp_delivery_date'], $data['job_incharge_id'], $data['estimated_cost'],
                $data['value_of_job'], $data['is_completed'], $data['completion_date'],
                $data['delivery_ref_dt'], $data['coa_list_id'], $data['remarks']
            ]);
        }
        echo json_encode(['status' => 'success']);
    }

    if ($action === 'delete_job' && isset($_GET['id'])) {
        $stmt = $pdo->prepare("DELETE FROM job_cards WHERE id = ? AND company_id = ?");
        $stmt->execute([$_GET['id'], $company_id]);
        echo json_encode(['status' => 'success']);
    }
}
?>
