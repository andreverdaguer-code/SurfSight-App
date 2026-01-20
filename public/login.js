const loginForm = document.getElementById('surf-login-form');
const statusE1 = document.getElementById('surfAuthStatus');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let email = document.getElementById('surfEmail').value.trim();
    const password = document.getElementById('surfPassword').value;

    statusE1.textContent = 'Connecting to SurfSight...';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            statusE1.textContent = err.error || 'SurfSight login failed.';
            return;
        }

        const data = await res.json();
        statusE1.textContent = 'Connected to SurfSight.';
        window.location.href = "index.html";
    } catch (err) {
        statusE1.textContent = 'Network error connecting to SurfSight.';
    }
});