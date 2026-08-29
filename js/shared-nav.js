// Shared Navigation Component
// This module creates and manages the bottom navigation bar for authenticated pages

import { getSupabase } from './supabase.js';

export function initBottomNav() {
  // Create nav HTML if it doesn't exist
  if (!document.querySelector('.bottom-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = `
      <a href="/home/" class="nav-item" id="nav-home" title="Home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span class="nav-label">Home</span>
      </a>
      <a href="/profile/" class="nav-item" id="nav-profile" title="Profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span class="nav-label">Profile</span>
      </a>
      <a href="/decks/" class="nav-item" id="nav-decks" title="Decks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
          <line x1="10" y1="8" x2="14" y2="8"></line>
          <line x1="10" y1="12" x2="14" y2="12"></line>
          <line x1="10" y1="16" x2="14" y2="16"></line>
        </svg>
        <span class="nav-label">Decks</span>
      </a>
      <a href="/events/" class="nav-item" id="nav-events" title="Events">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span class="nav-label">Events</span>
      </a>
      <button class="nav-item nav-logout" id="nav-logout" title="Sign Out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"></path>
          <polyline points="17 16 21 12 17 8"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        <span class="nav-label">Sign Out</span>
      </button>
    `;
    document.body.appendChild(nav);
  }

  // Set active nav item based on current path
  const path = location.pathname;
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && (path === href || path === href.replace(/\/$/, '') || path.startsWith(href))) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Handle logout
  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const supabaseClient = await getSupabase();
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
        window.location.href = '/';
      }
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initBottomNav);
