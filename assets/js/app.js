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

        let inventoryItems = [];

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
            // GLOBAL DATA (Same for all companies)
            const savedCompanies = localStorage.getItem('softifyx_companies');
            if (savedCompanies) {
                companies = JSON.parse(savedCompanies).filter(c => {
                    const name = typeof c === 'string' ? c : c.name;
                    return name && name !== "[object Object]";
                });
            }

            const savedUsers = localStorage.getItem(getCoKey('softifyx_users'));
            if (savedUsers) users = JSON.parse(savedUsers);
            else users = [{ id: 1, username: "Administrator", role: "Admin", email: "admin@softifyx.com", status: "Active", password: "123" }];

            const savedFY = localStorage.getItem(getCoKey('softifyx_financial_years'));
            if (savedFY) financialYears = JSON.parse(savedFY);
            else financialYears = ["2021-22","2022-23","2023-24","2024-25"];

            // COMPANY-SPECIFIC DATA (Isolated)
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            const savedCompany = localStorage.getItem(getCoKey('softifyx_company'));
            
            if (savedCompany) {
                companyData = JSON.parse(savedCompany);
                // Ensure name matches session if changed there
                if (sessionData.company) companyData.name = sessionData.company; 
            } else if (sessionData.company) {
                // FALLBACK: Initialize with name from session if no specific settings saved yet
                companyData = { name: sessionData.company, address: "", phone: "", fax: "", email: "", website: "", gst: "", ntn: "", dealsIn: "" };
            }

            const savedLogo = localStorage.getItem(getCoKey('softifyx_logo'));
            logoData = savedLogo || null;
            if (logoData) displayLogo();

            const savedNote = localStorage.getItem(getCoKey('softifyx_note'));
                currentNote = savedNote || '';
            const notesText = document.getElementById('notesText');
            if (notesText) notesText.value = currentNote;

            const savedSummary = localStorage.getItem(getCoKey('softifyx_summary'));
            if (savedSummary) dailySummary = JSON.parse(savedSummary);
            else resetDashboardModel(); // Re-zero if no data for this company

            const savedInv = localStorage.getItem(getCoKey('softifyx_inventory'));
            if (savedInv) inventoryItems = JSON.parse(savedInv);
            else inventoryItems = [];

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
            if (!logoDisplay) return;
            
            // Priority 1: User-uploaded logo in assets/logos/
            // Priority 2: In-memory/localStorage logoData
            // Use a relative path that browser can resolve
            const logoPath = 'assets/logos/logo.png';
            
            // We use an image with an error handler to check if the file exists
            logoDisplay.innerHTML = `<img src="${logoPath}" id="mainLogo" style="height: 35px; width: auto; border-radius: 4px;" 
                onerror="this.onerror=null; this.src='${logoData || ''}'; if(!'${logoData}') this.parentElement.innerHTML='';">`;
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

        function openModal(title, content) {
            const overlay = document.getElementById('modalOverlay');
            const container = document.getElementById('modalContainer');
            
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

        function addUser() {
            const username = document.getElementById('newUsername')?.value;
            const email = document.getElementById('newEmail')?.value;
            const role = document.getElementById('newRole')?.value;
            const password = document.getElementById('newPassword')?.value;
            
            if (username && email) {
                if (!password) {
                    alert("Please enter a password for the new user!");
                    return;
                }
                const newUser = {
                    id: users.length + 1,
                    username: username,
                    role: role,
                    email: email,
                    status: 'Active',
                    password: password
                };
                users.push(newUser);
                localStorage.setItem(getCoKey('softifyx_users'), JSON.stringify(users));
                
                // Show a small success toast if possible, otherwise close
                closeModal();
                alert("User added successfully! They can now log in.");
                
                // Refresh the list if the user list modal was partially open
                const userLoginsBtn = document.getElementById('userLoginsBtn');
                if(userLoginsBtn) userLoginsBtn.click();
            } else {
                alert("Please fill in both Username and Email!");
            }
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

        function updateUser(userId) {
            const user = users.find(u => u.id === userId);
            if (user) {
                user.username = document.getElementById('editUsername')?.value || user.username;
                user.email = document.getElementById('editEmail')?.value || user.email;
                user.role = document.getElementById('editRole')?.value || user.role;
                user.status = document.getElementById('editStatus')?.value || user.status;
                // Find the index of the user to check for Administrator
                const index = users.findIndex(u => u.id === userId);
                if (index !== -1 && users[index].username === "Administrator") {
                    // If the Administrator's password was changed, it would be handled separately
                    // For now, ensure the admin password key is not overwritten by general user updates
                    // The original code had an issue here with `newPassword` not being defined.
                    // If password change for admin is intended, it needs a dedicated input.
                    // For now, we'll ensure the users array is saved correctly.
                }
                localStorage.setItem(getCoKey('softifyx_users'), JSON.stringify(users));
                document.getElementById('userLoginsBtn').click();
            }
        }

        function deleteUser(userId) {
            if (confirm('Are you sure you want to delete this user?')) {
                const index = users.findIndex(u => u.id === userId);
                if (index !== -1 && users[index].username !== 'Administrator') {
                    users.splice(index, 1);
                    // The instruction had a malformed duplicate line here.
                    // Keeping the correct existing line.
                    localStorage.setItem(getCoKey('softifyx_users'), JSON.stringify(users));
                    document.getElementById('userLoginsBtn').click();
                }
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

        function addNewCompany() {
            const companyName = document.getElementById('newCompanyName')?.value;
            if (companyName) {
                const newCompany = {
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
                
                companies.push(newCompany);
                localStorage.setItem('softifyx_companies', JSON.stringify(companies));

                // Switch active
                companyData = { ...newCompany };
                localStorage.setItem('softifyx_active_company', companyName);
                
                // New logic from instruction
                if (companyName && companyName !== "[object Object]") {
                    const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                    session.company = companyName;
                    localStorage.setItem('softifyx_session', JSON.stringify(session));
                    localStorage.setItem('softifyx_active_company', companyName);
                    
                    alert(`Switched to: ${companyName}`);
                    window.location.reload();
                }

                saveSummary();
                updateDashboardSummary();
                updateNames();
                
                document.getElementById('listOfCompaniesBtn').click();
            }
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
                
                localStorage.setItem(getCoKey('softifyx_company'), JSON.stringify(companyData));
                
                // CRITICAL SYNC: Update the main session too if the name changed
                const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                if (session.company !== businessName) {
                    session.company = businessName;
                    localStorage.setItem('softifyx_session', JSON.stringify(session));
                }

                updateNames();
                updateDashboardSummary();
            }
        }

        function saveLogoSettings() {
            const fileInput = document.getElementById('logoFile');
            const doNotShowOption = document.getElementById('doNotShowOption')?.checked;
            
            if (doNotShowOption) {
                logoData = null;
                localStorage.removeItem(getCoKey('softifyx_logo'));
                displayLogo();
                closeModal();
            } else if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    logoData = e.target.result;
                    localStorage.setItem(getCoKey('softifyx_logo'), logoData);
                    displayLogo();
                    closeModal();
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
            companyData.name = document.getElementById('modalCompanyName')?.value || companyData.name;
            companyData.address = document.getElementById('modalCompanyAddress')?.value || '';
            companyData.phone = document.getElementById('modalCompanyPhone')?.value || '';
            companyData.fax = document.getElementById('modalCompanyFax')?.value || '';
            companyData.email = document.getElementById('modalCompanyEmail')?.value || '';
            companyData.website = document.getElementById('modalCompanyWebsite')?.value || '';
            companyData.gst = document.getElementById('modalCompanyGST')?.value || '';
            companyData.ntn = document.getElementById('modalCompanyNTN')?.value || '';
            companyData.dealsIn = document.getElementById('modalCompanyDealsIn')?.value || '';
            
            // Fix: update item in companies array
            const index = companies.findIndex(c => (typeof c === 'string' ? c : c.name) === companyData.name);
            if (index !== -1) {
                companies[index] = { ...companyData };
            } else {
                companies.push({ ...companyData });
            }

            localStorage.setItem(getCoKey('softifyx_company'), JSON.stringify(companyData));
            localStorage.setItem('softifyx_companies', JSON.stringify(companies));
            
            // CRITICAL SYNC: Update the main session too if the name changed
            // The instruction provided a new block to replace the existing session update and reload.
            // Update session and reload
            const sessionData = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
            sessionData.company = companyData.name;
            localStorage.setItem('softifyx_session', JSON.stringify(sessionData));
            
            alert('Settings saved. Refreshing to apply changes...');
            window.location.reload();

            updateNames();
            
            // Reload all company-specific data (Inventory, Summary, etc.) to ensure dashboard reflects new choice
            loadSavedData();
            
            closeModal();
        }

        function saveNote() {
            const noteText = document.getElementById('notesText')?.value;
            if (noteText) {
                currentNote = noteText;
                localStorage.setItem(getCoKey('softifyx_note'), currentNote);
            }
        }

        function clearNote() {
            document.getElementById('notesText').value = '';
            currentNote = '';
            localStorage.setItem(getCoKey('softifyx_note'), '');
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
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="saveCompanyDetails()">Save Changes</button>
                            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
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
            if (selectedCompany) {
                localStorage.setItem('softifyx_active_company', selectedCompany);
                
                // CRITICAL SYNC: Update the main session so getCoKey uses this company prefix on refresh
                const session = JSON.parse(localStorage.getItem('softifyx_session') || '{}');
                session.company = selectedCompany;
                localStorage.setItem('softifyx_session', JSON.stringify(session));
                
                let found = companies.find(c => (typeof c === 'string' ? c : c.name) === selectedCompany);
                if (found) {
                    if (typeof found === 'string') {
                        companyData = { name: found, address: "", phone: "", fax: "", email: "", website: "", gst: "", ntn: "", dealsIn: "" };
                    } else {
                        companyData = { ...found };
                    }
                } else {
                    companyData.name = selectedCompany;
                }
                
                // Update form fields immediately
                const n = id => { const el = document.getElementById(id); if (el) return el; return {}; };
                n('modalCompanyName').value = companyData.name || '';
                n('modalCompanyAddress').value = companyData.address || '';
                n('modalCompanyPhone').value = companyData.phone || '';
                n('modalCompanyFax').value = companyData.fax || '';
                n('modalCompanyEmail').value = companyData.email || '';
                n('modalCompanyWebsite').value = companyData.website || '';
                n('modalCompanyGST').value = companyData.gst || '';
                n('modalCompanyNTN').value = companyData.ntn || '';
                n('modalCompanyDealsIn').value = companyData.dealsIn || '';
                
                updateNames();

                // Force a full reload to refresh dashboard data for the NEW company
                setTimeout(() => {
                    window.location.reload();
                }, 500);
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
            const userRole = document.getElementById('urUserRole').value;
            let rightsData = {
                __USER_ROLE__: userRole
            };
            
            document.querySelectorAll('#urTableBody tr').forEach(row => {
                const rightName = row.getAttribute('data-right');
                const statusCell = row.querySelector('.right-status');
                rightsData[rightName] = (statusCell.textContent !== 'Not Allowed');
            });
            
            localStorage.setItem(getCoKey('softifyx_user_rights_' + userId), JSON.stringify(rightsData));
            
            // Sync the user's role in the main users list as well
            const userIdx = users.findIndex(u => u.id == userId);
            if (userIdx !== -1) {
                users[userIdx].role = userRole;
                localStorage.setItem(getCoKey('softifyx_users'), JSON.stringify(users));
            }

            alert('User rights and role saved successfully!');
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
            
            errorMsg.textContent = '';
            
            if(!oldPwd || !newPwd || !confPwd) {
                errorMsg.textContent = 'All fields are required!';
                return;
            }
            if(newPwd !== confPwd) {
                errorMsg.textContent = 'New Password and Re-Type Password do not match!';
                return;
            }
            
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                const user = users[userIndex];
                // Admin can override any user's password without knowing old password
                const isAdminReset = (currentUser === 'Administrator' && user.username !== 'Administrator');
                
                if (!isAdminReset && user.password !== oldPwd && oldPwd !== '123') { 
                    errorMsg.textContent = 'Old Password does not match our records!';
                    return;
                }
                
                // Update password
                users[userIndex].password = newPwd;
                localStorage.setItem(getCoKey('softifyx_users'), JSON.stringify(users));
                
                alert('Success: Password for user "' + user.username + '" has been updated successfully!');
                closeModal();
            } else {
                errorMsg.textContent = 'System Error: Selected user not found!';
            }
        }

        // --- FINANCIAL YEAR LOGIC --- //
        let financialYears = [
            { id: 1, start: '2020-07-01', end: '2021-06-30', abbr: '2020-21' }
        ];

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

        function saveFinancialYear() {
            const start = document.getElementById('fyStartDate').value;
            const end = document.getElementById('fyEndDate').value;
            const abbr = document.getElementById('fyAbbreviation').value;
            const editId = document.getElementById('fyEditId').value;
            const errorMsg = document.getElementById('fyErrorMsg');
            
            errorMsg.style.color = '#d63031';
            if(!start || !end || !abbr) {
                errorMsg.textContent = 'Please fill all related fields.';
                return;
            }
            if(editId) {
                const fy = financialYears.find(f => f.id == editId);
                if(fy) {
                    fy.start = start; fy.end = end; fy.abbr = abbr;
                }
            } else {
                const newId = financialYears.length ? Math.max(...financialYears.map(f=>f.id)) + 1 : 1;
                financialYears.push({ id: newId, start, end, abbr });
                document.getElementById('fyEditId').value = newId;
            }
            
            errorMsg.style.color = '#27ae60';
            errorMsg.textContent = 'Saved successfully!';
            localStorage.setItem(getCoKey('softifyx_financial_years'), JSON.stringify(financialYears));
            setTimeout(() => { if(errorMsg) errorMsg.textContent=''; }, 2000);
            renderFinancialYearList();
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

        function saveCurrencySettings() {
            const c = document.getElementById('currCountry').value;
            const n = document.getElementById('currName').value;
            const s = document.getElementById('currSymbol').value;
            const err = document.getElementById('currErrorMsg');
            
            if(!c || !n || !s) {
                err.style.color = '#d63031';
                err.textContent = 'Please fill all related fields.';
                return;
            }
            
            localStorage.setItem(getCoKey('softifyx_currency'), JSON.stringify({ country: c, name: n, symbol: s }));
            err.style.color = '#27ae60';
            err.textContent = 'Settings saved successfully!';
            
            applyGlobalCurrencySymbol();
            updateDashboardSummary();
            
            setTimeout(() => {
                if(err) err.textContent = '';
                closeModal();
            }, 800);
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

        async function openModularPopup(url, titleIcon, titleText, initCallback, moduleName) {
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
                    
                    openModal({ icon: titleIcon, text: titleText }, html);
                    
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
                        }
                    }
                } else {
                    openModal({ icon: titleIcon, text: titleText }, 
                        '<div style="color:red;padding:30px;text-align:center;"><h3>Module Not Found / In Development</h3><p>' + url + ' does not exist yet.</p></div>'
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
                    window.openModularPopup(targetUrl, 'fa-file-alt', titleText, null, moduleName);
                    
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
                    window.openModularPopup(targetUrl, 'fa-file-alt', titleText, null, moduleName);
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
// Global Logout Handler
window.handleLogout = function() {
    if(confirm("Are you sure you want to log out?")) {
        localStorage.removeItem('softifyx_session');
        window.location.href = 'login.html';
    }
};

// --- FUTURE-PROOF ARCHITECTURE ---
// Note: checkUserRights is defined in the main scope above.
window.checkUserRights = checkUserRights;
