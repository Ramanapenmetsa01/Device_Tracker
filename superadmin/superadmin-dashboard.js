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

    fetch('/api/admin/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("superAdminToken")}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('Logout logged:', data);
        })
        .catch(error => {
            console.error('Error logging logout:', error);
        })
        .finally(() => {
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
        });
    
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
                loadActivityLogs(); // Load activity history for dashboard
                initializeActivityFilter(); // Initialize filter functionality
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
    loadActivityLogs(); // Load activity history on initial load
    initializeActivityFilter(); // Initialize filter functionality on initial load
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

// Activity Logs Functions for Super Admin
let currentActivities = [];
let currentActivityFilter = null;
let activityFilterDropdownOpen = false;

function loadActivityLogs(startDate = null, endDate = null) {
    console.log('loadActivityLogs called with:', { startDate, endDate });

    const superAdminEmail = getSuperAdminEmail();
    const superAdminToken = getSuperAdminToken();

    console.log('Super admin credentials:', { email: superAdminEmail, hasToken: !!superAdminToken });

    if (!superAdminEmail || !superAdminToken) {
        console.error('Missing super admin credentials');
        return;
    }

    let url = `/api/superadmin-activity-history?user_email=${encodeURIComponent(superAdminEmail)}`;
    if (startDate && endDate) {
        url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    }

    console.log('Fetching activity logs from URL:', url);

    fetch(url, {
        headers: {
            'Authorization': `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Activity logs response:', data);
        if (data.success) {
            currentActivities = data.activities; // Store for details access
            displayActivityLogs(data.activities);
            // Re-initialize filter functionality after loading activities
            initializeActivityFilter();
        } else {
            console.error('Error loading activity logs:', data.message);
            // Show error in UI
            const activityFeed = document.getElementById('activity-feed');
            if (activityFeed) {
                activityFeed.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Activities</h3>
                        <p>${data.message || 'Failed to load activity history'}</p>
                    </div>
                `;
            }
        }
    })
    .catch(error => {
        console.error('Error loading activity logs:', error);
        // Show error in UI
        const activityFeed = document.getElementById('activity-feed');
        if (activityFeed) {
            activityFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Network Error</h3>
                    <p>Failed to connect to server. Please try again.</p>
                </div>
            `;
        }
    });
}

function displayActivityLogs(activities) {
    const activityFeed = document.getElementById('activity-feed');

    if (!activityFeed) return;

    if (!activities || activities.length === 0) {
        activityFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No Activity Found</h3>
                <p>No activities match your current filter</p>
            </div>
        `;
        return;
    }

    activityFeed.innerHTML = '';

    // Remove any existing event listeners
    activityFeed.removeEventListener('click', handleActivityClick);

    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.setAttribute('data-activity-id', activity.id);
        activityItem.style.cursor = 'pointer';

        const icon = getActivityIcon(activity.action_type);
        const description = getActivityDescription(activity.action_type, activity.action_description, activity.target_entity);

        activityItem.innerHTML = `
            <div class="activity-icon ${activity.action_type}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-description">${description}</p>
                <p class="activity-time">${formatTimeAgo(activity.timestamp)}</p>
            </div>
        `;

        activityFeed.appendChild(activityItem);
    });

    // Use event delegation to handle clicks
    activityFeed.addEventListener('click', handleActivityClick);
}

function handleActivityClick(event) {
    // Stop event propagation to prevent conflicts
    event.stopPropagation();
    event.preventDefault();

    // Find the closest activity item
    const activityItem = event.target.closest('.activity-item');
    if (!activityItem) return;

    const activityId = activityItem.getAttribute('data-activity-id');

    if (activityId) {
        // Add a small delay to ensure any existing modals are properly removed
        setTimeout(() => {
            showActivityDetails(parseInt(activityId));
        }, 50);
    }
}

function showActivityDetails(activityId) {
    const activity = currentActivities.find(a => a.id === activityId);

    if (!activity) {
        return;
    }

    // Remove any existing activity modals only (don't interfere with other modals)
    const existingActivityModals = document.querySelectorAll('.activity-modal');
    existingActivityModals.forEach(modal => {
        // Properly clean up event listeners
        const escHandler = modal._escHandler;
        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
        }
        modal.remove();
    });

    const modal = document.createElement('div');
    modal.className = 'activity-modal';
    modal.id = 'activity-details-modal-' + Date.now();
    modal.style.cssText = `
        display: flex !important;
        position: fixed !important;
        z-index: 10001 !important;
        left: 0 !important;
        top: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(0, 0, 0, 0.5) !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 1 !important;
        visibility: visible !important;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="
            background-color: white !important;
            border-radius: 12px !important;
            padding: 30px !important;
            max-width: 500px !important;
            width: 90% !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
            position: relative !important;
        ">
            <button class="modal-close" onclick="this.closest('.activity-modal').remove()" style="
                position: absolute !important;
                top: 15px !important;
                right: 20px !important;
                background: none !important;
                border: none !important;
                font-size: 24px !important;
                color: #999 !important;
                cursor: pointer !important;
                padding: 5px !important;
                line-height: 1 !important;
            ">&times;</button>
            <h3 style="margin: 0 0 25px 0 !important; color: #333 !important; font-size: 24px !important;">Activity Details</h3>
            <div class="activity-details">
                <div class="activity-detail-row" style="display: flex !important; justify-content: space-between !important; padding: 12px 0 !important; border-bottom: 1px solid #f5f5f5 !important;">
                    <strong style="color: #555 !important; min-width: 120px !important;">Action Type:</strong>
                    <span style="color: #6c757d !important; text-align: right !important;">${activity.action_type}</span>
                </div>
                <div class="activity-detail-row" style="display: flex !important; justify-content: space-between !important; padding: 12px 0 !important; border-bottom: 1px solid #f5f5f5 !important;">
                    <strong style="color: #555 !important; min-width: 120px !important;">Description:</strong>
                    <span style="color: #6c757d !important; text-align: right !important;">${activity.action_description}</span>
                </div>
                <div class="activity-detail-row" style="display: flex !important; justify-content: space-between !important; padding: 12px 0 !important; border-bottom: 1px solid #f5f5f5 !important;">
                    <strong style="color: #555 !important; min-width: 120px !important;">User:</strong>
                    <span style="color: #6c757d !important; text-align: right !important;">${activity.user_name || activity.user_email}</span>
                </div>
                <div class="activity-detail-row" style="display: flex !important; justify-content: space-between !important; padding: 12px 0 !important; border-bottom: 1px solid #f5f5f5 !important;">
                    <strong style="color: #555 !important; min-width: 120px !important;">Role:</strong>
                    <span style="color: #6c757d !important; text-align: right !important;">${activity.user_role}</span>
                </div>
                <div class="activity-detail-row" style="display: flex !important; justify-content: space-between !important; padding: 12px 0 !important; border-bottom: 1px solid #f5f5f5 !important;">
                    <strong style="color: #555 !important; min-width: 120px !important;">Timestamp:</strong>
                    <span style="color: #6c757d !important; text-align: right !important;">${new Date(activity.timestamp).toLocaleString()}</span>
                </div>
                ${activity.target_entity ? `
                <div class="activity-detail-row" style="display: flex !important; justify-content: space-between !important; padding: 12px 0 !important; border-bottom: 1px solid #f5f5f5 !important;">
                    <strong style="color: #555 !important; min-width: 120px !important;">Target:</strong>
                    <span style="color: #6c757d !important; text-align: right !important;">${activity.target_entity}</span>
                </div>
                ` : ''}
                ${activity.ip_address ? `
                <div class="activity-detail-row" style="display: flex !important; justify-content: space-between !important; padding: 12px 0 !important; border-bottom: 1px solid #f5f5f5 !important;">
                    <strong style="color: #555 !important; min-width: 120px !important;">IP Address:</strong>
                    <span style="color: #6c757d !important; text-align: right !important;">${activity.ip_address}</span>
                </div>
                ` : ''}
            </div>
            <div class="modal-actions" style="margin-top: 25px !important; display: flex !important; justify-content: flex-end !important;">
                <button class="cancel-btn" onclick="this.closest('.activity-modal').remove()" style="
                    background-color: #6c757d !important;
                    color: white !important;
                    border: none !important;
                    padding: 10px 20px !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                ">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Force a reflow to ensure the modal is rendered
    modal.offsetHeight;

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Close modal with Escape key and store handler for cleanup
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    modal._escHandler = escHandler; // Store for cleanup
    document.addEventListener('keydown', escHandler);

    // Also clean up when modal is removed
    const originalRemove = modal.remove;
    modal.remove = function() {
        document.removeEventListener('keydown', escHandler);
        originalRemove.call(this);
    };
}

// Initialize activity filter functionality
function initializeActivityFilter() {
    const filterToggleBtn = document.getElementById('activity-filter-toggle-btn');
    const filterOptions = document.getElementById('activity-filter-options');
    const allBtn = document.getElementById('activity-filter-all-btn');
    const todayBtn = document.getElementById('activity-filter-today-btn');
    const yesterdayBtn = document.getElementById('activity-filter-yesterday-btn');
    const customBtn = document.getElementById('activity-filter-custom-btn');
    const customSection = document.getElementById('activity-custom-date-section');
    const applyCustomBtn = document.getElementById('activity-apply-custom-filter-btn');
    const cancelCustomBtn = document.getElementById('activity-cancel-custom-filter-btn');

    if (!filterToggleBtn || !filterOptions) {
        return;
    }

    // Remove existing event listeners to prevent duplicates
    const newFilterToggleBtn = filterToggleBtn.cloneNode(true);
    filterToggleBtn.parentNode.replaceChild(newFilterToggleBtn, filterToggleBtn);

    // Toggle filter dropdown
    newFilterToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activityFilterDropdownOpen = !activityFilterDropdownOpen;
        filterOptions.style.display = activityFilterDropdownOpen ? 'block' : 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!newFilterToggleBtn.contains(e.target) && !filterOptions.contains(e.target)) {
            activityFilterDropdownOpen = false;
            filterOptions.style.display = 'none';
            if (customSection) customSection.style.display = 'none';
        }
    });

    // Filter button event listeners - clone to remove existing listeners
    if (allBtn) {
        const newAllBtn = allBtn.cloneNode(true);
        allBtn.parentNode.replaceChild(newAllBtn, allBtn);
        newAllBtn.addEventListener('click', () => {
            applyActivityFilter('all');
            closeActivityFilterDropdown();
        });
    }

    if (todayBtn) {
        const newTodayBtn = todayBtn.cloneNode(true);
        todayBtn.parentNode.replaceChild(newTodayBtn, todayBtn);
        newTodayBtn.addEventListener('click', () => {
            applyActivityFilter('today');
            closeActivityFilterDropdown();
        });
    }

    if (yesterdayBtn) {
        const newYesterdayBtn = yesterdayBtn.cloneNode(true);
        yesterdayBtn.parentNode.replaceChild(newYesterdayBtn, yesterdayBtn);
        newYesterdayBtn.addEventListener('click', () => {
            applyActivityFilter('yesterday');
            closeActivityFilterDropdown();
        });
    }

    if (customBtn) {
        const newCustomBtn = customBtn.cloneNode(true);
        customBtn.parentNode.replaceChild(newCustomBtn, customBtn);
        newCustomBtn.addEventListener('click', () => {
            showActivityCustomDateInputs();
        });
    }

    if (applyCustomBtn) {
        const newApplyCustomBtn = applyCustomBtn.cloneNode(true);
        applyCustomBtn.parentNode.replaceChild(newApplyCustomBtn, applyCustomBtn);
        newApplyCustomBtn.addEventListener('click', () => {
            applyActivityCustomFilter();
            closeActivityFilterDropdown();
        });
    }

    if (cancelCustomBtn) {
        const newCancelCustomBtn = cancelCustomBtn.cloneNode(true);
        cancelCustomBtn.parentNode.replaceChild(newCancelCustomBtn, cancelCustomBtn);
        newCancelCustomBtn.addEventListener('click', () => {
            if (customSection) customSection.style.display = 'none';
        });
    }
}

function getActivityIcon(actionType) {
    const iconMap = {
        'login': 'fa-sign-in-alt',
        'logout': 'fa-sign-out-alt',
        'device_delete': 'fa-trash',
        'device_unlink': 'fa-unlink',
        'user_delete': 'fa-user-times',
        'user_block': 'fa-user-slash',
        'user_unblock': 'fa-user-check',
        'admin_delete': 'fa-user-times',
        'admin_block': 'fa-user-slash',
        'admin_unblock': 'fa-user-check',
        'profile_update': 'fa-user-edit',
        'password_change': 'fa-key'
    };
    return iconMap[actionType] || 'fa-info-circle';
}

function getActivityDescription(actionType, originalDescription, targetEntity) {
    // For super admin view, show their own activities + administrative actions
    const descriptions = {
        'login': 'You logged in successfully',
        'logout': 'You logged out',
        'profile_update': 'You updated your profile',
        'password_change': 'You changed your password',
        'device_delete': `You deleted device ${targetEntity || ''}`,
        'device_unlink': `You unlinked device ${targetEntity || ''}`,
        'user_delete': `You deleted user ${targetEntity || ''}`,
        'user_block': `You blocked user ${targetEntity || ''}`,
        'user_unblock': `You unblocked user ${targetEntity || ''}`,
        'admin_delete': `You deleted admin ${targetEntity || ''}`,
        'admin_block': `You blocked admin ${targetEntity || ''}`,
        'admin_unblock': `You unblocked admin ${targetEntity || ''}`
    };

    return descriptions[actionType] || originalDescription || 'Unknown activity';
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - activityTime) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return activityTime.toLocaleDateString();
    }
}

function applyActivityFilter(filterType) {
    currentActivityFilter = filterType;

    // Update active button
    document.querySelectorAll('.filter-option-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`activity-filter-${filterType}-btn`).classList.add('active');

    const now = new Date();
    let startDate = null;
    let endDate = null;

    switch (filterType) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
            break;
        case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
            endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();
            break;
        case 'all':
        default:
            startDate = null;
            endDate = null;
            break;
    }

    loadActivityLogs(startDate, endDate);
}

function showActivityCustomDateInputs() {
    const customSection = document.getElementById('activity-custom-date-section');

    if (customSection) {
        customSection.style.display = 'block';

        // Only set default values if inputs are empty
        const startInput = document.getElementById('activity-start-date');
        const endInput = document.getElementById('activity-end-date');

        if (startInput && endInput) {
            // Only set default values if the inputs are empty
            if (!startInput.value) {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                startInput.value = startOfDay.toISOString().slice(0, 16);
            }

            if (!endInput.value) {
                const now = new Date();
                endInput.value = now.toISOString().slice(0, 16);
            }
        }
    }
}

function applyActivityCustomFilter() {
    const startInput = document.getElementById('activity-start-date');
    const endInput = document.getElementById('activity-end-date');

    if (!startInput || !endInput) {
        console.error('Date inputs not found');
        return;
    }

    const startDateStr = startInput.value;
    const endDateStr = endInput.value;

    if (!startDateStr || !endDateStr) {
        alert('Please select both start and end dates');
        return;
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (startDate > endDate) {
        alert('Start date cannot be later than end date');
        return;
    }

    document.querySelectorAll('.filter-option-btn').forEach(btn => btn.classList.remove('active'));
    const customBtn = document.getElementById('activity-filter-custom-btn');
    if (customBtn) {
        customBtn.classList.add('active');
    }

    currentActivityFilter = 'custom';

    // Do NOT use toISOString() here if your backend expects local time
    // Either send as-is, or format properly
    const startLocal = startDateStr; // already in local timezone format
    const endLocal = endDateStr;

    loadActivityLogs(startLocal, endLocal);  // adjust this if your backend expects ISO
}

function closeActivityFilterDropdown() {
    const filterOptions = document.getElementById('activity-filter-options');
    const customSection = document.getElementById('activity-custom-date-section');

    if (filterOptions) filterOptions.style.display = 'none';
    if (customSection) customSection.style.display = 'none';
    activityFilterDropdownOpen = false;
}
