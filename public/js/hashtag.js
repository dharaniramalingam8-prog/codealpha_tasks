import {
  requireAuth, getUser, clearAuth,
  postsAPI, hashtagsAPI, usersAPI,
  renderContent, renderAvatar, formatTime, escapeHtml, showToast
} from './api.js';
import { initTheme, toggleTheme, updateToggleBtn } from './theme.js';
import { initNotifications, toggleNotifDropdown } from './notifications.js';

requireAuth();
initTheme();

const ME     = getUser();
const params = new URLSearchParams(window.location.search);
const tag    = (params.get('tag') || '').toLowerCase().replace(/^#/, '');

if (!tag) window.location.href = '/feed.html';

let offset = 0;
const LIMIT = 15;

window.logout = () => { clearAuth(); window.location.href = '/index.html'; };
window.goToProfile = (id) => { window.location.href = `/profile.html?id=${id}`; };
window.goToPost    = (id) => { window.location.href = `/post.html?id=${id}`; };
window.toggleNotifDropdown = toggleNotifDropdown;
window.handleThemeToggle   = () => { const next = toggleTheme(); updateToggleBtn(next); };

async function init() {
  updateToggleBtn(localStorage.getItem('vibe_theme') || 'dark');
  document.title = `#${tag} — Vibe`;
  document.getElementById('hashtag-title').textContent = `#${tag}`;

  initNotifications();
  setupNavAvatar();
  setupSearch();
  await loadFeed(true);
}

async function setupNavAvatar() {
  try {
    const u = await usersAPI.getUser(ME.id);
    const nav = document.getElementById('nav-avatar');
    nav.innerHTML = '';
    const av = renderAvatar(u, 'sm');
    av.style.cursor = 'pointer';
    av.onclick = () => goToProfile(ME.id);
    nav.appendChild(av);
  } catch(e) {}
}

async function loadFeed(reset = false) {
  if (reset) {
    offset = 0;
    document.getElementById('posts-container').innerHTML = skels(3);
  }

  try {
    const data = await hashtagsAPI.getFeed(tag, offset);
    const posts = data.posts || [];

    if (reset) {
      document.getElementById('posts-container').innerHTML = '';
      document.getElementById('hashtag-count').textContent = `${data.postCount || posts.length} posts`;
    }

    if (!posts.length && offset === 0) {
      document.getElementById('posts-container').innerHTML = `
        <div class="card empty-state">
          <span class="icon">🔍</span>
          <h3>No posts for #${escapeHtml(tag)}</h3>
          <p>Be the first to use this hashtag!</p>
        </div>`;
      document.getElementById('load-more-btn').style.display = 'none';
      return;
    }

    posts.forEach(p => {
      document.getElementById('posts-container').insertAdjacentHTML('beforeend', renderPost(p));
    });

    offset += posts.length;

    const loadBtn  = document.getElementById('load-more-btn');
    const allDone  = document.getElementById('all-loaded');
    if (posts.length < LIMIT) {
      loadBtn.style.display = 'none';
      if (offset > 0) allDone.style.display = 'block';
    } else {
      loadBtn.style.display = 'inline-flex';
      allDone.style.display = 'none';
    }
  } catch(e) {
    document.getElementById('posts-container').innerHTML = `<div class="card empty-state"><span class="icon">❌</span><h3>${e.message}</h3></div>`;
  }
}

window.loadMore = () => loadFeed(false);

function renderPost(p) {
  const postId = p._id || p.id;
  const uid    = p.author?._id || p.author?.id || '';
  const uname  = p.author?.username || '';
  const ucolor = p.author?.avatarColor || '#6C63FF';
  const upic   = p.author?.profilePicture || null;

  const avatarHtml = upic
    ? `<img src="${escapeHtml(upic)}" class="avatar avatar-md avatar-img" style="cursor:pointer" onclick="goToProfile('${uid}')" alt="${escapeHtml(uname)}" />`
    : `<div class="avatar avatar-md" style="background:${ucolor};cursor:pointer" onclick="goToProfile('${uid}')">${(uname||'').slice(0,2).toUpperCase()}</div>`;

  return `
  <div class="card post-card" id="post-${postId}">
    <div class="post-header">
      ${avatarHtml}
      <div class="post-author">
        <div class="name" onclick="goToProfile('${uid}')">@${escapeHtml(uname)}</div>
        <div class="time">${formatTime(p.createdAt)}${p.edited?'<span class="edited-badge"> · edited</span>':''}</div>
      </div>
    </div>
    <div class="post-content">${renderContent(p.content)}</div>
    ${p.imageUrl ? `<img class="post-image" src="${escapeHtml(p.imageUrl)}" alt="Post image" onclick="goToPost('${postId}')" onerror="this.style.display='none'" />` : ''}
    <div class="post-actions">
      <button class="action-btn ${p.userLiked?'liked':''}" id="like-btn-${postId}" onclick="toggleLike('${postId}')">
        <span class="icon">${p.userLiked?'❤️':'🤍'}</span>
        <span id="like-count-${postId}">${p.likeCount||0}</span>
      </button>
      <button class="action-btn" onclick="goToPost('${postId}')">
        <span class="icon">💬</span>
        <span>${p.commentCount||0}</span>
      </button>
    </div>
  </div>`;
}

window.toggleLike = async (postId) => {
  try {
    const btn=document.getElementById(`like-btn-${postId}`), count=document.getElementById(`like-count-${postId}`);
    const wasLiked=btn.classList.contains('liked');
    btn.classList.toggle('liked',!wasLiked); btn.querySelector('.icon').textContent=wasLiked?'🤍':'❤️';
    count.textContent=parseInt(count.textContent)+(wasLiked?-1:1);
    const res=await postsAPI.toggleLike(postId);
    count.textContent=res.likeCount; btn.classList.toggle('liked',res.liked);
    btn.querySelector('.icon').textContent=res.liked?'❤️':'🤍';
  } catch(e) { showToast(e.message,'error'); }
};

function setupSearch() {
  const input=document.getElementById('search-input'), results=document.getElementById('search-results');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q=input.value.trim();
    if (!q) { results.classList.remove('show'); return; }
    debounce=setTimeout(async () => {
      try {
        const users=await usersAPI.search(q);
        results.innerHTML=users.length
          ? users.map(u=>`<div class="search-result-item" onclick="goToProfile('${u._id||u.id}')"><div class="avatar avatar-sm" style="background:${u.avatarColor}">${(u.username||'').slice(0,2).toUpperCase()}</div><span class="username">@${escapeHtml(u.username)}</span></div>`).join('')
          : '<div style="padding:12px 14px;font-size:.85rem;color:var(--text-muted)">No users found</div>';
        results.classList.add('show');
      } catch(e) {}
    }, 350);
  });
  document.addEventListener('click', e => { if(!e.target.closest('.search-wrapper')) results.classList.remove('show'); });
}

function skels(n) {
  return Array.from({length:n},()=>`<div class="card post-card"><div class="post-header"><div class="skeleton" style="width:48px;height:48px;border-radius:50%"></div><div style="flex:1"><div class="skeleton" style="height:14px;width:120px;margin-bottom:6px;border-radius:4px"></div></div></div><div class="skeleton" style="height:60px;margin:12px 0;border-radius:8px"></div></div>`).join('');
}

init();
