document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const currentPath = window.location.pathname;

    // Don't redirect on login/signup pages
    if (!currentPath.includes('login.html') && !currentPath.includes('signup.html')) {
        checkAuthentication();
    }

    // Handle login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Handle signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();
                if (data.success) {
                    alert('Signup successful! Please login.');
                    window.location.href = 'login.html';
                } else {
                    alert('Signup failed: ' + data.error);
                }
            } catch (error) {
                alert('Signup failed');
            }
        });
    }
});

function checkAuth() {
    const user = localStorage.getItem('user');
    const isLoginPage = window.location.pathname.includes('login.html');

    if (!user && !isLoginPage) {
        window.location.href = '/login.html';
        return;
    }

    if (user && isLoginPage) {
        window.location.href = '/index.html';
        return;
    }
}

function checkAuthentication() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/login.html';
    }
}

function sendLoginEmail(email) {
    // In a real application, you would call your server to send an email
    console.log(`Login confirmation email would be sent to ${email}`);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Add this function to show login status
function showLoginStatus(message, isError = false) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message ${isError ? 'error' : 'success'}`;
    statusDiv.textContent = message;
    document.querySelector('.login-box').prepend(statusDiv);
    setTimeout(() => statusDiv.remove(), 3000);
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('userId', data.user.user_id);
                localStorage.setItem('userEmail', data.user.email);
                window.location.href = '/index.html';
            } else {
                alert(data.error || 'Login failed');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            alert('Login failed');
        });
}

// Add this to all fetch calls
function getAuthHeaders() {
    const userId = localStorage.getItem('userId');
    return {
        'Content-Type': 'application/json',
        'user-id': userId
    };
}
