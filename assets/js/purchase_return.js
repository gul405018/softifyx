// --- PURCHASE RETURN / DEBIT NOTE MODULE LOGIC ---
window.PRModule = {
    vendors: [],
    inventory: [],
    employees: [],
    jobs: [],
    expenseAccounts: [],
    currentId: null,
    selectedVendorCoaId: null,

    init: async function() {
        console.log("PR Module: Initializing...");
        await Promise.all([
            this.loadVendors(),
            this.loadInventory(),
            this.loadEmployees(),
            this.loadJobs(),
            this.loadExpenseAccounts()
        ]);
        this.setupVendorSearch();
        this.resetForm(true);
        this.setupKeyboardNav();
    },

    loadVendors: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/maintain.php?action=get_vendors&company_id=${companyId}`);
            this.vendors = await res.json();
            console.log("PR Module: Vendors loaded:", this.vendors.length);
        } catch (e) { console.error("PR Module: Load Vendors Error:", e); }
    },

    loadInventory: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/inventory.php?action=get_all_items&company_id=${companyId}`);
            this.inventory = await res.json();
            console.log("PR Module: Inventory loaded:", this.inventory.length);
        } catch (e) { console.error("PR Module: Load Inventory Error:", e); }
    },

    loadEmployees: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/maintain.php?action=get_employees&company_id=${companyId}`);
            this.employees = await res.json();
            const select = document.getElementById('pr_employee_ref');
            if (select) {
                select.innerHTML = '<option value="">Select Employee</option>';
                this.employees.forEach(e => select.innerHTML += `<option value="${e.id}">${e.name}</option>`);
            }
        } catch (e) { console.error("PR Module: Load Employees Error:", e); }
    },

    loadJobs: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/jobs.php?action=get_jobs&company_id=${companyId}`);
            this.jobs = await res.json();
            const select = document.getElementById('pr_job_no');
            if (select) {
                select.innerHTML = '<option value="">Select Job</option>';
                this.jobs.forEach(j => select.innerHTML += `<option value="${j.id}">${j.job_no} - ${j.description}</option>`);
            }
        } catch (e) { console.error("PR Module: Load Jobs Error:", e); }
    },

    loadExpenseAccounts: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            // Fetching accounts starting with 5 (Expenses) as a default
            const res = await fetch(`api/maintain.php?action=get_coa_list&company_id=${companyId}&type=EXPENSE`);
            this.expenseAccounts = await res.json();
            const select = document.getElementById('pr_expense_account');
            if (select) {
                select.innerHTML = '<option value="">Select Account</option>';
                this.expenseAccounts.forEach(a => select.innerHTML += `<option value="${a.id}">${a.account_code} - ${a.account_name}</option>`);
            }
        } catch (e) { console.error("PR Module: Load Expense Accounts Error:", e); }
    },

    setupVendorSearch: function() {
        const input = document.getElementById('vendor_code');
        const suggest = document.getElementById('vendor_suggest');
        if (!input || !suggest) return;

        input.oninput = (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (!val) { suggest.style.display = 'none'; return; }
            
            const searchWords = val.split(/\s+/);
            const matches = this.vendors.filter(v => {
                const searchStr = `${v.code} ${v.name} ${v.address || ''}`.toLowerCase();
                return searchWords.every(word => searchStr.includes(word));
            }).slice(0, 15);

            if (matches.length > 0) {
                suggest.innerHTML = matches.map(v => `<div onclick="window.PRModule.selectVendor(${v.id})" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;"><b>${v.code}</b> - ${v.name}</div>`).join('');
                suggest.style.display = 'block';
                suggest.style.zIndex = '9999';
            } else { 
                suggest.style.display = 'none'; 
            }
        };
        document.addEventListener('click', (e) => { if (e.target !== input) suggest.style.display = 'none'; });
    },

    selectVendor: async function(coaId) {
        const v = this.vendors.find(x => x.id == coaId || x.coa_list_id == coaId);
        if (v) {
            document.getElementById('vendor_code').value = v.code;
            document.getElementById('vendor_name').value = v.name;
            document.getElementById('vendor_address').value = v.address || '';
            document.getElementById('vendor_tel').value = v.telephone || '';
            document.getElementById('vendor_gst').value = v.st_reg_no || '';
            document.getElementById('vendor_ntn').value = v.ntn_cnic || '';
            this.selectedVendorCoaId = v.id;
            
            try {
                const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const res = await fetch(`api/maintain.php?action=get_coa_balance&coa_id=${coaId}&fy_id=${session.fy_id || 0}`);
                const bal = await res.json();
                const balEl = document.getElementById('vendor_balance');
                if (balEl) balEl.value = parseFloat(bal.balance || 0).toFixed(2);
            } catch(e) { console.error("Balance fetch error:", e); }
        }
        document.getElementById('vendor_suggest').style.display = 'none';
        document.getElementById('pr_date').focus();
    },

    // --- GRID LOGIC ---
    addRow: function(data = {}) {
        const tbody = document.getElementById('prGridBody');
        const rowIndex = tbody.children.length;
        const tr = document.createElement('tr');
        tr.dataset.index = rowIndex;
        
        tr.innerHTML = `
            <td style="text-align:center; font-size:10px; color:#64748b;">${rowIndex + 1}</td>
            <td>
                <input type="text" class="grid-input item-code-search" placeholder="" value="${data.item_code || data.code || ''}">
                <div class="pr-suggest grid-suggest"></div>
            </td>
            <td><input type="text" class="grid-input" value="${data.description || data.name || ''}" readonly></td>
            <td><input type="text" class="grid-input num pieces" value="${(data.pieces && parseFloat(data.pieces) !== 0) ? data.pieces : ''}"></td>
            <td><input type="text" class="grid-input num qty" value="${(data.quantity && parseFloat(data.quantity) !== 0) ? data.quantity : ''}"></td>
            <td><input type="text" class="grid-input" value="${data.unit || ''}" readonly></td>
            <td><input type="text" class="grid-input num rate" value="${(data.rate && parseFloat(data.rate) !== 0) ? data.rate : ''}"></td>
            <td><input type="text" class="grid-input num val-excl" value="${(data.value_excl_tax && parseFloat(data.value_excl_tax) !== 0) ? data.value_excl_tax : ''}" readonly></td>
            <td><input type="text" class="grid-input num tax-rate" value="${(data.tax_rate && parseFloat(data.tax_rate) !== 0) ? data.tax_rate : ''}"></td>
            <td><input type="text" class="grid-input num tax-amt" value="${(data.tax_amount && parseFloat(data.tax_amount) !== 0) ? data.tax_amount : ''}" readonly></td>
            <td><input type="text" class="grid-input num frth-rate" value="${(data.further_tax_rate && parseFloat(data.further_tax_rate) !== 0) ? data.further_tax_rate : ''}"></td>
            <td><input type="text" class="grid-input num frth-amt" value="${(data.further_tax_amount && parseFloat(data.further_tax_amount) !== 0) ? data.further_tax_amount : ''}" readonly></td>
            <td><input type="text" class="grid-input num val-incl" value="${(data.value_incl_tax && parseFloat(data.value_incl_tax) !== 0) ? data.value_incl_tax : ''}" readonly></td>
        `;
        tbody.appendChild(tr);
        if (data.item_coa_id) { tr.dataset.coaId = data.item_coa_id; }
        this.setupGridEvents(tr);
    },

    setupGridEvents: function(tr) {
        const idx = tr.dataset.index;
        const codeInput = tr.querySelector('.item-code-search');
        const suggest = tr.querySelector('.grid-suggest');
        
        codeInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (!val) { suggest.style.display = 'none'; } 
            else {
                const searchWords = val.split(/\s+/);
                const matches = this.inventory.filter(i => {
                    const searchStr = `${i.code} ${i.name} ${i.unit || ''}`.toLowerCase();
                    return searchWords.every(word => searchStr.includes(word));
                }).slice(0, 15);
                
                if (matches.length > 0) {
                    suggest.innerHTML = matches.map(i => `
                        <div onclick="window.PRModule.selectGridItem(${idx}, ${i.coa_list_id})" 
                             style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;">
                             <b>${i.code}</b> - ${i.name} <small style="color:#64748b;">(${i.unit || 'Pcs'})</small>
                        </div>
                    `).join('');
                    suggest.style.display = 'block';
                    suggest.style.zIndex = '9999';
                } else { suggest.style.display = 'none'; }
            }
            const tbody = document.getElementById('prGridBody');
            if (tr === tbody.lastElementChild && val !== '') { this.addRow(); }
        });

        tr.querySelectorAll('input.num').forEach(input => {
            input.oninput = () => this.calculateRow(idx);
        });

        document.addEventListener('click', (e) => { if (e.target !== codeInput) suggest.style.display = 'none'; });
    },

    selectGridItem: function(rowIndex, coaId) {
        const item = this.inventory.find(x => x.coa_list_id == coaId);
        const tr = document.querySelector(`#prGridBody tr[data-index="${rowIndex}"]`);
        if (item && tr) {
            tr.dataset.coaId = item.coa_list_id;
            tr.querySelector('.item-code-search').value = item.code;
            tr.cells[2].querySelector('input').value = item.name;
            tr.cells[5].querySelector('input').value = item.unit || 'Pcs';
            tr.querySelector('.rate').value = (item.purchase_price && parseFloat(item.purchase_price) !== 0) ? item.purchase_price : '';
            tr.querySelector('.tax-rate').value = (item.tax_rate && parseFloat(item.tax_rate) !== 0) ? item.tax_rate : '';
            this.calculateRow(rowIndex);
            
            const nextInput = tr.querySelector('.pieces');
            if (nextInput) nextInput.focus();
        }
        const suggest = tr.querySelector('.grid-suggest');
        if (suggest) suggest.style.display = 'none';
    },

    calculateRow: function(rowIndex) {
        const tr = document.querySelector(`#prGridBody tr[data-index="${rowIndex}"]`);
        if (!tr) return;

        const pieces = parseFloat(tr.querySelector('.pieces').value) || 0;
        const qty = parseFloat(tr.querySelector('.qty').value) || 0;
        const rate = parseFloat(tr.querySelector('.rate').value) || 0;
        const taxRate = parseFloat(tr.querySelector('.tax-rate').value) || 0;
        const frthRate = parseFloat(tr.querySelector('.frth-rate').value) || 0;

        const valExcl = qty * rate;
        const taxAmt = (valExcl * taxRate) / 100;
        const frthAmt = (valExcl * frthRate) / 100;
        const valIncl = valExcl + taxAmt + frthAmt;

        const setVal = (sel, val) => {
            const el = tr.querySelector(sel);
            if (el) el.value = (val && val != 0) ? val.toFixed(2) : '';
        };

        setVal('.val-excl', valExcl);
        setVal('.tax-amt', taxAmt);
        setVal('.frth-amt', frthAmt);
        setVal('.val-incl', valIncl);

        this.calculateTotals();
    },

    calculateTotals: function() {
        let tPieces = 0, tQty = 0, tExcl = 0, tTax = 0, tFrth = 0, tIncl = 0;
        
        document.querySelectorAll('#prGridBody tr').forEach(tr => {
            tPieces += parseFloat(tr.querySelector('.pieces').value) || 0;
            tQty += parseFloat(tr.querySelector('.qty').value) || 0;
            tExcl += parseFloat(tr.querySelector('.val-excl').value) || 0;
            tTax += parseFloat(tr.querySelector('.tax-amt').value) || 0;
            tFrth += parseFloat(tr.querySelector('.frth-amt').value) || 0;
            tIncl += parseFloat(tr.querySelector('.val-incl').value) || 0;
        });

        const setTot = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val > 0 ? val.toFixed(2) : '0.00';
        };

        setTot('tot_pieces', tPieces);
        setTot('tot_qty', tQty);
        setTot('tot_excl', tExcl);
        setTot('tot_tax', tTax);
        setTot('tot_further', tFrth);
        setTot('tot_incl', tIncl);

        // Net Total = Total Incl + Carriage
        const carriage = parseFloat(document.getElementById('pr_carriage').value) || 0;
        const netTotal = tIncl + carriage;
        const netEl = document.getElementById('pr_net_total');
        if (netEl) netEl.value = netTotal.toFixed(2);

        document.getElementById('pr_amt_words').innerText = `Rupees ${netTotal.toFixed(2)} only.`;
    },

    setupKeyboardNav: function() {
        const container = document.getElementById('purchaseReturnContainer');
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const active = document.activeElement;
                if (!active) return;

                // If in grid
                if (active.classList.contains('grid-input')) {
                    e.preventDefault();
                    const tr = active.closest('tr');
                    const td = active.closest('td');
                    const rowIndex = parseInt(tr.dataset.index);
                    const cellIndex = td.cellIndex;

                    const nextCell = tr.cells[cellIndex + 1];
                    if (nextCell) {
                        const input = nextCell.querySelector('input');
                        if (input) {
                            if (input.readOnly) {
                                // Skip read-only
                                const nextNextCell = tr.cells[cellIndex + 2];
                                if (nextNextCell) {
                                    const nextInput = nextNextCell.querySelector('input');
                                    if (nextInput) nextInput.focus();
                                }
                            } else {
                                input.focus();
                            }
                        }
                    } else {
                        // Move to next row
                        const nextTr = tr.nextElementSibling;
                        if (nextTr) {
                            const firstInput = nextTr.querySelector('.item-code-search');
                            if (firstInput) firstInput.focus();
                        }
                    }
                } else if (active.classList.contains('pr-input')) {
                    // Normal header inputs
                    e.preventDefault();
                    const inputs = Array.from(container.querySelectorAll('.pr-input, .item-code-search')).filter(i => !i.readOnly && i.type !== 'hidden');
                    const idx = inputs.indexOf(active);
                    if (idx > -1 && idx < inputs.length - 1) {
                        inputs[idx + 1].focus();
                    }
                }
            }
            
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveReturn();
            }
        });

        const carriageInput = document.getElementById('pr_carriage');
        if (carriageInput) {
            carriageInput.oninput = () => this.calculateTotals();
        }
    },

    resetForm: async function(isNew = false) {
        this.currentId = null;
        this.selectedVendorCoaId = null;
        
        const inputs = ['pr_sn', 'pr_date', 'pr_purchase_no', 'pr_purchase_date', 'pr_vendor_inv_no', 'pr_vendor_inv_date', 
                       'pr_nature_dn', 'pr_payment_terms', 'pr_expense_account', 'pr_job_no', 'pr_employee_ref', 
                       'pr_remarks', 'pr_carriage', 'pr_net_total', 'vendor_code', 'vendor_name', 'vendor_address', 
                       'vendor_tel', 'vendor_gst', 'vendor_ntn', 'vendor_balance'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = (id === 'pr_carriage' || id === 'pr_net_total') ? '0.00' : '';
        });
        document.getElementById('pr_is_cancelled').checked = false;
        document.getElementById('prGridBody').innerHTML = '';
        for (let i = 0; i < 8; i++) { this.addRow(); }

        if (isNew) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = session.company_id || 1;
            const res = await fetch(`api/purchases.php?action=get_next_return_serial&company_id=${companyId}`);
            const data = await res.json();
            document.getElementById('pr_sn').value = data.next_sn;
            document.getElementById('pr_date').value = new Date().toISOString().split('T')[0];
        }
        this.calculateTotals();
    },

    saveReturn: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;

        if (!this.selectedVendorCoaId) { alert("Please select a vendor."); return; }

        const items = [];
        document.querySelectorAll('#prGridBody tr').forEach(tr => {
            const coaId = tr.dataset.coaId;
            if (coaId) {
                items.push({
                    item_coa_id: coaId,
                    description: tr.cells[2].querySelector('input').value,
                    pieces: tr.querySelector('.pieces').value,
                    quantity: tr.querySelector('.qty').value,
                    unit: tr.cells[5].querySelector('input').value,
                    rate: tr.querySelector('.rate').value,
                    value_excl_tax: tr.querySelector('.val-excl').value,
                    tax_rate: tr.querySelector('.tax-rate').value,
                    tax_amount: tr.querySelector('.tax-amt').value,
                    further_tax_rate: tr.querySelector('.frth-rate').value,
                    further_tax_amount: tr.querySelector('.frth-amt').value,
                    value_incl_tax: tr.querySelector('.val-incl').value
                });
            }
        });

        if (items.length === 0) { alert("Please add at least one item."); return; }

        const payload = {
            id: this.currentId,
            serial_no: document.getElementById('pr_sn').value,
            return_date: document.getElementById('pr_date').value,
            purchase_no: document.getElementById('pr_purchase_no').value,
            purchase_date: document.getElementById('pr_purchase_date').value,
            vendor_invoice_no: document.getElementById('pr_vendor_inv_no').value,
            vendor_invoice_date: document.getElementById('pr_vendor_inv_date').value,
            nature_of_debit_note: document.getElementById('pr_nature_dn').value,
            payment_terms: document.getElementById('pr_payment_terms').value,
            expense_account: document.getElementById('pr_expense_account').value,
            vendor_coa_id: this.selectedVendorCoaId,
            job_no: document.getElementById('pr_job_no').value,
            employee_ref: document.getElementById('pr_employee_ref').value,
            remarks: document.getElementById('pr_remarks').value,
            carriage_freight: document.getElementById('pr_carriage').value,
            net_total: document.getElementById('pr_net_total').value,
            is_cancelled: document.getElementById('pr_is_cancelled').checked ? 1 : 0,
            amount_in_words: document.getElementById('pr_amt_words').innerText,
            items: items
        };

        try {
            const res = await fetch(`api/purchases.php?action=save_return&company_id=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                alert("Purchase Return saved successfully!");
                this.resetForm(true);
            } else { alert("Save Error: " + result.message); }
        } catch (e) { console.error("Save Return Error:", e); }
    },

    loadReturnData: function(ret) {
        this.currentId = ret.id;
        document.getElementById('pr_sn').value = ret.serial_no;
        document.getElementById('pr_date').value = ret.return_date;
        document.getElementById('pr_purchase_no').value = ret.purchase_no || '';
        document.getElementById('pr_purchase_date').value = ret.purchase_date || '';
        document.getElementById('pr_vendor_inv_no').value = ret.vendor_invoice_no || '';
        document.getElementById('pr_vendor_inv_date').value = ret.vendor_invoice_date || '';
        document.getElementById('pr_nature_dn').value = ret.nature_of_debit_note || 'Damaged Goods';
        document.getElementById('pr_payment_terms').value = ret.payment_terms || '';
        document.getElementById('pr_expense_account').value = ret.expense_account || '';
        document.getElementById('pr_job_no').value = ret.job_no || '';
        document.getElementById('pr_employee_ref').value = ret.employee_ref || '';
        document.getElementById('pr_remarks').value = ret.remarks || '';
        document.getElementById('pr_carriage').value = ret.carriage_freight || '0.00';
        document.getElementById('pr_is_cancelled').checked = parseInt(ret.is_cancelled) === 1;

        if (ret.vendor_coa_id) { this.selectVendor(ret.vendor_coa_id); }

        const tbody = document.getElementById('prGridBody');
        tbody.innerHTML = '';
        if (ret.items && ret.items.length > 0) {
            ret.items.forEach(item => this.addRow(item));
        }
        while (tbody.children.length < 8) { this.addRow(); }
        this.calculateTotals();
    },

    navigate: async function(dir) {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        let sn = parseInt(document.getElementById('pr_sn').value);
        sn = (dir === 'next') ? sn + 1 : sn - 1;
        if (sn < 1) return;

        try {
            const res = await fetch(`api/purchases.php?action=get_return&serial_no=${sn}&company_id=${companyId}`);
            const ret = await res.json();
            if (ret && ret.id) { this.loadReturnData(ret); } 
            else if (dir === 'next') { this.resetForm(true); }
        } catch (e) { console.error("Navigation Error:", e); }
    },

    deleteReturn: async function() {
        if (!this.currentId) return;
        if (!confirm("Delete this Return?")) return;
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/purchases.php?action=delete_return&id=${this.currentId}&company_id=${companyId}`, { method: 'POST' });
            const result = await res.json();
            if (result.status === 'success') { this.resetForm(true); }
        } catch (e) { console.error("Delete Error:", e); }
    },

    printReturn: function() {
        if (!this.currentId) { alert("Please save or load a record first."); return; }
        window.print(); // Simple print for now
    }
};
