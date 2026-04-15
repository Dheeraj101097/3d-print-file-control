import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Printer, LogOut, Bell, Search, Moon, Sun, User } from 'lucide-react';
import { logout, selectCurrentUser } from '../features/auth/authSlice.js';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className="glass-panel sticky top-0 z-50 px-6 transition-theme"
      style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
    >
      <div className="flex items-center h-14 gap-6">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0 mr-2"
          style={{ textDecoration: 'none' }}
        >
          <Box size={17} style={{ color: 'var(--c-carolina)' }} />
          <span
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '0.9375rem',
              color: 'var(--c-text)',
              letterSpacing: '-0.02em',
            }}
          >
            PrintVCS
          </span>
        </Link>

        {/* Nav tabs — exactly like Stitch design */}
        <div className="flex items-end h-full gap-5">
          <NavTab to="/" active={isActive('/')}>Projects</NavTab>
          <NavTab to="/settings/printer-profiles" active={location.pathname.includes('printer')}>Printers</NavTab>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-theme"
            style={{
              background: 'var(--c-surface-low)',
              border: '1px solid var(--c-border)',
              minWidth: '160px',
            }}
          >
            <Search size={13} style={{ color: 'var(--c-text-muted)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>Search assets...</span>
          </div>

          {/* Bell */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full transition-theme"
            style={{ color: 'var(--c-text-secondary)' }}
            title="Notifications"
          >
            <Bell size={15} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-theme"
            style={{ color: 'var(--c-text-secondary)' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Avatar / user pill */}
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-theme"
            style={{
              background: 'var(--c-surface-high)',
              border: '1px solid var(--c-border)',
            }}
          >
            <div
              className="flex items-center justify-center w-5 h-5 rounded-full"
              style={{ background: 'var(--c-action)', fontSize: '0.625rem', color: '#fff', fontWeight: 700 }}
            >
              {user?.displayName?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-secondary)', maxWidth: '90px' }} className="truncate">
              {user?.displayName}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 transition-theme"
            style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}
            title="Logout"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavTab({ to, active, children }) {
  return (
    <Link
      to={to}
      style={{ textDecoration: 'none' }}
      className="nav-tab"
      data-active={active}
    >
      <span
        style={{
          fontFamily: '"Inter", sans serif',
          fontSize: '0.8125rem',
          fontWeight: active ? 600 : 400,
          color: active ? 'var(--c-text)' : 'var(--c-text-secondary)',
          borderBottom: active ? '2px solid var(--c-carolina)' : '2px solid transparent',
          paddingBottom: '2px',
          display: 'inline-block',
          transition: 'color 0.2s, border-color 0.2s',
        }}
      >
        {children}
      </span>
    </Link>
  );
}
