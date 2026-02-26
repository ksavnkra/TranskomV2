function updateNavbar() {
    const token = localStorage.getItem('token');
    // Support both old and new nav ID patterns
    const authLink = document.getElementById('nav-auth') || document.querySelector('a[href="auth.html"]')?.parentElement;
    const profileLink = document.getElementById('nav-profile') || document.querySelector('a[href="profile.html"]')?.parentElement;
    const fundsLink = document.getElementById('nav-funds');
    const logoutBtn = document.getElementById('logout-btn');

    if (token) {
        // Logged in
        if (authLink) authLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'inline-block';
        if (fundsLink) fundsLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
        // Not logged in
        if (authLink) authLink.style.display = 'inline-block';
        if (profileLink) profileLink.style.display = 'none';
        if (fundsLink) fundsLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});
