        let currentUser = "Administrator";
        let companyData = {
            name: "My Company",
            address: "",
            phone: "",
            fax: "",
            email: "",
            website: "",
            gst: "",
            ntn: "",
            dealsIn: ""
        };
        
        let companies = ["My Company", "Branch Office"];
        let currentNote = "Meeting with suppliers tomorrow at 10 AM. Follow up with ABC Traders for payment.";
        
        let users = [
            { id: 1, username: "Administrator", role: "Admin", email: "admin@softifyx.com", status: "Active" },
            { id: 2, username: "Operator", role: "Operator", email: "operator@softifyx.com", status: "Active" },
            { id: 3, username: "Manager", role: "Manager", email: "manager@softifyx.com", status: "Active" }
        ];

        let logoData = null;

        let inventoryItems = [
            { name: "Product A", stock: 5, reorderLevel: 10 },
            { name: "Product B", stock: 3, reorderLevel: 8 },
            { name: "Product C", stock: 15, reorderLevel: 5 },
            { name: "Product D", stock: 2, reorderLevel: 10 },
            { name: "Product E", stock: 7, reorderLevel: 6 }
        ];

        let dailySummary = {
            cashOpening: 120000,
            cashReceipts: 45000,
            cashPayments: 32500,
            newInvoices: 3,
            customerReceipts: 49000,
            overdue: 120000,
            newPurchases: 2,
            vendorPayments: 32000,
            outstanding: 243000
        };

        function loadSavedData() {
            const savedCompanies = localStorage.getItem('softifyx_companies');
            if (savedCompanies) {
                companies = JSON.parse(savedCompanies);
            }

            const activeName = localStorage.getItem('softifyx_active_company');
            const savedCompany = localStorage.getItem('softifyx_company');
            
            if (activeName) {
                const found = companies.find(c => (typeof c === 'string' ? c : c.name) === activeName);
                if (found) {
                    companyData = typeof found === 'string' ? { name: found, address: "", phone: "", fax: "", email: "", website: "", gst: "", ntn: "", dealsIn: "" } : { ...found };
                } else if (savedCompany) {
                    companyData = JSON.parse(savedCompany);
                }
            } else if (savedCompany) {
                companyData = JSON.parse(savedCompany);
            }
            
            const savedUsers = localStorage.getItem('softifyx_users');
            if (savedUsers) {
                users = JSON.parse(savedUsers);
            }
            
            const savedLogo = localStorage.getItem('softifyx_logo');
            if (savedLogo) {
                logoData = savedLogo;
                displayLogo();
            }
            
            const savedNote = localStorage.getItem('softifyx_note');
            if (savedNote) {
                currentNote = savedNote;
                document.getElementById('notesText').value = currentNote;
            }

            const savedSummary = localStorage.getItem('softifyx_summary');
            if (savedSummary) {
                dailySummary = JSON.parse(savedSummary);
            }
            
            updateNames();
            updateDashboardSummary();
        }

        function updateDashboardSummary() {
            document.getElementById('summaryCashOpening').textContent = '₹' + dailySummary.cashOpening.toLocaleString('en-IN');
            document.getElementById('summaryCashReceipts').textContent = '₹' + dailySummary.cashReceipts.toLocaleString('en-IN');
            document.getElementById('summaryCashPayments').textContent = '₹' + dailySummary.cashPayments.toLocaleString('en-IN');
            document.getElementById('summaryCashNet').textContent = '₹' + (dailySummary.cashOpening + dailySummary.cashReceipts - dailySummary.cashPayments).toLocaleString('en-IN');
            
            document.getElementById('summaryNewInvoices').textContent = dailySummary.newInvoices;
            document.getElementById('summaryCustomerReceipts').textContent = '₹' + dailySummary.customerReceipts.toLocaleString('en-IN');
            document.getElementById('summaryOverdue').textContent = '₹' + dailySummary.overdue.toLocaleString('en-IN');
            
            document.getElementById('summaryNewPurchases').textContent = dailySummary.newPurchases;
            document.getElementById('summaryVendorPayments').textContent = '₹' + dailySummary.vendorPayments.toLocaleString('en-IN');
            document.getElementById('summaryOutstanding').textContent = '₹' + dailySummary.outstanding.toLocaleString('en-IN');
            
            let lowStock = inventoryItems.filter(item => item.stock < item.reorderLevel).length;
            document.getElementById('lowStockCount').textContent = lowStock + ' Items';
            document.getElementById('reorderCount').textContent = (lowStock > 2 ? 2 : lowStock) + ' Items';
        }

        function saveSummary() {
            localStorage.setItem('softifyx_summary', JSON.stringify(dailySummary));
        }

        function displayLogo() {
            const logoDisplay = document.getElementById('logoDisplay');
            if (logoData) {
                logoDisplay.innerHTML = `<img src="${logoData}" style="height: 35px; width: auto; border-radius: 4px;">`;
            } else {
                logoDisplay.innerHTML = '';
            }
        }

        function updateNames() {
            document.getElementById('titleCompanyName').textContent = `- ${companyData.name}`;
            document.getElementById('dashboardCompanyName').textContent = companyData.name;
            document.getElementById('welcomeUserDisplay').innerHTML = `<i class="fas fa-user-circle"></i> <span>Welcome ${currentUser}</span>`;
        }

        function hideAllDropdowns() {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }

        function toggleDropdown(menuItem) {
            const dropdown = menuItem.querySelector('.dropdown');
            if (!dropdown) return;
            
            if (dropdown.style.display === 'block') {
                dropdown.style.display = 'none';
            } else {
                hideAllDropdowns();
                dropdown.style.display = 'block';
            }
        }

        function setupDropdowns() {
            document.querySelectorAll('.menu-item').forEach(menuItem => {
                menuItem.addEventListener('click', function(e) {
                    // Only toggle if they clicked the direct menu-item text, not inside its dropdown
                    if (e.target === this || e.target.parentElement === this && !e.target.classList.contains('dropdown')) {
                        e.stopPropagation();
                        toggleDropdown(this);
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

            document.addEventListener('click', function(e) {
                if (!e.target.closest('.menu-item') && !e.target.closest('.dropdown') && !e.target.closest('.nested-dropdown') && !e.target.closest('.mobile-menu-toggle')) {
                    hideAllDropdowns();
                    const navMenu = document.getElementById('navMenu');
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
                `<div>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" class="form-control" id="newUsername" placeholder="Enter username">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" class="form-control" id="newPassword" placeholder="Enter password">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" class="form-control" id="newEmail" placeholder="Enter email">
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <select class="form-control" id="newRole">
                            <option value="Admin">Admin</option>
                            <option value="Operator">Operator</option>
                            <option value="Manager">Manager</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="addUser()">Add User</button>
                        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    </div>
                </div>`
            );
        }

        function addUser() {
            const username = document.getElementById('newUsername')?.value;
            const email = document.getElementById('newEmail')?.value;
            const role = document.getElementById('newRole')?.value;
            
            if (username && email) {
                const newUser = {
                    id: users.length + 1,
                    username: username,
                    role: role,
                    email: email,
                    status: 'Active'
                };
                users.push(newUser);
                localStorage.setItem('softifyx_users', JSON.stringify(users));
                document.getElementById('userLoginsBtn').click();
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
                                <option value="Operator" ${user.role === 'Operator' ? 'selected' : ''}>Operator</option>
                                <option value="Manager" ${user.role === 'Manager' ? 'selected' : ''}>Manager</option>
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
                localStorage.setItem('softifyx_users', JSON.stringify(users));
                document.getElementById('userLoginsBtn').click();
            }
        }

        function deleteUser(userId) {
            if (confirm('Are you sure you want to delete this user?')) {
                const index = users.findIndex(u => u.id === userId);
                if (index !== -1 && users[index].username !== 'Administrator') {
                    users.splice(index, 1);
                    localStorage.setItem('softifyx_users', JSON.stringify(users));
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
                
                dailySummary.newInvoices++;
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
                
                localStorage.setItem('softifyx_company', JSON.stringify(companyData));
                updateNames();
                
                dailySummary.cashReceipts += 10000;
                dailySummary.customerReceipts += 10000;
                saveSummary();
                updateDashboardSummary();
            }
        }

        function saveLogoSettings() {
            const fileInput = document.getElementById('logoFile');
            const doNotShowOption = document.getElementById('doNotShowOption')?.checked;
            
            if (doNotShowOption) {
                logoData = null;
                localStorage.removeItem('softifyx_logo');
                displayLogo();
                closeModal();
            } else if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    logoData = e.target.result;
                    localStorage.setItem('softifyx_logo', logoData);
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

            localStorage.setItem('softifyx_company', JSON.stringify(companyData));
            localStorage.setItem('softifyx_companies', JSON.stringify(companies));
            localStorage.setItem('softifyx_active_company', companyData.name);
            updateNames();
            
            dailySummary.cashReceipts += 5000;
            dailySummary.customerReceipts += 5000;
            saveSummary();
            updateDashboardSummary();
            
            closeModal();
        }

        function saveNote() {
            const noteText = document.getElementById('notesText')?.value;
            if (noteText) {
                currentNote = noteText;
                localStorage.setItem('softifyx_note', currentNote);
            }
        }

        function clearNote() {
            document.getElementById('notesText').value = '';
            currentNote = '';
            localStorage.setItem('softifyx_note', '');
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
                let companyOptions = '';
                companies.forEach(company => {
                    companyOptions += `<option value="${company}">${company}</option>`;
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
                    openUserRightsModal();
                });
            }
        }

        function selectCompanyForLogin(select) {
            const selectedCompany = select.value;
            if (selectedCompany) {
                localStorage.setItem('softifyx_active_company', selectedCompany);
                
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
            }
        }

        function openUserRightsModal() {
            let userOptions = '';
            users.forEach(u => {
                userOptions += `<option value="${u.id}">${u.username}</option>`;
            });

            let rightsRows = `<tr data-right="Welcome Screen" ondblclick="toggleRightStatus(this)">
                <td><i class="fas fa-caret-right" style="margin-right:5px;color:#333;"></i> Welcome Screen</td>
                <td class="right-status" style="text-align: center; color: #d63031; font-weight: 500;"></td>
            </tr>`;

            document.querySelectorAll('#navMenu .menu-item').forEach(m => {
                m.querySelectorAll('.dropdown-item').forEach(item => {
                    let itemName = item.childNodes[0].textContent.trim();
                    if (!itemName || itemName === 'About' || itemName === 'User Rights') return;
                    
                    let isParent = item.classList.contains('has-nested');
                    let indent = isParent ? '' : 'indent-level-1';
                    
                    rightsRows += `<tr data-right="${itemName}" ondblclick="toggleRightStatus(this)">
                        <td class="${indent}">
                            ${isParent ? '<i class="fas fa-caret-right" style="margin-right:5px;color:#333;"></i>' : ''} 
                            ${itemName}
                        </td>
                        <td class="right-status" style="text-align: center; color: #d63031; font-weight: 500;"></td>
                    </tr>`;
                });
            });

            openModal(
                { icon: 'fa-shield-alt', text: 'User Rights Settings' },
                `<div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #eee;">
                        <label style="font-weight: 600; color: #1f4668;">Select User:</label>
                        <select class="form-control" id="urUserSelect" style="max-width: 250px;" onchange="loadUserRightsForm()">
                            ${userOptions}
                        </select>
                    </div>
                    
                    <p style="text-align: right; color: #d63031; font-style: italic; font-size: 11px; margin-bottom: 5px;">
                        Double-click on selected right type to change right status.
                    </p>
                    
                    <div style="max-height: 350px; overflow-y: auto; border: 1px solid #ccc; border-radius: 4px;">
                        <table class="ur-table">
                            <thead>
                                <tr>
                                    <th style="width: 70%;">Right Type</th>
                                    <th style="width: 30%; text-align: center;">Right Allowed Status</th>
                                </tr>
                            </thead>
                            <tbody id="urTableBody">
                                ${rightsRows}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="saveUserRights()"><i class="fas fa-check"></i> Save Changes</button>
                        <button class="btn btn-secondary" onclick="closeModal()"><i class="fas fa-times"></i> Cancel</button>
                    </div>
                </div>`
            );
            
            setTimeout(() => {
                loadUserRightsForm();
            }, 50);
        }

        function toggleRightStatus(row) {
            const statusCell = row.querySelector('.right-status');
            if (statusCell.textContent === 'Not Allowed') {
                statusCell.textContent = '';
            } else {
                statusCell.textContent = 'Not Allowed';
            }
        }

        function loadUserRightsForm() {
            const userId = document.getElementById('urUserSelect')?.value;
            if (!userId) return;
            const savedRights = localStorage.getItem('softifyx_user_rights_' + userId);
            
            let rightsData = {};
            if (savedRights) rightsData = JSON.parse(savedRights);
            
            document.querySelectorAll('#urTableBody tr').forEach(row => {
                const rightName = row.getAttribute('data-right');
                const statusCell = row.querySelector('.right-status');
                
                if (rightsData[rightName] === false) {
                    statusCell.textContent = 'Not Allowed';
                } else {
                    statusCell.textContent = '';
                }
            });
        }

        function saveUserRights() {
            const userId = document.getElementById('urUserSelect').value;
            let rightsData = {};
            
            document.querySelectorAll('#urTableBody tr').forEach(row => {
                const rightName = row.getAttribute('data-right');
                const statusCell = row.querySelector('.right-status');
                rightsData[rightName] = (statusCell.textContent !== 'Not Allowed');
            });
            
            localStorage.setItem('softifyx_user_rights_' + userId, JSON.stringify(rightsData));
            closeModal();
        }

        function init() {
            loadSavedData();
            setupDropdowns();
            setupMenuButtons(); 

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
        window.openUserRightsModal = openUserRightsModal;
        window.toggleRightStatus = toggleRightStatus;
        window.loadUserRightsForm = loadUserRightsForm;
        window.saveUserRights = saveUserRights;

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
        
        mainContent.innerHTML = '<div style="padding: 50px; text-align: center; color: #aaa;"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>Loading Component...</div>';
        
        const res = await fetch(url);
        if (res.ok) {
            mainContent.innerHTML = await res.text();
        } else {
            mainContent.innerHTML = `
                <div style="padding: 50px; text-align: center; color: #555; background: #fff; border-radius: 8px; margin: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <h2><i class="fas fa-laptop-code" style="color: #4a90e2; font-size: 2rem; margin-bottom: 20px;"></i><br>Module Not Found / In Development</h2>
                    <p style="margin-top: 10px;">The requested file <code>${url}</code> does not exist yet.</p>
                </div>`;
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
            if (mobileMenuToggle) {
                mobileMenuToggle.addEventListener('click', () => {
                    const navMenu = document.getElementById('navMenu');
                    if (navMenu) {
                        navMenu.classList.toggle('active');
                    }
                });
            }

            // Attach SPA event listeners to all generic dropdown menus
            document.querySelectorAll('.dropdown-item[data-target]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.loadView(item.getAttribute('data-target'));
                    if (window.hideAllDropdowns) window.hideAllDropdowns();
                });
            });
        }
        
        // Load Sidebar
        const sideRes = await fetch('components/sidebar.html');
        if(sideRes.ok) {
            document.getElementById('sidebar-container').innerHTML = await sideRes.text();
        }

        // Load Default View FIRST
        await window.loadView('components/dashboard.html');

        // Initialize general app variables and behaviors
        init();

    } catch(err) {
        console.error('Failed to load components:', err);
    }
});

