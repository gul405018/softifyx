        // SOFTIFYX APP VERSION 2026-v2-SYNC-FIX (NO_RELOAD_ON_DRP)
        console.log("SoftifyX: Logic Loaded (v2)");
        const sessionDataHeader = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
        let currentUser = sessionDataHeader.username || "Administrator";
        let companyData = {
            name: "", address: "", phone: "", fax: "", email: "", website: "", gst: "", ntn: "", dealsIn: ""
        };
        
        let companies = [];
        let currentNote = "";
        window.isReadOnly = false; // Financial Year Control Flag
        
        let users = [
            { id: 1, username: "Administrator", role: "Admin", email: "admin@softifyx.com", status: "Active", password: "123" }
        ];

        let logoData = null;
        let userProfilePhoto = null;
        let originSelectedCompanyName = ""; 
        
        // EXPOSE TO WINDOW for synchronization with list_of_companies.html component
        window.companyData = companyData;
        window.companies = companies;
        window.originSelectedCompanyName = originSelectedCompanyName;

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

        function checkFinancialYearAccess() {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            if (!session.fy_start || !session.fy_end) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(session.fy_start);
            const end = new Date(session.fy_end);
            
            if (today < start || today > end) {
                window.isReadOnly = true;
                const msg = "Aap ka selected financial year current date se match nahi karta";
                // Show a global warning in the dashboard/title
                const dashTitle = document.getElementById('dashboardCompanyName');
                if (dashTitle) {
                    dashTitle.innerHTML += `<div style="color: #e74c3c; font-size: 14px; margin-top: 5px;"><i class="fas fa-exclamation-triangle"></i> ${msg} (Read-Only)</div>`;
                }
            }
        }

        async function loadSavedData() {
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            currentUser = sessionData.username || "Administrator";
            if (!sessionData.company_id) return;
            const companyId = sessionData.company_id;

            try {
                const cb = `_cb=${Date.now()}`;
                
                // Define fetch operations in a clear array to prevent destructuring mismatches
                const requests = [
                    { key: 'company', url: `api/admin.php?action=get_company&company_id=${companyId}&${cb}` },
                    { key: 'companies', url: `api/admin.php?action=get_companies&${cb}` },
                    { key: 'users', url: `api/admin.php?action=get_users&company_id=${companyId}&${cb}` },
                    { key: 'summary', url: `api/admin.php?action=get_summary&company_id=${companyId}&${cb}` },
                    { key: 'coaMain', url: `api/maintain.php?action=get_coa_main&company_id=${companyId}&${cb}` },
                    { key: 'coaSub', url: `api/maintain.php?action=get_coa_sub&company_id=${companyId}&main_id=ALL&${cb}` },
                    { key: 'coaList', url: `api/maintain.php?action=get_coa_list&company_id=${companyId}&sub_id=ALL&${cb}` },
                    { key: 'currency', url: `api/admin.php?action=get_currency&company_id=${companyId}&${cb}` },
                    { key: 'rights', url: `api/admin.php?action=get_rights&user_id=${sessionData.user_id || 0}&${cb}` },
                    { key: 'fy', url: `api/admin.php?action=get_fy&company_id=${companyId}&${cb}` },
                    { key: 'profile', url: `api/admin.php?action=get_profile_photo&${cb}` }
                ];

                const responses = await Promise.all(requests.map(req => fetch(req.url).catch(e => ({ ok: false, error: e }))));
                
                // Map responses back to meaningful variables
                const [
                    companyRes, companiesRes, usersRes, summaryRes, 
                    coaMainRes, coaSubRes, coaListRes, 
                    currRes, rightsRes, fyRes, profileRes
                ] = responses;

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
                            window.currentUserRights[r.module_name.trim()] = {
                                allowed: parseInt(r.is_allowed) === 1,
                                can_edit: parseInt(r.can_edit) === 1,
                                can_view: parseInt(r.can_view) === 1
                            };
                        });
                    }
                    
                    // FORCE ADMIN RIGHTS: Ensure Administrator and Admins always have everything
                    const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                    const userObj = (users || []).find(u => u.username === session.username);
                    if (session.username === 'Administrator' || session.role === 'Admin' || userObj?.role === 'Admin') {
                        // We will allow checkUserRights to handle this naturally by checking role first
                        // but we also pre-fill common modules just in case
                    }
                }

                // 8. Financial Years Sync
                if (fyRes.ok) {
                    try {
                        const fyData = await fyRes.json();
                        if (Array.isArray(fyData)) {
                            financialYears = fyData.map(f => ({ 
                                id: f.id, 
                                start: f.start_date, 
                                end: f.end_date, 
                                abbr: f.year_label || f.abbreviation || f.year || 'FY' 
                            }));
                        }
                    } catch (e) { console.warn('FY Parse Error:', e); }
                }

                // 9. Profile Photo Sync
                if (profileRes && profileRes.ok) {
                    const profileData = await profileRes.json();
                    userProfilePhoto = profileData.profile_photo || null;
                }

                // Apply UI Updates
                displayLogo();
                updateNames();
                updateDashboardSummary();
                checkFinancialYearAccess(); // Trigger Read-Only Check
                renderFinancialYearList(); // Initial list rendering
                
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
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const displayName = sessionData.username || currentUser || "Administrator";

            const titleEl = document.getElementById('titleCompanyName');
            if (titleEl) titleEl.textContent = `- ${companyData.name}`;
            
            const dashNameEl = document.getElementById('dashboardCompanyName');
            if (dashNameEl) dashNameEl.textContent = companyData.name;
            
            // Critical: Update Browser Tab Title
            document.title = `Softifyx - ${companyData.name || 'Financials'}`;

            const welcomeEl = document.getElementById('welcomeUserDisplay');
            if (welcomeEl) {
                const iconHtml = userProfilePhoto 
                    ? `<img src="${userProfilePhoto}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.3);">`
                    : '<i class="fas fa-user-circle"></i>';
                welcomeEl.innerHTML = `${iconHtml} <span>Welcome ${displayName}</span>`;
            }
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

        function openModal(title, content, isWide = false, moduleKey = null) {
            const overlay = document.getElementById('modalOverlay');
            const container = document.getElementById('modalContainer');
            
            if (isWide) container.classList.add('modal-wide');
            else container.classList.remove('modal-wide');
            
            // Use the provided moduleKey if available, otherwise fallback to title text for tagging
            const dataModuleTag = moduleKey || title.text;
            
            container.innerHTML = `
                <div class="modal-header">
                    <h2><i class="fas ${title.icon}"></i> ${title.text}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" data-module="${dataModuleTag}">
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

        function openSecondaryModal(title, content, isWide = false, moduleKey = null) {
            const overlay = document.getElementById('modalOverlay2');
            const container = document.getElementById('modalContainer2');
            
            if (isWide) container.classList.add('modal-wide');
            else container.classList.remove('modal-wide');
            
            const dataModuleTag = moduleKey || title.text;
            
            container.innerHTML = `
                <div class="modal-header">
                    <h2><i class="fas ${title.icon}"></i> ${title.text}</h2>
                    <button class="modal-close" onclick="closeSecondaryModal()">&times;</button>
                </div>
                <div class="modal-body" data-module="${dataModuleTag}">
                    ${content}
                </div>
            `;
            
            overlay.classList.add('active');

            setTimeout(() => {
                applyViewerRestrictions(container);
            }, 50);
        }

        function closeSecondaryModal() {
            document.getElementById('modalOverlay2').classList.remove('active');
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
                            <option value="User">User (Standard)</option>
                            <option value="Admin">Admin (Manager)</option>
                        </select>
                    </div>
                    <div class="modal-actions" style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        <button class="btn btn-primary" onclick="addUser()" style="height: 42px; padding: 0 30px; font-weight: 600; border-radius: 10px;">Add User</button>
                        <button class="btn btn-secondary" onclick="closeModal()" style="height: 42px; padding: 0 30px; font-weight: 600; border-radius: 10px;">Cancel</button>
                    </div>
                </div>`,
                false,
                "User Logins"
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
                                <option value="User" ${user.role === 'User' ? 'selected' : ''}>User</option>
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
                    </div>`,
                    false,
                    "User Logins"
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
                </div>`,
                false,
                "List Of Companies"
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
            // Priority 1: Specifically selected name in list, Priority 2: Current active name
            const oldName = window.originSelectedCompanyName || originSelectedCompanyName || companyData.name;
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
                deals_in: document.getElementById('modalCompanyDealsIn')?.value || '',
                status: document.getElementById('inactiveCheckbox')?.checked ? 0 : 1
            };
            
            // Find specific company record to update in the global companies array
            const targetCompany = companies.find(c => (typeof c === 'string' ? c : c.name) === oldName);

            // SAFETY PROTECTION for Default Company (usually ID=1, 'Softifyx')
            if (targetCompany && targetCompany.id == 1 && payload.status === 0) {
                alert("Critical System Error: Default company 'Softifyx' cannot be deactivated to prevent system-wide lockouts.");
                const chk = document.getElementById('inactiveCheckbox');
                if (chk) chk.checked = false;
                return;
            }

            try {
                const response = await fetch(`api/admin.php?action=save_company&id=${targetCompany?.id || ''}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, id: targetCompany?.id }) // PASS ID HERE FOR UPDATE
                });

                if (response.ok) {
                    // CRITICAL: If a company was selected from the list, apply it ONLY IF ACTIVE
                    if (targetCompany && payload.status === 1) {
                        const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                        // Update ONLY company-specific fields to preserve user_id, role, etc.
                        const updatedSession = {
                            ...sessionData,
                            company_id: targetCompany.id,
                            company_name: newName
                        };
                        localStorage.setItem('softifyx_session', JSON.stringify(updatedSession));
                    } else if (payload.status === 0) {
                        console.log("Company deactivated. Skipping session switch.");
                    }

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
            document.getElementById('myCompanyBtn').addEventListener('click', async function() {
                if (!checkUserRights("My Company")) return showAccessDenied("My Company");
                
                // LIVE SYNC: Fetch latest company info before opening
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
                    </div>`,
                    false,
                    "My Company"
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
                    </div>`,
                    false,
                    "My Logo"
                );
            });

            document.getElementById('listOfCompaniesBtn').addEventListener('click', function() {
                if (!checkUserRights("List Of Companies")) return showAccessDenied("List Of Companies");
                
                const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const currentCoName = sessionData.company_name || "";
                
                let companyOptions = '';
                companies.forEach(company => {
                    const companyName = (typeof company === 'string') ? company : (company.name || "Unknown Company");
                    const isSelected = (companyName === currentCoName) ? 'selected' : '';
                    companyOptions += `<option value="${companyName}" ${isSelected}>${companyName}</option>`;
                });
                
                openModal(
                    { icon: 'fa-list', text: 'List of Companies - Select for Login' },
                    `<div id="listOfCompaniesModal">
                        <div style="background: #f8fafd; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <label style="min-width: 100px; font-size: 13px; font-weight: 500;">Select Company</label>
                                <select class="form-control" style="flex: 1; height: 36px;" id="companySelector" onchange="populateCompanyForm(this)">
                                    <option value="">-- Choose Company --</option>
                                    ${companyOptions}
                                </select>
                                <button class="btn btn-primary btn-sm" onclick="showAddCompanyForm()"><i class="fas fa-plus"></i> New</button>
                            </div>
                        </div>
                        <div style="background: #e8f0fe; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                            <p style="font-size: 13px; color: #1f4668;"><i class="fas fa-info-circle" style="color: #F5A623;"></i> Select a company above to load its data. Click <b>Save Changes</b> to update and apply the selection.</p>
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
                    </div>`,
                    false,
                    "List Of Companies"
                );
            });


            
            document.getElementById('userLoginsBtn').addEventListener('click', async function() {
                if (!checkUserRights("User Logins")) return showAccessDenied("User Logins");
                
                // LIVE SYNC: Fetch latest users list before opening
                const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                const companyId = sessionData.company_id || 1;
                try {
                    const res = await fetch(`api/admin.php?action=get_users&company_id=${companyId}`);
                    if (res.ok) users = await res.json();
                } catch (err) { console.error('Live Sync Error:', err); }

                openModal(
                    { icon: 'fa-users', text: 'User Logins' },
                    renderUserTable(),
                    false,
                    "User Logins"
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

        async function switchCompanyDataMode(select) {
            const selectedCompany = select.value;
            if (!selectedCompany) return;
            
            const found = companies.find(c => (typeof c === 'string' ? c : c.name) === selectedCompany);
            if (found) {
                // Populate the form instead of switching sessions immediately
                populateCompanyForm(select);
            }
        }
        // DEPRECATED: Old function renamed to prevent cached calls
        window.selectCompanyForLogin = switchCompanyDataMode;

        window.populateCompanyForm = function(select) {
            const selectedCompany = select.value;
            if (!selectedCompany) return;
            
            const found = companies.find(c => (typeof c === 'string' ? c : c.name) === selectedCompany);
            if (found) {
                // Set original name tracking for saveCompanyDetails()
                originSelectedCompanyName = found.name || selectedCompany;
                window.originSelectedCompanyName = originSelectedCompanyName;
                
                // Populate Modal Fields
                const get = id => document.getElementById(id);
                if (get('modalCompanyName')) get('modalCompanyName').value = found.name || '';
                if (get('modalCompanyAddress')) get('modalCompanyAddress').value = found.address || '';
                if (get('modalCompanyPhone')) get('modalCompanyPhone').value = found.phone || '';
                if (get('modalCompanyFax')) get('modalCompanyFax').value = found.fax || '';
                if (get('modalCompanyEmail')) get('modalCompanyEmail').value = found.email || '';
                if (get('modalCompanyWebsite')) get('modalCompanyWebsite').value = found.website || '';
                if (get('modalCompanyGST')) get('modalCompanyGST').value = found.gst || '';
                if (get('modalCompanyNTN')) get('modalCompanyNTN').value = found.ntn || '';
                if (get('modalCompanyDealsIn')) get('modalCompanyDealsIn').value = found.deals_in || found.dealsIn || '';
                
                // Set Inactive Checkbox Status
                const inactiveChk = get('inactiveCheckbox');
                if (inactiveChk) {
                    // 1. SET CHECKED STATUS
                    inactiveChk.checked = (found.status == 0);
                    
                    // 2. LOCK FOR DEFAULT COMPANY (ID=1)
                    if (found.id == 1) {
                        inactiveChk.disabled = true;
                        inactiveChk.parentElement.style.opacity = '0.5';
                        inactiveChk.parentElement.style.cursor = 'not-allowed';
                        inactiveChk.title = "Default company cannot be deactivated.";
                    } else {
                        inactiveChk.disabled = false;
                        inactiveChk.parentElement.style.opacity = '1';
                        inactiveChk.parentElement.style.cursor = 'pointer';
                        inactiveChk.title = "";
                    }
                }
                
                console.log(`Loaded data for: ${originSelectedCompanyName}`);
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
                rightsRows += `<tr data-right="${itemName}" style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 15px; color: #334155; font-size: 13.5px; font-weight: 500;">
                        ${itemName}
                    </td>
                    <td class="right-status" style="text-align: center; font-weight: 700; color: #ef4444; cursor: pointer; user-select: none; transition: all 0.2s; font-size: 11px; padding: 12px 5px; border-left: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;" ondblclick="toggleRightStatus(this)">Not Allowed</td>
                    <td style="text-align: center; padding: 5px; background: #fff !important;">
                        <input type="checkbox" class="editor-check" disabled 
                            onclick="handleRightCheckboxClick(this, 'editor')"
                            style="width: 20px !important; height: 20px !important; cursor: not-allowed; opacity: 0.5; margin: 0; display: inline-block !important; visibility: visible !important;">
                    </td>
                    <td style="text-align: center; padding: 5px; background: #fff !important;">
                        <input type="checkbox" class="viewer-check" disabled 
                            onclick="handleRightCheckboxClick(this, 'viewer')"
                            style="width: 20px !important; height: 20px !important; cursor: not-allowed; opacity: 0.5; margin: 0; display: inline-block !important; visibility: visible !important;">
                    </td>
                </tr>`;
            });

            // Mutual Exclusion Handler: Only one can be checked at a time (Editor OR Viewer)
            window.handleRightCheckboxClick = function(checkbox, type) {
                const row = checkbox.closest('tr');
                const editorCb = row.querySelector('.editor-check');
                const viewerCb = row.querySelector('.viewer-check');
                
                if (checkbox.checked) {
                    if (type === 'editor') {
                        viewerCb.checked = false;
                    } else {
                        editorCb.checked = false;
                    }
                }
            };

            const urUserSelect = document.getElementById('urUserSelect');
            if(urUserSelect) urUserSelect.innerHTML = userOptions;
            
            const urTableBody = document.getElementById('urTableBody');
            if(urTableBody) urTableBody.innerHTML = rightsRows;
            
            setTimeout(() => {
                loadUserRightsForm();
            }, 50);
        }

        function toggleRightStatus(cell) {
            const row = cell.closest('tr');
            const statusCell = row.querySelector('.right-status');
            const checkboxes = row.querySelectorAll('input[type="checkbox"]');
            
            if (statusCell.textContent === 'Not Allowed') {
                statusCell.textContent = 'Allowed';
                statusCell.style.color = '#10b981';
                checkboxes.forEach(cb => {
                    cb.disabled = false;
                    cb.style.opacity = '1';
                    cb.style.cursor = 'pointer';
                });
            } else {
                statusCell.textContent = 'Not Allowed';
                statusCell.style.color = '#ef4444';
                checkboxes.forEach(cb => {
                    cb.checked = false;
                    cb.disabled = true;
                    cb.style.opacity = '0.3';
                    cb.style.cursor = 'not-allowed';
                });
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
                    rightsData[r.module_name] = {
                        allowed: (r.is_allowed == 1),
                        edit: (r.can_edit == 1),
                        view: (r.can_view == 1)
                    };
                });
                
                const urUserSelect = document.getElementById('urUserSelect');
                const selectedUserId = urUserSelect ? urUserSelect.value : null;
                // Double-check users global variable
                const currentUsersList = (typeof users !== 'undefined') ? users : [];
                const userObj = currentUsersList.find(u => u.id == selectedUserId);
                
                // Force Admin Logic: Check by username or role
                const isAdmin = (userObj && (userObj.username === 'Administrator' || userObj.role === 'Admin')) || (selectedUserId == 1);

                document.querySelectorAll('#urTableBody tr').forEach(row => {
                    const rightNameRaw = row.getAttribute('data-right');
                    const rightName = rightNameRaw ? rightNameRaw.trim().toLowerCase() : "";
                    const statusCell = row.querySelector('.right-status');
                    const editorCb = row.querySelector('.editor-check');
                    const viewerCb = row.querySelector('.viewer-check');
                    
                    if (!statusCell || !editorCb || !viewerCb) {
                        console.error("Missing elements in row for", rightName);
                        return;
                    }

                    let data = { allowed: false, edit: false, view: false };
                    
                    // Normalizing rightsData lookup
                    if (rightsData && Array.isArray(rightsData)) {
                        const found = rightsData.find(r => r.module_name.trim().toLowerCase() === rightName);
                        if (found) {
                            data = {
                                allowed: parseInt(found.is_allowed) === 1,
                                edit: parseInt(found.can_edit) === 1,
                                view: parseInt(found.can_view) === 1
                            };
                        }
                    } else if (rightsData && typeof rightsData === 'object') {
                        // Fallback for object-based rightsData
                        for (let mod in rightsData) {
                            if (mod.trim().toLowerCase() === rightName) {
                                data = rightsData[mod];
                                break;
                            }
                        }
                    }
                    
                    // FORCE ALLOWED FOR ADMINS
                    if (isAdmin) {
                        data = { allowed: true, edit: true, view: true };
                    }

                    if (data.allowed) {
                        statusCell.textContent = 'Allowed';
                        statusCell.style.color = '#10b981';
                        [editorCb, viewerCb].forEach(cb => {
                            cb.disabled = false;
                            cb.style.opacity = '1';
                            cb.style.cursor = 'pointer';
                        });
                    } else {
                        statusCell.textContent = 'Not Allowed';
                        statusCell.style.color = '#ef4444';
                        [editorCb, viewerCb].forEach(cb => {
                            cb.checked = false;
                            cb.disabled = true;
                            cb.style.opacity = '0.5';
                            cb.style.cursor = 'not-allowed';
                        });
                    }
                    
                    editorCb.checked = data.edit;
                    viewerCb.checked = data.view;
                });
            } catch (err) { console.error('Rights Load Error:', err); }
        }

        async function saveUserRights() {
            const userId = document.getElementById('urUserSelect').value;
            let rightsPayload = [];
            
            document.querySelectorAll('#urTableBody tr').forEach(row => {
                const rightName = row.getAttribute('data-right');
                const isAllowed = (row.querySelector('.right-status').textContent === 'Allowed');
                const canEdit = row.querySelector('.editor-check').checked;
                const canView = row.querySelector('.viewer-check').checked;
                
                rightsPayload.push({ 
                    module: rightName, 
                    allowed: isAllowed ? 1 : 0,
                    can_edit: canEdit ? 1 : 0,
                    can_view: canView ? 1 : 0
                });
            });
            
            try {
                await fetch('api/admin.php?action=save_rights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, rights: rightsPayload })
                });
                
                await loadSavedData();
                alert('User rights saved and synced successfully!');
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
            const newPwd = document.getElementById('pwdNew').value.trim();
            const confPwd = document.getElementById('pwdConfirm').value.trim();
            const errorMsg = document.getElementById('pwdErrorMsg');
            
            errorMsg.textContent = '';
            
            if(!newPwd || !confPwd) {
                errorMsg.textContent = 'Both New Password and Re-Type fields are required!';
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

        async function resetUserPassword() {
            try {
                const userSel = document.getElementById('pwdUserSelect');
                if (!userSel) return alert('System Error: User list not found.');
                
                const userId = parseInt(userSel.value);
                const newPwd = (document.getElementById('pwdNew')?.value || '').trim();
                const confPwd = (document.getElementById('pwdConfirm')?.value || '').trim();
                const errorMsg = document.getElementById('pwdErrorMsg');
                
                if (!userId || isNaN(userId)) return alert('Please select a user from the dropdown first.');
                
                if (errorMsg) errorMsg.textContent = '';
                
                if (!newPwd || !confPwd) {
                    if (errorMsg) errorMsg.textContent = 'Enter and confirm new password!';
                    return;
                }
                if (newPwd !== confPwd) {
                    if (errorMsg) errorMsg.textContent = 'Passwords do not match!';
                    return;
                }
                
                const userName = (users || []).find(u => u.id == userId)?.username || 'User';
                if (!confirm(`Are you sure you want to RESET the password for "${userName}"? The old password will be overwritten.`)) return;

                const response = await fetch('api/admin.php?action=update_password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: userId, password: newPwd })
                });

                if (response.ok) {
                    alert(`Success: Password for "${userName}" has been reset successfully!`);
                    // Clear the fields
                    if(document.getElementById('pwdNew')) document.getElementById('pwdNew').value = '';
                    if(document.getElementById('pwdConfirm')) document.getElementById('pwdConfirm').value = '';
                    if(document.getElementById('pwdOld')) document.getElementById('pwdOld').value = '';
                    closeModal();
                } else {
                    const result = await response.json();
                    alert('Server Error: ' + (result.error || 'Failed to reset password.'));
                }
            } catch (err) {
                console.error('Password Reset Error:', err);
                alert('System Error: ' + err.message);
            }
        }
        window.resetUserPassword = resetUserPassword;

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

        function renderFinancialYearList() {
            const listContainer = document.getElementById('fyListBox');
            if (!listContainer) return;

            listContainer.innerHTML = '';
            const editId = document.getElementById('fyEditId').value;

            financialYears.forEach(fy => {
                const item = document.createElement('div');
                item.className = `listbox-item ${fy.id == editId ? 'active' : ''}`;
                item.textContent = fy.abbr;
                item.onclick = () => selectFinancialYear(fy.id);
                listContainer.appendChild(item);
            });
        }

        function calculateAbbreviation(start, end) {
            if (!start || !end) return '';
            const s = new Date(start);
            const e = new Date(end);
            if (isNaN(s) || isNaN(e)) return '';
            
            const startYear = s.getFullYear();
            const endYear = e.getFullYear();
            const endShort = endYear.toString().slice(-2);
            return `${startYear}-${endShort}`;
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

        async function saveFinancialYear(event) {
            if (event) event.preventDefault();
            const start = document.getElementById('fyStartDate').value;
            const end = document.getElementById('fyEndDate').value;
            const editId = document.getElementById('fyEditId').value;
            const errorMsg = document.getElementById('fyErrorMsg');
            
            errorMsg.textContent = ''; // Reset UI
            
            // 1. Core Validations
            if(!start || !end) {
                errorMsg.style.color = '#d63031';
                errorMsg.textContent = 'Starting and Ending dates are required.';
                return;
            }

            if (new Date(end) <= new Date(start)) {
                errorMsg.style.color = '#d63031';
                errorMsg.textContent = 'Ending Date must be greater than Starting Date.';
                return;
            }

            // 2. Auto-Generate Abbreviation
            const abbr = calculateAbbreviation(start, end);
            document.getElementById('fyAbbreviation').value = abbr; // Show in UI

            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            try {
                const response = await fetch(`api/admin.php?action=save_fy&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editId, start, end, abbr })
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    // Success Path
                    const fyRes = await fetch(`api/admin.php?action=get_fy&company_id=${companyId}`);
                    if (fyRes.ok) {
                        try {
                            const fyData = await fyRes.json();
                            if (Array.isArray(fyData)) {
                                financialYears = fyData.map(f => ({ 
                                    id: f.id, 
                                    start: f.start_date, 
                                    end: f.end_date, 
                                    abbr: f.year_label || f.abbreviation || f.year || 'FY' 
                                }));
                            }
                        } catch (e) { console.warn('FY Refresh Error:', e); }
                    }

                    errorMsg.style.color = '#27ae60';
                    errorMsg.textContent = 'Settings saved and synced successfully!';
                    renderFinancialYearList();
                    if(!editId) addFinancialYear(); 
                } else {
                    // Enhanced Error Path
                    errorMsg.style.color = '#d63031';
                    errorMsg.textContent = result.message || 'Server Error while saving.';
                }
            } catch (err) { 
                errorMsg.style.color = '#d63031';
                errorMsg.textContent = 'Connection Failed: ' + err.message;
            }
        }

        // EXPOSE TO GLOBAL WINDOW SCOPE
        window.renderFinancialYearList = renderFinancialYearList;
        window.saveFinancialYear = saveFinancialYear;
        window.addFinancialYear = addFinancialYear;
        window.selectFinancialYear = selectFinancialYear;
        window.calculateAbbreviation = calculateAbbreviation;

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
            if (!rightName) return true;
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            
            if (session.username === 'Administrator') return true;
            if (session.role === 'Admin') return true;
            
            const userObj = (users || []).find(u => u.username === session.username);
            if (userObj?.role === 'Admin') return true;

            if (!window.currentUserRights) return false; 
            
            const rName = rightName.trim();
            const right = window.currentUserRights[rName];
            
            // Returns true if module is 'Allowed' AND has at least one permission checked
            return right && right.allowed && (right.can_edit || right.can_view);
        }
 
        function applyViewerRestrictions(container) {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            
            // 1. ADMIN BYPASS: Full access for Administrators
            if (session.username === 'Administrator') return;
            if (session.role === 'Admin') return;
            
            const userObj = (window.users || []).find(u => u.username === session.username);
            if (userObj?.role === 'Admin') return;

            // 2. IDENTIFY MODULE
            let mName = container.getAttribute('data-module');
            const body = container.querySelector('.modal-body');
            
            if (!mName && body) {
                mName = body.getAttribute('data-module');
            }
            
            // Fallback: If no data-module, try to match via Header Title
            if (!mName) {
                const header = container.querySelector('.modal-header h2') || container.querySelector('h2');
                if (header) {
                    const fullTitle = header.innerText.trim();
                    // Custom Mapping for "Company Setup" -> "My Company"
                    if (fullTitle.includes("Company Setup")) mName = "My Company";
                    else if (fullTitle.includes("Logo Settings")) mName = "My Logo";
                    else mName = fullTitle;
                }
            }
            
            if (!mName || !window.currentUserRights) return;

            // Normalize lookup: Try direct and then case-insensitive
            let right = window.currentUserRights[mName];
            if (!right) {
                const lowerName = mName.toLowerCase().trim();
                for (let key in window.currentUserRights) {
                    const cleanKey = key.toLowerCase().trim();
                    if (cleanKey === lowerName || lowerName.includes(cleanKey) || cleanKey.includes(lowerName)) {
                        right = window.currentUserRights[key];
                        break;
                    }
                }
            }
            
            console.log(`SoftifyX: Checking Permissions for [${mName}]`, right);

            // 3. LOGIC CHECK
            if (!right) return;

            // - Editor (can_edit=1) HAS FULL ACCESS
            // - Viewer (can_view=1) IS READ-ONLY
            const isEditor = right.allowed && right.can_edit;
            const isViewer = right.allowed && right.can_view;
            const isFYMismatched = window.isReadOnly;

            // If user is Editor, they bypass restrictions UNLESS FY is mismatched
            if (isEditor && !isFYMismatched) return;
            
            // If user is NOT an Editor but IS a Viewer, they get read-only mode
            // If user has NEITHER but somehow got here, restricted mode appy anyway

            // 4. APPLY RESTRICTIONS: Disable inputs & Hide Save Buttons
            const inputs = container.querySelectorAll('input, select, textarea');
            inputs.forEach(el => {
                el.disabled = true;
                el.style.backgroundColor = '#f8fafc';
                el.style.cursor = 'not-allowed';
            });

            const actionKeywords = [
                'Save', 'Add', 'Update', 'Delete', 'Clear', 'Restore', 'Backup', 
                'Post', 'Record', 'New', 'Remove', 'Edit', 'Change', 'Sync'
            ];
            
            const buttons = container.querySelectorAll('button');
            buttons.forEach(btn => {
                const btnText = btn.innerText.trim();
                const btnHtml = btn.innerHTML;
                
                const isNavigation = btnText.match(/Close|Cancel|Back|Understand|View|Exit/i);
                const isPrinting = btnHtml.match(/fa-print|fa-file-pdf/i) || btnText.match(/Print|Report/i);
                
                if (!isNavigation && !isPrinting) {
                    const isAction = actionKeywords.some(kw => btnText.includes(kw) || btnHtml.includes(kw.toLowerCase()));
                    if (isAction || btn.classList.contains('btn-primary') || btn.classList.contains('btn-danger') || btn.classList.contains('btn-warning')) {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                        btn.style.pointerEvents = 'none';
                    }
                }
            });

            // 5. REMOVED UI FEEDBACK MODULE AS REQUESTED (NO "READ ONLY" MESSAGE)
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
                // IMPORTANT: Normalize module tracking for rights enforcement
                const activeModuleKey = moduleName || titleText;
                
                // If moduleName is explicitly provided, check rights BEFORE any fetch to prevent loading
                if (activeModuleKey && !checkUserRights(activeModuleKey)) {
                    showAccessDenied(activeModuleKey);
                    return;
                }

                const cb = `_cb=${Date.now()}`;
                const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}${cb}`);
                if (res.ok) {
                    let html = await res.text();
                    
                    // --- AUTOMATED RIGHTS CHECK FOR POPUPS ---
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
                    
                    openModal({ icon: titleIcon, text: titleText }, html, isWide, activeModuleKey);
                    
                    if (typeof initCallback === 'function') {
                        setTimeout(() => initCallback(), 10);
                    } else {
                        // Global Init Fallbacks
                        if (url.includes('passwords.html')) setTimeout(() => initPasswordsView(), 10);
                        else if (url.includes('user_rights.html')) setTimeout(() => initUserRightsView(), 10);
                        else if (url.includes('financial_year.html')) setTimeout(() => initFinancialYearView(), 10);
                        else if (url.includes('currency.html')) setTimeout(() => initCurrencyView(), 10);
                        else if (url.includes('chart_of_accounts.html')) setTimeout(() => initChartOfAccountsView(), 10);
                        else if (url.includes('employees.html')) setTimeout(() => initEmployeesView(), 10);
                    }
                } else {
                    openModal({ icon: titleIcon, text: titleText }, 
                        '<div style="color:red;padding:30px;text-align:center;"><h3>Module Not Found</h3><p>' + url + ' does not exist.</p></div>',
                        isWide
                    );
                }
            } catch (err) { console.error(err); }
        }

        async function openSecondaryModularPopup(url, titleIcon, titleText, initCallback, moduleName, isWide = false) {
            try {
                const activeModuleKey = moduleName || titleText;
                if (activeModuleKey && !checkUserRights(activeModuleKey)) {
                    showAccessDenied(activeModuleKey);
                    return;
                }

                const cb = `_cb=${Date.now()}`;
                const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}${cb}`);
                if (res.ok) {
                    let html = await res.text();
                    openSecondaryModal({ icon: titleIcon, text: titleText }, html, isWide, activeModuleKey);
                    if (typeof initCallback === 'function') {
                        setTimeout(() => initCallback(), 10);
                    }
                }
            } catch (err) { console.error(err); }
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

            // Setup Profile Photo Interaction
            const welcomeEl = document.getElementById('welcomeUserDisplay');
            if (welcomeEl) {
                welcomeEl.addEventListener('click', handleProfilePhotoClick);
            }
            
            const profileInput = document.getElementById('profilePhotoInput');
            if (profileInput) {
                profileInput.addEventListener('change', uploadProfilePhoto);
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
        window.switchCompanyDataMode = switchCompanyDataMode;
        window.selectCompanyForLogin = switchCompanyDataMode; // Support for potentially cached templates
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
                    let isCust = (moduleName === "Customers" || (targetUrl && targetUrl.includes('customers.html')));
                    let isVend = (moduleName === "Vendors/Suppliers" || (targetUrl && targetUrl.includes('vendors.html')));
                    let isReg = (moduleName === "Customer Regions" || (targetUrl && targetUrl.includes('customer_regions.html')));
                    let isEmp = (moduleName === "Employees" || (targetUrl && targetUrl.includes('employees.html')));
                    let isBank = (moduleName === "Bank Accounts" || (targetUrl && targetUrl.includes('bank_accounts.html')));
                    let initCallback = isCoa ? initChartOfAccountsView : (isCust ? initCustomersView : (isVend ? initVendorsView : (isReg ? initRegionsView : (isEmp ? initEmployeesView : (isBank ? initBankAccountsView : null)))));
                    window.openModularPopup(targetUrl, 'fa-file-alt', titleText, initCallback, moduleName, (isCoa || isCust || isVend || isReg || isEmp || isBank));
                    
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
                    let isCust = (moduleName === "Customers" || (targetUrl && targetUrl.includes('customers.html')));
                    let isVend = (moduleName === "Vendors/Suppliers" || (targetUrl && targetUrl.includes('vendors.html')));
                    let isReg = (moduleName === "Customer Regions" || (targetUrl && targetUrl.includes('customer_regions.html')));
                    let isEmp = (moduleName === "Employees" || (targetUrl && targetUrl.includes('employees.html')));
                    let isBank = (moduleName === "Bank Accounts" || (targetUrl && targetUrl.includes('bank_accounts.html')));
                    let initCallback = isCoa ? initChartOfAccountsView : (isCust ? initCustomersView : (isVend ? initVendorsView : (isReg ? initRegionsView : (isEmp ? initEmployeesView : (isBank ? initBankAccountsView : null)))));
                    window.openModularPopup(targetUrl, 'fa-file-alt', titleText, initCallback, moduleName, (isCoa || isCust || isVend || isReg || isEmp || isBank));
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

        // === EMPLOYEES MODULE LOGIC ===
        let allEmployeesData = [];
        let currentEmployeeId = null;

        async function initEmployeesView() {
            console.log("SoftifyX: Init Employees View");
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const coId = session.company_id || 1;
            
            try {
                // 1. Load Departments
                const dRes = await fetch(`api/maintain.php?action=get_departments&company_id=${coId}`);
                if (dRes.ok) {
                    const depts = await dRes.json();
                    const dSelect = document.getElementById('empDepartment');
                    if (dSelect) {
                        dSelect.innerHTML = '<option value="">-- Select Department --</option>';
                        depts.forEach(d => { dSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`; });
                    }
                }

                // 2. Load Employees
                await fetchEmployeesList(coId);
                
                // 3. Reset UI
                resetEmployeeForm(false);
            } catch (e) {
                console.error("Employees Load Error:", e);
                alert("System Error: Could not load employee data.");
            }
        }

        async function fetchEmployeesList(coId) {
            try {
                const res = await fetch(`api/maintain.php?action=get_employees&company_id=${coId}`);
                if (res.ok) {
                    allEmployeesData = await res.json();
                    renderEmployeesList();
                }
            } catch (e) { console.error("Fetch Employees List Error:", e); }
        }

        function renderEmployeesList() {
            const list = document.getElementById('employeeList');
            if (list) {
                list.innerHTML = (allEmployeesData || []).map(e => `<option value="${e.id}">${e.name}</option>`).join('');
            }
        }

        function onEmployeeSelect(id) {
            const emp = allEmployeesData.find(e => e.id == id);
            if (!emp) return;
            currentEmployeeId = id;

            const fields = {
                'empName': emp.name, 'empFatherName': emp.father_name, 'empAddress': emp.address,
                'empTelephone': emp.telephone, 'empEmail': emp.email, 'empNicNo': emp.nic_no,
                'empDob': emp.dob, 'empJoiningDate': emp.joining_date, 'empSalary': emp.salary,
                'empDesignation': emp.designation, 'empDepartment': emp.department_id,
                'empRemarks': emp.remarks, 'empReference': emp.reference, 'empLeavingDate': emp.leaving_date
            };
            Object.keys(fields).forEach(fid => {
                const el = document.getElementById(fid);
                if (el) el.value = fields[fid] || (fid === 'empSalary' ? 0 : '');
            });

            const jobLeft = document.getElementById('empJobLeft');
            if (jobLeft) jobLeft.checked = emp.job_left == 1;
            
            toggleLeavingDate(emp.job_left == 1);
            enableEmployeeFields(false);
            const saveBtn = document.getElementById('empSaveBtn');
            if (saveBtn) saveBtn.disabled = true;
        }

        function toggleLeavingDate(checked) {
            const el = document.getElementById('empLeavingDate');
            if (el) el.disabled = !checked || (document.getElementById('empSaveBtn') && document.getElementById('empSaveBtn').disabled);
        }

        function resetEmployeeForm(isAdd = false) {
            currentEmployeeId = isAdd ? null : currentEmployeeId;
            if (!isAdd) {
                if (currentEmployeeId) return onEmployeeSelect(currentEmployeeId);
                enableEmployeeFields(false);
                const saveBtn = document.getElementById('empSaveBtn');
                if (saveBtn) saveBtn.disabled = true;
                return;
            }

            // Clear fields for Add
            const inputs = document.querySelectorAll('#employeesContainer .coa-input, #employeesContainer input[type="checkbox"]');
            inputs.forEach(i => {
                if (i.type === 'checkbox') i.checked = false;
                else if (i.type === 'number') i.value = 0;
                else i.value = '';
            });
            
            enableEmployeeFields(true);
            const saveBtn = document.getElementById('empSaveBtn');
            if (saveBtn) saveBtn.disabled = false;
            const nameField = document.getElementById('empName');
            if (nameField) nameField.focus();
        }

        function enableEmployeeFields(enabled) {
            const inputs = document.querySelectorAll('#employeesContainer .coa-input, #employeesContainer input[type="checkbox"]');
            inputs.forEach(i => { i.disabled = !enabled; });
            if (enabled) toggleLeavingDate(document.getElementById('empJobLeft')?.checked);
        }

        async function saveEmployee() {
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const coId = session.company_id || 1;
            
            const payload = {
                id: currentEmployeeId,
                name: document.getElementById('empName')?.value?.trim(),
                father_name: document.getElementById('empFatherName')?.value?.trim(),
                address: document.getElementById('empAddress')?.value?.trim(),
                telephone: document.getElementById('empTelephone')?.value?.trim(),
                email: document.getElementById('empEmail')?.value?.trim(),
                nic_no: document.getElementById('empNicNo')?.value?.trim(),
                dob: document.getElementById('empDob')?.value,
                joining_date: document.getElementById('empJoiningDate')?.value,
                salary: parseFloat(document.getElementById('empSalary')?.value) || 0,
                designation: document.getElementById('empDesignation')?.value?.trim(),
                department_id: document.getElementById('empDepartment')?.value,
                remarks: document.getElementById('empRemarks')?.value?.trim(),
                reference: document.getElementById('empReference')?.value?.trim(),
                job_left: document.getElementById('empJobLeft')?.checked ? 1 : 0,
                leaving_date: document.getElementById('empLeavingDate')?.value
            };

            if (!payload.name) {
                alert("Employee Name is required!");
                return;
            }

            try {
                const url = `api/maintain.php?action=save_employee&company_id=${coId}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const result = await res.json();
                    alert("Employee profile saved successfully!");
                    await fetchEmployeesList(coId);
                    
                    // Force a small delay to ensure the list is rendered before selecting
                    setTimeout(() => {
                        onEmployeeSelect(result.id);
                    }, 100);
                } else {
                    const errText = await res.text();
                    console.error("Save failed response:", errText);
                    alert(`Save failed: ${res.status} ${res.statusText}\nDetails: ${errText.substring(0, 100)}`);
                }
            } catch (e) { 
                console.error("Save system error:", e);
                alert("Save failed due to a system error. Please check your connection."); 
            }
        }

        async function deleteEmployee() {
            if (!currentEmployeeId) {
                alert("Select an employee first.");
                return;
            }
            const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const coId = session.company_id || 1;

            if (confirm("Are you sure you want to delete this employee?")) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_employee&id=${currentEmployeeId}&company_id=${coId}`, { method: 'POST' });
                    if (res.ok) {
                        alert("Employee deleted successfully.");
                        currentEmployeeId = null;
                        await fetchEmployeesList(coId);
                        resetEmployeeForm(false);
                    } else {
                        alert("Delete failed on server.");
                    }
                } catch (e) { alert("Delete failed due to connection error."); }
            }
        }

        // Expose Employee Functions
        window.initEmployeesView = initEmployeesView;
        window.onEmployeeSelect = onEmployeeSelect;
        window.resetEmployeeForm = resetEmployeeForm;
        window.saveEmployee = saveEmployee;
        window.deleteEmployee = deleteEmployee;
        window.toggleLeavingDate = toggleLeavingDate;

        let selectedMainCode = null;
        let selectedSubCode = null;
        let selectedCustTypeCode = null;
        let selectedCustAccountCode = null;
        let selectedVendTypeCode = null;
        let selectedVendAccountCode = null;
        let customerData = []; 
        let vendorData = [];
        let selectedMainRegionId = null;
        let selectedSubRegionId = null;
        let mainRegionData = [];
        let subRegionData = [];

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
                }
            }
            // Lock fields on select
            if(document.getElementById('mainTypeCode')) document.getElementById('mainTypeCode').disabled = false;
            if(document.getElementById('mainAccountType')) document.getElementById('mainAccountType').disabled = false;
            if(compSelect) compSelect.disabled = true;

            renderCOASubList();
            
            // Auto-select first sub-account if available
            const subList = document.getElementById('subAccountList');
            if (subList && subList.options.length > 0) {
                subList.value = subList.options[0].value;
                onSubAccountSelect(subList.value);
            } else {
                resetSubFormFieldsOnly();
                renderCOAListList();
                resetListForm();
            }
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

            const payloadData = { code, name: mainName, component };
            let idToUpdate = null;
            if (selectedMainCode) {
                const ex = coaMain.find(x => x.code == selectedMainCode);
                if (ex) idToUpdate = ex.id;
            } else {
                const ex = coaMain.find(x => x.code == code);
                if (ex) idToUpdate = ex.id;
            }
            if (idToUpdate) payloadData.id = idToUpdate;
            const idx = idToUpdate ? coaMain.findIndex(m => m.id == idToUpdate) : -1;

            try {
                const response = await fetch(`api/maintain.php?action=save_coa_main&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadData)
                });
                if (response.ok) {
                    const resData = await response.json();
                    alert('Main account saved and synchronized!');
                    
                    // Local check/update
                    if(idx > -1) {
                        coaMain[idx] = { ...coaMain[idx], name: mainName, component };
                    } else {
                        coaMain.push({ id: resData.id, code, name: mainName, component });
                    }
                    
                    renderCOAMainList();
                    resetMainForm(); // Back to locked state
                }
            } catch (err) { alert('Sync Error: ' + err.message); }
        }

        async function deleteCOAMain() {
            if(!selectedMainCode) return;
            
            const main = coaMain.find(m => m.code == selectedMainCode);
            if (!main) return;

            // Strict Deletion Order: Check for Sub Accounts
            const hasSubAccounts = coaSub.some(s => String(s.main_id) === String(main.id));
            if (hasSubAccounts) {
                alert("Cannot delete Main Account Type! There are still Sub Account Types in this category. Please delete all Sub Accounts first.");
                return;
            }

            if(confirm("Are you sure you want to delete this Main Account Type?")) {
                try {
                    const response = await fetch(`api/maintain.php?action=delete_coa_main&id=${main.id}`, { method: 'POST' });
                    if (response.ok) {
                        coaMain = coaMain.filter(m => m.code != selectedMainCode);
                        selectedMainCode = null;
                        renderCOAMainList();
                        resetMainForm();
                        alert("Main Account Type deleted successfully.");
                    }
                } catch (err) { alert("Delete Failed: " + err.message); }
            }
        }

        function resetMainForm(generate = false) {
            if(document.getElementById('mainTypeCode')) {
                document.getElementById('mainTypeCode').value = '';
                document.getElementById('mainTypeCode').disabled = !generate;
            }
            if(document.getElementById('mainAccountType')) {
                document.getElementById('mainAccountType').value = '';
                document.getElementById('mainAccountType').disabled = !generate;
            }
            if(document.getElementById('mainAccountList')) document.getElementById('mainAccountList').value = '';
            
            const compSelect = document.getElementById('financialStatementComponent');
            if(compSelect) {
                compSelect.value = 'current assets';
                compSelect.disabled = !generate;
            }
            
            if(generate) {
                // If adding new, clear selection so it inserts instead of updates
                selectedMainCode = null;
            } else {
                selectedMainCode = null;
            }
            renderCOASubList();
        }

        // Sub Accounts
        function renderCOASubList() {
            const list = document.getElementById('subAccountList');
            if(!list) return;
            if(!selectedMainCode) { list.innerHTML = ''; return; }
            
            const main = coaMain.find(m => m.code == selectedMainCode);
            if(!main) { list.innerHTML = ''; return; }
            
            const filtered = coaSub.filter(s => s.main_id == main.id);
            list.innerHTML = filtered.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
        }

        function onSubAccountSelect(code) {
            selectedSubCode = code;
            const sub = coaSub.find(s => s.code == code);
            if(sub) {
                document.getElementById('subAccountCode').value = sub.code;
                document.getElementById('subAccountType').value = sub.name;
            }
            // Lock fields on select
            if(document.getElementById('subAccountCode')) document.getElementById('subAccountCode').disabled = false;
            if(document.getElementById('subAccountType')) document.getElementById('subAccountType').disabled = false;

            renderCOAListList();
            
            // Auto-select first list-account if available
            const listList = document.getElementById('listAccountList');
            if (listList && listList.options.length > 0) {
                listList.value = listList.options[0].value;
                onListAccountSelect(listList.value);
            } else {
                resetListForm();
            }
        }

        async function saveCOASub() {
            if(!selectedMainCode) return alert("Select a Main Account Type first!");
            const subName = document.getElementById('subAccountType').value.trim();
            if(!subName) return alert("Sub Account Name is required!");

            const main = coaMain.find(m => m.code == selectedMainCode);
            let code = document.getElementById('subAccountCode').value;
            
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const companyId = sessionData.company_id || 1;

            const payloadData = { main_id: main.id, code, name: subName };
            let idToUpdate = null;
            if (selectedSubCode) {
                const ex = coaSub.find(x => x.code == selectedSubCode);
                if (ex) idToUpdate = ex.id;
            } else {
                const ex = coaSub.find(x => x.code == code);
                if (ex) idToUpdate = ex.id;
            }
            if (idToUpdate) payloadData.id = idToUpdate;
            const idx = idToUpdate ? coaSub.findIndex(s => s.id == idToUpdate) : -1;

            try {
                const response = await fetch(`api/maintain.php?action=save_coa_sub&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadData)
                });

                if (response.ok) {
                    const resData = await response.json();
                    alert('Sub account saved and synchronized!');
                    
                    // Local update
                    if(idx > -1) {
                        coaSub[idx] = { ...coaSub[idx], name: subName };
                    } else {
                        coaSub.push({ id: resData.id, main_id: main.id, code, name: subName });
                    }

                    renderCOASubList();
                    resetSubForm(); // Back to locked
                }
            } catch (err) { alert("Save Failed."); }
        }

        async function deleteCOASub() {
            // Priority: Ensure we have a selection
            const codeToUse = selectedSubCode || document.getElementById('subAccountCode').value;
            if(!codeToUse) {
                alert("Please select a Sub Account to delete first.");
                return;
            }

            const sub = coaSub.find(s => s.code == codeToUse);
            if (!sub) {
                alert("Sub Account not found in the list.");
                return;
            }

            // Strict Deletion Order: Check for List of Accounts
            const hasListItems = coaList.some(l => String(l.sub_id) === String(sub.id));
            if (hasListItems) {
                alert("Cannot delete Sub Account Type! There are still accounts in the List of Accounts for this category. Please delete them first.");
                return;
            }

            if(confirm("Are you sure you want to delete this Sub Account Type?")) {
                try {
                    const response = await fetch(`api/maintain.php?action=delete_coa_sub&id=${sub.id}`, { method: 'POST' });
                    if (response.ok) {
                        coaSub = coaSub.filter(s => s.code != codeToUse);
                        selectedSubCode = null;
                        renderCOASubList();
                        resetSubForm();
                        alert("Sub Account Type deleted successfully.");
                    } else {
                        alert("Server error while deleting Sub Account.");
                    }
                } catch (err) { alert("Delete Failed: " + err.message); }
            }
        }

        function resetSubForm(generate = false) {
            if(document.getElementById('subAccountType')) {
                document.getElementById('subAccountType').value = '';
                document.getElementById('subAccountType').disabled = !generate;
            }
            if(document.getElementById('subAccountList')) document.getElementById('subAccountList').value = '';
            
            if(generate) {
                selectedSubCode = null;
            } else {
                selectedSubCode = null;
            }
            
            if(document.getElementById('subAccountCode')) {
                document.getElementById('subAccountCode').disabled = !generate;
            }

            // Only generate code if explicitly requested (clicked Add)
            if (generate && selectedMainCode) {
                const main = coaMain.find(m => m.code == selectedMainCode);
                const siblings = main ? coaSub.filter(s => s.main_id == main.id) : [];
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
            
            const sub = coaSub.find(s => s.code == selectedSubCode);
            if(!sub) { list.innerHTML = ''; return; }
            
            const filtered = coaList.filter(l => l.sub_id == sub.id);
            list.innerHTML = filtered.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
        }

        function onListAccountSelect(code) {
            const acc = coaList.find(l => l.code == code);
            if(acc) {
                document.getElementById('accountCode').value = acc.code;
                document.getElementById('accountName').value = acc.name;
            }
            // Lock fields on select
            if(document.getElementById('accountCode')) document.getElementById('accountCode').disabled = false;
            if(document.getElementById('accountName')) document.getElementById('accountName').disabled = false;
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

            const payloadData = { sub_id: subId, code, name: listName };
            let idToUpdate = null;
            const existingCode = document.getElementById('accountCode').disabled ? code : null; 
            // If they modify code, they must have selected it originally
            const originalCode = document.getElementById('listAccountList').value;
            
            if (originalCode) {
                const ex = coaList.find(x => x.code == originalCode);
                if (ex) idToUpdate = ex.id;
            } else {
                const ex = coaList.find(x => x.code == code);
                if (ex) idToUpdate = ex.id;
            }
            if (idToUpdate) payloadData.id = idToUpdate;
            const idx = idToUpdate ? coaList.findIndex(l => l.id == idToUpdate) : -1;

            try {
                const response = await fetch(`api/maintain.php?action=save_coa_list&company_id=${companyId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadData)
                });
                if (response.ok) {
                    const resData = await response.json();
                    alert('Account entry saved and synchronized!');
                    
                    // Local update
                    if(idx > -1) {
                        coaList[idx] = { ...coaList[idx], name: listName };
                    } else {
                        coaList.push({ id: resData.id, sub_id: sub.id, code, name: listName });
                    }

                    renderCOAListList();
                    resetListForm(); // Back to locked
                }
            } catch (err) { alert('Sync Error: ' + err.message); }
        }

        async function deleteCOAList() {
            const code = document.getElementById('accountCode').value;
            if(!code) {
                alert("Please select an account entry to delete first.");
                return;
            }

            const acc = coaList.find(l => l.code == code);
            if (!acc) {
                alert("Account entry not found in the list.");
                return;
            }

            if(confirm("Are you sure you want to delete this account entry? This action cannot be undone.")) {
                try {
                    const response = await fetch(`api/maintain.php?action=delete_coa_list&id=${acc.id}`, { method: 'POST' });
                    if (response.ok) {
                        coaList = coaList.filter(l => l.code != code);
                        renderCOAListList();
                        resetListForm();
                        alert("Account entry deleted successfully.");
                    } else {
                        alert("Server error while deleting account entry.");
                    }
                } catch (err) { alert("Delete Failed: " + err.message); }
            }
        }

        function resetListForm(generate = false) {
            if(document.getElementById('accountName')) {
                document.getElementById('accountName').value = '';
                document.getElementById('accountName').disabled = !generate;
            }
            if(document.getElementById('listAccountList')) {
                if(!generate) {
                    document.getElementById('listAccountList').value = '';
                } else {
                    document.getElementById('listAccountList').selectedIndex = -1; // Deselect to allow insert
                }
            }
            
            if(document.getElementById('accountCode')) {
                document.getElementById('accountCode').disabled = !generate;
            }

            // Only generate code if explicitly requested (clicked Add)
            if (generate && selectedSubCode) {
                const sub = coaSub.find(s => s.code == selectedSubCode);
                const siblings = sub ? coaList.filter(l => l.sub_id == sub.id) : [];
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
            const sub = coaSub.find(s => s.code == selectedSubCode);
            if (!sub) return;
            
            const items = coaList.filter(l => l.sub_id == sub.id);
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
            if(level === 'main') { 
                reportTitle = "MAIN ACCOUNT TYPES"; 
                data = coaMain; 
            } else if(level === 'sub') { 
                reportTitle = "SUB ACCOUNT TYPES"; 
                const main = coaMain.find(m => m.code == selectedMainCode);
                data = main ? coaSub.filter(s => s.main_id == main.id) : coaSub; 
            } else { 
                reportTitle = "LIST OF ACCOUNTS"; 
                const sub = coaSub.find(s => s.code == selectedSubCode);
                data = sub ? coaList.filter(l => l.sub_id == sub.id) : coaList; 
            }

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

        // --- CUSTOMERS MODULE LOGIC ---
        function initCustomersView() {
            let retries = 0;
            const checkAndRender = setInterval(() => {
                const list = document.getElementById('customerTypeList');
                if (list) {
                    clearInterval(checkAndRender);
                    loadCustomerLookups();
                    renderCustomerTypeList();
                    
                    // Auto-select first type if available and fetch data
                    if (list.options.length > 0) {
                        list.selectedIndex = 0;
                        onCustomerTypeSelect(list.value);
                    } else {
                        resetCustomerTypeForm();
                        resetCustomerForm();
                    }
                } else if (++retries >= 20) clearInterval(checkAndRender);
            }, 100);
        }

        async function loadCustomerLookups() {
            try {
                const regRes = await fetch('api/maintain.php?action=get_regions');
                const regions = await regRes.json();
                const regSelect = document.getElementById('custRegion');
                if(regSelect) {
                    regSelect.innerHTML = '<option value="">None</option>' + 
                        regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
                }

                const secRes = await fetch('api/maintain.php?action=get_sectors');
                const sectors = await secRes.json();
                const secSelect = document.getElementById('custSector');
                if(secSelect) {
                    secSelect.innerHTML = '<option value="">None</option>' + 
                        sectors.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                }
                
                // Load Managers (Users)
                const manRes = await fetch('api/admin.php?action=get_users');
                const users = await manRes.json();
                const manSelect = document.getElementById('custAccManager');
                if(manSelect) {
                    manSelect.innerHTML = '<option value="">None</option>' + 
                        users.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
                }
            } catch(e) { console.error("Lookup load failed", e); }
        }

        async function loadSubRegions(regionId) {
            if(!regionId) {
                document.getElementById('custSubRegion').innerHTML = '<option value="">None</option>';
                return;
            }
            try {
                const res = await fetch(`api/maintain.php?action=get_sub_regions&region_id=${regionId}`);
                const subs = await res.json();
                document.getElementById('custSubRegion').innerHTML = '<option value="">None</option>' + 
                    subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            } catch(e) {}
        }

        function renderCustomerTypeList() {
            const list = document.getElementById('customerTypeList');
            if(!list) return;
            // Filter COA Sub Accounts that belong to "Customers" (typically a main account)
            // For now, let's look for a main account named "Customers" or "Sundry Debtors"
            const custMain = coaMain.find(m => m.name.toLowerCase().includes('customer') || m.name.toLowerCase().includes('debtor'));
            if(!custMain) {
                list.innerHTML = '<option disabled>No Customer category found in COA</option>';
                return;
            }
            const filtered = coaSub.filter(s => s.main_id == custMain.id);
            list.innerHTML = filtered.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
        }

        function onCustomerTypeSelect(code) {
            selectedCustTypeCode = code;
            const sub = coaSub.find(s => s.code == code);
            if(sub) {
                document.getElementById('custSubTypeCode').value = sub.code;
                document.getElementById('custTypeName').value = sub.name;
                document.getElementById('custSubTypeCode').disabled = false;
                document.getElementById('custTypeName').disabled = false;
            }
            fetchCustomersDetailed(code);
        }

        async function fetchCustomersDetailed(subCode) {
            const sub = coaSub.find(s => s.code == subCode);
            if(!sub) return;
            try {
                const res = await fetch(`api/maintain.php?action=get_customers&sub_id=${sub.id}`);
                customerData = await res.json();
                renderCustomerList();
                resetCustomerForm();
            } catch(e) {}
        }

        function renderCustomerList() {
            const list = document.getElementById('customerList');
            if(!list) return;
            const sub = coaSub.find(s => s.code == selectedCustTypeCode);
            if(!sub) { list.innerHTML = ''; return; }
            const filtered = coaList.filter(l => l.sub_id == sub.id);
            list.innerHTML = filtered.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
        }

        async function onCustomerSelect(code) {
            selectedCustAccountCode = code;
            const cust = customerData.find(c => c.code == code);
            if(cust) {
                document.getElementById('custAccountCode').value = cust.code;
                document.getElementById('custAccountName').value = cust.name;
                document.getElementById('custContactPerson').value = cust.contact_person || '';
                document.getElementById('custAddress').value = cust.address || '';
                document.getElementById('custRegion').value = cust.region_id || '';
                await loadSubRegions(cust.region_id);
                document.getElementById('custSubRegion').value = cust.sub_region_id || '';
                document.getElementById('custTelephone').value = cust.telephone || '';
                document.getElementById('custMobile').value = cust.mobile || '';
                document.getElementById('custFax').value = cust.fax || '';
                document.getElementById('custWebsite').value = cust.website || '';
                document.getElementById('custEmail').value = cust.email || '';
                document.getElementById('custStReg').value = cust.st_reg_no || '';
                document.getElementById('custNtn').value = cust.ntn_cnic || '';
                document.getElementById('custSector').value = cust.business_sector_id || '';
                document.getElementById('custAccManager').value = cust.acc_manager_id || '';
                document.getElementById('custCreditLimit').value = cust.credit_limit || 0;
                document.getElementById('custCreditTerms').value = cust.credit_terms || 'CASH';
                document.getElementById('custRemarks').value = cust.remarks || '';
                
                // Enable fields
                enableCustomerFields(true);
            }
        }

        function enableCustomerFields(enabled) {
            const fields = [
                'custAccountCode', 'custAccountName', 'custContactPerson', 'custAddress',
                'custRegion', 'custSubRegion', 'custTelephone', 'custMobile', 'custFax',
                'custWebsite', 'custEmail', 'custStReg', 'custNtn', 'custSector',
                'custAccManager', 'custCreditLimit', 'custCreditTerms', 'custRemarks'
            ];
            fields.forEach(f => {
                const el = document.getElementById(f);
                if(el) el.disabled = !enabled;
            });
        }

        async function saveCustomerType() {
            // Mirrors saveCOASub but uses CUSTOMERS logic
            const custMain = coaMain.find(m => m.name.toLowerCase().includes('customer') || m.name.toLowerCase().includes('debtor'));
            if(!custMain) return alert("Main Customer category not found!");

            const name = document.getElementById('custTypeName').value.trim();
            const code = document.getElementById('custSubTypeCode').value.trim();
            if(!name || !code) return alert("Code and Name are required!");

            const payload = { main_id: custMain.id, code, name };
            const existing = coaSub.find(s => s.code == (selectedCustTypeCode || code));
            if(existing) payload.id = existing.id;

            try {
                const res = await fetch(`api/maintain.php?action=save_coa_sub`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    const data = await res.json();
                    alert("Customer Type saved!");
                    // Refresh local coaSub (usually handled by global sync, but let's update simple)
                    if(existing) existing.name = name;
                    else coaSub.push({ id: data.id, main_id: custMain.id, code, name });
                    renderCustomerTypeList();
                    resetCustomerTypeForm();
                }
            } catch(e) { alert("Save failed"); }
        }

        async function saveCustomer() {
            if(!selectedCustTypeCode) return alert("Select a Customer Type first!");
            const name = document.getElementById('custAccountName').value.trim();
            const code = document.getElementById('custAccountCode').value.trim();
            if(!name || !code) return alert("Account Code and Name are required!");

            const sub = coaSub.find(s => s.code == selectedCustTypeCode);
            const payload = {
                sub_id: sub.id,
                code: code,
                name: name,
                contact_person: document.getElementById('custContactPerson').value,
                address: document.getElementById('custAddress').value,
                region_id: document.getElementById('custRegion').value || null,
                sub_region_id: document.getElementById('custSubRegion').value || null,
                telephone: document.getElementById('custTelephone').value,
                mobile: document.getElementById('custMobile').value,
                fax: document.getElementById('custFax').value,
                website: document.getElementById('custWebsite').value,
                email: document.getElementById('custEmail').value,
                st_reg_no: document.getElementById('custStReg').value,
                ntn_cnic: document.getElementById('custNtn').value,
                business_sector_id: document.getElementById('custSector').value || null,
                acc_manager_id: document.getElementById('custAccManager').value || null,
                credit_limit: document.getElementById('custCreditLimit').value,
                credit_terms: document.getElementById('custCreditTerms').value,
                remarks: document.getElementById('custRemarks').value
            };

            const existing = customerData.find(c => c.code == (selectedCustAccountCode || code));
            if(existing) payload.id = existing.id; // coa_list_id handled by backend action

            try {
                const res = await fetch(`api/maintain.php?action=save_customer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    const resData = await res.json();
                    alert("Customer profile saved!");
                    const sub = coaSub.find(s => s.code == selectedCustTypeCode);
                    const idx = coaList.findIndex(l => l.id == resData.id);
                    if(idx > -1) {
                        coaList[idx] = { ...coaList[idx], code, name };
                    } else {
                        coaList.push({ id: resData.id, sub_id: sub.id, code, name });
                    }
                    fetchCustomersDetailed(selectedCustTypeCode);
                }
            } catch(e) { alert("Save failed"); }
        }

        async function deleteCustomerType() {
            if (!selectedCustTypeCode) return alert("Select a Customer Type to delete first.");
            
            const sub = coaSub.find(s => s.code == selectedCustTypeCode);
            if(!sub) return;

            if(confirm(`Are you sure you want to delete the Customer Type "${sub.name}"? This will also remove it from Chart of Accounts.`)) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_coa_sub&id=${sub.id}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Customer Type deleted.");
                        // Refresh coaSub locally or re-sync
                        coaSub = coaSub.filter(s => s.id != sub.id);
                        renderCustomerTypeList();
                        resetCustomerTypeForm();
                    }
                } catch(e) { alert("Delete failed"); }
            }
        }

        async function deleteCustomer() {
            if (!selectedCustAccountCode) return alert("Select a Customer Profile to delete first.");
            
            const cust = customerData.find(c => c.code == selectedCustAccountCode);
            if(!cust) return;

            if(confirm(`Are you sure you want to delete the profile for "${cust.name}"?`)) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_coa_list&id=${cust.id}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Customer Profile deleted.");
                        fetchCustomersDetailed(selectedCustTypeCode);
                    }
                } catch(e) { alert("Delete failed"); }
            }
        }

        function resetCustomerTypeForm(generate = false) {
            document.getElementById('custSubTypeCode').value = '';
            document.getElementById('custTypeName').value = '';
            document.getElementById('customerTypeList').value = '';
            selectedCustTypeCode = null;
            
            if(generate) {
                const custMain = coaMain.find(m => m.name.toLowerCase().includes('customer') || m.name.toLowerCase().includes('debtor'));
                if(custMain) {
                    const siblings = coaSub.filter(s => s.main_id == custMain.id);
                    let nextNum = 1;
                    if(siblings.length > 0) {
                        const lastCodes = siblings.map(s => parseInt(s.code.toString().substring(custMain.code.toString().length)) || 0);
                        nextNum = Math.max(...lastCodes) + 1;
                    }
                    document.getElementById('custSubTypeCode').value = custMain.code.toString() + nextNum.toString().padStart(2, '0');
                }
                document.getElementById('custSubTypeCode').disabled = false;
                document.getElementById('custTypeName').disabled = false;
            } else {
                document.getElementById('custSubTypeCode').disabled = true;
                document.getElementById('custTypeName').disabled = true;
            }
            renderCustomerList();
            resetCustomerForm();
        }

        function resetCustomerForm(generate = false) {
            enableCustomerFields(false);
            const fields = [
                'custAccountCode', 'custAccountName', 'custContactPerson', 'custAddress',
                'custRegion', 'custSubRegion', 'custTelephone', 'custMobile', 'custFax',
                'custWebsite', 'custEmail', 'custStReg', 'custNtn', 'custSector',
                'custAccManager', 'custCreditLimit', 'custCreditTerms', 'custRemarks'
            ];
            fields.forEach(f => {
                const el = document.getElementById(f);
                if(el) {
                    if(f === 'custCreditLimit') el.value = 0;
                    else if(f === 'custCreditTerms') el.value = 'CASH';
                    else el.value = '';
                }
            });
            document.getElementById('customerList').value = '';
            selectedCustAccountCode = null;

            if(generate && selectedCustTypeCode) {
                const sub = coaSub.find(s => s.code == selectedCustTypeCode);
                const siblings = customerData;
                let nextNum = 1;
                if(siblings.length > 0) {
                    const lastCodes = siblings.map(l => parseInt(l.code.toString().substring(selectedCustTypeCode.toString().length)) || 0);
                    nextNum = Math.max(...lastCodes) + 1;
                }
                document.getElementById('custAccountCode').value = selectedCustTypeCode.toString() + nextNum.toString().padStart(3, '0');
                enableCustomerFields(true);
            }
        }

        function findCustomer() {
            if (!selectedCustTypeCode) return alert("Please select a Customer Type first.");
            const query = prompt("Enter Customer Name or Code to search:");
            if (!query) return;

            const list = document.getElementById('customerList');
            const filtered = customerData.filter(c => 
                c.name.toLowerCase().includes(query.toLowerCase()) || 
                c.code.toString().includes(query)
            );

            if (filtered.length > 0) {
                list.innerHTML = filtered.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
                if (filtered.length === 1) onCustomerSelect(filtered[0].code);
            } else {
                alert("No customers found matching '" + query + "'");
                renderCustomerList();
            }
        }

        function printCustomers(level) {
            // level should be 'sub' for categories or 'list' for individual profiles
            window.printCOA(level === 'type' ? 'sub' : 'list');
        }

        // --- VENDORS MODULE LOGIC ---
        function initVendorsView() {
            console.log("SoftifyX Diagnostic: Initializing Vendors View...");
            let retries = 0;
            const checkAndRender = setInterval(() => {
                const list = document.getElementById('vendorTypeList');
                if (list) {
                    clearInterval(checkAndRender);
                    renderVendorTypeList();
                    
                    // AUTO-SELECT FIRST ITEM IF AVAILABLE
                    if (list.options.length > 0) {
                        list.selectedIndex = 0;
                        onVendorTypeSelect(list.value);
                    } else {
                        console.warn("SoftifyX Diagnostic: No vendor types found during initialization.");
                        resetVendorTypeForm();
                        resetVendorForm();
                    }
                } else if (++retries >= 30) {
                    console.error("SoftifyX Diagnostic: Vendor module container not found after 3 seconds.");
                    clearInterval(checkAndRender);
                }
            }, 100);
        }

        function renderVendorTypeList() {
            const list = document.getElementById('vendorTypeList');
            if(!list) return;
            // Improved search to include 'payable'
            const vendMain = coaMain.find(m => {
                const n = m.name.toLowerCase();
                return n.includes('vendor') || n.includes('supplier') || n.includes('creditor') || n.includes('payable');
            });
            
            console.log("SoftifyX Diagnostic: Found vendMain:", vendMain);
            
            if(!vendMain) {
                console.error("SoftifyX Diagnostic: COA main category for Vendors/Payables not found.");
                list.innerHTML = '<option disabled>No Vendor category found in COA</option>';
                return;
            }
            const filtered = coaSub.filter(s => s.main_id == vendMain.id);
            console.log("SoftifyX Diagnostic: Found sub-accounts:", filtered.length);
            list.innerHTML = filtered.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
        }

        function onVendorTypeSelect(code) {
            selectedVendTypeCode = code;
            const sub = coaSub.find(s => s.code == code);
            if(sub) {
                document.getElementById('vendSubTypeCode').value = sub.code;
                document.getElementById('vendSubName').value = sub.name;
                enableVendorTypeFields(false);
            }
            fetchVendorsDetailed(code);
        }

        function enableVendorTypeFields(enabled) {
            ['vendSubTypeCode', 'vendSubName'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.disabled = !enabled;
            });
        }

        async function fetchVendorsDetailed(subCode) {
            const sub = coaSub.find(s => s.code == subCode);
            if(!sub) return;
            try {
                const res = await fetch(`api/maintain.php?action=get_vendors&sub_id=${sub.id}`);
                vendorData = await res.json();
                renderVendorList();
                resetVendorForm();
            } catch(e) {}
        }

        function renderVendorList() {
            const list = document.getElementById('vendorList');
            if(!list) return;
            
            console.log("SoftifyX Diagnostic: Rendering Vendor List for Type:", selectedVendTypeCode);
            
            const sub = coaSub.find(s => s.code == selectedVendTypeCode);
            if(!sub) { 
                console.warn("SoftifyX Diagnostic: Selected sub-category not found in coaSub.");
                list.innerHTML = ''; 
                return; 
            }
            
            const filtered = coaList.filter(l => l.sub_id == sub.id);
            console.log(`SoftifyX Diagnostic: Found ${filtered.length} matching accounts in coaList for sub_id ${sub.id}`);
            
            list.innerHTML = filtered.map(v => `<option value="${v.code}">${v.name}</option>`).join('');
        }

        async function onVendorSelect(code) {
            selectedVendAccountCode = code;
            const vend = vendorData.find(v => v.code == code);
            if(vend) {
                document.getElementById('vendAccountCode').value = vend.code;
                document.getElementById('vendAccountName').value = vend.name;
                document.getElementById('vendContactPerson').value = vend.contact_person || '';
                document.getElementById('vendAddress').value = vend.address || '';
                document.getElementById('vendTelephone').value = vend.telephone || '';
                document.getElementById('vendMobile').value = vend.mobile || '';
                document.getElementById('vendFax').value = vend.fax || '';
                document.getElementById('vendWebsite').value = vend.website || '';
                document.getElementById('vendEmail').value = vend.email || '';
                document.getElementById('vendStReg').value = vend.st_reg_no || '';
                document.getElementById('vendNtn').value = vend.ntn_cnic || '';
                document.getElementById('vendCreditTerms').value = vend.credit_terms || 'CASH';
                document.getElementById('vendRemarks').value = vend.remarks || '';
                enableVendorFields(true);
            }
        }

        function enableVendorFields(enabled) {
            const fields = [
                'vendAccountCode', 'vendAccountName', 'vendContactPerson', 'vendAddress',
                'vendTelephone', 'vendMobile', 'vendFax', 'vendWebsite', 'vendEmail', 
                'vendStReg', 'vendNtn', 'vendCreditTerms', 'vendRemarks'
            ];
            fields.forEach(f => {
                const el = document.getElementById(f);
                if(el) el.disabled = !enabled;
            });
        }

        async function saveVendorType() {
            const vendMain = coaMain.find(m => m.name.toLowerCase().includes('vendor') || m.name.toLowerCase().includes('supplier') || m.name.toLowerCase().includes('creditor'));
            if(!vendMain) return;

            const name = document.getElementById('vendSubName').value.trim();
            const code = document.getElementById('vendSubTypeCode').value.trim();
            if(!name || !code) return;

            const payload = { main_id: vendMain.id, code, name };
            const existing = coaSub.find(s => s.code == (selectedVendTypeCode || code));
            if(existing) payload.id = existing.id;

            try {
                const res = await fetch(`api/maintain.php?action=save_coa_sub`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    const data = await res.json();
                    if(!existing) coaSub.push({ id: data.id, main_id: vendMain.id, code, name });
                    else {
                        existing.code = code;
                        existing.name = name;
                    }
                    renderVendorTypeList();
                    resetVendorTypeForm();
                }
            } catch(e) {}
        }

        async function saveVendor() {
            if(!selectedVendTypeCode) return alert("Select a Vendor Type first!");
            const name = document.getElementById('vendAccountName').value.trim();
            const code = document.getElementById('vendAccountCode').value.trim();
            if(!name || !code) return alert("Account Code and Name are required!");

            const sub = coaSub.find(s => s.code == selectedVendTypeCode);
            const payload = {
                sub_id: sub.id,
                code: code,
                name: name,
                contact_person: document.getElementById('vendContactPerson').value,
                address: document.getElementById('vendAddress').value,
                telephone: document.getElementById('vendTelephone').value,
                mobile: document.getElementById('vendMobile').value,
                fax: document.getElementById('vendFax').value,
                website: document.getElementById('vendWebsite').value,
                email: document.getElementById('vendEmail').value,
                st_reg_no: document.getElementById('vendStReg').value,
                ntn_cnic: document.getElementById('vendNtn').value,
                credit_terms: document.getElementById('vendCreditTerms').value,
                remarks: document.getElementById('vendRemarks').value
            };

            const existing = vendorData.find(v => v.code == (selectedVendAccountCode || code));
            if(existing) payload.id = existing.id;

            try {
                const res = await fetch(`api/maintain.php?action=save_vendor`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    const resData = await res.json();
                    alert("Vendor profile saved!");
                    const sub = coaSub.find(s => s.code == selectedVendTypeCode);
                    const idx = coaList.findIndex(l => l.id == resData.id);
                    if(idx > -1) {
                        coaList[idx] = { ...coaList[idx], code, name };
                    } else {
                        coaList.push({ id: resData.id, sub_id: sub.id, code, name });
                    }
                    fetchVendorsDetailed(selectedVendTypeCode);
                }
            } catch(e) { alert("Save failed"); }
        }

        async function deleteVendorType() {
            if (!selectedVendTypeCode) return alert("Select a Vendor Type to delete first.");
            
            // CONSTRAINT: Check if category has vendors before deleting
            if (vendorData && vendorData.length > 0) {
                return alert("Cannot delete this Category because it still contains Vendor records. Delete all vendors first!");
            }

            const sub = coaSub.find(s => s.code == selectedVendTypeCode);
            if(!sub) return;
            if(confirm(`Are you sure you want to delete the Vendor Type "${sub.name}"?`)) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_coa_sub&id=${sub.id}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Vendor Type deleted.");
                        coaSub = coaSub.filter(s => s.id != sub.id);
                        renderVendorTypeList();
                        resetVendorTypeForm();
                    }
                } catch(e) { alert("Delete failed"); }
            }
        }

        async function deleteVendor() {
            if (!selectedVendAccountCode) return alert("Select a Vendor Profile to delete first.");
            const vend = vendorData.find(v => v.code == selectedVendAccountCode);
            if(!vend) return;
            if(confirm(`Are you sure you want to delete the profile for "${vend.name}"?`)) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_vendor&id=${vend.id}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Vendor Profile deleted.");
                        fetchVendorsDetailed(selectedVendTypeCode);
                    }
                } catch(e) { alert("Delete failed"); }
            }
        }

        function resetVendorTypeForm(generate = false) {
            selectedVendTypeCode = null;
            enableVendorTypeFields(generate);
            if(generate) {
                const vendMain = coaMain.find(m => m.name.toLowerCase().includes('vendor') || m.name.toLowerCase().includes('supplier') || m.name.toLowerCase().includes('creditor'));
                if(vendMain) {
                    const siblings = coaSub.filter(s => s.main_id == vendMain.id);
                    let nextNum = 1;
                    if(siblings.length > 0) {
                        const lastCodes = siblings.map(s => parseInt(s.code.toString().substring(vendMain.code.toString().length)) || 0);
                        nextNum = Math.max(...lastCodes) + 1;
                    }
                    document.getElementById('vendSubTypeCode').value = vendMain.code.toString() + nextNum.toString().padStart(2, '0');
                }
                document.getElementById('vendSubName').value = '';
                document.getElementById('vendSubName').focus();
            } else {
                document.getElementById('vendSubTypeCode').value = '';
                document.getElementById('vendSubName').value = '';
            }
            document.getElementById('vendorTypeList').value = '';
            renderVendorList();
            resetVendorForm();
        }

        function resetVendorForm(generate = false) {
            enableVendorFields(generate);
            const fields = [
                'vendAccountCode', 'vendAccountName', 'vendContactPerson', 'vendAddress',
                'vendTelephone', 'vendMobile', 'vendFax', 'vendWebsite', 'vendEmail', 
                'vendStReg', 'vendNtn', 'vendCreditTerms', 'vendRemarks'
            ];
            fields.forEach(f => {
                const el = document.getElementById(f);
                if(el) {
                    if(f === 'vendCreditTerms') el.value = 'CASH';
                    else el.value = '';
                }
            });
            document.getElementById('vendorList').value = '';
            selectedVendAccountCode = null;

            if(generate) {
                if(!selectedVendTypeCode) {
                    alert("Select a Vendor Type first!");
                    return;
                }
                const sub = coaSub.find(s => s.code == selectedVendTypeCode);
                const siblings = vendorData;
                let nextNum = 1;
                if(siblings.length > 0) {
                    const lastCodes = siblings.map(l => parseInt(l.code.toString().substring(selectedVendTypeCode.toString().length)) || 0);
                    nextNum = Math.max(...lastCodes) + 1;
                }
                document.getElementById('vendAccountCode').value = selectedVendTypeCode.toString() + nextNum.toString().padStart(3, '0');
                document.getElementById('vendAccountName').focus();
            }
        }

        function findVendor() {
            const term = prompt("Enter Account Name or Code to find:");
            if (!term) return;
            const res = vendorData.find(v => v.name.toLowerCase().includes(term.toLowerCase()) || v.code.includes(term));
            if (res) {
                document.getElementById('vendorList').value = res.code;
                onVendorSelect(res.code);
            } else {
                alert("Vendor not found in current category.");
            }
        }

        function printVendors(type) {
            window.printCOA(type === 'type' ? 'sub' : 'list');
        }

        // Global Key Listeners for Vendors
        document.addEventListener('keydown', (e) => {
            const container = document.getElementById('vendorsContainer');
            if (!container) return; // Only active when module is open
            
            if (e.ctrlKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                resetVendorForm(true);
            }
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                saveVendor();
            }
            if (e.key === 'Escape') {
                resetVendorForm();
            }
        });

        // EXPOSE VENDORS TO GLOBAL WINDOW SCOPE (Fixed Scope Issues)
        window.initVendorsView = initVendorsView;
        window.onVendorTypeSelect = onVendorTypeSelect;
        window.onVendorSelect = onVendorSelect;
        window.saveVendorType = saveVendorType;
        window.saveVendor = saveVendor;
        window.deleteVendorType = deleteVendorType;
        window.deleteVendor = deleteVendor;
        window.resetVendorTypeForm = resetVendorTypeForm;
        window.resetVendorForm = resetVendorForm;
        window.findVendor = findVendor;
        window.printVendors = printVendors;

        // --- BANK ACCOUNTS MODULE LOGIC ---
        let bankData = [];
        let selectedBankTypeCode = null;
        let selectedBankAccountCode = null;

        function initBankAccountsView() {
            console.log("SoftifyX Diagnostic: Initializing Bank Accounts View...");
            let retries = 0;
            const checkAndRender = setInterval(() => {
                const list = document.getElementById('bankTypeList');
                if (list) {
                    clearInterval(checkAndRender);
                    renderBankTypeList();
                    if (list.options.length > 0) {
                        list.selectedIndex = 0;
                        onBankTypeSelect(list.value);
                    } else {
                        console.warn("SoftifyX Diagnostic: No bank types found during initialization.");
                        resetBankTypeForm();
                        resetBankForm();
                    }
                } else if (++retries >= 30) {
                    console.error("SoftifyX Diagnostic: Bank module container not found.");
                    clearInterval(checkAndRender);
                }
            }, 100);
        }

        function renderBankTypeList() {
            const list = document.getElementById('bankTypeList');
            if(!list) return;
            
            console.log("SoftifyX Diagnostic: Checking coaMain for Bank/Cash...");
            
            // Filter ONLY bank categories, explicitly excluding Cash
            const matchingMain = coaMain.filter(m => {
                const n = m.name.toLowerCase();
                return n.includes('bank') && !n.includes('cash');
            });
            
            console.log("SoftifyX Diagnostic: Found matching main categories:", matchingMain.length);

            if(matchingMain.length === 0) {
                console.error("SoftifyX Diagnostic: No Bank/Cash category found in coaMain.");
                list.innerHTML = '<option disabled>No Bank category found in COA</option>';
                return;
            }

            const mainIds = matchingMain.map(m => m.id);
            const filtered = coaSub.filter(s => mainIds.includes(s.main_id));
            
            console.log("SoftifyX Diagnostic: Found sub-accounts:", filtered.length);
            list.innerHTML = filtered.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
        }

        function onBankTypeSelect(code) {
            selectedBankTypeCode = code;
            const sub = coaSub.find(s => s.code == code);
            if(sub) {
                document.getElementById('bankSubTypeCode').value = sub.code;
                document.getElementById('bankSubName').value = sub.name;
                enableBankTypeFields(false);
            }
            fetchBanksDetailed(code);
        }

        function enableBankTypeFields(enabled) {
            ['bankSubTypeCode', 'bankSubName'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.disabled = !enabled;
            });
        }

        async function fetchBanksDetailed(subCode) {
            const sub = coaSub.find(s => s.code == subCode);
            if(!sub) return;
            try {
                const res = await fetch(`api/maintain.php?action=get_banks&sub_id=${sub.id}`);
                bankData = await res.json();
                renderBankList();
                resetBankForm();
            } catch(e) {}
        }

        function renderBankList() {
            const list = document.getElementById('bankList');
            if(!list) return;
            const sub = coaSub.find(s => s.code == selectedBankTypeCode);
            if(!sub) { list.innerHTML = ''; return; }
            const filteredList = coaList.filter(l => l.sub_id == sub.id);
            list.innerHTML = filteredList.map(b => `<option value="${b.code}">${b.name}</option>`).join('');
        }

        async function onBankSelect(code) {
            selectedBankAccountCode = code;
            const bank = bankData.find(b => b.code == code);
            if(bank) {
                document.getElementById('bankAccountCode').value = bank.code;
                document.getElementById('bankAccountName').value = bank.name;
                document.getElementById('bankName').value = bank.bank_name || '';
                document.getElementById('bankBranch').value = bank.branch || '';
                document.getElementById('bankAccountTitle').value = bank.account_title || '';
                document.getElementById('bankAccountNo').value = bank.account_no || '';
                document.getElementById('bankContactPerson').value = bank.contact_person || '';
                document.getElementById('bankAddress').value = bank.address || '';
                document.getElementById('bankTelephone').value = bank.telephone || '';
                document.getElementById('bankMobile').value = bank.mobile || '';
                document.getElementById('bankFax').value = bank.fax || '';
                document.getElementById('bankEmail').value = bank.email || '';
                document.getElementById('bankWebsite').value = bank.website || '';
                document.getElementById('bankRemarks').value = bank.remarks || '';
                enableBankFields(true);
            } else {
                // If only in COA but no bank profile yet
                const coaEntry = coaList.find(c => c.code == code);
                if(coaEntry) {
                    document.getElementById('bankAccountCode').value = coaEntry.code;
                    document.getElementById('bankAccountName').value = coaEntry.name;
                    resetBankFields();
                    enableBankFields(true);
                }
            }
        }

        function enableBankFields(enabled) {
            const fields = [
                'bankAccountCode', 'bankAccountName', 'bankName', 'bankBranch', 
                'bankAccountTitle', 'bankAccountNo', 'bankContactPerson', 'bankAddress',
                'bankTelephone', 'bankMobile', 'bankFax', 'bankEmail', 'bankWebsite', 'bankRemarks'
            ];
            fields.forEach(f => {
                const el = document.getElementById(f);
                if(el) el.disabled = !enabled;
            });
        }

        function resetBankFields() {
            const fields = [
                'bankName', 'bankBranch', 'bankAccountTitle', 'bankAccountNo', 
                'bankContactPerson', 'bankAddress', 'bankTelephone', 'bankMobile', 
                'bankFax', 'bankEmail', 'bankWebsite', 'bankRemarks'
            ];
            fields.forEach(f => {
                const el = document.getElementById(f);
                if(el) el.value = '';
            });
        }

        async function saveBankType() {
            const bankMain = coaMain.find(m => {
                const n = m.name.toLowerCase();
                return n.includes('bank') || n.includes('cash') || n.includes('liquid');
            });
            if(!bankMain) return;
            const name = document.getElementById('bankSubName').value.trim();
            const code = document.getElementById('bankSubTypeCode').value.trim();
            if(!name || !code) return;
            const payload = { main_id: bankMain.id, code, name };
            const existing = coaSub.find(s => s.code == (selectedBankTypeCode || code));
            if(existing) payload.id = existing.id;
            try {
                const res = await fetch(`api/maintain.php?action=save_coa_sub`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    const data = await res.json();
                    if(!existing) coaSub.push({ id: data.id, main_id: bankMain.id, code, name });
                    else { existing.code = code; existing.name = name; }
                    renderBankTypeList();
                    resetBankTypeForm();
                }
            } catch(e) {}
        }

        async function saveBank() {
            if(!selectedBankTypeCode) return alert("Select a Bank Type first!");
            const name = document.getElementById('bankAccountName').value.trim();
            const code = document.getElementById('bankAccountCode').value.trim();
            if(!name || !code) return alert("Account Code and Name are required!");
            const sub = coaSub.find(s => s.code == selectedBankTypeCode);
            const payload = {
                sub_id: sub.id,
                code: code,
                name: name,
                bank_name: document.getElementById('bankName').value,
                branch: document.getElementById('bankBranch').value,
                account_title: document.getElementById('bankAccountTitle').value,
                account_no: document.getElementById('bankAccountNo').value,
                contact_person: document.getElementById('bankContactPerson').value,
                address: document.getElementById('bankAddress').value,
                telephone: document.getElementById('bankTelephone').value,
                mobile: document.getElementById('bankMobile').value,
                fax: document.getElementById('bankFax').value,
                email: document.getElementById('bankEmail').value,
                website: document.getElementById('bankWebsite').value,
                remarks: document.getElementById('bankRemarks').value
            };
            const existing = coaList.find(c => c.code == (selectedBankAccountCode || code));
            if(existing) payload.id = existing.id;
            try {
                const res = await fetch(`api/maintain.php?action=save_bank`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    const resData = await res.json();
                    alert("Bank Account saved!");
                    const idx = coaList.findIndex(l => l.id == resData.id);
                    if(idx > -1) coaList[idx] = { ...coaList[idx], code, name };
                    else coaList.push({ id: resData.id, sub_id: sub.id, code, name });
                    fetchBanksDetailed(selectedBankTypeCode);
                }
            } catch(e) { alert("Save failed"); }
        }

        async function deleteBankType() {
            if (!selectedBankTypeCode) return alert("Select a Bank Type first.");
            const sub = coaSub.find(s => s.code == selectedBankTypeCode);
            if(!sub) return;
            if(confirm(`Delete Bank Type "${sub.name}"?`)) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_coa_sub&id=${sub.id}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Deleted.");
                        coaSub = coaSub.filter(s => s.id != sub.id);
                        renderBankTypeList();
                        resetBankTypeForm();
                    }
                } catch(e) {}
            }
        }

        async function deleteBank() {
            if (!selectedBankAccountCode) return alert("Select a Bank Account first.");
            const bank = coaList.find(c => c.code == selectedBankAccountCode);
            if(!bank) return;
            if(confirm(`Delete Bank Account "${bank.name}"?`)) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_bank&id=${bank.id}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Deleted.");
                        coaList = coaList.filter(l => l.id != bank.id);
                        fetchBanksDetailed(selectedBankTypeCode);
                    }
                } catch(e) {}
            }
        }

        function resetBankTypeForm(generate = false) {
            selectedBankTypeCode = null;
            enableBankTypeFields(generate);
            if(generate) {
                const bankMain = coaMain.find(m => {
                    const n = m.name.toLowerCase();
                    return n.includes('bank') || n.includes('cash') || n.includes('liquid');
                });
                if(bankMain) {
                    const siblings = coaSub.filter(s => s.main_id == bankMain.id);
                    let nextNum = 1;
                    if(siblings.length > 0) {
                        const lastCodes = siblings.map(s => parseInt(s.code.toString().substring(bankMain.code.toString().length)) || 0);
                        nextNum = Math.max(...lastCodes) + 1;
                    }
                    document.getElementById('bankSubTypeCode').value = bankMain.code.toString() + nextNum.toString().padStart(2, '0');
                }
                document.getElementById('bankSubName').value = '';
                document.getElementById('bankSubName').focus();
            } else {
                document.getElementById('bankSubTypeCode').value = '';
                document.getElementById('bankSubName').value = '';
            }
            document.getElementById('bankTypeList').value = '';
            renderBankList();
            resetBankForm();
        }

        function resetBankForm(generate = false) {
            enableBankFields(generate);
            resetBankFields();
            document.getElementById('bankAccountCode').value = '';
            document.getElementById('bankAccountName').value = '';
            document.getElementById('bankList').value = '';
            selectedBankAccountCode = null;
            if(generate) {
                if(!selectedBankTypeCode) return alert("Select a Bank Type first!");
                const siblings = coaList.filter(l => l.sub_id == (coaSub.find(s => s.code == selectedBankTypeCode)?.id));
                let nextNum = 1;
                if(siblings.length > 0) {
                    const lastCodes = siblings.map(l => parseInt(l.code.toString().substring(selectedBankTypeCode.toString().length)) || 0);
                    nextNum = Math.max(...lastCodes) + 1;
                }
                document.getElementById('bankAccountCode').value = selectedBankTypeCode.toString() + nextNum.toString().padStart(3, '0');
                document.getElementById('bankAccountName').focus();
            }
        }

        function findBank() {
            const term = prompt("Enter Bank Name or Code:");
            if (!term) return;
            const res = coaList.filter(l => l.sub_id == (coaSub.find(s => s.code == selectedBankTypeCode)?.id)).find(c => c.name.toLowerCase().includes(term.toLowerCase()) || c.code.includes(term));
            if (res) {
                document.getElementById('bankList').value = res.code;
                onBankSelect(res.code);
            } else alert("Not found.");
        }

        function printBanks(type) { window.printCOA(type === 'type' ? 'sub' : 'list'); }

        // Lookup Management Stubs (Can be expanded into mini-popups)
        // Regions Module Logic
        function initRegionsView() {
            let retries = 0;
            const checkAndRender = setInterval(() => {
                const list = document.getElementById('mainRegionList');
                if (list) {
                    clearInterval(checkAndRender);
                    fetchMainRegions();
                    resetMainRegionForm();
                    resetSubRegionForm();
                } else if (++retries >= 20) clearInterval(checkAndRender);
            }, 100);
        }

        async function fetchMainRegions() {
            try {
                const res = await fetch('api/maintain.php?action=get_regions');
                mainRegionData = await res.json();
                const list = document.getElementById('mainRegionList');
                if(list) list.innerHTML = mainRegionData.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
            } catch(e) {}
        }

        async function onMainRegionSelect(id) {
            selectedMainRegionId = id;
            const reg = mainRegionData.find(r => r.id == id);
            if(reg) {
                document.getElementById('mainRegionName').value = reg.name;
                document.getElementById('mainRegionName').disabled = false;
            }
            fetchSubRegions(id);
        }

        async function fetchSubRegions(regionId) {
            try {
                const res = await fetch(`api/maintain.php?action=get_sub_regions&region_id=${regionId}`);
                subRegionData = await res.json();
                const list = document.getElementById('subRegionList');
                if(list) list.innerHTML = subRegionData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                resetSubRegionForm();
            } catch(e) {}
        }

        function onSubRegionSelect(id) {
            selectedSubRegionId = id;
            const sub = subRegionData.find(s => s.id == id);
            if(sub) {
                document.getElementById('subRegionName').value = sub.name;
                document.getElementById('subRegionName').disabled = false;
            }
        }

        async function saveMainRegion() {
            const name = document.getElementById('mainRegionName').value.trim();
            if(!name) return alert("Region Name is required!");
            const payload = { name };
            if (selectedMainRegionId) payload.id = selectedMainRegionId;
            try {
                const res = await fetch('api/maintain.php?action=save_region', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    alert("Main Region saved!");
                    await fetchMainRegions();
                    resetMainRegionForm();
                    // Refresh parent if open
                    loadCustomerLookups();
                }
            } catch(e) {}
        }

        async function deleteMainRegion() {
            if(!selectedMainRegionId) return alert("Select a Region to delete first.");
            
            // Logic: Prevent deletion if sub-regions exist
            if (subRegionData && subRegionData.length > 0) {
                return alert("Please delete all sub-regions first before deleting the main region.");
            }

            if(confirm("Are you sure you want to delete this region? This action cannot be undone.")) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_region&id=${selectedMainRegionId}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Region deleted.");
                        await fetchMainRegions();
                        resetMainRegionForm();
                        loadCustomerLookups();
                    }
                } catch(e) {}
            }
        }

        async function saveSubRegion() {
            if(!selectedMainRegionId) return alert("Select a Main Region first!");
            const name = document.getElementById('subRegionName').value.trim();
            if(!name) return alert("Sub-Region Name is required!");
            const payload = { region_id: selectedMainRegionId, name };
            if (selectedSubRegionId) payload.id = selectedSubRegionId;
            try {
                const res = await fetch('api/maintain.php?action=save_sub_region', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    alert("Sub Region saved!");
                    await fetchSubRegions(selectedMainRegionId);
                    resetSubRegionForm();
                }
            } catch(e) {}
        }

        async function deleteSubRegion() {
            if(!selectedSubRegionId) return alert("Select a Sub Region to delete first.");
            if(confirm("Are you sure you want to delete this sub-region?")) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_sub_region&id=${selectedSubRegionId}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Sub Region deleted.");
                        await fetchSubRegions(selectedMainRegionId);
                    }
                } catch(e) {}
            }
        }

        function resetMainRegionForm(generate = false) {
            document.getElementById('mainRegionName').value = '';
            document.getElementById('mainRegionName').disabled = !generate;
            document.getElementById('mainRegionList').value = '';
            selectedMainRegionId = null;
            if(!generate) {
                const list = document.getElementById('subRegionList');
                if(list) list.innerHTML = '';
            }
        }

        function resetSubRegionForm(generate = false) {
            document.getElementById('subRegionName').value = '';
            document.getElementById('subRegionName').disabled = !generate;
            document.getElementById('subRegionList').value = '';
            selectedSubRegionId = null;
        }

        // Expose Region Functions
        window.initRegionsView = initRegionsView;
        window.onMainRegionSelect = onMainRegionSelect;
        window.onSubRegionSelect = onSubRegionSelect;
        window.saveMainRegion = saveMainRegion;
        window.deleteMainRegion = deleteMainRegion;
        window.resetMainRegionForm = resetMainRegionForm;
        window.saveSubRegion = saveSubRegion;
        window.deleteSubRegion = deleteSubRegion;
        window.resetSubRegionForm = resetSubRegionForm;

        function manageRegions() {
            window.openSecondaryModularPopup('Navigation/Maintain/customer_regions.html', 'fa-map-marker-alt', 'Manage Regions', initRegionsView, 'Customer Regions', true);
        }
        function manageSectors() {
            window.openSecondaryModularPopup('Navigation/Maintain/business_sectors.html', 'fa-briefcase', 'Manage Sectors', initSectorsView, 'Business Sectors', true);
        }
        function manageManagers() {
            window.openSecondaryModularPopup('Navigation/Administrator/user_rights.html', 'fa-users-cog', 'User Management', initUserRightsView, 'Account Managers', true);
        }

        // Sector Module Logic
        function initSectorsView() {
            let retries = 0;
            const checkAndRender = setInterval(() => {
                const list = document.getElementById('sectorList');
                if (list) {
                    clearInterval(checkAndRender);
                    fetchSectors();
                    resetSectorForm();
                } else if (++retries >= 20) clearInterval(checkAndRender);
            }, 100);
        }

        async function fetchSectors() {
            try {
                const res = await fetch('api/maintain.php?action=get_sectors');
                const sectors = await res.json();
                const list = document.getElementById('sectorList');
                if(list) list.innerHTML = sectors.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                window.currentSectors = sectors;
            } catch(e) {}
        }

        function onSectorSelect(id) {
            const sector = (window.currentSectors || []).find(s => s.id == id);
            if(sector) {
                document.getElementById('sectorName').value = sector.name;
                document.getElementById('sectorName').disabled = false;
                window.selectedSectorId = id;
            }
        }

        async function saveSector() {
            const name = document.getElementById('sectorName').value.trim();
            if(!name) return alert("Sector Name is required!");
            const payload = { name };
            if (window.selectedSectorId) payload.id = window.selectedSectorId;
            try {
                const res = await fetch('api/maintain.php?action=save_sector', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    alert("Business Sector saved!");
                    await fetchSectors();
                    resetSectorForm();
                    loadCustomerLookups();
                }
            } catch(e) {}
        }

        async function deleteSector() {
            if(!window.selectedSectorId) return alert("Select a Sector to delete first.");
            if(confirm("Are you sure you want to delete this sector?")) {
                try {
                    const res = await fetch(`api/maintain.php?action=delete_sector&id=${window.selectedSectorId}`, { method: 'POST' });
                    if(res.ok) {
                        alert("Sector deleted.");
                        await fetchSectors();
                        resetSectorForm();
                        loadCustomerLookups();
                    }
                } catch(e) {}
            }
        }

        function resetSectorForm(generate = false) {
            document.getElementById('sectorName').value = '';
            document.getElementById('sectorName').disabled = !generate;
            document.getElementById('sectorList').value = '';
            window.selectedSectorId = null;
        }

        // Expose Sector Functions
        window.initSectorsView = initSectorsView;
        window.onSectorSelect = onSectorSelect;
        window.saveSector = saveSector;
        window.deleteSector = deleteSector;
        window.resetSectorForm = resetSectorForm;

        window.initCustomersView = initCustomersView;
        window.onCustomerTypeSelect = onCustomerTypeSelect;
        window.onCustomerSelect = onCustomerSelect;
        window.saveCustomerType = saveCustomerType;
        window.deleteCustomerType = deleteCustomerType;
        window.saveCustomer = saveCustomer;
        window.deleteCustomer = deleteCustomer;
        window.resetCustomerTypeForm = resetCustomerTypeForm;
        window.resetCustomerForm = resetCustomerForm;
        window.loadSubRegions = loadSubRegions;
        window.findCustomer = findCustomer;
        window.printCustomers = printCustomers;

        window.initVendorsView = initVendorsView;
        window.onVendorTypeSelect = onVendorTypeSelect;
        window.onVendorSelect = onVendorSelect;
        window.saveVendorType = saveVendorType;
        window.deleteVendorType = deleteVendorType;
        window.saveVendor = saveVendor;
        window.deleteVendor = deleteVendor;
        window.resetVendorTypeForm = resetVendorTypeForm;
        window.resetVendorForm = resetVendorForm;
        window.manageRegions = manageRegions;
        window.manageSectors = manageSectors;
        window.manageManagers = manageManagers;
        window.openSecondaryModularPopup = openSecondaryModularPopup;
        window.closeSecondaryModal = closeSecondaryModal;


        window.initBankAccountsView = initBankAccountsView;
        window.onBankTypeSelect = onBankTypeSelect;
        window.onBankSelect = onBankSelect;
        window.saveBankType = saveBankType;
        window.saveBank = saveBank;
        window.deleteBankType = deleteBankType;
        window.deleteBank = deleteBank;
        window.resetBankTypeForm = resetBankTypeForm;
        window.resetBankForm = resetBankForm;
        window.findBank = findBank;
        window.printBanks = printBanks;

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
        
        function handleProfilePhotoClick() {
            const hasPhoto = !!userProfilePhoto;
            const html = `
                <div style="padding: 20px; text-align: center;">
                    <div style="margin-bottom: 20px;">
                        ${userProfilePhoto ? `<img src="${userProfilePhoto}" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #eee; object-fit: cover;">` : `<i class="fas fa-user-circle" style="font-size: 80px; color: #ddd;"></i>`}
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="document.getElementById('profilePhotoInput').click()">
                            <i class="fas fa-camera"></i> ${hasPhoto ? 'Change Photo' : 'Upload Photo'}
                        </button>
                        ${hasPhoto ? `
                            <button class="btn btn-danger" onclick="removeProfilePhoto()">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        ` : ''}
                    </div>
                    <p style="font-size: 11px; color: #888; margin-top: 15px;">Note: Best size is square, e.g. 200x200</p>
                </div>
            `;
            openModal({ icon: 'fa-user', text: 'Manage Profile Photo' }, html);
        }

        async function uploadProfilePhoto(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async function() {
                const base64 = reader.result;
                try {
                    const res = await fetch('api/admin.php?action=save_profile_photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ photo: base64 })
                    });
                    if (res.ok) {
                        userProfilePhoto = base64;
                        updateNames();
                        closeModal();
                        alert('Profile photo updated successfully!');
                    }
                } catch (err) {
                    alert('Failed to upload photo.');
                }
            };
            reader.readAsDataURL(file);
        }

        async function removeProfilePhoto() {
            if (confirm('Are you sure you want to remove your profile photo?')) {
                try {
                    const res = await fetch('api/admin.php?action=remove_profile_photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (res.ok) {
                        userProfilePhoto = null;
                        updateNames();
                        closeModal();
                        alert('Profile photo removed.');
                    }
                } catch (err) {
                    alert('Failed to remove photo.');
                }
            }
        }

        window.removeProfilePhoto = removeProfilePhoto;
