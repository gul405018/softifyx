        let currentUser = "Administrator";
        let companyData = {
            name: "",
            address: "",
            phone: "",
            fax: "",
            email: "",
            website: "",
            gst: "",
            ntn: "",
            dealsIn: ""
        };
        
        let companies = [];
        let currentNote = "";
        
        let users = [
            { id: 1, username: "Administrator", role: "Admin", email: "admin@softifyx.com", status: "Active", password: "123" }
        ];

        let logoData = null;
        let originSelectedCompanyName = ""; 
        let originSelectedCompanyId = null; // New: track DB id for companies

        let inventoryItems = [];
        let coaMain = [];
        let coaSub = [];
        let coaList = [];

        const DEFAULT_COA_MAIN = [
            { code: "100", name: "Cash", component: "Current Assets" },
            { code: "110", name: "Bank", component: "Current Assets" },
            { code: "120", name: "Customers", component: "Current Assets" },
            { code: "130", name: "Inventories", component: "Current Assets" },
            { code: "140", name: "Advance & Prepayments", component: "Current Assets" },
            { code: "150", name: "Short-term Investment", component: "Non-Current Assets" },
            { code: "160", name: "Fixed Assets", component: "Non-Current Assets" },
            { code: "170", name: "Preliminary Expenses", component: "Non-Current Assets" },
            { code: "180", name: "Long-term Investment", component: "Non-Current Assets" },
            { code: "210", name: "Vendors/Suppliers", component: "Current Liabilities" },
            { code: "220", name: "Accrued Expenses", component: "Current Liabilities" },
            { code: "230", name: "Short-term Loans", component: "Current Liabilities" },
            { code: "240", name: "Long-term Loans", component: "Non-Current Liabilities" },
            { code: "300", name: "Capital", component: "Equity" },
            { code: "310", name: "Owner’s Drawing Account", component: "Equity" },
            { code: "320", name: "Profit/Loss Account", component: "Income" },
            { code: "400", name: "Revenue", component: "Income" },
            { code: "700", name: "Other Operating Income", component: "Income" },
            { code: "500", name: "Cost of Sale", component: "Expenses" },
            { code: "600", name: "Administrative Expenses", component: "Expenses" },
            { code: "650", name: "Marketing & Distribution Expenses", component: "Expenses" },
            { code: "670", name: "Financial Expenses", component: "Expenses" },
            { code: "680", name: "Taxation", component: "Expenses" },
            { code: "800", name: "Other Expenses", component: "Expenses" }
        ];

        let dailySummary = { /* default state ... */ }; 
        // Initial empty state (will be populated from summary prefix)
        
        // Helper for Multi-Company Isolation (Separate Databases)
        function getCoKey(key) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const coName = session.company || 'default';
            // Global keys that should NOT be isolated
            const globalKeys = ['softifyx_companies', 'softifyx_session'];
            if (globalKeys.includes(key)) return key;
            // Company-specific keys
            return `softifyx_${coName}_${key.replace('softifyx_', '')}`;
        }

        function loadSavedData() {
            // 1. Fetch Company List
            fetch('api/manage_companies.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        companies = data.data.map(c => ({ id: c.id, name: c.name, ...c }));
                        
                        // Sync companyData with current session company
                        const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                        const activeCo = companies.find(c => c.name === sessionData.company);
                        if (activeCo) {
                            companyData = {
                                name: activeCo.name,
                                address: activeCo.address || "",
                                phone: activeCo.phone || "",
                                fax: activeCo.fax || "",
                                email: activeCo.email || "",
                                website: activeCo.website || "",
                                gst: activeCo.gst_no || "",
                                ntn: activeCo.ntn_no || "",
                                dealsIn: activeCo.deals_in || ""
                            };
                            originSelectedCompanyId = activeCo.id;
                        } else if (sessionData.company) {
                            companyData.name = sessionData.company;
                        }
                        updateNames();
                        updateDashboardSummary();
                        
                        // 2. Fetch Logo from DB
                        if (sessionData.company) {
                            fetch(`api/get_logo.php?name=${encodeURIComponent(sessionData.company)}`)
                                .then(res => res.json())
                                .then(lData => {
                                    if (lData.status === 'success' && lData.logo) {
                                        logoData = lData.logo;
                                        displayLogo();
                                    }
                                });
                        }
                    }
                });

            // 3. Fetch Users
            fetch('api/manage_users.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        users = data.data;
                    }
                });

            // Load local UI states only
            coaMain = JSON.parse(localStorage.getItem(getCoKey('softifyx_coa_main')) || '[]');
            coaSub = JSON.parse(localStorage.getItem(getCoKey('softifyx_coa_sub')) || '[]');
            coaList = JSON.parse(localStorage.getItem(getCoKey('softifyx_coa_list')) || '[]');

            if (coaMain.length === 0) { coaMain = [...DEFAULT_COA_MAIN]; }

            updateNames();
            updateDashboardSummary();
        }

        function resetDashboardModel() {
            dailySummary = {
                sales: 0, cashValue: 0, bankBalance: 0, receivablesValue: 0,
                cashOpening: 0, cashReceipts: 0, cashPayments: 0,
                recOpening: 0, recSales: 0, recReceipts: 0,
                payOpening: 0, payPurchases: 0, payPayments: 0,
                newInvoices: 0, customerReceipts: 0, overdue: 0,
                newPurchases: 0, vendorPayments: 0, outstanding: 0
            };
        }

        function updateDashboardSummary() {
            const get = id => document.getElementById(id);
            const savedCurr = localStorage.getItem(getCoKey('softifyx_currency'));
            const currencySymbol = (savedCurr ? JSON.parse(savedCurr).symbol : 'Rs.') + ' ';
            const fmt = val => currencySymbol + (val || 0).toLocaleString('en-IN');

                    // --- 1. MAIN DASHBOARD CONTENT (dashboard.html) ---
            const showOrHide = (id, permission, value) => {
                const el = get(id);
                if (!el) return;
                if (!checkUserRights(permission)) {
                    el.textContent = "Restricted";
                    el.style.color = "#bdc3c7";
                    el.style.fontSize = "14px";
                } else {
                    el.textContent = fmt(value);
                    el.style.color = "";
                    el.style.fontSize = "";
                }
            };
            
            showOrHide('salesValue', 'Sale Summary', dailySummary.sales);
            showOrHide('cashValue', 'Recovery/Receipts Reports', dailySummary.cashOpening + dailySummary.cashReceipts - dailySummary.cashPayments);
            showOrHide('bankValue', 'Cash & Bank Balances', dailySummary.bankBalance);
            showOrHide('receivablesValue', 'Accounts Receivable Aging', dailySummary.recOpening + dailySummary.recSales - dailySummary.recReceipts);

            // Financial Cards (Match dashboard.html IDs)
            showOrHide('cashOpening', 'Cash Payments', dailySummary.cashOpening);
            showOrHide('cashReceipts', 'Cash Receipts', dailySummary.cashReceipts);
            showOrHide('cashPayments', 'Cash Payments', dailySummary.cashPayments);
            showOrHide('cashCurrent', 'Cash Payments', dailySummary.cashOpening + dailySummary.cashReceipts - dailySummary.cashPayments);

            const rO = get('recOpening'); if(rO) rO.textContent = fmt(dailySummary.recOpening);
            const rS = get('recSales'); if(rS) rS.textContent = fmt(dailySummary.recSales);
            const rR = get('recReceipts'); if(rR) rR.textContent = fmt(dailySummary.recReceipts);
            const rC = get('recCurrent'); if(rC) rC.textContent = fmt(dailySummary.recOpening + dailySummary.recSales - dailySummary.recReceipts);

            const pO = get('payOpening'); if(pO) pO.textContent = fmt(dailySummary.payOpening);
            const pP = get('payPurchases'); if(pP) pP.textContent = fmt(dailySummary.payPurchases);
            const pPa = get('payPayments'); if(pPa) pPa.textContent = fmt(dailySummary.payPayments);
            const pC = get('payCurrent'); if(pC) pC.textContent = fmt(dailySummary.payOpening + dailySummary.payPurchases - dailySummary.payPayments);

            // --- 2. RIGHT SIDEBAR SUMMARY (index.html) ---
            
            // Cash Position
            const scO = get('summaryCashOpening'); if(scO) scO.textContent = fmt(dailySummary.cashOpening);
            const scR = get('summaryCashReceipts'); if(scR) scR.textContent = fmt(dailySummary.cashReceipts);
            const scP = get('summaryCashPayments'); if(scP) scP.textContent = fmt(dailySummary.cashPayments);
            const scN = get('summaryCashNet'); if(scN) scN.textContent = fmt(dailySummary.cashOpening + dailySummary.cashReceipts - dailySummary.cashPayments);

            // Customer Activity
            const snI = get('summaryNewInvoices'); if(snI) snI.textContent = checkUserRights("Sale Summary") ? dailySummary.newInvoices : "*";
            const scr = get('summaryCustomerReceipts'); if(scr) scr.textContent = checkUserRights("Recovery/Receipts Reports") ? fmt(dailySummary.customerReceipts) : "Restricted";
            const sod = get('summaryOverdue'); if(sod) sod.textContent = fmt(dailySummary.overdue);

            // Vendor Activity
            const snP = get('summaryNewPurchases'); if(snP) snP.textContent = dailySummary.newPurchases;
            const svp = get('summaryVendorPayments'); if(svp) svp.textContent = checkUserRights("Payments Reports") ? fmt(dailySummary.vendorPayments) : "Restricted";
            const sou = get('summaryOutstanding'); if(sou) sou.textContent = checkUserRights("Accounts Payable Aging") ? fmt(dailySummary.outstanding) : "Restricted";

            // --- 3. COMMON WIDGETS ---
            
            // Low Stock / Inventory Alerts
            let lowStock = inventoryItems.filter(item => item.stock < item.reorderLevel).length;
            const lsc = get('lowStockCount'); if(lsc) lsc.textContent = lowStock + ' Items';
            const rc = get('reorderCount'); if(rc) rc.textContent = (lowStock > 2 ? 2 : lowStock) + ' Items';

            // Weekly Sales Trend
            const bars = document.querySelectorAll('.graph-bars .bar');
            bars.forEach(bar => {
                bar.style.height = '0px';
            });

            // Re-apply currency symbols after data update
            applyGlobalCurrencySymbol();
        }

        function saveSummary() {
            localStorage.setItem(getCoKey('softifyx_summary'), JSON.stringify(dailySummary));
        }

        function displayLogo() {
            const logoDisplay = document.getElementById('logoDisplay');
            const dashLogo = document.getElementById('dashLogo');
            const logoPath = 'assets/logos/logo.png';
            
            // 1. Navbar (Top-Right): Show ONLY the Business Owner's Uploaded Logo (logoData)
            if (logoDisplay) {
                if (logoData) {
                    logoDisplay.innerHTML = `<img src="${logoData}" id="userLogo" style="height: 35px; width: auto; border-radius: 4px;">`;
                } else {
                    logoDisplay.innerHTML = ''; // Hide if no custom logo uploaded
                }
            }

            // 2. Dashboard Middle (Welcome Card): Always Show Software Company Logo (logo.png)
            if (dashLogo) {
                dashLogo.src = logoPath;
                dashLogo.style.display = 'block';
                dashLogo.onerror = function() {
                    this.style.display = 'none'; // Hide if file missing
                    this.parentElement.style.boxShadow = 'none'; // Clean up parent
                };
            }
        }

        function updateNames() {
            const titleEl = document.getElementById('titleCompanyName');
            if (titleEl) titleEl.textContent = `- ${companyData.name}`;
            
            const dashNameEl = document.getElementById('dashboardCompanyName');
            if (dashNameEl) dashNameEl.textContent = companyData.name;
            
            // Critical: Update Browser Tab Title
            document.title = `Softifyx - ${companyData.name || 'Financials'}`;

            const welcomeEl = document.getElementById('welcomeUserDisplay');
            if (welcomeEl) welcomeEl.innerHTML = `<i class="fas fa-user-circle"></i> <span>Welcome ${currentUser}</span>`;
        }

        function hideAllDropdowns() {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
                dropdown.classList.remove('show');
            });
        }

        function toggleDropdown(menuItem) {
            const dropdown = menuItem.querySelector('.dropdown');
            if (!dropdown) return;
            
            const isVisible = dropdown.style.display === 'block' || dropdown.classList.contains('show');
            
            if (isVisible) {
                dropdown.style.display = 'none';
                dropdown.classList.remove('show');
            } else {
                hideAllDropdowns();
                dropdown.style.display = 'block';
                dropdown.classList.add('show');
            }
        }

        function setupDropdowns() {
            document.querySelectorAll('.menu-item').forEach(menuItem => {
                menuItem.addEventListener('click', function(e) {
                    // Only toggle if they clicked the direct menu-item text, not inside its dropdown
                    if (e.target === this || e.target.parentElement === this && !e.target.closest('.dropdown')) {
                        e.stopPropagation();
                        
                        // Exclusive Toggle: Close all other main dropdowns
                        const dropdown = this.querySelector('.dropdown');
                        const isAlreadyOpen = dropdown && (dropdown.style.display === 'block' || dropdown.classList.contains('show'));
                        
                        hideAllDropdowns();
                        
                        if (!isAlreadyOpen) {
                            toggleDropdown(this);
                        }
                    }
                });
            });

            // Prevent dropdown clicks from bubbling up and hiding the menu-item
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.addEventListener('click', function(e) {
                    e.stopPropagation(); 
                });
            });

            // Handle nested dropdowns specifically for touch/click compatibility
            document.querySelectorAll('.has-nested').forEach(nested => {
                nested.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const nestedMenu = this.querySelector('.nested-dropdown');
                    if (nestedMenu) {
                        const isShown = nestedMenu.classList.contains('show-nested');
                        // Close any other nested dropdowns first
                        document.querySelectorAll('.nested-dropdown').forEach(nd => nd.classList.remove('show-nested'));
                        if (!isShown) {
                            nestedMenu.classList.add('show-nested');
                        }
                    }
                });
            });

            // Mobile Menu Toggle
            const menuToggle = document.querySelector('.mobile-menu-toggle');
            const navMenu = document.getElementById('navMenu');
            if (menuToggle && navMenu) {
                menuToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navMenu.classList.toggle('active');
                });
            }

            document.addEventListener('click', function(e) {
                if (!e.target.closest('.menu-item') && !e.target.closest('.dropdown') && !e.target.closest('.nested-dropdown') && !e.target.closest('.mobile-menu-toggle')) {
                    hideAllDropdowns();
                    if(navMenu) navMenu.classList.remove('active');
                }
            });
        }

        function openModal(title, content, isWide = false) {
            const overlay = document.getElementById('modalOverlay');
            const container = document.getElementById('modalContainer');
            
            if (isWide) container.classList.add('modal-wide');
            else container.classList.remove('modal-wide');
            
            container.innerHTML = `
                <div class="modal-header">
                    <h2><i class="fas ${title.icon}"></i> ${title.text}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            `;
            
            overlay.classList.add('active');

            // Apply Viewer Restrictions if necessary
            setTimeout(() => {
                applyViewerRestrictions(container);
            }, 50);
        }

        function closeModal() {
            document.getElementById('modalOverlay').classList.remove('active');
        }

        function showInventoryDetails() {
            let lowStockItems = inventoryItems.filter(item => item.stock < item.reorderLevel);
            let tableRows = '';
            
            lowStockItems.forEach(item => {
                tableRows += `
                    <tr>
                        <td>${item.name}</td>
                        <td class="low-stock">${item.stock}</td>
                        <td>${item.reorderLevel}</td>
                        <td><button class="btn btn-primary btn-sm" onclick="reorderItem('${item.name}')">Reorder</button></td>
                    </tr>
                `;
            });

            openModal(
                { icon: 'fa-box', text: 'Low Stock Items' },
                `<div>
                    <table class="inventory-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Current Stock</th>
                                <th>Reorder Level</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows || '<tr><td colspan="4" style="text-align: center; padding: 20px;">No low stock items</td></tr>'}
                        </tbody>
                    </table>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                    </div>
                </div>`
            );
        }

        function reorderItem(itemName) {
            dailySummary.newPurchases++;
            saveSummary();
            updateDashboardSummary();
        }

        function renderUserTable() {
            let tableHtml = `
                <table class="user-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            users.forEach(user => {
                tableHtml += `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.role}</td>
                        <td>${user.email}</td>
                        <td><span style="background: ${user.status === 'Active' ? '#d4edda' : '#f8d7da'}; color: ${user.status === 'Active' ? '#155724' : '#721c24'}; padding: 2px 8px; border-radius: 10px; font-size: 11px;">${user.status}</span></td>
                        <td class="user-actions">
                            <button class="btn btn-warning btn-sm" onclick="editUser(${user.id})"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
            
            tableHtml += `
                    </tbody>
                </table>
                <div style="margin-top: 15px;">
                    <button class="btn btn-primary" onclick="showAddUserForm()"><i class="fas fa-plus"></i> Add New User</button>
                </div>
            `;
            
            return tableHtml;
        }

        function showAddUserForm() {
            openModal(
                { icon: 'fa-user-plus', text: 'Add New User' },
                `<div style="font-family: 'Segoe UI', sans-serif;">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="font-weight: 600; font-size: 14px; margin-bottom: 8px; display: block;">Username</label>
                        <input type="text" class="form-control" id="newUsername" placeholder="Enter username" style="height: 38px; border-radius: 8px;" autocomplete="off">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px; position: relative;">
                        <label style="font-weight: 600; font-size: 14px; margin-bottom: 8px; display: block;">Password</label>
                        <div style="position: relative;">
                            <input type="password" class="form-control" id="newPassword" placeholder="Enter password" style="height: 38px; border-radius: 8px; padding-right: 40px;" autocomplete="new-password">
                            <i class="fas fa-eye-slash" id="togglePasswordIcon" 
                               style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #64748b; font-size: 16px;" 
                               onclick="togglePasswordVisibility('newPassword', this)"></i>
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="font-weight: 600; font-size: 14px; margin-bottom: 8px; display: block;">Email</label>
                        <input type="email" class="form-control" id="newEmail" placeholder="Enter email" style="height: 38px; border-radius: 8px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 25px;">
                        <label style="font-weight: 600; font-size: 14px; margin-bottom: 8px; display: block;">Role</label>
                        <select class="form-control" id="newRole" style="height: 38px; border-radius: 8px;">
                            <option value="Operator">Operator (Data Entry)</option>
                            <option value="Viewer">Viewer (Read Only)</option>
                            <option value="Admin">Admin (Manager)</option>
                        </select>
                    </div>
                    <div class="modal-actions" style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        <button class="btn btn-primary" onclick="addUser()" style="height: 42px; padding: 0 30px; font-weight: 600; border-radius: 10px;">Add User</button>
                        <button class="btn btn-secondary" onclick="closeModal()" style="height: 42px; padding: 0 30px; font-weight: 600; border-radius: 10px;">Cancel</button>
                    </div>
                </div>`
            );
        }

        window.togglePasswordVisibility = function(inputId, icon) {
            const input = document.getElementById(inputId);
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        };


        window.addUser = function() {
            const username = document.getElementById('newUsername')?.value;
            const email = document.getElementById('newEmail')?.value;
            const role = document.getElementById('newRole')?.value;
            const password = document.getElementById('newPassword')?.value;
            
            if (!username || !password) return alert("Username and Password are required!");

            fetch('api/manage_users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email, role, status: 'Active' })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    closeModal();
                    loadSavedData();
                } else {
                    alert(data.message);
                }
            });
        };

        function editUser(userId) {
            const user = users.find(u => u.id == userId);
            if (user) {
                openModal(
                    { icon: 'fa-user-edit', text: 'Edit User Profile' },
                    `<div style="padding: 20px;">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" class="form-control" id="editUsername" value="${user.username}">
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" class="form-control" id="editEmail" value="${user.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>User Role</label>
                            <select class="form-control" id="editRole">
                                <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                                <option value="Operator" ${user.role === 'Operator' ? 'selected' : ''}>Operator</option>
                                <option value="Viewer" ${user.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                            </select>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="updateUser(${userId})">Save Changes</button>
                            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        </div>
                    </div>`
                );
            }
        }

        function updateUser(userId) {
            const username = document.getElementById('editUsername')?.value;
            const email = document.getElementById('editEmail')?.value;
            const role = document.getElementById('editRole')?.value;

            fetch('api/manage_users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, username, email, role, status: 'Active' })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    closeModal();
                    loadSavedData();
                }
            });
        }

        function deleteUser(userId) {
            if (!confirm('Are you sure you want to delete this user?')) return;
            fetch('api/manage_users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: userId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    loadSavedData();
                }
            });
        }

        function showAddCompanyForm() {
            openModal(
                { icon: 'fa-building', text: 'Add New Company' },
                `<div>
                    <div class="form-group">
                        <label>Business Name</label>
                        <input type="text" class="form-control" id="newCompanyName" placeholder="Enter business name" value="">
                    </div>
                    <div class="form-group">
                        <label>Address</label>
                        <input type="text" class="form-control" id="newCompanyAddress" placeholder="Enter address" value="">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Phone(s)</label>
                            <input type="text" class="form-control" id="newCompanyPhone" placeholder="Phone" value="">
                        </div>
                        <div class="form-group">
                            <label>Fax</label>
                            <input type="text" class="form-control" id="newCompanyFax" placeholder="Fax" value="">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>E-Mail</label>
                            <input type="email" class="form-control" id="newCompanyEmail" placeholder="Email" value="">
                        </div>
                        <div class="form-group">
                            <label>Website</label>
                            <input type="text" class="form-control" id="newCompanyWebsite" placeholder="Website" value="">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>G.S.T. Regn. No.</label>
                            <input type="text" class="form-control" id="newCompanyGST" placeholder="GST" value="">
                        </div>
                        <div class="form-group">
                            <label>N.T.N.</label>
                            <input type="text" class="form-control" id="newCompanyNTN" placeholder="NTN" value="">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Deals In</label>
                        <input type="text" class="form-control" id="newCompanyDealsIn" placeholder="Deals In" value="">
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="addNewCompany()"><i class="fas fa-save"></i> Save Company</button>
                        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    </div>
                </div>`
            );
        }

        function addNewCompany() {
            const companyName = document.getElementById('newCompanyName')?.value;
            if (!companyName) return alert("Please enter a business name");

            const payload = {
                name: companyName,
                address: document.getElementById('newCompanyAddress')?.value || '',
                phone: document.getElementById('newCompanyPhone')?.value || '',
                fax: document.getElementById('newCompanyFax')?.value || '',
                email: document.getElementById('newCompanyEmail')?.value || '',
                website: document.getElementById('newCompanyWebsite')?.value || '',
                gst: document.getElementById('newCompanyGST')?.value || '',
                ntn: document.getElementById('newCompanyNTN')?.value || '',
                dealsIn: document.getElementById('newCompanyDealsIn')?.value || ''
            };

            fetch('api/save_company.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    
                    // Switch to the newly created company
                    const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                    session.company = companyName;
                    localStorage.setItem('softifyx_session', JSON.stringify(session));
                    localStorage.setItem('softifyx_active_company', companyName);
                    
                    window.location.reload();
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(err => alert("Server Connection Error!"));
        }

        function saveCompanySettings() {
            const businessName = document.getElementById('modalBusinessName')?.value;
            const address = document.getElementById('modalAddress')?.value;
            const phone = document.getElementById('modalPhone')?.value;
            const fax = document.getElementById('modalFax')?.value;
            const email = document.getElementById('modalEmail')?.value;
            const website = document.getElementById('modalWebsite')?.value;
            const gst = document.getElementById('modalGST')?.value;
            const ntn = document.getElementById('modalNTN')?.value;
            const dealsIn = document.getElementById('modalDealsIn')?.value;
            
            if (businessName) {
                const payload = {
                    name: businessName,
                    address: address || '',
                    phone: phone || '',
                    fax: fax || '',
                    email: email || '',
                    website: website || '',
                    gst: gst || '',
                    ntn: ntn || '',
                    dealsIn: dealsIn || ''
                };

                fetch('api/save_company.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, id: originSelectedCompanyId })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        // Keep local state for immediate UI feedback
                        companyData = payload;
                        localStorage.setItem(getCoKey('softifyx_company'), JSON.stringify(companyData));
                        
                        updateNames();
                        updateDashboardSummary();
                        alert(data.message);
                        closeModal();
                    } else {
                        alert("Error: " + data.message);
                    }
                })
                .catch(err => {
                    alert("Server Connection Error!");
                });
            }
        }

        function saveLogoSettings() {
            const fileInput = document.getElementById('logoFile');
            const doNotShowOption = document.getElementById('doNotShowOption')?.checked;
            
            if (doNotShowOption) {
                logoData = null;
                // API call to clear logo could be added here
                localStorage.removeItem(getCoKey('softifyx_logo'));
                displayLogo();
                closeModal();
            } else if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64Logo = e.target.result;
                    
                    fetch('api/save_logo.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ logo: base64Logo, id: originSelectedCompanyId })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            logoData = base64Logo;
                            localStorage.setItem(getCoKey('softifyx_logo'), logoData);
                            displayLogo();
                            alert(data.message);
                            closeModal();
                        } else {
                            alert("Error: " + data.message);
                        }
                    })
                    .catch(err => {
                        alert("Logo upload failed. Check server connection.");
                    });
                };
                reader.readAsDataURL(file);
            } else {
                closeModal();
            }
        }

        function previewLogo() {
            const fileInput = document.getElementById('logoFile');
            const preview = document.getElementById('logoPreview');
            const noLogoText = document.getElementById('noLogoText');
            
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    if (noLogoText) noLogoText.style.display = 'none';
                    const setOption = document.getElementById('setLogoOption');
                    if (setOption) setOption.checked = true;
                };
                reader.readAsDataURL(file);
            }
        }

        function saveCompanyDetails() {
            const id = originSelectedCompanyId; // Assign this in selection
            const payload = {
                id: id,
                name: document.getElementById('modalCompanyName')?.value || '',
                address: document.getElementById('modalCompanyAddress')?.value || '',
                phone: document.getElementById('modalCompanyPhone')?.value || '',
                fax: document.getElementById('modalCompanyFax')?.value || '',
                email: document.getElementById('modalCompanyEmail')?.value || '',
                website: document.getElementById('modalCompanyWebsite')?.value || '',
                gst: document.getElementById('modalCompanyGST')?.value || '',
                ntn: document.getElementById('modalCompanyNTN')?.value || '',
                dealsIn: document.getElementById('modalCompanyDealsIn')?.value || ''
            };

            fetch('api/save_company.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    loadSavedData();
                    closeModal();
                }
            });
        }

        function deleteCompany() {
            const idToDelete = originSelectedCompanyId;
            if (!idToDelete) return;

            if (confirm(`Are you sure you want to PERMANENTLY delete this company?`)) {
                fetch('api/manage_companies.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', id: idToDelete })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        alert(data.message);
                        window.location.reload();
                    }
                });
            }
        }

        function performSearch() {
            const searchTerm = document.getElementById('globalSearch')?.value;
            if (searchTerm && searchTerm.trim() !== '') {
                const results = inventoryItems.filter(item => 
                    item.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
                
                if (results.length > 0) {
                    let resultsHtml = '';
                    results.forEach(item => {
                        resultsHtml += `<div style="padding: 8px; border-bottom: 1px solid #eee;">
                            <strong>${item.name}</strong> - Stock: ${item.stock} (Reorder at: ${item.reorderLevel})
                        </div>`;
                    });
                    
                    openModal(
                        { icon: 'fa-search', text: 'Search Results' },
                        `<div>
                            <p>Found ${results.length} item(s) matching "${searchTerm}":</p>
                            ${resultsHtml}
                            <div class="modal-actions">
                                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                            </div>
                        </div>`
                    );
                }
            }
        }

        function onDateChange() {
            const date = document.getElementById('dailyReportDate')?.value;
            // Just update summary without alert
            updateDashboardSummary();
        }

        function setupMenuButtons() {
            document.getElementById('myCompanyBtn').addEventListener('click', function() {
                if (!checkUserRights("My Company")) return showAccessDenied("My Company");
                openModal(
                    { icon: 'fa-building', text: 'Company Setup' },
                    `<div>
                        <div class="form-group">
                            <label>Business Name</label>
                            <input type="text" class="form-control" id="modalBusinessName" value="${companyData.name}">
                        </div>
                        <div class="form-group">
                            <label>Address</label>
                            <input type="text" class="form-control" id="modalAddress" value="${companyData.address}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Phone(s)</label>
                                <input type="text" class="form-control" id="modalPhone" value="${companyData.phone}">
                            </div>
                            <div class="form-group">
                                <label>Fax</label>
                                <input type="text" class="form-control" id="modalFax" value="${companyData.fax}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>E-Mail</label>
                                <input type="email" class="form-control" id="modalEmail" value="${companyData.email}">
                            </div>
                            <div class="form-group">
                                <label>Website</label>
                                <input type="text" class="form-control" id="modalWebsite" value="${companyData.website}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>G.S.T. Regn. No.</label>
                                <input type="text" class="form-control" id="modalGST" value="${companyData.gst}">
                            </div>
                            <div class="form-group">
                                <label>N.T.N.</label>
                                <input type="text" class="form-control" id="modalNTN" value="${companyData.ntn}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Deals In</label>
                            <input type="text" class="form-control" id="modalDealsIn" value="${companyData.dealsIn}">
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="saveCompanySettings()">Save</button>
                            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        </div>
                    </div>`
                );
            });

            document.getElementById('myLogoBtn').addEventListener('click', function() {
                if (!checkUserRights("My Logo")) return showAccessDenied("My Logo");
                openModal(
                    { icon: 'fa-image', text: 'Logo Settings' },
                    `<div>
                        <div style="background: #fff8e7; border-left: 4px solid #F5A623; padding: 10px; margin-bottom: 15px; border-radius: 0 6px 6px 0; font-size: 13px;">
                            <i class="fas fa-info-circle" style="color: #F5A623; margin-right: 8px;"></i>
                            Note: Only .jpeg, .jpg, .png or .gif files can be set as logo.
                        </div>
                        <div style="border: 1px dashed #b9c2ce; border-radius: 6px; padding: 25px; text-align: center; margin-bottom: 20px; background-color: #fbfdff; min-height: 80px; display: flex; align-items: center; justify-content: center;">
                            <div id="noLogoText" style="color: #6b84a3; font-style: italic; font-size: 14px; ${logoData ? 'display: none;' : ''}">No Logo</div>
                            <img id="logoPreview" class="logo-preview" src="${logoData || ''}" alt="Logo Preview" style="max-height: 80px; max-width: 100%; border: none; padding: 0; margin: 0; box-shadow: none; ${!logoData ? 'display: none;' : ''}">
                        </div>
                        <div style="margin: 15px 0;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <input type="radio" name="logoOption" id="setLogoOption" value="set" ${logoData ? 'checked' : ''}> 
                                <label for="setLogoOption" style="font-size: 14px;">Set New Logo</label>
                            </div>
                            <div style="margin-left: 28px; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                                <input type="file" id="logoFile" accept=".jpg,.jpeg,.png,.gif" onchange="previewLogo()" style="font-size: 13px;">
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                                <input type="radio" name="logoOption" id="doNotShowOption" value="none" ${!logoData ? 'checked' : ''}> 
                                <label for="doNotShowOption" style="font-size: 14px;">Do Not Show Logo</label>
                            </div>
                        </div>
                        <div style="background: #f0f5fc; padding: 10px; border-radius: 6px; margin: 15px 0; font-size: 13px; color: #1f4668;">
                            <i class="fas fa-info-circle" style="color: #F5A623; margin-right: 8px;"></i>
                            Your selected logo will be printed on your documents.
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="saveLogoSettings()">Save</button>
                            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        </div>
                    </div>`
                );
            });

            document.getElementById('listOfCompaniesBtn').addEventListener('click', function() {
                if (!checkUserRights("List Of Companies")) return showAccessDenied("List Of Companies");
                let companyOptions = '';
                companies.forEach(company => {
                    const companyName = (typeof company === 'string') ? company : (company.name || "Unknown Company");
                    companyOptions += `<option value="${companyName}">${companyName}</option>`;
                });
                
                openModal(
                    { icon: 'fa-list', text: 'List of Companies - Select for Login' },
                    `<div id="listOfCompaniesModal">
                        <div style="background: #f8fafd; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <label style="min-width: 100px; font-size: 13px; font-weight: 500;">Select Company</label>
                                <select class="form-control" style="flex: 1; height: 36px;" id="companySelector" onchange="selectCompanyForLogin(this)">
                                    ${companyOptions}
                                </select>
                                <button class="btn btn-primary btn-sm" onclick="showAddCompanyForm()"><i class="fas fa-plus"></i> New</button>
                            </div>
                        </div>
                        <div style="background: #e8f0fe; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                            <p style="font-size: 13px; color: #1f4668;"><i class="fas fa-info-circle" style="color: #F5A623;"></i> Select a company above to login. Company details will be loaded automatically.</p>
                        </div>
                        <div class="form-group">
                            <label>Business Name</label>
                            <input type="text" class="form-control" id="modalCompanyName" value="${companyData.name}">
                        </div>
                        <div class="form-group">
                            <label>Address</label>
                            <input type="text" class="form-control" id="modalCompanyAddress" value="${companyData.address}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Phone(s)</label>
                                <input type="text" class="form-control" id="modalCompanyPhone" value="${companyData.phone}">
                            </div>
                            <div class="form-group">
                                <label>Fax</label>
                                <input type="text" class="form-control" id="modalCompanyFax" value="${companyData.fax}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>E-Mail</label>
                                <input type="email" class="form-control" id="modalCompanyEmail" value="${companyData.email}">
                            </div>
                            <div class="form-group">
                                <label>Website</label>
                                <input type="text" class="form-control" id="modalCompanyWebsite" value="${companyData.website}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>G.S.T. Regn. No.</label>
                                <input type="text" class="form-control" id="modalCompanyGST" value="${companyData.gst}">
                            </div>
                            <div class="form-group">
                                <label>N.T.N.</label>
                                <input type="text" class="form-control" id="modalCompanyNTN" value="${companyData.ntn}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Deals In</label>
                            <input type="text" class="form-control" id="modalCompanyDealsIn" value="${companyData.dealsIn}">
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin: 12px 0;">
                            <input type="checkbox" id="inactiveCheckbox"> <label for="inactiveCheckbox" style="font-size: 13px;">Inactive</label>
                        </div>
                        <div class="modal-actions" style="justify-content: space-between;">
                            <div>
                                <button class="btn btn-danger" onclick="deleteCompany()" style="background-color: #d63031; border-color: #d63031;">
                                    <i class="fas fa-trash-alt"></i> Delete Company
                                </button>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-primary" onclick="saveCompanyDetails()">
                                    <i class="fas fa-save"></i> Save Changes
                                </button>
                                <button class="btn btn-secondary" onclick="closeModal()">
                                    <i class="fas fa-times"></i> Close
                                </button>
                            </div>
                        </div>
                    </div>`
                );
            });

            document.getElementById('userLoginsBtn').addEventListener('click', function() {
                if (!checkUserRights("User Logins")) return showAccessDenied("User Logins");
                openModal(
                    { icon: 'fa-users', text: 'User Logins' },
                    `<div>
                        ${renderUserTable()}
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                        </div>
                    </div>`
                );
            });

            const userRightsBtn = document.getElementById('userRightsBtn');
            if(userRightsBtn) {
                userRightsBtn.addEventListener('click', function() {
                    if (!checkUserRights("User Rights")) return showAccessDenied("User Rights");
                    openModularPopup('Navigation/Administrator/user_rights.html', 'fa-shield-alt', 'User Rights Settings', initUserRightsView, "User Rights");
                });
            }
        }

        function selectCompanyForLogin(select) {
            const selectedCompany = select.value;
            originSelectedCompanyName = selectedCompany; 
            if (selectedCompany) {
                let found = companies.find(c => (typeof c === 'string' ? c : c.name) === selectedCompany);
                if (found) {
                    originSelectedCompanyId = found.id || null;
                    if (typeof found === 'string') {
                        companyData = { name: found, address: "", phone: "", fax: "", email: "", website: "", gst: "", ntn: "", dealsIn: "" };
                    } else {
                        companyData = { ...found };
                    }
                } else {
                    companyData.name = selectedCompany;
                    originSelectedCompanyId = null;
                }
                
                // Update form fields immediately
                document.getElementById('modalCompanyName').value = companyData.name || '';
                if (document.getElementById('modalCompanyAddress')) document.getElementById('modalCompanyAddress').value = companyData.address || '';
                if (document.getElementById('modalCompanyPhone')) document.getElementById('modalCompanyPhone').value = companyData.phone || '';
                if (document.getElementById('modalCompanyFax')) document.getElementById('modalCompanyFax').value = companyData.fax || '';
                if (document.getElementById('modalCompanyEmail')) document.getElementById('modalCompanyEmail').value = companyData.email || '';
                if (document.getElementById('modalCompanyWebsite')) document.getElementById('modalCompanyWebsite').value = companyData.website || '';
                if (document.getElementById('modalCompanyGST')) document.getElementById('modalCompanyGST').value = companyData.gst || '';
                if (document.getElementById('modalCompanyNTN')) document.getElementById('modalCompanyNTN').value = companyData.ntn || '';
                if (document.getElementById('modalCompanyDealsIn')) document.getElementById('modalCompanyDealsIn').value = companyData.dealsIn || '';
            }
        }
        function initUserRightsView() {
            let userOptions = '';
            users.forEach(u => {
                userOptions += `<option value="${u.id}">${u.username}</option>`;
            });

            let rightsRows = '';
            
            const explicitRights = [
                "My Company", "My Logo", "List Of Companies", "User Logins",
                "User Rights", "Passwords", "Financial Year", "Clear Transactions",
                "Currency", "BackUp Utility", "Chart of Accounts", "Customers",
                "Vendors/Suppliers", "Bank Accounts", "Accounts Opening Balances",
                "Chart Of Inventory", "Inventory Opening Balances", "Inventory Brands",
                "Inventory Locations", "Item Price Settings", "Item Sales Tax Rates",
                "Item Pre-Order Levels", "Item Cost Valuation Method", "Chart Of Services",
                "Voucher Posting Preferences", "Inventory Movement Settings", "Customer Regions",
                "Business Sectors", "Employees", "Jobs", "Purchase Orders", "Purchases (Sales Tax)",
                "Purchases (Non Tax)", "Purchases Return/Debit Notes", "Cash Payments",
                "Bank Payments", "Customer Follow-Up", "Quotations", "Sale Orders",
                "Delivery Challans", "Sales Tax Invoices", "Sale Invoices (Non Tax)",
                "Sale Return/Credit Notes",                "Cash Receipts", "Bank Receipts", "Inward Gate Passes", "Outward Gate Passes", "Material Issue Notes", "Production Notes", "Inventory Transfers", "Add Inventory Adjustments", "Reduce Inventory Adjustments",
                "Send Ledger Summary", "Send Payment Reminder", "SMS Templates", "Bulk Messages",
                "Journal Notes", "General Journal Voucher", "Journal Report", "Print Voucher",
                "Product Serials Tracking", "Item Below Re-Order Level", "Purchase Order Tracking",
                "Sale Order Tracking", "Purchase Summary", "Purchase Register",
                "Party Purchase Summary", "Payments Reports", "Purchase Activity Report - Invoice Wise",
                "Purchase Activity Report - Party Wise", "Item Purchase Summary", "Item Purchase Analysis",
                "Accounts Payable Aging", "Material Consumption Report", "Production Report",
                "Sale Summary", "Sale Register", "Party Sale Summary", "Recovery/Receipts Reports",
                "Sale Activity Report - Invoice Wise", "Sale Activity Report - Party Wise",
                "Item Sale Summary", "Item Sale Analysis", "Services Analysis", "Accounts Receivable Aging",
                "View Inventory Ledgers", "Print Inventory Ledgers", "Item-Wise Profit/Loss",
                "Inventory Balances", "Job Ledgers", "View Account Ledger", "Print Account Ledger",
                "Cash & Bank Balances", "Customer Balances", "Vendor Balances", "Trial Balance",
                "Income Statement", "Balance Sheet"
            ];

            explicitRights.forEach(itemName => {
                rightsRows += `<tr data-right="${itemName}" ondblclick="toggleRightStatus(this)">
                    <td class="indent-level-1">
                        ${itemName}
                    </td>
                    <td class="right-status" style="text-align: center; font-weight: 500; color: #d63031;">Not Allowed</td>
                </tr>`;
            });

            const urUserSelect = document.getElementById('urUserSelect');
            if(urUserSelect) urUserSelect.innerHTML = userOptions;
            
            const urTableBody = document.getElementById('urTableBody');
            if(urTableBody) urTableBody.innerHTML = rightsRows;
            
            setTimeout(() => {
                loadUserRightsForm();
            }, 50);
        }

        function toggleRightStatus(row) {
            const statusCell = row.querySelector('.right-status');
            if (statusCell.textContent === 'Not Allowed') {
                statusCell.textContent = 'Allowed';
                statusCell.style.color = '#27ae60';
            } else {
                statusCell.textContent = 'Not Allowed';
                statusCell.style.color = '#d63031';
            }
        }

        function loadUserRightsForm() {
            const userId = document.getElementById('urUserSelect')?.value;
            if (!userId) return;
            const savedRights = localStorage.getItem(getCoKey('softifyx_user_rights_' + userId));
            
            let rightsData = {};
            if (savedRights) rightsData = JSON.parse(savedRights);
            
            document.getElementById('urUserRole').value = rightsData.__USER_ROLE__ || 'Operator';
            
            document.querySelectorAll('#urTableBody tr').forEach(row => {
                const rightName = row.getAttribute('data-right');
                const statusCell = row.querySelector('.right-status');
                
                // STRICT CHECK: Only show "Allowed" if explicitly saved as TRUE.
                // If it is missing (null/undefined) or explicitly 'false', it is "Not Allowed".
                if (rightsData[rightName] === true) {
                    statusCell.textContent = 'Allowed';
                    statusCell.style.color = '#27ae60';
                } else {
                    statusCell.textContent = 'Not Allowed';
                    statusCell.style.color = '#d63031';
                }
            });
        }

        function saveUserRights() {
            const userId = document.getElementById('urUserSelect').value;
            const rights = [];
            
            document.querySelectorAll('#urTableBody tr').forEach(row => {
                const rightName = row.getAttribute('data-right');
                const statusCell = row.querySelector('.right-status');
                rights.push({
                    name: rightName,
                    allowed: (statusCell.textContent !== 'Not Allowed')
                });
            });
            
            fetch('api/manage_user_rights.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, rights: rights })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                }
            });
        }

        // === MODULAR POPUP SYSTEM ARCHITECTURE ===

        function initPasswordsView() {
            let uOpts = '';
            users.forEach(u => {
                uOpts += `<option value="${u.id}">${u.username}</option>`;
            });
            const pwdUserSelect = document.getElementById('pwdUserSelect');
            if(pwdUserSelect) pwdUserSelect.innerHTML = uOpts;
        }

        function savePasswordSettings() {
            const userId = parseInt(document.getElementById('pwdUserSelect').value);
            const oldPwd = document.getElementById('pwdOld').value.trim();
            const newPwd = document.getElementById('pwdNew').value.trim();
            const confPwd = document.getElementById('pwdConfirm').value.trim();
            const errorMsg = document.getElementById('pwdErrorMsg');
            
            if(!oldPwd || !newPwd || !confPwd) {
                errorMsg.textContent = 'All fields are required!';
                return;
            }
            if(newPwd !== confPwd) {
                errorMsg.textContent = 'New Password and Re-Type Password do not match!';
                return;
            }

            fetch('api/change_password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, old_password: oldPwd, new_password: newPwd })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    closeModal();
                } else {
                    errorMsg.textContent = data.message;
                }
            });
        }

        // --- FINANCIAL YEAR LOGIC (DATABASE SYNC) --- //
        let financialYears = [];

        function initFinancialYearView() {
            const check = setInterval(() => {
                const box = document.getElementById('fyListBox');
                if (box) {
                    clearInterval(check);
                    loadFinancialYears();
                }
            }, 100);
        }

        function loadFinancialYears() {
            fetch(`api/get_login_data.php`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        financialYears = data.financial_years;
                        renderFYList();
                    }
                });
        }

        function renderFYList() {
            const box = document.getElementById('fyListBox');
            if(!box) return;
            box.innerHTML = (financialYears || []).map(fy => `
                <div class="listbox-item" onclick="onFinancialYearSelect(${fy.id}, this)">
                    ${fy.abbr}
                </div>
            `).join('');
        }

        window.onFinancialYearSelect = function(id, el) {
            document.querySelectorAll('.listbox-item').forEach(i => i.classList.remove('active'));
            if(el) el.classList.add('active');
            
            const fy = financialYears.find(f => f.id == id);
            if (fy) {
                document.getElementById('fyStartDate').value = fy.start_date || fy.start || '';
                document.getElementById('fyEndDate').value = fy.end_date || fy.end || '';
                document.getElementById('fyAbbreviation').value = fy.abbr || '';
                document.getElementById('fyEditId').value = fy.id;
                return;
            }

            const payload = { id: editId, startDate: start, endDate: end, abbreviation: abbr };

            fetch('api/save_financial_year.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    errorMsg.style.color = '#27ae60';
                    errorMsg.textContent = data.message;
                    setTimeout(() => { if(errorMsg) errorMsg.textContent=''; closeModal(); }, 1500);
                } else {
                    errorMsg.textContent = data.message;
                }
            })
            .catch(err => {
                errorMsg.textContent = "Server Connection Error!";
            });
        }

        // --- CLEAR TRANSACTIONS LOGIC --- //
        function executeClearTransactions() {
            const pwdInput = document.getElementById('clearTxPassword').value.trim();
            const errorMsg = document.getElementById('clearTxErrorMsg');
            
            errorMsg.textContent = '';
            
            if(!pwdInput) {
                errorMsg.textContent = 'Hardware Authorization: Admin Password is required!';
                return;
            }

            if(!confirm("Are you sure? This will delete ALL Vouchers while keeping COA and Inventory!")) return;

            fetch('api/clear_transactions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwdInput })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    closeModal();
                    if(window.loadView) window.loadView('components/dashboard.html');
                } else {
                    errorMsg.textContent = data.message;
                }
            })
            .catch(err => {
                errorMsg.textContent = "Execution Failed. Try again.";
            });
        }

        // --- CURRENCY LOGIC --- //
        const countryDataList = [
            { c: 'Afghanistan', n: 'Afghan Afghani', s: '؋' }, { c: 'Albania', n: 'Albanian Lek', s: 'L' },
            { c: 'Algeria', n: 'Algerian Dinar', s: 'د.ج' }, { c: 'Andorra', n: 'Euro', s: '€' },
            { c: 'Angola', n: 'Angolan Kwanza', s: 'Kz' }, { c: 'Argentina', n: 'Argentine Peso', s: '$' },
            { c: 'Armenia', n: 'Armenian Dram', s: '֏' }, { c: 'Australia', n: 'Australian Dollar', s: 'A$' },
            { c: 'Austria', n: 'Euro', s: '€' }, { c: 'Azerbaijan', n: 'Azerbaijani Manat', s: '₼' },
            { c: 'Bahamas', n: 'Bahamian Dollar', s: 'B$' }, { c: 'Bahrain', n: 'Bahraini Dinar', s: '.د.ب' },
            { c: 'Bangladesh', n: 'Bangladeshi Taka', s: '৳' }, { c: 'Barbados', n: 'Barbadian Dollar', s: 'Bds$' },
            { c: 'Belarus', n: 'Belarusian Ruble', s: 'Br' }, { c: 'Belgium', n: 'Euro', s: '€' },
            { c: 'Belize', n: 'Belize Dollar', s: 'BZ$' }, { c: 'Bhutan', n: 'Bhutanese Ngultrum', s: 'Nu.' },
            { c: 'Bolivia', n: 'Bolivian Boliviano', s: 'Bs.' }, { c: 'Bosnia', n: 'Convertible Mark', s: 'KM' },
            { c: 'Brazil', n: 'Brazilian Real', s: 'R$' }, { c: 'Brunei', n: 'Brunei Dollar', s: 'B$' },
            { c: 'Bulgaria', n: 'Bulgarian Lev', s: 'лв' }, { c: 'Cambodia', n: 'Cambodian Riel', s: '៛' },
            { c: 'Canada', n: 'Canadian Dollar', s: 'C$' }, { c: 'Chile', n: 'Chilean Peso', s: '$' },
            { c: 'China', n: 'Chinese Yuan', s: '¥' }, { c: 'Colombia', n: 'Colombian Peso', s: '$' },
            { c: 'Costa Rica', n: 'Costa Rican Colón', s: '₡' }, { c: 'Croatia', n: 'Euro', s: '€' },
            { c: 'Cuba', n: 'Cuban Peso', s: '₱' }, { c: 'Cyprus', n: 'Euro', s: '€' },
            { c: 'Czech Republic', n: 'Czech Koruna', s: 'Kč' }, { c: 'Denmark', n: 'Danish Krone', s: 'kr' },
            { c: 'Dominican Republic', n: 'Dominican Peso', s: 'RD$' }, { c: 'Ecuador', n: 'US Dollar', s: '$' },
            { c: 'Egypt', n: 'Egyptian Pound', s: '£' }, { c: 'Estonia', n: 'Euro', s: '€' },
            { c: 'Finland', n: 'Euro', s: '€' }, { c: 'France', n: 'Euro', s: '€' },
            { c: 'Georgia', n: 'Georgian Lari', s: '₾' }, { c: 'Germany', n: 'Euro', s: '€' },
            { c: 'Greece', n: 'Euro', s: '€' }, { c: 'Guatemala', n: 'Guatemalan Quetzal', s: 'Q' },
            { c: 'Honduras', n: 'Honduran Lempira', s: 'L' }, { c: 'Hungary', n: 'Hungarian Forint', s: 'Ft' },
            { c: 'Iceland', n: 'Icelandic Króna', s: 'kr' }, { c: 'India', n: 'Indian Rupee', s: '₹' },
            { c: 'Indonesia', n: 'Indonesian Rupiah', s: 'Rp' }, { c: 'Iran', n: 'Iranian Rial', s: '﷼' },
            { c: 'Iraq', n: 'Iraqi Dinar', s: 'ع.د' }, { c: 'Ireland', n: 'Euro', s: '€' },
            { c: 'Israel', n: 'Israeli New Shekel', s: '₪' }, { c: 'Italy', n: 'Euro', s: '€' },
            { c: 'Jamaica', n: 'Jamaican Dollar', s: 'J$' }, { c: 'Japan', n: 'Japanese Yen', s: '¥' },
            { c: 'Jordan', n: 'Jordanian Dinar', s: 'د.ا' }, { c: 'Kazakhstan', n: 'Kazakhstani Tenge', s: '₸' },
            { c: 'Kenya', n: 'Kenyan Shilling', s: 'KSh' }, { c: 'Kuwait', n: 'Kuwaiti Dinar', s: 'د.ك' },
            { c: 'Lebanon', n: 'Lebanese Pound', s: 'ل.ل' }, { c: 'Libya', n: 'Libyan Dinar', s: 'ل.د' },
            { c: 'Malaysia', n: 'Malaysian Ringgit', s: 'RM' }, { c: 'Mexico', n: 'Mexican Peso', s: '$' },
            { c: 'Morocco', n: 'Moroccan Dirham', s: 'د.م.' }, { c: 'Nepal', n: 'Nepalese Rupee', s: 'रू' },
            { c: 'Netherlands', n: 'Euro', s: '€' }, { c: 'New Zealand', n: 'New Zealand Dollar', s: 'NZ$' },
            { c: 'Nigeria', n: 'Nigerian Naira', s: '₦' }, { c: 'Norway', n: 'Norwegian Krone', s: 'kr' },
            { c: 'Oman', n: 'Omani Rial', s: 'ر.ع.' }, { c: 'Pakistan', n: 'Pakistani Rupee', s: 'Rs.' },
            { c: 'Philippines', n: 'Philippine Peso', s: '₱' }, { c: 'Poland', n: 'Polish Złoty', s: 'zł' },
            { c: 'Portugal', n: 'Euro', s: '€' }, { c: 'Qatar', n: 'Qatari Riyal', s: 'ر.ق' },
            { c: 'Romania', n: 'Romanian Leu', s: 'lei' }, { c: 'Russia', n: 'Russian Ruble', s: '₽' },
            { c: 'Saudi Arabia', n: 'Saudi Riyal', s: 'SAR' }, { c: 'Singapore', n: 'Singapore Dollar', s: 'S$' },
            { c: 'South Africa', n: 'South African Rand', s: 'R' }, { c: 'South Korea', n: 'South Korean Won', s: '₩' },
            { c: 'Spain', n: 'Euro', s: '€' }, { c: 'Sri Lanka', n: 'Sri Lankan Rupee', s: 'Rs' },
            { c: 'Sweden', n: 'Swedish Krona', s: 'kr' }, { c: 'Switzerland', n: 'Swiss Franc', s: 'CHF' },
            { c: 'Taiwan', n: 'New Taiwan Dollar', s: 'NT$' }, { c: 'Thailand', n: 'Thai Baht', s: '฿' },
            { c: 'Turkey', n: 'Turkish Lira', s: '₺' }, { c: 'United Arab Emirates', n: 'UAE Dirham', s: 'AED' },
            { c: 'United Kingdom', n: 'British Pound', s: '£' }, { c: 'United States', n: 'US Dollar', s: '$' },
            { c: 'Vietnam', n: 'Vietnamese Đồng', s: '₫' }
        ];

        function initCurrencyView() {
            const inputEl = document.getElementById('currCountry');
            if(!inputEl) return;
            
            document.addEventListener('click', function(e) {
                if(e.target.id !== 'currCountry' && e.target.id !== 'currChevron') {
                    const dd = document.getElementById('countryDropdownList');
                    if(dd) dd.style.display = 'none';
                }
            });
            
            const savedCurr = localStorage.getItem(getCoKey('softifyx_currency'));
            if(savedCurr) {
                try {
                    const data = JSON.parse(savedCurr);
                    inputEl.value = data.country || '';
                    document.getElementById('currName').value = data.name || '';
                    document.getElementById('currSymbol').value = data.symbol || '';
                } catch(e){}
            } else {
                inputEl.value = 'Pakistan';
                updateCurrencyDetails();
            }
        }

        function renderCustomCountryList(list) {
            const container = document.getElementById('countryDropdownList');
            if(!container) return;
            let html = '';
            list.sort((a,b) => a.c.localeCompare(b.c)).forEach(item => {
                html += `<div style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee; transition: background 0.1s;" onmouseover="this.style.background='#f4f6f8'" onmouseout="this.style.background='white'" onclick="selectCustomCountry('${item.c.replace(/'/g, "\\'")}')">${item.c}</div>`;
            });
            container.innerHTML = html.length ? html : '<div style="padding: 10px 15px; color: #d63031; font-style: italic;">No exact match</div>';
        }

        function showCountryList() {
            const dd = document.getElementById('countryDropdownList');
            if(dd) dd.style.display = 'block';
            renderCustomCountryList(countryDataList);
        }

        function toggleCountryList(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const dd = document.getElementById('countryDropdownList');
            const inputEl = document.getElementById('currCountry');
            if(dd && inputEl) {
                if(dd.style.display === 'block') {
                    dd.style.display = 'none';
                } else {
                    dd.style.display = 'block';
                    inputEl.focus();
                    renderCustomCountryList(countryDataList);
                }
            }
        }

        function filterCountryList() {
            const inputEl = document.getElementById('currCountry');
            if(!inputEl) return;
            const str = inputEl.value.toLowerCase();
            const filtered = countryDataList.filter(item => item.c.toLowerCase().includes(str));
            renderCustomCountryList(filtered);
            const dd = document.getElementById('countryDropdownList');
            if(dd) dd.style.display = 'block';
        }

        function selectCustomCountry(countryName) {
            const inputEl = document.getElementById('currCountry');
            if(inputEl) {
                inputEl.value = countryName;
                updateCurrencyDetails();
            }
            const dd = document.getElementById('countryDropdownList');
            if(dd) dd.style.display = 'none';
        }

        function updateCurrencyDetails() {
            const countryName = document.getElementById('currCountry').value;
            const data = countryDataList.find(c => c.c === countryName);
            if(data) {
                document.getElementById('currName').value = data.n;
                document.getElementById('currSymbol').value = data.s;
            }
        }

        function saveCurrencySettings() {
            const country = document.getElementById('currCountry').value;
            const name = document.getElementById('currName').value;
            const symbol = document.getElementById('currSymbol').value;
            const err = document.getElementById('currErrorMsg');
            
            if(!country || !name || !symbol) {
                err.style.color = '#d63031';
                err.textContent = 'Please fill all related fields.';
                return;
            }

            fetch('api/save_currency.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country, name, symbol })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    err.style.color = '#27ae60';
                    err.textContent = 'Settings saved successfully!';
                    setTimeout(() => { if(err) err.textContent = ''; closeModal(); }, 1000);
                } else {
                    err.textContent = data.message;
                }
            })
            .catch(err => {
                err.textContent = "Server Connection Error!";
            });
        }

        function applyGlobalCurrencySymbol() {
            const savedCurr = localStorage.getItem(getCoKey('softifyx_currency'));
            const newSym = (savedCurr ? JSON.parse(savedCurr).symbol : 'Rs.') + ' ';
            
            // Only update elements specifically marked as money
            const moneyElements = document.querySelectorAll('.money');
            moneyElements.forEach(el => {
                // Extract only numbers and basic formatting
                const numberPart = el.innerText.replace(/[^\d.,-]/g, '').trim();
                if(numberPart !== "") {
                    el.innerText = newSym + numberPart;
                }
            });
        }

        function checkUserRights(rightName) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            
            // 1. HARD ADMIN CHECK: The main 'Administrator' account always has 100% access.
            if (session.username === 'Administrator') return true;
            
            // 2. Resolve User ID
            const userId = users.find(u => u.username === session.username)?.id;
            if (!userId) return false;

            // 3. Resolve Role from User List (More reliable than session)
            const userObj = users.find(u => u.id == userId);
            const userRole = userObj?.role || 'Operator';
            
            // 4. ADMIN ROLE CHECK: Secondary Admin accounts also have 100% access.
            if (userRole === 'Admin') return true;

            // 5. Check Explicit Rights
            const savedRights = localStorage.getItem(getCoKey('softifyx_user_rights_' + userId));
            if (!savedRights) {
                // Default: All non-admins have zero access until rights are saved.
                return false; 
            }

            const rightsData = JSON.parse(savedRights);
            
            // STRICT ALLOW-LIST: User MUST have the right explicitly set to TRUE.
            // If it is 'false' or 'undefined', it is BLOCKED.
            return rightsData[rightName] === true;
        }

        function applyViewerRestrictions(container) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            // We need to check both session role and user rights role
            const userId = users.find(u => u.username === session.username)?.id;
            let currentRole = session.role || 'Viewer';
            
            if (userId) {
                const savedRights = localStorage.getItem(getCoKey('softifyx_user_rights_' + userId));
                if (savedRights) {
                    const rightsData = JSON.parse(savedRights);
                    currentRole = rightsData.__USER_ROLE__ || currentRole;
                }
            }

            if (currentRole !== 'Viewer') return;

            // 1. Disable all standard input fields
            const inputs = container.querySelectorAll('input, select, textarea');
            inputs.forEach(el => {
                el.disabled = true;
                el.style.backgroundColor = '#f4f6f9'; // Visual cue for read-only
                el.style.cursor = 'not-allowed';
            });

            // 2. Hide or disable Action buttons
            const actionKeywords = [
                'Save', 'Add', 'Update', 'Delete', 'Clear', 'Restore', 'Backup', 
                'Post', 'Record', 'New', 'Remove', 'Edit', 'Change'
            ];
            
            const buttons = container.querySelectorAll('button');
            buttons.forEach(btn => {
                const btnText = btn.innerText.trim();
                const btnHtml = btn.innerHTML;
                
                // Keep "Close", "Cancel", "Back", "View", "Print", "Print Preview" icons/text
                const isNavigation = btnText.match(/Close|Cancel|Back|Understand|View|Exit/i);
                const isPrinting = btnHtml.match(/fa-print|fa-file-pdf/i) || btnText.match(/Print|Report/i);
                
                if (!isNavigation && !isPrinting) {
                    const isAction = actionKeywords.some(kw => btnText.includes(kw) || btnHtml.includes(kw.toLowerCase()));
                    if (isAction || btn.classList.contains('btn-primary') || btn.classList.contains('btn-danger') || btn.classList.contains('btn-warning')) {
                        btn.style.display = 'none'; // Hide it completely for a cleaner "Viewer" look
                    }
                }
            });

            // 3. Add a small badge indicating Read-Only mode
            const header = container.querySelector('.modal-header');
            if (header) {
                const badge = document.createElement('span');
                badge.innerHTML = '<i class="fas fa-eye"></i> Read Only Mode';
                badge.style.cssText = 'background: #e1f5fe; color: #01579b; padding: 4px 10px; border-radius: 4px; font-size: 11px; margin-left: 15px; font-weight: 600; border: 1px solid #b3e5fc;';
                header.appendChild(badge);
            }
        }

        function showAccessDenied(moduleName) {
            // Remove any existing access denied markers
            const existing = document.getElementById('accessDeniedPopup');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'accessDeniedPopup';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999; opacity: 0; transition: opacity 0.3s ease;
            `;

            const card = document.createElement('div');
            card.style.cssText = `
                background: white; padding: 40px; border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2); text-align: center;
                max-width: 450px; width: 90%; transform: scale(0.8);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            `;

            card.innerHTML = `
                <div style="width: 80px; height: 80px; background: #fff5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 2px solid #ffeded;">
                    <i class="fas fa-lock" style="font-size:35px; color:#e74c3c;"></i>
                </div>
                <h2 style="font-weight:700; color:#2c3e50; margin-bottom:10px; font-size: 24px;">Module Restricted</h2>
                <p style="color:#7f8c8d; font-size: 15px; margin-bottom: 25px; line-height: 1.6;">
                    Sorry, you do not have permission to view or open <b>${moduleName}</b>.<br>
                    Please contact your Manager/Administrator for access.
                </p>
                <button class="btn btn-primary" style="padding: 12px 40px; border-radius: 30px; background: #2c3e50; border: none; font-weight: 600; cursor: pointer; color: white;">Close Message</button>
            `;

            overlay.appendChild(card);
            document.body.appendChild(overlay);

            // Animate in
            setTimeout(() => {
                overlay.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }, 10);

            const close = () => {
                overlay.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => overlay.remove(), 300);
            };

            overlay.onclick = (e) => { if(e.target === overlay) close(); };
            card.querySelector('button').onclick = close;
        }

        async function openModularPopup(url, titleIcon, titleText, initCallback, moduleName, isWide = false) {
            try {
                // If moduleName is explicitly provided, check rights BEFORE any fetch to prevent loading
                if (moduleName && !checkUserRights(moduleName)) {
                    showAccessDenied(moduleName);
                    return;
                }

                const res = await fetch(url);
                if (res.ok) {
                    let html = await res.text();
                    
                    // --- AUTOMATED RIGHTS CHECK FOR POPUPS ---
                    // Create a temporary element to parse the HTML and check for [data-module]
                    // This is a fallback if moduleName wasn't passed to the function
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    const moduleTag = tempDiv.querySelector('[data-module]');
                    
                    if (moduleTag && !moduleName) {
                        const extractedName = moduleTag.getAttribute('data-module');
                        if (!checkUserRights(extractedName)) {
                            showAccessDenied(extractedName);
                            return;
                        }
                    }
                    
                    openModal({ icon: titleIcon, text: titleText }, html, isWide);
                    
                    if (typeof initCallback === 'function') {
                        setTimeout(() => initCallback(), 10);
                    } else {
                        // Global Init Fallbacks based on modular URL mapping
                        if (url.includes('passwords.html')) {
                            setTimeout(() => initPasswordsView(), 10);
                        } else if (url.includes('user_rights.html')) {
                            setTimeout(() => initUserRightsView(), 10);
                        } else if (url.includes('financial_year.html')) {
                            setTimeout(() => initFinancialYearView(), 10);
                        } else if (url.includes('currency.html')) {
                            setTimeout(() => initCurrencyView(), 10);
                        } else if (url.includes('chart_of_accounts.html')) {
                            setTimeout(() => initChartOfAccountsView(), 10);
                        }
                    }
                } else {
                    openModal({ icon: titleIcon, text: titleText }, 
                        '<div style="color:red;padding:30px;text-align:center;"><h3>Module Not Found / In Development</h3><p>' + url + ' does not exist yet.</p></div>',
                        isWide
                    );
                }
            } catch (err) {
                console.error(err);
            }
        }

        function init() {
            // --- 1. SESSION AUTHENTICATION CHECK ---
            const session = localStorage.getItem('softifyx_session');
            if (!session) {
                window.location.href = 'login.html';
                return;
            }
            
            // --- 2. INITIALIZE APP DATA ---
            loadSavedData();
            setupDropdowns();
            setupMenuButtons(); 
            applyGlobalCurrencySymbol(); // Hook into page load
            setupAutoBackupScheduler();

            // Update Welcome Display
            const sessionData = JSON.parse(session);
            const welcomeUserDisplay = document.getElementById('welcomeUserDisplay');
            if(welcomeUserDisplay && sessionData.username) {
                welcomeUserDisplay.innerHTML = `<i class="fas fa-user-circle"></i> <span>Welcome ${sessionData.username}</span>`;
            }
            
            // Refresh Dashboard Content
            updateNames();


            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            
            const dailyReportDate = document.getElementById('dailyReportDate');
            if (dailyReportDate) dailyReportDate.value = `${yyyy}-${mm}-${dd}`;

            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) searchBtn.addEventListener('click', performSearch);
            
            const globalSearch = document.getElementById('globalSearch');
            if (globalSearch) {
                globalSearch.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') performSearch();
                });
            }

            const inventoryAlertsCard = document.getElementById('inventoryAlertsCard');
            if (inventoryAlertsCard) inventoryAlertsCard.addEventListener('click', showInventoryDetails);

            const saveNoteBtn = document.getElementById('saveNoteBtn');
            if (saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);
            
            const clearNoteBtn = document.getElementById('clearNoteBtn');
            if (clearNoteBtn) clearNoteBtn.addEventListener('click', clearNote);
            
            if (dailyReportDate) dailyReportDate.addEventListener('change', onDateChange);
        }

        window.closeModal = closeModal;
        window.showAddUserForm = showAddUserForm;
        window.addUser = addUser;
        window.editUser = editUser;
        window.updateUser = updateUser;
        window.deleteUser = deleteUser;
        window.saveCompanySettings = saveCompanySettings;
        window.saveLogoSettings = saveLogoSettings;
        window.showAddCompanyForm = showAddCompanyForm;
        window.addNewCompany = addNewCompany;
        window.showInventoryDetails = showInventoryDetails;
        window.previewLogo = previewLogo;
        window.selectCompanyForLogin = selectCompanyForLogin;
        window.saveCompanyDetails = saveCompanyDetails;
        window.reorderItem = reorderItem;
        window.hideAllDropdowns = hideAllDropdowns; // Expose globally for router if needed
        window.openModularPopup = openModularPopup;

        // Utilities
        window.togglePasswordVisibility = function(inputId, iconElement) {
            const el = document.getElementById(inputId);
            if(el) {
                const type = el.getAttribute('type') === 'password' ? 'text' : 'password';
                el.setAttribute('type', type);
                if(iconElement) {
                    iconElement.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
                    iconElement.style.color = type === 'password' ? '#888' : '#e74c3c';
                }
            }
        };

        window.initUserRightsView = initUserRightsView;
        window.initPasswordsView = initPasswordsView;
        window.toggleRightStatus = toggleRightStatus;
        window.loadUserRightsForm = loadUserRightsForm;
        window.saveUserRights = saveUserRights;
        window.savePasswordSettings = savePasswordSettings;
        window.initFinancialYearView = initFinancialYearView;
        window.selectFinancialYear = selectFinancialYear;
        window.selectFinancialYear = selectFinancialYear;
        window.addFinancialYear = addFinancialYear;
        window.saveFinancialYear = saveFinancialYear;
        window.executeClearTransactions = executeClearTransactions;
        window.initCurrencyView = initCurrencyView;
        window.updateCurrencyDetails = updateCurrencyDetails;
        window.saveCurrencySettings = saveCurrencySettings;
        window.applyGlobalCurrencySymbol = applyGlobalCurrencySymbol;
        window.showCountryList = showCountryList;
        window.toggleCountryList = toggleCountryList;
        window.filterCountryList = filterCountryList;
        window.selectCustomCountry = selectCustomCountry;
        window.executeBackup = executeBackup;
        window.executeRestore = executeRestore;

// === BACKUP LOGIC ===
        function executeBackup() {
            window.location.href = 'api/backup_db.php?action=export';
        }

        function executeRestore(event) {
            const file = event.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('backup_file', file);
            formData.append('action', 'restore');

            fetch('api/backup_db.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                if (data.status === 'success') window.location.reload();
            })
            .catch(err => alert("Restore Failed: Connection Error."));
        }

        function setupAutoBackupScheduler() {
            // Check every 30 seconds for Midnight (00:00) execution criteria exactly like windows CRON
            setInterval(() => {
                const now = new Date();
                if (now.getHours() === 0 && now.getMinutes() === 0) {
                    const todayStr = now.toDateString();
                    const lastRun = localStorage.getItem('softifyx_last_autobackup');
                    
                    if (lastRun !== todayStr) {
                        localStorage.setItem('softifyx_last_autobackup', todayStr);
                        console.log("Triggering scheduled Midnight Auto-Backup protocol...");
                        executeBackup(true);
                    }
                }
            }, 30000);
        }

// === API INTEGRATION READINESS ===
/**
 * Generic API Fetch wrapper for future PHP/MySQL integration
 * @param {string} endpoint - The API endpoint (e.g., 'get_users.php')
 * @param {object} data - Data payload (optional)
 * @param {string} method - HTTP method ('GET' or 'POST')
 */
async function fetchAPI(endpoint, data = null, method = 'GET') {
    const url = '/api/' + endpoint;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('API Error: ' + response.status);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

        window.loadView = async function(url) {
            try {
                const mainContent = document.getElementById('main-content');
                if (!mainContent) return;
                
                const res = await fetch(url);
                if (res.ok) {
                    const html = await res.text();
                    
                    // --- AUTOMATED RIGHTS CHECK FOR VIEWS ---
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    const moduleTag = tempDiv.querySelector('[data-module]');
                    
                    if (moduleTag && !checkUserRights(moduleTag.getAttribute('data-module'))) {
                        mainContent.innerHTML = `
                            <div style="padding:100px 20px; text-align:center; color:#d63031;">
                                <i class="fas fa-lock" style="font-size:64px; margin-bottom:20px;"></i>
                                <h1 style="font-family:'Segoe UI'; font-weight:700;">Access Denied</h1>
                                <p style="color:#666; font-size:18px;">You do not have permission to access this module.</p>
                                <button class="btn btn-primary" style="margin-top:30px; height:40px; padding:0 30px;" onclick="window.location.reload()">Return to Dashboard</button>
                            </div>`;
                        return;
                    }

                    mainContent.innerHTML = html;
                    applyGlobalCurrencySymbol(); // Dynamically update symbols on layout load
                    displayLogo(); // Update dashboard logo if present
                } else {
                    console.error("View not found:", url);
                }
            } catch (err) {
                console.error('Failed to load view:', err);
            }
        };

/**
 * Global App Initialization
 * Fetches and injects modular HTML components
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load Navbar
        const navRes = await fetch('components/navbar.html');
        if(navRes.ok) {
            document.getElementById('navbar-container').innerHTML = await navRes.text();
            
            const mobileMenuToggle = document.getElementById('mobileMenuToggle');
            const navMenuEl = document.getElementById('navMenu');
            if (mobileMenuToggle && navMenuEl) {
                mobileMenuToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation(); // Ensure click-outside doesn't catch this instantly
                    navMenuEl.classList.toggle('active');
                });
            }



            // Attach SPA event listeners to all generic dropdown menus using Popup System
            document.querySelectorAll('.dropdown-item[data-target], .nested-item[data-target]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    let targetUrl = item.getAttribute('data-target');
                    let moduleName = item.getAttribute('data-module');
                    let titleText = item.childNodes[0].textContent.trim() || targetUrl.split('/').pop().replace('.html', '');
                    let isCoa = (moduleName === "Chart of Accounts" || (targetUrl && targetUrl.includes('chart_of_accounts.html')));
                    window.openModularPopup(targetUrl, 'fa-file-alt', titleText, isCoa ? initChartOfAccountsView : null, moduleName, isCoa);
                    
                    if (window.hideAllDropdowns) window.hideAllDropdowns();
                    // Close ALL mobile layers
                    const navMenu = document.getElementById('navMenu');
                    if(navMenu) navMenu.classList.remove('active');
                    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
                });
            });
        }
        
        // Load Sidebar
        const sideRes = await fetch('components/sidebar.html');
        if(sideRes.ok) {
            document.getElementById('sidebar-container').innerHTML = await sideRes.text();
            
            // Attach SPA event listeners to all sidebar menus using Popup System
            document.querySelectorAll('.sidebar-item[data-target]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    let targetUrl = item.getAttribute('data-target');
                    let moduleName = item.getAttribute('data-module');
                    let titleText = item.textContent.trim() || targetUrl.split('/').pop().replace('.html', '');
                    const isCoa = (moduleName === "Chart of Accounts" || (targetUrl && targetUrl.includes('chart_of_accounts.html')));
                    const isFY = (moduleName === "Financial Year" || (targetUrl && targetUrl.includes('financial_year.html')));
                    
                    let initCb = null;
                    if (isCoa) initCb = initChartOfAccountsView;
                    else if (isFY) initCb = initFinancialYearView;

                    window.openModularPopup(targetUrl, 'fa-file-alt', titleText, initCb, moduleName, isCoa);
                });
            });
        }

        // Load Default View FIRST
        await window.loadView('components/dashboard.html');

        // Initialize general app variables and behaviors
        init();

    } catch(err) {
        console.error('Failed to load components:', err);
    }
});
// --- CHART OF ACCOUNTS (COA) LOGIC ---
        let selectedMainCode = null;
        let selectedSubCode = null;

        function initChartOfAccountsView() {
            let retries = 0;
            const maxRetries = 20; 
            const checkAndRender = setInterval(() => {
                const list = document.getElementById('mainAccountList');
                if (list) {
                    clearInterval(checkAndRender);
                    // Force re-load from localStorage to ensure latest data is visible
                    coaMain = JSON.parse(localStorage.getItem(getCoKey('softifyx_coa_main')) || '[]');
                    coaSub = JSON.parse(localStorage.getItem(getCoKey('softifyx_coa_sub')) || '[]');
                    coaList = JSON.parse(localStorage.getItem(getCoKey('softifyx_coa_list')) || '[]');
                    
                    if (coaMain.length === 0) coaMain = [...DEFAULT_COA_MAIN];

                    renderCOAMainList();
                    resetMainForm();
                    resetSubForm();
                    resetListForm();
                } else if (++retries >= maxRetries) {
                    clearInterval(checkAndRender);
                    console.error("COA: Failed to find mainAccountList.");
                }
            }, 100);
        }

        function renderCOAMainList() {
            const list = document.getElementById('mainAccountList');
            if(!list) return;
            list.innerHTML = coaMain.map(m => `<option value="${m.code}">${m.name}</option>`).join('');
        }

        function onMainAccountSelect(code) {
            selectedMainCode = code;
            const main = coaMain.find(m => m.code == code);
            const compSelect = document.getElementById('financialStatementComponent');
            if(main) {
                document.getElementById('mainTypeCode').value = main.code;
                document.getElementById('mainAccountType').value = main.name;
                if(compSelect) {
                    compSelect.value = main.component;
                    compSelect.disabled = true; // Lock for existing accounts
                }
            }
            renderCOASubList();
            resetSubFormFieldsOnly();
            resetListForm();
        }

        function resetSubFormFieldsOnly() {
            if(document.getElementById('subAccountType')) document.getElementById('subAccountType').value = '';
            if(document.getElementById('subAccountCode')) document.getElementById('subAccountCode').value = '';
            selectedSubCode = null;
        }

        function saveCOAMain() {
            const codeInput = document.getElementById('mainTypeCode');
            const nameInput = document.getElementById('mainAccountType');
            const componentInput = document.getElementById('financialStatementComponent');
            
            if(!codeInput || !nameInput || !componentInput) return;

            const code = codeInput.value.trim();
            const name = nameInput.value.trim();
            const component = componentInput.value;

            if(!code || !name) return alert("Code and Name are required!");

            fetch('api/save_coa_main.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, name, component, company_id: originSelectedCompanyId })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    alert(data.message);
                    resetMainForm();
                    // Optional: Fetch latest from API and re-render
                } else {
                    alert("Error: " + data.message);
                }
            });
        }

        function deleteCOAMain() {
            if(!selectedMainCode) return;
            
            // Delete Protection: Check for Sub Accounts
            const hasChildren = coaSub.some(s => s.mainCode == selectedMainCode);
            if (hasChildren) {
                alert("Cannot delete Main Account Type! Sub-accounts exist for this category. Please delete all sub-accounts first.");
                return;
            }

            if(confirm("Are you sure you want to delete this Main Account Type?")) {
                coaMain = coaMain.filter(m => m.code != selectedMainCode);
                localStorage.setItem(getCoKey('softifyx_coa_main'), JSON.stringify(coaMain));
                selectedMainCode = null;
                renderCOAMainList();
                resetMainForm();
            }
        }

        function resetMainForm() {
            if(document.getElementById('mainTypeCode')) document.getElementById('mainTypeCode').value = '';
            if(document.getElementById('mainAccountType')) document.getElementById('mainAccountType').value = '';
            if(document.getElementById('mainAccountList')) document.getElementById('mainAccountList').value = '';
            const compSelect = document.getElementById('financialStatementComponent');
            if(compSelect) {
                compSelect.value = 'current assets';
                compSelect.disabled = false; // Re-enable for new entry
            }
            selectedMainCode = null;
            renderCOASubList();
        }

        // Sub Accounts
        function renderCOASubList() {
            const list = document.getElementById('subAccountList');
            if(!list) return;
            if(!selectedMainCode) { list.innerHTML = ''; return; }
            const filtered = coaSub.filter(s => s.mainCode == selectedMainCode);
            list.innerHTML = filtered.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
        }

        function onSubAccountSelect(code) {
            selectedSubCode = code;
            const sub = coaSub.find(s => s.code == code);
            if(sub) {
                document.getElementById('subAccountCode').value = sub.code;
                document.getElementById('subAccountType').value = sub.name;
            }
            renderCOAListList();
            if(typeof resetListForm === 'function') resetListForm();
        }

        function saveCOASub() {
            if(!selectedMainCode) return alert("Select a Main Account Type first!");
            const name = document.getElementById('subAccountType').value.trim();
            if(!name) return alert("Sub Account Name is required!");

            let code = document.getElementById('subAccountCode').value;

            fetch('api/save_coa_sub.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mainCode: selectedMainCode, code, name, company_id: originSelectedCompanyId })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    alert(data.message);
                    renderCOASubList();
                } else {
                    alert("Error: " + data.message);
                }
            });
        }

        function deleteCOASub() {
            if(!selectedSubCode) return;

            // Delete Protection: Check for List of Accounts
            const hasChildren = coaList.some(l => l.subCode == selectedSubCode);
            if (hasChildren) {
                alert("Cannot delete Sub Account Type! Items exist in the List of Accounts for this category. Please delete them first.");
                return;
            }

            if(confirm("Are you sure you want to delete this Sub Account Type?")) {
                coaSub = coaSub.filter(s => s.code != selectedSubCode);
                localStorage.setItem(getCoKey('softifyx_coa_sub'), JSON.stringify(coaSub));
                selectedSubCode = null;
                renderCOASubList();
                resetSubForm();
            }
        }

        function resetSubForm(generate = false) {
            if(document.getElementById('subAccountType')) document.getElementById('subAccountType').value = '';
            if(document.getElementById('subAccountList')) document.getElementById('subAccountList').value = '';
            selectedSubCode = null;
            
            // Only generate code if explicitly requested (clicked Add)
            if (generate && selectedMainCode) {
                const siblings = coaSub.filter(s => s.mainCode == selectedMainCode);
                let nextNum = 1;
                if(siblings.length > 0) {
                    const lastCodes = siblings.map(s => {
                        const sCode = s.code.toString();
                        return parseInt(sCode.substring(selectedMainCode.toString().length));
                    });
                    nextNum = Math.max(...lastCodes) + 1;
                }
                const code = selectedMainCode.toString() + nextNum.toString().padStart(2, '0');
                if(document.getElementById('subAccountCode')) document.getElementById('subAccountCode').value = code;
            } else {
                if(document.getElementById('subAccountCode')) document.getElementById('subAccountCode').value = '';
            }
            
            renderCOAListList();
            resetListForm();
        }

        // List of Accounts
        function renderCOAListList() {
            const list = document.getElementById('listAccountList');
            if(!list) return;
            if(!selectedSubCode) { list.innerHTML = ''; return; }
            const filtered = coaList.filter(l => l.subCode == selectedSubCode);
            list.innerHTML = filtered.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
        }

        function onListAccountSelect(code) {
            const acc = coaList.find(l => l.code == code);
            if(acc) {
                document.getElementById('accountCode').value = acc.code;
                document.getElementById('accountName').value = acc.name;
            }
        }

        function saveCOAList() {
            if(!selectedSubCode) return alert("Select a Sub Account Type first!");
            const name = document.getElementById('accountName').value.trim();
            if(!name) return alert("Account Name is required!");

            let code = document.getElementById('accountCode').value;

            fetch('api/save_coa_list.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subCode: selectedSubCode, code, name, company_id: originSelectedCompanyId })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    alert(data.message);
                    renderCOAListList();
                } else {
                    alert("Error: " + data.message);
                }
            });
        }

        function deleteCOAList() {
            const code = document.getElementById('accountCode').value;
            if(!code) return;
            if(confirm("Are you sure?")) {
                coaList = coaList.filter(l => l.code != code);
                localStorage.setItem(getCoKey('softifyx_coa_list'), JSON.stringify(coaList));
                renderCOAListList();
                resetListForm();
            }
        }

        function resetListForm(generate = false) {
            if(document.getElementById('accountName')) document.getElementById('accountName').value = '';
            if(document.getElementById('listAccountList')) document.getElementById('listAccountList').value = '';
            
            // Only generate code if explicitly requested (clicked Add)
            if (generate && selectedSubCode) {
                const siblings = coaList.filter(l => l.subCode == selectedSubCode);
                let nextNum = 1;
                if(siblings.length > 0) {
                    const lastCodes = siblings.map(l => {
                        const lCode = l.code.toString();
                        return parseInt(lCode.substring(selectedSubCode.toString().length));
                    });
                    nextNum = Math.max(...lastCodes) + 1;
                }
                const code = selectedSubCode.toString() + nextNum.toString().padStart(3, '0');
                if(document.getElementById('accountCode')) document.getElementById('accountCode').value = code;
            } else {
                if(document.getElementById('accountCode')) document.getElementById('accountCode').value = '';
            }
        }

        function findCOA() {
            if (!selectedSubCode) return alert("Please select a Sub Account Category first.");
            const query = prompt("Enter Account Name or Code to search:");
            if (!query) return;

            const list = document.getElementById('listAccountList');
            const items = coaList.filter(l => l.subCode == selectedSubCode);
            const filtered = items.filter(l => 
                l.name.toLowerCase().includes(query.toLowerCase()) || 
                l.code.toString().includes(query)
            );

            if (filtered.length > 0) {
                list.innerHTML = filtered.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
                if (filtered.length === 1) {
                    onListAccountSelect(filtered[0].code);
                }
            } else {
                alert("No accounts found matching '" + query + "'");
                renderCOAListList();
            }
        }
        function printCOA(level) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const company = JSON.parse(localStorage.getItem(getCoKey('softifyx_company')) || '{}');
            const logo = localStorage.getItem(getCoKey('softifyx_logo'));
            
            let reportTitle = "CHART OF ACCOUNTS";
            let data = [];
            if(level === 'main') { reportTitle = "MAIN ACCOUNT TYPES"; data = coaMain; }
            else if(level === 'sub') { reportTitle = "SUB ACCOUNT TYPES"; data = selectedMainCode ? coaSub.filter(s=>s.mainCode==selectedMainCode) : coaSub; }
            else { reportTitle = "LIST OF ACCOUNTS"; data = selectedSubCode ? coaList.filter(l=>l.subCode==selectedSubCode) : coaList; }

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Report - ${reportTitle}</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
                        .company-info h1 { margin: 0; color: #2c3e50; font-size: 26px; font-weight: 800; text-transform: uppercase; }
                        .company-info p { margin: 3px 0; color: #34495e; font-size: 14px; }
                        .logo img { max-height: 100px; max-width: 250px; object-fit: contain; }
                        .report-title-box { text-align: center; background: #f1f4f8; padding: 15px; margin-bottom: 30px; border-radius: 8px; border: 1px solid #d1d9e6; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                        th, td { border: 1px solid #dee2e6; padding: 14px; text-align: left; }
                        th { background: #2c3e50; color: white; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
                        td { font-size: 14px; }
                        tr:nth-child(even) { background: #fcfdfe; }
                        .footer { margin-top: 60px; font-size: 12px; color: #95a5a6; text-align: center; border-top: 1px solid #eee; padding-top: 15px; font-style: italic; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-info">
                            <h1>${company.name || session.company || 'Business Name'}</h1>
                            <p>${company.address || 'Address Details'}</p>
                            <p>Phone: ${company.phone || 'N/A'} | Email: ${company.email || 'N/A'}</p>
                            <p>NTN: ${company.ntn || 'N/A'} | GST: ${company.gst || 'N/A'}</p>
                        </div>
                        <div class="logo">
                            ${logo ? '<img src="' + logo + '">' : ''}
                        </div>
                    </div>
                    <div class="report-title-box">
                        <h2 style="margin:0; color:#2c3e50;">${reportTitle}</h2>
                        <p style="margin:8px 0 0; color:#7f8c8d; font-size:13px; font-weight:600;">Report Generation Date: ${new Date().toLocaleString()}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:180px;">Account Code</th>
                                <th>Account Name</th>
                                ${level === 'main' ? '<th>Financial Statement Group</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.length > 0 ? data.map(item => `
                                <tr>
                                    <td style="font-weight:700; color:#2980b9;">${item.code}</td>
                                    <td style="font-weight:500;">${item.name}</td>
                                    ${level === 'main' ? `<td>${item.component}</td>` : ''}
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="text-align:center; padding:30px; color:#95a5a6;">No records found in this category.</td></tr>'}
                        </tbody>
                    </table>
                    <div class="footer">
                        This is an electronically generated report from Softifyx ERP. No signature required.
                    </div>
                    <script>window.onload = () => { window.print(); }</script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }

        window.initChartOfAccountsView = initChartOfAccountsView;
        window.onMainAccountSelect = onMainAccountSelect;
        window.saveCOAMain = saveCOAMain;
        window.deleteCOAMain = deleteCOAMain;
        window.resetMainForm = resetMainForm;
        window.onSubAccountSelect = onSubAccountSelect;
        window.saveCOASub = saveCOASub;
        window.deleteCOASub = deleteCOASub;
        window.resetSubForm = resetSubForm;
        window.onListAccountSelect = onListAccountSelect;
        window.saveCOAList = saveCOAList;
        window.deleteCOAList = deleteCOAList;
        window.resetListForm = resetListForm;
        window.printCOA = printCOA;

        window.handleLogout = function() {
            if(confirm("Are you sure you want to log out?")) {
                localStorage.removeItem('softifyx_session');
                window.location.href = 'login.html';
            }
        };

        window.checkUserRights = checkUserRights;
