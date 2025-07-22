function handleAuth() {
    const loginBtn = document.querySelector('nav a[onclick="goToLogin()"]');
    if (!loginBtn) return;

    if (localStorage.getItem('authToken')) {
        loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        loginBtn.setAttribute('title', 'Click to logout');
    } else {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        loginBtn.setAttribute('title', 'Click to login');
    }
}

function goToLogin() {
    if (localStorage.getItem('authToken')) {
        localStorage.removeItem('authToken');
        window.location.reload();
    } else {
        localStorage.setItem('returnTo', window.location.pathname);
        window.location.href = '/refFE/login.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', handleAuth);
