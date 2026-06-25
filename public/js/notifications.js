/**
 * notifications.js — Real-time notification manager
 * Used by feed, profile, post pages
 */

import { getToken, getUser, notificationsAPI, formatTime, escapeHtml } from './api.js';

let socket = null;
let unreadCount = 0;

export function initNotifications() {
  loadUnreadCount();
  connectSocket();
}

// ── Connect to Socket.IO ──
function connectSocket() {
  const token = getToken();
  if (!token || typeof io === 'undefined') return;

  socket = io({ auth: { token }, transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    console.log('🔔 Notifications socket connected');
  });

  socket.on('notification', (notif) => {
    unreadCount++;
    updateBadge();
    prependNotification(notif);
    showNotifToast(notif);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connect error:', err.message);
  });
}

export function getSocket() { return socket; }

// ── Unread count ──
async function loadUnreadCount() {
  try {
    const { count } = await notificationsAPI.getUnreadCount();
    unreadCount = count;
    updateBadge();
  } catch (e) {}
}

function updateBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
  badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

// ── Dropdown ──
export async function toggleNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;

  const isOpen = dropdown.classList.contains('show');
  document.querySelectorAll('.notif-dropdown').forEach(d => d.classList.remove('show'));

  if (!isOpen) {
    dropdown.classList.add('show');
    await loadNotifications();
    // Mark all read
    if (unreadCount > 0) {
      await notificationsAPI.markAllRead();
      unreadCount = 0;
      updateBadge();
    }
  }
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  list.innerHTML = '<div style="padding:16px;text-align:center"><span class="spinner"></span></div>';

  try {
    const notifications = await notificationsAPI.getAll();
    if (!notifications.length) {
      list.innerHTML = '<div class="notif-empty">No notifications yet 🔔</div>';
      return;
    }
    list.innerHTML = notifications.map(n => renderNotif(n)).join('');
  } catch (e) {
    list.innerHTML = '<div class="notif-empty">Failed to load</div>';
  }
}

function prependNotification(notif) {
  const list = document.getElementById('notif-list');
  if (!list || !list.parentElement.classList.contains('show')) return;
  list.insertAdjacentHTML('afterbegin', renderNotif(notif));
}

function renderNotif(n) {
  const icons = { like: '❤️', comment: '💬', follow: '👤' };
  const uname = n.sender?.username || 'Someone';
  const ucolor = n.sender?.avatarColor || '#6C63FF';
  return `
  <div class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${n.post || ''}')">
    <div class="avatar avatar-sm" style="background:${ucolor};flex-shrink:0">${uname.slice(0,2).toUpperCase()}</div>
    <div class="notif-body">
      <div class="notif-text"><strong>@${escapeHtml(uname)}</strong> ${escapeHtml(n.message || n.type)}</div>
      <div class="notif-time">${formatTime(n.createdAt)}</div>
    </div>
    <span class="notif-icon">${icons[n.type] || '🔔'}</span>
  </div>`;
}

window.handleNotifClick = function(postId) {
  if (postId) window.location.href = `/post.html?id=${postId}`;
  document.getElementById('notif-dropdown')?.classList.remove('show');
};

function showNotifToast(n) {
  const icons = { like: '❤️', comment: '💬', follow: '👤' };
  const uname = n.sender?.username || 'Someone';
  const msg = `${icons[n.type] || '🔔'} @${uname} ${n.message || n.type}`;

  const toast = document.createElement('div');
  toast.className = 'toast success notif-toast';
  toast.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, 4000);
}

// ── Close dropdown on outside click ──
document.addEventListener('click', (e) => {
  if (!e.target.closest('.notif-wrapper')) {
    document.getElementById('notif-dropdown')?.classList.remove('show');
  }
});
