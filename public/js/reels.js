import {
  requireAuth, getUser, clearAuth,
  reelsAPI, usersAPI, postsAPI,
  formatTime, escapeHtml, showToast, renderAvatar
} from './api.js';

requireAuth();
const ME = getUser();

let reels = [];
let currentPage = 1;
let isLoading = false;
let currentReelId = null;
let progressTimers = {};

// ── Boot ──────────────────────────────────────────────────────────────────
async function init() {
  setupSidebarUser();
  setupThemeToggle();
  await loadReels();
  setupIntersectionObserver();
  loadSuggestedUsers();
  renderTrendingAudio();
}

// ── Sidebar user info ─────────────────────────────────────────────────────
async function setupSidebarUser() {
  const sideUsername = document.getElementById('sidebar-username');
  const sideHandle   = document.getElementById('sidebar-handle');
  const sideAvatar   = document.getElementById('sidebar-user-avatar');
  const topAvatar    = document.getElementById('nav-avatar-top');
  const profileLink  = document.getElementById('profile-link');

  if (ME) {
    sideUsername.textContent = ME.username || 'You';
    sideHandle.textContent   = `@${ME.username || ''}`;
    if (profileLink) profileLink.href = `/profile.html?id=${ME.id}`;
  }

  try {
    const user = await usersAPI.getUser(ME.id);
    sideUsername.textContent = user.username;
    sideHandle.textContent   = `@${user.username}`;

    const av = renderAvatar(user, 'sm');
    av.style.borderRadius = '50%';
    sideAvatar.appendChild(av.cloneNode(true));

    const av2 = renderAvatar(user, 'sm');
    av2.style.borderRadius = '50%';
    av2.style.cursor = 'pointer';
    topAvatar.appendChild(av2);
  } catch {}
}

window.goToMyProfile = () => { window.location.href = `/profile.html?id=${ME.id}`; };

// ── Theme toggle ──────────────────────────────────────────────────────────
function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  const current = localStorage.getItem('vibe_theme') || 'dark';
  document.body.setAttribute('data-theme', current);
  btn.innerHTML = current === 'dark'
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';

  btn.addEventListener('click', () => {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('vibe_theme', next);
    btn.innerHTML = next === 'dark'
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  });
}

// ── Load Reels ────────────────────────────────────────────────────────────
async function loadReels() {
  if (isLoading) return;
  isLoading = true;

  try {
    const data = await reelsAPI.getReels(currentPage);
    const container = document.getElementById('reels-scroll-container');

    if (currentPage === 1) {
      container.innerHTML = '';

      if (data.length === 0) {
        container.innerHTML = `
          <div class="empty-reels" style="height:calc(100vh - 56px)">
            <i class="fa-solid fa-film" style="font-size:3rem;color:rgba(108,99,255,0.3)"></i>
            <h3 style="font-size:1.1rem">No Reels Yet</h3>
            <p style="font-size:0.85rem">Be the first to create one!</p>
            <button class="btn btn-primary" onclick="openUploadModal()" style="margin-top:8px">
              <i class="fa-solid fa-plus" style="margin-right:6px"></i>Create Reel
            </button>
          </div>`;
        return;
      }
    }

    data.forEach(reel => {
      reels.push(reel);
      container.insertAdjacentHTML('beforeend', buildReelSlide(reel));
    });

    currentPage++;
  } catch (err) {
    showToast(err.message || 'Failed to load reels', 'error');
  } finally {
    isLoading = false;
  }
}

// ── Build a single reel slide ─────────────────────────────────────────────
function buildReelSlide(r) {
  const id         = r._id || r.id;
  const authorName = r.author?.username || 'user';
  const authorId   = r.author?._id || r.author?.id || '';
  const likeCount  = formatCount(r.likeCount || r.likes?.length || 0);
  const commentCnt = formatCount(r.commentCount || r.comments?.length || 0);
  const shareCnt   = formatCount(r.shareCount || 0);
  const saveCnt    = '0';
  const timeAgo    = r.createdAt ? formatTime(r.createdAt) : 'recently';
  const isLiked    = r.userLiked || false;

  const avatarHtml = r.author?.profilePicture
    ? `<img src="${escapeHtml(r.author.profilePicture)}" class="reel-author-avatar" onclick="window.location.href='/profile.html?id=${authorId}'" alt="${escapeHtml(authorName)}">`
    : `<div class="reel-author-avatar-initials" style="background:${r.author?.avatarColor||'#6C63FF'}" onclick="window.location.href='/profile.html?id=${authorId}'">${authorName.slice(0,2).toUpperCase()}</div>`;

  // Parse caption for hashtags
  const captionText = r.caption || '';
  const words = captionText.split(' ').map(w =>
    w.startsWith('#')
      ? `<span class="reel-hashtag">${escapeHtml(w)}</span>`
      : escapeHtml(w)
  ).join(' ');

  return `
  <div class="reel-slide" id="reel-slide-${id}" data-id="${id}">
    <div class="reel-video-box">
      <video class="reel-video" id="video-${id}"
        src="${escapeHtml(r.videoUrl)}"
        loop playsinline preload="metadata"
        onclick="togglePlay('${id}')"></video>

      <div class="reel-gradient-top"></div>
      <div class="reel-gradient-bottom"></div>

      <!-- Play/Pause overlay -->
      <div class="play-pause-overlay" id="ppo-${id}">
        <i class="fa-solid fa-pause"></i>
      </div>

      <!-- Top bar -->
      <div class="reel-top-bar">
        ${avatarHtml}
        <div class="reel-top-info">
          <div class="reel-top-username" onclick="window.location.href='/profile.html?id=${authorId}'">
            ${escapeHtml(authorName)}
          </div>
          <div class="reel-top-time">${timeAgo}</div>
        </div>
        <button class="reel-follow-btn" id="follow-btn-${id}" onclick="toggleFollow('${id}','${authorId}')">Follow</button>
        <button class="reel-more-btn"><i class="fa-solid fa-ellipsis"></i></button>
      </div>

      <!-- Action buttons (right side) -->
      <div class="reel-actions-side">
        <div class="reel-action-item">
          <button class="${isLiked ? 'liked' : ''}" id="like-btn-${id}" onclick="doLike('${id}')">
            <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>
          </button>
          <span class="reel-action-count" id="like-count-${id}">${likeCount}</span>
        </div>

        <div class="reel-action-item">
          <button onclick="doComment('${id}')">
            <i class="fa-regular fa-comment"></i>
          </button>
          <span class="reel-action-count" id="comment-count-${id}">${commentCnt}</span>
        </div>

        <div class="reel-action-item">
          <button onclick="doShare('${id}')">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
          <span class="reel-action-count" id="share-count-${id}">${shareCnt}</span>
        </div>

        <div class="reel-action-item">
          <button id="save-btn-${id}">
            <i class="fa-regular fa-bookmark"></i>
          </button>
          <span class="reel-action-count">${saveCnt}</span>
        </div>
      </div>

      <!-- Bottom info -->
      <div class="reel-bottom-info">
        <div class="reel-caption">${words}</div>
        <div class="reel-audio-info">
          <div class="reel-audio-icon"><i class="fa-solid fa-music"></i></div>
          <span>Original Audio · ${escapeHtml(authorName)}</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="reel-progress-bar-container">
        <div class="reel-progress-bar-fill" id="progress-${id}" style="width:0%"></div>
      </div>
    </div>
  </div>`;
}

// ── Intersection Observer: auto play/pause ────────────────────────────────
function setupIntersectionObserver() {
  const container = document.getElementById('reels-scroll-container');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const slide = entry.target;
      const id    = slide.dataset.id;
      const video = document.getElementById(`video-${id}`);
      if (!video) return;

      if (entry.isIntersecting) {
        video.play().catch(() => {});
        startProgress(id, video);

        // Load more when near end
        if (slide === container.lastElementChild) loadReels();
      } else {
        video.pause();
        stopProgress(id);
      }
    });
  }, { root: container, threshold: 0.6 });

  // Observe existing + future slides
  const observeSlides = () => {
    document.querySelectorAll('.reel-slide').forEach(s => observer.observe(s));
  };
  observeSlides();

  new MutationObserver(observeSlides).observe(container, { childList: true });
}

// ── Progress bar ──────────────────────────────────────────────────────────
function startProgress(id, video) {
  stopProgress(id);
  const bar = document.getElementById(`progress-${id}`);
  if (!bar || !video) return;

  progressTimers[id] = setInterval(() => {
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      bar.style.width = pct + '%';
    }
  }, 250);
}

function stopProgress(id) {
  clearInterval(progressTimers[id]);
}

// ── Play/Pause on click ───────────────────────────────────────────────────
window.togglePlay = function(id) {
  const video = document.getElementById(`video-${id}`);
  const ppo   = document.getElementById(`ppo-${id}`);
  if (!video) return;

  if (video.paused) {
    video.play();
    ppo.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    video.pause();
    ppo.innerHTML = '<i class="fa-solid fa-play"></i>';
  }

  ppo.classList.add('show');
  setTimeout(() => ppo.classList.remove('show'), 800);
};

// ── Like ──────────────────────────────────────────────────────────────────
window.doLike = async function(id) {
  const btn   = document.getElementById(`like-btn-${id}`);
  const count = document.getElementById(`like-count-${id}`);
  const isLiked = btn.classList.contains('liked');

  // Optimistic
  btn.classList.toggle('liked', !isLiked);
  btn.innerHTML = `<i class="fa-${!isLiked ? 'solid' : 'regular'} fa-heart"></i>`;
  const cur = parseCount(count.textContent);
  count.textContent = formatCount(cur + (!isLiked ? 1 : -1));

  try {
    const res = await reelsAPI.toggleLike(id);
    count.textContent = formatCount(res.likeCount);
    btn.classList.toggle('liked', res.liked);
    btn.innerHTML = `<i class="fa-${res.liked ? 'solid' : 'regular'} fa-heart"></i>`;
  } catch (err) {
    showToast('Failed to like', 'error');
    // Revert
    btn.classList.toggle('liked', isLiked);
    btn.innerHTML = `<i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>`;
    count.textContent = formatCount(cur);
  }
};

// ── Share ─────────────────────────────────────────────────────────────────
window.doShare = async function(id) {
  try {
    const res = await reelsAPI.shareReel(id);
    document.getElementById(`share-count-${id}`).textContent = formatCount(res.shareCount);
    const url = `${window.location.origin}/reels.html?id=${id}`;
    await navigator.clipboard.writeText(url);
    showToast('Link copied! 🔗', 'success');
  } catch {
    showToast('Could not copy link', 'error');
  }
};

// ── Comment (simple prompt for now) ──────────────────────────────────────
window.doComment = async function(id) {
  const content = prompt('Add a comment:');
  if (!content || !content.trim()) return;

  try {
    const res = await reelsAPI.addComment(id, content.trim());
    document.getElementById(`comment-count-${id}`).textContent = formatCount(res.commentCount);
    showToast('Comment added!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to comment', 'error');
  }
};

// ── Follow ────────────────────────────────────────────────────────────────
window.toggleFollow = async function(reelId, authorId) {
  if (!authorId || authorId === ME?.id) return;
  const btn = document.getElementById(`follow-btn-${reelId}`);

  try {
    const res = await usersAPI.toggleFollow(authorId);
    const following = res.following;
    btn.textContent = following ? 'Following' : 'Follow';
    btn.classList.toggle('following', following);
    showToast(following ? 'Following!' : 'Unfollowed', 'success');
  } catch (err) {
    showToast(err.message || 'Failed', 'error');
  }
};

// ── Upload Modal ──────────────────────────────────────────────────────────
window.openUploadModal  = () => document.getElementById('upload-modal').classList.add('show');
window.closeUploadModal = () => document.getElementById('upload-modal').classList.remove('show');

window.doUploadReel = async function() {
  const file    = document.getElementById('reel-file').files[0];
  const caption = document.getElementById('reel-caption').value.trim();
  const btn     = document.getElementById('reel-upload-btn');

  if (!file) return showToast('Please select a video file', 'error');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:5px"></i> Uploading...';

  try {
    const fd = new FormData();
    fd.append('video', file);
    fd.append('caption', caption);

    const newReel = await reelsAPI.uploadReel(fd);
    closeUploadModal();
    document.getElementById('reel-file').value = '';
    document.getElementById('reel-caption').value = '';
    showToast('Reel uploaded! 🎬', 'success');

    // Refresh
    reels = [];
    currentPage = 1;
    await loadReels();
    setupIntersectionObserver();
  } catch (err) {
    showToast(err.message || 'Upload failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-upload" style="margin-right:5px"></i>Upload';
  }
};

// ── Suggested Users (right sidebar) ──────────────────────────────────────
async function loadSuggestedUsers() {
  const container = document.getElementById('suggested-users-list');
  try {
    const data = await usersAPI.getSuggestions();
    const users = (Array.isArray(data) ? data : data.users || []).slice(0, 5);

    if (!users.length) {
      container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center">No suggestions yet</p>';
      return;
    }

    container.innerHTML = users.map(u => {
      const uid   = u._id || u.id;
      const uname = u.username || 'user';
      const avatarHtml = u.profilePicture
        ? `<img src="${escapeHtml(u.profilePicture)}" class="su-avatar" alt="${escapeHtml(uname)}">`
        : `<div class="su-avatar-initials" style="background:${u.avatarColor||'#6C63FF'}">${uname.slice(0,2).toUpperCase()}</div>`;

      return `
        <div class="suggested-user-row">
          ${avatarHtml}
          <div class="su-info">
            <div class="su-name">@${escapeHtml(uname)}</div>
            <div class="su-sub">Suggested for you</div>
          </div>
          <button class="su-follow-btn" id="su-follow-${uid}" onclick="suggestFollow('${uid}', this)">Follow</button>
        </div>`;
    }).join('');
  } catch {
    container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center">Could not load</p>';
  }
}

window.suggestFollow = async function(uid, btn) {
  try {
    const res = await usersAPI.toggleFollow(uid);
    btn.textContent = res.following ? 'Following' : 'Follow';
    btn.classList.toggle('following', res.following);
  } catch {}
};

// ── Trending Audio (right sidebar, static) ────────────────────────────────
function renderTrendingAudio() {
  const tracks = [
    { icon: '🎵', title: 'Flowers', artist: 'Miley Cyrus', count: '12.5K reels' },
    { icon: '🎶', title: 'Calm Down', artist: 'Rema', count: '9.8K reels' },
    { icon: '🎼', title: 'Aaoge Tum Kabhi', artist: 'Jubin Nautiyal', count: '8.1K reels' },
    { icon: '🎵', title: 'Tum Se', artist: 'Jubin Nautiyal', count: '6.7K reels' },
    { icon: '🎶', title: 'Kesariya', artist: 'Arijit Singh', count: '5.2K reels' },
  ];

  document.getElementById('trending-audio-list').innerHTML = tracks.map(t => `
    <div class="trending-audio-row">
      <div class="ta-thumb">${t.icon}</div>
      <div class="ta-info">
        <div class="ta-title">${t.title}</div>
        <div class="ta-sub">${t.artist} · ${t.count}</div>
      </div>
      <button class="ta-play-btn"><i class="fa-solid fa-play"></i></button>
    </div>`).join('');
}

// ── Utilities ─────────────────────────────────────────────────────────────
function formatCount(n) {
  n = parseInt(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function parseCount(str) {
  if (!str) return 0;
  if (str.endsWith('M')) return parseFloat(str) * 1000000;
  if (str.endsWith('K')) return parseFloat(str) * 1000;
  return parseInt(str) || 0;
}

init();
