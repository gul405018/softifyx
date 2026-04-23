// --- ITEM COST VALUATION METHOD MODULE LOGIC ---
window.CostMethodModule = {
    data: [],
    
    init: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        console.log("Cost Method: Initializing for company", companyId);
        
        try {
            const cb = `_cb=${Date.now()}`;
            const [treeRes, brandsRes] = await Promise.all([
                fetch(`api/inventory.php?action=get_inventory_tree&company_id=${companyId}&${cb}`),
                fetch(`api/inventory.php?action=get_brands&company_id=${companyId}&${cb}`)
            ]);
            
            if (!treeRes.ok || !brandsRes.ok) throw new Error("Failed to fetch dropdown data");
            const tree = await treeRes.json();
            const brands = await brandsRes.json();
            
            const catSelect = document.getElementById('costCategorySelect');
            if (catSelect) {
                catSelect.innerHTML = '<option value="0">Select Category...</option>';
                if (tree.mains && Array.isArray(tree.mains)) {
                    tree.mains.forEach(m => {
                        catSelect.innerHTML += `<option value="${m.id}">${m.code} - ${m.name}</option>`;
                    });
                }
            }

            const brandSelect = document.getElementById('costBrandSelect');
            if (brandSelect) {
                brandSelect.innerHTML = '<option value="0">Select Brand...</option>';
                if (brands && Array.isArray(brands)) {
                    brands.forEach(b => {
                        brandSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
                    });
                }
            }

            this.load();
        } catch (e) { console.error("Cost Method Init Error:", e); }
    },

    toggleFilters: function() {
        const filterEl = document.querySelector('input[name="costFilter"]:checked');
        if (!filterEl) return;
        const filter = filterEl.value;
        const catSel = document.getElementById('costCategorySelect');
        const brandSel = document.getElementById('costBrandSelect');
        if (catSel) catSel.disabled = (filter !== 'category');
        if (brandSel) brandSel.disabled = (filter !== 'brand');
        this.load();
    },

    load: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        const filterEl = document.querySelector('input[name="costFilter"]:checked');
        if (!filterEl) return;

        const filterType = filterEl.value;
        let filterId = 0;
        if (filterType === 'category') filterId = document.getElementById('costCategorySelect')?.value || 0;
        if (filterType === 'brand') filterId = document.getElementById('costBrandSelect')?.value || 0;

        if (filterType !== 'all' && (filterId == 0 || filterId == '0')) {
            this.data = [];
            this.render();
            return;
        }

        try {
            const cb = `_cb=${Date.now()}`;
            const res = await fetch(`api/inventory.php?action=get_cost_settings&company_id=${companyId}&filter_type=${filterType}&filter_id=${filterId}&${cb}`);
            if (!res.ok) throw new Error("Fetch failed");
            const resData = await res.json();
            
            if (Array.isArray(resData)) {
                this.data = resData.map(item => ({
                    ...item,
                    cost_method: item.cost_method || 'Weighted Average Cost'
                }));
            } else if (resData && Array.isArray(resData.items)) {
                this.data = resData.items.map(item => ({
                    ...item,
                    cost_method: item.cost_method || 'Weighted Average Cost'
                }));
            } else {
                this.data = [];
            }
            
            this.render();
        } catch (e) { console.error("Cost Method Load Error:", e); }
    },

    render: function() {
        const tbody = document.getElementById('itemCostMethodTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!this.data || this.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No items found</td></tr>';
            return;
        }

        this.data.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.id;
            tr.ondblclick = () => window.CostMethodModule.toggleItemMethod(item.id);
            tr.innerHTML = `
                <td style="text-align: center; color: #1e293b; font-size: 10px;"><i class="fas fa-play"></i></td>
                <td style="text-align: center; font-weight: 700;">${item.code}</td>
                <td>${item.name}</td>
                <td style="font-weight: 600; color: ${item.cost_method === 'Manual Cost' ? '#b91c1c' : '#1e40af'};">
                    ${item.cost_method}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    toggleItemMethod: function(id) {
        const item = this.data.find(i => i.id === id);
        if (item) {
            item.cost_method = (item.cost_method === 'Weighted Average Cost') ? 'Manual Cost' : 'Weighted Average Cost';
            this.render();
        }
    },

    bulkSet: function(method) {
        this.data.forEach(item => {
            item.cost_method = method;
        });
        this.render();
    },

    save: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        const payload = { methods: this.data.map(i => ({ item_id: i.id, cost_method: i.cost_method })) };

        try {
            const res = await fetch(`api/inventory.php?action=save_bulk_cost_methods&company_id=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                alert('Cost valuation methods updated successfully!');
            } else {
                alert('Error: ' + result.message);
            }
        } catch (e) { alert('Failed to save settings.'); }
    }
};
