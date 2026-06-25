/* ============================================
   API Helper v2 — Vibe Social Platform
   Added: notifications, messages, hashtags,
          FormData uploads, profilePicture support
============================================ */

const API_BASE = '/api';

// ── Auth Storage ──
export function getToken()  { return localStorage.getItem('sm_token'); }
export function getUser()   { try { return JSON.parse(localStorage.getItem('sm_user')); } catch { return null; } }
export function setAuth(token, user) {
  localStorage.setItem('sm_token', token);
  localStorage.setItem('sm_user', JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem('sm_token');
  localStorage.removeItem('sm_user');
}
export function requireAuth() {
  if (!getToken()) { window.location.href = '/index.html'; return false; }
  return true;
}

// ── Core fetch wrapper ──
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    clearAuth();
    window.location.href = '/index.html';
    throw new Error('Session expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ── Auth ──
export const authAPI = {
  register : (body) => apiFetch('/auth/register', { method:'POST', body:JSON.stringify(body) }),
  login    : (body) => apiFetch('/auth/login',    { method:'POST', body:JSON.stringify(body) }),
  getMe    : ()     => apiFetch('/auth/me'),
};

// ── Posts ── (now supports FormData for image)
export const postsAPI = {
  getFeed    : (offset=0) => apiFetch(`/posts/feed?offset=${offset}`),
  getExplore : (offset=0) => apiFetch(`/posts/explore?offset=${offset}`),
  getPost    : (id)       => apiFetch(`/posts/${id}`),
  createPost : (formData) => apiFetch('/posts', { method:'POST', body: formData }),
  updatePost : (id, body) => {
    if (body instanceof FormData) {
      return apiFetch(`/posts/${id}`, { method:'PUT', body });
    }
    return apiFetch(`/posts/${id}`, { method:'PUT', body: JSON.stringify(body) });
  },
  deletePost : (id)       => apiFetch(`/posts/${id}`, { method:'DELETE' }),
  toggleLike : (id)       => apiFetch(`/posts/${id}/like`, { method:'POST' }),
  toggleSave : (id)       => apiFetch(`/posts/${id}/save`, { method:'POST' }),
  share      : (id)       => apiFetch(`/posts/${id}/share`, { method:'POST' }),
  votePoll   : (id, optionIndex) => apiFetch(`/posts/${id}/vote`, { method:'POST', body:JSON.stringify({ optionIndex }) }),
};

// ── Comments ──
export const commentsAPI = {
  getComments   : (postId)              => apiFetch(`/posts/${postId}/comments`),
  addComment    : (postId, content)     => apiFetch(`/posts/${postId}/comments`, { method:'POST', body:JSON.stringify({ content }) }),
  updateComment : (postId, cid, content)=> apiFetch(`/posts/${postId}/comments/${cid}`, { method:'PUT', body:JSON.stringify({ content }) }),
  deleteComment : (postId, cid)         => apiFetch(`/posts/${postId}/comments/${cid}`, { method:'DELETE' }),
};

// ── Users ── (updateProfile now supports FormData)
export const usersAPI = {
  getUser       : (id)           => apiFetch(`/users/${id}`),
  updateProfile : (id, formData) => apiFetch(`/users/${id}`, { method:'PUT', body: formData }),
  getUserPosts  : (id, offset=0) => apiFetch(`/users/${id}/posts?offset=${offset}`),
  toggleFollow  : (id)           => apiFetch(`/users/${id}/follow`, { method:'POST' }),
  getFollowers  : (id)           => apiFetch(`/users/${id}/followers`),
  getFollowing  : (id)           => apiFetch(`/users/${id}/following`),
  getSuggestions: ()             => apiFetch('/users/suggestions'),
  getTrending   : ()             => apiFetch('/users/trending'),
  getBookmarks  : ()             => apiFetch('/users/bookmarks'),
  search        : (q)            => apiFetch(`/users/search?q=${encodeURIComponent(q)}`),
  updateStatus  : (online)       => apiFetch('/users/status', { method:'PATCH', body:JSON.stringify({ online }) }),
  updateSettings: (data)         => apiFetch('/users/settings', { method:'PUT', body:JSON.stringify(data) }),
  blockUser     : (id)           => apiFetch(`/users/${id}/block`, { method:'POST' }),
  reportUser    : (id, data)     => apiFetch(`/users/${id}/report`, { method:'POST', body:JSON.stringify(data) }),
};

// ── Notifications ──
export const notificationsAPI = {
  getAll       : ()   => apiFetch('/notifications'),
  getUnreadCount: ()  => apiFetch('/notifications/unread'),
  markRead     : (id) => apiFetch(`/notifications/${id}/read`, { method:'PUT' }),
  markAllRead  : ()   => apiFetch('/notifications/read-all', { method:'PUT' }),
};

// ── Messages ──
export const messagesAPI = {
  getConversations   : ()          => apiFetch('/messages/conversations'),
  openConversation   : (userId)    => apiFetch(`/messages/conversations/${userId}`, { method:'POST' }),
  getMessages        : (convId, offset=0) => apiFetch(`/messages/conversations/${convId}/messages?offset=${offset}`),
  sendMessage        : (convId, content) => apiFetch(`/messages/conversations/${convId}/messages`, { method:'POST', body:JSON.stringify({ content }) }),
  getUnreadCount     : ()          => apiFetch('/messages/unread'),
};

// ── Hashtags ──
export const hashtagsAPI = {
  getTrending : ()    => apiFetch('/hashtags/trending'),
  getFeed     : (tag, offset=0) => apiFetch(`/hashtags/${encodeURIComponent(tag)}?offset=${offset}`),
};

// ── Admin ──
export const adminAPI = {
  getStats      : ()     => apiFetch('/admin/stats'),
  getReports    : ()     => apiFetch('/admin/reports'),
  updateReport  : (id, status) => apiFetch(`/admin/reports/${id}`, { method:'PATCH', body:JSON.stringify({ status }) }),
  verifyUser    : (id)   => apiFetch(`/admin/users/${id}/verify`, { method:'PATCH' }),
};

// ── Search API ──
export const searchAPI = {
  globalSearch: (q, type = 'all') => apiFetch(`/search?q=${encodeURIComponent(q)}&type=${type}`)
};

// ── Stories API ──
export const storiesAPI = {
  getFeed: () => apiFetch('/stories/feed'),
  upload: (formData) => apiFetch('/stories', { method: 'POST', body: formData }),
  markViewed: (id) => apiFetch(`/stories/${id}/view`, { method: 'POST' })
};

// ── Reels ──
export const reelsAPI = {
  getReels   : (page=1) => apiFetch(`/reels?page=${page}`),
  uploadReel : (data) => apiFetch('/reels', { method: 'POST', body: data }),
  toggleLike : (id) => apiFetch(`/reels/${id}/like`, { method: 'POST' }),
  addComment : (id, content) => apiFetch(`/reels/${id}/comment`, { method: 'POST', body: JSON.stringify({ content }) }),
  shareReel  : (id) => apiFetch(`/reels/${id}/share`, { method: 'POST' }),
};

// ── Utilities ──
export function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

export function getInitials(username='') {
  return username.slice(0, 2).toUpperCase() || '??';
}

export function renderAvatar(user, size='md') {
  if (user?.profilePicture) {
    const img = document.createElement('img');
    img.src = user.profilePicture;
    img.className = `avatar avatar-${size} avatar-img`;
    img.alt = user.username;
    img.onerror = () => { img.replaceWith(makeInitialsAvatar(user, size)); };
    return img;
  }
  return makeInitialsAvatar(user, size);
}

function makeInitialsAvatar(user, size) {
  const div = document.createElement('div');
  div.className = `avatar avatar-${size}`;
  div.style.background = user?.avatarColor || '#6C63FF';
  div.textContent = getInitials(user?.username);
  return div;
}

export function createAvatar(username, color, size='md') {
  return makeInitialsAvatar({ username, avatarColor: color }, size);
}

export function escapeHtml(str='') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/**
 * Render post content with clickable #hashtags and @mentions
 */
export function renderContent(content) {
  return escapeHtml(content)
    .replace(/#([a-zA-Z0-9_]+)/g, '<a class="hashtag-link" href="/hashtag.html?tag=$1">#$1</a>')
    .replace(/@([a-zA-Z0-9_]+)/g, '<span class="mention-link">@$1</span>');
}

// ── Toast ──
let _toastEl;
export function showToast(message, type='info') {
  if (!_toastEl) {
    _toastEl = document.createElement('div');
    _toastEl.className = 'toast-container';
    document.body.appendChild(_toastEl);
  }
  const icons = { success:'✅', error:'❌', info:'💬' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'📢'}</span><span>${escapeHtml(message)}</span>`;
  _toastEl.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}
