/**
 * SOFTIFYX - Employees Module Logic
 * Isolated for stability and performance.
 */

(function() {
    let allEmployeesData = [];
    let currentEmployeeId = null;

    async function initEmployeesView() {
        console.log("SoftifyX: [Employees] initEmployeesView called.");
        alert("Employees Module Ready!");
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const coId = session.company_id || 1;
        
        try {
            // 1. Load Departments
            const dRes = await fetch(`api/maintain.php?action=get_departments&company_id=${coId}`);
            if (dRes.ok) {
                const depts = await dRes.json();
                const dSelect = document.getElementById('empDepartment');
                if (dSelect) {
                    dSelect.innerHTML = '<option value="">-- Select Department --</option>';
                    depts.forEach(d => { dSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`; });
                }
            }

            // 2. Load Employees
            await fetchEmployeesList(coId);
            
            // 3. Bind Buttons Programmatically
            // We use an interval to ensure the DOM elements are present after the modular popup injection
            const bindInterval = setInterval(() => {
                const addBtn = document.getElementById('empAddBtn');
                if (addBtn) {
                    clearInterval(bindInterval);
                    console.log("SoftifyX: [Employees] Binding Action Buttons...");
                    
                    addBtn.onclick = () => window.resetEmployeeForm(true);
                    
                    const saveBtn = document.getElementById('empSaveBtn');
                    if (saveBtn) saveBtn.onclick = () => window.saveEmployee();
                    
                    const cancelBtn = document.getElementById('empCancelBtn');
                    if (cancelBtn) cancelBtn.onclick = () => window.resetEmployeeForm(false);
                    
                    const deleteBtn = document.getElementById('empDeleteBtn');
                    if (deleteBtn) deleteBtn.onclick = () => window.deleteEmployee();
                    
                    console.log("SoftifyX: [Employees] Buttons Bound.");
                }
            }, 100);

            // 4. Initial Lock
            window.resetEmployeeForm(false);
            
        } catch (e) {
            console.error("SoftifyX: [Employees] Load Error:", e);
        }
    }

    async function fetchEmployeesList(coId) {
        try {
            const res = await fetch(`api/maintain.php?action=get_employees&company_id=${coId}`);
            if (res.ok) {
                allEmployeesData = await res.json();
                renderEmployeesList();
            }
        } catch (e) { console.error("SoftifyX: [Employees] Fetch List Error:", e); }
    }

    function renderEmployeesList() {
        const list = document.getElementById('employeeList');
        if (list) {
            list.innerHTML = allEmployeesData.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        }
    }

    function onEmployeeSelect(id) {
        const emp = allEmployeesData.find(e => e.id == id);
        if (!emp) return;
        currentEmployeeId = id;

        const fields = {
            'empName': emp.name, 'empFatherName': emp.father_name, 'empAddress': emp.address,
            'empTelephone': emp.telephone, 'empEmail': emp.email, 'empNicNo': emp.nic_no,
            'empDob': emp.dob, 'empJoiningDate': emp.joining_date, 'empSalary': emp.salary,
            'empDesignation': emp.designation, 'empDepartment': emp.department_id,
            'empRemarks': emp.remarks, 'empReference': emp.reference, 'empLeavingDate': emp.leaving_date
        };
        Object.keys(fields).forEach(fid => {
            const el = document.getElementById(fid);
            if (el) el.value = fields[fid] || (fid === 'empSalary' ? 0 : '');
        });

        const jobLeft = document.getElementById('empJobLeft');
        if (jobLeft) jobLeft.checked = emp.job_left == 1;
        
        window.toggleLeavingDate(emp.job_left == 1);
        enableEmployeeFields(false);
        const saveBtn = document.getElementById('empSaveBtn');
        if (saveBtn) saveBtn.disabled = true;
    }

    function toggleLeavingDate(checked) {
        const el = document.getElementById('empLeavingDate');
        if (el) el.disabled = !checked || (document.getElementById('empSaveBtn') && document.getElementById('empSaveBtn').disabled);
    }

    function resetEmployeeForm(isAdd = false) {
        currentEmployeeId = isAdd ? null : currentEmployeeId;
        if (!isAdd) {
            if (currentEmployeeId) return onEmployeeSelect(currentEmployeeId);
            enableEmployeeFields(false);
            const saveBtn = document.getElementById('empSaveBtn');
            if (saveBtn) saveBtn.disabled = true;
            return;
        }

        // Clear all fields for Add
        const container = document.getElementById('employeesContainer');
        if (container) {
            const inputs = container.querySelectorAll('input, select, textarea');
            inputs.forEach(i => {
                if (i.type === 'checkbox') i.checked = false;
                else if (i.type === 'number') i.value = 0;
                else i.value = '';
            });
        }
        
        enableEmployeeFields(true);
        const saveBtn = document.getElementById('empSaveBtn');
        if (saveBtn) saveBtn.disabled = false;
        const nameField = document.getElementById('empName');
        if (nameField) nameField.focus();
    }

    function enableEmployeeFields(enabled) {
        const container = document.getElementById('employeesContainer');
        if (container) {
            const inputs = container.querySelectorAll('input, select, textarea');
            inputs.forEach(i => { i.disabled = !enabled; });
            if (enabled) toggleLeavingDate(document.getElementById('empJobLeft')?.checked);
        }
    }

    async function saveEmployee() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const coId = session.company_id || 1;
        
        const payload = {
            id: currentEmployeeId,
            name: document.getElementById('empName')?.value?.trim(),
            father_name: document.getElementById('empFatherName')?.value?.trim(),
            address: document.getElementById('empAddress')?.value?.trim(),
            telephone: document.getElementById('empTelephone')?.value?.trim(),
            email: document.getElementById('empEmail')?.value?.trim(),
            nic_no: document.getElementById('empNicNo')?.value?.trim(),
            dob: document.getElementById('empDob')?.value,
            joining_date: document.getElementById('empJoiningDate')?.value,
            salary: parseFloat(document.getElementById('empSalary')?.value) || 0,
            designation: document.getElementById('empDesignation')?.value?.trim(),
            department_id: document.getElementById('empDepartment')?.value,
            remarks: document.getElementById('empRemarks')?.value?.trim(),
            reference: document.getElementById('empReference')?.value?.trim(),
            job_left: document.getElementById('empJobLeft')?.checked ? 1 : 0,
            leaving_date: document.getElementById('empLeavingDate')?.value
        };

        if (!payload.name) {
            alert("Employee Name is required!");
            return;
        }

        try {
            const res = await fetch(`api/maintain.php?action=save_employee&company_id=${coId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const result = await res.json();
                alert("Employee profile saved successfully!");
                await fetchEmployeesList(coId);
                onEmployeeSelect(result.id);
            } else {
                const errText = await res.text();
                alert("Save failed: " + res.statusText);
            }
        } catch (e) { 
            alert("Save failed due to a system error."); 
        }
    }

    async function deleteEmployee() {
        if (!currentEmployeeId) return alert("Select an employee first.");
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const coId = session.company_id || 1;

        if (confirm("Are you sure you want to delete this employee?")) {
            try {
                const res = await fetch(`api/maintain.php?action=delete_employee&id=${currentEmployeeId}&company_id=${coId}`, { method: 'POST' });
                if (res.ok) {
                    alert("Employee deleted.");
                    currentEmployeeId = null;
                    await fetchEmployeesList(coId);
                    resetEmployeeForm(false);
                }
            } catch (e) { alert("Delete failed."); }
        }
    }

    // EXPOSE TO GLOBAL WINDOW
    window.initEmployeesView = initEmployeesView;
    window.onEmployeeSelect = onEmployeeSelect;
    window.resetEmployeeForm = resetEmployeeForm;
    window.saveEmployee = saveEmployee;
    window.deleteEmployee = deleteEmployee;
    window.toggleLeavingDate = toggleLeavingDate;

})();
