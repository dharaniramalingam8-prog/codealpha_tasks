import {
  requireAuth, getUser, clearAuth,
  postsAPI, usersAPI, hashtagsAPI, messagesAPI, storiesAPI,
  renderAvatar, renderContent, formatTime, escapeHtml, showToast
} from './api.js';
import { initTheme, toggleTheme, updateToggleBtn } from './theme.js';
import { initNotifications, toggleNotifDropdown } from './notifications.js';

requireAuth();
initTheme();

const ME = getUser();
let currentTab = 'feed';
let offset = 0;
const LIMIT = 15;
let isLoading = false;
let editingPostId = null;
let selectedImageFile = null;

// ── Expose globals ──
window.logout = () => { clearAuth(); window.location.href = '/index.html'; };
window.goToProfile = (id) => { window.location.href = `/profile.html?id=${id}`; };
window.goToPost    = (id) => { window.location.href = `/post.html?id=${id}`; };
window.toggleNotifDropdown = toggleNotifDropdown;
window.handleThemeToggle = () => {
  const next = toggleTheme();
  updateToggleBtn(next);
};
window.markAllRead = async () => {
  const { notificationsAPI } = await import('./api.js');
  await notificationsAPI.markAllRead();
  document.getElementById('notif-badge').style.display = 'none';
};

// Stories state
let feedStories = [];
let currentStoryGroupIndex = 0;
let currentStoryIndex = 0;
let storyTimer = null;

// ── Init ──
async function init() {
  updateToggleBtn(localStorage.getItem('vibe_theme') || 'dark');
  loadSelfWidget();
  loadSuggestions();
  loadTrending();
  loadStories();
  setupStoryUpload();
  loadPosts(true);
  setupSearch();
  setupEditModal();
  initNotifications();
  loadDMBadge();
}

// ── DM Badge ──
async function loadDMBadge() {
  try {
    const { count } = await messagesAPI.getUnreadCount();
    const badge = document.getElementById('dm-badge');
    if (count > 0) { badge.textContent = count; badge.style.display = 'flex'; }
  } catch(e) {}
}

// ── Self Profile Widget ──
async function loadSelfWidget() {
  try {
    const user = await usersAPI.getUser(ME.id);

    // Nav avatar
    const navAv = document.getElementById('nav-avatar');
    navAv.innerHTML = '';
    const av = renderAvatar(user, 'sm');
    av.style.cursor = 'pointer';
    av.title = 'My Profile';
    av.onclick = () => goToProfile(user.id || user._id);
    navAv.appendChild(av);

    // Create-post avatar
    const cpAv = document.getElementById('create-post-avatar');
    cpAv.innerHTML = '';
    cpAv.appendChild(renderAvatar(user, 'md'));

    // Left sidebar
    document.getElementById('self-avatar').innerHTML = '';
    document.getElementById('self-avatar').appendChild(renderAvatar(user, 'lg'));
    document.getElementById('self-username').textContent = '@' + user.username;
    document.getElementById('self-bio').textContent = user.bio || 'No bio yet';
    document.getElementById('self-posts').textContent = user.postCount;
    document.getElementById('self-followers').textContent = user.followerCount;
    document.getElementById('self-following').textContent = user.followingCount;

    const uid = user.id || user._id;
    document.getElementById('view-profile-link').href = `/profile.html?id=${uid}`;
    document.getElementById('self-posts-stat').onclick     = () => goToProfile(uid);
    document.getElementById('self-followers-stat').onclick = () => openFollowModal(uid, 'followers');
    document.getElementById('self-following-stat').onclick = () => openFollowModal(uid, 'following');
  } catch(e) { console.error(e); }
}

// ── Trending ──
async function loadTrending() {
  try {
    const tags = await hashtagsAPI.getTrending();
    const el = document.getElementById('trending-list');
    if (!tags.length) { el.innerHTML = '<p style="font-size:.82rem;color:var(--text-muted)">No hashtags yet.</p>'; return; }
    el.innerHTML = tags.map((t, i) => `
      <a class="trending-item" href="/hashtag.html?tag=${encodeURIComponent(t.tag)}">
        <div>
          <div class="trending-tag">#${escapeHtml(t.tag)}</div>
        </div>
        <span class="trending-count">${t.count} posts</span>
      </a>`).join('');
  } catch(e) { console.error(e); }
}

// ── Tab ──
window.setTab = function(tab) {
  currentTab = tab;
  offset = 0;
  document.getElementById('posts-container').innerHTML = '';
  document.getElementById('btn-feed').className    = `btn btn-${tab==='feed'?'primary':'secondary'} btn-sm btn-block`;
  document.getElementById('btn-explore').className = `btn btn-${tab==='explore'?'primary':'secondary'} btn-sm btn-block`;
  loadPosts(true);
};

// ── Load Posts ──
async function loadPosts(reset=false) {
  if (isLoading) return;
  isLoading = true;
  if (reset) { offset = 0; document.getElementById('posts-container').innerHTML = skeletons(3); }

  try {
    const posts = currentTab === 'feed'
      ? await postsAPI.getFeed(offset)
      : await postsAPI.getExplore(offset);

    if (reset) document.getElementById('posts-container').innerHTML = '';

    if (!posts.length && offset === 0) {
      document.getElementById('posts-container').innerHTML = `
        <div class="card empty-state">
          <span class="icon">${currentTab==='feed'?'👋':'🌍'}</span>
          <h3>${currentTab==='feed'?'Your feed is empty!':'No posts yet'}</h3>
          <p>${currentTab==='feed'?'Follow people or create your first post!':'Be the first to post!'}</p>
        </div>`;
      document.getElementById('load-more-btn').style.display = 'none';
      return;
    }

    posts.forEach(p => document.getElementById('posts-container').insertAdjacentHTML('beforeend', renderPost(p)));
    offset += posts.length;

    const loadBtn = document.getElementById('load-more-btn');
    const allMsg  = document.getElementById('all-loaded');
    if (posts.length < LIMIT) { loadBtn.style.display='none'; if(offset>0) allMsg.style.display='block'; }
    else { loadBtn.style.display='inline-flex'; allMsg.style.display='none'; observeLastPost(); }
  } catch(e) { showToast(e.message, 'error'); }
  finally { isLoading = false; }
}

function observeLastPost() {
  const container = document.getElementById('posts-container');
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

// ── Render Post ──
function renderPost(p) {
  const uid    = p.author?._id || p.author?.id || '';
  const uname  = p.author?.username || '';
  const ucolor = p.author?.avatarColor || '#6C63FF';
  const upic   = p.author?.profilePicture || null;
  const postId = p._id || p.id;
  const isOwn  = uid.toString() === (ME.id||'').toString();

  const avatarHtml = upic
    ? `<img src="${escapeHtml(upic)}" class="avatar avatar-md avatar-img" style="cursor:pointer" onclick="goToProfile('${uid}')" alt="${escapeHtml(uname)}" onerror="this.outerHTML='<div class=\\'avatar avatar-md\\' style=\\'background:${ucolor};cursor:pointer\\' onclick=\\'goToProfile(\\'${uid}\\')\\'>'+${JSON.stringify(uname.slice(0,2).toUpperCase())}+'</div>'" />`
    : `<div class="avatar avatar-md" style="background:${ucolor};cursor:pointer" onclick="goToProfile('${uid}')">${uname.slice(0,2).toUpperCase()}</div>`;

  return `
  <div class="card post-card" id="post-${postId}">
    <div class="post-header">
      ${avatarHtml}
      <div class="post-author">
        <div class="name" onclick="goToProfile('${uid}')">@${escapeHtml(uname)}</div>
        <div class="time">${formatTime(p.createdAt)}${p.edited?'<span class="edited-badge"> · edited</span>':''}</div>
      </div>
      ${isOwn ? `
        <button class="action-btn edit-btn" onclick="openEditModal('${postId}')" title="Edit">✏️</button>
        <button class="action-btn delete-btn" onclick="deletePost('${postId}')" title="Delete">🗑️</button>
      ` : ''}
    </div>
    <div class="post-content" id="content-${postId}">${renderContent(p.content)}</div>
    ${p.imageUrl ? `<img class="post-image" src="${escapeHtml(p.imageUrl)}" alt="Post image" onclick="goToPost('${postId}')" onerror="this.style.display='none'" />` : ''}
    
    ${p.poll && p.poll.options && p.poll.options.length ? `
      <div class="poll-container" style="background:var(--bg-hover); padding:15px; border-radius:10px; margin: 10px 0;">
        <h4 style="margin-bottom:12px;">${escapeHtml(p.poll.question)}</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${p.poll.options.map((opt, i) => {
            const totalVotes = p.poll.options.reduce((sum, o) => sum + o.votes, 0);
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const userVoted = opt.voters.some(v => v.toString() === ME.id.toString());
            const userVotedAny = p.poll.options.some(o => o.voters.some(v => v.toString() === ME.id.toString()));
            
            return `
              <div class="poll-option" style="position:relative; background:var(--bg-card); border:1px solid var(--glass-border); border-radius:6px; cursor:${userVotedAny ? 'default' : 'pointer'}; overflow:hidden;" onclick="${userVotedAny ? '' : `votePoll('${postId}', ${i})`}">
                <div style="position:absolute; top:0; left:0; height:100%; width:${percent}%; background:var(--accent); opacity:0.2; transition:width 0.3s ease;"></div>
                <div style="position:relative; padding:10px 14px; display:flex; justify-content:space-between; z-index:1;">
                  <span style="${userVoted ? 'font-weight:bold' : ''}">${escapeHtml(opt.text)} ${userVoted ? '✓' : ''}</span>
                  <span style="font-size:0.85rem; color:var(--text-muted);">${userVotedAny ? percent + '%' : ''}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:8px; text-align:right;">
          ${p.poll.options.reduce((sum, o) => sum + o.votes, 0)} votes
        </div>
      </div>
    ` : ''}

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
        <span id="share-count-${postId}">${p.shareCount || 0}</span>
      </button>
      <button class="action-btn" onclick="openDM('${uid}')" title="Message @${escapeHtml(uname)}" style="${isOwn?'display:none':''}">
        <span class="icon">✉️</span>
      </button>
    </div>
  </div>`;
}

// ── Vote Poll ──
window.votePoll = async function(postId, optionIndex) {
  try {
    const res = await postsAPI.votePoll(postId, optionIndex);
    // Reload the post to show updated poll visually
    const postData = await postsAPI.getPost(postId);
    const postCard = document.getElementById(`post-${postId}`);
    if (postCard) {
      postCard.outerHTML = renderPost(postData);
    }
  } catch(e) {
    showToast(e.message, 'error');
  }
};

// ── Open DM from post ──
window.openDM = async function(userId) {
  window.location.href = `/messages.html?user=${userId}`;
};

function skeletons(n) {
  return Array.from({length:n}, ()=>`
    <div class="card post-card">
      <div class="post-header">
        <div class="skeleton" style="width:48px;height:48px;border-radius:50%"></div>
        <div style="flex:1"><div class="skeleton" style="height:14px;width:120px;margin-bottom:6px;border-radius:4px"></div><div class="skeleton" style="height:12px;width:80px;border-radius:4px"></div></div>
      </div>
      <div class="skeleton" style="height:60px;margin:12px 0;border-radius:8px"></div>
      <div class="skeleton" style="height:32px;width:140px;border-radius:20px"></div>
    </div>`).join('');
}

// ── Image Upload ──
window.triggerFileInput = function() {
  document.getElementById('post-image-file').click();
};
window.handleImageSelect = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }
  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('image-preview').src = ev.target.result;
    document.getElementById('upload-placeholder').style.display = 'none';
    document.getElementById('image-preview-container').style.display = 'block';
    document.getElementById('upload-area').classList.add('has-preview');
  };
  reader.readAsDataURL(file);
};
window.removeImage = function(e) {
  e.stopPropagation();
  selectedImageFile = null;
  document.getElementById('post-image-file').value = '';
  document.getElementById('upload-placeholder').style.display = '';
  document.getElementById('image-preview-container').style.display = 'none';
  document.getElementById('upload-area').classList.remove('has-preview');
};

// ── Create Post ──
window.updateCharCounter = function() {
  const len = document.getElementById('post-textarea').value.length;
  const el  = document.getElementById('char-counter');
  el.textContent = `${len} / 500`;
  el.className   = 'char-counter' + (len>450?' warning':'') + (len>=500?' danger':'');
};

window.togglePollInputs = function() {
  const container = document.getElementById('poll-inputs-container');
  container.style.display = container.style.display === 'none' ? 'block' : 'none';
};

window.addPollOption = function() {
  const list = document.getElementById('poll-options-list');
  if (list.children.length >= 4) return showToast('Maximum 4 options allowed', 'error');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input poll-option-input';
  input.placeholder = `Option ${list.children.length + 1}`;
  input.style.width = '100%';
  list.appendChild(input);
};

window.createPost = async function() {
  const content = document.getElementById('post-textarea').value.trim();
  if (!content && !selectedImageFile) return showToast('Post must have text or an image', 'error');

  const btn = document.getElementById('post-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

  try {
    const formData = new FormData();
    formData.append('content', content);
    if (selectedImageFile) formData.append('image', selectedImageFile);

    const pollContainer = document.getElementById('poll-inputs-container');
    if (pollContainer.style.display !== 'none') {
      const q = document.getElementById('poll-question').value.trim();
      const opts = Array.from(document.querySelectorAll('.poll-option-input')).map(i => i.value.trim()).filter(Boolean);
      if (q && opts.length >= 2) {
        formData.append('pollQuestion', q);
        formData.append('pollOptions', JSON.stringify(opts));
      }
    }

    const post = await postsAPI.createPost(formData);
    document.getElementById('post-textarea').value = '';
    removeImage({ stopPropagation: ()=>{} });
    
    // Reset Poll UI
    document.getElementById('poll-question').value = '';
    document.getElementById('poll-options-list').innerHTML = `
      <input type="text" class="input poll-option-input" placeholder="Option 1" style="width: 100%;">
      <input type="text" class="input poll-option-input" placeholder="Option 2" style="width: 100%;">
    `;
    pollContainer.style.display = 'none';

    document.getElementById('char-counter').textContent = '0 / 500';
    document.getElementById('posts-container').insertAdjacentHTML('afterbegin', renderPost(post));
    showToast('Posted! ✨', 'success');
    loadSelfWidget();
    loadTrending();
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled=false; btn.innerHTML='Post ✨'; }
};

// ── Like ──
window.toggleLike = async function(postId) {
  try {
    const btn   = document.getElementById(`like-btn-${postId}`);
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

// ── Delete Post ──
window.deletePost = async function(postId) {
  if (!confirm('Delete this post?')) return;
  try {
    await postsAPI.deletePost(postId);
    const el = document.getElementById(`post-${postId}`);
    el.style.transition='all .3s ease'; el.style.opacity='0'; el.style.transform='scale(0.95)';
    setTimeout(()=>el.remove(), 300);
    showToast('Post deleted', 'success');
  } catch(e) { showToast(e.message, 'error'); }
};

// ── Edit Post ──
function setupEditModal() {
  document.getElementById('edit-modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditModal();
  });
}
window.openEditModal = async function(postId) {
  editingPostId = postId;
  try {
    const post = await postsAPI.getPost(postId);
    document.getElementById('edit-content').value = post.content;
    document.getElementById('edit-modal-overlay').classList.add('show');
    document.getElementById('edit-content').focus();
  } catch(e) { showToast(e.message, 'error'); }
};
window.closeEditModal = function() {
  document.getElementById('edit-modal-overlay').classList.remove('show');
  editingPostId = null;
};
window.submitEdit = async function() {
  if (!editingPostId) return;
  const content = document.getElementById('edit-content').value.trim();
  if (!content) return showToast('Content cannot be empty', 'error');
  const btn = document.getElementById('edit-save-btn');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>';
  try {
    const updated = await postsAPI.updatePost(editingPostId, { content });
    const el = document.getElementById(`content-${editingPostId}`);
    if (el) el.innerHTML = renderContent(updated.content);
    const timeEl = document.querySelector(`#post-${editingPostId} .time`);
    if (timeEl) timeEl.innerHTML = `${formatTime(updated.createdAt)}<span class="edited-badge"> · edited</span>`;
    closeEditModal();
    showToast('Post updated ✨', 'success');
    loadTrending();
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled=false; btn.innerHTML='Save Changes'; }
};

// ── Suggestions ──
async function loadSuggestions() {
  try {
    const users = await usersAPI.getSuggestions();
    const el = document.getElementById('suggestions-list');
    if (!users.length) { el.innerHTML='<p style="font-size:.82rem;color:var(--text-muted)">No suggestions right now.</p>'; return; }
    el.innerHTML = users.map(u => {
      const av = u.profilePicture
        ? `<img src="${escapeHtml(u.profilePicture)}" class="avatar avatar-sm avatar-img" style="cursor:pointer" onclick="goToProfile('${u._id||u.id}')" alt="${escapeHtml(u.username)}" />`
        : `<div class="avatar avatar-sm" style="background:${u.avatarColor};cursor:pointer" onclick="goToProfile('${u._id||u.id}')">${(u.username||'').slice(0,2).toUpperCase()}</div>`;
      return `
      <div class="suggestion-item">
        ${av}
        <div class="suggestion-info">
          <div class="suggestion-name" onclick="goToProfile('${u._id||u.id}')">@${escapeHtml(u.username)}</div>
          <div class="suggestion-bio">${escapeHtml(u.bio||'No bio')}</div>
        </div>
        <button class="follow-btn" id="sug-${u._id||u.id}" onclick="sugFollow('${u._id||u.id}')">Follow</button>
      </div>`;
    }).join('');
  } catch(e) {}
}

window.sugFollow = async function(uid) {
  try {
    const res = await usersAPI.toggleFollow(uid);
    const btn = document.getElementById(`sug-${uid}`);
    btn.textContent = res.following ? 'Following' : 'Follow';
    btn.classList.toggle('following', res.following);
    showToast(res.following ? 'Following! 🎉' : 'Unfollowed', res.following?'success':'info');
  } catch(e) { showToast(e.message,'error'); }
};

// ── Search ──
function setupSearch() {
  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { results.classList.remove('show'); return; }
    debounce = setTimeout(async () => {
      try {
        const users = await usersAPI.search(q);
        results.innerHTML = users.length
          ? users.map(u=>`
              <div class="search-result-item" onclick="goToProfile('${u._id||u.id}');results.classList.remove('show')">
                <div class="avatar avatar-sm" style="background:${u.avatarColor}">${(u.username||'').slice(0,2).toUpperCase()}</div>
                <span class="username">@${escapeHtml(u.username)}</span>
              </div>`).join('')
          : '<div style="padding:12px 14px;font-size:.85rem;color:var(--text-muted)">No users found</div>';
        results.classList.add('show');
      } catch(e) {}
    }, 350);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) results.classList.remove('show');
  });
}

// ── Follow Modal ──
window.openFollowModal = async function(userId, type) {
  const overlay = document.getElementById('follow-modal');
  document.getElementById('follow-modal-title').textContent = type==='followers'?'Followers':'Following';
  document.getElementById('follow-modal-list').innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner"></span></div>';
  overlay.classList.add('show');
  try {
    const users = type==='followers' ? await usersAPI.getFollowers(userId) : await usersAPI.getFollowing(userId);
    document.getElementById('follow-modal-list').innerHTML = users.length
      ? users.map(u=>`
          <div class="user-list-item" onclick="goToProfile('${u._id||u.id}');closeModal()">
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
window.closeModal = () => document.getElementById('follow-modal').classList.remove('show');

// ── Stories ──
function setupStoryUpload() {
  const input = document.getElementById('story-upload-input');
  if (!input) return;
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showToast('Uploading story...', 'info');
      const formData = new FormData();
      formData.append('image', file);
      await storiesAPI.upload(formData);
      showToast('Story added! 📸', 'success');
      loadStories();
    } catch(err) {
      showToast(err.message, 'error');
    }
    e.target.value = '';
  });
}

async function loadStories() {
  try {
    feedStories = await storiesAPI.getFeed();
    const tray = document.getElementById('stories-tray');
    if (!tray) return;
    // Keep the first child (Add Story button)
    const addBtn = tray.firstElementChild;
    tray.innerHTML = '';
    tray.appendChild(addBtn);

    feedStories.forEach((group, index) => {
      const allViewed = group.stories.every(s => s.viewed);
      const ringClass = allViewed ? 'story-ring viewed' : 'story-ring';
      const u = group.user;

      const avatarHtml = u.profilePicture
        ? `<img src="${u.profilePicture}" class="avatar" alt="${escapeHtml(u.username)}">`
        : `<div class="avatar" style="background:${u.avatarColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:.7rem">${u.username.slice(0,2).toUpperCase()}</div>`;

      const el = document.createElement('div');
      el.className = 'story-item';
      el.onclick = () => openStoryViewer(index);
      el.innerHTML = `
        <div class="${ringClass}">${avatarHtml}</div>
        <div class="story-username">${u._id === ME.id ? 'Your Story' : escapeHtml(u.username)}</div>
      `;
      tray.appendChild(el);
    });
  } catch(e) { console.error('Failed to load stories', e); }
}

window.openStoryViewer = (groupIndex) => {
  currentStoryGroupIndex = groupIndex;
  currentStoryIndex = 0;
  const group = feedStories[currentStoryGroupIndex];
  if (!group) return;
  const firstUnread = group.stories.findIndex(s => !s.viewed);
  if (firstUnread !== -1) currentStoryIndex = firstUnread;

  document.getElementById('story-viewer').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderCurrentStory();
};

window.closeStoryViewer = () => {
  document.getElementById('story-viewer').style.display = 'none';
  document.body.style.overflow = '';
  clearTimeout(storyTimer);
  loadStories(); // refresh rings
};

function renderCurrentStory() {
  clearTimeout(storyTimer);
  const group = feedStories[currentStoryGroupIndex];
  if (!group) return closeStoryViewer();
  const story = group.stories[currentStoryIndex];
  if (!story) {
    // Move to next group
    if (currentStoryGroupIndex + 1 < feedStories.length) {
      currentStoryGroupIndex++;
      currentStoryIndex = 0;
      return renderCurrentStory();
    } else {
      return closeStoryViewer();
    }
  }

  // Mark viewed
  if (!story.viewed) {
    story.viewed = true;
    storiesAPI.markViewed(story._id).catch(() => {});
  }

  // Update image
  document.getElementById('story-image').src = story.imageUrl;

  // Update author info
  const u = group.user;
  const avContainer = document.getElementById('story-author-avatar');
  avContainer.innerHTML = u.profilePicture
    ? `<img src="${u.profilePicture}" class="avatar avatar-sm avatar-img" alt="${escapeHtml(u.username)}">`
    : `<div class="avatar avatar-sm" style="background:${u.avatarColor}">${u.username.slice(0,2).toUpperCase()}</div>`;
  document.getElementById('story-author-name').innerHTML =
    `@${escapeHtml(u.username)} ${u.isVerified ? '<span class="verified-badge" style="font-size:0.8rem">⭐</span>' : ''} <span style="font-weight:400;font-size:0.8rem;opacity:0.7;margin-left:8px">${formatTime(story.createdAt)}</span>`;

  // Render progress bar segments
  const bar = document.getElementById('story-progress-bar');
  bar.innerHTML = group.stories.map((_, i) => `
    <div class="story-progress-segment">
      <div class="story-progress-fill" id="story-fill-${i}" style="width: ${i < currentStoryIndex ? '100%' : '0%'}"></div>
    </div>
  `).join('');

  // Animate current segment
  setTimeout(() => {
    const fill = document.getElementById(`story-fill-${currentStoryIndex}`);
    if (fill) {
      fill.style.transition = 'width 5s linear';
      fill.style.width = '100%';
    }
  }, 50);

  // Auto advance after 5 seconds
  storyTimer = setTimeout(() => nextStory(), 5000);
}

window.nextStory = () => {
  currentStoryIndex++;
  renderCurrentStory();
};

window.prevStory = () => {
  if (currentStoryIndex > 0) {
    currentStoryIndex--;
    renderCurrentStory();
  } else if (currentStoryGroupIndex > 0) {
    currentStoryGroupIndex--;
    currentStoryIndex = feedStories[currentStoryGroupIndex].stories.length - 1;
    renderCurrentStory();
  } else {
    currentStoryIndex = 0;
    renderCurrentStory();
  }
};

// Escape key closes story viewer
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('story-viewer').style.display === 'flex') {
    closeStoryViewer();
  }
  if (e.key === 'ArrowRight' && document.getElementById('story-viewer').style.display === 'flex') {
    nextStory();
  }
  if (e.key === 'ArrowLeft' && document.getElementById('story-viewer').style.display === 'flex') {
    prevStory();
  }
});

init();
