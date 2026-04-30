/**
 * Purchase Return / Debit Notes Module
 */
window.PRModule = {
    vendors: [],
    inventory: [],
    currentId: null,
    companyId: JSON.parse(localStorage.getItem('softifyx_session') || '{}').company_id || 1,

    init: async function() {
        // Reset form immediately to show grid
        this.resetForm(true);
        
        // Load data for searches
        try {
            await Promise.all([
                this.loadVendors(),
                this.loadInventory()
            ]);
        } catch (e) { console.error("PR Module: Data load error", e); }

        this.setupKeyboardShortcuts();
        this.setupVendorSearch();
        this.setupExpenseSearch();
    },

    loadVendors: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            // Try VND first
            let res = await fetch(`api/maintain.php?action=get_vendors&sub_id=VND&company_id=${companyId}`);
            let data = await res.json();
            
            // If empty, try SUP (Suppliers)
            if (!data || data.length === 0) {
                res = await fetch(`api/maintain.php?action=get_vendors&sub_id=SUP&company_id=${companyId}`);
                data = await res.json();
            }
            
            // If still empty, try general
            if (!data || data.length === 0) {
                res = await fetch(`api/maintain.php?action=get_vendors&company_id=${companyId}`);
                data = await res.json();
            }
            
            this.vendors = Array.isArray(data) ? data : [];
            console.log("PR Module: Loaded Vendors:", this.vendors.length);
        } catch (e) { 
            console.error("PR Module: Load Vendors Error", e); 
            this.vendors = [];
        }
    },

    loadInventory: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/inventory.php?action=get_all_items&company_id=${companyId}`);
            const data = await res.json();
            this.inventory = Array.isArray(data) ? data : [];
            console.log("PR Module: Loaded Inventory:", this.inventory.length);
        } catch (e) { 
            console.error("PR Module: Load Inventory Error", e); 
            this.inventory = [];
        }
    },

    resetForm: function(isNew = false) {
        this.currentId = null;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.value = val || '';
        };

        setVal('pr_sn', '');
        setVal('pr_date', new Date().toISOString().split('T')[0]);
        
        const fields = [
            'pr_purchase_no', 'pr_purchase_date', 'pr_vendor_inv_no', 'pr_vendor_inv_date',
            'pr_pay_terms', 'vendor_code', 'vendor_name', 'vendor_address', 'vendor_tel',
            'vendor_gst', 'vendor_ntn', 'vendor_coa_id', 'pr_remarks', 'pr_freight', 
            'pr_received', 'expense_coa_id', 'pr_location', 'pr_job', 'pr_employee'
        ];
        
        fields.forEach(id => setVal(id, ''));
        
        const nature = document.getElementById('pr_nature');
        if(nature) nature.value = 'Purchase Return (Reduces Inventory)';
        
        const expCode = document.getElementById('expense_coa_code');
        if(expCode) expCode.value = '50001003';
        
        const expName = document.getElementById('expense_coa_name');
        if(expName) expName.value = 'Purchase Returns';
        
        const vendorBal = document.getElementById('vendor_balance');
        if(vendorBal) vendorBal.value = '0.00';
        
        const cancelled = document.getElementById('pr_is_cancelled');
        if(cancelled) cancelled.checked = false;

        this.renderGrid();
        if (isNew) this.getNextSerial();
        this.calculateTotals();
    },

    getNextSerial: function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        fetch(`api/purchases.php?action=get_next_return_serial&company_id=${companyId}`)
            .then(res => res.json())
            .then(data => {
                if (!this.currentId) {
                    const snField = document.getElementById('pr_sn');
                    if(snField) snField.value = data.next_sn;
                }
            });
    },

    renderGrid: function() {
        const tbody = document.getElementById('prGridBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            this.addEmptyRow();
        }
    },

    addEmptyRow: function() {
        const tbody = document.getElementById('prGridBody');
        if(!tbody) return;
        const rowCount = tbody.rows.length;
        const tr = document.createElement('tr');
        tr.dataset.index = rowCount;
        tr.innerHTML = `
            <td style="text-align: center; border: 1px solid #cbd5e0; font-size: 10px; color: #64748b; background: #f8fafc;">${rowCount + 1}</td>
            <td style="border: 1px solid #cbd5e0; position: relative;">
                <input type="text" class="grid-input item-code-search" placeholder="...">
                <div class="po-suggest grid-suggest" style="display:none; position:absolute; top:100%; left:0; width:300px; background:white; border:1px solid #ccc; max-height:200px; overflow-y:auto; z-index:9999;"></div>
            </td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input item-name" readonly tabindex="-1"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num pieces" value=""></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num qty" value=""></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input unit" readonly tabindex="-1"></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num rate" value=""></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num val-excl" readonly tabindex="-1" value=""></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num tax-rate" value=""></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num tax-amt" readonly tabindex="-1" value=""></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num ftax-rate" value=""></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num ftax-amt" readonly tabindex="-1" value=""></td>
            <td style="border: 1px solid #cbd5e0;"><input type="text" class="grid-input num val-incl" readonly tabindex="-1" value=""></td>
            <input type="hidden" class="item-coa-id">
        `;

        this.setupGridEvents(tr);
        tbody.appendChild(tr);
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
                const searchStr = `${i.code || ''} ${i.name || ''}`.toLowerCase();
                return searchWords.every(word => searchStr.includes(word));
            }).slice(0, 15);

            if (matches.length > 0) {
                suggest.innerHTML = matches.map(i => 
                    `<div onclick="window.PRModule.selectGridItem(${idx}, ${i.id})" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer; font-size:11px;">
                        <b style="color:#2563eb;">${i.code}</b> - ${i.name}
                    </div>`
                ).join('');
                suggest.style.display = 'block';
            } else { suggest.style.display = 'none'; }

            const tbody = document.getElementById('prGridBody');
            if (tr === tbody.lastElementChild && val !== '') {
                this.addEmptyRow();
            }
        };

        tr.querySelectorAll('input.num').forEach(input => {
            input.oninput = () => this.calculateRow(tr);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const inputs = Array.from(document.querySelectorAll('#prGridBody input:not([readonly])'));
                    const curIdx = inputs.indexOf(input);
                    if (inputs[curIdx + 1]) inputs[curIdx + 1].focus();
                }
            };
        });

        document.addEventListener('mousedown', (e) => { 
            if (!suggest.contains(e.target) && e.target !== codeInput) {
                suggest.style.display = 'none'; 
            }
        });
    },

    selectGridItem: function(idx, id) {
        const item = this.inventory.find(i => i.id == id);
        if (!item) return;
        const tr = document.querySelector(`#prGridBody tr[data-index="${idx}"]`);
        if (!tr) return;

        tr.querySelector('.item-code-search').value = item.code;
        tr.querySelector('.item-name').value = item.name;
        tr.querySelector('.unit').value = item.unit || 'Pcs';
        tr.querySelector('.item-coa-id').value = item.id;
        tr.querySelector('.grid-suggest').style.display = 'none';
        
        const next = tr.querySelector('.pieces');
        if(next) next.focus();
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
                const searchStr = `${v.code || ''} ${v.name || ''} ${v.address || ''}`.toLowerCase();
                return searchWords.every(word => searchStr.includes(word));
            }).slice(0, 10);

            if (matches.length > 0) {
                suggest.innerHTML = matches.map(v => 
                    `<div onclick="window.PRModule.selectVendor(${v.id})" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer; font-size:11px;">
                        <b style="color:#2563eb;">${v.code}</b> - ${v.name}
                    </div>`
                ).join('');
                suggest.style.display = 'block';
                suggest.style.zIndex = '1000';
            } else { suggest.style.display = 'none'; }
        };
        
        document.addEventListener('mousedown', (e) => { 
            if (!suggest.contains(e.target) && e.target !== input) {
                suggest.style.display = 'none'; 
            }
        });
    },

    selectVendor: function(id) {
        const v = this.vendors.find(v => v.id == id);
        if (!v) return;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.value = val || '';
        };

        setVal('vendor_code', v.code);
        setVal('vendor_name', v.name);
        setVal('vendor_address', v.address);
        setVal('vendor_tel', v.phone);
        setVal('vendor_gst', v.gst);
        setVal('vendor_ntn', v.ntn);
        setVal('vendor_coa_id', v.coa_list_id);
        
        const bal = document.getElementById('vendor_balance');
        if(bal) bal.value = parseFloat(v.balance || 0).toFixed(2);
        
        const suggest = document.getElementById('vendor_suggest');
        if(suggest) suggest.style.display = 'none';
    },

    setupExpenseSearch: function() {
        const input = document.getElementById('expense_coa_name');
        const suggest = document.getElementById('expense_suggest');
        if (!input || !suggest) return;

        input.oninput = async (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (val.length < 2) { suggest.style.display = 'none'; return; }

            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            try {
                const res = await fetch(`api/admin.php?action=get_coa_list&company_id=${session.company_id || 1}`);
                const coa = await res.json();
                
                const matches = coa.filter(c => 
                    (c.account_type === 'Expense' || c.account_type === 'Cost of Sales' || c.account_name.toLowerCase().includes('return')) &&
                    (c.account_code.includes(val) || c.account_name.toLowerCase().includes(val))
                ).slice(0, 10);

                if (matches.length > 0) {
                    suggest.innerHTML = matches.map(c => 
                        `<div onclick="window.PRModule.selectExpense('${c.account_code}', '${c.account_name}')" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer; font-size:11px;">
                            <b style="color:#2563eb;">${c.account_code}</b> - ${c.account_name}
                        </div>`
                    ).join('');
                    suggest.style.display = 'block';
                    suggest.style.zIndex = '1000';
                } else { suggest.style.display = 'none'; }
            } catch(e) { console.error("Expense search error:", e); }
        };
        document.addEventListener('mousedown', (e) => { if (e.target !== input) suggest.style.display = 'none'; });
    },

    selectExpense: function(code, name) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.value = val || '';
        };
        setVal('expense_coa_code', code);
        setVal('expense_coa_name', name);
        const suggest = document.getElementById('expense_suggest');
        if(suggest) suggest.style.display = 'none';
    },

    calculateRow: function(tr) {
        const qty = parseFloat(tr.querySelector('.qty').value) || 0;
        const rate = parseFloat(tr.querySelector('.rate').value) || 0;
        const taxRate = parseFloat(tr.querySelector('.tax-rate').value) || 0;
        const ftaxRate = parseFloat(tr.querySelector('.ftax-rate').value) || 0;

        const excl = qty * rate;
        const taxAmt = (excl * taxRate) / 100;
        const ftaxAmt = (excl * ftaxRate) / 100;
        const incl = excl + taxAmt + ftaxAmt;

        const setVal = (sel, val) => {
            const el = tr.querySelector(sel);
            if(el) el.value = val > 0 ? val.toFixed(2) : '';
        };

        setVal('.val-excl', excl);
        setVal('.tax-amt', taxAmt);
        setVal('.ftax-amt', ftaxAmt);
        setVal('.val-incl', incl);

        this.calculateTotals();
    },

    calculateTotals: function() {
        let totPcs = 0, totQty = 0, totExcl = 0, totTax = 0, totFTax = 0, totIncl = 0;

        document.querySelectorAll('#prGridBody tr').forEach(tr => {
            const coaId = tr.querySelector('.item-coa-id').value;
            if (coaId) {
                totPcs += parseFloat(tr.querySelector('.pieces').value) || 0;
                totQty += parseFloat(tr.querySelector('.qty').value) || 0;
                totExcl += parseFloat(tr.querySelector('.val-excl').value) || 0;
                totTax += parseFloat(tr.querySelector('.tax-amt').value) || 0;
                totFTax += parseFloat(tr.querySelector('.ftax-amt').value) || 0;
                totIncl += parseFloat(tr.querySelector('.val-incl').value) || 0;
            }
        });

        const setTotal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.value = val.toFixed(2);
        };

        setTotal('tot_pieces', totPcs);
        setTotal('tot_qty', totQty);
        setTotal('tot_excl', totExcl);
        setTotal('tot_stax', totTax);
        setTotal('tot_ftax', totFTax);
        setTotal('tot_incl', totIncl);

        const freightEl = document.getElementById('pr_freight');
        const freight = freightEl ? (parseFloat(freightEl.value) || 0) : 0;
        const netTot = totIncl + freight;
        
        const netTotEl = document.getElementById('pr_net_tot');
        if(netTotEl) netTotEl.value = netTot.toFixed(2);

        const receivedEl = document.getElementById('pr_received');
        const received = receivedEl ? (parseFloat(receivedEl.value) || 0) : 0;
        const balance = netTot - received;
        
        const balanceEl = document.getElementById('pr_balance');
        if(balanceEl) balanceEl.value = balance.toFixed(2);

        const wordsEl = document.getElementById('pr_amt_words');
        if (wordsEl && window.toWords) {
            wordsEl.textContent = toWords(netTot) + " only.";
        }
    },

    save: function() {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        const data = {
            id: this.currentId,
            serial_no: getVal('pr_sn'),
            return_date: getVal('pr_date'),
            purchase_no: getVal('pr_purchase_no'),
            purchase_date: getVal('pr_purchase_date'),
            vendor_invoice_no: getVal('pr_vendor_inv_no'),
            vendor_invoice_date: getVal('pr_vendor_inv_date'),
            nature_of_debit_note: getVal('pr_nature'),
            payment_terms: getVal('pr_pay_terms'),
            expense_account: getVal('expense_coa_code'),
            vendor_coa_id: getVal('vendor_coa_id'),
            inventory_location_id: getVal('pr_location'),
            job_no: getVal('pr_job'),
            employee_ref: getVal('pr_employee'),
            remarks: getVal('pr_remarks'),
            carriage_freight: getVal('pr_freight'),
            net_total: getVal('pr_net_tot'),
            amount_received: getVal('pr_received'),
            amount_in_words: document.getElementById('pr_amt_words')?.textContent || '',
            is_cancelled: document.getElementById('pr_is_cancelled')?.checked ? 1 : 0,
            items: []
        };

        if (!data.vendor_coa_id) return alert("Please select a vendor.");

        document.querySelectorAll('#prGridBody tr').forEach(tr => {
            const coaId = tr.querySelector('.item-coa-id').value;
            if (coaId) {
                data.items.push({
                    item_coa_id: coaId,
                    description: tr.querySelector('.item-name').value,
                    pieces: tr.querySelector('.pieces').value,
                    quantity: tr.querySelector('.qty').value,
                    unit: tr.querySelector('.unit').value,
                    rate: tr.querySelector('.rate').value,
                    value_excl_tax: tr.querySelector('.val-excl').value,
                    tax_rate: tr.querySelector('.tax-rate').value,
                    tax_amount: tr.querySelector('.tax-amt').value,
                    further_tax_rate: tr.querySelector('.ftax-rate').value,
                    further_tax_amount: tr.querySelector('.ftax-amt').value,
                    value_incl_tax: tr.querySelector('.val-incl').value
                });
            }
        });

        if (data.items.length === 0) return alert("Please add at least one item.");

        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        fetch(`api/purchases.php?action=save_return&company_id=${companyId}`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                alert("Saved successfully!");
                this.currentId = res.id;
                this.loadRecord(data.serial_no);
            } else {
                alert("Error: " + res.message);
            }
        });
    },

    loadRecord: function(sn) {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        fetch(`api/purchases.php?action=get_return&serial_no=${sn}&company_id=${companyId}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.id) {
                    this.currentId = data.id;
                    const setVal = (id, val) => {
                        const el = document.getElementById(id);
                        if(el) el.value = val || '';
                    };

                    setVal('pr_sn', data.serial_no);
                    setVal('pr_date', data.return_date);
                    setVal('pr_purchase_no', data.purchase_no);
                    setVal('pr_purchase_date', data.purchase_date);
                    setVal('pr_vendor_inv_no', data.vendor_invoice_no);
                    setVal('pr_vendor_inv_date', data.vendor_invoice_date);
                    setVal('pr_nature', data.nature_of_debit_note);
                    setVal('pr_pay_terms', data.payment_terms);
                    setVal('expense_coa_code', data.expense_account);
                    setVal('vendor_coa_id', data.vendor_coa_id);
                    setVal('pr_remarks', data.remarks);
                    setVal('pr_freight', data.carriage_freight);
                    setVal('pr_received', data.amount_received);
                    
                    const cancelled = document.getElementById('pr_is_cancelled');
                    if(cancelled) cancelled.checked = parseInt(data.is_cancelled) === 1;

                    if (data.vendor) {
                        setVal('vendor_code', data.vendor.code);
                        setVal('vendor_name', data.vendor.name);
                        setVal('vendor_address', data.vendor.address);
                        setVal('vendor_tel', data.vendor.phone);
                        setVal('vendor_gst', data.vendor.gst);
                        setVal('vendor_ntn', data.vendor.ntn);
                        const bal = document.getElementById('vendor_balance');
                        if(bal) bal.value = parseFloat(data.vendor.balance || 0).toFixed(2);
                    }

                    const tbody = document.getElementById('prGridBody');
                    if(tbody) {
                        tbody.innerHTML = '';
                        data.items.forEach(item => {
                            this.addEmptyRow();
                            const tr = tbody.lastElementChild;
                            tr.querySelector('.item-code-search').value = item.code;
                            tr.querySelector('.item-name').value = item.name;
                            tr.querySelector('.pieces').value = item.pieces;
                            tr.querySelector('.qty').value = item.quantity;
                            tr.querySelector('.unit').value = item.unit;
                            tr.querySelector('.rate').value = item.rate;
                            tr.querySelector('.tax-rate').value = item.tax_rate;
                            tr.querySelector('.ftax-rate').value = item.further_tax_rate;
                            tr.querySelector('.item-coa-id').value = item.item_coa_id;
                            this.calculateRow(tr);
                        });
                        while (tbody.rows.length < 8) this.addEmptyRow();
                    }
                    this.calculateTotals();
                } else {
                    alert("Record not found.");
                }
            });
    },

    navigate: function(dir) {
        const snField = document.getElementById('pr_sn');
        const sn = snField ? (parseInt(snField.value) || 0) : 0;
        if (sn + dir > 0) {
            this.loadRecord(sn + dir);
        }
    },

    deleteRecord: function() {
        if (!this.currentId) return;
        if (confirm("Are you sure you want to delete this record?")) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = session.company_id || 1;
            fetch(`api/purchases.php?action=delete_return&id=${this.currentId}&company_id=${companyId}`, { method: 'POST' })
                .then(res => res.json())
                .then(res => {
                    if (res.status === 'success') {
                        alert("Deleted!");
                        this.resetForm(true);
                    }
                });
        }
    },

    loadLastSaved: function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        fetch(`api/purchases.php?action=get_next_return_serial&company_id=${companyId}`)
            .then(res => res.json())
            .then(data => {
                if (data.next_sn > 1) {
                    this.loadRecord(data.next_sn - 1);
                }
            });
    },

    print: function() {
        if (!this.currentId) return alert("Please save or load a record first.");
        const sn = document.getElementById('pr_sn')?.value || '';
        const date = document.getElementById('pr_date')?.value || '';
        const vName = document.getElementById('vendor_name')?.value || '';
        const netTot = document.getElementById('pr_net_tot')?.value || '';

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        const html = `
            <html>
            <head><title>Purchase Return - ${sn}</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h2 style="text-align:center;">PURCHASE RETURN / DEBIT NOTE</h2>
                <hr>
                <p><b>Serial No:</b> ${sn} &nbsp;&nbsp;&nbsp; <b>Date:</b> ${date}</p>
                <p><b>Vendor:</b> ${vName}</p>
                <table border="1" width="100%" style="border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background:#f2f2f2;"><th>#</th><th>Code</th><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                        ${Array.from(document.querySelectorAll('#prGridBody tr')).filter(tr => tr.querySelector('.item-coa-id').value).map((tr, i) => `
                            <tr>
                                <td align="center">${i+1}</td>
                                <td>${tr.querySelector('.item-code-search').value}</td>
                                <td>${tr.querySelector('.item-name').value}</td>
                                <td align="center">${tr.querySelector('.qty').value}</td>
                                <td align="right">${tr.querySelector('.rate').value}</td>
                                <td align="right">${tr.querySelector('.val-incl').value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr><th colspan="5" align="right">NET TOTAL:</th><th align="right">${netTot}</th></tr>
                    </tfoot>
                </table>
                <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    },

    setupKeyboardShortcuts: function() {
        const handler = (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.save();
            }
        };
        document.removeEventListener('keydown', handler);
        document.addEventListener('keydown', handler);
    }
};
