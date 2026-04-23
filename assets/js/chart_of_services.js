// --- CHART OF SERVICES MODULE LOGIC ---
window.ChartOfServices = {
    categories: [],
    services: [],
    selectedCatId: null,
    selectedItemId: null,

    init: async function() {
        console.log("Chart of Services: Initializing...");
        await this.loadCategories();
        this.resetCatForm();
        this.resetItemForm();
    },

    // --- CATEGORY LOGIC ---
    loadCategories: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/services.php?action=get_categories&company_id=${companyId}&_cb=${Date.now()}`);
            this.categories = await res.json();
            this.renderCategories();
        } catch (e) { console.error("Load Categories Error:", e); }
    },

    renderCategories: function() {
        const tbody = document.getElementById('servCatListBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        this.categories.forEach(cat => {
            const tr = document.createElement('tr');
            if (this.selectedCatId == cat.id) tr.classList.add('active');
            tr.onclick = () => this.selectCategory(cat.id);
            tr.innerHTML = `<td style="font-weight:700; width:80px;">${cat.code}</td><td>${cat.name}</td>`;
            tbody.appendChild(tr);
        });
    },

    selectCategory: function(id) {
        this.selectedCatId = id;
        const cat = this.categories.find(c => c.id == id);
        if (cat) {
            document.getElementById('servCatCode').value = cat.code;
            document.getElementById('servCatName').value = cat.name;
        }
        this.renderCategories();
        this.loadServices(id);
    },

    addCategory: function() {
        this.selectedCatId = null;
        this.resetCatForm();
        document.getElementById('servCatCode').focus();
        this.renderCategories();
    },

    saveCategory: async function() {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        const payload = {
            id: this.selectedCatId,
            code: document.getElementById('servCatCode').value,
            name: document.getElementById('servCatName').value
        };

        if (!payload.code || !payload.name) {
            alert("Please fill in both Category Code and Name.");
            return;
        }

        try {
            const res = await fetch(`api/services.php?action=save_category&company_id=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                await this.loadCategories();
                this.resetCatForm();
            } else {
                alert("Error: " + result.message);
            }
        } catch (e) { console.error("Save Category Error:", e); }
    },

    deleteCategory: async function() {
        if (!this.selectedCatId) return;
        
        // --- DELETE PROTECTION ---
        if (this.services && this.services.length > 0) {
            alert("This category cannot be deleted because it still contains services. Please delete the services first.");
            return;
        }

        if (!confirm("Are you sure you want to delete this category?")) return;
        
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/services.php?action=delete_category&id=${this.selectedCatId}&company_id=${companyId}`);
            const result = await res.json();
            if (result.status === 'success') {
                await this.loadCategories();
                this.resetCatForm();
                this.services = [];
                this.renderServices();
            }
        } catch (e) { console.error("Delete Category Error:", e); }
    },

    resetCatForm: function() {
        this.selectedCatId = null;
        document.getElementById('servCatCode').value = '';
        document.getElementById('servCatName').value = '';
        this.renderCategories();
    },

    // --- SERVICES LOGIC ---
    loadServices: async function(catId) {
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/services.php?action=get_services&cat_id=${catId}&company_id=${companyId}&_cb=${Date.now()}`);
            this.services = await res.json();
            this.renderServices();
            this.resetItemForm();
        } catch (e) { console.error("Load Services Error:", e); }
    },

    renderServices: function() {
        const tbody = document.getElementById('servItemListBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        this.services.forEach(item => {
            const tr = document.createElement('tr');
            if (this.selectedItemId == item.id) tr.classList.add('active');
            if (item.is_inactive == 1) tr.style.color = '#94a3b8';
            tr.onclick = () => this.selectService(item.id);
            tr.innerHTML = `<td style="font-weight:700; width:80px;">${item.code}</td><td>${item.name}</td>`;
            tbody.appendChild(tr);
        });
    },

    selectService: function(id) {
        this.selectedItemId = id;
        const item = this.services.find(s => s.id == id);
        if (item) {
            document.getElementById('servItemCode').value = item.code;
            document.getElementById('servItemName').value = item.name;
            document.getElementById('servItemDesc').value = item.description || '';
            document.getElementById('servItemPrice').value = item.selling_price;
            document.getElementById('servItemUnit').value = item.unit || '';
            document.getElementById('servItemTax').value = item.tax_rate;
            document.getElementById('servItemInactive').checked = (item.is_inactive == 1);
            
            const taxRadios = document.getElementsByName('servTaxType');
            taxRadios.forEach(r => { if(r.value == item.tax_type) r.checked = true; });
        }
        this.renderServices();
    },

    addService: function() {
        if (!this.selectedCatId) {
            alert("Please select a Category first.");
            return;
        }
        this.selectedItemId = null;
        this.resetItemForm();
        document.getElementById('servItemCode').focus();
        this.renderServices();
    },

    saveService: async function() {
        if (!this.selectedCatId) return;
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        
        const payload = {
            id: this.selectedItemId,
            cat_id: this.selectedCatId,
            code: document.getElementById('servItemCode').value,
            name: document.getElementById('servItemName').value,
            description: document.getElementById('servItemDesc').value,
            selling_price: document.getElementById('servItemPrice').value,
            unit: document.getElementById('servItemUnit').value,
            tax_rate: document.getElementById('servItemTax').value,
            tax_type: document.querySelector('input[name="servTaxType"]:checked').value,
            is_inactive: document.getElementById('servItemInactive').checked ? 1 : 0
        };

        if (!payload.code || !payload.name) {
            alert("Please fill in both Service Code and Name.");
            return;
        }

        try {
            const res = await fetch(`api/services.php?action=save_service&company_id=${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                await this.loadServices(this.selectedCatId);
            } else {
                alert("Error: " + result.message);
            }
        } catch (e) { console.error("Save Service Error:", e); }
    },

    deleteService: async function() {
        if (!this.selectedItemId) return;
        if (!confirm("Are you sure you want to delete this service?")) return;
        
        const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        const companyId = session.company_id || 1;
        try {
            const res = await fetch(`api/services.php?action=delete_service&id=${this.selectedItemId}&company_id=${companyId}`);
            const result = await res.json();
            if (result.status === 'success') {
                await this.loadServices(this.selectedCatId);
            }
        } catch (e) { console.error("Delete Service Error:", e); }
    },

    resetItemForm: function() {
        this.selectedItemId = null;
        document.getElementById('servItemCode').value = '';
        document.getElementById('servItemName').value = '';
        document.getElementById('servItemDesc').value = '';
        document.getElementById('servItemPrice').value = '0';
        document.getElementById('servItemUnit').value = '';
        document.getElementById('servItemTax').value = '0';
        document.getElementById('servItemInactive').checked = false;
        document.querySelector('input[name="servTaxType"][value="Percent"]').checked = true;
        this.renderServices();
    }
};
