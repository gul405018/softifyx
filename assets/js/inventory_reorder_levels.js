// --- ITEM REORDER LEVELS MODULE LOGIC ---
window.ReorderLevelsModule = {
    data: [],
    
    init: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        console.log("Reorder Levels: Initializing for company", companyId);
        
        try {
            const cb = `_cb=${Date.now()}`;
            const [treeRes, brandsRes] = await Promise.all([
                fetch(`api/inventory.php?action=get_inventory_tree&company_id=${companyId}&${cb}`),
                fetch(`api/inventory.php?action=get_brands&company_id=${companyId}&${cb}`)
            ]);
            
            if (!treeRes.ok || !brandsRes.ok) throw new Error("Failed to fetch dropdown data");
            const tree = await treeRes.json();
            const brands = await brandsRes.json();
            
            const catSelect = document.getElementById('reorderCategorySelect');
            if (catSelect) {
                catSelect.innerHTML = '<option value="0">Select Category...</option>';
                if (tree.mains && Array.isArray(tree.mains)) {
                    tree.mains.forEach(m => {
                        catSelect.innerHTML += `<option value="${m.id}">${m.code} - ${m.name}</option>`;
                    });
                }
            }

            const brandSelect = document.getElementById('reorderBrandSelect');
            if (brandSelect) {
                brandSelect.innerHTML = '<option value="0">Select Brand...</option>';
                if (brands && Array.isArray(brands)) {
                    brands.forEach(b => {
                        brandSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
                    });
                }
            }

            this.load();
        } catch (e) { console.error("Reorder Levels Init Error:", e); }
    },

    toggleFilters: function() {
        const filterEl = document.querySelector('input[name="reorderFilter"]:checked');
        if (!filterEl) return;
        const filter = filterEl.value;
        const catSel = document.getElementById('reorderCategorySelect');
        const brandSel = document.getElementById('reorderBrandSelect');
        if (catSel) catSel.disabled = (filter !== 'category');
        if (brandSel) brandSel.disabled = (filter !== 'brand');
        this.load();
    },

    load: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        const filterEl = document.querySelector('input[name="reorderFilter"]:checked');
        if (!filterEl) return;

        const filterType = filterEl.value;
        let filterId = 0;
        if (filterType === 'category') filterId = document.getElementById('reorderCategorySelect')?.value || 0;
        if (filterType === 'brand') filterId = document.getElementById('reorderBrandSelect')?.value || 0;

        if (filterType !== 'all' && (filterId == 0 || filterId == '0')) {
            this.data = [];
            this.render();
            return;
        }

        try {
            const cb = `_cb=${Date.now()}`;
            const res = await fetch(`api/inventory.php?action=get_reorder_settings&company_id=${companyId}&filter_type=${filterType}&filter_id=${filterId}&${cb}`);
            if (!res.ok) throw new Error("Fetch failed");
            const resData = await res.json();
            
            if (Array.isArray(resData)) {
                this.data = resData;
            } else if (resData && Array.isArray(resData.items)) {
                this.data = resData.items;
            } else {
                this.data = [];
            }
            
            this.render();
        } catch (e) { console.error("Reorder Levels Load Error:", e); }
    },

    render: function() {
        const tbody = document.getElementById('itemReorderLevelsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!this.data || this.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No items found</td></tr>';
            return;
        }

        this.data.forEach(item => {
            tbody.innerHTML += `
                <tr data-id="${item.id}">
                    <td style="text-align: center; color: #1e293b; font-size: 10px;"><i class="fas fa-play"></i></td>
                    <td style="text-align: center; font-weight: 700;">${item.code}</td>
                    <td>${item.name}</td>
                    <td style="text-align: center;">${item.unit || ''}</td>
                    <td style="text-align: center;">
                        <input type="number" step="0.01" class="reorder-input-cell" 
                               value="${parseFloat(item.order_qty || 0).toFixed(2)}" 
                               onchange="window.ReorderLevelsModule.updateQty(${item.id}, this.value)">
                    </td>
                </tr>
            `;
        });
    },

    updateQty: function(id, val) {
        const item = this.data.find(i => i.id === id);
        if (item) item.order_qty = parseFloat(val) || 0;
    },

    save: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        const payload = { reorders: this.data.map(i => ({ item_id: i.id, order_qty: i.order_qty })) };

        try {
            const res = await fetch(`api/inventory.php?action=save_bulk_reorders&company_id=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                alert('Re-order levels updated successfully!');
            } else {
                alert('Error: ' + result.message);
            }
        } catch (e) { alert('Failed to save re-order levels.'); }
    }
};
