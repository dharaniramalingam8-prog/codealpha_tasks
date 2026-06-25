import {
  requireAuth, getUser, clearAuth,
  usersAPI, postsAPI, showToast, escapeHtml, renderAvatar, formatTime
} from './api.js';
import { initTheme, toggleTheme, updateToggleBtn } from './theme.js';
import { initNotifications, toggleNotifDropdown } from './notifications.js';

requireAuth();
initTheme();

const ME = getUser();

window.logout = () => { clearAuth(); window.location.href = '/index.html'; };
window.toggleNotifDropdown = toggleNotifDropdown;
window.handleThemeToggle = () => { const next = toggleTheme(); updateToggleBtn(next); };

async function init() {
  updateToggleBtn(localStorage.getItem('vibe_theme') || 'dark');
  initNotifications();
  setupNavAvatar();
  loadBookmarks();
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

async function loadBookmarks() {
  const container = document.getElementById('bookmarks-container');
  try {
    const posts = await usersAPI.getBookmarks();
    if (!posts.length) {
      container.innerHTML = '<div class="empty-state"><span style="font-size:2rem">🔖</span><br>You haven\'t saved any posts yet.</div>';
      return;
    }
    container.innerHTML = posts.map(p => renderPost(p)).join('');
  } catch(e) {
    container.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
  }
}

function renderPost(p) {
  const uid = p.author._id;
  const uname = p.author.username;
  const ucolor = p.author.avatarColor;
  const upic = p.author.profilePicture;
  const postId = p._id;
  const isVerified = p.author.isVerified;

  const avatarHtml = upic
    ? `<img src="${escapeHtml(upic)}" class="avatar avatar-md avatar-img" alt="${escapeHtml(uname)}" />`
    : `<div class="avatar avatar-md" style="background:${ucolor}">${uname.slice(0,2).toUpperCase()}</div>`;

  const imageHtml = p.imageUrl
    ? `<img src="${escapeHtml(p.imageUrl)}" class="post-image" alt="Post Image" loading="lazy" onclick="goToPost('${postId}')" style="cursor:pointer" />`
    : '';

  return `
    <div class="card post-card" id="post-${postId}">
      <div class="post-header">
        <div class="post-user-info" onclick="window.location.href='/profile.html?id=${uid}'" style="cursor:pointer">
          ${avatarHtml}
          <div>
            <div class="post-username">@${escapeHtml(uname)} ${isVerified ? '<span class="verified-badge">⭐</span>' : ''}</div>
            <div class="post-time">${formatTime(p.createdAt)}</div>
          </div>
        </div>
      </div>
      <div class="post-content" onclick="goToPost('${postId}')" style="cursor:pointer">
        ${escapeHtml(p.content).replace(/#(\w+)/g, '<a href="/hashtag.html?tag=$1" class="hashtag" onclick="event.stopPropagation()">#$1</a>')}
      </div>
      ${imageHtml}
      <div class="post-actions">
        <button class="action-btn ${p.userLiked?'liked':''}" id="like-btn-${postId}" onclick="toggleLike('${postId}')">
          <span class="icon">${p.userLiked?'❤️':'🤍'}</span>
          <span id="like-count-${postId}">${p.likeCount||0}</span>
        </button>
        <button class="action-btn" onclick="goToPost('${postId}')">
          <span class="icon">💬</span>
          <span>${p.commentCount||0}</span>
        </button>
        <button class="action-btn ${p.userSaved?'liked':''}" id="save-btn-${postId}" onclick="toggleSave('${postId}')">
          <span class="icon">${p.userSaved?'💾':'🔖'}</span>
        </button>
      </div>
    </div>
  `;
}

window.goToPost = (id) => { window.location.href = `/post.html?id=${id}`; };

window.toggleLike = async (postId) => {
  try {
    const btn = document.getElementById(`like-btn-${postId}`);
    const count = document.getElementById(`like-count-${postId}`);
    const wasLiked = btn.classList.contains('liked');
    btn.classList.toggle('liked', !wasLiked);
    btn.querySelector('.icon').textContent = wasLiked ? '🤍' : '❤️';
    count.textContent = parseInt(count.textContent) + (wasLiked ? -1 : 1);
    
    const res = await postsAPI.toggleLike(postId);
    count.textContent = res.likeCount;
    btn.classList.toggle('liked', res.liked);
    btn.querySelector('.icon').textContent = res.liked ? '❤️' : '🤍';
  } catch(e) { showToast(e.message, 'error'); }
};

window.toggleSave = async (postId) => {
  try {
    const btn = document.getElementById(`save-btn-${postId}`);
    const wasSaved = btn.classList.contains('liked');
    btn.classList.toggle('liked', !wasSaved);
    btn.querySelector('.icon').textContent = wasSaved ? '🔖' : '💾';
    
    const res = await postsAPI.toggleSave(postId);
    btn.classList.toggle('liked', res.saved);
    btn.querySelector('.icon').textContent = res.saved ? '💾' : '🔖';
    
    // If unsaved from bookmarks page, optionally remove it
    if (!res.saved) {
      document.getElementById(`post-${postId}`).style.opacity = '0.5';
      showToast('Post removed from bookmarks', 'info');
    }
  } catch(e) { showToast(e.message, 'error'); }
};

init();
