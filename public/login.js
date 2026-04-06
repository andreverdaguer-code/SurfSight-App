const loginForm  = document.getElementById('surf-login-form');
const statusEl   = document.getElementById('surfAuthStatus');
const emailInput = document.getElementById('surfEmail');
const passInput  = document.getElementById('surfPassword');
const rememberEl = document.getElementById('rememberMe');

// Pre-fill saved credentials if available
if (window.credentialStore) {
  window.credentialStore.load().then(creds => {
    if (!creds) return;
    emailInput.value    = creds.email;
    passInput.value     = creds.password;
    rememberEl.checked  = true;
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = emailInput.value.trim();
  const password = passInput.value;

  statusEl.textContent = 'Connecting to SurfSight...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      statusEl.textContent = err.error || 'SurfSight login failed.';
      return;
    }

    // Save or clear credentials based on checkbox
    if (window.credentialStore) {
      if (rememberEl.checked) {
        await window.credentialStore.save(email, password);
      } else {
        await window.credentialStore.clear();
      }
    }

    window.location.href = 'index.html';
  } catch (err) {
    statusEl.textContent = 'Network error connecting to SurfSight.';
  }
});
