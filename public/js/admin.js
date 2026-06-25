import {
  requireAuth, getUser, clearAuth,
  adminAPI, showToast, escapeHtml
} from './api.js';
import { initTheme, toggleTheme, updateToggleBtn } from './theme.js';

requireAuth();
initTheme();

const ME = getUser();

window.logout = () => { clearAuth(); window.location.href = '/index.html'; };
window.handleThemeToggle = () => { const next = toggleTheme(); updateToggleBtn(next); };

async function init() {
  updateToggleBtn(localStorage.getItem('vibe_theme') || 'dark');
  setupNavAvatar();
  await Promise.all([loadStats(), loadReports()]);
}

async function setupNavAvatar() {
  try {
    const { usersAPI, renderAvatar } = await import('./api.js');
    const u = await usersAPI.getUser(ME.id);
    if (u.role !== 'admin') {
      showToast('Unauthorized access', 'error');
      setTimeout(() => window.location.href = '/feed.html', 1500);
      return;
    }
    const nav = document.getElementById('nav-avatar');
    nav.innerHTML = '';
    const av = renderAvatar(u, 'sm');
    av.style.cursor = 'pointer';
    av.onclick = () => window.location.href = `/profile.html?id=${ME.id}`;
    nav.appendChild(av);
  } catch(e) {
    window.location.href = '/feed.html';
  }
}

async function loadStats() {
  try {
    const stats = await adminAPI.getStats();
    document.getElementById('stat-users').textContent = stats.totalUsers || 0;
    document.getElementById('stat-posts').textContent = stats.totalPosts || 0;
    document.getElementById('stat-comments').textContent = stats.totalComments || 0;
    document.getElementById('stat-reports').textContent = stats.pendingReports || 0;
  } catch(e) { showToast('Error loading stats', 'error'); }
}

async function loadReports() {
  try {
    const reports = await adminAPI.getReports();
    const container = document.getElementById('reports-list');
    
    if (!reports.length) {
      container.innerHTML = '<div class="empty-state">No pending reports. Great job! ✨</div>';
      return;
    }

    container.innerHTML = reports.map(r => `
      <div class="card" style="padding:16px;margin-bottom:12px;display:flex;flex-direction:column;gap:8px" id="report-${r._id}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Type: <span style="text-transform:uppercase;color:var(--danger)">${escapeHtml(r.type)}</span></strong>
          <span style="font-size:.8rem;color:var(--text-muted)">${new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
        <div><strong>Reporter:</strong> <a href="/profile.html?id=${r.reporter._id}" style="color:var(--accent)">@${escapeHtml(r.reporter.username)}</a></div>
        <div><strong>Reported User:</strong> <a href="/profile.html?id=${r.reportedUser._id}" style="color:var(--accent)">@${escapeHtml(r.reportedUser.username)}</a></div>
        ${r.targetId ? `<div><strong>Target ID:</strong> ${r.targetId}</div>` : ''}
        <div style="padding:10px;background:var(--bg-input);border-radius:var(--radius-sm);font-style:italic">"${escapeHtml(r.reason)}"</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
          <button class="btn btn-secondary btn-sm" onclick="updateReport('${r._id}', 'dismissed')">Dismiss</button>
          <button class="btn btn-danger btn-sm" onclick="updateReport('${r._id}', 'resolved')">Resolve / Action Taken</button>
        </div>
      </div>
    `).join('');
  } catch(e) { 
    document.getElementById('reports-list').innerHTML = `<p style="color:var(--danger);padding:24px;text-align:center">${e.message}</p>`;
  }
}

window.updateReport = async (id, status) => {
  try {
    await adminAPI.updateReport(id, status);
    const el = document.getElementById(`report-${id}`);
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
    showToast(`Report ${status}`, 'success');
  } catch(e) { showToast(e.message, 'error'); }
};

init();
