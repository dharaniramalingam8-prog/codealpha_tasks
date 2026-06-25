/**
 * theme.js — Dark/Light Theme Manager
 * Import and call initTheme() on every page
 */

const THEME_KEY = 'vibe_theme';

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

export function toggleTheme() {
  const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
  updateToggleBtn(next);
  return next;
}

export function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

export function updateToggleBtn(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

export function getCurrentTheme() {
  return document.body.classList.contains('light-theme') ? 'light' : 'dark';
}
