
import React, { useState } from 'react';
import brandIcon from '../assets/images/organize.svg';

function Navbar({
  isLoggedIn,
  onLogout,
  currentView,
  setCurrentView
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  function navigateTo(view) {
    setCurrentView(view);
    setMenuOpen(false);
  }

  function handleLogout() {
    onLogout();
    navigateTo('home');
  }

  const navigationLinks = [
    { view: 'home', label: 'Home' },
    ...(isLoggedIn
      ? [{ view: 'inventory', label: 'Inventory' }]
      : []),
    { view: 'help', label: 'Help' }
  ];

  return (
    <header className="public-header">
      <nav
        className="public-navbar"
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="public-brand"
          onClick={() => navigateTo('home')}
          aria-label="StorageMap home"
        >
          <img src={brandIcon} alt="" />
          <span>StorageMap</span>
        </button>

        <button
          type="button"
          className="public-menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="public-navigation"
          onClick={() => setMenuOpen(open => !open)}
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path d="M6 6 L18 18 M18 6 L6 18" />
            ) : (
              <path d="M4 6 H20 M4 12 H20 M4 18 H20" />
            )}
          </svg>
        </button>

        <div
          id="public-navigation"
          className={`public-navigation${menuOpen ? ' is-open' : ''}`}
        >
          <div className="public-nav-links">
            {navigationLinks.map(link => (
              <button
                key={link.view}
                type="button"
                className={`public-nav-link${
                  currentView === link.view ? ' is-active' : ''
                }`}
                aria-current={
                  currentView === link.view ? 'page' : undefined
                }
                onClick={() => navigateTo(link.view)}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="public-nav-actions">
            {isLoggedIn ? (
              <>
                <span className="public-user-greeting">
                  Hello, User
                </span>

                <button
                  type="button"
                  className="public-button public-button-secondary"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`public-nav-link${
                    currentView === 'login' ? ' is-active' : ''
                  }`}
                  aria-current={
                    currentView === 'login' ? 'page' : undefined
                  }
                  onClick={() => navigateTo('login')}
                >
                  Log In
                </button>

                <button
                  type="button"
                  className="public-button public-button-primary"
                  aria-current={
                    currentView === 'signup' ? 'page' : undefined
                  }
                  onClick={() => navigateTo('signup')}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
