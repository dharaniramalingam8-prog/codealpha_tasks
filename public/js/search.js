import {
  requireAuth, getUser, clearAuth,
  searchAPI, usersAPI, showToast, escapeHtml, renderAvatar, formatTime
} from './api.js';
import { initTheme, toggleTheme, updateToggleBtn } from './theme.js';
import { initNotifications, toggleNotifDropdown } from './notifications.js';

requireAuth();
initTheme();

const ME = getUser();
let currentFilter = 'all';
let currentQuery = '';

window.logout = () => { clearAuth(); window.location.href = '/index.html'; };
window.toggleNotifDropdown = toggleNotifDropdown;
window.handleThemeToggle = () => { const next = toggleTheme(); updateToggleBtn(next); };
window.setSearchFilter = (filter) => {
  currentFilter = filter;
  document.querySelectorAll('.sidebar .btn').forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
  document.getElementById(`tab-${filter}`).classList.replace('btn-secondary', 'btn-primary');
  if (currentQuery) executeSearch();
};

async function init() {
  updateToggleBtn(localStorage.getItem('vibe_theme') || 'dark');
  initNotifications();
  setupNavAvatar();

  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q');
  
  document.getElementById('tab-all').classList.replace('btn-secondary', 'btn-primary');

  if (q) {
    currentQuery = q;
    document.getElementById('global-search-input').value = q;
    executeSearch();
  } else {
    document.getElementById('search-query-display').textContent = '...';
    document.getElementById('search-results-container').innerHTML = '<div class="empty-state">Type something in the search bar to get started.</div>';
  }

  document.getElementById('global-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      currentQuery = e.target.value.trim();
      executeSearch();
      // update URL without reload
      window.history.pushState({}, '', `/search.html?q=${encodeURIComponent(currentQuery)}`);
    }
  });
}

async function setupNavAvatar() {
  try {
    const u = await usersAPI.getUser(ME.id);
    const nav = document.getElementById('nav-avatar');
    nav.innerHTML = '';
    const av = renderAvatar(u, 'sm');
    av.style.cursor = 'pointer';
    av.onclick = () => window.location.href = `/profile.html?id=${ME.id}`;
    nav.appendChild(av);
  } catch(e) {}
}

async function executeSearch() {
  if (!currentQuery) return;
  
  document.getElementById('search-query-display').textContent = `"${currentQuery}"`;
  const container = document.getElementById('search-results-container');
  container.innerHTML = '<div style="text-align:center;padding:40px"><span class="spinner"></span></div>';

  try {
    const results = await searchAPI.globalSearch(currentQuery, currentFilter);
    renderResults(results);
  } catch(e) {
    container.innerHTML = `<div class="empty-state" style="color:var(--danger)">Error: ${e.message}</div>`;
  }
}

function renderResults(res) {
  const container = document.getElementById('search-results-container');
  container.innerHTML = '';

  const noResults = (!res.users || !res.users.length) && (!res.posts || !res.posts.length) && (!res.hashtags || !res.hashtags.length);
  if (noResults) {
    container.innerHTML = '<div class="empty-state">No results found for your search.</div>';
    return;
  }

  // Render Users
  if (res.users && res.users.length) {
    let html = `<h3 style="margin-bottom:12px;margin-top:20px">Users</h3><div style="display:flex;flex-direction:column;gap:12px">`;
    html += res.users.map(u => `
      <div class="card" style="padding:16px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="window.location.href='/profile.html?id=${u._id}'">
        ${u.profilePicture 
          ? `<img src="${u.profilePicture}" class="avatar avatar-md avatar-img" alt="${escapeHtml(u.username)}" />`
          : `<div class="avatar avatar-md" style="background:${u.avatarColor}">${u.username.slice(0,2).toUpperCase()}</div>`}
        <div style="flex:1">
          <div style="font-weight:600">@${escapeHtml(u.username)} ${u.isVerified?'<span class="verified-badge">⭐</span>':''}</div>
          <div style="font-size:0.9rem;color:var(--text-muted)">${escapeHtml(u.bio || '')}</div>
        </div>
      </div>
    `).join('');
    html += `</div>`;
    container.insertAdjacentHTML('beforeend', html);
  }

  // Render Hashtags
  if (res.hashtags && res.hashtags.length) {
    let html = `<h3 style="margin-bottom:12px;margin-top:20px">Hashtags</h3><div style="display:flex;flex-wrap:wrap;gap:8px">`;
    html += res.hashtags.map(h => `
      <a href="/hashtag.html?tag=${encodeURIComponent(h.tag)}" class="btn btn-secondary" style="text-transform:lowercase;border-radius:20px">
        #${escapeHtml(h.tag)} <span style="opacity:0.6;font-size:0.8em;margin-left:4px">${h.count} posts</span>
      </a>
    `).join('');
    html += `</div>`;
    container.insertAdjacentHTML('beforeend', html);
  }

  // Render Posts
  if (res.posts && res.posts.length) {
    let html = `<h3 style="margin-bottom:12px;margin-top:20px">Posts</h3><div style="display:flex;flex-direction:column;gap:16px">`;
    html += res.posts.map(p => `
      <div class="card" style="padding:16px;cursor:pointer" onclick="window.location.href='/post.html?id=${p._id}'">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          ${p.author.profilePicture 
            ? `<img src="${p.author.profilePicture}" class="avatar avatar-sm avatar-img" alt="${escapeHtml(p.author.username)}" />`
            : `<div class="avatar avatar-sm" style="background:${p.author.avatarColor}">${p.author.username.slice(0,2).toUpperCase()}</div>`}
          <div>
            <div style="font-weight:600;font-size:0.9rem">@${escapeHtml(p.author.username)} ${p.author.isVerified?'<span class="verified-badge" style="font-size:0.8rem">⭐</span>':''}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${formatTime(p.createdAt)}</div>
          </div>
        </div>
        <div style="font-size:0.95rem;line-height:1.4">${escapeHtml(p.content)}</div>
      </div>
    `).join('');
    html += `</div>`;
    container.insertAdjacentHTML('beforeend', html);
  }
}

init();
