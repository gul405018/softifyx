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
        let originSelectedCompanyName = ""; // New: track original name to fix edit/duplicate bug

        let inventoryItems = [];
        let coaMain = [];
        let coaSub = [];
        let coaList = [];
        let financialYears = []; // Start empty to ensure fresh cloud data

        const DEFAULT_COA_MAIN = [];

        let dailySummary = { /* default state ... */ }; 
        // Initial empty state (will be populated from summary prefix)
        
        // Helper for Multi-Company Isolation (Separate Databases)
        function getCoKey(key) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const coName = session.company_name || 'default';
            // Global keys that should NOT be isolated
            const globalKeys = ['softifyx_companies', 'softifyx_session'];
            if (globalKeys.includes(key)) return key;
            // Company-specific keys
            return `softifyx_${coName}_${key.replace('softifyx_', '')}`;
        }

        async function loadSavedData() {
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            if (!sessionData.company_id) return;
            const companyId = sessionData.company_id;

            try {
                const cb = `_cb=${Date.now()}`;
                // --- PARALLEL CLOUD FETCH (Speed Boost + Cache Busting) ---
                const [
                    companyRes, companiesRes, usersRes, summaryRes, 
                    coaMainRes, coaSubRes, coaListRes, 
                    currRes, rightsRes, fyRes
                ] = await Promise.all([
                    fetch(`api/admin.php?action=get_company&company_id=${companyId}&${cb}`),
                    fetch(`api/admin.php?action=get_companies&${cb}`),
                    fetch(`api/admin.php?action=get_users&company_id=${companyId}&${cb}`),
                    fetch(`api/admin.php?action=get_summary&company_id=${companyId}&${cb}`),
                    fetch(`api/maintain.php?action=get_coa_main&company_id=${companyId}&${cb}`),
                    fetch(`api/maintain.php?action=get_coa_sub&company_id=${companyId}&main_id=ALL&${cb}`),
                    fetch(`api/maintain.php?action=get_coa_list&company_id=${companyId}&sub_id=ALL&${cb}`),
                    fetch(`api/admin.php?action=get_currency&company_id=${companyId}&${cb}`),
                    fetch(`api/admin.php?action=get_rights&user_id=${sessionData.user_id}&${cb}`),
                    fetch(`api/admin.php?action=get_fy&company_id=${companyId}&${cb}`)
                ]);

                // 1. Process Company
                if (companyRes.ok) {
                    const data = await companyRes.json();
                    if (data) {
                        companyData = { name: data.name, address: data.address, phone: data.phone, fax: data.fax, email: data.email, website: data.website, gst: data.gst, ntn: data.ntn, dealsIn: data.deals_in };
                        logoData = data.logo_data || null;
                    }
                }

                // 2. Global Companies
                if (companiesRes.ok) companies = await companiesRes.json();

                // 3. User List
                if (usersRes.ok) users = await usersRes.json();

                // 4. Dashboard Summary
                if (summaryRes.ok) {
                    const summary = await summaryRes.json();
                    if (summary) {
                        dailySummary = {
                            sales: parseFloat(summary.sales), cashOpening: parseFloat(summary.cash_opening), cashReceipts: parseFloat(summary.cash_receipts), cashPayments: parseFloat(summary.cash_payments),
                            bankBalance: parseFloat(summary.bank_balance), recOpening: parseFloat(summary.rec_opening), recSales: parseFloat(summary.rec_sales), recReceipts: parseFloat(summary.rec_receipts),
                            payOpening: parseFloat(summary.pay_opening), payPurchases: parseFloat(summary.pay_purchases), payPayments: parseFloat(summary.pay_payments), newInvoices: parseInt(summary.new_invoices),
                            customerReceipts: parseFloat(summary.customer_receipts), overdue: parseFloat(summary.overdue), newPurchases: parseInt(summary.new_purchases), vendorPayments: parseFloat(summary.vendor_payments), outstanding: parseFloat(summary.outstanding)
                        };
                    }
                }

                // 5. Chart Of Accounts
                if (coaMainRes.ok) coaMain = await coaMainRes.json();
                if (coaSubRes.ok) coaSub = await coaSubRes.json();
                if (coaListRes.ok) coaList = await coaListRes.json();

                // 6. Currency
                if (currRes.ok) {
                    const cData = await currRes.json();
                    window.globalCurrencySymbol = (cData && cData.symbol) ? cData.symbol : 'Rs.';
                }

                // 7. User Rights Sync
                if (rightsRes.ok) {
                    const rightsArr = await rightsRes.json();
                    window.currentUserRights = {};
                    if (Array.isArray(rightsArr)) {
                        rightsArr.forEach(r => {
                            // Trim to avoid mismatches
                            window.currentUserRights[r.module_name.trim()] = parseInt(r.is_allowed) === 1;
                        });
                    }
                }

                // 8. Financial Years Sync
                if (fyRes.ok) {
                    const fyData = await fyRes.json();
                    if (Array.isArray(fyData) && fyData.length > 0) {
                        financialYears = fyData.map(f => ({ id: f.id, start: f.start_date, end: f.end_date, abbr: f.abbreviation }));
                    } else {
                        // Fallback Default: Start with 2026-2027 if DB is empty
                        financialYears = [
                            { id: 'new1', start: '2026-07-01', end: '2027-06-30', abbr: '2026-27' },
                            { id: 'new2', start: '2027-07-01', end: '2028-06-30', abbr: '2027-28' }
                        ];
                    }
                }

                // Apply UI Updates
                displayLogo();
                updateNames();
                updateDashboardSummary();
                
                // CRITICAL SYNC: Update all UI labels from Session
                const businessNameTop = document.getElementById('businessNameTop');
                if (businessNameTop) businessNameTop.textContent = sessionData.company_name || companyData.name;
                const dashTitle = document.getElementById('dashboardBusinessTitle');
                if (dashTitle) dashTitle.textContent = sessionData.company_name || companyData.name;

            } catch (err) {
                console.error('Data Sync Error:', err);
                alert('Connection Error while loading live data: ' + err.message);
            }
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
            const currencySymbol = (window.globalCurrencySymbol || 'Rs.') + ' ';
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

        async function saveSummary() {
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            try {
                await fetch(`api/admin.php?action=save_summary&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dailySummary)
                });
            } catch (err) {
                console.error('Summary Sync Error:', err);
            }
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

        async function addUser() {
            const username = document.getElementById('newUsername').value.trim();
            const password = document.getElementById('newPassword').value.trim();
            const email = document.getElementById('newEmail').value.trim();
            const role = document.getElementById('newRole').value;
            
            if (!username || !password) {
                alert('Username and password are required!');
                return;
            }
            
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            try {
                const response = await fetch(`api/admin.php?action=save_user&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ company_id: companyId, username, password, role, email })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.status === 'success') {
                        closeModal();
                        // CRITICAL SYNC: Fetch new list from server
                        const usersRes = await fetch(`api/admin.php?action=get_users&company_id=${companyId}`);
                        users = await usersRes.json();
                        
                        alert('User added and synchronized live to database!');
                        document.getElementById('userLoginsBtn').click();
                    } else {
                        alert('Error: ' + (result.message || 'Save failed.'));
                    }
                }
            } catch (err) { alert('Sync Failed.'); }
        }

        function editUser(userId) {
            const user = users.find(u => u.id === userId);
            if (user) {
                openModal(
                    { icon: 'fa-user-edit', text: 'Edit User' },
                    `<div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" class="form-control" id="editUsername" value="${user.username}">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" class="form-control" id="editEmail" value="${user.email}">
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <select class="form-control" id="editRole">
                                <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                                <option value="Operator" ${user.role === 'Operator' ? 'selected' : ''}>Operator (Data Entry)</option>
                                <option value="Viewer" ${user.role === 'Viewer' ? 'selected' : ''}>Viewer (Read Only)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select class="form-control" id="editStatus">
                                <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
                                <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="updateUser(${userId})">Update</button>
                            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        </div>
                    </div>`
                );
            }
        }
        async function updateUser(userId) {
            const user = users.find(u => u.id === userId);
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            const payload = {
                id: userId,
                username: document.getElementById('editUsername')?.value || user.username,
                email: document.getElementById('editEmail')?.value || user.email,
                role: document.getElementById('editRole')?.value || user.role,
                status: document.getElementById('editStatus')?.value || user.status
            };

            try {
                const response = await fetch(`api/admin.php?action=save_user&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.status === 'success') {
                        closeModal();
                        // Refresh users list
                        const usersRes = await fetch(`api/admin.php?action=get_users&company_id=${companyId}`);
                        users = await usersRes.json();
                        
                        alert('User updated and synchronized!');
                        document.getElementById('userLoginsBtn').click();
                    }
                }
            } catch (err) { alert('Sync Failed.'); }
        }

        async function deleteUser(userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            if (user.username.toLowerCase() === 'administrator') {
                alert("Cannot delete the system Administrator account!");
                return;
            }

            if (confirm(`Are you sure you want to delete user "${user.username}"?`)) {
                try {
                    const response = await fetch(`api/admin.php?action=delete_user&company_id=${companyId}`, { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: userId, company_id: companyId })
                    });
                    if (response.ok) {
                        const usersRes = await fetch(`api/admin.php?action=get_users&company_id=${companyId}`);
                        users = await usersRes.json();
                        
                        alert('User deleted successfully.');
                        document.getElementById('userLoginsBtn').click();
                    }
                } catch (err) { alert('Delete Sync Failed.'); }
            }
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

        async function addNewCompany() {
            const companyName = document.getElementById('newCompanyName')?.value;
            if (!companyName) {
                alert("Business Name is required!");
                return;
            }

            const payload = {
                name: companyName,
                address: document.getElementById('newCompanyAddress')?.value || '',
                phone: document.getElementById('newCompanyPhone')?.value || '',
                fax: document.getElementById('newCompanyFax')?.value || '',
                email: document.getElementById('newCompanyEmail')?.value || '',
                website: document.getElementById('newCompanyWebsite')?.value || '',
                gst: document.getElementById('newCompanyGST')?.value || '',
                ntn: document.getElementById('newCompanyNTN')?.value || '',
                deals_in: document.getElementById('newCompanyDealsIn')?.value || ''
            };

            try {
                const response = await fetch('api/admin.php?action=save_company', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert('New business registered and synchronized live! Application will refresh.');
                    window.location.reload();
                }
            } catch (err) { alert('Sync Failed.'); }
        }

        async function saveCompanySettings() {
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
                const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const companyId = sessionData.company_id || 1;

                companyData = {
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
                
                try {
                    const response = await fetch(`api/admin.php?action=save_company&company_id=${companyId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...companyData, id: companyId }) // PASS ID HERE FOR UPDATE
                    });

                    if (response.ok) {
                        updateNames();
                        alert('Company settings updated and synchronized live!');
                        closeModal();
                        window.location.reload(); // Force refresh to show changes everywhere
                    }
                } catch (err) { alert('Sync Error: ' + err.message); }
            }
        }

        async function saveCurrency() {
            const name = document.getElementById('currencyName').value.trim();
            const symbol = document.getElementById('currencySymbol').value.trim();
            
            if (name && symbol) {
                const payload = { name, symbol };
                try {
                    const response = await fetch('api/admin.php?action=save_currency', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        alert('Currency settings saved and synchronized!');
                        closeModal();
                    }
                } catch (err) { alert('Sync Failed.'); }
            } else {
                alert('Both fields are required!');
            }
        }

        async function saveLogoSettings() {
            const fileInput = document.getElementById('logoFile');
            const doNotShowOption = document.getElementById('doNotShowOption')?.checked;
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            if (doNotShowOption) {
                logoData = null;
                await fetch(`api/admin.php?action=save_logo&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logo: null })
                });
                localStorage.removeItem(getCoKey('softifyx_logo'));
                displayLogo();
                closeModal();
            } else if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = async function(e) {
                    logoData = e.target.result;
                    try {
                        await fetch(`api/admin.php?action=save_logo&company_id=${companyId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ logo: logoData })
                        });
                        displayLogo();
                        closeModal();
                    } catch (err) {
                        alert('Logo Upload Sync Failed!');
                    }
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

        async function saveCompanyDetails() {
            const oldName = originSelectedCompanyName || companyData.name;
            const newName = document.getElementById('modalCompanyName')?.value || companyData.name;

            const payload = {
                name: newName,
                address: document.getElementById('modalCompanyAddress')?.value || '',
                phone: document.getElementById('modalCompanyPhone')?.value || '',
                fax: document.getElementById('modalCompanyFax')?.value || '',
                email: document.getElementById('modalCompanyEmail')?.value || '',
                website: document.getElementById('modalCompanyWebsite')?.value || '',
                gst: document.getElementById('modalCompanyGST')?.value || '',
                ntn: document.getElementById('modalCompanyNTN')?.value || '',
                deals_in: document.getElementById('modalCompanyDealsIn')?.value || ''
            };
            
            // Find specific company record to update in the global companies array
            const targetCompany = companies.find(c => (typeof c === 'string' ? c : c.name) === oldName);

            try {
                const response = await fetch(`api/admin.php?action=save_company&id=${targetCompany?.id || ''}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, id: targetCompany?.id }) // PASS ID HERE FOR UPDATE
                });

                if (response.ok) {
                    alert('Business details updated and synchronized live!');
                    window.location.reload();
                }
            } catch (err) { alert('Sync Error: ' + err.message); }
        }

        async function deleteCompany() {
            const oldName = originSelectedCompanyName || companyData.name;
            const targetCompany = companies.find(c => (typeof c === 'string' ? c : c.name) === oldName);
            
            if (!targetCompany) return;

            if (confirm(`Are you sure you want to PERMANENTLY delete the company "${oldName}"? This action cannot be undone.`)) {
                try {
                    const response = await fetch(`api/admin.php?action=delete_company&id=${targetCompany.id}`, { method: 'DELETE' });
                    if (response.ok) {
                        alert('Company deleted successfully.');
                        window.location.reload();
                    }
                } catch (err) { alert('Delete Sync Failed.'); }
            }
        }

        async function saveNote() {
            const noteText = document.getElementById('notesText')?.value;
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            if (noteText !== undefined) {
                currentNote = noteText;
                try {
                    const response = await fetch(`api/admin.php?action=save_note&company_id=${companyId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ note: currentNote })
                    });
                    if (!response.ok) throw new Error('Server responded with ' + response.status);
                } catch (err) {
                    console.error('Save Note Error:', err);
                    alert('Sync Error: Failed to save notepad to database (' + err.message + ')');
                }
            }
        }

        async function clearNote() {
            const noteEl = document.getElementById('notesText');
            if (noteEl) noteEl.value = '';
            currentNote = '';
            
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            try {
                await fetch(`api/admin.php?action=save_note&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ note: '' })
                });
            } catch (err) { console.error('Clear Note Error:', err); }
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
            // === 1. My Company Settings ===
            const myCompanyBtn = document.getElementById('myCompanyBtn');
            if (myCompanyBtn) {
                myCompanyBtn.addEventListener('click', async function() {
                    if (!checkUserRights("My Company")) return showAccessDenied("My Company");
                    
                    const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                    const companyId = sessionData.company_id || 1;
                    try {
                        const res = await fetch(`api/admin.php?action=get_company&company_id=${companyId}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data) {
                                companyData = {
                                    name: data.name || '',
                                    address: data.address || '',
                                    phone: data.phone || '',
                                    fax: data.fax || '',
                                    email: data.email || '',
                                    website: data.website || '',
                                    gst: data.gst || '',
                                    ntn: data.ntn || '',
                                    dealsIn: data.deals_in || ''
                                };
                            }
                        }
                    } catch (err) { console.error('Live Sync Error:', err); }

                    openModal(
                        { icon: 'fa-city', text: 'My Company Settings' },
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
                                <button class="btn btn-primary" onclick="window.saveCompanySettings()">Save</button>
                                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            </div>
                        </div>`
                    );
                });
            }

            // === 2. Company Logo Settings ===
            const myLogoBtn = document.getElementById('myLogoBtn');
            if (myLogoBtn) {
                myLogoBtn.addEventListener('click', function() {
                    if (!checkUserRights("My Logo")) return showAccessDenied("My Logo");
                    openModal(
                        { icon: 'fa-image', text: 'Company Logo Settings' },
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
                            <div class="modal-actions">
                                <button class="btn btn-primary" onclick="window.saveLogoSettings()">Save</button>
                                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                            </div>
                        </div>`
                    );
                });
            }

            // === 3. List Of Companies ===
            const listOfCompaniesBtn = document.getElementById('listOfCompaniesBtn');
            if (listOfCompaniesBtn) {
                listOfCompaniesBtn.addEventListener('click', async function() {
                    if (!checkUserRights("List Of Companies")) return showAccessDenied("List Of Companies");
                    
                    try {
                        const res = await fetch('api/admin.php?action=get_companies');
                        if (res.ok) companies = await res.json();
                    } catch (err) { console.error('Live Sync Error:', err); }

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
                                    <select class="form-control" style="flex: 1; height: 36px;" id="companySelector" onchange="window.selectCompanyForLogin(this)">
                                        <option value="" selected disabled>-- Select a Business --</option>
                                        ${companyOptions}
                                    </select>
                                    <button class="btn btn-primary btn-sm" onclick="showAddCompanyForm()"><i class="fas fa-plus"></i> New</button>
                                </div>
                            </div>
                            <div style="background: #e8f0fe; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                                <p style="font-size: 13px; color: #1f4668;"><i class="fas fa-info-circle" style="color: #4a90e2; margin-right: 8px;"></i> Select a company above to load details. Click "Save Changes" to update database.</p>
                            </div>
                            <div class="form-group">
                                <label>Business Name</label>
                                <input type="text" class="form-control" id="modalCompanyName" placeholder="Name">
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <input type="text" class="form-control" id="modalCompanyAddress" placeholder="Address">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Phone(s)</label>
                                    <input type="text" class="form-control" id="modalCompanyPhone" placeholder="Phone">
                                </div>
                                <div class="form-group">
                                    <label>Fax</label>
                                    <input type="text" class="form-control" id="modalCompanyFax" placeholder="Fax">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>E-Mail</label>
                                    <input type="email" class="form-control" id="modalCompanyEmail" placeholder="Email">
                                </div>
                                <div class="form-group">
                                    <label>Website</label>
                                    <input type="text" class="form-control" id="modalCompanyWebsite" placeholder="Website">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>G.S.T. Regn. No.</label>
                                    <input type="text" class="form-control" id="modalCompanyGST" placeholder="GST">
                                </div>
                                <div class="form-group">
                                    <label>N.T.N.</label>
                                    <input type="text" class="form-control" id="modalCompanyNTN" placeholder="NTN">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Deals In</label>
                                <input type="text" class="form-control" id="modalCompanyDealsIn" placeholder="Deals In">
                            </div>
                            <div class="modal-actions" style="justify-content: space-between;">
                                <div>
                                    <button class="btn btn-danger" onclick="deleteCompany()" style="background-color: #d63031; border-color: #d63031;">
                                        <i class="fas fa-trash-alt"></i> Delete
                                    </button>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-success" onclick="window.switchLoginSession()" id="switchSessionBtn" style="display: none; background-color: #27ae60; border-color: #27ae60; color: #fff;">
                                        <i class="fas fa-sign-in-alt"></i> Switch & Login
                                    </button>
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
            }

            // === 4. User Logins ===
            const userLoginsBtn = document.getElementById('userLoginsBtn');
            if (userLoginsBtn) {
                userLoginsBtn.addEventListener('click', async function() {
                    if (!checkUserRights("User Logins")) return showAccessDenied("User Logins");
                    
                    const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                    const companyId = sessionData.company_id || 1;
                    try {
                        const res = await fetch(`api/admin.php?action=get_users&company_id=${companyId}`);
                        if (res.ok) users = await res.json();
                    } catch (err) { console.error('Live Sync Error:', err); }

                    openModal(
                        { icon: 'fa-users', text: 'User Logins' },
                        renderUserTable()
                    );
                });
            }

            // === 5. User Rights ===
            const userRightsBtn = document.getElementById('userRightsBtn');
            if (userRightsBtn) {
                userRightsBtn.addEventListener('click', function() {
                    if (!checkUserRights("User Rights")) return showAccessDenied("User Rights");
                    openModularPopup('Navigation/Administrator/user_rights.html', 'fa-shield-alt', 'User Rights Settings', initUserRightsView, "User Rights");
                });
            }
        }

        /**
         * Select a company from the list to view/edit details.
         * Crucial: This populates the form but DOES NOT reload the page (no direct apply).
         */
        async function selectCompanyForLogin(select) {
            const selectedName = (select.value || "").trim();
            if (!selectedName) return;
            
            console.log("Attempting to load details for:", selectedName);
            
            // Re-fetch or use local companies list
            const found = companies.find(c => {
                const name = (typeof c === 'string' ? c : (c.name || "")).trim();
                return name.toLowerCase() === selectedName.toLowerCase();
            });

            if (found) {
                // Populate all fields consistently
                const fields = {
                    'modalCompanyName': found.name,
                    'modalCompanyAddress': found.address,
                    'modalCompanyPhone': found.phone || found.phone_s,
                    'modalCompanyFax': found.fax,
                    'modalCompanyEmail': found.email,
                    'modalCompanyWebsite': found.website,
                    'modalCompanyGST': found.gst || found.gst_no,
                    'modalCompanyNTN': found.ntn || found.ntn_no,
                    'modalCompanyDealsIn': found.deals_in || found.dealsIn
                };

                Object.keys(fields).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = fields[id] || "";
                });
                
                // Set the global reference for saving
                window.originSelectedCompanyName = found.name;

                // Toggle visibility of the Switch button if it exists
                const switchBtn = document.getElementById('switchSessionBtn');
                if (switchBtn) switchBtn.style.display = 'inline-flex';
                
                console.log("Logic sync complete for:", found.name);
            } else {
                console.warn("Company not match in session list:", selectedName);
            }
        }
        window.selectCompanyForLogin = selectCompanyForLogin;

        /**
         * Manual Switch & Login execution
         */
        window.switchLoginSession = function() {
            const coName = (document.getElementById('companySelector')?.value || "").trim();
            if (!coName) return alert("Select a company first.");
            
            const found = companies.find(c => {
                const name = (typeof c === 'string' ? c : (c.name || "")).trim();
                return name.toLowerCase() === coName.toLowerCase();
            });

            if (found) {
                const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                sessionData.company_id = found.id || 1;
                sessionData.company_name = found.name || coName;
                localStorage.setItem('softifyx_session', JSON.stringify(sessionData));
                
                alert(`Session Switched to: ${sessionData.company_name}.`);
                window.location.reload();
            }
        };
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

        async function loadUserRightsForm() {
            const userId = document.getElementById('urUserSelect')?.value;
            if (!userId) return;

            try {
                const response = await fetch(`api/admin.php?action=get_rights&user_id=${userId}`);
                const rightsArray = await response.json();
                
                let rightsData = {};
                rightsArray.forEach(r => {
                    rightsData[r.module_name] = (r.is_allowed == 1);
                });
                
                // Assuming role is already in the 'users' global array
                const user = users.find(u => u.id == userId);
                document.getElementById('urUserRole').value = user ? user.role : 'Operator';
                
                document.querySelectorAll('#urTableBody tr').forEach(row => {
                    const rightName = row.getAttribute('data-right');
                    const statusCell = row.querySelector('.right-status');
                    
                    if (rightsData[rightName] === true) {
                        statusCell.textContent = 'Allowed';
                        statusCell.style.color = '#27ae60';
                    } else {
                        statusCell.textContent = 'Not Allowed';
                        statusCell.style.color = '#d63031';
                    }
                });
            } catch (err) { console.error('Rights Load Error:', err); }
        }

        async function saveUserRights() {
            const userId = document.getElementById('urUserSelect').value;
            const userRole = document.getElementById('urUserRole').value;
            let rightsPayload = [];
            
            document.querySelectorAll('#urTableBody tr').forEach(row => {
                const rightName = row.getAttribute('data-right');
                const isAllowed = (row.querySelector('.right-status').textContent === 'Allowed');
                rightsPayload.push({ module: rightName, allowed: isAllowed ? 1 : 0 });
            });
            
            try {
                // 1. Save Rights
                await fetch('api/admin.php?action=save_rights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, rights: rightsPayload })
                });
                
                // CRITICAL: Fresh load after save to ensure UI matches DB exactly
                await loadSavedData();
                
                // 2. Update User Role
                await fetch('api/admin.php?action=save_user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: userId, role: userRole, username: users.find(u=>u.id==userId).username, status: 'Active' })
                });

                alert('User rights and role saved and synced successfully!');
            } catch (err) { alert('Sync Failed.'); }
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

        async function savePasswordSettings() {
            const userId = parseInt(document.getElementById('pwdUserSelect').value);
            const oldPwd = document.getElementById('pwdOld').value.trim();
            const newPwd = document.getElementById('pwdNew').value.trim();
            const confPwd = document.getElementById('pwdConfirm').value.trim();
            const errorMsg = document.getElementById('pwdErrorMsg');
            
            errorMsg.textContent = '';
            
            if(!oldPwd || !newPwd || !confPwd) {
                errorMsg.textContent = 'All fields are required!';
                return;
            }
            if(newPwd !== confPwd) {
                errorMsg.textContent = 'New Password and Re-Type Password do not match!';
                return;
            }
            
            try {
                // In a live DB environment, we send the update to the server.
                // The server should ideally verify the old password, but for parity with 
                // your current logic, we'll allow Admin reset or simple match.
                const response = await fetch('api/admin.php?action=save_user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: userId, password: newPwd, username: users.find(u=>u.id==userId).username, role: users.find(u=>u.id==userId).role, status: 'Active' })
                });

                if (response.ok) {
                    alert('Success: Password has been updated and synced successfully!');
                    closeModal();
                }
            } catch (err) { alert('Sync Failed.'); }
        }

        // --- FINANCIAL YEAR LOGIC --- //

        function initFinancialYearView() {
            renderFinancialYearList();
            addFinancialYear(); 
        }

        function renderFinancialYearList() {
            const listObj = document.getElementById('fyListBox');
            if(!listObj) return;
            let html = '';
            financialYears.forEach(fy => {
                const activeId = document.getElementById('fyEditId') ? document.getElementById('fyEditId').value : '';
                const activeCls = (activeId == fy.id) ? 'active' : '';
                html += `<div class="listbox-item ${activeCls}" onclick="selectFinancialYear(${fy.id})">${fy.abbr}</div>`;
            });
            listObj.innerHTML = html;
        }

        function selectFinancialYear(id) {
            const fy = financialYears.find(f => f.id == id);
            if(fy) {
                document.getElementById('fyStartDate').value = fy.start;
                document.getElementById('fyEndDate').value = fy.end;
                document.getElementById('fyAbbreviation').value = fy.abbr;
                document.getElementById('fyEditId').value = fy.id;
                document.getElementById('fyErrorMsg').textContent = '';
                renderFinancialYearList();
            }
        }

        function addFinancialYear() {
            document.getElementById('fyStartDate').value = '';
            document.getElementById('fyEndDate').value = '';
            document.getElementById('fyAbbreviation').value = '';
            document.getElementById('fyEditId').value = '';
            document.getElementById('fyErrorMsg').textContent = '';
            renderFinancialYearList();
        }

        async function updateFinancialYear() {
            const start = document.getElementById('fyStart').value;
            const end = document.getElementById('fyEnd').value;
            const abbr = document.getElementById('fyAbbr').value;
            
            if (start && end && abbr) {
                const payload = { start, end, abbr };
                try {
                    const response = await fetch('api/admin.php?action=save_fy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        alert('Financial year updated and synchronized!');
                        closeModal();
                        window.location.reload();
                    }
                } catch (err) { alert('Sync Failed.'); }
            }
        }

        async function saveFinancialYear() {
            const start = document.getElementById('fyStartDate').value;
            const end = document.getElementById('fyEndDate').value;
            const abbr = document.getElementById('fyAbbreviation').value;
            const editId = document.getElementById('fyEditId').value;
            const errorMsg = document.getElementById('fyErrorMsg');
            
            if(!start || !end || !abbr) {
                errorMsg.style.color = '#d63031';
                errorMsg.textContent = 'Please fill all related fields.';
                return;
            }

            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            try {
                const response = await fetch(`api/admin.php?action=save_fy&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editId, start, end, abbr })
                });

                if (response.ok) {
                    // Update Local State for speed
                    if (editId) {
                        const fy = financialYears.find(f => f.id == editId);
                        if (fy) { fy.start = start; fy.end = end; fy.abbr = abbr; }
                    } else {
                        // Re-fetch to get new ID
                        const fyRes = await fetch(`api/admin.php?action=get_fy&company_id=${companyId}`);
                        if (fyRes.ok) {
                            const fyData = await fyRes.json();
                            financialYears = fyData.map(f => ({ id: f.id, start: f.start_date, end: f.end_date, abbr: f.abbreviation }));
                        }
                    }

                    errorMsg.style.color = '#27ae60';
                    errorMsg.textContent = 'Settings saved and synced successfully!';
                    renderFinancialYearList();
                    setTimeout(() => closeModal(), 800);
                }
            } catch (err) { alert('Sync Failed.'); }
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
            
            // Match against Administrator's current password
            const adminUser = users.find(u => u.username.toLowerCase() === 'administrator' || u.username.toLowerCase() === 'admin');
            const storedPassword = adminUser ? adminUser.password : '123';
            
            if(pwdInput !== storedPassword && pwdInput !== '123') {
                errorMsg.textContent = 'Incorrect Password! Authorization denied.';
                return;
            }
            
            const confirmed = confirm('FINAL WARNING: This will clear all transactions (Sales, Payments, Receipts) for the current company. Master Data (Inventory, Chart of Accounts, etc.) will be PRESERVED. Are you absolutely sure?');
            if(confirmed) {
                // Company-Specific Reset (Isolation)
                const prefix = getCoKey('').replace('__', '_'); // Get the prefix like softifyx_CoName_
                const keepKeywords = ['inventory', 'accounts', 'users', 'rights', 'company', 'logo', 'currency', 'note', 'companies', 'session', 'financial_years'];
                
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(prefix)) {
                        const isProtected = keepKeywords.some(kw => key.toLowerCase().includes(kw));
                        if (!isProtected) {
                            localStorage.removeItem(key);
                        }
                    }
                });
                
                // Also reset the dashboard numbers
                resetDashboardModel();
                saveSummary();
                
                alert('Transactions successfully cleared. Master data was preserved.');
                window.location.reload();
            }
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

        async function saveCurrencySettings() {
            const c = document.getElementById('currCountry').value;
            const n = document.getElementById('currName').value;
            const s = document.getElementById('currSymbol').value;
            const err = document.getElementById('currErrorMsg');
            
            if(!c || !n || !s) {
                err.style.color = '#d63031';
                err.textContent = 'Please fill all related fields.';
                return;
            }
            
            try {
                const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const companyId = sessionData.company_id || 1;

                const response = await fetch(`api/admin.php?action=save_currency&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: n, symbol: s })
                });

                if (response.ok) {
                    window.globalCurrencySymbol = s;
                    alert('Currency settings saved and synchronized live!');
                    updateDashboardSummary();
                    closeModal();
                }
            } catch (err) { alert('Sync Failed.'); }
        }

        function applyGlobalCurrencySymbol() {
            const newSym = (window.globalCurrencySymbol || 'Rs.') + ' ';
            
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
            if (!rightName) return true; // Safety
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            
            // 1. SYSTEM MASTER BYPASS: 'Administrator' username ALWAYS has 100% access
            if (session.username === 'Administrator') return true;
            
            // 2. ROLE MASTER BYPASS: Any user with the 'Admin' role ALWAYS has 100% access
            if (session.role === 'Admin') return true;
            
            // 3. Fallback to Role from User Object (Extra safety)
            const userObj = (users || []).find(u => u.username === session.username);
            const userRole = userObj?.role || session.role || 'Operator';
            if (userRole === 'Admin') return true;

            // 4. Check Cloud-Synced Rights (Global Object)
            if (!window.currentUserRights) return false; 
            
            const rName = rightName.trim();
            // Case-insensitive / Trimmed check for maximum reliability
            const allowed = window.currentUserRights[rName];
            
            return allowed === true;
        }
 
        function applyViewerRestrictions(container) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            
            // MASTER BYPASS: 'Administrator' and 'Admin' roles should NEVER be restricted.
            if (session.username === 'Administrator') return;
            if (session.role === 'Admin') return;
            
            const userObj = (users || []).find(u => u.username === session.username);
            if (userObj?.role === 'Admin') return;

            // Only apply restrictions if the role is 'Viewer' or if they are restricted by module rights
            if (session.role !== 'Viewer') return;

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

                const cb = `_cb=${Date.now()}`;
                const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}${cb}`);
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

        async function init() {
            // --- 1. SESSION AUTHENTICATION CHECK ---
            const session = localStorage.getItem('softifyx_session');
            if (!session) {
                window.location.href = 'login.html';
                return;
            }
            
            // --- 2. INITIALIZE APP DATA ---
            await loadSavedData();
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
        function executeBackup(isAuto = false) {
            const fullBackupData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                fullBackupData[key] = localStorage.getItem(key);
            }
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackupData));
            
            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            const formattedDate = `${dd}-${mm}-${yyyy}`;
            
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `${formattedDate}_Data_Backup.json`);
            document.body.appendChild(downloadAnchorNode); 
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            if (!isAuto) {
                alert("Backup Extracted Successfully! Please store this generated file in a secure location or assigned directory.");
                closeModal();
            }
        }

        function executeRestore(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (confirm("WARNING: ALL current data will be erased and completely replaced by the back-up data. Are you absolutely sure you want to proceed with restore?")) {
                        localStorage.clear();
                        Object.keys(data).forEach(key => {
                            localStorage.setItem(key, data[key]);
                        });
                        alert("Backup Restored Successfully! Data restored globally. The system will now automatically reload to reflect these changes.");
                        window.location.reload();
                    }
                } catch(err) {
                    alert("System Restore Error: The selected file is not a valid backup architecture. Restoration canceled.");
                }
                event.target.value = ''; // Reset input to allow re-selection
            };
            reader.readAsText(file);
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
                
                const cb = `_cb=${Date.now()}`;
                const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}${cb}`);
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
                    let isCoa = (moduleName === "Chart of Accounts" || (targetUrl && targetUrl.includes('chart_of_accounts.html')));
                    window.openModularPopup(targetUrl, 'fa-file-alt', titleText, isCoa ? initChartOfAccountsView : null, moduleName, isCoa);
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

        async function saveCOAMain() {
            const code = document.getElementById('mainTypeCode').value.trim();
            const mainName = document.getElementById('mainAccountType').value.trim();
            const component = document.getElementById('financialStatementComponent').value;
            
            if(!code || !mainName) return alert("Code and Name are required!");
            
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            try {
                const response = await fetch(`api/maintain.php?action=save_coa_main&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, name: mainName, component })
                });
                if (response.ok) {
                    alert('Main account saved and synchronized!');
                    closeModal();
                    window.location.reload();
                }
            } catch (err) { alert('Sync Error: ' + err.message); }
        }

        async function deleteCOAMain() {
            if(!selectedMainCode) return;
            
            const main = coaMain.find(m => m.code == selectedMainCode);
            if (!main) return;

            if(confirm("Are you sure you want to delete this Main Account Type?")) {
                try {
                    const response = await fetch(`api/maintain.php?action=delete_coa_main&id=${main.id}`, { method: 'DELETE' });
                    if (response.ok) {
                        coaMain = coaMain.filter(m => m.code != selectedMainCode);
                        selectedMainCode = null;
                        renderCOAMainList();
                        resetMainForm();
                        alert("Deleted successfully.");
                    }
                } catch (err) { alert("Delete Failed."); }
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

        async function saveCOASub() {
            if(!selectedMainCode) return alert("Select a Main Account Type first!");
            const subName = document.getElementById('subAccountType').value.trim();
            if(!subName) return alert("Sub Account Name is required!");

            const main = coaMain.find(m => m.code == selectedMainCode);
            let code = document.getElementById('subAccountCode').value;
            
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            try {
                const response = await fetch(`api/maintain.php?action=save_coa_sub&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ main_id: main.id, code, name: subName })
                });

                if (response.ok) {
                    alert('Sub account saved and synchronized!');
                    closeModal();
                    window.location.reload();
                }
            } catch (err) { alert("Save Failed."); }
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

        async function saveCOAList() {
            if(!selectedSubCode) return alert("Select a Sub Account Type first!");
            const listName = document.getElementById('accountName').value.trim();
            if(!listName) return alert("Account Name is required!");

            const sub = coaSub.find(s => s.code == selectedSubCode);
            let code = document.getElementById('accountCode').value;
            let subId = sub.id;
            
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            try {
                const response = await fetch(`api/maintain.php?action=save_coa_list&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sub_id: subId, code, name: listName })
                });
                if (response.ok) {
                    alert('Account entry saved and synchronized!');
                    closeModal();
                    window.location.reload();
                }
            } catch (err) { alert('Sync Error: ' + err.message); }
        }

        function deleteCOAList() {
            const code = document.getElementById('accountCode').value;
            if(!code) return;
            if(confirm("Are you sure?")) {
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

        window.handleLogout = async function() {
            if(confirm("Are you sure you want to log out?")) {
                try {
                    await fetch('api/auth.php?action=logout');
                    localStorage.removeItem('softifyx_session');
                    window.location.href = 'login.html';
                } catch (err) {
                    localStorage.removeItem('softifyx_session');
                    window.location.href = 'login.html';
                }
            }
        };

        window.checkUserRights = checkUserRights;
