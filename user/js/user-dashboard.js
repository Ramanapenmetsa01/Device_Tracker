// User Dashboard JavaScript

// Global variables
let currentUser = null;
let qrScanner = null;
let isScanning = false;

// Utility functions
function getUserEmail() {
    return localStorage.getItem('userEmail');
}

function getUserToken() {
    return localStorage.getItem('userToken');
}

// showNotification function is now available from notification.js

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Prevent back button access after logout
    preventBackButtonAccess();

    // Check if user is logged in
    const userEmail = getUserEmail();
    const token = getUserToken();

    if (!userEmail || !token) {
        window.location.href = '../index.html';
        return;
    }

    console.log('User logged in successfully, initializing dashboard');

    // Initialize components
    initializeSidebar();
    initializeProfile();
    initializeDevices();
    initializeTracker();
    initializeMobileMenu();
    loadDashboardData();
    loadActivityLogs();
    initializeActivityFilter();

    // Initialize filter controls will be done when tracker section is shown

    // Password change modal functionality (copied from admin)
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordModal = document.getElementById('password-change-modal');
    const passwordForm = document.getElementById('password-change-form');
    const cancelPwdBtn = document.getElementById('cancel-password-btn');
    const closeModalBtn = document.getElementById('close-password-modal');

    if (changePasswordBtn && passwordModal) {
        // Show modal when button is clicked
        changePasswordBtn.addEventListener('click', function() {

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

        // Hide modal when close button is clicked
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function(e) {
                passwordModal.classList.remove('active');
                passwordModal.style.display = 'none';
                passwordForm.reset();
                e.stopPropagation();
            });
        }

        // Close modal when clicking outside
        passwordModal.addEventListener('click', function(e) {
            if (e.target === passwordModal) {

                passwordModal.classList.remove('active');
                passwordModal.style.display = 'none';
                passwordForm.reset();
            }
        });

        // Handle form submission
        if (passwordForm) {
            passwordForm.addEventListener('submit', function(e) {
                e.preventDefault();

                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;

                if (newPassword !== confirmPassword) {
                    showNotification('New passwords do not match', false);
                    return;
                }

                const userEmail = getUserEmail();

                fetch('/api/user-password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getUserToken()}`
                    },
                    body: JSON.stringify({
                        email: userEmail,
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

    // Unlink modal functionality (copied from password modal pattern)
    const unlinkModal = document.getElementById('unlink-confirmation-modal');
    const confirmUnlinkBtn = document.getElementById('confirm-unlink-btn');
    const cancelUnlinkBtn = document.getElementById('cancel-unlink-btn');
    const closeUnlinkBtn = document.getElementById('close-unlink-modal');

    if (unlinkModal) {
        // Ensure modal starts hidden
        unlinkModal.style.display = 'none';
        unlinkModal.classList.remove('active');

        // Hide modal when cancel button is clicked
        if (cancelUnlinkBtn) {
            cancelUnlinkBtn.addEventListener('click', function(e) {
                unlinkModal.classList.remove('active');
                unlinkModal.style.display = 'none';
                deviceToUnlink = null;
                e.stopPropagation();
            });
        }

        // Hide modal when close button is clicked
        if (closeUnlinkBtn) {
            closeUnlinkBtn.addEventListener('click', function(e) {
                unlinkModal.classList.remove('active');
                unlinkModal.style.display = 'none';
                deviceToUnlink = null;
                e.stopPropagation();
            });
        }

        // Close modal when clicking outside
        unlinkModal.addEventListener('click', function(e) {
            if (e.target === unlinkModal) {
                unlinkModal.classList.remove('active');
                unlinkModal.style.display = 'none';
                deviceToUnlink = null;
            }
        });

        // Handle confirm button
        if (confirmUnlinkBtn) {
            confirmUnlinkBtn.addEventListener('click', function(e) {
                e.preventDefault();

                if (deviceToUnlink) {
                    unlinkModal.classList.remove('active');
                    unlinkModal.style.display = 'none';

                    // Perform unlink
                    performUnlink(deviceToUnlink);
                    deviceToUnlink = null;
                }
            });
        }
    }

    // Load initial data
    fetchUserProfile();
    fetchDashboardStats();
    fetchLinkedDevices();


});

// Sidebar navigation
function initializeSidebar() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const contentSections = document.querySelectorAll('.content-section');
    
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
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Load section-specific data
                if (section === 'devices') {
                    fetchLinkedDevices();
                } else if (section === 'profile') {
                    fetchUserProfile();
                } else if (section === 'tracker') {
                    handleSectionChange('tracker');
                }
            }
        });
    });
}

// Prevent back button access after logout
function preventBackButtonAccess() {
    // Check if user is authenticated using user-specific keys
    const userEmail = localStorage.getItem('userEmail');
    const userToken = localStorage.getItem('userToken');

    if (!userEmail || !userToken) {
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
    const userToken = getUserToken();

    // Call logout API to log the activity
    if (userToken) {
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(() => {
            // Continue with logout process regardless of API response
            performLogout();
        })
        .catch(() => {
            // Continue with logout even if API call fails
            performLogout();
        });
    } else {
        performLogout();
    }
}

function performLogout() {
    // Clear only user-specific authentication data
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userToken');

    // Clear user session storage
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userToken');

    // Clear browser history to prevent back button access
    if (window.history && window.history.pushState) {
        window.history.pushState(null, null, '../index.html');
    }

    // Redirect to login page
    window.location.replace('../index.html');
}

// Initialize mobile menu
function initializeMobileMenu() {
    // Add mobile menu toggle functionality
    const topbar = document.querySelector('.topbar');
    const sidebar = document.querySelector('.sidebar');

    // Create mobile menu button (hidden by default)
    const menuButton = document.createElement('div');
    menuButton.className = 'mobile-menu-btn';
    menuButton.innerHTML = '☰';
    menuButton.style.cssText = `
        display: none !important;
        font-size: 20px;
        cursor: pointer;
        color: var(--primary-color);
        margin-right: 15px;
        padding: 5px;
        user-select: none;
    `;

    // Create mobile overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);

    // Insert menu button at the beginning of topbar
    topbar.insertBefore(menuButton, topbar.firstChild);

    // Show menu button on mobile
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    function handleMediaQuery(e) {
        if (e.matches) {
            menuButton.style.setProperty('display', 'block', 'important');
            // Apply mobile styles to sidebar
            sidebar.style.left = '-250px';
            sidebar.style.transition = 'left 0.3s ease';
        } else {
            menuButton.style.setProperty('display', 'none', 'important');
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            // Reset sidebar to desktop position - remove all inline styles
            sidebar.removeAttribute('style');
        }
    }

    mediaQuery.addEventListener('change', handleMediaQuery);
    handleMediaQuery(mediaQuery);

    // Toggle sidebar on menu button click
    menuButton.addEventListener('click', function() {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
    });

    // Close sidebar when clicking on overlay
    overlay.addEventListener('click', function() {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
    });

    // Close sidebar when clicking on a menu item on mobile
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            }
        });
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        }
    });
}

// Load dashboard data
function loadDashboardData() {
    fetchDashboardStats();
}

// Fetch dashboard statistics
function fetchDashboardStats() {
    const userEmail = getUserEmail();

    fetch(`/api/user-stats?email=${encodeURIComponent(userEmail)}`, {
        headers: {
            'Authorization': `Bearer ${getUserToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('linked-devices-count').textContent = data.stats.linkedDevices || 0;
        }
    })
    .catch(error => {
        console.error('Error fetching dashboard stats:', error);
        // Set default values on error
        document.getElementById('linked-devices-count').textContent = '0';
    });
}



// Initialize profile functionality
function initializeProfile() {
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const profileForm = document.getElementById('profile-edit-form');
    const viewMode = document.getElementById('profile-view-mode');
    const editMode = document.getElementById('profile-edit-mode');
    const avatarUpload = document.getElementById('avatar-upload');
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    
    // Edit profile button
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            viewMode.style.display = 'none';
            editMode.style.display = 'block';
            editBtn.style.display = 'none';
            
            // Populate edit form with current data
            document.getElementById('edit-name').value = document.getElementById('view-name').textContent;
            document.getElementById('edit-email').value = document.getElementById('view-email').textContent;
            document.getElementById('edit-bio').value = document.getElementById('view-bio').textContent;
        });
    }
    
    // Cancel edit button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            editMode.style.display = 'none';
            viewMode.style.display = 'block';
            editBtn.style.display = 'inline-flex';
        });
    }
    
    // Profile form submission
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateUserProfile();
        });
    }
    
    // Avatar upload
    if (changeAvatarBtn && avatarUpload) {
        changeAvatarBtn.addEventListener('click', function() {
            avatarUpload.click();
        });
        
        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                uploadAvatar(file);
            }
        });
    }
}

// Fetch user profile
function fetchUserProfile() {
    const userEmail = getUserEmail();
    
    fetch(`/api/user-profile?email=${encodeURIComponent(userEmail)}`, {
        headers: {
            'Authorization': `Bearer ${getUserToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayUserProfile(data.user);
            updateTopbarProfile(data.user);
        }
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
    });
}

// Display user profile data
function displayUserProfile(user) {
    currentUser = user;
    
    // Update profile information
    document.getElementById('profile-name').textContent = user.name || 'No Name';
    document.getElementById('profile-email').textContent = user.email || 'No Email';
    document.getElementById('profile-role').textContent = 'User';
    
    // Update view mode
    document.getElementById('view-name').textContent = user.name || 'No Name';
    document.getElementById('view-email').textContent = user.email || 'No Email';
    document.getElementById('view-bio').textContent = user.bio || 'No bio available';
    
    // Update creation date
    if (user.created_at) {
        const createdDate = new Date(user.created_at).toLocaleDateString("en-GB");
        document.getElementById('profile-created').textContent = `Joined on: ${createdDate}`;
    }
    
    // Update avatar
    updateAvatar(user);
}

// Update avatar display
function updateAvatar(user) {
    const avatarContainer = document.getElementById('profile-avatar');
    
    if (user.profile_image) {
        avatarContainer.innerHTML = `
            <img src="${user.profile_image}" alt="${user.name}" class="profile-image" 
                 onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'avatar-placeholder\\'>' + 
                 (user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'US') + '</div>';">
        `;
    } else {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'US';
        avatarContainer.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
    }
}

// Update topbar profile
function updateTopbarProfile(user) {
    const profileDropdown = document.querySelector('.profile-dropdown');
    const userGreeting = document.getElementById('user-greeting');
    
    // Update greeting
    userGreeting.textContent = user.name || 'User';
    
    // Remove existing profile image
    const existingImage = profileDropdown.querySelector('.profile-image, .initial-avatar');
    if (existingImage) {
        existingImage.remove();
    }
    
    // Add new profile image or initials
    if (user.profile_image) {
        const imgElement = document.createElement('img');
        imgElement.src = user.profile_image;
        imgElement.alt = 'Profile';
        imgElement.className = 'profile-image';
        profileDropdown.insertBefore(imgElement, userGreeting);
    } else {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'US';
        const initialDiv = document.createElement('div');
        initialDiv.className = 'initial-avatar';
        initialDiv.textContent = initials.charAt(0);
        profileDropdown.insertBefore(initialDiv, userGreeting);
    }
}

// Update user profile
function updateUserProfile() {
    const userEmail = getUserEmail();
    const formData = {
        email: userEmail,
        name: document.getElementById('edit-name').value,
        bio: document.getElementById('edit-bio').value
    };

    fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getUserToken()}`
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Profile updated successfully', true);

            // Refresh profile display
            fetchUserProfile();

            // Switch back to view mode
            document.getElementById('profile-edit-mode').style.display = 'none';
            document.getElementById('profile-view-mode').style.display = 'block';
            document.getElementById('edit-profile-btn').style.display = 'inline-flex';
        } else {
            showNotification(`Failed to update profile: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile', false);
    });
}

// Upload avatar
function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('email', getUserEmail());

    fetch('/api/user-avatar', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getUserToken()}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Avatar updated successfully', true);
            fetchUserProfile(); // Refresh to show new avatar
        } else {
            showNotification(`Failed to update avatar: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error uploading avatar:', error);
        showNotification('Error uploading avatar', false);
    });
}



// Initialize devices functionality
function initializeDevices() {
    const scanQrBtn = document.getElementById('scan-qr-btn');
    const stopScannerBtn = document.getElementById('stop-scanner-btn');
    const addDeviceBtn = document.getElementById('add-device-btn');
    const refreshBtn = document.getElementById('refresh-linked-devices-btn');
    const uploadQrBtn = document.getElementById('upload-qr-btn');
    const qrImageUpload = document.getElementById('qr-image-upload');

    // QR Scanner
    if (scanQrBtn) {
        scanQrBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            openQRScanner();
        });
    } else {
        console.error('QR Scanner button not found!');
    }

    if (stopScannerBtn) {
        stopScannerBtn.addEventListener('click', stopQRScanner);
    }

    const closeQrModal = document.getElementById('close-qr-modal');
    if (closeQrModal) {
        closeQrModal.addEventListener('click', closeQRScanner);
    }

    // Close modal when clicking outside
    const qrModal = document.getElementById('qr-scanner-modal');
    if (qrModal) {
        qrModal.addEventListener('click', function(e) {
            if (e.target === qrModal) {
                closeQRScanner();
            }
        });
    }

    // Manual device addition
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', addDeviceManually);
    }

    // Refresh devices
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchLinkedDevices);
    }

    // Enter key for device input
    const deviceInput = document.getElementById('device-id-input');
    if (deviceInput) {
        deviceInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addDeviceManually();
            }
        });
    }

    // Image QR Upload functionality
    if (uploadQrBtn && qrImageUpload) {
        uploadQrBtn.addEventListener('click', function() {
            if (qrImageUpload.files && qrImageUpload.files[0]) {
                scanQRFromImage(qrImageUpload.files[0]);
            } else {
                showNotification('Please select an image file first', false);
            }
        });

        // Auto-scan when file is selected
        qrImageUpload.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                scanQRFromImage(this.files[0]);
            }
        });
    }
}

// Scan QR code from uploaded image
function scanQRFromImage(file) {
    // Show loading notification
    showNotification('Scanning image for QR code...', true);

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', false);
        return;
    }

    // Create image element
    const img = new Image();
    img.onload = function() {
        // Create canvas to draw image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Scan for QR code using jsQR library
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        if (qrCode) {
            // Extract device ID from QR code data
            const deviceId = qrCode.data;


            showNotification('QR Code detected! Linking device...', true);

            // Link the device
            linkDeviceFromQR(deviceId);
        } else {
            showNotification('No QR code found in image', false);
        }
    };

    img.onerror = function() {
        showNotification('Error loading image', false);
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Link device from QR code (shared function for camera and image scanning)
function linkDeviceFromQR(deviceId) {
    const userEmail = getUserEmail();

    fetch('/api/link-device', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getUserToken()}`
        },
        body: JSON.stringify({
            deviceId: deviceId,
            userEmail: userEmail
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Device linked successfully!', true);

            // Refresh the linked devices list and dashboard stats
            fetchLinkedDevices();
            fetchDashboardStats();

            // Clear the file input
            const fileInput = document.getElementById('qr-image-upload');
            if (fileInput) fileInput.value = '';
        } else {
            showNotification(`Failed to link device: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error linking device:', error);
        showNotification('Error linking device', false);
    });
}

// Open QR Scanner Modal
function openQRScanner() {
    // Remove any existing modal first
    const existingModal = document.getElementById('qr-scanner-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Always create fresh modal
    createQRModal();

    // Start camera after modal is shown
    setTimeout(() => {
        startQRScanner();
    }, 200);
}

// Create QR Modal dynamically
function createQRModal() {
    const modal = document.createElement('div');
    modal.id = 'qr-scanner-modal';

    // Set styles directly on the modal element
    modal.style.cssText = `
        display: flex !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: rgba(0,0,0,0.8) !important;
        z-index: 99999 !important;
        justify-content: center !important;
        align-items: center !important;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 0; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #f0f0f0;">
                <h2 style="margin: 0; color: #333;"><i class="fas fa-qrcode"></i> QR Code Scanner</h2>
                <button onclick="closeQRScanner()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
            </div>
            <div style="padding: 20px; text-align: center;">
                <video id="qr-video" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: 8px; background: black;"></video>
                <div style="margin-top: 20px;">
                    <button onclick="closeQRScanner()" style="background:rgb(251, 24, 24); color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-stop"></i> Stop Scanner
                    </button>
                </div>
                <p style="margin-top: 15px; color: #666; font-size: 14px;">Position the QR code in front of the camera</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

// Start QR Scanner
function startQRScanner() {
    const video = document.getElementById('qr-video');
    isScanning = true;

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    })
    .then(function(stream) {
        video.srcObject = stream;
        video.play();
        scanQRCode();
    })
    .catch(function(err) {
        console.error('Error accessing camera:', err);
        showNotification('Error accessing camera. Please check permissions.', false);
        closeQRScanner();
    });
}

// Stop QR Scanner
function stopQRScanner() {
    closeQRScanner();
}

// Close QR Scanner Modal
function closeQRScanner() {
    const video = document.getElementById('qr-video');
    const modal = document.getElementById('qr-scanner-modal');


    isScanning = false;

    // Stop all video tracks
    if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
        });
        video.srcObject = null;
    }

    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// Scan QR Code
function scanQRCode() {
    const video = document.getElementById('qr-video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    function tick() {
        if (!isScanning) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                closeQRScanner();
                linkDeviceFromQR(code.data);
                return;
            }
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

// Add device manually
function addDeviceManually() {
    const deviceInput = document.getElementById('device-id-input');
    const userInput = deviceInput.value.trim().replace(/-/g, "");
    const deviceId= userInput.match(/.{1,4}/g).join("-");
    console.log(deviceId)
    if (!deviceId) {
        showNotification('Please enter a device ID', false);
        return;
    }

    linkDeviceFromQR(deviceId);
    deviceInput.value = '';
}



// Fetch linked devices
function fetchLinkedDevices() {
    const userEmail = getUserEmail();

    fetch(`/api/user-devices?email=${encodeURIComponent(userEmail)}`, {
        headers: {
            'Authorization': `Bearer ${getUserToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayLinkedDevices(data.devices);
        }
    })
    .catch(error => {
        console.error('Error fetching linked devices:', error);
        displayLinkedDevices([]);
    });
}

// Display linked devices
function displayLinkedDevices(devices) {
    const tbody = document.getElementById('linked-devices-tbody');

    if (devices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px;">
                    <div class="empty-state">
                        <i class="fas fa-microchip"></i>
                        <h3>No Devices Linked</h3>
                        <p>Add your first device using QR scan or manual entry</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = devices.map(device => {
        const linkedDate = new Date(device.linked_at).toLocaleDateString('en-GB');


        return `
            <tr>
                <td>${device.device_id}</td>
                <td>${linkedDate}</td>
                <td>
                    <button class="action-btn delete" onclick="unlinkDevice('${device.device_id}')">
                        <i class="fas fa-unlink"></i> Unlink
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Global variable to store device ID for unlinking
let deviceToUnlink = null;

// Unlink device - show confirmation modal
function unlinkDevice(deviceId) {
    const unlinkModal = document.getElementById('unlink-confirmation-modal');
    const deviceIdSpan = document.getElementById('unlink-device-id');

    if (!unlinkModal) {
        // Fallback to confirm
        if (confirm(`Are you sure you want to unlink device: ${deviceId}?\n\nThis action cannot be undone.`)) {
            performUnlink(deviceId);
        }
        return;
    }

    // Store device ID globally for the confirm function
    deviceToUnlink = deviceId;

    // Set device ID in modal
    if (deviceIdSpan) {
        deviceIdSpan.textContent = deviceId;
    }

    // Show modal
    unlinkModal.classList.add('active');
    unlinkModal.style.display = 'flex';
    unlinkModal.style.visibility = 'visible';
    unlinkModal.style.opacity = '1';

    // Check modal-content positioning
    const modalContent = unlinkModal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.position = 'relative';
        modalContent.style.zIndex = '3001';
    }
}


// Perform actual unlink operation
function performUnlink(deviceId) {
    const userEmail = getUserEmail();

    fetch('/api/unlink-device', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getUserToken()}`
        },
        body: JSON.stringify({
            userEmail: userEmail,
            deviceId: deviceId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Device unlinked successfully', true);
            fetchLinkedDevices();
            fetchDashboardStats(); // Refresh stats
        } else {
            showNotification(`Failed to unlink device: ${data.message}`, false);
        }
    })
    .catch(error => {
        console.error('Error unlinking device:', error);
        showNotification('Error unlinking device', false);
    });
}

// Make unlinkDevice globally available
window.unlinkDevice = unlinkDevice;

// Tracker functionality
let trackingMap = null;
let currentDeviceMarkers = [];
let currentPath = null;
let selectedDevice = null;

function initializeTracker() {
    // Initialize map when tracker section is first shown
    const trackerSection = document.getElementById('tracker-section');
    if (!trackerSection) return;

    // Load trackable devices
    loadTrackableDevices();

    // Event listeners
    const deviceSelect = document.getElementById('tracked-device-select');
    const refreshBtn = document.getElementById('refresh-devices-btn');
    const showPathBtn = document.getElementById('show-path-btn');
    const clearPathBtn = document.getElementById('clear-path-btn');
    const recenterBtn = document.getElementById('recenter-btn');

    if (deviceSelect) {
        deviceSelect.addEventListener('change', function() {
            selectedDevice = this.value;
            if (selectedDevice) {
                loadDeviceLocations(selectedDevice);
            } else {
                clearMap();
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadTrackableDevices);
    }

    if (showPathBtn) {
        showPathBtn.addEventListener('click', showDevicePath);
    }

    if (clearPathBtn) {
        clearPathBtn.addEventListener('click', clearDevicePath);
    }

    if (recenterBtn) {
        recenterBtn.addEventListener('click', recenterToLatestPoint);
    }

    // Initialize filter controls
    initializeFilterControls();
}

function initializeMap() {
    if (trackingMap) return; // Map already initialized

    const mapContainer = document.getElementById('tracking-map');
    if (!mapContainer) return;

    // Initialize Leaflet map
    trackingMap = L.map('tracking-map').setView([40.7128, -74.0060], 10); // Default to NYC

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(trackingMap);

}

function loadTrackableDevices() {
    const userEmail = getUserEmail();
    if (!userEmail) return;

    const deviceSelect = document.getElementById('tracked-device-select');
    if (!deviceSelect) return;

    deviceSelect.innerHTML = '<option value="">Loading devices...</option>';

    fetch(`/api/user-trackable-devices?user_email=${encodeURIComponent(userEmail)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                deviceSelect.innerHTML = '<option value="">Select a device to track</option>';

                if (data.devices.length === 0) {
                    deviceSelect.innerHTML = '<option value="">No devices available for tracking</option>';
                    return;
                }

                data.devices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.device_id;
                    option.textContent = `${device.device_id} (${device.location_count} locations)`;
                    deviceSelect.appendChild(option);
                });
            } else {
                deviceSelect.innerHTML = '<option value="">Error loading devices</option>';
                showNotification('Error loading trackable devices', false);
            }
        })
        .catch(error => {
            console.error('Error loading trackable devices:', error);
            deviceSelect.innerHTML = '<option value="">Error loading devices</option>';
            showNotification('Error loading trackable devices', false);
        });
}

function loadDeviceLocations(deviceId) {
    const userEmail = getUserEmail();
    if (!userEmail || !deviceId) return;

    // Initialize map if not already done
    if (!trackingMap) {
        initializeMap();
    }

    fetch(`/api/device-locations/${deviceId}?user_email=${encodeURIComponent(userEmail)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayLocationsOnMap(data.locations);
                updateLocationHistory(data.locations);
            } else {
                showNotification(data.message || 'Error loading device locations', false);
            }
        })
        .catch(error => {
            console.error('Error loading device locations:', error);
            showNotification('Error loading device locations', false);
        });
}

function displayLocationsOnMap(locations) {
    if (!trackingMap) return;
    // Clear existing markers and paths
    clearMap();

    // Store current displayed locations for path creation
    currentDisplayedLocations = locations;

    if (locations.length === 0) {
        showNotification('No locations found for this device', false);
        return;
    }

    // Automatically create and show path for any number of locations
    if (locations.length >= 1) {
        createPathFromLocations(locations);
    }

    // Fit map to show all content
    if (currentPath) {
        if (currentPath.singleMarker) {
            // For single location, center on the marker
            const latLng = currentPath.singleMarker.getLatLng();
            trackingMap.setView(latLng, 15);
        } else if (currentPath.getBounds) {
            // For multiple locations, fit bounds
            trackingMap.fitBounds(currentPath.getBounds().pad(0.1));
        }
    }
}

function createPathFromLocations(locations) {
    // Create path from locations
    const validLocations = locations
        .filter(loc => parseFloat(loc.latitude) !== 0 || parseFloat(loc.longitude) !== 0)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const pathCoordinates = validLocations.map(loc => [parseFloat(loc.latitude), parseFloat(loc.longitude)]);

    if (pathCoordinates.length === 1) {
        // Single location - show as a regular marker
        const singlePoint = pathCoordinates[0];
        const location = validLocations[0];

        const singleMarker = L.marker(singlePoint).addTo(trackingMap);

        // Create popup content for single location
        const popupContent = `
            <div>
                <strong>Single Location</strong><br>
                <strong>Coordinates:</strong> ${singlePoint[0]}, ${singlePoint[1]}<br>
                <strong>Time:</strong> ${new Date(location.timestamp).toLocaleString()}
            </div>
        `;

        singleMarker.bindPopup(popupContent);

        // Store as currentPath for cleanup
        currentPath = {
            singleMarker: singleMarker
        };

    } else if (pathCoordinates.length > 1) {
        // Multiple locations - create path with start/end markers

        // Create the path line
        currentPath = L.polyline(pathCoordinates, {
            color: '#e74c3c',
            weight: 4,
            opacity: 0.8
        }).addTo(trackingMap);

        // Add start point marker (green pointer) - only for multiple points
        const startPoint = pathCoordinates[0];
        const startMarker = L.marker(startPoint, {
            icon: L.divIcon({
                className: 'start-point-marker',
                html: '<div class="custom-marker-pointer start-marker"><div class="marker-content">S</div></div>',
                iconSize: [30, 40],
                iconAnchor: [15, 40], // Point to the bottom tip of the pin
                popupAnchor: [0, -40]
            })
        }).addTo(trackingMap);

        // Add end point marker (red pointer) - only for multiple points
        const endPoint = pathCoordinates[pathCoordinates.length - 1];
        const endMarker = L.marker(endPoint, {
            icon: L.divIcon({
                className: 'end-point-marker',
                html: '<div class="custom-marker-pointer end-marker"><div class="marker-content">E</div></div>',
                iconSize: [30, 40],
                iconAnchor: [15, 40], // Point to the bottom tip of the pin
                popupAnchor: [0, -40]
            })
        }).addTo(trackingMap);

        // Store markers for cleanup
        if (!currentPath.startEndMarkers) {
            currentPath.startEndMarkers = [];
        }
        currentPath.startEndMarkers.push(startMarker, endMarker);

        // Automatically show intermediate points if there are more than 2 points
        if (pathCoordinates.length > 2) {
            showIntermediatePoints(locations);
        }
    }
}

function updateLocationHistory(locations) {
    const locationList = document.getElementById('location-list');

    if (!locationList) return;

    if (locations.length === 0) {
        locationList.innerHTML = '<div class="location-item">No locations recorded for this device</div>';
        return;
    }

    locationList.innerHTML = '';

    // Sort locations by timestamp (newest first) and show only recent 5
    const sortedLocations = [...locations]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    sortedLocations.forEach(location => {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);

        const locationItem = document.createElement('div');
        locationItem.className = 'location-item';

        locationItem.innerHTML = `
            <div class="location-coords">${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
            <div class="location-time">${new Date(location.timestamp).toLocaleString()}</div>
        `;

        locationList.appendChild(locationItem);
    });


}





// Store current displayed locations for path creation
let currentDisplayedLocations = [];

function showIntermediatePoints(locations) {
    if (!trackingMap || !currentPath) return;

    // Clear existing intermediate points
    clearIntermediatePoints();

    // Add intermediate points as colored circles (excluding start and end)
    const sortedLocations = locations
        .filter(loc => parseFloat(loc.latitude) !== 0 || parseFloat(loc.longitude) !== 0)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (sortedLocations.length > 2) {
        // Store intermediate points for cleanup
        if (!currentPath.intermediatePoints) {
            currentPath.intermediatePoints = [];
        }

        // Skip first and last points (start and end)
        const intermediateLocations = sortedLocations.slice(1, -1);

        intermediateLocations.forEach((location, index) => {
            const lat = parseFloat(location.latitude);
            const lng = parseFloat(location.longitude);

            // Create beautiful colored circle marker for intermediate points
            const circleMarker = L.circleMarker([lat, lng], {
                radius: 10,
                fillColor: '#3498db',
                color: '#2c3e50',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(trackingMap);

            // Create popup content
            const popupContent = `
                <div style="text-align: center;">
                    <strong>Intermediate Point ${index + 1}</strong><br>
                    <strong>Coordinates:</strong> ${lat}, ${lng}<br>
                    <strong>Time:</strong> ${new Date(location.timestamp).toLocaleString()}
                </div>
            `;

            circleMarker.bindPopup(popupContent);
            currentPath.intermediatePoints.push(circleMarker);
        });
    }
}

function showDevicePath() {
    if (!trackingMap || !selectedDevice) {
        showNotification('Please select a device first', false);
        return;
    }

    // Use currently displayed locations (filtered or all)
    if (currentDisplayedLocations.length === 0) {
        showNotification('No locations to show points for', false);
        return;
    }

    if (currentDisplayedLocations.length <= 2) {
        showNotification('Need more than 2 points to show intermediate points', false);
        return;
    }

    // Show intermediate points
    showIntermediatePoints(currentDisplayedLocations);

    const filterText = currentFilter ? ' (filtered)' : '';
    const intermediateCount = currentDisplayedLocations.length - 2; // Exclude start and end
    showNotification(`Showing ${intermediateCount} intermediate points${filterText}`, true);
}

function clearIntermediatePoints() {
    if (currentPath && currentPath.intermediatePoints) {
        currentPath.intermediatePoints.forEach(point => {
            trackingMap.removeLayer(point);
        });
        currentPath.intermediatePoints = [];
    }
}

function clearDevicePath() {
    if (currentPath && trackingMap) {
        // Remove intermediate points if they exist
        clearIntermediatePoints();

        showNotification('Intermediate points hidden', true);
    }
}

function recenterToLatestPoint() {
    if (!trackingMap || !selectedDevice) {
        showNotification('Please select a device first', false);
        return;
    }

    if (!currentDisplayedLocations || currentDisplayedLocations.length === 0) {
        showNotification('No locations available to recenter', false);
        return;
    }

    // Get the latest (most recent) location
    const sortedLocations = currentDisplayedLocations
        .filter(loc => parseFloat(loc.latitude) !== 0 || parseFloat(loc.longitude) !== 0)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by newest first

    if (sortedLocations.length > 0) {
        const latestLocation = sortedLocations[0];
        const lat = parseFloat(latestLocation.latitude);
        const lng = parseFloat(latestLocation.longitude);

        // Center map on latest point with appropriate zoom
        trackingMap.setView([lat, lng], 15);

        const locationText = sortedLocations.length === 1 ? 'single location' : 'latest location';
        showNotification(`Map centered on ${locationText}`, true);
    } else {
        showNotification('No valid locations to recenter to', false);
    }
}

function clearMap() {
    if (!trackingMap) return;

    // Remove all markers
    currentDeviceMarkers.forEach(marker => {
        trackingMap.removeLayer(marker);
    });
    currentDeviceMarkers = [];

    // Remove path and all associated markers
    if (currentPath) {
        // Remove single marker if it exists
        if (currentPath.singleMarker) {
            trackingMap.removeLayer(currentPath.singleMarker);
        }

        // Remove start/end markers if they exist
        if (currentPath.startEndMarkers) {
            currentPath.startEndMarkers.forEach(marker => {
                trackingMap.removeLayer(marker);
            });
            currentPath.startEndMarkers = [];
        }

        // Remove intermediate points if they exist
        if (currentPath.intermediatePoints) {
            currentPath.intermediatePoints.forEach(point => {
                trackingMap.removeLayer(point);
            });
            currentPath.intermediatePoints = [];
        }

        // Remove the path (if it's a polyline)
        if (currentPath.removeFrom || currentPath._map) {
            trackingMap.removeLayer(currentPath);
        }

        currentPath = null;
    }
}

// Initialize map when tracker section becomes visible
function handleSectionChange(sectionName) {
    if (sectionName === 'tracker') {
        // Initialize filter controls when tracker section is shown
        initializeFilterControls();

        if (!trackingMap) {
            // Small delay to ensure the container is visible
            setTimeout(() => {
                initializeMap();
                loadTrackableDevices();
            }, 100);
        }
    }
}

// Filter Controls
let currentFilter = null;
let filterDropdownOpen = false;
let filterControlsInitialized = false;

function initializeFilterControls() {
    if (filterControlsInitialized) {
        return;
    }
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const filterOptions = document.getElementById('filter-options');
    const yesterdayBtn = document.getElementById('filter-yesterday-btn');
    const todayBtn = document.getElementById('filter-today-btn');
    const customBtn = document.getElementById('filter-custom-btn');
    const customSection = document.getElementById('custom-date-section');
    const applyCustomBtn = document.getElementById('apply-custom-filter-btn');
    const cancelCustomBtn = document.getElementById('cancel-custom-filter-btn');
    const clearAllBtn = document.getElementById('clear-all-filters-btn');

    if (!filterToggleBtn || !filterOptions) {
        console.log('Filter elements not found, skipping initialization');
        return;
    }

    // Toggle filter dropdown
    filterToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdownOpen = !filterDropdownOpen;
        filterOptions.style.display = filterDropdownOpen ? 'block' : 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!filterToggleBtn.contains(e.target) && !filterOptions.contains(e.target)) {
            filterDropdownOpen = false;
            filterOptions.style.display = 'none';
            customSection.style.display = 'none';
        }
    });

    // Yesterday filter
    if (yesterdayBtn) {
        yesterdayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!selectedDevice) {
                showNotification('Please select a device first', false);
                closeFilterDropdown();
                return;
            }
            applyYesterdayFilter();
            closeFilterDropdown();
        });
    }

    // Today filter
    if (todayBtn) {
        todayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!selectedDevice) {
                showNotification('Please select a device first', false);
                closeFilterDropdown();
                return;
            }
            applyTodayFilter();
            closeFilterDropdown();
        });
    }

    // Custom filter
    if (customBtn) {
        customBtn.addEventListener('click', () => {
            showCustomDateInputs();
        });
    }

    // Apply custom filter
    if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', () => {
            applyCustomFilter();
            closeFilterDropdown();
        });
    }

    // Cancel custom filter
    if (cancelCustomBtn) {
        cancelCustomBtn.addEventListener('click', () => {
            customSection.style.display = 'none';
        });
    }

    // Clear all filters
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            clearAllFilters();
            closeFilterDropdown();
        });
    }

    filterControlsInitialized = true;
}

function closeFilterDropdown() {
    filterDropdownOpen = false;
    const filterOptions = document.getElementById('filter-options');
    const customSection = document.getElementById('custom-date-section');
    if (filterOptions) filterOptions.style.display = 'none';
    if (customSection) customSection.style.display = 'none';
}

function showCustomDateInputs() {
    const customSection = document.getElementById('custom-date-section');
    const startDate = document.getElementById('filter-start-date');
    const endDate = document.getElementById('filter-end-date');

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

function applyYesterdayFilter() {
    if (!selectedDevice) {
        showNotification('Please select a device first', false);
        return;
    }

    // Create yesterday's date range in IST format for MySQL
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const date = String(yesterday.getDate()).padStart(2, '0');

    // Format as YYYY-MM-DD HH:MM:SS for MySQL (IST)
    const yesterdayStart = `${year}-${month}-${date} 00:00:00`;
    const yesterdayEnd = `${year}-${month}-${date} 23:59:59`;
    currentFilter = { startDate: yesterdayStart, endDate: yesterdayEnd, type: 'yesterday' };
    loadFilteredDeviceLocationsIST(selectedDevice, yesterdayStart, yesterdayEnd);
    updateFilterButtonState('Yesterday');
}

function applyTodayFilter() {
    if (!selectedDevice) {
        showNotification('Please select a device first', false);
        return;
    }

    // Create today's date range in IST format for MySQL
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');

    // Format as YYYY-MM-DD HH:MM:SS for MySQL (IST)
    const todayStart = `${year}-${month}-${date} 00:00:00`;
    const todayEnd = `${year}-${month}-${date} 23:59:59`;

    currentFilter = { startDate: todayStart, endDate: todayEnd, type: 'today' };
    loadFilteredDeviceLocationsIST(selectedDevice, todayStart, todayEnd);
    updateFilterButtonState('Today');
}

function applyCustomFilter() {
    if (!selectedDevice) {
        showNotification('Please select a device first', false);
        return;
    }

    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');

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

    currentFilter = { startDate, endDate, type: 'custom' };
    loadFilteredDeviceLocations(selectedDevice, startDate, endDate);
    updateFilterButtonState('Custom');
}

function clearAllFilters() {
    currentFilter = null;

    if (selectedDevice) {
        loadDeviceLocations(selectedDevice);
    }

    updateFilterButtonState(null);
    showNotification('Filter cleared', true);
}

function updateFilterButtonState(filterType) {
    const filterBtn = document.getElementById('filter-toggle-btn');
    if (!filterBtn) return;

    if (filterType) {
        filterBtn.innerHTML = `<i class="fas fa-filter"></i> ${filterType}`;
        filterBtn.classList.remove('btn-secondary');
        filterBtn.classList.add('btn-success');
    } else {
        filterBtn.innerHTML = '<i class="fas fa-filter"></i> Filter';
        filterBtn.classList.remove('btn-success');
        filterBtn.classList.add('btn-secondary');
    }
}



function loadFilteredDeviceLocationsIST(deviceId, startDate, endDate) {
    const userEmail = getUserEmail();
    if (!userEmail || !deviceId) return;

    // Initialize map if not already done
    if (!trackingMap) {
        initializeMap();
    }

    fetch(`/api/device-locations/${deviceId}?user_email=${encodeURIComponent(userEmail)}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`)
        .then(response => response.json())
        .then(data => {
        
            if (data.success) {
                displayLocationsOnMap(data.locations);
                updateLocationHistory(data.locations);

                const dateStr = startDate.split(' ')[0] === endDate.split(' ')[0]
                    ? startDate.split(' ')[0]
                    : `${startDate.split(' ')[0]} - ${endDate.split(' ')[0]}`;
                showNotification(`Showing ${data.locations.length} locations for ${dateStr}`, true);
            } else {
                showNotification(data.message || 'Error loading filtered locations', false);
            }
        })
        .catch(error => {
            console.error('Error loading filtered locations:', error);
            showNotification('Error loading filtered locations', false);
        });
}

// Keep the old function for custom date inputs that use Date objects
function loadFilteredDeviceLocations(deviceId, startDate, endDate) {
    const userEmail = getUserEmail();
    if (!userEmail || !deviceId) return;

    // Initialize map if not already done
    if (!trackingMap) {
        initializeMap();
    }

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    console.log('Loading filtered locations:', {
        deviceId,
        startDate: startISO,
        endDate: endISO,
        startLocal: startDate.toString(),
        endLocal: endDate.toString()
    });

    fetch(`/api/device-locations/${deviceId}?user_email=${encodeURIComponent(userEmail)}&start_date=${encodeURIComponent(startISO)}&end_date=${encodeURIComponent(endISO)}`)
        .then(response => response.json())
        .then(data => {

            if (data.success) {
                displayLocationsOnMap(data.locations);
                updateLocationHistory(data.locations);

                const dateStr = startDate.toDateString() === endDate.toDateString()
                    ? startDate.toDateString()
                    : `${startDate.toDateString()} - ${endDate.toDateString()}`;
                showNotification(`Showing ${data.locations.length} locations for ${dateStr}`, true);
            } else {
                showNotification(data.message || 'Error loading filtered locations', false);
            }
        })
        .catch(error => {
            console.error('Error loading filtered locations:', error);
            showNotification('Error loading filtered locations', false);
        });
}

// Activity Logs Functions
let currentActivityFilter = null;
let activityFilterDropdownOpen = false;

function loadActivityLogs(startDate = null, endDate = null) {
    const userEmail = getUserEmail();
    const userToken = getUserToken();

    if (!userEmail || !userToken) return;

    let url = '/api/activity-logs?limit=100'; // Show more activities
    if (startDate && endDate) {
        url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    }

    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentActivities = data.activities; // Store for details access
            displayActivityLogs(data.activities);
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
    const noActivity = document.getElementById('no-activity');

    if (!activityFeed) return;

    if (activities.length === 0) {
        activityFeed.style.display = 'none';
        noActivity.style.display = 'block';
        return;
    }

    activityFeed.style.display = 'block';
    noActivity.style.display = 'none';

    activityFeed.innerHTML = '';

    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.onclick = () => showActivityDetails(activity.id);

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

function getActivityDescription(actionType, originalDescription, targetEntity) {
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

function formatActionType(actionType) {
    const actionMap = {
        'login': 'Login',
        'logout': 'Logout',
        'device_create': 'Device Created',
        'device_delete': 'Device Deleted',
        'device_link': 'Device Linked',
        'device_unlink': 'Device Unlinked',
        'user_create': 'User Created',
        'user_delete': 'User Deleted',
        'user_block': 'User Blocked',
        'user_unblock': 'User Unblocked',
        'profile_update': 'Profile Updated',
        'password_change': 'Password Changed'
    };
    return actionMap[actionType] || actionType;
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

// Store activities globally for details access
let currentActivities = [];

function showActivityDetails(activityId) {
    const activity = currentActivities.find(a => a.id === activityId);
    if (activity) {
        displayActivityDetailsModal(activity);
    }
}

function displayActivityDetailsModal(activity) {
    const modal = document.getElementById('activity-details-modal');
    const body = document.getElementById('activity-details-body');

    if (!modal || !body) return;

    body.innerHTML = `
        <div class="activity-detail-item">
            <div class="activity-detail-label">Action Type:</div>
            <div class="activity-detail-value">${formatActionType(activity.action_type)}</div>
        </div>
        <div class="activity-detail-item">
            <div class="activity-detail-label">Description:</div>
            <div class="activity-detail-value">${activity.action_description}</div>
        </div>
        <div class="activity-detail-item">
            <div class="activity-detail-label">User:</div>
            <div class="activity-detail-value">${activity.user_name || activity.user_email}</div>
        </div>
        <div class="activity-detail-item">
            <div class="activity-detail-label">Role:</div>
            <div class="activity-detail-value">${activity.user_role}</div>
        </div>
        <div class="activity-detail-item">
            <div class="activity-detail-label">Timestamp:</div>
            <div class="activity-detail-value">${new Date(activity.timestamp).toLocaleString()}</div>
        </div>
        ${activity.target_entity ? `
        <div class="activity-detail-item">
            <div class="activity-detail-label">Target:</div>
            <div class="activity-detail-value">${activity.target_entity}</div>
        </div>
        ` : ''}
        ${activity.ip_address ? `
        <div class="activity-detail-item">
            <div class="activity-detail-label">IP Address:</div>
            <div class="activity-detail-value">${activity.ip_address}</div>
        </div>
        ` : ''}
    `;

    modal.style.display = 'flex';

    // Close modal event
    const closeBtn = document.getElementById('close-activity-details');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Activity Filter Functions
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

    // Toggle filter dropdown
    filterToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activityFilterDropdownOpen = !activityFilterDropdownOpen;
        filterOptions.style.display = activityFilterDropdownOpen ? 'block' : 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!filterToggleBtn.contains(e.target) && !filterOptions.contains(e.target)) {
            activityFilterDropdownOpen = false;
            filterOptions.style.display = 'none';
            customSection.style.display = 'none';
        }
    });

    // All activities filter
    if (allBtn) {
        allBtn.addEventListener('click', () => {
            applyActivityFilter('all');
            closeActivityFilterDropdown();
        });
    }

    // Today filter
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            applyActivityFilter('today');
            closeActivityFilterDropdown();
        });
    }

    // Yesterday filter
    if (yesterdayBtn) {
        yesterdayBtn.addEventListener('click', () => {
            applyActivityFilter('yesterday');
            closeActivityFilterDropdown();
        });
    }

    // Custom filter
    if (customBtn) {
        customBtn.addEventListener('click', () => {
            showActivityCustomDateInputs();
        });
    }

    // Apply custom filter
    if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', () => {
            applyActivityCustomFilter();
            closeActivityFilterDropdown();
        });
    }

    // Cancel custom filter
    if (cancelCustomBtn) {
        cancelCustomBtn.addEventListener('click', () => {
            customSection.style.display = 'none';
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

    console.log('Custom filter dates:', { startIST, endIST });

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
