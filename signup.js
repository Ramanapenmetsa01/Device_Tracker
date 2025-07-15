document.addEventListener('DOMContentLoaded', () => {
    const userSignupToggle = document.getElementById('user-signup-toggle');
    const adminSignupToggle = document.getElementById('admin-signup-toggle');
    const adminCodeGroup = document.getElementById('admin-code-group');
    const signupForm = document.querySelector('.signup-form');

    let currentSignupRole = 'user';

    const updateSignupToggleState = (selectedToggle) => {
        userSignupToggle.classList.remove('active');
        adminSignupToggle.classList.remove('active');
        selectedToggle.classList.add('active');
    };

    userSignupToggle.addEventListener('click', () => {
        updateSignupToggleState(userSignupToggle);
        currentSignupRole = 'user';
        adminCodeGroup.style.display = 'none';
        console.log('Current signup role:', currentSignupRole);
    });

    adminSignupToggle.addEventListener('click', () => {
        updateSignupToggleState(adminSignupToggle);
        currentSignupRole = 'admin';
        adminCodeGroup.style.display = 'block';
        console.log('Current signup role:', currentSignupRole);
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        let adminCode = '';

        if (currentSignupRole === 'admin') {
            adminCode = document.getElementById('admin-code').value;
        }

        console.log(`Attempting to sign up as ${currentSignupRole} with name: ${name}, email: ${email}, password: ${password}, admin code: ${adminCode}`);

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, role: currentSignupRole, adminCode }),
            });

            const data = await response.json();

            if (data.success) {
                showNotification(data.message, true, 2000);
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            } else {
                showNotification(`Sign up failed: ${data.message}`, false, 3000);
            }
        } catch (error) {
            console.error('Error during signup:', error);
            showNotification('An error occurred during signup. Please try again.', false, 3000);
        }
    });
    
    // Add password toggle functionality
    const passwordToggle = document.getElementById('signup-password-toggle');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const passwordInput = document.getElementById('signup-password');
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
});