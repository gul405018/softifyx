// --- JOBS MODULE LOGIC ---
window.JobsModule = {
    jobs: [],
    customers: [],
    selectedJobId: null,
    selectedCustId: null,

    init: async function() {
        console.log("Jobs Module: Initializing...");
        await this.loadEmployees();
        await this.loadCustomers();
        await this.loadJobs();
        this.setupAutocomplete();
        this.resetForm(true);
    },

    loadEmployees: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/maintain.php?action=get_employees&company_id=${companyId}`);
            const emps = await res.json();
            const select = document.getElementById('jobIncharge');
            if (select) {
                select.innerHTML = '<option value="">Select Incharge</option>';
                emps.forEach(e => {
                    select.innerHTML += `<option value="${e.id}">${e.name}</option>`;
                });
            }
        } catch (e) { console.error("Load Employees Error:", e); }
    },

    loadCustomers: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/jobs.php?action=get_all_customers&company_id=${companyId}`);
            this.customers = await res.json();
        } catch (e) { console.error("Load Customers Error:", e); }
    },

    loadJobs: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/jobs.php?action=get_jobs&company_id=${companyId}&_cb=${Date.now()}`);
            this.jobs = await res.json();
            this.renderJobs();
        } catch (e) { console.error("Load Jobs Error:", e); }
    },

    renderJobs: function() {
        const tbody = document.getElementById('jobListBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        this.jobs.forEach(j => {
            const tr = document.createElement('tr');
            if (this.selectedJobId == j.id) tr.classList.add('active');
            tr.onclick = () => this.selectJob(j.id);
            tr.innerHTML = `
                <td>${j.job_no}</td>
                <td>${j.job_date}</td>
                <td>${j.description || ''}</td>
                <td>${j.customer_name || ''}</td>
                <td style="text-align:right;">${parseFloat(j.value_of_job).toLocaleString()}</td>
                <td>${j.completion_date || ''}</td>
                <td>${j.is_completed == 1 ? '<span style="color:green;font-weight:700;">Completed</span>' : '<span style="color:orange;font-weight:700;">Active</span>'}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    selectJob: function(id) {
        this.selectedJobId = id;
        const j = this.jobs.find(x => x.id == id);
        if (j) {
            document.getElementById('jobNo').value = j.job_no;
            document.getElementById('jobDate').value = j.job_date;
            document.getElementById('jobDescription').value = j.description || '';
            document.getElementById('jobOrderRef').value = j.order_no_date || '';
            document.getElementById('jobExpDate').value = j.exp_delivery_date || '';
            document.getElementById('jobIncharge').value = j.job_incharge_id || '';
            document.getElementById('jobEstCost').value = j.estimated_cost;
            document.getElementById('jobValue').value = j.value_of_job;
            document.getElementById('jobIsCompleted').checked = (j.is_completed == 1);
            document.getElementById('jobCompDate').value = j.completion_date || '';
            document.getElementById('jobDelRef').value = j.delivery_ref_dt || '';
            document.getElementById('jobRemarks').value = j.remarks || '';
            
            // Populate Customer Section
            const cust = this.customers.find(c => c.id == j.coa_list_id);
            if (cust) {
                this.selectedCustId = cust.id;
                document.getElementById('jobCustCode').value = cust.code;
                document.getElementById('jobCustName').value = cust.name;
                document.getElementById('jobCustContact').value = cust.contact_person || '';
                document.getElementById('jobCustAddress').value = cust.address || '';
                document.getElementById('jobCustPhone').value = cust.telephone || '';
            }
        }
        this.renderJobs();
    },

    setupAutocomplete: function() {
        const input = document.getElementById('jobCustCode');
        const suggest = document.getElementById('jobCustSuggest');
        if (!input || !suggest) return;

        input.oninput = (e) => {
            const val = e.target.value.toLowerCase();
            if (!val) {
                suggest.style.display = 'none';
                return;
            }
            const matches = this.customers.filter(c => 
                (c.code && c.code.toLowerCase().includes(val)) || 
                (c.name && c.name.toLowerCase().includes(val)) ||
                (c.contact_person && c.contact_person.toLowerCase().includes(val)) ||
                (c.address && c.address.toLowerCase().includes(val)) ||
                (c.telephone && c.telephone.toLowerCase().includes(val))
            ).slice(0, 15);

            if (matches.length > 0) {
                suggest.innerHTML = matches.map(c => `
                    <div onclick="window.JobsModule.selectCustomer(${c.id})">
                        <strong>${c.code}</strong> - ${c.name}
                    </div>
                `).join('');
                suggest.style.display = 'block';
            } else {
                suggest.style.display = 'none';
            }
        };

        // Close suggest on click outside
        document.addEventListener('click', (e) => {
            if (e.target !== input) suggest.style.display = 'none';
        });
    },

    selectCustomer: function(id) {
        const c = this.customers.find(x => x.id == id);
        if (c) {
            this.selectedCustId = c.id;
            document.getElementById('jobCustCode').value = c.code;
            document.getElementById('jobCustName').value = c.name;
            document.getElementById('jobCustContact').value = c.contact_person || '';
            document.getElementById('jobCustAddress').value = c.address || '';
            document.getElementById('jobCustPhone').value = c.telephone || '';
        }
        document.getElementById('jobCustSuggest').style.display = 'none';
    },

    saveJob: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        
        if (!this.selectedCustId) {
            alert("Please select a valid customer.");
            return;
        }

        const payload = {
            id: this.selectedJobId,
            job_no: document.getElementById('jobNo').value,
            job_date: document.getElementById('jobDate').value,
            description: document.getElementById('jobDescription').value,
            order_no_date: document.getElementById('jobOrderRef').value,
            exp_delivery_date: document.getElementById('jobExpDate').value,
            job_incharge_id: document.getElementById('jobIncharge').value,
            estimated_cost: document.getElementById('jobEstCost').value,
            value_of_job: document.getElementById('jobValue').value,
            is_completed: document.getElementById('jobIsCompleted').checked ? 1 : 0,
            completion_date: document.getElementById('jobCompDate').value,
            delivery_ref_dt: document.getElementById('jobDelRef').value,
            coa_list_id: this.selectedCustId,
            remarks: document.getElementById('jobRemarks').value
        };

        try {
            const res = await fetch(`api/jobs.php?action=save_job&company_id=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                await this.loadJobs();
                this.resetForm();
            }
        } catch (e) { console.error("Save Job Error:", e); }
    },

    deleteJob: async function() {
        if (!this.selectedJobId) return;
        if (!confirm("Are you sure you want to delete this job card?")) return;
        
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/jobs.php?action=delete_job&id=${this.selectedJobId}&company_id=${companyId}`, { method: 'POST' });
            const result = await res.json();
            if (result.status === 'success') {
                await this.loadJobs();
                this.resetForm();
            }
        } catch (e) { console.error("Delete Job Error:", e); }
    },

    resetForm: async function(isNew = false) {
        this.selectedJobId = isNew ? null : this.selectedJobId;
        this.selectedCustId = null;
        
        const inputs = ['jobNo', 'jobDate', 'jobDescription', 'jobOrderRef', 'jobExpDate', 
                       'jobIncharge', 'jobEstCost', 'jobValue', 'jobCompDate', 'jobDelRef', 
                       'jobRemarks', 'jobCustCode', 'jobCustName', 'jobCustContact', 
                       'jobCustAddress', 'jobCustPhone'];
        
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = (id.includes('Cost') || id.includes('Value')) ? '0' : '';
        });
        
        document.getElementById('jobIsCompleted').checked = false;

        if (isNew) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = session.company_id || 1;
            const res = await fetch(`api/jobs.php?action=get_next_job_no&company_id=${companyId}`);
            const data = await res.json();
            document.getElementById('jobNo').value = data.next_no;
            document.getElementById('jobDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('jobNo').focus();
        }
        this.renderJobs();
    },

    printJob: function() {
        if (!this.selectedJobId) {
            alert("Please select a job card to print.");
            return;
        }
        window.print();
    }
};
