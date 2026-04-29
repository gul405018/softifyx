/**
 * Purchase Return / Debit Notes Module
 */
window.PRModule = {
    currentId: null,
    companyId: JSON.parse(localStorage.getItem('softifyx_session') || '{}').company_id || 1,

    init: function() {
        this.resetForm(true);
        this.setupAutocomplete();
        this.setupKeyboardShortcuts();
    },

    resetForm: function(isNew = false) {
        this.currentId = null;
        document.getElementById('pr_sn').value = '';
        document.getElementById('pr_date').value = new Date().toISOString().split('T')[0];
        document.getElementById('pr_purchase_no').value = '';
        document.getElementById('pr_purchase_date').value = '';
        document.getElementById('pr_vendor_inv_no').value = '';
        document.getElementById('pr_vendor_inv_date').value = '';
        document.getElementById('pr_nature').value = 'Purchase Return (Reduces Inventory)';
        document.getElementById('pr_pay_terms').value = '';
        
        document.getElementById('expense_coa_code').value = '50001003';
        document.getElementById('expense_coa_name').value = 'Purchase Returns';
        document.getElementById('expense_coa_id').value = '';
        
        document.getElementById('vendor_code').value = '';
        document.getElementById('vendor_name').value = '';
        document.getElementById('vendor_address').value = '';
        document.getElementById('vendor_tel').value = '';
        document.getElementById('vendor_gst').value = '';
        document.getElementById('vendor_ntn').value = '';
        document.getElementById('vendor_balance').value = '0.00';
        document.getElementById('vendor_coa_id').value = '';
        
        document.getElementById('pr_remarks').value = '';
        document.getElementById('pr_freight').value = '0.00';
        document.getElementById('pr_received').value = '0.00';
        document.getElementById('pr_is_cancelled').checked = false;

        this.renderGrid();
        if (isNew) this.getNextSerial();
        this.calculateTotals();
    },

    getNextSerial: function() {
        fetch(`api/purchases.php?action=get_next_return_serial&company_id=${this.companyId}`)
            .then(res => res.json())
            .then(data => {
                if (!this.currentId) document.getElementById('pr_sn').value = data.next_sn;
            });
    },

    renderGrid: function() {
        const tbody = document.getElementById('prGridBody');
        tbody.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            this.addEmptyRow();
        }
    },

    addEmptyRow: function() {
        const tbody = document.getElementById('prGridBody');
        const rowCount = tbody.rows.length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center; font-size: 9px; background: #f8fafc;">${rowCount + 1}</td>
            <td><input type="text" class="grid-input item-code-search" placeholder="..."></td>
            <td><input type="text" class="grid-input item-name" readonly tabindex="-1"></td>
            <td><input type="number" class="grid-input num pieces" value="0.00"></td>
            <td><input type="number" class="grid-input num qty" value="0.00"></td>
            <td><input type="text" class="grid-input unit" readonly tabindex="-1"></td>
            <td><input type="number" class="grid-input num rate" value="0.00"></td>
            <td><input type="text" class="grid-input num val-excl" readonly tabindex="-1" value="0.00"></td>
            <td><input type="number" class="grid-input num tax-rate" value="0.00"></td>
            <td><input type="text" class="grid-input num tax-amt" readonly tabindex="-1" value="0.00"></td>
            <td><input type="number" class="grid-input num ftax-rate" value="0.00"></td>
            <td><input type="text" class="grid-input num ftax-amt" readonly tabindex="-1" value="0.00"></td>
            <td><input type="text" class="grid-input num val-incl" readonly tabindex="-1" value="0.00"></td>
            <input type="hidden" class="item-coa-id">
        `;

        const inputs = tr.querySelectorAll('input:not([readonly])');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.calculateRow(tr));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const nextInput = this.getNextInput(input);
                    if (nextInput) nextInput.focus();
                    else {
                        this.addEmptyRow();
                        this.getNextInput(input).focus();
                    }
                }
            });
        });

        this.setupItemAutocomplete(tr);
        tbody.appendChild(tr);
    },

    getNextInput: function(current) {
        const inputs = Array.from(document.querySelectorAll('#prGridBody input:not([readonly])'));
        const index = inputs.indexOf(current);
        return inputs[index + 1];
    },

    calculateRow: function(tr) {
        const pcs = parseFloat(tr.querySelector('.pieces').value) || 0;
        const qty = parseFloat(tr.querySelector('.qty').value) || 0;
        const rate = parseFloat(tr.querySelector('.rate').value) || 0;
        const taxRate = parseFloat(tr.querySelector('.tax-rate').value) || 0;
        const ftaxRate = parseFloat(tr.querySelector('.ftax-rate').value) || 0;

        const excl = qty * rate;
        const taxAmt = (excl * taxRate) / 100;
        const ftaxAmt = (excl * ftaxRate) / 100;
        const incl = excl + taxAmt + ftaxAmt;

        tr.querySelector('.val-excl').value = excl.toFixed(2);
        tr.querySelector('.tax-amt').value = taxAmt.toFixed(2);
        tr.querySelector('.ftax-amt').value = ftaxAmt.toFixed(2);
        tr.querySelector('.val-incl').value = incl.toFixed(2);

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

        document.getElementById('tot_pieces').value = totPcs.toFixed(2);
        document.getElementById('tot_qty').value = totQty.toFixed(2);
        document.getElementById('tot_excl').value = totExcl.toFixed(2);
        document.getElementById('tot_stax').value = totTax.toFixed(2);
        document.getElementById('tot_ftax').value = totFTax.toFixed(2);
        document.getElementById('tot_incl').value = totIncl.toFixed(2);

        const freight = parseFloat(document.getElementById('pr_freight').value) || 0;
        const netTot = totIncl + freight;
        document.getElementById('pr_net_tot').value = netTot.toFixed(2);

        const received = parseFloat(document.getElementById('pr_received').value) || 0;
        const balance = netTot - received;
        document.getElementById('pr_balance').value = balance.toFixed(2);

        if (window.toWords) {
            document.getElementById('pr_amt_words').textContent = toWords(netTot) + " only.";
        }
    },

    setupAutocomplete: function() {
        const vCode = document.getElementById('vendor_code');
        const handleSelect = (v) => {
            vCode.value = v.code;
            document.getElementById('vendor_name').value = v.name;
            document.getElementById('vendor_address').value = v.address || '';
            document.getElementById('vendor_tel').value = v.phone || '';
            document.getElementById('vendor_gst').value = v.gst || '';
            document.getElementById('vendor_ntn').value = v.ntn || '';
            document.getElementById('vendor_coa_id').value = v.coa_list_id;
            document.getElementById('vendor_balance').value = parseFloat(v.balance || 0).toFixed(2);
        };

        if (window.setupSmartSearch) {
            setupSmartSearch(vCode, 'vendor_code', handleSelect, 'vendor_suggest');
        }
    },

    setupItemAutocomplete: function(tr) {
        const input = tr.querySelector('.item-code-search');
        if (window.setupSmartSearch) {
            setupSmartSearch(input, 'item_code', (item) => {
                input.value = item.code;
                tr.querySelector('.item-name').value = item.name;
                tr.querySelector('.unit').value = item.unit || 'Pcs';
                tr.querySelector('.item-coa-id').value = item.id;
                tr.querySelector('.pieces').focus();
            });
        }
    },

    save: function() {
        const data = {
            id: this.currentId,
            serial_no: document.getElementById('pr_sn').value,
            return_date: document.getElementById('pr_date').value,
            purchase_no: document.getElementById('pr_purchase_no').value,
            purchase_date: document.getElementById('pr_purchase_date').value,
            vendor_invoice_no: document.getElementById('pr_vendor_inv_no').value,
            vendor_invoice_date: document.getElementById('pr_vendor_inv_date').value,
            nature_of_debit_note: document.getElementById('pr_nature').value,
            payment_terms: document.getElementById('pr_pay_terms').value,
            expense_account: document.getElementById('expense_coa_code').value,
            vendor_coa_id: document.getElementById('vendor_coa_id').value,
            inventory_location_id: document.getElementById('pr_location').value,
            job_no: document.getElementById('pr_job').value,
            employee_ref: document.getElementById('pr_employee').value,
            remarks: document.getElementById('pr_remarks').value,
            carriage_freight: document.getElementById('pr_freight').value,
            net_total: document.getElementById('pr_net_tot').value,
            amount_received: document.getElementById('pr_received').value,
            amount_in_words: document.getElementById('pr_amt_words').textContent,
            is_cancelled: document.getElementById('pr_is_cancelled').checked ? 1 : 0,
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

        fetch(`api/purchases.php?action=save_return&company_id=${this.companyId}`, {
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
        fetch(`api/purchases.php?action=get_return&serial_no=${sn}&company_id=${this.companyId}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.id) {
                    this.currentId = data.id;
                    document.getElementById('pr_sn').value = data.serial_no;
                    document.getElementById('pr_date').value = data.return_date;
                    document.getElementById('pr_purchase_no').value = data.purchase_no;
                    document.getElementById('pr_purchase_date').value = data.purchase_date;
                    document.getElementById('pr_vendor_inv_no').value = data.vendor_invoice_no;
                    document.getElementById('pr_vendor_inv_date').value = data.vendor_invoice_date;
                    document.getElementById('pr_nature').value = data.nature_of_debit_note;
                    document.getElementById('pr_pay_terms').value = data.payment_terms;
                    document.getElementById('expense_coa_code').value = data.expense_account;
                    document.getElementById('vendor_coa_id').value = data.vendor_coa_id;
                    document.getElementById('pr_remarks').value = data.remarks;
                    document.getElementById('pr_freight').value = data.carriage_freight;
                    document.getElementById('pr_received').value = data.amount_received;
                    document.getElementById('pr_is_cancelled').checked = parseInt(data.is_cancelled) === 1;

                    if (data.vendor) {
                        document.getElementById('vendor_code').value = data.vendor.code;
                        document.getElementById('vendor_name').value = data.vendor.name;
                        document.getElementById('vendor_address').value = data.vendor.address || '';
                        document.getElementById('vendor_tel').value = data.vendor.phone || '';
                        document.getElementById('vendor_gst').value = data.vendor.gst || '';
                        document.getElementById('vendor_ntn').value = data.vendor.ntn || '';
                        document.getElementById('vendor_balance').value = parseFloat(data.vendor.balance || 0).toFixed(2);
                    }

                    const tbody = document.getElementById('prGridBody');
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
                    this.calculateTotals();
                } else {
                    alert("Record not found.");
                }
            });
    },

    navigate: function(dir) {
        const sn = parseInt(document.getElementById('pr_sn').value) || 0;
        if (sn + dir > 0) {
            this.loadRecord(sn + dir);
        }
    },

    deleteRecord: function() {
        if (!this.currentId) return;
        if (confirm("Are you sure you want to delete this record?")) {
            fetch(`api/purchases.php?action=delete_return&id=${this.currentId}&company_id=${this.companyId}`, { method: 'POST' })
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
        fetch(`api/purchases.php?action=get_next_return_serial&company_id=${this.companyId}`)
            .then(res => res.json())
            .then(data => {
                if (data.next_sn > 1) {
                    this.loadRecord(data.next_sn - 1);
                }
            });
    },

    print: function() {
        if (!this.currentId) return alert("Please save or load a record first.");
        const sn = document.getElementById('pr_sn').value;
        const date = document.getElementById('pr_date').value;
        const vName = document.getElementById('vendor_name').value;
        const netTot = document.getElementById('pr_net_tot').value;

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
