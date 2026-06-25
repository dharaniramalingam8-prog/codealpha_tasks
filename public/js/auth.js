import { authAPI, setAuth, getToken, getUser } from './api.js';

// Redirect if already logged in
if (getToken() && getUser()) {
  window.location.href = '/feed.html';
}

// ── Tab switching ──
window.switchTab = function(tab) {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');
  clearError();

  if (tab === 'login') {
    loginForm.style.display    = 'flex';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.style.display    = 'none';
    registerForm.style.display = 'flex';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
};

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}

function clearError() {
  const el = document.getElementById('auth-error');
  el.textContent = '';
  el.classList.remove('show');
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = '<span class="spinner"></span> Please wait...';
  } else {
    btn.innerHTML = btn.getAttribute('data-label') || btn.textContent;
  }
}

// ── Login ──
window.handleLogin = async function(e) {
  e.preventDefault();
  clearError();
  setLoading('login-btn', true);

  try {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const { token, user } = await authAPI.login({ email, password });
    setAuth(token, user);
    window.location.href = '/feed.html';
  } catch(err) {
    showError(err.message);
  } finally {
    setLoading('login-btn', false);
  }
};

// ── Register ──
window.handleRegister = async function(e) {
  e.preventDefault();
  clearError();
  setLoading('register-btn', true);

  try {
    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const { token, user } = await authAPI.register({ username, email, password });
    setAuth(token, user);
    window.location.href = '/feed.html';
  } catch(err) {
    showError(err.message);
  } finally {
    setLoading('register-btn', false);
  }
};

// ── Forgot Password ──
window.showForgotModal = () => document.getElementById('forgot-modal').style.display = 'flex';
window.closeForgotModal = () => document.getElementById('forgot-modal').style.display = 'none';

window.handleForgot = async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending...';

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    alert(data.message); // Fallback to alert since showToast isn't imported
    closeForgotModal();
  } catch(err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Send Reset Link';
  }
};
