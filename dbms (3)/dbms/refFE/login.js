window.onload = function () {
    if (sessionStorage.getItem('userId')) {
        window.location.href = './index.html';
    }
};

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
                // Store user ID in session storage
                sessionStorage.setItem('userId', data.user.user_id);
                sessionStorage.setItem('userEmail', data.user.email);
                // Fix redirect path
                window.location.href = './index.html';
            } else {
                alert(data.error || 'Login failed');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        });
}
