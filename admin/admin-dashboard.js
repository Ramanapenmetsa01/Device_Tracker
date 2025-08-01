// Function to get admin email from localStorage
function getAdminEmail() {
    return localStorage.getItem('adminEmail');
}
// Function to update the topbar profile image
function updateTopbarProfileImage(admin) {
    // Remove any existing profile images to prevent duplicates
    const existingProfileImages = document.querySelectorAll('.topbar .profile-image');
    existingProfileImages.forEach(img => img.remove());
    
    const profileDropdown = document.querySelector('.profile-dropdown');
    const adminGreeting = document.getElementById('admin-greeting');
    
    if (admin.profile_image) {
        // Create and add the new profile image
        const imgElement = document.createElement('img');
        imgElement.src = admin.profile_image;
        imgElement.alt = 'Profile';
        imgElement.className = 'profile-image';
        profileDropdown.insertBefore(imgElement, adminGreeting);
    } else {
        // Create and add the initial avatar
        const initials = admin.name ? admin.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AD';
        const initialDiv = document.createElement('div');
        initialDiv.className = 'profile-image initial-avatar';
        initialDiv.textContent = initials.charAt(0);
        profileDropdown.insertBefore(initialDiv, adminGreeting);
    }
}

// Function to fetch existing device IDs
function fetchExistingDevices() {
    fetch('/api/device-ids')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayExistingDevices(data.devices);
            } else {
                console.error('Failed to fetch device IDs:', data.message);
                const tbody = document.getElementById('existing-devices-tbody');
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Failed to load device IDs</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching device IDs:', error);
            const tbody = document.getElementById('existing-devices-tbody');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Error loading device IDs</td></tr>';
        });
}

// Function to display existing devices
function displayExistingDevices(devices) {
    const tbody = document.getElementById('existing-devices-tbody');
    tbody.innerHTML = '';
    
    if (devices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No device IDs found</td></tr>';
        return;
    }
    
    const currentAdmin = getAdminEmail();
    
    devices.forEach(device => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-device-id', device.device_id);
        tr.setAttribute('data-qr-code', device.qr_code_data);
        
        const createdDate = new Date(device.created_at).toLocaleString();
        const canDelete = device.created_by === currentAdmin;
        
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
                        ${canDelete ?
                            `<button class="dropdown-item delete-device-btn" data-device-id="${device.device_id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>` :
                            `<button class="dropdown-item" disabled style="opacity: 0.5; cursor: not-allowed;">
                                <i class="fas fa-trash"></i> Delete
                            </button>`
                        }
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
    document.querySelectorAll('.dropdown-toggle').forEach(button => {
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

    // Add event listeners for unlink buttons
    document.querySelectorAll('.unlink-device-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const deviceId = this.getAttribute('data-device-id');
            showUnlinkConfirmation(deviceId);
        });
    });

    // Add row click event listeners
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', function(e) {
            // Don't handle click if it was on action buttons
            if (e.target.closest('.action-dropdown')) return;
            
            // Remove selected class from all rows
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            
            // Add selected class to clicked row
            this.classList.add('selected');
            
            // Show QR code in preview
            const qrPreview = document.getElementById('qr-preview');
            qrPreview.innerHTML = this.getAttribute('data-qr-code');
            
            // Show QR preview actions
            const qrPreviewActions = document.getElementById('qr-preview-actions');
            if (qrPreviewActions) {
                qrPreviewActions.style.display = 'flex';
                
                // Set up copy button
                const copyBtn = document.getElementById('copy-device-id-btn');
                if (copyBtn) {
                    copyBtn.setAttribute('data-device-id', this.getAttribute('data-device-id'));
                }
                
                // Set up download button
                const downloadBtn = document.getElementById('download-qr-btn');
                if (downloadBtn) {
                    const deviceId = this.getAttribute('data-device-id');
                    const qrImg = qrPreview.querySelector('img');
                    
                    if (qrImg) {
                        downloadBtn.onclick = function() {
                            const a = document.createElement('a');
                            a.href = qrImg.src;
                            a.download = `DeviceID-${deviceId}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            
                            showNotification('QR code downloaded', true);
                        };
                    }
                }
            }
        });
    });
    
    // Add delete button event listeners
    tbody.querySelectorAll('.delete-device-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent row click event
            const deviceId = this.getAttribute('data-device-id');
            showDeleteConfirmation(deviceId, 'device', deleteDevice);
        });
    });


}

document.addEventListener('DOMContentLoaded', function() {
    // Prevent back button access after logout
    preventBackButtonAccess();

    // Initialize the topbar profile image when the page loads
    initializeTopbarProfile();

    // Global click handler to close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    });

    // Hide the delete confirmation modal on page load
    // Sidebar navigation
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    // New password change modal functionality
    const changePasswordBtn = document.getElementById('new-change-password-btn');
    const passwordModal = document.getElementById('new-password-change-modal');
    const passwordForm = document.getElementById('new-password-change-form');
    const cancelPwdBtn = document.getElementById('cancel-pwd-modal-btn');
    
    if (changePasswordBtn && passwordModal) {
        // Show modal when button is clicked
        changePasswordBtn.addEventListener('click', function() {
            console.log('Change password button clicked');
            console.log('Modal before:', passwordModal.classList);
            passwordModal.classList.add('active');
            
            // Force display properties
            passwordModal.style.display = 'flex';
            passwordModal.style.visibility = 'visible';
            passwordModal.style.opacity = '1';
            
            // Check modal-content positioning
            const modalContent = passwordModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.position = 'relative';
                modalContent.style.zIndex = '3001';
            }
            
            console.log('Modal after:', passwordModal.classList);
        });
        
        // Hide modal when cancel button is clicked
        if (cancelPwdBtn) {
            cancelPwdBtn.addEventListener('click', function(e) {
                // Force modal to close with both class and style changes
                passwordModal.classList.remove('active');
                passwordModal.style.display = 'none';
                passwordForm.reset();
                e.stopPropagation(); // Prevent event bubbling
            });
        }
        
        // Close modal when clicking outside
        passwordModal.addEventListener('click', function(e) {
            if (e.target === passwordModal) {
                console.log('Clicked outside modal');
                passwordModal.classList.remove('active');
                passwordModal.style.display = 'none';
                passwordForm.reset();
            }
        });
        
        // Handle form submission
        if (passwordForm) {
            passwordForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const currentPassword = document.getElementById('current-pwd').value;
                const newPassword = document.getElementById('new-pwd').value;
                const confirmPassword = document.getElementById('confirm-pwd').value;
                
                if (newPassword !== confirmPassword) {
                    showNotification('New passwords do not match', false);
                    return;
                }
                
                const adminEmail = getAdminEmail();
                
                fetch('/api/admin-password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify({
                    email: adminEmail,
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification('Password updated successfully', true);
                        passwordForm.reset();
                        // Force modal to close with both class and style changes
                        passwordModal.classList.remove('active');
                        passwordModal.style.display = 'none';
                    } else {
                        showNotification(`Failed to update password: ${data.message}`, false);
                    }
                })
                .catch(error => {
                    console.error('Error updating password:', error);
                    showNotification('Error updating password', false);
                });
            });
        }
    }

    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            
            // Handle logout
            if (section === 'logout') {
                logout();
                return;
            }
            
            // Update active sidebar item
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content section
            contentSections.forEach(s => s.classList.remove('active'));
            document.getElementById(`${section}-section`)?.classList.add('active');
        });
    });

    // Tab navigation for Device ID section
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab content
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${tab}-tab`)?.classList.add('active');
            
            // Load existing devices when switching to that tab
            if (tab === 'existing') {
                fetchExistingDevices();
            }
        });
    });

    // Device ID Generator
    const generateBtn = document.getElementById('generate-btn');
    const numDevicesInput = document.getElementById('num-devices');
    const generatedDevicesContainer = document.getElementById('generated-devices');

    // Function to fetch and display the latest 2 devices (with QR and ID)
    function fetchAndDisplayRecentQRCodes() {
        const container = document.getElementById('generated-devices');
        container.innerHTML = '';
        fetch('/api/recent-device-ids')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.devices.length) {
                    data.devices.forEach(device => {
                        const card = document.createElement('div');
                        card.className = 'device-card';
                        // Device ID
                        const idDisplay = document.createElement('div');
                        idDisplay.className = 'device-id';
                        idDisplay.textContent = device.device_id;
                        // QR code
                        const qrContainer = document.createElement('div');
                        qrContainer.className = 'qr-code';
                        qrContainer.innerHTML = device.qr_code_data;
                        // Action buttons
                        const actions = document.createElement('div');
                        actions.className = 'device-actions';
                        // Copy button
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'copy-btn';
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        copyBtn.addEventListener('click', () => {
                            navigator.clipboard.writeText(device.device_id)
                                .then(() => showNotification('Device ID copied to clipboard', true))
                                .catch(() => showNotification('Failed to copy Device ID', false));
                        });
                        // Download button
                        const downloadBtn = document.createElement('button');
                        downloadBtn.className = 'download-btn';
                        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download QR';
                        downloadBtn.addEventListener('click', () => {
                            const img = qrContainer.querySelector('img');
                            if (!img) return;
                            const a = document.createElement('a');
                            a.href = img.src;
                            a.download = `DeviceID-${device.device_id}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            showNotification('QR code downloaded', true);
                        });
                        actions.appendChild(copyBtn);
                        actions.appendChild(downloadBtn);
                        // Assemble card
                        card.appendChild(idDisplay);
                        card.appendChild(qrContainer);
                        card.appendChild(actions);
                        container.appendChild(card);
                    });
                } else {
                    container.innerHTML += '<p class="no-recent-devices">No recent devices</p>';
                }
            });
    }

    // Call this on page load
    // Also fetch existing devices on page load
    fetchAndDisplayRecentQRCodes();
    fetchExistingDevices();

    // After generating a device, refresh the recent QR codes
    generateBtn.addEventListener('click', function() {
        const numDevices = parseInt(numDevicesInput.value) || 1;
        if (numDevices < 1 || numDevices > 100) {
            showNotification('Please enter a number between 1 and 100', false);
            return;
        }
        generateDeviceIDs(numDevices); // This only sends to backend, does not update UI directly
        showNotification(`Successfully generated ${numDevices} device ID${numDevices > 1 ? 's' : ''}`, true);
        // Only update UI after a short delay to ensure DB is updated
        setTimeout(fetchAndDisplayRecentQRCodes, 100);
    });

    

    // Function to generate device IDs
function generateDeviceIDs(count) {
    const adminEmail = getAdminEmail();
    
    fetch('/api/generate-device-ids', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            count: count,
            adminEmail: adminEmail
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`Successfully generated ${count} device ID(s)`);
        } else {
            console.error('Failed to generate device IDs:', data.message);
        }
    })
    .catch(error => {
        console.error('Error generating device IDs:', error);
    });
}

   

    // Create a device card with QR code
    function createDeviceCard(deviceID) {
        const card = document.createElement('div');
        card.className = 'device-card';
        
        // Create device ID display
        const idDisplay = document.createElement('div');
        idDisplay.className = 'device-id';
        idDisplay.textContent = deviceID;
        
        const qrContainer = document.createElement('div');
        qrContainer.className = 'qr-code';
        
        // Store device ID in database and get QR code
        storeDeviceID(deviceID, null);
        
        // Create action buttons
        const actions = document.createElement('div');
        actions.className = 'device-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(deviceID)
                .then(() => showNotification('Device ID copied to clipboard', true))
                .catch(() => showNotification('Failed to copy Device ID', false));
        });
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download QR';
        downloadBtn.addEventListener('click', () => {
            // Get the QR code image
            const img = qrContainer.querySelector('img');
            if (!img) return;
            
            // Create a temporary link to download the image
            const a = document.createElement('a');
            a.href = img.src;
            a.download = `DeviceID-${deviceID}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            showNotification('QR code downloaded', true);
        });
        
        actions.appendChild(copyBtn);
        actions.appendChild(downloadBtn);
        
        // Assemble the card
        card.appendChild(idDisplay);
        card.appendChild(qrContainer);
        card.appendChild(actions);
    }

  
 function fetchAndDisplayAdminName() {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
        console.error('Admin email not found in localStorage');
        return;
    }
    
    fetch(`/api/admin-info?email=${encodeURIComponent(adminEmail)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const adminGreeting = document.getElementById('admin-greeting');
                adminGreeting.textContent = `${data.admin.name}`;
                
                // Update the profile image in the top navigation bar
                updateTopbarProfileImage(data.admin);
            } else {
                console.error('Failed to fetch admin info:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching admin info:', error);
        });
} 

// Function to initialize the top navigation bar profile image
function initializeTopbarProfile() {
    const adminEmail = getAdminEmail();
    
    if (!adminEmail) {
        console.error('Admin email not found in localStorage');
        return;
    }
    
    fetch(`/api/admin-profile?email=${encodeURIComponent(adminEmail)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateTopbarProfileImage(data.admin);
            } else {
                console.error('Failed to fetch admin profile:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching admin profile for topbar:', error);
        });
}

    // Function to fetch and display dashboard statistics
    function fetchAndDisplayDashboardStats() {
        fetch('/api/dashboard-stats')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update total users count
                    const totalUsersElement = document.getElementById('total-users-count');
                    totalUsersElement.textContent = data.stats.userCount;
                    
                    // Update total devices count
                    const totalDevicesElement = document.getElementById('total-devices-count');
                    totalDevicesElement.textContent = data.stats.deviceCount;
                    
                    // Update linked devices count
                    const linkedDevicesElement = document.getElementById('linked-devices-count');
                    linkedDevicesElement.textContent = data.stats.linkedDeviceCount;
                } else {
                    console.error('Failed to fetch dashboard stats:', data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching dashboard stats:', error);
            });
    }

    fetchAndDisplayAdminName();
    fetchAndDisplayDashboardStats();
    initializeTopbarProfile();
    
    // Modify the storeDeviceID function to include the admin's email
    function storeDeviceID(deviceID, qrCodeData) {
        const adminEmail = getAdminEmail();
        
        fetch('/api/device-ids', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deviceId: deviceID,
                qrCodeData: qrCodeData,
                adminEmail: adminEmail
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Device ID stored in database');
            } else {
                console.error('Failed to store device ID:', data.message);
            }
        })
        .catch(error => {
            console.error('Error storing device ID:', error);
        });
    }
    
    // Function to fetch existing device IDs
       // Set up copy device ID button
    const copyDeviceIdBtn = document.getElementById('copy-device-id-btn');
    if (copyDeviceIdBtn) {
        copyDeviceIdBtn.addEventListener('click', function() {
            const deviceId = this.getAttribute('data-device-id');
            if (deviceId) {
                navigator.clipboard.writeText(deviceId)
                    .then(() => showNotification('Device ID copied to clipboard', true))
                    .catch(() => showNotification('Failed to copy Device ID', false));
            }
        });
    }

    // Add event listener for refresh button
    const refreshBtn = document.getElementById('refresh-devices-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchExistingDevices);
    }

    // Profile tab navigation
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');
    
    profileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            profileTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab content
            profileTabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Edit profile button
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            toggleProfileEditMode(true);
        });
    }
    
    // Cancel edit button
    const cancelProfileBtn = document.getElementById('cancel-profile-btn');
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', function() {
            toggleProfileEditMode(false);
        });
    }
    
    // Personal info form submission
    const personalInfoForm = document.getElementById('personal-info-form');
    if (personalInfoForm) {
        personalInfoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            updateAdminProfile(formData);
        });
    }
    
    // Security form submission
    const securityForm = document.getElementById('security-form');
    if (securityForm) {
        securityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (newPassword !== confirmPassword) {
                showNotification('New passwords do not match', false);
                return;
            }
            
            const adminEmail = getAdminEmail();
            
            fetch('/api/admin-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({
                    email: adminEmail,
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Password updated successfully', true);
                    securityForm.reset();
                } else {
                    showNotification(`Failed to update password: ${data.message}`, false);
                }
            })
            .catch(error => {
                console.error('Error updating password:', error);
                showNotification('Error updating password', false);
            });
        });
    }

   
    // Avatar upload
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    
    if (changeAvatarBtn && avatarUpload) {
        changeAvatarBtn.addEventListener('click', function() {
            avatarUpload.click();
        });
        
        avatarUpload.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const adminToken = localStorage.getItem('adminToken');
                if (!adminToken) {
                    showNotification('You are not authenticated. Please log in again.', false);
                    return;
                }
                
                const formData = new FormData();
                formData.append('profile_image', this.files[0]); 
                formData.append('email', getAdminEmail());
                
                fetch('/api/admin-profile-image', { 
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: formData
                })
                .then(response => {
                    // Add check for response status
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        showNotification('Profile picture updated', true);
                        fetchAdminProfile(); 
                    } else {
                        showNotification(`Failed to update profile picture: ${data.message}`, false);
                    }
                })
                .catch(error => {
                    console.error('Error updating profile picture:', error);
                    showNotification('Error updating profile picture', false);
                });
            }
        });
    }
    
    // Fetch admin profile when profile section is clicked
const profileSidebarItem = document.querySelector('.sidebar-item[data-section="profile"]');
if (profileSidebarItem) {

    profileSidebarItem.addEventListener('click', fetchAdminProfile);
}

    if (document.querySelector('#profile-section').classList.contains('active')) {
        fetchAdminProfile();
    }
})

// Function to fetch users from the database
function fetchUsers() {
    fetch('/api/users')
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
    const tbody = document.querySelector('#users-section .user-table tbody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" class="no-users">No users found</td>';
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

    // Add event listeners to delete buttons
    tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-id');
            const userName = this.getAttribute('data-name');
            showDeleteConfirmation(userId, 'user', deleteUser);
        });
    });

    // Add event listeners to block buttons
    tbody.querySelectorAll('.block-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-id');
            const userName = this.getAttribute('data-name');
            showBlockConfirmation(userId, userName);
        });
    });

    // Add event listeners to unblock buttons
    tbody.querySelectorAll('.unblock-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-id');
            const userName = this.getAttribute('data-name');
            showUnblockConfirmation(userId, userName);
        });
    });
}


// Call fetchUsers when the Users section is clicked
document.querySelector('.sidebar-item[data-section="users"]').addEventListener('click', fetchUsers);

// Also fetch users on page load if the Users section is active
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('#users-section').classList.contains('active')) {
        fetchUsers();
    }
});

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
        // Close the modal
        closeDeleteModal();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeDeleteModal();
        }
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

// Function to delete a user
function deleteUser(userId) {
    // Show loading state
    const deleteBtn = document.querySelector(`.action-btn.delete[data-id="${userId}"]`);
    if (deleteBtn) {
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        deleteBtn.disabled = true;
    }
    
    fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, true);
            fetchUsers(); // Refresh the user list
            fetchExistingDevices(); // Refresh the device list to show unassigned devices
        } else {
            showNotification(`Failed to delete user: ${data.message}`, false);
            // Reset button state
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.disabled = false;
            }
        }
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user. Please try again.', false);
        // Reset button state
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.disabled = false;
        }
    });
}


// Function to fetch admin profile data
function fetchAdminProfile() {
    const adminEmail = getAdminEmail();
    
    if (!adminEmail) {
        console.error('Admin email not found in localStorage');
        return;
    }
    
    fetch(`/api/admin-profile?email=${encodeURIComponent(adminEmail)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayAdminProfile(data.admin);
                fetchProfileStats(); // Get stats for the profile card
            } else {
                console.error('Failed to fetch admin profile:', data.message);
                showNotification('Failed to load profile data', false);
            }
        })
        .catch(error => {
            console.error('Error fetching admin profile:', error);
            showNotification('Error loading profile data', false);
        });
}

// Function to fetch profile stats (user count and device count)
function fetchProfileStats() {
    fetch('/api/dashboard-stats', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Add null checks before setting textContent
            const userCountElement = document.getElementById('user-count');
            const deviceCountElement = document.getElementById('device-count');
            
            if (userCountElement) userCountElement.textContent = data.stats.userCount || 0;
            if (deviceCountElement) deviceCountElement.textContent = data.stats.deviceCount || 0;
        }
    })
    .catch(error => {
        console.error('Error fetching profile stats:', error);
    });
}

// Function to display admin profile data
function displayAdminProfile(admin) {
    // Update profile summary card
    document.getElementById('profile-name').textContent = admin.name || 'No Name';
    document.getElementById('profile-email').textContent = 'Mail: '+admin.email || 'No Email';
    document.getElementById('profile-role').textContent = 'Role: '+  admin.role|| 'Admin';

    
    // Add creation date if available
    if (admin.created_at) {
        const createdDate = new Date(admin.created_at).toLocaleDateString("en-GB");
        document.getElementById('profile-created').textContent = `Joined on: ${createdDate}`;
    }
    
    // Update view mode fields
    document.getElementById('view-name').textContent = admin.name || 'Not set';
    document.getElementById('view-email').textContent = admin.email || 'Not set';
    document.getElementById('view-bio').textContent = admin.bio || 'No bio available';
    
    // Update form fields
    document.getElementById('first-name').value = admin.name || '';
    document.getElementById('email').value = admin.email || '';
    document.getElementById('bio').value = admin.bio || '';
    
    // Set avatar if available
    if (admin.profile_image) {
        const avatarContainer = document.getElementById('profile-avatar');
        avatarContainer.innerHTML = `
            <img src="${admin.profile_image}" alt="${admin.name}" class="profile-image" onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\'avatar-placeholder\'>' + (admin.name ? admin.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AD') + '</div>';">
        `;
    } else {
        // Set initials in avatar placeholder
        const initials = admin.name ? admin.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AD';
        const avatarPlaceholder = document.querySelector('.avatar-placeholder');
        if (avatarPlaceholder) {
            avatarPlaceholder.textContent = initials;
        }
    }
    
    // Update the topbar profile image
    updateTopbarProfileImage(admin);
}

// Function to toggle between edit mode and view mode
function toggleProfileEditMode(editMode) {
    const viewMode = document.getElementById('profile-view-mode');
    const editForm = document.getElementById('personal-info-form');
    
    if (editMode) {
        // Enable edit mode
        viewMode.style.display = 'none';
        editForm.style.display = 'block';
    } else {
        // Enable view mode
        viewMode.style.display = 'block';
        editForm.style.display = 'none';
    }
}

// Function to update admin profile
function updateAdminProfile(formData) {
    const adminEmail = getAdminEmail();
    
    fetch('/api/admin-profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: adminEmail,
            name: formData.get('first_name'),
            bio: formData.get('bio')
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Profile updated successfully', true);
            fetchAdminProfile(); // Refresh the profile data
            toggleProfileEditMode(false); // Switch back to view mode
        } else {
            showNotification(`Failed to update profile: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile', false);
    });
}

// Function to fetch users from the database
function fetchUsers() {
    fetch('/api/users')
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





// Function to delete a device
function deleteDevice(deviceId) {
    // Show loading state
    const deleteBtn = document.querySelector(`.delete-device-btn[data-device-id="${deviceId}"]`);
    if (deleteBtn) {
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        deleteBtn.disabled = true;
    }
    
    const adminEmail = getAdminEmail();
    fetch(`/api/device-ids/${deviceId}?adminEmail=${encodeURIComponent(adminEmail)}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Device deleted successfully', true);
            fetchExistingDevices(); // Refresh the device list
            
            // Clear QR preview if the deleted device was selected
            const selectedRow = document.querySelector('#existing-devices-tbody tr.selected');
            if (selectedRow && selectedRow.getAttribute('data-device-id') === deviceId) {
                const qrPreview = document.getElementById('qr-preview');
                qrPreview.innerHTML = '<p class="select-device-message">Select a device to view QR code</p>';
                
                const qrPreviewActions = document.getElementById('qr-preview-actions');
                if (qrPreviewActions) {
                    qrPreviewActions.style.display = 'none';
                }
            }
        } else {
            showNotification(`Failed to delete device: ${data.message}`, false);
            // Reset button state
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
                deleteBtn.disabled = false;
            }
        }
    })
    .catch(error => {
        console.error('Error deleting device:', error);
        showNotification('Error deleting device. Please try again.', false);
        // Reset button state
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.disabled = false;
        }
    });
}

// Function to show unlink confirmation (copied from delete confirmation pattern)
function showUnlinkConfirmation(deviceId) {
    const modal = document.getElementById('unlink-confirmation');
    const confirmBtn = document.getElementById('confirm-unlink-btn');
    const cancelBtn = document.getElementById('cancel-unlink-btn');

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
        // Call the unlink function
        unlinkDevice(deviceId);

        // Close the modal
        closeUnlinkModal();
    });

    // Add event listener for cancel button
    newCancelBtn.addEventListener('click', function() {
        // Close the modal
        closeUnlinkModal();
    });

    // Function to close the modal
    function closeUnlinkModal() {
        modal.classList.remove('show');
        document.body.style.overflow = originalOverflow;
    }

    // Add escape key handler
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeUnlinkModal();
            document.removeEventListener('keydown', escHandler);
        }
    };

    document.addEventListener('keydown', escHandler);
}

// Function to unlink a device
function unlinkDevice(deviceId) {
    // Show loading state
    const unlinkBtn = document.querySelector(`.unlink-device-btn[data-device-id="${deviceId}"]`);
    if (unlinkBtn) {
        unlinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlinking...';
        unlinkBtn.disabled = true;
    }

    fetch('/api/admin-unlink-device', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
            deviceId: deviceId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Device unlinked successfully', true);
            // Refresh the device list
            fetchExistingDevices();
        } else {
            showNotification(`Failed to unlink device: ${data.message}`, false);
            // Reset button state
            if (unlinkBtn) {
                unlinkBtn.innerHTML = '<i class="fas fa-unlink"></i> Unlink';
                unlinkBtn.disabled = false;
            }
        }
    })
    .catch(error => {
        console.error('Error unlinking device:', error);
        showNotification('Error unlinking device. Please try again.', false);
        // Reset button state
        if (unlinkBtn) {
            unlinkBtn.innerHTML = '<i class="fas fa-unlink"></i> Unlink';
            unlinkBtn.disabled = false;
        }
    });
}

// Prevent back button access after logout
function preventBackButtonAccess() {
    // Check if admin is authenticated using admin-specific keys
    const adminEmail = localStorage.getItem('adminEmail');
    const adminToken = localStorage.getItem('adminToken');

    if (!adminEmail || !adminToken) {
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
    const adminToken = localStorage.getItem('adminToken');

    // Call logout API to log the activity before clearing tokens
    if (adminToken) {
        fetch('/api/admin/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
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
            // Clear authentication data and redirect regardless of API call result
            clearAuthAndRedirect();
        });
    } else {
        // No token, just clear and redirect
        clearAuthAndRedirect();
    }
}

function clearAuthAndRedirect() {
    // Clear only admin-specific authentication data
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminToken');

    // Clear admin session storage
    sessionStorage.removeItem('adminEmail');
    sessionStorage.removeItem('adminToken');

    // Clear browser history to prevent back button access
    if (window.history && window.history.pushState) {
        window.history.pushState(null, null, '../index.html');
    }

    // Redirect to login page
    window.location.replace('../index.html');
}

// Function to show block confirmation (using modal popup)
function showBlockConfirmation(userId, userName) {
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
        blockUser(userId);
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

// Function to show unblock confirmation (using modal popup)
function showUnblockConfirmation(userId, userName) {
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
        unblockUser(userId);
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

// Function to block a user
function blockUser(userId) {
    fetch('/api/block-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
            userId: userId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('User blocked successfully', true);
            // Refresh the user list
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

// Function to unblock a user
function unblockUser(userId) {
    fetch('/api/unblock-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
            userId: userId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('User unblocked successfully', true);
            // Refresh the user list
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

// Activity Logs Functions for Admin
let currentActivities = [];
let currentActivityFilter = null;
let activityFilterDropdownOpen = false;

function loadActivityLogs(startDate = null, endDate = null) {
    const adminEmail = getAdminEmail();
    const adminToken = localStorage.getItem('adminToken');

    if (!adminEmail || !adminToken) return;

    let url = '/api/activity-logs?limit=100'; // Show more activities
    if (startDate && endDate) {
        url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    }

    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentActivities = data.activities; // Store for details access
            displayActivityLogs(data.activities);
            // Re-initialize filter functionality after loading activities
            initializeActivityFilter();
        } else {
            console.error('Error loading activity logs:', data.message);
        }
    })
    .catch(error => {
        console.error('Error loading activity logs:', error);
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
        const description = getActivityDescription(activity.action_type, activity.action_description, activity.target_entity, activity.user_name);

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

function getActivityIcon(actionType) {
    const iconMap = {
        'login': 'fa-sign-in-alt',
        'logout': 'fa-sign-out-alt',
        'device_create': 'fa-plus-circle',
        'device_delete': 'fa-trash',
        'device_link': 'fa-link',
        'device_unlink': 'fa-unlink',
        'user_create': 'fa-user-plus',
        'user_delete': 'fa-user-minus',
        'user_block': 'fa-user-lock',
        'user_unblock': 'fa-user-check',
        'profile_update': 'fa-user-edit',
        'password_change': 'fa-key'
    };
    return iconMap[actionType] || 'fa-info-circle';
}

function getActivityDescription(actionType, originalDescription, targetEntity, userName) {
    // For admin view, since they only see their own activities, use "You"
    const descriptions = {
        'login': 'You logged in successfully',
        'logout': 'You logged out',
        'device_create': `You created device ${targetEntity || ''}`,
        'device_delete': `You deleted device ${targetEntity || ''}`,
        'device_link': `You linked device ${targetEntity || ''}`,
        'device_unlink': `You unlinked device ${targetEntity || ''}`,
        'user_create': `You created user ${targetEntity || ''}`,
        'user_delete': `You deleted user ${targetEntity || ''}`,
        'user_block': `You blocked user ${targetEntity || ''}`,
        'user_unblock': `You unblocked user ${targetEntity || ''}`,
        'profile_update': 'You updated your profile',
        'password_change': 'You changed your password'
    };
    return descriptions[actionType] || originalDescription;
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - activityTime) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

function showActivityDetails(activityId) {

    const activity = currentActivities.find(a => a.id === activityId);


    if (!activity) {
        console.error('Activity not found for ID:', activityId);
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
    modal.className = 'activity-modal'; // Use different class to avoid conflicts
    modal.id = 'activity-details-modal-' + Date.now(); // Unique ID
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
        if (!filterToggleBtn.contains(e.target) && !filterOptions.contains(e.target)) {
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

function closeActivityFilterDropdown() {
    activityFilterDropdownOpen = false;
    const filterOptions = document.getElementById('activity-filter-options');
    const customSection = document.getElementById('activity-custom-date-section');
    if (filterOptions) filterOptions.style.display = 'none';
    if (customSection) customSection.style.display = 'none';
}

function showActivityCustomDateInputs() {
    const customSection = document.getElementById('activity-custom-date-section');
    const startDate = document.getElementById('activity-filter-start-date');
    const endDate = document.getElementById('activity-filter-end-date');

    if (customSection) {
        customSection.style.display = 'block';

        // Set default values
        if (startDate && endDate) {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const yesterdayEnd = new Date(yesterday);
            yesterdayEnd.setHours(23, 59, 59, 999);

            startDate.value = yesterday.toISOString().slice(0, 16);
            endDate.value = yesterdayEnd.toISOString().slice(0, 16);
        }
    }
}

function applyActivityFilter(filterType) {
    updateActivityFilterButtons(filterType);

    if (filterType === 'all') {
        currentActivityFilter = null;
        loadActivityLogs();
        updateActivityFilterButtonState('All');
    } else if (filterType === 'today') {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');

        const todayStart = `${year}-${month}-${date} 00:00:00`;
        const todayEnd = `${year}-${month}-${date} 23:59:59`;

        currentActivityFilter = { startDate: todayStart, endDate: todayEnd, type: 'today' };
        loadActivityLogs(todayStart, todayEnd);
        updateActivityFilterButtonState('Today');
    } else if (filterType === 'yesterday') {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const date = String(yesterday.getDate()).padStart(2, '0');

        const yesterdayStart = `${year}-${month}-${date} 00:00:00`;
        const yesterdayEnd = `${year}-${month}-${date} 23:59:59`;

        currentActivityFilter = { startDate: yesterdayStart, endDate: yesterdayEnd, type: 'yesterday' };
        loadActivityLogs(yesterdayStart, yesterdayEnd);
        updateActivityFilterButtonState('Yesterday');
    }
}

function applyActivityCustomFilter() {
    const startInput = document.getElementById('activity-filter-start-date');
    const endInput = document.getElementById('activity-filter-end-date');

    if (!startInput.value || !endInput.value) {
        showNotification('Please select both start and end dates', false);
        return;
    }

    const startDate = new Date(startInput.value);
    const endDate = new Date(endInput.value);

    if (startDate >= endDate) {
        showNotification('End date must be after start date', false);
        return;
    }

    // Format dates for IST - treat the input as local time (IST)
    const startIST = startInput.value.replace('T', ' ') + ':00';
    const endIST = endInput.value.replace('T', ' ') + ':59';

    currentActivityFilter = { startDate: startIST, endDate: endIST, type: 'custom' };
    loadActivityLogs(startIST, endIST);
    updateActivityFilterButtons('custom');
    updateActivityFilterButtonState('Custom');
}

function updateActivityFilterButtons(activeType) {
    const buttons = ['all', 'today', 'yesterday', 'custom'];
    buttons.forEach(type => {
        const btn = document.getElementById(`activity-filter-${type}-btn`);
        if (btn) {
            if (type === activeType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

function updateActivityFilterButtonState(filterType) {
    const filterBtn = document.getElementById('activity-filter-toggle-btn');
    if (!filterBtn) return;

    if (filterType && filterType !== 'All') {
        filterBtn.innerHTML = `<i class="fas fa-filter"></i> ${filterType}`;
        filterBtn.classList.remove('btn-secondary');
        filterBtn.classList.add('btn-success');
    } else {
        filterBtn.innerHTML = '<i class="fas fa-filter"></i> Filter';
        filterBtn.classList.remove('btn-success');
        filterBtn.classList.add('btn-secondary');
    }
}

// Initialize activity logs when dashboard section is shown
document.addEventListener('DOMContentLoaded', function() {
    // Load activity logs when dashboard section is active
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection && dashboardSection.classList.contains('active')) {
        loadActivityLogs();
        initializeActivityFilter();
    }

    // Load activity logs when dashboard sidebar item is clicked
    const dashboardSidebarItem = document.querySelector('.sidebar-item[data-section="dashboard"]');
    if (dashboardSidebarItem) {
        dashboardSidebarItem.addEventListener('click', function() {
            setTimeout(() => {
                loadActivityLogs();
                initializeActivityFilter();
            }, 100);
        });
    }
});
