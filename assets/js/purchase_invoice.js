window.PIModule = {
    vendors: [],
    inventory: [],
    employees: [],
    jobs: [],
    currentId: null,

    init: async function() {
        console.log("PI Module: Initializing...");
        
        // 1. Reset form immediately to show grid lines
        this.resetForm(true);
        
        // 2. Load data in background to prevent hanging
        try {
            await Promise.all([
                this.loadVendors(),
                this.loadInventory(),
                this.loadEmployees(),
                this.loadJobs()
            ]);
            console.log("PI Module: Data loaded successfully.");
        } catch (err) {
            console.error("PI Module: Error loading background data:", err);
        }
        
        this.setupKeyboardShortcuts();
        this.setupVendorSearch();
        this.setupExpenseSearch();
        this.toggleTaxMode();
    },

    loadVendors: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            let res = await fetch(`api/maintain.php?action=get_vendors&sub_id=VND&company_id=${companyId}`);
            this.vendors = await res.json();
            if (!this.vendors || this.vendors.length === 0) {
                res = await fetch(`api/maintain.php?action=get_vendors&sub_id=SUP&company_id=${companyId}`);
                this.vendors = await res.json();
            }
            if (!this.vendors || this.vendors.length === 0) {
                res = await fetch(`api/maintain.php?action=get_vendors&company_id=${companyId}`);
                const backup = await res.json();
                if (backup) this.vendors = backup;
            }
        } catch (e) { console.error("PI Module: Load Vendors Error:", e); }
    },

    loadInventory: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/inventory.php?action=get_all_items&company_id=${companyId}`);
            this.inventory = await res.json();
        } catch (e) { console.error("PI Module: Load Inventory Error:", e); }
    },

    loadEmployees: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/maintain.php?action=get_employees&company_id=${companyId}`);
            this.employees = await res.json();
        } catch (e) {}
    },

    loadJobs: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/jobs.php?action=get_jobs&company_id=${companyId}`);
            this.jobs = await res.json();
        } catch (e) {}
    },

    setupKeyboardShortcuts: function() {
        const handler = (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveInvoice();
            }
        };
        document.removeEventListener('keydown', handler);
        document.addEventListener('keydown', handler);
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
                suggest.innerHTML = matches.map(v => 
                    `<div onclick="window.PIModule.selectVendor(${v.id})" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;">
                        <b>${v.code}</b> - ${v.name}
                    </div>`
                ).join('');
                suggest.style.display = 'block';
                suggest.style.zIndex = '9999';
            } else { suggest.style.display = 'none'; }
        };
        document.addEventListener('click', (e) => { if (e.target !== input) suggest.style.display = 'none'; });
    },

    selectVendor: async function(coaId) {
        const v = this.vendors.find(x => x.id == coaId || x.coa_list_id == coaId);
        if (v) {
            document.getElementById('vendor_code').value = v.code;
            document.getElementById('vendor_code').dataset.coaId = v.id;
            document.getElementById('vendor_name').value = v.name;
            document.getElementById('vendor_address').value = v.address || '';
            document.getElementById('vendor_tel').value = v.telephone || '';
            document.getElementById('vendor_gst').value = v.st_reg_no || '';
            document.getElementById('vendor_ntn').value = v.ntn_cnic || '';
            
            try {
                const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const res = await fetch(`api/maintain.php?action=get_coa_balance&coa_id=${coaId}&fy_id=${session.fy_id || 0}`);
                const bal = await res.json();
                document.getElementById('vendor_balance').value = parseFloat(bal.balance || 0).toFixed(2);
            } catch(e) {}
        }
        document.getElementById('vendor_suggest').style.display = 'none';
    },

    setupExpenseSearch: function() {
        const input = document.getElementById('expense_name');
        const suggest = document.getElementById('expense_suggest');
        if (!input || !suggest) return;

        input.oninput = async (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (val.length < 2) { suggest.style.display = 'none'; return; }

            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const res = await fetch(`api/admin.php?action=get_coa_list&company_id=${session.company_id || 1}`);
            const coa = await res.json();
            
            const matches = coa.filter(c => 
                (c.account_type === 'Expense' || c.account_type === 'Cost of Sales') &&
                (c.account_code.includes(val) || c.account_name.toLowerCase().includes(val.toLowerCase()))
            ).slice(0, 10);

            if (matches.length > 0) {
                suggest.innerHTML = matches.map(c => 
                    `<div onclick="window.PIModule.selectExpense('${c.account_code}', '${c.account_name}')" style="padding:5px; cursor:pointer; border-bottom:1px solid #eee;">
                        <b>${c.account_code}</b> - ${c.account_name}
                    </div>`
                ).join('');
                suggest.style.display = 'block';
            } else { suggest.style.display = 'none'; }
        };
        document.addEventListener('click', (e) => { if (e.target !== input) suggest.style.display = 'none'; });
    },

    selectExpense: function(code, name) {
        document.getElementById('expense_code').value = code;
        document.getElementById('expense_name').value = name;
        document.getElementById('expense_suggest').style.display = 'none';
    },

    addEmptyRow: function(data = {}) {
        const tbody = document.getElementById('piGridBody');
        if (!tbody) return;
        const rowIndex = tbody.children.length;
        const tr = document.createElement('tr');
        tr.dataset.index = rowIndex;
        if (data.item_coa_id) tr.dataset.coaId = data.item_coa_id;
        
        tr.innerHTML = `
            <td style="text-align: center; border: 1px solid #cbd5e0; font-size: 10px; color: #64748b;">${rowIndex + 1}</td>
            <td style="border: 1px solid #cbd5e0; position: relative;">
                <input type="text" class="grid-input item-code-search" value="${data.code || ''}">
                <div class="po-suggest grid-suggest"></div>
            </td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input" value="${data.name || data.description || ''}" readonly></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num pieces" value="${data.pieces || ''}"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num qty" value="${data.quantity || ''}"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input" value="${data.unit || ''}" readonly></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num rate" value="${data.rate || ''}"></td>
            
            <td class="pi-tax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num val-excl" value="${data.gross_amount || ''}" readonly></td>
            <td class="pi-tax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num stax-rate" value="${data.sales_tax_rate || ''}"></td>
            <td class="pi-tax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num stax-amt" value="${data.sales_tax_amount || ''}" readonly></td>
            <td class="pi-tax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num ftax-rate" value="${data.further_tax_rate || ''}"></td>
            <td class="pi-tax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num ftax-amt" value="${data.further_tax_amount || ''}" readonly></td>
            <td class="pi-tax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num val-incl" value="${data.net_amount || ''}" readonly></td>
            
            <td class="pi-nontax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num gross-amt" value="${data.gross_amount || ''}" readonly></td>
            <td class="pi-nontax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num disc-perc" value="${data.discount_percent || ''}"></td>
            <td class="pi-nontax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num disc-amt" value="${data.discount_amount || ''}"></td>
            <td class="pi-nontax-col" style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num net-amt" value="${data.net_amount || ''}" readonly></td>
        `;
        
        tbody.appendChild(tr);
        this.setupGridEvents(tr);
        this.toggleTaxMode();
    },

    setupGridEvents: function(tr) {
        const idx = tr.dataset.index;
        const codeInput = tr.querySelector('.item-code-search');
        const suggest = tr.querySelector('.grid-suggest');

        codeInput.oninput = (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (!val) { suggest.style.display = 'none'; return; }
            
            const searchWords = val.split(/\s+/);
            const matches = this.inventory.filter(i => {
                const searchStr = `${i.code} ${i.name}`.toLowerCase();
                return searchWords.every(word => searchStr.includes(word));
            }).slice(0, 15);

            if (matches.length > 0) {
                suggest.innerHTML = matches.map(i => 
                    `<div onclick="window.PIModule.selectGridItem(${idx}, ${i.id})" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;">
                        <b>${i.code}</b> - ${i.name}
                    </div>`
                ).join('');
                suggest.style.display = 'block';
                suggest.style.zIndex = '9999';
            } else { suggest.style.display = 'none'; }

            const tbody = document.getElementById('piGridBody');
            if (tr === tbody.lastElementChild && val !== '') {
                this.addEmptyRow();
            }
        };

        tr.querySelectorAll('input.num').forEach(input => {
            input.oninput = () => this.calculateRow(tr);
        });

        document.addEventListener('click', (e) => { if (e.target !== codeInput) suggest.style.display = 'none'; });
    },

    selectGridItem: function(rowIndex, id) {
        const item = this.inventory.find(x => x.id == id);
        const tr = document.querySelector(`#piGridBody tr[data-index="${rowIndex}"]`);
        if (item && tr) {
            tr.dataset.coaId = item.id;
            tr.querySelector('.item-code-search').value = item.code;
            tr.cells[2].querySelector('input').value = item.name;
            tr.cells[5].querySelector('input').value = item.unit || 'Pcs';
            tr.querySelector('.rate').focus();
            this.calculateRow(tr);
        }
        const suggest = tr.querySelector('.grid-suggest');
        if (suggest) suggest.style.display = 'none';
    },

    calculateRow: function(tr) {
        const qty = parseFloat(tr.querySelector('.qty').value) || 0;
        const rate = parseFloat(tr.querySelector('.rate').value) || 0;
        const isTax = document.getElementById('pi_is_tax').checked;
        const gross = qty * rate;
        
        tr.querySelector('.val-excl').value = gross.toFixed(2);
        tr.querySelector('.gross-amt').value = gross.toFixed(2);
        
        if (isTax) {
            const stRate = parseFloat(tr.querySelector('.stax-rate').value) || 0;
            const ftRate = parseFloat(tr.querySelector('.ftax-rate').value) || 0;
            const stAmt = (gross * stRate) / 100;
            const ftAmt = (gross * ftRate) / 100;
            tr.querySelector('.stax-amt').value = stAmt.toFixed(2);
            tr.querySelector('.ftax-amt').value = ftAmt.toFixed(2);
            const net = gross + stAmt + ftAmt;
            tr.querySelector('.val-incl').value = net.toFixed(2);
            tr.querySelector('.net-amt').value = net.toFixed(2);
        } else {
            const discPerc = parseFloat(tr.querySelector('.disc-perc').value) || 0;
            const discAmt = (gross * discPerc) / 100;
            tr.querySelector('.disc-amt').value = discAmt.toFixed(2);
            const net = gross - discAmt;
            tr.querySelector('.net-amt').value = net.toFixed(2);
            tr.querySelector('.val-incl').value = net.toFixed(2);
        }
        this.calculateTotals();
    },

    calculateTotals: function() {
        let tPcs = 0, tQty = 0, tGross = 0, tStax = 0, tFtax = 0, tDisc = 0, tNet = 0;
        const rows = document.querySelectorAll('#piGridBody tr');
        rows.forEach(tr => {
            tPcs += parseFloat(tr.querySelector('.pieces').value) || 0;
            tQty += parseFloat(tr.querySelector('.qty').value) || 0;
            tGross += parseFloat(tr.querySelector('.val-excl').value) || 0;
            tStax += parseFloat(tr.querySelector('.stax-amt').value) || 0;
            tFtax += parseFloat(tr.querySelector('.ftax-amt').value) || 0;
            tDisc += parseFloat(tr.querySelector('.disc-amt').value) || 0;
            tNet += parseFloat(tr.querySelector('.val-incl').value) || 0;
        });

        document.getElementById('tot_pieces').value = tPcs.toFixed(2);
        document.getElementById('tot_qty').value = tQty.toFixed(2);
        document.getElementById('tot_excl').value = tGross.toFixed(2);
        document.getElementById('tot_stax').value = tStax.toFixed(2);
        document.getElementById('tot_ftax').value = tFtax.toFixed(2);
        document.getElementById('tot_incl').value = tNet.toFixed(2);
        document.getElementById('tot_gross').value = tGross.toFixed(2);
        document.getElementById('tot_disc').value = tDisc.toFixed(2);
        document.getElementById('tot_net').value = tNet.toFixed(2);
        
        const isTax = document.getElementById('pi_is_tax').checked;
        document.getElementById('pi_gross_tot').value = tGross.toFixed(2);
        const addDisc = parseFloat(document.getElementById('pi_add_disc').value) || 0;
        const freight = parseFloat(document.getElementById('pi_freight').value) || 0;
        const paid = parseFloat(document.getElementById('pi_paid').value) || 0;
        
        let finalNet = isTax ? (tNet + freight) : (tNet - addDisc + freight);
        document.getElementById('pi_net_tot').value = finalNet.toFixed(2);
        document.getElementById('pi_balance').value = (finalNet - paid).toFixed(2);
        
        try {
            document.getElementById('pi_amt_words').innerText = "Rupees " + Math.round(finalNet).toString() + " only.";
        } catch(e){}
    },

    toggleTaxMode: function() {
        const isTaxEl = document.getElementById('pi_is_tax');
        if (!isTaxEl) return;
        const isTax = isTaxEl.checked;
        const taxCols = document.querySelectorAll('.pi-tax-col, .pi-tax-field');
        const nonTaxCols = document.querySelectorAll('.pi-nontax-col');
        
        taxCols.forEach(el => el.style.display = isTax ? '' : 'none');
        nonTaxCols.forEach(el => el.style.display = isTax ? 'none' : '');
        this.calculateTotals();
    },

    resetForm: async function(fetchNext = false) {
        this.currentId = null;
        const container = document.getElementById('purchaseInvoiceContainer');
        if (!container) return;
        
        container.querySelectorAll('input:not(#expense_code):not(#expense_name), textarea').forEach(el => {
            if(el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });
        
        const dateEl = document.getElementById('pi_date');
        if (dateEl) dateEl.valueAsDate = new Date();
        
        const tbody = document.getElementById('piGridBody');
        if (tbody) {
            tbody.innerHTML = '';
            for(let i=0; i<8; i++) this.addEmptyRow();
        }
        
        if (fetchNext) {
            try {
                const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const res = await fetch(`api/purchases.php?action=get_next_invoice_serial&company_id=${session.company_id || 1}`);
                const data = await res.json();
                const snEl = document.getElementById('pi_sn');
                if (snEl) snEl.value = data.next_sn || 1;
            } catch(e) {}
        }
        this.toggleTaxMode();
    },

    saveInvoice: async function() {
        const vendorId = document.getElementById('vendor_code').dataset.coaId;
        if (!vendorId) return alert("Please select a valid Vendor!");

        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const payload = {
            id: this.currentId,
            serial_no: document.getElementById('pi_sn').value,
            is_tax_invoice: document.getElementById('pi_is_tax').checked,
            invoice_date: document.getElementById('pi_date').value,
            invoice_type: document.getElementById('pi_type').value,
            vendor_invoice_no: document.getElementById('pi_v_invoice_no').value,
            vendor_invoice_date: document.getElementById('pi_v_invoice_date').value,
            purchase_order_no: document.getElementById('pi_po_no').value,
            purchase_order_date: document.getElementById('pi_po_date').value,
            payment_terms: document.getElementById('pi_payment_terms').value,
            expense_account: document.getElementById('expense_code').value,
            vendor_coa_id: vendorId,
            inventory_location_id: document.getElementById('pi_location').value,
            job_no: document.getElementById('pi_job_desc').value,
            employee_ref: document.getElementById('pi_emp_ref').value,
            remarks: document.getElementById('pi_remarks').value,
            amount_in_words: document.getElementById('pi_amt_words').innerText,
            carriage_freight: document.getElementById('pi_freight').value,
            additional_discount: document.getElementById('pi_add_disc').value,
            net_total: document.getElementById('pi_net_tot').value,
            amount_paid: document.getElementById('pi_paid').value,
            items: []
        };

        document.querySelectorAll('#piGridBody tr').forEach(tr => {
            if (!tr.dataset.coaId) return;
            payload.items.push({
                item_coa_id: tr.dataset.coaId,
                description: tr.cells[2].querySelector('input').value,
                pieces: tr.querySelector('.pieces').value,
                quantity: tr.querySelector('.qty').value,
                unit: tr.cells[5].querySelector('input').value,
                rate: tr.querySelector('.rate').value,
                gross_amount: tr.querySelector('.val-excl').value,
                discount_percent: tr.querySelector('.disc-perc').value,
                discount_amount: tr.querySelector('.disc-amt').value,
                sales_tax_rate: tr.querySelector('.stax-rate').value,
                sales_tax_amount: tr.querySelector('.stax-amt').value,
                further_tax_rate: tr.querySelector('.ftax-rate').value,
                further_tax_amount: tr.querySelector('.ftax-amt').value,
                net_amount: tr.querySelector('.val-incl').value
            });
        });

        if (payload.items.length === 0) return alert("Please add at least one item!");

        try {
            const res = await fetch(`api/purchases.php?action=save_invoice&company_id=${session.company_id || 1}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') { alert("Saved!"); this.resetForm(true); }
            else { alert("Error: " + result.message); }
        } catch (e) { alert("Failed to save."); }
    },

    navigate: async function(dir) {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        let snVal = document.getElementById('pi_sn').value;
        let sn = parseInt(snVal) || 0;
        
        console.log("PI Module: Navigating", dir, "from SN", sn);

        if (sn === 0 || isNaN(sn)) {
            const res = await fetch(`api/purchases.php?action=get_next_invoice_serial&company_id=${companyId}`);
            const data = await res.json();
            sn = data.next_sn || 1;
            if (dir === 'prev') sn--; 
        } else {
            if (dir === 'next') sn++;
            else sn--;
        }
        
        if (sn < 1) return alert("Reached beginning of records.");

        try {
            const res = await fetch(`api/purchases.php?action=get_invoice&serial_no=${sn}&company_id=${companyId}`);
            const inv = await res.json();
            
            if (inv && inv.id) {
                this.loadInvoiceData(inv);
            } else {
                if (dir === 'next') {
                    alert("This is a new invoice number.");
                    this.resetForm(true);
                } else {
                    alert("No record found at Serial No: " + sn);
                }
            }
        } catch (e) {
            console.error("Navigation error:", e);
            alert("Error loading record. Please check connection.");
        }
    },

    loadInvoiceData: function(inv) {
        this.currentId = inv.id;
        document.getElementById('pi_sn').value = inv.serial_no;
        document.getElementById('pi_is_tax').checked = inv.is_tax_invoice == 1;
        document.getElementById('pi_date').value = inv.invoice_date || '';
        document.getElementById('pi_type').value = inv.invoice_type || 'Purchase Invoice';
        document.getElementById('pi_v_invoice_no').value = inv.vendor_invoice_no || '';
        document.getElementById('pi_v_invoice_date').value = inv.vendor_invoice_date || '';
        document.getElementById('pi_po_no').value = inv.purchase_order_no || '';
        document.getElementById('pi_po_date').value = inv.purchase_order_date || '';
        document.getElementById('pi_payment_terms').value = inv.payment_terms || '';
        document.getElementById('expense_code').value = inv.expense_account || '';
        document.getElementById('pi_location').value = inv.inventory_location_id || '';
        document.getElementById('pi_job_desc').value = inv.job_no || '';
        document.getElementById('pi_emp_ref').value = inv.employee_ref || '';
        document.getElementById('pi_remarks').value = inv.remarks || '';
        document.getElementById('pi_freight').value = inv.carriage_freight || '0.00';
        document.getElementById('pi_add_disc').value = inv.additional_discount || '0.00';
        document.getElementById('pi_paid').value = inv.amount_paid || '0.00';

        if (inv.vendor_coa_id) this.selectVendor(inv.vendor_coa_id);

        const tbody = document.getElementById('piGridBody');
        tbody.innerHTML = '';
        if (inv.items && inv.items.length > 0) {
            inv.items.forEach(item => this.addEmptyRow(item));
        }
        while(tbody.children.length < 8) this.addEmptyRow();
        this.calculateTotals();
        this.toggleTaxMode();
    },

    deleteInvoice: async function() {
        if (!this.currentId) return alert("No Invoice loaded.");
        if (!confirm("Are you sure?")) return;
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        try {
            const res = await fetch(`api/purchases.php?action=delete_invoice&id=${this.currentId}&company_id=${session.company_id || 1}`, { method: 'POST' });
            const result = await res.json();
            if (result.status === 'success') { alert("Deleted!"); this.resetForm(true); }
        } catch (e) { alert("Failed."); }
    },

    printInvoice: function() {
        if (!this.currentId) return alert("Please save or load an invoice first.");

        const sn = document.getElementById('pi_sn').value;
        const date = document.getElementById('pi_date').value;
        const vCode = document.getElementById('vendor_code').value;
        const vName = document.getElementById('vendor_name').value;
        const vAddress = document.getElementById('vendor_address').value;
        const vTel = document.getElementById('vendor_tel').value;
        const isTax = document.getElementById('pi_is_tax').checked;
        const type = document.getElementById('pi_type').value;

        const totPieces = document.getElementById('tot_pieces').value;
        const totQty = document.getElementById('tot_qty').value;
        const totNet = document.getElementById('pi_net_tot').value;
        const amtWords = document.getElementById('pi_amt_words').innerText;
        const remarks = document.getElementById('pi_remarks').value;

        // Get company details
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companies = JSON.parse(localStorage.getItem('softifyx_companies') || '[]');
        const company = companies.find(c => c.id == session.company_id) || {};
        const coName = company.name || session.company_name || 'SOFTIFYX TECHNOLOGIES';
        const coAddress = company.address || '';
        const coPhone = company.phone || '';

        let itemsHtml = '';
        document.querySelectorAll('#piGridBody tr').forEach((tr, index) => {
            const code = tr.querySelector('.item-code-search').value;
            if (!code) return;

            const desc = tr.cells[2].querySelector('input').value;
            const pieces = tr.querySelector('.pieces').value;
            const qty = tr.querySelector('.qty').value;
            const unit = tr.cells[5].querySelector('input').value;
            const rate = tr.querySelector('.rate').value;
            
            let amountHtml = '';
            if (isTax) {
                const excl = tr.querySelector('.val-excl').value;
                const stax = tr.querySelector('.stax-amt').value;
                const ftax = tr.querySelector('.ftax-amt').value;
                const incl = tr.querySelector('.val-incl').value;
                amountHtml = `
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${excl}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${stax}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${ftax}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${incl}</td>
                `;
            } else {
                const gross = tr.querySelector('.gross-amt').value;
                const disc = tr.querySelector('.disc-amt').value;
                const net = tr.querySelector('.net-amt').value;
                amountHtml = `
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${gross}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${disc}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${net}</td>
                `;
            }

            itemsHtml += `
                <tr>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${index + 1}</td>
                    <td style="border:1px solid #000; padding:4px;">${code}</td>
                    <td style="border:1px solid #000; padding:4px;">${desc}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${pieces}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${qty} ${unit}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:right;">${rate}</td>
                    ${amountHtml}
                </tr>
            `;
        });

        const printWindow = window.open('', '_blank', 'width=900,height=600');
        const html = `
            <html>
            <head>
                <title>${type} - ${sn}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; margin: 20px; color: #333; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
                    .details-table { width: 100%; margin-bottom: 15px; border-collapse: collapse; }
                    .details-table td { padding: 3px; vertical-align: top; }
                    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    .grid-table th { border: 1px solid #000; padding: 5px; background: #f2f2f2; font-size: 10px; text-transform: uppercase; }
                    .grid-table td { border: 1px solid #000; padding: 4px; }
                    .footer-sig { margin-top: 50px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${coName}</h1>
                    <p style="margin: 3px 0;">${coAddress}</p>
                    <p style="margin: 0;">Phone: ${coPhone}</p>
                    <h2 style="margin: 10px 0 0 0; text-decoration: underline;">${type.toUpperCase()}</h2>
                </div>

                <table class="details-table">
                    <tr>
                        <td width="60%">
                            <b>Vendor:</b><br>
                            ${vName} (${vCode})<br>
                            ${vAddress}<br>
                            Tel: ${vTel}
                        </td>
                        <td width="40%" style="text-align: right;">
                            <b>Serial No:</b> ${sn}<br>
                            <b>Date:</b> ${date}<br>
                            <b>Invoice Type:</b> ${isTax ? 'Tax Invoice' : 'Non-Tax Invoice'}
                        </td>
                    </tr>
                </table>

                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item Code</th>
                            <th>Description</th>
                            <th>Pcs</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            ${isTax ? '<th>Value Excl</th><th>STax Amt</th><th>FTax Amt</th><th>Value Incl</th>' : '<th>Gross</th><th>Disc</th><th>Net</th>'}
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background: #f9f9f9;">
                            <td colspan="3" style="text-align: right;">TOTALS</td>
                            <td style="text-align: center;">${totPieces}</td>
                            <td style="text-align: center;">${totQty}</td>
                            <td></td>
                            <td colspan="${isTax ? 4 : 3}" style="text-align: right;">${totNet}</td>
                        </tr>
                    </tfoot>
                </table>

                <p><b>Amount in Words:</b> ${amtWords}</p>
                <p><b>Remarks:</b> ${remarks}</p>

                <div class="footer-sig">
                    <table width="100%">
                        <tr>
                            <td style="text-align: center; border-top: 1px solid #000; width: 30%; padding-top: 5px;">Prepared By</td>
                            <td style="width: 5%;"></td>
                            <td style="text-align: center; border-top: 1px solid #000; width: 30%; padding-top: 5px;">Checked By</td>
                            <td style="width: 5%;"></td>
                            <td style="text-align: center; border-top: 1px solid #000; width: 30%; padding-top: 5px;">Authorized Signatory</td>
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
