// --- PURCHASE ORDER MODULE LOGIC ---
window.POModule = {
    vendors: [],
    inventory: [],
    employees: [],
    jobs: [],
    currentId: null,
    gridData: [], // Array of row objects

    init: async function() {
        console.log("PO Module: Initializing...");
        await Promise.all([
            this.loadVendors(),
            this.loadInventory(),
            this.loadEmployees(),
            this.loadJobs()
        ]);
        this.setupVendorSearch();
        this.resetForm(true);
        this.setupKeyboardNav();
    },

    loadVendors: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        console.log("PO Module: Fetching Vendors...");
        try {
            // Stage 1: Try VND
            let res = await fetch(`api/maintain.php?action=get_vendors&sub_id=VND&company_id=${companyId}`);
            this.vendors = await res.json();
            
            // Stage 2: Try SUP if empty
            if (!this.vendors || this.vendors.length === 0) {
                console.log("PO Module: No VND, trying SUP...");
                res = await fetch(`api/maintain.php?action=get_vendors&sub_id=SUP&company_id=${companyId}`);
                this.vendors = await res.json();
            }
            
            // Stage 3: Try generic coa_list if still empty
            if (!this.vendors || this.vendors.length === 0) {
                console.log("PO Module: Still empty, trying generic search...");
                res = await fetch(`api/maintain.php?action=get_vendors&company_id=${companyId}`); // might work if PHP handles it
                const backup = await res.json();
                if (backup && backup.length > 0) this.vendors = backup;
            }
            
            console.log("PO Module: Final Vendors loaded:", this.vendors.length);
        } catch (e) { console.error("PO Module: Load Vendors Error:", e); }
    },

    loadInventory: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/inventory.php?action=get_all_items&company_id=${companyId}`);
            this.inventory = await res.json();
            console.log("PO Module: Inventory loaded:", this.inventory.length);
        } catch (e) { console.error("PO Module: Load Inventory Error:", e); }
    },

    loadEmployees: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/maintain.php?action=get_employees&company_id=${companyId}`);
            this.employees = await res.json();
            const select = document.getElementById('po_employee_ref');
            if (select) {
                select.innerHTML = '<option value="">Select Employee</option>';
                this.employees.forEach(e => select.innerHTML += `<option value="${e.id}">${e.name}</option>`);
            }
        } catch (e) { console.error("PO Module: Load Employees Error:", e); }
    },

    loadJobs: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/jobs.php?action=get_jobs&company_id=${companyId}`);
            this.jobs = await res.json();
            const select = document.getElementById('po_job_ref');
            if (select) {
                select.innerHTML = '<option value="">Select Job</option>';
                this.jobs.forEach(j => select.innerHTML += `<option value="${j.id}">${j.job_no} - ${j.description}</option>`);
            }
        } catch (e) { console.error("PO Module: Load Jobs Error:", e); }
    },

    setupVendorSearch: function() {
        const input = document.getElementById('vendor_code');
        const suggest = document.getElementById('vendor_suggest');
        if (!input || !suggest) return;

        input.oninput = (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (!val) { suggest.style.display = 'none'; return; }
            
            console.log("PO Module: Searching vendors for:", val);
            const searchWords = val.split(/\s+/);
            const matches = this.vendors.filter(v => {
                const searchStr = `${v.code} ${v.name} ${v.address || ''}`.toLowerCase();
                return searchWords.every(word => searchStr.includes(word));
            }).slice(0, 15);

            if (matches.length > 0) {
                suggest.innerHTML = matches.map(v => `<div onclick="window.POModule.selectVendor(${v.id})" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;"><b>${v.code}</b> - ${v.name}</div>`).join('');
                suggest.style.display = 'block';
                suggest.style.zIndex = '9999'; // Force on top
            } else { 
                console.log("PO Module: No matches found in", this.vendors.length, "vendors");
                suggest.style.display = 'none'; 
            }
        };
        // Close on blur or outside click
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
        document.getElementById('po_date').focus();
    },

    // --- GRID LOGIC ---
    addRow: function(data = {}) {
        const tbody = document.getElementById('poGridBody');
        const rowIndex = tbody.children.length;
        const tr = document.createElement('tr');
        tr.dataset.index = rowIndex;
        
        tr.innerHTML = `
            <td style="text-align:center; font-size:10px; color:#64748b; border: 1px solid #cbd5e0;">${rowIndex + 1}</td>
            <td style="border: 1px solid #cbd5e0;">
                <input type="text" class="grid-input item-code-search" placeholder="" value="${data.item_code || ''}">
                <div class="po-suggest grid-suggest"></div>
            </td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input" value="${data.description || ''}" readonly></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num pieces" value="${(data.pieces && parseFloat(data.pieces) !== 0) ? data.pieces : ''}"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num qty" value="${(data.quantity && parseFloat(data.quantity) !== 0) ? data.quantity : ''}"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input" value="${data.unit || ''}" readonly></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num rate" value="${(data.rate && parseFloat(data.rate) !== 0) ? data.rate : ''}"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num val-excl" value="${(data.value_excl_tax && parseFloat(data.value_excl_tax) !== 0) ? data.value_excl_tax : ''}" readonly></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num tax-rate" value="${(data.tax_rate && parseFloat(data.tax_rate) !== 0) ? data.tax_rate : ''}"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num tax-amt" value="${(data.tax_amount && parseFloat(data.tax_amount) !== 0) ? data.tax_amount : ''}" readonly></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num frth-rate" value="${(data.further_tax_rate && parseFloat(data.further_tax_rate) !== 0) ? data.further_tax_rate : ''}"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num frth-amt" value="${(data.further_tax_amount && parseFloat(data.further_tax_amount) !== 0) ? data.further_tax_amount : ''}" readonly></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num val-incl" value="${(data.value_incl_tax && parseFloat(data.value_incl_tax) !== 0) ? data.value_incl_tax : ''}" readonly></td>
        `;
        tbody.appendChild(tr);
        if (data.item_coa_id) {
            tr.dataset.coaId = data.item_coa_id;
        }
        this.setupGridEvents(tr);
    },

    setupGridEvents: function(tr) {
        const idx = tr.dataset.index;
        const codeInput = tr.querySelector('.item-code-search');
        const suggest = tr.querySelector('.grid-suggest');
        
        // --- Combined Input Handler (Autocomplete + AutoRow) ---
        codeInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            
            // 1. Autocomplete Logic
            if (!val) { 
                suggest.style.display = 'none'; 
            } else {
                const searchWords = val.split(/\s+/);
                const matches = this.inventory.filter(i => {
                    const searchStr = `${i.code} ${i.name} ${i.unit || ''}`.toLowerCase();
                    return searchWords.every(word => searchStr.includes(word));
                }).slice(0, 15);
                
                if (matches.length > 0) {
                    suggest.innerHTML = matches.map(i => `
                        <div onclick="window.POModule.selectGridItem(${idx}, ${i.coa_list_id})" 
                             style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;">
                             <b>${i.code}</b> - ${i.name} <small style="color:#64748b;">(${i.unit || 'Pcs'})</small>
                        </div>
                    `).join('');
                    suggest.style.display = 'block';
                    suggest.style.zIndex = '9999';
                } else { 
                    suggest.style.display = 'none'; 
                }
            }

            // 2. Auto-Row Expansion Logic
            const tbody = document.getElementById('poGridBody');
            if (tr === tbody.lastElementChild && val !== '') {
                this.addRow();
            }
        });

        // Calculations on Input
        tr.querySelectorAll('input.num').forEach(input => {
            input.oninput = () => this.calculateRow(idx);
        });

        // Add Enter key listener for navigation/expansion
        tr.querySelectorAll('input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (tr === document.getElementById('poGridBody').lastElementChild) {
                        this.addRow();
                    }
                    // Optional: focus next row or pieces input
                }
            });
        });

        // Close suggestions on outside click
        document.addEventListener('click', (e) => { if (e.target !== codeInput) suggest.style.display = 'none'; });
    },

    selectGridItem: function(rowIndex, coaId) {
        const item = this.inventory.find(x => x.coa_list_id == coaId);
        const tr = document.querySelector(`#poGridBody tr[data-index="${rowIndex}"]`);
        if (item && tr) {
            tr.dataset.coaId = item.coa_list_id;
            tr.querySelector('.item-code-search').value = item.code;
            tr.cells[2].querySelector('input').value = item.name;
            tr.cells[5].querySelector('input').value = item.unit || 'Pcs';
            tr.querySelector('.rate').value = (item.selling_price && parseFloat(item.selling_price) !== 0) ? item.selling_price : '';
            tr.querySelector('.tax-rate').value = (item.tax_rate && parseFloat(item.tax_rate) !== 0) ? item.tax_rate : '';
            this.calculateRow(rowIndex);
            
            // Move focus to Pieces
            const piecesInput = tr.querySelector('.pieces');
            if (piecesInput) piecesInput.focus();
        }
        const suggest = tr.querySelector('.grid-suggest');
        if (suggest) suggest.style.display = 'none';
    },

    findPO: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        const sn = prompt("Enter PO Serial Number to Find:");
        if (!sn) return;

        try {
            const res = await fetch(`api/purchases.php?action=get_po&serial_no=${sn}&company_id=${companyId}`);
            const po = await res.json();
            if (po && po.id) {
                this.loadPOData(po);
            } else {
                alert("PO Not Found!");
            }
        } catch (e) { console.error("Find PO Error:", e); }
    },

    loadPOData: function(po) {
        this.currentId = po.id;
        document.getElementById('po_sn').value = po.serial_no;
        document.getElementById('po_date').value = po.po_date;
        document.getElementById('po_delivery_date').value = po.delivery_date;
        document.getElementById('po_payment_terms').value = po.payment_terms;
        document.getElementById('po_job_ref').value = po.job_id || '';
        document.getElementById('po_employee_ref').value = po.employee_id || '';
        document.getElementById('po_terms').value = po.terms_conditions || '';
        document.getElementById('po_remarks').value = po.remarks || '';
        document.getElementById('po_is_cancelled').checked = parseInt(po.is_cancelled) === 1;

        // Load Vendor Info
        const vendor = this.vendors.find(v => v.id == po.vendor_coa_id || v.coa_list_id == po.vendor_coa_id);
        if (vendor) {
            this.selectVendor(po.vendor_coa_id);
        }

        // Load Items
        const tbody = document.getElementById('poGridBody');
        tbody.innerHTML = '';
        if (po.items && po.items.length > 0) {
            po.items.forEach(item => this.addRow(item));
        }
        
        // Ensure at least 8 rows
        const currentRows = tbody.children.length;
        if (currentRows < 8) {
            for (let i = 0; i < (8 - currentRows); i++) {
                this.addRow();
            }
        }
        this.calculateTotals();
    },

    calculateRow: function(rowIndex) {
        const tr = document.querySelector(`#poGridBody tr[data-index="${rowIndex}"]`);
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
        
        document.querySelectorAll('#poGridBody tr').forEach(tr => {
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

        this.updateAmountInWords(tIncl);
    },

    updateAmountInWords: function(amount) {
        // Simple conversion for demo, can be enhanced
        document.getElementById('po_amt_words').innerText = `Rupees ${amount.toFixed(2)} only.`;
    },

    setupKeyboardNav: function() {
        document.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            if (!active || !active.classList.contains('grid-input')) return;

            const tr = active.closest('tr');
            const rowIndex = parseInt(tr.dataset.index);
            const cellIndex = active.closest('td').cellIndex;

            if (e.key === 'Enter') {
                e.preventDefault();
                // Move to next cell
                const nextCell = tr.cells[cellIndex + 1];
                if (nextCell) {
                    const input = nextCell.querySelector('input');
                    if (input) {
                        if (input.readOnly) {
                             // Skip readonly, find next
                             const nextNextCell = tr.cells[cellIndex + 2];
                             if (nextNextCell) nextNextCell.querySelector('input')?.focus();
                        } else {
                            input.focus();
                        }
                    }
                } else {
                    // Move to next row
                    const nextTr = tr.nextElementSibling;
                    if (nextTr) nextTr.cells[1].querySelector('input').focus();
                }
            }

            if (e.key === 'ArrowDown') {
                 // Selection logic in suggest if open
                 const suggest = tr.querySelector('.grid-suggest');
                 if (suggest && suggest.style.display === 'block') {
                     // ... keyboard selection in suggest
                 }
            }
        });
    },

    resetForm: async function(isNew = false) {
        this.currentId = null;
        this.selectedVendorCoaId = null;
        
        // Reset Headers
        const inputs = ['vendor_code', 'vendor_name', 'vendor_address', 'vendor_tel', 'vendor_gst', 'vendor_ntn', 'vendor_balance',
                       'po_date', 'po_delivery_date', 'po_payment_terms', 'po_job_ref', 'po_employee_ref', 'po_terms', 'po_remarks'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('po_is_cancelled').checked = false;

        // Reset Grid with 8 rows
        document.getElementById('poGridBody').innerHTML = '';
        for (let i = 0; i < 8; i++) {
            this.addRow();
        }

        if (isNew) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = session.company_id || 1;
            const res = await fetch(`api/purchases.php?action=get_next_serial&company_id=${companyId}`);
            const data = await res.json();
            document.getElementById('po_sn').value = data.next_sn;
            document.getElementById('po_date').value = new Date().toISOString().split('T')[0];
        }
        this.calculateTotals();
    },

    savePO: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;

        if (!this.selectedVendorCoaId) { alert("Please select a vendor."); return; }

        const items = [];
        document.querySelectorAll('#poGridBody tr').forEach(tr => {
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
            serial_no: document.getElementById('po_sn').value,
            po_date: document.getElementById('po_date').value,
            delivery_date: document.getElementById('po_delivery_date').value,
            payment_terms: document.getElementById('po_payment_terms').value,
            job_ref: document.getElementById('po_job_ref').value,
            employee_ref_id: document.getElementById('po_employee_ref').value,
            vendor_coa_id: this.selectedVendorCoaId,
            total_pieces: document.getElementById('tot_pieces').value,
            total_qty: document.getElementById('tot_qty').value,
            total_excl_tax: document.getElementById('tot_excl').value,
            total_tax_amount: document.getElementById('tot_tax').value,
            total_further_tax: document.getElementById('tot_further').value,
            total_incl_tax: document.getElementById('tot_incl').value,
            amount_words: document.getElementById('po_amt_words').innerText,
            terms_conditions: document.getElementById('po_terms').value,
            remarks: document.getElementById('po_remarks').value,
            is_cancelled: document.getElementById('po_is_cancelled').checked ? 1 : 0,
            items: items
        };

        try {
            const res = await fetch(`api/purchases.php?action=save_po&company_id=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                alert("Purchase Order saved successfully!");
                this.resetForm(true);
            } else { alert("Save Error: " + result.message); }
        } catch (e) { console.error("Save PO Error:", e); }
    },

    navigate: async function(dir) {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        let sn = parseInt(document.getElementById('po_sn').value);
        sn = (dir === 'next') ? sn + 1 : sn - 1;
        if (sn < 1) return;

        try {
            const res = await fetch(`api/purchases.php?action=get_po&serial_no=${sn}&company_id=${companyId}`);
            const po = await res.json();
            if (po && po.id) {
                this.loadPOData(po);
            } else {
                if (dir === 'next') this.resetForm(true);
            }
        } catch (e) { console.error("Navigation Error:", e); }
    },

    deletePO: async function() {
        if (!this.currentId) {
            alert("No Purchase Order loaded to delete.");
            return;
        }
        
        if (!confirm("Are you sure you want to delete this Purchase Order? This action cannot be undone.")) {
            return;
        }

        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;

        try {
            const res = await fetch(`api/purchases.php?action=delete_po&id=${this.currentId}&company_id=${companyId}`, {
                method: 'POST'
            });
            const result = await res.json();
            
            if (result.status === 'success') {
                alert("Purchase Order deleted successfully.");
                this.resetForm(true);
            } else {
                alert("Error deleting PO: " + (result.message || 'Unknown error'));
            }
        } catch (e) {
            console.error("Delete PO Error:", e);
            alert("Failed to delete Purchase Order.");
        }
    },

    printPO: function() {
        if (!this.currentId) {
            alert("Please save or load a Purchase Order before printing.");
            return;
        }

        const sn = document.getElementById('po_sn').value;
        const poDate = document.getElementById('po_date').value;
        const delDate = document.getElementById('po_delivery_date').value;
        const payTerms = document.getElementById('po_payment_terms').value;
        
        const vCode = document.getElementById('vendor_code').value;
        const vName = document.getElementById('vendor_name').value;
        const vAddress = document.getElementById('vendor_address').value;
        const vTel = document.getElementById('vendor_tel').value;

        const totPieces = document.getElementById('tot_pieces').value;
        const totQty = document.getElementById('tot_qty').value;
        const totIncl = document.getElementById('tot_incl').value;
        const amtWords = document.getElementById('po_amt_words').innerText;
        const remarks = document.getElementById('po_remarks').value;

        // Collect items
        let itemsHtml = '';
        
        // Get company details
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companies = JSON.parse(localStorage.getItem('softifyx_companies') || '[]');
        const company = companies.find(c => c.id == session.company_id) || {};
        const coName = company.name || session.company_name || 'SOFTIFYX TECHNOLOGIES';
        const coAddress = company.address || '';
        const coPhone = company.phone || '';
        
        document.querySelectorAll('#poGridBody tr').forEach((tr, index) => {
            const code = tr.querySelector('.item-code-search').value;
            if (!code) return; // Skip empty rows
            
            const desc = tr.cells[2].querySelector('input').value;
            const pieces = tr.querySelector('.pieces').value;
            const qty = tr.querySelector('.qty').value;
            const unit = tr.cells[5].querySelector('input').value;
            const rate = tr.querySelector('.rate').value;
            const valExcl = tr.querySelector('.val-excl').value;
            const taxAmt = tr.querySelector('.tax-amt').value;
            const valIncl = tr.querySelector('.val-incl').value;
            
            itemsHtml += `
                <tr>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${index + 1}</td>
                    <td style="border:1px solid #000; padding:4px;">${code}</td>
                    <td style="border:1px solid #000; padding:4px;">${desc}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${pieces}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${qty} ${unit}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${rate}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${valExcl}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${taxAmt}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${valIncl}</td>
                </tr>
            `;
        });

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        const html = `
            <html>
            <head>
                <title>Purchase Order - ${sn}</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h2 { margin: 0; padding: 0; }
                    .details-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
                    .details-table td { padding: 4px; vertical-align: top; }
                    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
                    .grid-table th { border: 1px solid #000; padding: 4px; background: #f0f0f0; text-align: center; }
                    .totals { text-align: right; margin-top: 20px; font-weight: bold; }
                    .footer { margin-top: 40px; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${coName}</h2>
                    <p style="margin: 5px 0;">${coAddress}</p>
                    <p style="margin: 0 0 15px 0;">Phone: ${coPhone}</p>
                    <h3 style="margin: 15px 0 5px 0; text-decoration: underline;">PURCHASE ORDER</h3>
                    <p style="margin: 0;">Serial No: <b>${sn}</b></p>
                </div>
                
                <table class="details-table">
                    <tr>
                        <td width="50%">
                            <b>Vendor Details:</b><br>
                            Name: ${vName} (${vCode})<br>
                            Address: ${vAddress}<br>
                            Tel: ${vTel}
                        </td>
                        <td width="50%">
                            <b>Order Details:</b><br>
                            Date: ${poDate}<br>
                            Delivery Date: ${delDate}<br>
                            Payment Terms: ${payTerms}
                        </td>
                    </tr>
                </table>

                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Item Code</th>
                            <th>Description</th>
                            <th>Pieces</th>
                            <th>Quantity</th>
                            <th>Rate</th>
                            <th>Value Excl.</th>
                            <th>Tax Amt</th>
                            <th>Value Incl.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="3" style="text-align:right; border:1px solid #000;">TOTALS:</th>
                            <th style="border:1px solid #000; text-align:center;">${totPieces}</th>
                            <th style="border:1px solid #000; text-align:center;">${totQty}</th>
                            <th style="border:1px solid #000;"></th>
                            <th style="border:1px solid #000;"></th>
                            <th style="border:1px solid #000;"></th>
                            <th style="border:1px solid #000; text-align:right;">${totIncl}</th>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-bottom: 10px;">
                    <b>Amount in Words:</b> ${amtWords}
                </div>
                <div style="margin-bottom: 10px;">
                    <b>Remarks:</b> ${remarks}
                </div>

                <div class="footer">
                    <table width="100%">
                        <tr>
                            <td width="33%" style="text-align:center;">
                                <br><br><br>
                                _______________________<br>
                                Prepared By
                            </td>
                            <td width="33%" style="text-align:center;">
                                <br><br><br>
                                _______________________<br>
                                Checked By
                            </td>
                            <td width="33%" style="text-align:center;">
                                <br><br><br>
                                _______________________<br>
                                Authorized Signatory
                            </td>
                        </tr>
                    </table>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    }
};
