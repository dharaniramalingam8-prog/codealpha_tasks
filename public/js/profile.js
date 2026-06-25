import {
  requireAuth, getUser, clearAuth,
  usersAPI, postsAPI,
  renderAvatar, renderContent, formatTime, escapeHtml, showToast
} from './api.js';
import { initTheme, toggleTheme, updateToggleBtn } from './theme.js';
import { initNotifications, toggleNotifDropdown } from './notifications.js';

requireAuth();
initTheme();

const ME = getUser();
const params    = new URLSearchParams(window.location.search);
const profileId = params.get('id') || ME.id;
const isOwn     = profileId === (ME.id || ME._id);

let profileUser   = null;
let postOffset    = 0;
let editingPostId = null;
let selectedPpFile    = null;
let selectedCoverFile = null;
let selectedColor     = null;

const AVATAR_COLORS = ['#6C63FF','#FF6B9D','#00D2FF','#43E97B','#FA8231','#A55EEA','#FFC312','#12CBC4'];

window.logout = () => { clearAuth(); window.location.href = '/index.html'; };
window.goToProfile = (id) => { window.location.href = `/profile.html?id=${id}`; };
window.goToPost    = (id) => { window.location.href = `/post.html?id=${id}`; };
window.toggleNotifDropdown = toggleNotifDropdown;
window.handleThemeToggle = () => { const next = toggleTheme(); updateToggleBtn(next); };
window.markAllNotifRead = async () => {
  const { notificationsAPI } = await import('./api.js');
  await notificationsAPI.markAllRead();
  document.getElementById('notif-badge').style.display = 'none';
};

async function init() {
  updateToggleBtn(localStorage.getItem('vibe_theme') || 'dark');
  setupSearch();
  setupNavAvatar();
  initNotifications();
  await loadProfile();
  loadPosts(true);
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

// ── Load Profile ──
async function loadProfile() {
  try {
    const user = await usersAPI.getUser(profileId);
    profileUser = user;
    document.title = `@${user.username} — Vibe`;
    renderProfileHeader(user);
    renderAbout(user);
  } catch(e) {
    document.getElementById('profile-header').innerHTML =
      '<div class="empty-state"><span class="icon">😕</span><h3>User not found</h3></div>';
  }
}

function renderProfileHeader(user) {
  const uid = user.id || user._id || profileId;

  // Cover
  const coverHtml = user.coverPhoto
    ? `<div class="profile-cover-wrapper" style="position:relative">
         <img src="${escapeHtml(user.coverPhoto)}" class="profile-cover" alt="Cover" onerror="this.style.display='none'" />
         ${isOwn ? `<div class="profile-cover-overlay" onclick="openEditProfile()"><span>📷 Change Cover</span></div>` : ''}
       </div>`
    : `<div class="profile-cover-placeholder">
         ${isOwn ? `<div class="profile-cover-overlay" onclick="openEditProfile()"><span>📷 Add Cover Photo</span></div>` : ''}
       </div>`;

  // Avatar
  const avatarEl = user.profilePicture
    ? `<img src="${escapeHtml(user.profilePicture)}" class="avatar avatar-xl avatar-img profile-avatar-img" alt="${escapeHtml(user.username)}" />`
    : `<div class="avatar avatar-xl profile-avatar-img" style="background:${user.avatarColor}">${(user.username||'').slice(0,2).toUpperCase()}</div>`;

  document.getElementById('profile-header').innerHTML = `
    ${coverHtml}
    <div class="profile-header-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div class="profile-avatar-wrapper">
          ${avatarEl}
          ${isOwn ? `<div class="profile-avatar-edit" onclick="openEditProfile()" title="Edit profile picture">✏️</div>` : ''}
        </div>
        <div style="display:flex;gap:10px;margin-bottom:8px">
          ${isOwn
            ? `<button class="btn btn-secondary btn-sm" onclick="openEditProfile()">✏️ Edit Profile</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="startDM('${uid}')">💬 Message</button>
               <button class="btn ${user.isFollowing?'btn-secondary':'btn-primary'} btn-sm" id="follow-btn" onclick="toggleFollow('${uid}')">
                 ${user.isFollowing ? '✓ Following' : '+ Follow'}
               </button>
               <button class="btn btn-secondary btn-sm" title="Report/Block" onclick="openUserActionsModal('${uid}')">⋮</button>`}
        </div>
      </div>
      <div class="profile-name">
        ${escapeHtml(user.username)}
        ${user.isVerified ? '<span class="verified-badge" title="Verified">⭐</span>' : ''}
        <span class="${user.online ? 'online-dot' : 'offline-dot'}" title="${user.online ? 'Online' : 'Offline'}"></span>
      </div>
      <div class="profile-username">@${escapeHtml(user.username)}</div>
      ${user.bio ? `<div class="profile-bio">${escapeHtml(user.bio)}</div>` : '<div class="profile-bio" style="color:var(--text-muted);font-style:italic">No bio yet.</div>'}
      ${user.website ? `<div style="margin-bottom:14px"><a href="${escapeHtml(user.website)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:.875rem">🔗 ${escapeHtml(user.website)}</a></div>` : ''}
      <div class="profile-stats-grid">
        <div class="stat-item" onclick="openFollowModal('${uid}','followers')">
          <div class="stat-value" id="follower-count">${user.followerCount||0}</div>
          <div class="stat-label">Followers</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${user.postCount||0}</div>
          <div class="stat-label">Posts</div>
        </div>
        <div class="stat-item" onclick="openFollowModal('${uid}','following')">
          <div class="stat-value">${user.followingCount||0}</div>
          <div class="stat-label">Following</div>
        </div>
      </div>
      ${isOwn ? `
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-secondary btn-sm" onclick="window.location.href='/settings.html'">⚙️ Settings</button>
          ${user.role === 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="window.location.href='/admin.html'">🛡️ Admin Panel</button>` : ''}
        </div>
      ` : ''}
    </div>`;
}

// ── Posts ──
async function loadPosts(reset=false) {
  if (reset) { postOffset=0; document.getElementById('user-posts-container').innerHTML=skels(3); }
  try {
    const posts = await usersAPI.getUserPosts(profileId, postOffset);
    if (reset) document.getElementById('user-posts-container').innerHTML = '';
    if (!posts.length && postOffset===0) {
      document.getElementById('user-posts-container').innerHTML = `
        <div class="card empty-state">
          <span class="icon">📝</span><h3>No posts yet</h3>
          <p>${isOwn ? 'Create your first post!' : 'This user hasn\'t posted yet.'}</p>
        </div>`;
      return;
    }
    posts.forEach(p => document.getElementById('user-posts-container').insertAdjacentHTML('beforeend', renderPost(p)));
    postOffset += posts.length;
    document.getElementById('load-more-btn').style.display  = posts.length >= 12 ? 'inline-flex' : 'none';
    document.getElementById('posts-ended').style.display    = posts.length < 12 && postOffset > 0 ? 'block' : 'none';
    if (posts.length >= 12) observeLastPost();
  } catch(e) { showToast(e.message, 'error'); }
}

function observeLastPost() {
  const container = document.getElementById('user-posts-container');
  const lastPost = container.lastElementChild;
  if (!lastPost) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      loadPosts(false);
    }
  }, { threshold: 0.1 });

  observer.observe(lastPost);
}

window.loadMorePosts = () => loadPosts(false);

function renderPost(p) {
  const postId = p._id || p.id;
  const uname  = p.author?.username || profileUser?.username || '';
  const ucolor = p.author?.avatarColor || profileUser?.avatarColor || '#6C63FF';
  const upic   = p.author?.profilePicture || profileUser?.profilePicture || null;
  const uid    = p.author?._id || p.author?.id || profileId;

  const avatarHtml = upic
    ? `<img src="${escapeHtml(upic)}" class="avatar avatar-md avatar-img" alt="${escapeHtml(uname)}" />`
    : `<div class="avatar avatar-md" style="background:${ucolor}">${(uname||'').slice(0,2).toUpperCase()}</div>`;

  return `
  <div class="card post-card" id="post-${postId}">
    <div class="post-header">
      ${avatarHtml}
      <div class="post-author">
        <div class="name">@${escapeHtml(uname)}</div>
        <div class="time">${formatTime(p.createdAt)}${p.edited?'<span class="edited-badge"> · edited</span>':''}</div>
      </div>
      ${isOwn ? `
        <button class="action-btn edit-btn" onclick="openEditPost('${postId}')" title="Edit">✏️</button>
        <button class="action-btn delete-btn" onclick="deletePost('${postId}')" title="Delete">🗑️</button>
      ` : ''}
    </div>
    <div class="post-content" id="pcontent-${postId}">${renderContent(p.content)}</div>
    ${p.imageUrl ? `<img class="post-image" src="${escapeHtml(p.imageUrl)}" alt="Post image" onerror="this.style.display='none'" />` : ''}
    ${p.hashtags?.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${p.hashtags.map(h=>`<a class="hashtag-link" href="/hashtag.html?tag=${encodeURIComponent(h)}">#${escapeHtml(h)}</a>`).join('')}</div>` : ''}
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
      <button class="action-btn" onclick="sharePost('${postId}')">
        <span class="icon">🔗</span>
      </button>
    </div>
  </div>`;
}

function skels(n) {
  return Array.from({length:n},()=>`<div class="card post-card"><div class="post-header"><div class="skeleton" style="width:48px;height:48px;border-radius:50%"></div><div style="flex:1"><div class="skeleton" style="height:14px;width:120px;margin-bottom:6px;border-radius:4px"></div></div></div><div class="skeleton" style="height:60px;margin:12px 0;border-radius:8px"></div></div>`).join('');
}

// ── Like / Save / Share / Delete / Edit Post ──
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

window.toggleSave = async (postId) => {
  try {
    const btn=document.getElementById(`save-btn-${postId}`);
    if (!btn) return;
    const wasSaved=btn.classList.contains('liked');
    btn.classList.toggle('liked',!wasSaved); btn.querySelector('.icon').textContent=wasSaved?'🔖':'💾';
    const res=await postsAPI.toggleSave(postId);
    btn.classList.toggle('liked',res.saved);
    btn.querySelector('.icon').textContent=res.saved?'💾':'🔖';
  } catch(e) { showToast(e.message,'error'); }
};

window.sharePost = async (postId) => {
  try {
    await postsAPI.sharePost(postId);
    const url = `${window.location.origin}/post.html?id=${postId}`;
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard! 🔗', 'success');
  } catch(e) { showToast('Could not share post', 'error'); }
};
window.deletePost = async (postId) => {
  if(!confirm('Delete this post?')) return;
  try {
    await postsAPI.deletePost(postId);
    const el=document.getElementById(`post-${postId}`);
    el.style.transition='all .3s ease'; el.style.opacity='0'; el.style.transform='scale(0.95)';
    setTimeout(()=>el.remove(),300); showToast('Deleted','success');
  } catch(e) { showToast(e.message,'error'); }
};
window.openEditPost = async (postId) => {
  editingPostId=postId;
  try {
    const post=await postsAPI.getPost(postId);
    document.getElementById('edit-post-content').value=post.content;
    document.getElementById('edit-post-modal').classList.add('show');
  } catch(e) { showToast(e.message,'error'); }
};
window.closeEditPostModal = () => { document.getElementById('edit-post-modal').classList.remove('show'); editingPostId=null; };
window.savePostEdit = async () => {
  if(!editingPostId) return;
  const content=document.getElementById('edit-post-content').value.trim();
  if(!content) return showToast('Content required','error');
  const btn=document.getElementById('edit-post-save-btn'); btn.disabled=true; btn.innerHTML='<span class="spinner"></span>';
  try {
    const updated=await postsAPI.updatePost(editingPostId,{content});
    const el=document.getElementById(`pcontent-${editingPostId}`); if(el) el.innerHTML=renderContent(updated.content);
    closeEditPostModal(); showToast('Updated ✨','success');
  } catch(e) { showToast(e.message,'error'); }
  finally { btn.disabled=false; btn.innerHTML='Save'; }
};

// ── Follow ──
window.toggleFollow = async (uid) => {
  try {
    const btn=document.getElementById('follow-btn');
    const res=await usersAPI.toggleFollow(uid);
    btn.textContent=res.following?'✓ Following':'+ Follow';
    btn.className=`btn ${res.following?'btn-secondary':'btn-primary'} btn-sm`;
    const fc=document.getElementById('follower-count');
    if(fc) fc.textContent=parseInt(fc.textContent)+(res.following?1:-1);
    showToast(res.following?'Following! 🎉':'Unfollowed',res.following?'success':'info');
  } catch(e) { showToast(e.message,'error'); }
};

window.startDM = (uid) => { window.location.href=`/messages.html?user=${uid}`; };

window.openUserActionsModal = (uid) => {
  if (confirm('Do you want to Block this user? They will not be able to interact with you.')) {
    blockUser(uid);
  } else if (confirm('Do you want to Report this user?')) {
    const reason = prompt('Please enter the reason for reporting:');
    if (reason) reportUser(uid, reason);
  }
};

async function blockUser(uid) {
  try {
    await usersAPI.blockUser(uid);
    showToast('User blocked', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

async function reportUser(uid, reason) {
  try {
    await usersAPI.reportUser(uid, { reason, type: 'harassment' });
    showToast('User reported', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Tab ──
window.showTab = (tab) => {
  document.getElementById('posts-section').style.display=tab==='posts'?'':'none';
  document.getElementById('about-section').style.display=tab==='about'?'':'none';
  document.getElementById('tab-posts').className=`profile-tab ${tab==='posts'?'active':''}`;
  document.getElementById('tab-about').className=`profile-tab ${tab==='about'?'active':''}`;
};

// ── About ──
function renderAbout(user) {
  document.getElementById('about-card').innerHTML = `
    <h3 style="margin-bottom:16px;font-size:1.1rem">About @${escapeHtml(user.username)}</h3>
    <div style="display:flex;flex-direction:column;gap:12px;color:var(--text-secondary);font-size:.9rem">
      ${user.bio?`<div>📝 ${escapeHtml(user.bio)}</div>`:''}
      ${user.website?`<div>🔗 <a href="${escapeHtml(user.website)}" target="_blank">${escapeHtml(user.website)}</a></div>`:''}
      <div>📅 Joined ${new Date(user.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long'})}</div>
      <div>📝 ${user.postCount||0} posts</div>
      <div>👥 ${user.followerCount||0} followers · ${user.followingCount||0} following</div>
    </div>`;
}

// ── Edit Profile ──
window.openEditProfile = function() {
  if (!profileUser) return;
  document.getElementById('edit-username').value = profileUser.username || '';
  document.getElementById('edit-bio').value      = profileUser.bio || '';
  document.getElementById('edit-website').value  = profileUser.website || '';

  // Color picker
  const picker = document.getElementById('color-picker');
  picker.innerHTML = AVATAR_COLORS.map(c => `
    <div onclick="selectAvatarColor('${c}')" id="color-${c.replace('#','')}"
         style="width:32px;height:32px;border-radius:50%;background:${c};cursor:pointer;
                border:3px solid ${c===profileUser.avatarColor?'white':'transparent'};
                transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`).join('');

  // Preview current profile pic
  const ppEl = document.getElementById('pp-preview-avatar');
  ppEl.className = profileUser.profilePicture ? '' : 'avatar avatar-md';
  if (profileUser.profilePicture) {
    ppEl.outerHTML = `<img id="pp-preview-avatar" src="${escapeHtml(profileUser.profilePicture)}" class="avatar avatar-md avatar-img" alt="pic" />`;
  } else {
    ppEl.style.background = profileUser.avatarColor;
    ppEl.textContent = (profileUser.username||'').slice(0,2).toUpperCase();
  }

  // Preview current cover
  const coverWrap = document.getElementById('cover-preview-wrap');
  if (profileUser.coverPhoto) {
    coverWrap.innerHTML = `<img src="${escapeHtml(profileUser.coverPhoto)}" style="width:80px;height:48px;border-radius:8px;object-fit:cover" alt="cover" />`;
  } else {
    coverWrap.innerHTML = `<div style="width:80px;height:48px;border-radius:8px;background:var(--accent-gradient)"></div>`;
  }

  document.getElementById('edit-profile-modal').classList.add('show');
};

window.previewProfilePic = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedPpFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    const wrap = document.getElementById('pp-preview-wrap');
    wrap.innerHTML = `<img src="${ev.target.result}" class="avatar avatar-md avatar-img" alt="preview" />`;
  };
  reader.readAsDataURL(file);
};

window.previewCoverPhoto = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedCoverFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('cover-preview-wrap').innerHTML =
      `<img src="${ev.target.result}" style="width:80px;height:48px;border-radius:8px;object-fit:cover" alt="cover preview" />`;
  };
  reader.readAsDataURL(file);
};

window.selectAvatarColor = (color) => {
  selectedColor = color;
  document.querySelectorAll('#color-picker > div').forEach(d => {
    d.style.border = d.id === `color-${color.replace('#','')}` ? '3px solid white' : '3px solid transparent';
  });
};

window.closeEditProfile = () => {
  document.getElementById('edit-profile-modal').classList.remove('show');
  selectedPpFile = selectedCoverFile = selectedColor = null;
};

window.saveProfile = async function() {
  const bio      = document.getElementById('edit-bio').value.trim();
  const website  = document.getElementById('edit-website').value.trim();
  const username = document.getElementById('edit-username').value.trim();
  const btn      = document.getElementById('save-profile-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

  try {
    const formData = new FormData();
    formData.append('bio', bio);
    formData.append('website', website);
    if (username) formData.append('username', username);
    if (selectedColor) formData.append('avatarColor', selectedColor);
    if (selectedPpFile)    formData.append('profilePicture', selectedPpFile);
    if (selectedCoverFile) formData.append('coverPhoto', selectedCoverFile);

    const updated = await usersAPI.updateProfile(profileId, formData);
    profileUser = updated;
    renderProfileHeader(updated);
    renderAbout(updated);
    closeEditProfile();
    showToast('Profile updated ✨', 'success');
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled=false; btn.innerHTML='Save Changes'; }
};

// ── Follow Modal ──
window.openFollowModal = async (uid, type) => {
  const overlay = document.getElementById('follow-modal');
  document.getElementById('follow-modal-title').textContent = type==='followers'?'Followers':'Following';
  document.getElementById('follow-modal-list').innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner"></span></div>';
  overlay.classList.add('show');
  try {
    const users = type==='followers' ? await usersAPI.getFollowers(uid) : await usersAPI.getFollowing(uid);
    document.getElementById('follow-modal-list').innerHTML = users.length
      ? users.map(u=>`
          <div class="user-list-item" onclick="goToProfile('${u._id||u.id}');closeFollowModal()">
            <div class="avatar avatar-sm" style="background:${u.avatarColor}">${(u.username||'').slice(0,2).toUpperCase()}</div>
            <div class="user-list-info">
              <div class="user-list-name">@${escapeHtml(u.username)}</div>
              <div class="user-list-bio">${escapeHtml(u.bio||'No bio')}</div>
            </div>
          </div>`).join('')
      : '<p style="padding:16px;color:var(--text-muted);text-align:center">Nobody here yet.</p>';
  } catch(e) {
    document.getElementById('follow-modal-list').innerHTML = `<p style="padding:16px;color:var(--danger)">${e.message}</p>`;
  }
};
window.closeFollowModal = () => document.getElementById('follow-modal').classList.remove('show');

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
          ? users.map(u=>`<div class="search-result-item" onclick="goToProfile('${u._id||u.id}');results.classList.remove('show')"><div class="avatar avatar-sm" style="background:${u.avatarColor}">${(u.username||'').slice(0,2).toUpperCase()}</div><span class="username">@${escapeHtml(u.username)}</span></div>`).join('')
          : '<div style="padding:12px 14px;font-size:.85rem;color:var(--text-muted)">No users found</div>';
        results.classList.add('show');
      } catch(e) {}
    }, 350);
  });
  document.addEventListener('click', e => { if(!e.target.closest('.search-wrapper')) results.classList.remove('show'); });
}

init();
