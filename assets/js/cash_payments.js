// --- CASH PAYMENTS MODULE LOGIC ---
window.CPModule = {
    jobs: [],
    employees: [],
    currentId: null,
    selectedCashCoaId: null,
    selectedPaidToCoaId: null,

    init: async function() {
        console.log("CP Module: Initializing...");
        this.resetForm(true);
        
        await this.loadJobs();
        await this.loadEmployees();
        this.setupSmartSearch('cp_cash_code', 'cp_cash_name', 'cp_cash_suggest', 'search_cash_accounts', 'cash');
        this.setupSmartSearch('cp_paid_to_code', 'cp_paid_to_name', 'cp_paid_to_suggest', 'search_parties', 'paid_to');
    },

    loadJobs: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        try {
            const res = await fetch(`api/jobs.php?action=get_jobs&company_id=${session.company_id || 1}`);
            this.jobs = await res.json();
            const select = document.getElementById('cp_job_id');
            if (select) {
                select.innerHTML = '<option value="">Select Job</option>';
                this.jobs.forEach(j => select.innerHTML += `<option value="${j.id}">${j.job_no} - ${j.description}</option>`);
            }
        } catch (e) { console.error("CP Module: Load Jobs Error:", e); }
    },

    loadEmployees: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        try {
            const res = await fetch(`api/maintain.php?action=get_employees&company_id=${session.company_id || 1}`);
            this.employees = await res.json();
            const select = document.getElementById('cp_employee_id');
            if (select) {
                select.innerHTML = '<option value="">Select Employee</option>';
                this.employees.forEach(e => select.innerHTML += `<option value="${e.id}">${e.name}</option>`);
            }
        } catch (e) { console.error("CP Module: Load Employees Error:", e); }
    },

    setupSmartSearch: function(codeId, nameId, suggestId, apiAction, type) {
        const codeInput = document.getElementById(codeId);
        const nameInput = document.getElementById(nameId);
        const suggest = document.getElementById(suggestId);
        if (!codeInput || !nameInput || !suggest) return;

        const handleSearch = async (val) => {
            if (!val || val.length < 1) { suggest.style.display = 'none'; return; }
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            try {
                const res = await fetch(`api/cash_payments.php?action=${apiAction}&q=${val}&company_id=${session.company_id || 1}`);
                const data = await res.json();
                if (data.length > 0) {
                    suggest.innerHTML = data.map(item => `
                        <div onclick="window.CPModule.selectAccount('${type}', ${item.id}, '${item.code}', '${item.name}')" 
                             style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;">
                             <div style="font-weight:700; color:#1e3a8a; font-size:11px;">${item.code}</div>
                             <div style="font-size:10px; color:#475569;">${item.name}</div>
                        </div>
                    `).join('');
                    suggest.style.display = 'block';
                } else { suggest.style.display = 'none'; }
            } catch (e) { console.error("Search Error:", e); }
        };

        nameInput.oninput = (e) => handleSearch(e.target.value);
        codeInput.oninput = (e) => handleSearch(e.target.value);

        document.addEventListener('click', (e) => {
            if (!nameInput.contains(e.target) && !codeInput.contains(e.target) && !suggest.contains(e.target)) {
                suggest.style.display = 'none';
            }
        });
    },

    selectAccount: async function(type, id, code, name) {
        if (type === 'cash') {
            this.selectedCashCoaId = id;
            document.getElementById('cp_cash_code').value = code;
            document.getElementById('cp_cash_name').value = name;
            document.getElementById('cp_cash_suggest').style.display = 'none';
            this.fetchBalance(id, 'cp_cash_balance');
        } else {
            this.selectedPaidToCoaId = id;
            document.getElementById('cp_paid_to_code').value = code;
            document.getElementById('cp_paid_to_name').value = name;
            document.getElementById('cp_paid_to_suggest').style.display = 'none';
            this.fetchBalance(id, 'cp_paid_to_balance');
        }
    },

    fetchBalance: async function(coaId, targetId) {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const balEl = document.getElementById(targetId);
        if (balEl) balEl.value = '...';
        try {
            const res = await fetch(`api/maintain.php?action=get_coa_balance&coa_id=${coaId}&fy_id=${session.fy_id || 0}`);
            const data = await res.json();
            if (balEl) balEl.value = parseFloat(data.balance || 0).toFixed(2);
        } catch (e) { if (balEl) balEl.value = '0.00'; }
    },

    updatePaidToLabel: function(type) {
        const vendorRow = document.getElementById('vendorPaidToRow');
        const gridTitle = document.getElementById('gridTitle');
        const vendorFooter = document.getElementById('vendorFooter');
        const pettyFooter = document.getElementById('pettyFooter');

        if (type === 'Petty') {
            if (vendorRow) vendorRow.style.display = 'none';
            if (gridTitle) gridTitle.innerText = "Detail of Petty Cash Payments / Expenses";
            if (vendorFooter) vendorFooter.style.display = 'none';
            if (pettyFooter) pettyFooter.style.display = 'block';
        } else {
            if (vendorRow) vendorRow.style.display = 'flex';
            if (gridTitle) gridTitle.innerText = "Detail of Purchase Invoices Against Which Amount has been Paid";
            if (vendorFooter) vendorFooter.style.display = 'block';
            if (pettyFooter) pettyFooter.style.display = 'none';
        }

        // Update Headers
        const thead = document.getElementById('cpGridHeader');
        if (type === 'Petty') {
            thead.innerHTML = `
                <tr class="cp-grid-header">
                    <th style="width: 25px;">#</th>
                    <th style="width: 100px;">Account Code</th>
                    <th style="width: 250px;">Account Name</th>
                    <th style="width: 1fr;">Description</th>
                    <th style="width: 100px;">Amount</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr class="cp-grid-header">
                    <th style="width: 20px;">#</th>
                    <th style="width: 70px;">Inv No.</th>
                    <th style="width: 80px;">Date</th>
                    <th style="width: 90px;">Paid</th>
                    <th style="width: 40px;">WHT%</th>
                    <th style="width: 80px;">WHT Amt</th>
                    <th style="width: 40px;">GST%</th>
                    <th style="width: 80px;">GST Amt</th>
                    <th style="width: 80px;">Adv Adj</th>
                    <th style="width: 80px;">Disc</th>
                    <th style="width: 90px;">Total</th>
                </tr>
            `;
        }

        const gridBody = document.getElementById('cpGridBody');
        gridBody.innerHTML = '';
        for (let i = 0; i < 8; i++) { this.addRow(); }
        this.calculateTotals();
    },

    resetForm: async function(isNew = false) {
        this.currentId = null;
        this.selectedCashCoaId = null;
        this.selectedPaidToCoaId = null;

        const ids = ['cp_sn', 'cp_date', 'cp_job_id', 'cp_employee_id', 'cp_cash_code', 'cp_cash_name', 'cp_cash_balance', 
                    'cp_paid_to_code', 'cp_paid_to_name', 'cp_paid_to_balance', 'cp_prepayment', 'cp_remarks'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        document.getElementById('cp_is_cancelled').checked = false;
        const typeEl = document.querySelector('input[name="cp_type"][value="Vendor"]');
        if (typeEl) typeEl.checked = true;
        this.updatePaidToLabel('Vendor');

        if (isNew) {
            document.getElementById('cp_date').value = new Date().toISOString().split('T')[0];
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            try {
                const res = await fetch(`api/cash_payments.php?action=get_next_serial&company_id=${session.company_id || 1}`);
                const data = await res.json();
                document.getElementById('cp_sn').value = data.next_sn;
            } catch (e) { document.getElementById('cp_sn').value = '1'; }
        }
    },

    addRow: function(data = {}) {
        const tbody = document.getElementById('cpGridBody');
        const idx = tbody.children.length;
        const tr = document.createElement('tr');
        const type = document.querySelector('input[name="cp_type"]:checked').value;

        if (type === 'Petty') {
            tr.innerHTML = `
                <td style="text-align:center; font-size:10px; color:#64748b; border: 1px solid #cbd5e0;">${idx + 1}</td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input acc-code" value="${data.coa_code || ''}"></td>
                <td class="cp-grid-cell" style="position:relative;">
                    <input type="text" class="cp-grid-input acc-name" value="${data.coa_name || ''}" placeholder="Search Account...">
                    <div class="cp-suggest row-suggest" style="width:100%; top:24px;"></div>
                </td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input desc" value="${data.description || ''}"></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num petty-amt" value="${data.paid_amount || ''}"></td>
                <input type="hidden" class="row-coa-id" value="${data.coa_id || ''}">
            `;
            this.setupRowSmartSearch(tr);
        } else {
            tr.innerHTML = `
                <td style="text-align:center; font-size:10px; color:#64748b; border: 1px solid #cbd5e0;">${idx + 1}</td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input inv-no" value="${data.invoice_no || ''}"></td>
                <td class="cp-grid-cell"><input type="date" class="cp-grid-input inv-date" value="${data.invoice_date || ''}"></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num paid-amt" value="${data.paid_amount || ''}"></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num wht-rate" value="${data.wht_rate || ''}"></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num wht-amt" value="${data.wht_amount || ''}" readonly></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num gst-rate" value="${data.gst_rate || ''}"></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num gst-amt" value="${data.gst_amount || ''}" readonly></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num adv-adj" value="${data.advance_adjusted || ''}"></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num disc-rcvd" value="${data.discount_received || ''}"></td>
                <td class="cp-grid-cell"><input type="text" class="cp-grid-input num tot-debited" value="${data.total_debited || ''}" readonly></td>
            `;
        }
        tbody.appendChild(tr);
        tr.querySelectorAll('input.num').forEach(input => {
            input.oninput = () => this.calculateRow(tr);
        });
    },

    setupRowSmartSearch: function(tr) {
        const nameInput = tr.querySelector('.acc-name');
        const codeInput = tr.querySelector('.acc-code');
        const suggest = tr.querySelector('.row-suggest');
        const coaIdInput = tr.querySelector('.row-coa-id');

        nameInput.oninput = async (e) => {
            const val = e.target.value;
            if (!val || val.length < 1) { suggest.style.display = 'none'; return; }
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            try {
                const res = await fetch(`api/cash_payments.php?action=search_parties&q=${val}&company_id=${session.company_id || 1}`);
                const data = await res.json();
                if (data.length > 0) {
                    suggest.innerHTML = data.map(item => `
                        <div onclick="window.CPModule.selectRowAccount(this, ${item.id}, '${item.code}', '${item.name}')" 
                             style="padding:8px; border-bottom:1px solid #eee; cursor:pointer; background:white;">
                             <div style="font-weight:700; color:#1e3a8a; font-size:11px;">${item.code}</div>
                             <div style="font-size:10px; color:#475569;">${item.name}</div>
                        </div>
                    `).join('');
                    suggest.style.display = 'block';
                } else { suggest.style.display = 'none'; }
            } catch (e) {}
        };
    },

    selectRowAccount: function(el, id, code, name) {
        const tr = el.closest('tr');
        tr.querySelector('.acc-code').value = code;
        tr.querySelector('.acc-name').value = name;
        tr.querySelector('.row-coa-id').value = id;
        tr.querySelector('.row-suggest').style.display = 'none';
    },

    calculateRow: function(tr) {
        const type = document.querySelector('input[name="cp_type"]:checked').value;
        if (type === 'Petty') {
            this.calculateTotals();
            return;
        }

        const paid = parseFloat(tr.querySelector('.paid-amt').value) || 0;
        const whtR = parseFloat(tr.querySelector('.wht-rate').value) || 0;
        const gstR = parseFloat(tr.querySelector('.gst-rate').value) || 0;
        const adj = parseFloat(tr.querySelector('.adv-adj').value) || 0;
        const disc = parseFloat(tr.querySelector('.disc-rcvd').value) || 0;

        const whtA = (paid * whtR) / 100;
        const gstA = (paid * gstR) / 100;
        const total = paid + whtA + gstA + adj - disc;

        tr.querySelector('.wht-amt').value = whtA > 0 ? whtA.toFixed(2) : '';
        tr.querySelector('.gst-amt').value = gstA > 0 ? gstA.toFixed(2) : '';
        tr.querySelector('.tot-debited').value = total > 0 ? total.toFixed(2) : '';
        
        this.calculateTotals();
    },

    calculateTotals: function() {
        const type = document.querySelector('input[name="cp_type"]:checked').value;
        let grandTotal = 0;

        if (type === 'Petty') {
            let tAmt = 0;
            document.querySelectorAll('#cpGridBody tr').forEach(tr => {
                tAmt += parseFloat(tr.querySelector('.petty-amt').value) || 0;
            });
            grandTotal = tAmt;
            document.getElementById('cp_grand_total_petty').value = tAmt.toFixed(2);
        } else {
            let tPaid = 0, tWht = 0, tGst = 0, tAdj = 0, tDisc = 0, tTotal = 0;
            document.querySelectorAll('#cpGridBody tr').forEach(tr => {
                tPaid += parseFloat(tr.querySelector('.paid-amt').value) || 0;
                tWht += parseFloat(tr.querySelector('.wht-amt').value) || 0;
                tGst += parseFloat(tr.querySelector('.gst-amt').value) || 0;
                tAdj += parseFloat(tr.querySelector('.adv-adj').value) || 0;
                tDisc += parseFloat(tr.querySelector('.disc-rcvd').value) || 0;
                tTotal += parseFloat(tr.querySelector('.tot-debited').value) || 0;
            });

            const prepayment = parseFloat(document.getElementById('cp_prepayment').value) || 0;
            document.getElementById('cp_total_advance').value = prepayment.toFixed(2);
            document.getElementById('cp_total_paid').value = tPaid.toFixed(2);
            document.getElementById('cp_total_wht').value = tWht.toFixed(2);
            document.getElementById('cp_total_gst').value = tGst.toFixed(2);
            document.getElementById('cp_total_adj').value = tAdj.toFixed(2);
            document.getElementById('cp_total_disc').value = tDisc.toFixed(2);
            
            grandTotal = tTotal + prepayment;
            document.getElementById('cp_grand_total_vendor').value = grandTotal.toFixed(2);
        }

        document.getElementById('cp_grand_total').value = grandTotal.toFixed(2);
        document.getElementById('cp_amt_words').innerText = `Rupees ${this.numberToWords(grandTotal)} only.`;
    },

    numberToWords: function(num) {
        if (num === 0) return "zero and 00/100";
        const parts = num.toFixed(2).split('.');
        return `${parts[0]} and ${parts[1]}/100`;
    },

    save: async function() {
        const type = document.querySelector('input[name="cp_type"]:checked').value;
        if (!this.selectedCashCoaId) { alert("Please select Cash Account."); return; }
        if (type === 'Vendor' && !this.selectedPaidToCoaId) { alert("Please select Vendor."); return; }

        const items = [];
        document.querySelectorAll('#cpGridBody tr').forEach(tr => {
            if (type === 'Petty') {
                const amt = parseFloat(tr.querySelector('.petty-amt').value) || 0;
                if (amt > 0) {
                    items.push({
                        coa_id: tr.querySelector('.row-coa-id').value,
                        description: tr.querySelector('.desc').value,
                        paid_amount: amt,
                        total_debited: amt
                    });
                }
            } else {
                const paid = parseFloat(tr.querySelector('.paid-amt').value) || 0;
                if (paid > 0) {
                    items.push({
                        invoice_no: tr.querySelector('.inv-no').value,
                        invoice_date: tr.querySelector('.inv-date').value,
                        paid_amount: paid,
                        wht_rate: tr.querySelector('.wht-rate').value,
                        wht_amount: tr.querySelector('.wht-amt').value,
                        gst_rate: tr.querySelector('.gst-rate').value,
                        gst_amount: tr.querySelector('.gst-amt').value,
                        advance_adjusted: tr.querySelector('.adv-adj').value,
                        discount_received: tr.querySelector('.disc-rcvd').value,
                        total_debited: tr.querySelector('.tot-debited').value
                    });
                }
            }
        });

        if (items.length === 0) { alert("Please add at least one item."); return; }

        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const payload = {
            id: this.currentId,
            serial_no: document.getElementById('cp_sn').value,
            payment_date: document.getElementById('cp_date').value,
            payment_type: type,
            job_id: document.getElementById('cp_job_id').value,
            employee_id: document.getElementById('cp_employee_id').value,
            cash_account_coa_id: this.selectedCashCoaId,
            paid_to_coa_id: type === 'Vendor' ? this.selectedPaidToCoaId : null,
            prepayment_advance: type === 'Vendor' ? document.getElementById('cp_prepayment').value : 0,
            total_amount: document.getElementById('cp_grand_total').value,
            amount_in_words: document.getElementById('cp_amt_words').innerText,
            remarks: document.getElementById('cp_remarks').value,
            is_cancelled: document.getElementById('cp_is_cancelled').checked ? 1 : 0,
            items: items
        };

        try {
            const res = await fetch(`api/cash_payments.php?action=save&company_id=${session.company_id || 1}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                alert("Saved successfully!");
                this.resetForm(true);
            } else { alert("Save Error: " + result.message); }
        } catch (e) { console.error("Save Error:", e); }
    },

    navigate: async function(dir) {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        let sn = parseInt(document.getElementById('cp_sn').value) || 0;
        sn = (dir === 'next') ? sn + 1 : sn - 1;
        if (sn < 1) return;

        try {
            const res = await fetch(`api/cash_payments.php?action=get&serial_no=${sn}&company_id=${session.company_id || 1}`);
            const data = await res.json();
            if (data) {
                this.loadData(data);
            } else if (dir === 'next') {
                this.resetForm(true);
            }
        } catch (e) { console.error("Nav Error:", e); }
    },

    loadData: function(data) {
        this.currentId = data.id;
        document.getElementById('cp_sn').value = data.serial_no;
        document.getElementById('cp_date').value = data.payment_date;
        document.getElementById('cp_job_id').value = data.job_id;
        document.getElementById('cp_employee_id').value = data.employee_id;
        document.getElementById('cp_is_cancelled').checked = parseInt(data.is_cancelled) === 1;
        
        const typeEl = document.querySelector(`input[name="cp_type"][value="${data.payment_type}"]`);
        if (typeEl) typeEl.checked = true;
        this.updatePaidToLabel(data.payment_type);

        this.selectedCashCoaId = data.cash_account_coa_id;
        document.getElementById('cp_cash_code').value = data.cash_account.code;
        document.getElementById('cp_cash_name').value = data.cash_account.name;
        this.fetchBalance(data.cash_account_coa_id, 'cp_cash_balance');

        if (data.payment_type === 'Vendor' && data.paid_to) {
            this.selectedPaidToCoaId = data.paid_to_coa_id;
            document.getElementById('cp_paid_to_code').value = data.paid_to.code;
            document.getElementById('cp_paid_to_name').value = data.paid_to.name;
            this.fetchBalance(data.paid_to_coa_id, 'cp_paid_to_balance');
        }

        document.getElementById('cp_prepayment').value = data.prepayment_advance;
        document.getElementById('cp_remarks').value = data.remarks;

        const tbody = document.getElementById('cpGridBody');
        tbody.innerHTML = '';
        data.items.forEach(item => this.addRow(item));
        while (tbody.children.length < 8) { this.addRow(); }
        this.calculateTotals();
    },

    delete: async function() {
        if (!this.currentId) return;
        if (!confirm("Delete this Payment record?")) return;
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        try {
            const res = await fetch(`api/cash_payments.php?action=delete&id=${this.currentId}&company_id=${session.company_id || 1}`);
            this.resetForm(true);
        } catch (e) { console.error("Delete Error:", e); }
    },

    openCOA: function() {
        // Trigger the global Chart of Accounts popup as a secondary layer
        if (window.openSecondaryModularPopup) {
            window.openSecondaryModularPopup('Navigation/Maintain/chart_of_accounts.html', 'fa-sitemap', 'Chart of Accounts', () => window.initChartOfAccountsView && window.initChartOfAccountsView(), 'Chart of Accounts', true);
        }
    },

    print: function() {
        if (!this.currentId) return;
        window.print();
    }
};

window.initCashPaymentModule = function() {
    window.CPModule.init();
};
