import {
  requireAuth, getUser, clearAuth,
  postsAPI, commentsAPI, usersAPI,
  renderAvatar, renderContent, formatTime, escapeHtml, showToast
} from './api.js';
import { initTheme, toggleTheme, updateToggleBtn } from './theme.js';
import { initNotifications, toggleNotifDropdown } from './notifications.js';

requireAuth();
initTheme();

const ME = getUser();
const params = new URLSearchParams(window.location.search);
const postId = params.get('id');

if (!postId) window.location.href = '/feed.html';

let currentPost = null;
let comments    = [];

window.logout = () => { clearAuth(); window.location.href = '/index.html'; };
window.goToProfile = (id) => { window.location.href = `/profile.html?id=${id}`; };
window.toggleNotifDropdown = toggleNotifDropdown;
window.handleThemeToggle = () => { const next = toggleTheme(); updateToggleBtn(next); };

async function init() {
  updateToggleBtn(localStorage.getItem('vibe_theme') || 'dark');
  initNotifications();
  await Promise.all([loadPost(), loadComments()]);
  setupNavAvatar();
  setupSearch();
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

    const ca = document.getElementById('comment-avatar');
    ca.innerHTML = '';
    ca.appendChild(renderAvatar(u, 'md'));
  } catch(e) {}
}

// ── Load Post ──
async function loadPost() {
  try {
    const post = await postsAPI.getPost(postId);
    currentPost = post;
    document.title = `@${post.author?.username || 'Post'} — Vibe`;

    const isOwn = (post.author?._id || post.author?.id || '').toString() === ME.id.toString();
    const uid   = post.author?._id || post.author?.id || '';
    const uname = post.author?.username || '';
    const ucolor = post.author?.avatarColor || '#6C63FF';
    const upic  = post.author?.profilePicture || null;

    const avatarHtml = upic
      ? `<img src="${escapeHtml(upic)}" class="avatar avatar-md avatar-img" style="cursor:pointer" onclick="goToProfile('${uid}')" alt="${escapeHtml(uname)}" />`
      : `<div class="avatar avatar-md" style="background:${ucolor};cursor:pointer" onclick="goToProfile('${uid}')">${uname.slice(0,2).toUpperCase()}</div>`;

    document.getElementById('post-container').innerHTML = `
    <div class="card post-card">
      <div class="post-header">
        ${avatarHtml}
        <div class="post-author">
          <div class="name" onclick="goToProfile('${uid}')">@${escapeHtml(uname)}</div>
          <div class="time">${formatTime(post.createdAt)}${post.edited?'<span class="edited-badge"> · edited</span>':''}</div>
        </div>
        ${isOwn ? `
          <button class="action-btn edit-btn" onclick="openEditModal()" title="Edit">✏️</button>
          <button class="action-btn delete-btn" onclick="deletePost()" title="Delete">🗑️</button>
        ` : ''}
      </div>
      <div class="post-content" id="post-content-el">${renderContent(post.content)}</div>
      ${post.imageUrl ? `<img class="post-image" src="${escapeHtml(post.imageUrl)}" alt="Post image" onerror="this.style.display='none'" />` : ''}
      ${post.hashtags?.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${post.hashtags.map(h=>`<a class="hashtag-link" href="/hashtag.html?tag=${encodeURIComponent(h)}">#${escapeHtml(h)}</a>`).join('')}</div>` : ''}
      <div class="post-actions">
        <button class="action-btn ${post.userLiked?'liked':''}" id="like-btn" onclick="toggleLike()">
          <span class="icon">${post.userLiked?'❤️':'🤍'}</span>
          <span id="like-count">${post.likeCount||0}</span>
        </button>
        <span style="padding:7px 14px;color:var(--text-muted);font-size:.84rem">💬 <span id="comment-count-display">${post.commentCount||0}</span></span>
        <button class="action-btn ${post.userSaved?'liked':''}" id="save-btn" onclick="toggleSave()">
          <span class="icon">${post.userSaved?'💾':'🔖'}</span>
        </button>
        <button class="action-btn" onclick="sharePost()">
          <span class="icon">🔗</span>
        </button>
      </div>
    </div>`;
  } catch(e) {
    document.getElementById('post-container').innerHTML = `
      <div class="card empty-state"><span class="icon">😕</span><h3>Post not found</h3><p>This post may have been deleted.</p></div>`;
  }
}

// ── Like ──
window.toggleLike = async () => {
  try {
    const btn=document.getElementById('like-btn'), count=document.getElementById('like-count');
    const wasLiked=btn.classList.contains('liked');
    btn.classList.toggle('liked',!wasLiked); btn.querySelector('.icon').textContent=wasLiked?'🤍':'❤️';
    count.textContent=parseInt(count.textContent)+(wasLiked?-1:1);
    const res=await postsAPI.toggleLike(postId);
    count.textContent=res.likeCount; btn.classList.toggle('liked',res.liked);
    btn.querySelector('.icon').textContent=res.liked?'❤️':'🤍';
  } catch(e) { showToast(e.message,'error'); }
};

window.toggleSave = async () => {
  try {
    const btn=document.getElementById('save-btn');
    const wasSaved=btn.classList.contains('liked');
    btn.classList.toggle('liked',!wasSaved); btn.querySelector('.icon').textContent=wasSaved?'🔖':'💾';
    const res=await postsAPI.toggleSave(postId);
    btn.classList.toggle('liked',res.saved);
    btn.querySelector('.icon').textContent=res.saved?'💾':'🔖';
  } catch(e) { showToast(e.message,'error'); }
};

window.sharePost = async () => {
  try {
    await postsAPI.sharePost(postId);
    const url = `${window.location.origin}/post.html?id=${postId}`;
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard! 🔗', 'success');
  } catch(e) { showToast('Could not share post', 'error'); }
};

// ── Delete Post ──
window.deletePost = async () => {
  if (!confirm('Delete this post?')) return;
  try { await postsAPI.deletePost(postId); showToast('Deleted','success'); setTimeout(()=>history.back(),800); }
  catch(e) { showToast(e.message,'error'); }
};

// ── Edit Post ──
window.openEditModal = () => {
  if (!currentPost) return;
  document.getElementById('edit-content').value = currentPost.content;
  document.getElementById('edit-post-modal').classList.add('show');
};
window.closeEditModal = () => document.getElementById('edit-post-modal').classList.remove('show');
window.saveEdit = async () => {
  const content = document.getElementById('edit-content').value.trim();
  if (!content) return showToast('Content required','error');
  const btn=document.getElementById('edit-save-btn'); btn.disabled=true; btn.innerHTML='<span class="spinner"></span>';
  try {
    const updated = await postsAPI.updatePost(postId, { content });
    const el = document.getElementById('post-content-el');
    if (el) el.innerHTML = renderContent(updated.content);
    currentPost = { ...currentPost, content: updated.content };
    closeEditModal(); showToast('Updated ✨','success');
  } catch(e) { showToast(e.message,'error'); }
  finally { btn.disabled=false; btn.innerHTML='Save Changes'; }
};

// ── Load Comments ──
async function loadComments() {
  try {
    comments = await commentsAPI.getComments(postId);
    document.getElementById('comment-count').textContent = `(${comments.length})`;
    renderCommentsList();
  } catch(e) {
    document.getElementById('comments-list').innerHTML = `<p style="color:var(--danger)">${e.message}</p>`;
  }
}

function renderCommentsList() {
  const container = document.getElementById('comments-list');
  if (!comments.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px">
        <span class="icon">💬</span>
        <p style="color:var(--text-muted)">No comments yet. Be the first!</p>
      </div>`;
    return;
  }
  container.innerHTML = comments.map(c => renderComment(c)).join('');
}

function renderComment(c) {
  const cid    = c._id || c.id;
  const uid    = c.author?._id || c.author?.id || '';
  const uname  = c.author?.username || 'User';
  const ucolor = c.author?.avatarColor || '#6C63FF';
  const upic   = c.author?.profilePicture || null;
  const isOwn  = uid.toString() === ME.id.toString();

  const avatarHtml = upic
    ? `<img src="${escapeHtml(upic)}" class="avatar avatar-sm avatar-img" style="cursor:pointer" onclick="goToProfile('${uid}')" alt="${escapeHtml(uname)}" />`
    : `<div class="avatar avatar-sm" style="background:${ucolor};cursor:pointer" onclick="goToProfile('${uid}')">${uname.slice(0,2).toUpperCase()}</div>`;

  return `
  <div class="comment-item" id="comment-${cid}">
    ${avatarHtml}
    <div class="comment-body">
      <div class="comment-meta">
        <span class="comment-author" onclick="goToProfile('${uid}')">@${escapeHtml(uname)}</span>
        <span class="comment-time">${formatTime(c.createdAt)}</span>
        ${c.edited ? '<span class="edited-badge"> · edited</span>' : ''}
        <div class="comment-actions">
          ${isOwn ? `
            <button class="comment-action-btn" onclick="startEditComment('${cid}')" title="Edit">✏️ Edit</button>
            <button class="comment-action-btn danger" onclick="deleteComment('${cid}')" title="Delete">🗑️</button>
          ` : ''}
        </div>
      </div>
      <div class="comment-text" id="ctext-${cid}">${escapeHtml(c.content)}</div>
      <!-- Inline edit form (hidden by default) -->
      <div class="comment-edit-form" id="cedit-${cid}" style="display:none">
        <textarea class="comment-edit-input" id="cedit-input-${cid}" rows="2" maxlength="300">${escapeHtml(c.content)}</textarea>
        <button class="btn btn-primary btn-sm" onclick="saveCommentEdit('${cid}')">Save</button>
        <button class="btn btn-secondary btn-sm" onclick="cancelCommentEdit('${cid}')">✕</button>
      </div>
    </div>
  </div>`;
}

// ── Add Comment ──
window.handleCommentKey = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); addComment(); }
};

window.addComment = async () => {
  const content = document.getElementById('comment-input').value.trim();
  if (!content) return showToast('Comment cannot be empty','error');
  const btn = document.getElementById('comment-btn');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>';
  try {
    const comment = await commentsAPI.addComment(postId, content);
    comments.push(comment);
    document.getElementById('comment-input').value = '';
    document.getElementById('comment-count').textContent = `(${comments.length})`;
    const countEl = document.getElementById('comment-count-display');
    if (countEl) countEl.textContent = comments.length;

    const container = document.getElementById('comments-list');
    if (comments.length === 1) {
      container.innerHTML = '';
    }
    container.insertAdjacentHTML('beforeend', renderComment(comment));
    container.lastElementChild.scrollIntoView({ behavior:'smooth', block:'nearest' });
  } catch(e) { showToast(e.message,'error'); }
  finally { btn.disabled=false; btn.innerHTML='Comment 💬'; }
};

// ── Edit Comment ──
window.startEditComment = (cid) => {
  document.getElementById(`ctext-${cid}`).style.display = 'none';
  document.getElementById(`cedit-${cid}`).style.display = 'flex';
  document.getElementById(`cedit-input-${cid}`).focus();
};

window.cancelCommentEdit = (cid) => {
  const comment = comments.find(c => (c._id||c.id) === cid);
  if (comment) document.getElementById(`cedit-input-${cid}`).value = comment.content;
  document.getElementById(`cedit-${cid}`).style.display = 'none';
  document.getElementById(`ctext-${cid}`).style.display = '';
};

window.saveCommentEdit = async (cid) => {
  const content = document.getElementById(`cedit-input-${cid}`).value.trim();
  if (!content) return showToast('Comment cannot be empty','error');
  try {
    const updated = await commentsAPI.updateComment(postId, cid, content);
    // Update local cache
    const idx = comments.findIndex(c => (c._id||c.id) === cid);
    if (idx !== -1) comments[idx] = updated;
    // Update DOM
    document.getElementById(`ctext-${cid}`).textContent = updated.content;
    cancelCommentEdit(cid);
    // Show edited badge
    const meta = document.querySelector(`#comment-${cid} .comment-meta`);
    if (meta && !meta.querySelector('.edited-badge')) {
      meta.insertAdjacentHTML('beforeend', '<span class="edited-badge"> · edited</span>');
    }
    showToast('Comment updated','success');
  } catch(e) { showToast(e.message,'error'); }
};

// ── Delete Comment ──
window.deleteComment = async (cid) => {
  if (!confirm('Delete this comment?')) return;
  try {
    await commentsAPI.deleteComment(postId, cid);
    comments = comments.filter(c => (c._id||c.id) !== cid);
    const el = document.getElementById(`comment-${cid}`);
    el.style.transition='all .3s ease'; el.style.opacity='0';
    setTimeout(()=>el.remove(), 300);
    document.getElementById('comment-count').textContent = `(${comments.length})`;
    const countEl = document.getElementById('comment-count-display');
    if (countEl) countEl.textContent = comments.length;
    if (!comments.length) renderCommentsList();
  } catch(e) { showToast(e.message,'error'); }
};

// ── Search ──
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

init();
