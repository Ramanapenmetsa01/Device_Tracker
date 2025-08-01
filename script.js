document.addEventListener('DOMContentLoaded', () => {
    const userToggle = document.getElementById('user-toggle');
    const adminToggle = document.getElementById('admin-toggle');
    const superAdminToggle = document.getElementById('super-admin-toggle');
    const loginForm = document.querySelector('.login-form');
    const forgotPasswordLink = document.querySelector('.forgot-password');
    const passwordToggle = document.getElementById('password-toggle');

    let currentRole = 'user';

    // Password toggle functionality
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordToggle.classList.remove('fa-eye-slash');
                passwordToggle.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                passwordToggle.classList.remove('fa-eye');
                passwordToggle.classList.add('fa-eye-slash');
            }
        });
    }

    const updateToggleState = (selectedToggle) => {
        userToggle.classList.remove('active');
        adminToggle.classList.remove('active');
        superAdminToggle.classList.remove('active');
        selectedToggle.classList.add('active');
    };

    userToggle.addEventListener('click', () => {
        updateToggleState(userToggle);
        currentRole = 'user';
        console.log('Current role:', currentRole);
    });

    adminToggle.addEventListener('click', () => {
        updateToggleState(adminToggle);
        currentRole = 'admin';
        console.log('Current role:', currentRole);
    });

    superAdminToggle.addEventListener('click', () => {
        updateToggleState(superAdminToggle);
        currentRole = 'super-admin';
        console.log('Current role:', currentRole);
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
    
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, role: currentRole }),
            });
    
            const data = await response.json();
    
            if (data.success) {
                // Store the token and email in localStorage with role-specific keys
                if (data.token) {
                    if (currentRole === 'super-admin') {
                        localStorage.setItem('superAdminToken', data.token);
                        localStorage.setItem('superAdminEmail', email);
                    } else if (currentRole === 'admin') {
                        localStorage.setItem('adminToken', data.token);
                        localStorage.setItem('adminEmail', email);
                    } else if (currentRole === 'user') {
                        localStorage.setItem('userToken', data.token);
                        localStorage.setItem('userEmail', email);
                    }
                }
                showNotification('Login successful!', true, 2000);
                setTimeout(() => { window.location.href = data.redirect; }, 2000);
            } else {
                showNotification(`Login failed: ${data.message}`, false, 3000);
            }
        } catch (error) {
            console.error('Error during login:', error);
            showNotification('An error occurred during login. Please try again.', false, 3000);
        }
    });

    //for checking for redirecting 
     const token=localStorage.getItem("userToken")||localStorage.getItem("adminToken")||localStorage.getItem("superAdminToken")
    fetch("/checking",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
        },
        body:JSON.stringify({token})
    })
    .then(response=>response.json())
    .then(data=>{
        if(data.success){
            const role=data.role
            if(role==="user"){window.location.href="/user/dashboard.html"}
            else if(role==="admin"){window.location.href="/admin/dashboard.html"}
            else{window.location.href="/superadmin/dashboard.html"}
        }
    })
    .catch (error=> {
        console.error('Error during login:', error);
    })
    // Forgot password functionality
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordModal();
    });
});

// Function to show the forgot password modal
function showForgotPasswordModal() {
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'forgot-password-modal';

    // Create modal content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Forgot Password</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="step" id="email-step">
                    <p>Enter your email address to receive a verification code.</p>
                    <div class="input-group">
                        <label class="input-label">
                            <input type="email" id="reset-email" required placeholder=" ">
                            <span class="floating-label">Email address</span>
                        </label>
                    </div>
                    <button id="send-code-btn" class="login-button">Send Code</button>
                </div>
                <div class="step" id="verification-step" style="display: none;">
                    <p>Enter the verification code sent to your email.</p>
                    <div class="input-group">
                        <label class="input-label">
                            <input type="text" id="verification-code" required placeholder=" ">
                            <span class="floating-label">Verification code</span>
                        </label>
                    </div>
                    <button id="verify-btn" class="login-button">Verify</button>
                    <div id="timer-container" style="display: none; text-align: center; margin-top: 15px;">
                        <span id="timer">30</span> seconds remaining
                    </div>
                    <button id="resend-btn" style="display: none;" class="secondary-btn">Resend Code</button>
                </div>
                <div class="step" id="new-password-step" style="display: none;">
                    <p>Enter your new password.</p>
                    <div class="input-group">
                        <label class="input-label">
                            <input type="password" id="new-password" required placeholder=" ">
                            <span class="floating-label">New password</span>
                            <i class="password-toggle fas fa-eye-slash" id="new-password-toggle"></i>
                        </label>
                    </div>
                    <div class="input-group">
                        <label class="input-label">
                            <input type="password" id="confirm-password" required placeholder=" ">
                            <span class="floating-label">Confirm password</span>
                            <i class="password-toggle fas fa-eye-slash" id="confirm-password-toggle"></i>
                        </label>
                    </div>
                    <button id="reset-password-btn" class="login-button">Reset Password</button>
                </div>
            </div>
            <div class="modal-footer">
                <button id="back-btn" class="secondary-btn">Back</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Hide the login container when modal is shown
    const container = document.querySelector('.container');
    container.style.display = 'none';
    modal.style.display = 'flex';

    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // Get elements
    const closeBtn = modal.querySelector('.close-btn');
    const backBtn = modal.querySelector('#back-btn');
    const sendCodeBtn = modal.querySelector('#send-code-btn');
    const verifyBtn = modal.querySelector('#verify-btn');
    const resendBtn = modal.querySelector('#resend-btn');
    const resetPasswordBtn = modal.querySelector('#reset-password-btn');
    const emailStep = modal.querySelector('#email-step');
    const verificationStep = modal.querySelector('#verification-step');
    const newPasswordStep = modal.querySelector('#new-password-step');
    const timerContainer = modal.querySelector('#timer-container');
    const timerSpan = modal.querySelector('#timer');
    const newPasswordToggle = modal.querySelector('#new-password-toggle');
    const confirmPasswordToggle = modal.querySelector('#confirm-password-toggle');

    let currentStep = 'email';
    let userEmail = '';
    let verificationCode = '';
    let timerInterval;

    // Password toggle functionality for new password fields
    if (newPasswordToggle) {
        newPasswordToggle.addEventListener('click', () => {
            const passwordInput = document.getElementById('new-password');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                newPasswordToggle.classList.remove('fa-eye-slash');
                newPasswordToggle.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                newPasswordToggle.classList.remove('fa-eye');
                newPasswordToggle.classList.add('fa-eye-slash');
            }
        });
    }

    if (confirmPasswordToggle) {
        confirmPasswordToggle.addEventListener('click', () => {
            const passwordInput = document.getElementById('confirm-password');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                confirmPasswordToggle.classList.remove('fa-eye-slash');
                confirmPasswordToggle.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                confirmPasswordToggle.classList.remove('fa-eye');
                confirmPasswordToggle.classList.add('fa-eye-slash');
            }
        });
    }

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.removeChild(modal);
            container.style.display = 'block';
        }, 300);
    });

    // Back button functionality
    backBtn.addEventListener('click', () => {
        if (currentStep === 'verification') {
            // Go back to email step
            verificationStep.style.display = 'none';
            emailStep.style.display = 'block';
            currentStep = 'email';
            backBtn.style.display = 'none';
            clearInterval(timerInterval);
        } else if (currentStep === 'newPassword') {
            // Go back to verification step
            newPasswordStep.style.display = 'none';
            verificationStep.style.display = 'block';
            currentStep = 'verification';
        }
    });

    // Initially hide back button
    backBtn.style.display = 'none';

    // Send code button
    sendCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('reset-email').value.trim();
        if (!email) {
            showNotification('Please enter your email address', false);
            return;
        }

        // Disable button during API call
        sendCodeBtn.disabled = true;
        sendCodeBtn.textContent = 'Sending...';

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            if (data.success) {
                userEmail = email;
                
                // Show verification step
                emailStep.style.display = 'none';
                verificationStep.style.display = 'block';
                currentStep = 'verification';
                backBtn.style.display = 'block';
                startTimer();
                
                showNotification(data.message, true);
            } else {
                showNotification(data.message, false);
            }
        } catch (error) {
            console.error('Error sending verification code:', error);
            showNotification('An error occurred. Please try again.', false);
        } finally {
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = 'Send Code';
        }
    });

    // Verify button
    verifyBtn.addEventListener('click', async () => {
        const code = document.getElementById('verification-code').value.trim();
        if (!code) {
            showNotification('Please enter the verification code', false);
            return;
        }

        // Disable button during API call
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        try {
            const response = await fetch('/api/verify-reset-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: userEmail, code }),
            });

            const data = await response.json();

            if (data.success) {
                // Store verification code
                verificationCode = code;
                
                // Show new password step
                verificationStep.style.display = 'none';
                newPasswordStep.style.display = 'block';
                currentStep = 'newPassword';
                
                // Clear timer
                clearInterval(timerInterval);
                timerContainer.style.display = 'none';
                resendBtn.style.display = 'none';
                
                showNotification(data.message, true);
            } else {
                showNotification(data.message, false);
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            showNotification('An error occurred. Please try again.', false);
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify';
        }
    });

    // Resend button
    resendBtn.addEventListener('click', async () => {
        // Hide resend button and show timer again
        resendBtn.style.display = 'none';
        timerContainer.style.display = 'block';
        
        // Disable button during API call
        resendBtn.disabled = true;

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: userEmail }),
            });

            const data = await response.json();

            if (data.success) {
                startTimer();
                showNotification(data.message, true);
            } else {
                showNotification(data.message, false);
                // Show resend button again if failed
                resendBtn.style.display = 'block';
                timerContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error resending code:', error);
            showNotification('An error occurred. Please try again.', false);
            // Show resend button again if failed
            resendBtn.style.display = 'block';
            timerContainer.style.display = 'none';
        } finally {
            resendBtn.disabled = false;
        }
    });
    
    // Reset password button
    resetPasswordBtn.addEventListener('click', async () => {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
    
        if (!newPassword || !confirmPassword) {
            showNotification('Please fill in all fields', false);
            return;
        }
    
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', false);
            return;
        }
    
        // Disable button during API call
        resetPasswordBtn.disabled = true;
        resetPasswordBtn.textContent = 'Resetting...';
    
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    code: verificationCode,
                    newPassword
                }),
            });
    
            const data = await response.json();
    
            if (data.success) {
                showNotification(data.message + ' Redirecting to login...', true, 3000);
                
                // Close modal after successful reset and show login form
                setTimeout(() => {
                    modal.classList.remove('show');
                    setTimeout(() => {
                        modal.style.display = 'none';
                        document.body.removeChild(modal);
                        const container = document.querySelector('.container');
                        container.style.display = 'block';
                         // Pre-fill email
                        document.getElementById('email').value = userEmail;
                        document.getElementById('password').value = '';
                    }, 300);
                }, 2000);
            } else {
                showNotification(data.message, false);
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            showNotification('An error occurred. Please try again.', false);
        } finally {
            resetPasswordBtn.disabled = false;
            resetPasswordBtn.textContent = 'Reset Password';
        }
    });

    // Timer functionality
    function startTimer() {
        let seconds = 30;
        timerSpan.textContent = seconds;
        timerContainer.style.display = 'block';
        resendBtn.style.display = 'none';
        
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            seconds--;
            timerSpan.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(timerInterval);
                timerContainer.style.display = 'none';
                resendBtn.style.display = 'block';
            }
        }, 1000);
    }
}