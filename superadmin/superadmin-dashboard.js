// Super Admin Dashboard JavaScript

// Function to get super admin email from localStorage
function getSuperAdminEmail() {
    return localStorage.getItem('superAdminEmail');
}

// Function to get super admin token from localStorage
function getSuperAdminToken() {
    return localStorage.getItem('superAdminToken');
}

// Prevent back button access after logout
function preventBackButtonAccess() {
    // Check if super admin is authenticated using super admin-specific keys
    const superAdminEmail = localStorage.getItem('superAdminEmail');
    const superAdminToken = localStorage.getItem('superAdminToken');
    
    if (!superAdminEmail || !superAdminToken) {
        // If not authenticated, redirect to login
        window.location.href = '../index.html';
        return;
    }
    
    // Disable browser cache for this page
    if (window.history && window.history.pushState) {
        window.history.pushState(null, null, window.location.href);
        
        window.addEventListener('popstate', function() {
            // When back button is pressed, push state again and redirect to login
            window.history.pushState(null, null, window.location.href);
            logout();
        });
    }
    
    // Set cache control headers via meta tags
    const metaNoCache = document.createElement('meta');
    metaNoCache.httpEquiv = 'Cache-Control';
    metaNoCache.content = 'no-cache, no-store, must-revalidate';
    document.head.appendChild(metaNoCache);
    
    const metaPragma = document.createElement('meta');
    metaPragma.httpEquiv = 'Pragma';
    metaPragma.content = 'no-cache';
    document.head.appendChild(metaPragma);
    
    const metaExpires = document.createElement('meta');
    metaExpires.httpEquiv = 'Expires';
    metaExpires.content = '0';
    document.head.appendChild(metaExpires);
}

// Logout function
function logout() {
    // Clear only super admin-specific authentication data
    localStorage.removeItem('superAdminEmail');
    localStorage.removeItem('superAdminToken');
    
    // Clear super admin session storage
    sessionStorage.removeItem('superAdminEmail');
    sessionStorage.removeItem('superAdminToken');
    
    // Clear browser history to prevent back button access
    if (window.history && window.history.pushState) {
        window.history.pushState(null, null, '../index.html');
    }
    
    // Redirect to login page
    window.location.replace('../index.html');
}

// Function to fetch dashboard statistics
function fetchDashboardStats() {
    fetch('/api/superadmin-stats', {
        headers: {
            'Authorization': `Bearer ${getSuperAdminToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update dashboard stats
            document.getElementById('total-users-count').textContent = data.stats.userCount;
            document.getElementById('total-admins-count').textContent = data.stats.adminCount;
            document.getElementById('assigned-devices-count').textContent = data.stats.assignedDeviceCount;
            document.getElementById('unassigned-devices-count').textContent = data.stats.unassignedDeviceCount;
        } else {
            console.error('Failed to fetch dashboard stats:', data.message);
        }
    })
    .catch(error => {
        console.error('Error fetching dashboard stats:', error);
    });
}

// Function to fetch admins
function fetchAdmins() {
    fetch('/api/superadmin-admins', {
        headers: {
            'Authorization': `Bearer ${getSuperAdminToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayAdmins(data.admins);
        } else {
            showNotification('Failed to fetch admins: ' + data.message, false);
        }
    })
    .catch(error => {
        console.error('Error fetching admins:', error);
        showNotification('Error fetching admins. Please try again.', false);
    });
}

// Function to display admins in the table
function displayAdmins(admins) {
    const tbody = document.getElementById('admins-tbody');
    tbody.innerHTML = '';
    
    if (admins.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="no-data">No admins found</td>';
        tbody.appendChild(tr);
        return;
    }
    
    admins.forEach(admin => {
        const tr = document.createElement('tr');
        const adminStatus = admin.status || 'active';
        const statusClass = adminStatus === 'active' ? 'status-active' : 'status-blocked';
        const statusText = adminStatus === 'active' ? 'Active' : 'Blocked';
        
        tr.innerHTML = `
            <td>${admin.id}</td>
            <td>${admin.name}</td>
            <td>${admin.email}</td>
            <td>${admin.role}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-dropdown">
                    <button class="action-btn dropdown-toggle" data-admin-id="${admin.id}">
                        <i class="fas fa-ellipsis-v"></i> Actions
                    </button>
                    <div class="dropdown-menu">
                        <button class="dropdown-item delete-admin-btn" data-id="${admin.id}" data-name="${admin.name}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        ${adminStatus === 'active' ? 
                            `<button class="dropdown-item block-admin-btn" data-id="${admin.id}" data-name="${admin.name}">
                                <i class="fas fa-ban"></i> Block
                            </button>` : 
                            `<button class="dropdown-item unblock-admin-btn" data-id="${admin.id}" data-name="${admin.name}">
                                <i class="fas fa-check-circle"></i> Unblock
                            </button>`
                        }
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners for dropdown toggles
    tbody.querySelectorAll('.dropdown-toggle').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== this.nextElementSibling) {
                    menu.classList.remove('show');
                }
            });
            
            // Toggle current dropdown
            const menu = this.nextElementSibling;
            menu.classList.toggle('show');
        });
    });

    // Add event listeners for action buttons
    tbody.querySelectorAll('.delete-admin-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const adminId = this.getAttribute('data-id');
            const adminName = this.getAttribute('data-name');
            showDeleteConfirmation(adminId, 'admin', deleteAdmin);
        });
    });

    tbody.querySelectorAll('.block-admin-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const adminId = this.getAttribute('data-id');
            const adminName = this.getAttribute('data-name');
            showBlockConfirmation(adminId, adminName, 'admin');
        });
    });

    tbody.querySelectorAll('.unblock-admin-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const adminId = this.getAttribute('data-id');
            const adminName = this.getAttribute('data-name');
            showUnblockConfirmation(adminId, adminName, 'admin');
        });
    });
}

// Function to fetch users
function fetchUsers() {
    fetch('/api/superadmin-users', {
        headers: {
            'Authorization': `Bearer ${getSuperAdminToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayUsers(data.users);
        } else {
            showNotification('Failed to fetch users: ' + data.message, false);
        }
    })
    .catch(error => {
        console.error('Error fetching users:', error);
        showNotification('Error fetching users. Please try again.', false);
    });
}

// Function to display users in the table
function displayUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="no-data">No users found</td>';
        tbody.appendChild(tr);
        return;
    }
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        const userStatus = user.status || 'active';
        const statusClass = userStatus === 'active' ? 'status-active' : 'status-blocked';
        const statusText = userStatus === 'active' ? 'Active' : 'Blocked';
        
        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-dropdown">
                    <button class="action-btn dropdown-toggle" data-user-id="${user.id}">
                        <i class="fas fa-ellipsis-v"></i> Actions
                    </button>
                    <div class="dropdown-menu">
                        <button class="dropdown-item delete-user-btn" data-id="${user.id}" data-name="${user.name}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        ${userStatus === 'active' ? 
                            `<button class="dropdown-item block-user-btn" data-id="${user.id}" data-name="${user.name}">
                                <i class="fas fa-ban"></i> Block
                            </button>` : 
                            `<button class="dropdown-item unblock-user-btn" data-id="${user.id}" data-name="${user.name}">
                                <i class="fas fa-check-circle"></i> Unblock
                            </button>`
                        }
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners for dropdown toggles
    tbody.querySelectorAll('.dropdown-toggle').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== this.nextElementSibling) {
                    menu.classList.remove('show');
                }
            });
            
            // Toggle current dropdown
            const menu = this.nextElementSibling;
            menu.classList.toggle('show');
        });
    });

    // Add event listeners for action buttons
    tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-id');
            const userName = this.getAttribute('data-name');
            showDeleteConfirmation(userId, 'user', deleteUser);
        });
    });

    tbody.querySelectorAll('.block-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-id');
            const userName = this.getAttribute('data-name');
            showBlockConfirmation(userId, userName, 'user');
        });
    });

    tbody.querySelectorAll('.unblock-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-id');
            const userName = this.getAttribute('data-name');
            showUnblockConfirmation(userId, userName, 'user');
        });
    });
}

// Function to fetch devices
function fetchDevices() {
    fetch('/api/device-ids', {
        headers: {
            'Authorization': `Bearer ${getSuperAdminToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayDevices(data.devices);
        } else {
            showNotification('Failed to fetch devices: ' + data.message, false);
        }
    })
    .catch(error => {
        console.error('Error fetching devices:', error);
        showNotification('Error fetching devices. Please try again.', false);
    });
}

// Function to display devices in the table
function displayDevices(devices) {
    const tbody = document.getElementById('devices-tbody');
    tbody.innerHTML = '';

    if (devices.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="no-data">No devices found</td>';
        tbody.appendChild(tr);
        return;
    }

    devices.forEach(device => {
        const tr = document.createElement('tr');
        const createdDate = new Date(device.created_at).toLocaleDateString();
        const assignmentStatus = device.assignment_status || 'not_assigned';
        const statusText = assignmentStatus === 'assigned' ? 'Assigned' : 'Not Assigned';
        const statusClass = assignmentStatus === 'assigned' ? 'status-assigned' : 'status-not-assigned';
        const assignedToName = device.assigned_to_name ? ` (${device.assigned_to_name})` : '';
        const createdByName = device.created_by_name || 'Unknown';

        tr.innerHTML = `
            <td>${device.device_id}</td>
            <td>${createdDate}</td>
            <td>${createdByName}</td>
            <td><span class="${statusClass}">${statusText}<br>${assignedToName}</span></td>
            <td>
                <div class="action-dropdown">
                    <button class="action-btn dropdown-toggle" data-device-id="${device.device_id}">
                        <i class="fas fa-ellipsis-v"></i> Actions
                    </button>
                    <div class="dropdown-menu">
                        <button class="dropdown-item view-qr-btn" data-device-id="${device.device_id}">
                            <i class="fas fa-qrcode"></i> View QR
                        </button>
                        <button class="dropdown-item delete-device-btn" data-device-id="${device.device_id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        ${assignmentStatus === 'assigned' ?
                            `<button class="dropdown-item unlink-device-btn" data-device-id="${device.device_id}">
                                <i class="fas fa-unlink"></i> Unlink
                            </button>` : ''
                        }
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners for dropdown toggles
    tbody.querySelectorAll('.dropdown-toggle').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();

            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== this.nextElementSibling) {
                    menu.classList.remove('show');
                }
            });

            // Toggle current dropdown
            const menu = this.nextElementSibling;
            menu.classList.toggle('show');
        });
    });

    // Add event listeners for action buttons
    tbody.querySelectorAll('.view-qr-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const deviceId = this.getAttribute('data-device-id');
            showQRCode(deviceId);
        });
    });

    tbody.querySelectorAll('.delete-device-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const deviceId = this.getAttribute('data-device-id');
            showDeleteConfirmation(deviceId, 'device', deleteDevice);
        });
    });

    tbody.querySelectorAll('.unlink-device-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const deviceId = this.getAttribute('data-device-id');
            unlinkDevice(deviceId);
        });
    });
}

// Function to show QR code in modal
function showQRCode(deviceId) {
    const modal = document.getElementById('qr-modal');
    const qrContainer = document.getElementById('qr-code-container');
    const deviceIdDisplay = document.getElementById('device-id-display');

    // Generate QR code URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${deviceId}`;

    // Display QR code and device ID
    qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code for ${deviceId}">`;
    deviceIdDisplay.textContent = deviceId;

    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Update button handlers
    const copyBtn = document.getElementById('copy-qr-device-id-btn');
    const downloadBtn = document.getElementById('download-qr-code-btn');
    const closeBtn = document.getElementById('close-qr-modal-btn');

    copyBtn.onclick = () => copyDeviceId(deviceId);
    downloadBtn.onclick = () => downloadQR(deviceId, qrUrl);
    closeBtn.onclick = () => closeQRModal();

    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeQRModal();
        }
    };

    // Add escape key handler
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeQRModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Function to close QR modal
function closeQRModal() {
    const modal = document.getElementById('qr-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Function to copy device ID
function copyDeviceId(deviceId) {
    navigator.clipboard.writeText(deviceId).then(() => {
        showNotification('Device ID copied to clipboard', true);
    }).catch(() => {
        showNotification('Failed to copy device ID', false);
    });
}

// Function to download QR code
function downloadQR(deviceId, qrUrl) {
    // Create a canvas to convert the image to blob
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_${deviceId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showNotification('QR code downloaded successfully', true);
        }, 'image/png');
    };

    img.onerror = function() {
        // Fallback method
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `QR_${deviceId}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('QR code download initiated', true);
    };

    img.src = qrUrl;
}

// Function to show delete confirmation
function showDeleteConfirmation(itemId, itemType, deleteCallback) {
    const modal = document.getElementById('delete-confirmation');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');

    // Store the current overflow style
    const originalOverflow = document.body.style.overflow;

    // Show the modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Remove any existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);

    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Add event listener for confirm button
    newConfirmBtn.addEventListener('click', function() {
        if (typeof deleteCallback === 'function') {
            deleteCallback(itemId);
        }
        closeDeleteModal();
    });

    // Add event listener for cancel button
    newCancelBtn.addEventListener('click', function() {
        closeDeleteModal();
    });

    // Function to close the modal
    function closeDeleteModal() {
        modal.classList.remove('show');
        document.body.style.overflow = originalOverflow;
    }

    // Add escape key handler
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeDeleteModal();
            document.removeEventListener('keydown', escHandler);
        }
    };

    document.addEventListener('keydown', escHandler);
}

// Function to show block confirmation
function showBlockConfirmation(userId, userName, userType) {
    const modal = document.getElementById('block-confirmation');
    const confirmBtn = document.getElementById('confirm-block-btn');
    const cancelBtn = document.getElementById('cancel-block-btn');
    const messageElement = document.getElementById('block-user-message');

    // Update message with user name
    messageElement.textContent = `Are you sure you want to block "${userName}"? They will not be able to log in until unblocked.`;

    // Store the current overflow style
    const originalOverflow = document.body.style.overflow;

    // Show the modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Remove any existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);

    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Add event listener for confirm button
    newConfirmBtn.addEventListener('click', function() {
        if (userType === 'admin') {
            blockAdmin(userId);
        } else {
            blockUser(userId);
        }
        closeBlockModal();
    });

    // Add event listener for cancel button
    newCancelBtn.addEventListener('click', function() {
        closeBlockModal();
    });

    // Function to close the modal
    function closeBlockModal() {
        modal.classList.remove('show');
        document.body.style.overflow = originalOverflow;
    }

    // Add escape key handler
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeBlockModal();
            document.removeEventListener('keydown', escHandler);
        }
    };

    document.addEventListener('keydown', escHandler);
}

// Function to show unblock confirmation
function showUnblockConfirmation(userId, userName, userType) {
    const modal = document.getElementById('unblock-confirmation');
    const confirmBtn = document.getElementById('confirm-unblock-btn');
    const cancelBtn = document.getElementById('cancel-unblock-btn');
    const messageElement = document.getElementById('unblock-user-message');

    // Update message with user name
    messageElement.textContent = `Are you sure you want to unblock "${userName}"? They will be able to log in again.`;

    // Store the current overflow style
    const originalOverflow = document.body.style.overflow;

    // Show the modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Remove any existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);

    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Add event listener for confirm button
    newConfirmBtn.addEventListener('click', function() {
        if (userType === 'admin') {
            unblockAdmin(userId);
        } else {
            unblockUser(userId);
        }
        closeUnblockModal();
    });

    // Add event listener for cancel button
    newCancelBtn.addEventListener('click', function() {
        closeUnblockModal();
    });

    // Function to close the modal
    function closeUnblockModal() {
        modal.classList.remove('show');
        document.body.style.overflow = originalOverflow;
    }

    // Add escape key handler
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeUnblockModal();
            document.removeEventListener('keydown', escHandler);
        }
    };

    document.addEventListener('keydown', escHandler);
}

// Delete functions
function deleteUser(userId) {
    fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getSuperAdminToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, true);
            fetchUsers();
            fetchDashboardStats();
        } else {
            showNotification(`Failed to delete user: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user. Please try again.', false);
    });
}

function deleteAdmin(adminId) {
    fetch(`/api/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getSuperAdminToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, true);
            fetchAdmins();
            fetchDashboardStats();
        } else {
            showNotification(`Failed to delete admin: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error deleting admin:', error);
        showNotification('Error deleting admin. Please try again.', false);
    });
}

function deleteDevice(deviceId) {
    fetch(`/api/superadmin-delete-device/${deviceId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getSuperAdminToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Device deleted successfully', true);
            fetchDevices();
            fetchDashboardStats();
        } else {
            showNotification(`Failed to delete device: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error deleting device:', error);
        showNotification('Error deleting device. Please try again.', false);
    });
}

// Block/Unblock functions
function blockUser(userId) {
    fetch('/api/block-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getSuperAdminToken()}`
        },
        body: JSON.stringify({ userId: userId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('User blocked successfully', true);
            fetchUsers();
        } else {
            showNotification(`Failed to block user: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error blocking user:', error);
        showNotification('Error blocking user. Please try again.', false);
    });
}

function unblockUser(userId) {
    fetch('/api/unblock-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getSuperAdminToken()}`
        },
        body: JSON.stringify({ userId: userId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('User unblocked successfully', true);
            fetchUsers();
        } else {
            showNotification(`Failed to unblock user: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error unblocking user:', error);
        showNotification('Error unblocking user. Please try again.', false);
    });
}

function blockAdmin(adminId) {
    fetch('/api/block-admin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getSuperAdminToken()}`
        },
        body: JSON.stringify({ adminId: adminId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Admin blocked successfully', true);
            fetchAdmins();
        } else {
            showNotification(`Failed to block admin: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error blocking admin:', error);
        showNotification('Error blocking admin. Please try again.', false);
    });
}

function unblockAdmin(adminId) {
    fetch('/api/unblock-admin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getSuperAdminToken()}`
        },
        body: JSON.stringify({ adminId: adminId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Admin unblocked successfully', true);
            fetchAdmins();
        } else {
            showNotification(`Failed to unblock admin: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error unblocking admin:', error);
        showNotification('Error unblocking admin. Please try again.', false);
    });
}

function unlinkDevice(deviceId) {
    fetch('/api/admin-unlink-device', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getSuperAdminToken()}`
        },
        body: JSON.stringify({ deviceId: deviceId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Device unlinked successfully', true);
            fetchDevices();
        } else {
            showNotification(`Failed to unlink device: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error unlinking device:', error);
        showNotification('Error unlinking device. Please try again.', false);
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    // Prevent back button access after logout
    preventBackButtonAccess();

    // Global click handler to close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    });

    // Initialize super admin greeting and profile
    const superAdminEmail = getSuperAdminEmail();
    if (superAdminEmail) {
        // Initialize profile data first, then update greeting with name
        initializeProfile();
    }

    // Sidebar navigation
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const contentSections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');

    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');

            // Handle logout
            if (section === 'logout') {
                logout();
                return;
            }

            // Remove active class from all items and sections
            sidebarItems.forEach(i => i.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));

            // Add active class to clicked item and corresponding section
            this.classList.add('active');
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Update page title
            const titles = {
                'dashboard': 'Dashboard',
                'accounts': 'Account Management',
                'devices': 'Device Management',
                'profile': 'Profile Settings'
            };
            pageTitle.textContent = titles[section] || 'Dashboard';

            // Load section-specific data
            if (section === 'dashboard') {
                fetchDashboardStats();
            } else if (section === 'accounts') {
                fetchAdmins();
                fetchUsers();
            } else if (section === 'devices') {
                fetchDevices();
            }
        });
    });

    // Tab switching for accounts section
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(`${tab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Load data for the active tab
            if (tab === 'admins') {
                fetchAdmins();
            } else if (tab === 'users') {
                fetchUsers();
            }
        });
    });

    // Profile tabs
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');

    profileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            profileTabs.forEach(t => t.classList.remove('active'));
            profileTabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(`${tabName}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Refresh devices button
    document.getElementById('refresh-devices-btn').addEventListener('click', function() {
        fetchDevices();
        showNotification('Device list refreshed', true);
    });

    // Profile functionality
    setupProfileFunctionality();

    // Initialize dashboard
    fetchDashboardStats();
});

// Function to initialize profile data
function initializeProfile() {
    const superAdminEmail = getSuperAdminEmail();
    if (superAdminEmail) {
        // Fetch profile data from server
        fetch('/api/superadmin-profile', {
            headers: {
                'Authorization': `Bearer ${getSuperAdminToken()}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const profile = data.profile;

                // Set profile data
                document.getElementById('profile-name').textContent = profile.name || 'Super Admins';
                document.getElementById('profile-email').textContent = profile.email;
                document.getElementById('profile-role').textContent = 'Super Admin';
                document.getElementById('profile-created').textContent = profile.created_at ?
                    `Joined on ${new Date(profile.created_at).toLocaleDateString()}` : 'Joined on 7/2/2025';

                // Update top nav to show name instead of email
                document.getElementById('superadmin-greeting').textContent = profile.name || 'Super Admins';

                // Set view mode data
                document.getElementById('view-name').textContent = profile.name || 'Super Admins';
                document.getElementById('view-email').textContent = profile.email;
                document.getElementById('view-bio').textContent = profile.bio || 'hiii';

                // Set form data
                document.getElementById('first-name').value = profile.name || 'Super Admins';
                document.getElementById('email').value = profile.email;
                document.getElementById('bio').value = profile.bio || 'hiii';

                // Set avatar if exists
                if (profile.profile_image) {
                    const avatarImg = document.querySelector('#profile-avatar img');
                    const avatarPlaceholder = document.querySelector('#profile-avatar .avatar-placeholder');

                    if (avatarImg) {
                        avatarImg.src = profile.profile_image;
                    } else {
                        // Create new img element
                        const img = document.createElement('img');
                        img.src = profile.profile_image;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';

                        // Hide placeholder and add image
                        if (avatarPlaceholder) {
                            avatarPlaceholder.style.display = 'none';
                        }
                        document.getElementById('profile-avatar').appendChild(img);
                    }

                    // Update top nav avatar
                    updateTopNavAvatar(profile.profile_image);
                }
            } else {
                // Fallback to default data
                setDefaultProfileData(superAdminEmail);
            }
        })
        .catch(error => {
            console.error('Error fetching profile:', error);
            setDefaultProfileData(superAdminEmail);
        });
    }
}

// Function to set default profile data
function setDefaultProfileData(email) {
    document.getElementById('profile-name').textContent = 'Super Admins';
    document.getElementById('profile-email').textContent = email;
    document.getElementById('profile-role').textContent = 'Super Admin';
    document.getElementById('profile-created').textContent = 'Joined on 7/2/2025';

    document.getElementById('view-name').textContent = 'Super Admins';
    document.getElementById('view-email').textContent = email;
    document.getElementById('view-bio').textContent = 'hiii';

    document.getElementById('first-name').value = 'Super Admins';
    document.getElementById('email').value = email;
    document.getElementById('bio').value = 'hiii';
}

// Function to update top navigation avatar
function updateTopNavAvatar(avatarSrc) {
    const topNavContainer = document.querySelector('.profile-info-top');
    if (topNavContainer) {
        // Remove existing icon
        const existingIcon = topNavContainer.querySelector('.profile-icon');
        if (existingIcon) {
            existingIcon.remove();
        }

        // Remove existing avatar
        const existingAvatar = topNavContainer.querySelector('.top-nav-avatar');
        if (existingAvatar) {
            existingAvatar.remove();
        }

        // Add new avatar image
        const avatarImg = document.createElement('img');
        avatarImg.src = avatarSrc;
        avatarImg.className = 'top-nav-avatar';
        avatarImg.style.width = '32px';
        avatarImg.style.height = '32px';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.objectFit = 'cover';
        avatarImg.style.border = '2px solid var(--primary-color)';

        // Insert before the text
        const textElement = topNavContainer.querySelector('#superadmin-greeting');
        topNavContainer.insertBefore(avatarImg, textElement);
    }
}

// Function to setup profile functionality
function setupProfileFunctionality() {
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-profile-btn');
    const changePasswordBtn = document.getElementById('new-change-password-btn');
    const profileForm = document.getElementById('personal-info-form');
    const viewMode = document.getElementById('profile-view-mode');
    const avatarUpload = document.getElementById('avatar-upload');
    const changeAvatarBtn = document.getElementById('change-avatar-btn');

    // Edit profile button
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            viewMode.style.display = 'none';
            profileForm.style.display = 'block';
        });
    }

    // Cancel edit button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            profileForm.style.display = 'none';
            viewMode.style.display = 'block';
        });
    }

    // Avatar upload functionality
    if (changeAvatarBtn && avatarUpload) {
        changeAvatarBtn.addEventListener('click', function() {
            avatarUpload.click();
        });

        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Check file size (limit to 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('Image size should be less than 5MB', false);
                    return;
                }

                // Compress and resize image
                compressImage(file, (compressedDataUrl) => {
                    const avatarImg = document.querySelector('#profile-avatar img');
                    const avatarPlaceholder = document.querySelector('#profile-avatar .avatar-placeholder');

                    if (avatarImg) {
                        avatarImg.src = compressedDataUrl;
                    } else {
                        // Create new img element
                        const img = document.createElement('img');
                        img.src = compressedDataUrl;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';

                        // Hide placeholder and add image
                        if (avatarPlaceholder) {
                            avatarPlaceholder.style.display = 'none';
                        }
                        document.getElementById('profile-avatar').appendChild(img);
                    }

                    // Update top nav avatar
                    updateTopNavAvatar(compressedDataUrl);

                    // Save avatar to server
                    saveAvatarToServer(compressedDataUrl);
                });
            }
        });
    }

    // Profile form submission
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const name = formData.get('first_name');
            const bio = formData.get('bio');

            // Send to server
            fetch('/api/update-superadmin-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getSuperAdminToken()}`
                },
                body: JSON.stringify({
                    name: name,
                    bio: bio
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update view mode
                    document.getElementById('view-name').textContent = name;
                    document.getElementById('view-bio').textContent = bio || 'No bio available';
                    document.getElementById('profile-name').textContent = name;

                    // Switch back to view mode
                    profileForm.style.display = 'none';
                    viewMode.style.display = 'block';

                    showNotification('Profile updated successfully', true);
                } else {
                    showNotification('Failed to update profile: ' + data.message, false);
                }
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                showNotification('Error updating profile. Please try again.', false);
            });
        });
    }

    // Change password button
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            const modal = document.getElementById('new-password-change-modal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }

    // Password change modal
    const passwordModal = document.getElementById('new-password-change-modal');
    const passwordForm = document.getElementById('new-password-change-form');
    const cancelPwdBtn = document.getElementById('cancel-pwd-modal-btn');

    if (cancelPwdBtn) {
        cancelPwdBtn.addEventListener('click', function() {
            passwordModal.classList.remove('show');
            document.body.style.overflow = '';
            passwordForm.reset();
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const currentPwd = document.getElementById('current-pwd').value;
            const newPwd = document.getElementById('new-pwd').value;
            const confirmPwd = document.getElementById('confirm-pwd').value;

            if (newPwd !== confirmPwd) {
                showNotification('New passwords do not match', false);
                return;
            }

            // Send to server for validation and update
            fetch('/api/change-superadmin-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getSuperAdminToken()}`
                },
                body: JSON.stringify({
                    currentPassword: currentPwd,
                    newPassword: newPwd
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Password changed successfully', true);
                    passwordModal.classList.remove('show');
                    document.body.style.overflow = '';
                    passwordForm.reset();
                } else {
                    showNotification('Failed to change password: ' + data.message, false);
                }
            })
            .catch(error => {
                console.error('Error changing password:', error);
                showNotification('Error changing password. Please try again.', false);
            });
        });
    }
}

// Function to compress image
function compressImage(file, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = function() {
        // Set canvas size (resize to max 300x300)
        const maxSize = 300;
        let { width, height } = img;

        if (width > height) {
            if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedDataUrl);
    };

    img.src = URL.createObjectURL(file);
}

// Function to save avatar to server
function saveAvatarToServer(avatarData) {
    fetch('/api/update-superadmin-avatar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getSuperAdminToken()}`
        },
        body: JSON.stringify({
            avatar: avatarData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Profile picture updated successfully', true);
        } else {
            showNotification('Failed to update profile picture: ' + data.message, false);
        }
    })
    .catch(error => {
        console.error('Error updating avatar:', error);
        showNotification('Error updating profile picture. Please try again.', false);
    });
}
