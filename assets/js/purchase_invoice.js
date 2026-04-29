window.PIModule = {
    currentId: null,
    
    init: function() {
        this.resetForm(true);
        this.setupKeyboardShortcuts();
        this.setupCalculations();
        this.setupVendorSearch();
        this.setupExpenseSearch();
        this.addEmptyRow();
        this.toggleTaxMode();
    },

    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveInvoice();
            }
        });
    },

    toggleTaxMode: function() {
        const isTax = document.getElementById('pi_is_tax').checked;
        const taxCols = document.querySelectorAll('.pi-tax-col, .pi-tax-field');
        const nonTaxCols = document.querySelectorAll('.pi-nontax-col');
        
        taxCols.forEach(el => el.style.display = isTax ? '' : 'none');
        nonTaxCols.forEach(el => el.style.display = isTax ? 'none' : '');
        
        this.calculateTotals();
    },

    setupVendorSearch: function() {
        const input = document.getElementById('vendor_code');
        const suggest = document.getElementById('vendor_suggest');
        const nameField = document.getElementById('vendor_name');
        const addrField = document.getElementById('vendor_address');
        const telField = document.getElementById('vendor_tel');
        const gstField = document.getElementById('vendor_gst');
        const ntnField = document.getElementById('vendor_ntn');

        let timeout = null;

        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const val = e.target.value.trim();
            if (val.length < 2) {
                suggest.style.display = 'none';
                return;
            }

            timeout = setTimeout(async () => {
                const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const coId = session.company_id || 1;
                try {
                    const res = await fetch(`api/maintain.php?action=get_vendors&company_id=${coId}`);
                    const vendors = await res.json();
                    
                    const matches = vendors.filter(v => 
                        v.code.toLowerCase().includes(val.toLowerCase()) || 
                        v.name.toLowerCase().includes(val.toLowerCase())
                    ).slice(0, 10);

                    if (matches.length > 0) {
                        suggest.innerHTML = matches.map(v => 
                            `<div data-id="${v.coa_list_id || v.id}" data-code="${v.code}" data-name="${v.name}" data-addr="${v.address || ''}" data-tel="${v.telephone || ''}" data-gst="${v.st_reg_no || ''}" data-ntn="${v.ntn_cnic || ''}">
                                <b>${v.code}</b> - ${v.name}
                            </div>`
                        ).join('');
                        suggest.style.display = 'block';
                    } else {
                        suggest.style.display = 'none';
                    }
                } catch(e) { console.error("Vendor Search Error:", e); }
            }, 300);
        });

        suggest.addEventListener('click', (e) => {
            const div = e.target.closest('div');
            if (!div) return;
            
            input.dataset.coaId = div.dataset.id;
            input.value = div.dataset.code;
            nameField.value = div.dataset.name;
            addrField.value = div.dataset.addr;
            telField.value = div.dataset.tel;
            gstField.value = div.dataset.gst;
            ntnField.value = div.dataset.ntn;
            suggest.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== suggest) suggest.style.display = 'none';
        });
    },

    setupExpenseSearch: function() {
        const input = document.getElementById('expense_name');
        const codeField = document.getElementById('expense_code');
        const suggest = document.getElementById('expense_suggest');

        let timeout = null;

        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const val = e.target.value.trim();
            if (val.length < 2) {
                suggest.style.display = 'none';
                return;
            }

            timeout = setTimeout(async () => {
                const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const coId = session.company_id || 1;
                try {
                    const res = await fetch(`api/admin.php?action=get_coa_list&company_id=${coId}`);
                    const coa = await res.json();
                    
                    const matches = coa.filter(c => 
                        (c.account_type === 'Expense' || c.account_type === 'Cost of Sales') &&
                        (c.account_code.includes(val) || c.account_name.toLowerCase().includes(val.toLowerCase()))
                    ).slice(0, 10);

                    if (matches.length > 0) {
                        suggest.innerHTML = matches.map(c => 
                            `<div data-code="${c.account_code}" data-name="${c.account_name}">
                                <b>${c.account_code}</b> - ${c.account_name}
                            </div>`
                        ).join('');
                        suggest.style.display = 'block';
                    } else {
                        suggest.style.display = 'none';
                    }
                } catch(e) {}
            }, 300);
        });

        suggest.addEventListener('click', (e) => {
            const div = e.target.closest('div');
            if (!div) return;
            
            codeField.value = div.dataset.code;
            input.value = div.dataset.name;
            suggest.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== suggest) suggest.style.display = 'none';
        });
    },

    setupCalculations: function() {
        document.getElementById('piGridBody').addEventListener('input', (e) => {
            if (e.target.classList.contains('num')) {
                this.calculateRow(e.target.closest('tr'));
            }
        });
    },

    addEmptyRow: function(data = {}) {
        const tbody = document.getElementById('piGridBody');
        const tr = document.createElement('tr');
        if (data.item_coa_id) tr.dataset.coaId = data.item_coa_id;
        
        tr.innerHTML = `
            <td style="text-align: center; cursor: pointer; color: red; font-size: 10px;" onclick="window.PIModule.deleteRow(this)">✖</td>
            <td>
                <div style="position: relative; width: 100%; height: 100%;">
                    <input type="text" class="grid-input item-code-search" value="${data.code || ''}">
                    <div class="po-suggest item-suggest"></div>
                </div>
            </td>
            <td><input type="text" class="grid-input" value="${data.name || ''}" readonly></td>
            <td><input type="text" class="grid-input num pieces" value="${data.pieces || ''}"></td>
            <td><input type="text" class="grid-input num qty" value="${data.quantity || ''}"></td>
            <td><input type="text" class="grid-input" value="${data.unit || ''}" readonly></td>
            <td><input type="text" class="grid-input num rate" value="${data.rate || ''}"></td>
            
            <!-- Tax Mode -->
            <td class="pi-tax-col"><input type="text" class="grid-input num val-excl" value="${data.gross_amount || ''}" readonly></td>
            <td class="pi-tax-col"><input type="text" class="grid-input num stax-rate" value="${data.sales_tax_rate || ''}"></td>
            <td class="pi-tax-col"><input type="text" class="grid-input num stax-amt" value="${data.sales_tax_amount || ''}" readonly></td>
            <td class="pi-tax-col"><input type="text" class="grid-input num ftax-rate" value="${data.further_tax_rate || ''}"></td>
            <td class="pi-tax-col"><input type="text" class="grid-input num ftax-amt" value="${data.further_tax_amount || ''}" readonly></td>
            <td class="pi-tax-col"><input type="text" class="grid-input num val-incl" value="${data.net_amount || ''}" readonly></td>
            
            <!-- Non-Tax Mode -->
            <td class="pi-nontax-col"><input type="text" class="grid-input num gross-amt" value="${data.gross_amount || ''}" readonly></td>
            <td class="pi-nontax-col"><input type="text" class="grid-input num disc-perc" value="${data.discount_percent || ''}"></td>
            <td class="pi-nontax-col"><input type="text" class="grid-input num disc-amt" value="${data.discount_amount || ''}"></td>
            <td class="pi-nontax-col"><input type="text" class="grid-input num net-amt" value="${data.net_amount || ''}" readonly></td>
        `;
        
        tbody.appendChild(tr);
        this.setupItemSearch(tr);
        this.toggleTaxMode(); // Apply current visibility
    },

    deleteRow: function(td) {
        td.closest('tr').remove();
        this.calculateTotals();
    },

    setupItemSearch: function(tr) {
        const input = tr.querySelector('.item-code-search');
        const suggest = tr.querySelector('.item-suggest');
        let timeout = null;

        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const val = e.target.value.trim();
            if (val.length < 2) {
                suggest.style.display = 'none';
                return;
            }

            timeout = setTimeout(async () => {
                const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const coId = session.company_id || 1;
                try {
                    const res = await fetch(`api/inventory.php?action=get_items&company_id=${coId}`);
                    const items = await res.json();
                    
                    const matches = items.filter(i => 
                        i.item_code.toLowerCase().includes(val.toLowerCase()) || 
                        i.item_name.toLowerCase().includes(val.toLowerCase())
                    ).slice(0, 10);

                    if (matches.length > 0) {
                        suggest.innerHTML = matches.map(i => 
                            `<div data-id="${i.id}" data-code="${i.item_code}" data-name="${i.item_name}" data-unit="${i.primary_unit || ''}">
                                <b>${i.item_code}</b> - ${i.item_name}
                            </div>`
                        ).join('');
                        suggest.style.display = 'block';
                    } else { suggest.style.display = 'none'; }
                } catch(err) {}
            }, 300);
        });

        suggest.addEventListener('click', (e) => {
            const div = e.target.closest('div');
            if (!div) return;
            
            tr.dataset.coaId = div.dataset.id;
            input.value = div.dataset.code;
            tr.cells[2].querySelector('input').value = div.dataset.name;
            tr.cells[5].querySelector('input').value = div.dataset.unit;
            suggest.style.display = 'none';
            
            if (tr === document.getElementById('piGridBody').lastElementChild) {
                this.addEmptyRow();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== suggest) suggest.style.display = 'none';
        });
    },

    calculateRow: function(tr) {
        const qty = parseFloat(tr.querySelector('.qty').value) || 0;
        const rate = parseFloat(tr.querySelector('.rate').value) || 0;
        const isTax = document.getElementById('pi_is_tax').checked;
        
        const gross = qty * rate;
        let net = gross;
        
        // Populate Both Views Just In Case Toggle Happens Later
        tr.querySelector('.val-excl').value = gross.toFixed(2);
        tr.querySelector('.gross-amt').value = gross.toFixed(2);
        
        if (isTax) {
            const stRate = parseFloat(tr.querySelector('.stax-rate').value) || 0;
            const ftRate = parseFloat(tr.querySelector('.ftax-rate').value) || 0;
            
            const stAmt = (gross * stRate) / 100;
            const ftAmt = (gross * ftRate) / 100;
            
            tr.querySelector('.stax-amt').value = stAmt.toFixed(2);
            tr.querySelector('.ftax-amt').value = ftAmt.toFixed(2);
            
            net = gross + stAmt + ftAmt;
            tr.querySelector('.val-incl').value = net.toFixed(2);
            tr.querySelector('.net-amt').value = net.toFixed(2);
        } else {
            const discPerc = parseFloat(tr.querySelector('.disc-perc').value) || 0;
            let discAmt = parseFloat(tr.querySelector('.disc-amt').value) || 0;
            
            if (e && e.target && e.target.classList.contains('disc-perc')) {
                discAmt = (gross * discPerc) / 100;
                tr.querySelector('.disc-amt').value = discAmt.toFixed(2);
            } else if (e && e.target && e.target.classList.contains('disc-amt')) {
                // If disc amt typed, ignore perc logic
            } else {
                if (discPerc > 0) discAmt = (gross * discPerc) / 100;
                tr.querySelector('.disc-amt').value = discAmt.toFixed(2);
            }
            
            net = gross - discAmt;
            tr.querySelector('.net-amt').value = net.toFixed(2);
            tr.querySelector('.val-incl').value = net.toFixed(2);
        }
        
        this.calculateTotals();
    },

    calculateTotals: function() {
        let tPcs = 0, tQty = 0, tGross = 0;
        let tStax = 0, tFtax = 0;
        let tDisc = 0, tNet = 0;
        
        document.querySelectorAll('#piGridBody tr').forEach(tr => {
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
        
        // Tax
        document.getElementById('tot_excl').value = tGross.toFixed(2);
        document.getElementById('tot_stax').value = tStax.toFixed(2);
        document.getElementById('tot_further').value = tFtax.toFixed(2);
        document.getElementById('tot_incl').value = tNet.toFixed(2);
        
        // Non-Tax
        document.getElementById('tot_gross').value = tGross.toFixed(2);
        document.getElementById('tot_disc').value = tDisc.toFixed(2);
        document.getElementById('tot_net').value = tNet.toFixed(2);
        
        const isTax = document.getElementById('pi_is_tax').checked;
        
        document.getElementById('pi_gross_tot').value = tGross.toFixed(2);
        
        const addDisc = parseFloat(document.getElementById('pi_add_disc').value) || 0;
        const freight = parseFloat(document.getElementById('pi_freight').value) || 0;
        const paid = parseFloat(document.getElementById('pi_paid').value) || 0;
        
        let finalNet = 0;
        if (isTax) {
            finalNet = tNet + freight;
        } else {
            finalNet = tNet - addDisc + freight;
        }
        
        document.getElementById('pi_net_tot').value = finalNet.toFixed(2);
        document.getElementById('pi_balance').value = (finalNet - paid).toFixed(2);
        
        try {
            document.getElementById('pi_amt_words').innerText = "Rupees " + Math.round(finalNet).toString() + " only.";
        } catch(e){}
    },

    resetForm: async function(fetchNext = false) {
        this.currentId = null;
        document.querySelectorAll('input:not(#expense_code):not(#expense_name), textarea').forEach(el => {
            if(el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });
        document.getElementById('vendor_code').dataset.coaId = '';
        document.getElementById('pi_date').valueAsDate = new Date();
        document.getElementById('piGridBody').innerHTML = '';
        
        document.getElementById('pi_is_tax').checked = false;
        this.toggleTaxMode();
        this.addEmptyRow();
        this.calculateTotals();

        if (fetchNext) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const coId = session.company_id || 1;
            const res = await fetch(`api/purchases.php?action=get_next_invoice_serial&company_id=${coId}`);
            const data = await res.json();
            document.getElementById('pi_sn').value = data.next_sn || 1;
        }
    },

    saveInvoice: async function() {
        const vendorId = document.getElementById('vendor_code').dataset.coaId;
        if (!vendorId) return alert("Please select a valid Vendor!");

        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;

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
            const coaId = tr.dataset.coaId;
            if (!coaId) return;
            payload.items.push({
                item_coa_id: coaId,
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
            const res = await fetch(`api/purchases.php?action=save_invoice&company_id=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                alert("Purchase Invoice saved successfully!");
                this.resetForm(true);
            } else { alert("Save Error: " + result.message); }
        } catch (e) { console.error("Save Invoice Error:", e); }
    },

    navigate: async function(dir) {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        let sn = parseInt(document.getElementById('pi_sn').value);
        sn = (dir === 'next') ? sn + 1 : sn - 1;
        if (sn < 1) return;

        try {
            const res = await fetch(`api/purchases.php?action=get_invoice&serial_no=${sn}&company_id=${companyId}`);
            const inv = await res.json();
            if (inv && inv.id) {
                this.loadInvoiceData(inv);
            } else {
                if (dir === 'next') this.resetForm(true);
            }
        } catch (e) { console.error("Navigation Error:", e); }
    },

    loadInvoiceData: function(inv) {
        this.currentId = inv.id;
        document.getElementById('pi_sn').value = inv.serial_no;
        document.getElementById('pi_is_cancelled').checked = inv.is_cancelled == 1;
        document.getElementById('pi_is_tax').checked = inv.is_tax_invoice == 1;
        this.toggleTaxMode();

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

        if (inv.vendor) {
            document.getElementById('vendor_code').dataset.coaId = inv.vendor_coa_id;
            document.getElementById('vendor_code').value = inv.vendor.code || '';
            document.getElementById('vendor_name').value = inv.vendor.name || '';
            document.getElementById('vendor_address').value = inv.vendor.address || '';
            document.getElementById('vendor_tel').value = inv.vendor.telephone || '';
            document.getElementById('vendor_gst').value = inv.vendor.st_reg_no || '';
            document.getElementById('vendor_ntn').value = inv.vendor.ntn_cnic || '';
        }

        document.getElementById('piGridBody').innerHTML = '';
        if (inv.items && inv.items.length > 0) {
            inv.items.forEach(item => this.addEmptyRow(item));
        }
        this.addEmptyRow();
        this.calculateTotals();
    },

    deleteInvoice: async function() {
        if (!this.currentId) return alert("No Purchase Invoice loaded to delete.");
        if (!confirm("Are you sure you want to delete this Invoice?")) return;

        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;

        try {
            const res = await fetch(`api/purchases.php?action=delete_invoice&id=${this.currentId}&company_id=${companyId}`, { method: 'POST' });
            const result = await res.json();
            if (result.status === 'success') {
                alert("Purchase Invoice deleted successfully.");
                this.resetForm(true);
            }
        } catch (e) { alert("Failed to delete Purchase Invoice."); }
    },

    printInvoice: function() {
        if (!this.currentId) return alert("Please save or load an Invoice before printing.");
        // Basic print logic placeholder matching the existing system pattern
        const sn = document.getElementById('pi_sn').value;
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`<h2>Purchase Invoice #${sn}</h2><p>Printing functionality is identical to layout.</p><script>window.onload=function(){window.print();window.close();}</script>`);
        printWindow.document.close();
    }
};

setTimeout(() => { if(window.PIModule) window.PIModule.init(); }, 100);
