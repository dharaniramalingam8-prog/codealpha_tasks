import {
  requireAuth, getUser, clearAuth,
  messagesAPI, usersAPI,
  renderAvatar, formatTime, escapeHtml, showToast
} from './api.js';
import { initTheme, toggleTheme, updateToggleBtn } from './theme.js';
import { initNotifications, toggleNotifDropdown, getSocket } from './notifications.js';

requireAuth();
initTheme();

const ME = getUser();
const params = new URLSearchParams(window.location.search);
const initialUserId = params.get('user'); // Open DM with this user on load

let currentConvId   = null;
let conversations   = [];
let typingTimeout   = null;
window.currentOtherUserId = null;

window.logout = () => { clearAuth(); window.location.href = '/index.html'; };
window.goToProfile = (id) => { window.location.href = `/profile.html?id=${id}`; };
window.toggleNotifDropdown = toggleNotifDropdown;
window.handleThemeToggle = () => { const next = toggleTheme(); updateToggleBtn(next); };

async function init() {
  updateToggleBtn(localStorage.getItem('vibe_theme') || 'dark');
  initNotifications();
  setupNavAvatar();
  await loadConversations();
  setupDMSearch();

  // If opened with a ?user= param, open that DM immediately
  if (initialUserId) {
    try {
      const conv = await messagesAPI.openConversation(initialUserId);
      openConversation(conv);
    } catch(e) { showToast(e.message, 'error'); }
  }

  // Listen for new messages via Socket.IO
  listenForMessages();
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

// ── Conversations List ──
async function loadConversations() {
  try {
    conversations = await messagesAPI.getConversations();
    const list = document.getElementById('conversations-list');
    if (!conversations.length) {
      list.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:.875rem">
        <div style="font-size:2rem;margin-bottom:8px">💬</div>No conversations yet.<br>Click + New to start one!
      </div>`;
      return;
    }
    list.innerHTML = conversations.map(conv => renderConvItem(conv)).join('');
  } catch(e) { showToast(e.message, 'error'); }
}

function renderConvItem(conv) {
  const other  = conv.other || {};
  const uid    = other._id || other.id || '';
  const uname  = other.username || 'Unknown';
  const ucolor = other.avatarColor || '#6C63FF';
  const upic   = other.profilePicture || null;
  const convId = conv._id || conv.id;
  const lastMsg = conv.lastMessage?.content || '';

  const avatarHtml = upic
    ? `<img src="${escapeHtml(upic)}" class="avatar avatar-md avatar-img" alt="${escapeHtml(uname)}" />`
    : `<div class="avatar avatar-md" style="background:${ucolor}">${uname.slice(0,2).toUpperCase()}</div>`;

  return `
  <div class="conversation-item" id="conv-item-${convId}" onclick="selectConversation('${convId}')">
    ${avatarHtml}
    <div class="conversation-info">
      <div class="conversation-name">@${escapeHtml(uname)}</div>
      <div class="conversation-preview">${escapeHtml(lastMsg.slice(0,40))}</div>
    </div>
    <div class="conversation-time">${conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ''}</div>
  </div>`;
}

// ── Select Conversation ──
window.selectConversation = async (convId) => {
  const conv = conversations.find(c => (c._id||c.id) === convId);
  if (conv) openConversation(conv);
};

async function openConversation(conv) {
  currentConvId = conv._id || conv.id;
  const other   = conv.other || {};
  window.currentOtherUserId = other._id || other.id || '';

  // Mark active
  document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
  const convItem = document.getElementById(`conv-item-${currentConvId}`);
  if (convItem) convItem.classList.add('active');

  // Setup chat header
  document.getElementById('chat-placeholder').style.display  = 'none';
  document.getElementById('chat-header').style.display        = 'flex';
  document.getElementById('chat-messages').style.display      = 'flex';
  document.getElementById('chat-input-bar').style.display     = 'flex';

  const uname  = other.username || 'User';
  const ucolor = other.avatarColor || '#6C63FF';
  const upic   = other.profilePicture || null;

  document.getElementById('chat-header-name').textContent = `@${uname}`;
  const headerAv = document.getElementById('chat-header-avatar');
  headerAv.innerHTML = '';
  const av = upic
    ? (() => { const i=document.createElement('img'); i.src=upic; i.className='avatar avatar-md avatar-img'; return i; })()
    : (() => { const d=document.createElement('div'); d.className='avatar avatar-md'; d.style.background=ucolor; d.textContent=uname.slice(0,2).toUpperCase(); return d; })();
  headerAv.appendChild(av);

  // Load messages
  await loadMessages();

  // Join Socket.IO room for this conversation
  const socket = getSocket();
  if (socket) socket.emit('join-conversation', currentConvId);

  document.getElementById('chat-input').focus();
}

async function loadMessages() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner"></span></div>';
  try {
    const messages = await messagesAPI.getMessages(currentConvId);
    renderMessages(messages);
    scrollToBottom();
  } catch(e) {
    container.innerHTML = `<div class="chat-empty">${e.message}</div>`;
  }
}

function renderMessages(msgs) {
  const container = document.getElementById('chat-messages');
  if (!msgs.length) {
    container.innerHTML = '<div class="chat-empty"><span style="font-size:2rem">👋</span><br>Say hello!</div>';
    return;
  }
  container.innerHTML = msgs.map(m => renderMessageBubble(m)).join('');
}

function renderMessageBubble(m) {
  const isOwn = (m.sender?._id || m.sender?.id || m.sender)?.toString() === ME.id?.toString();
  return `
  <div class="message-bubble-wrapper ${isOwn?'own':''}">
    ${!isOwn ? `<div class="avatar avatar-sm" style="background:${m.sender?.avatarColor||'#6C63FF'}">${(m.sender?.username||'U').slice(0,2).toUpperCase()}</div>` : ''}
    <div>
      <div class="message-bubble">${escapeHtml(m.content)}</div>
      <div class="message-time">${formatTime(m.createdAt)}</div>
    </div>
  </div>`;
}

function appendMessage(m) {
  const container = document.getElementById('chat-messages');
  if (container.querySelector('.chat-empty')) container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', renderMessageBubble(m));
  scrollToBottom();
}

function scrollToBottom() {
  const el = document.getElementById('chat-messages');
  el.scrollTop = el.scrollHeight;
}

// ── Send Message ──
window.handleChatKey = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
};

window.sendMessage = async () => {
  const input   = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content || !currentConvId) return;

  input.value = '';
  input.style.height = 'auto';

  try {
    const msg = await messagesAPI.sendMessage(currentConvId, content);
    appendMessage(msg);

    // Update conversation preview
    const convItem = document.getElementById(`conv-item-${currentConvId}`);
    if (convItem) convItem.querySelector('.conversation-preview').textContent = content.slice(0, 40);
  } catch(e) { showToast(e.message, 'error'); }
};

// ── Typing Indicator ──
window.handleTyping = () => {
  const socket = getSocket();
  if (!socket || !currentConvId) return;
  socket.emit('typing', { conversationId: currentConvId });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop-typing', { conversationId: currentConvId });
  }, 1500);
};

// ── Listen for incoming messages via Socket.IO ──
function listenForMessages() {
  const socket = getSocket();
  if (!socket) return;

  socket.on('new-message', (msg) => {
    const convId = msg.conversation;
    if (convId === currentConvId) {
      // Add to chat if the sender is the other user
      const senderId = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString();
      if (senderId !== ME.id?.toString()) {
        appendMessage(msg);
        // Mark as read immediately
        messagesAPI.getMessages(currentConvId, 0).catch(()=>{});
      }
    }
    // Update conversation list preview
    const convItem = document.getElementById(`conv-item-${convId}`);
    if (convItem) {
      convItem.querySelector('.conversation-preview').textContent = msg.content.slice(0, 40);
      convItem.querySelector('.conversation-time').textContent = 'just now';
    }
  });

  socket.on('user-typing', ({ userId }) => {
    if (userId.toString() === window.currentOtherUserId?.toString()) {
      document.getElementById('typing-indicator').style.display = 'block';
    }
  });
  socket.on('user-stop-typing', ({ userId }) => {
    if (userId.toString() === window.currentOtherUserId?.toString()) {
      document.getElementById('typing-indicator').style.display = 'none';
    }
  });
}

// ── New DM Search ──
window.showNewDM = () => {
  const area = document.getElementById('new-dm-area');
  area.style.display = area.style.display === 'none' ? '' : 'none';
  if (area.style.display !== 'none') document.getElementById('dm-search-input').focus();
};

function setupDMSearch() {
  const input   = document.getElementById('dm-search-input');
  const results = document.getElementById('dm-search-results');
  let debounce;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { results.classList.remove('show'); return; }
    debounce = setTimeout(async () => {
      try {
        const users = await usersAPI.search(q);
        results.innerHTML = users.length
          ? users.map(u => `
              <div class="search-result-item" onclick="startDMWith('${u._id||u.id}')">
                <div class="avatar avatar-sm" style="background:${u.avatarColor}">${(u.username||'').slice(0,2).toUpperCase()}</div>
                <span class="username">@${escapeHtml(u.username)}</span>
              </div>`).join('')
          : '<div style="padding:12px 14px;font-size:.85rem;color:var(--text-muted)">No users found</div>';
        results.classList.add('show');
      } catch(e) {}
    }, 350);
  });
  document.addEventListener('click', e => { if(!e.target.closest('.search-wrapper')) results.classList.remove('show'); });
}

window.startDMWith = async (userId) => {
  document.getElementById('dm-search-results').classList.remove('show');
  document.getElementById('dm-search-input').value = '';
  document.getElementById('new-dm-area').style.display = 'none';
  try {
    const conv = await messagesAPI.openConversation(userId);
    // Add to list if not present
    const exists = conversations.find(c => (c._id||c.id) === (conv._id||conv.id));
    if (!exists) {
      conversations.unshift(conv);
      document.getElementById('conversations-list').insertAdjacentHTML('afterbegin', renderConvItem(conv));
    }
    openConversation(conv);
  } catch(e) { showToast(e.message, 'error'); }
};

init();
