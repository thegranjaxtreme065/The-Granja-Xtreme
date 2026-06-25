import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, ShieldAlert, LogOut, User as UserIcon } from 'lucide-react';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'customer' | 'staff' | 'admin';
}

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const isEnglish = i18n.language?.startsWith('en') ?? true;

  const toggleLanguage = () => {
    i18n.changeLanguage(isEnglish ? 'es' : 'en');
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoutClick = () => {
    onLogout();
    setIsOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={`glass-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px' }}>
        {/* Left: Brand Logo */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/images/logo.jpg" alt="The Granja Xtreme Logo" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain' }} />
            <span style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 800,
              fontSize: '20px',
              color: 'var(--on-background)',
              letterSpacing: '0.5px',
              lineHeight: 1
            }}>
              THE GRANJA <span style={{ color: 'var(--secondary)' }}>XTREME</span>
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav style={{ display: 'none', gap: '32px', alignItems: 'center', justifyContent: 'center' }} className="desktop-nav">
          <Link to="/fleet" style={{ fontWeight: isActive('/fleet') ? '600' : '400', color: isActive('/fleet') ? 'var(--secondary)' : 'inherit' }}>{t('our_fleet', 'Our Fleet')}</Link>
          <Link to="/story" style={{ fontWeight: isActive('/story') ? '600' : '400', color: isActive('/story') ? 'var(--secondary)' : 'inherit' }}>{t('our_story', 'Our Story')}</Link>

          <Link to="/contact" style={{ fontWeight: isActive('/contact') ? '600' : '400', color: isActive('/contact') ? 'var(--secondary)' : 'inherit' }}>{t('contact_us', 'Contact Us')}</Link>
        </nav>

        {/* Right: Action Buttons & Mobile Menu */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
          <button onClick={toggleLanguage} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '14px', borderRadius: '16px', minWidth: 'auto', whiteSpace: 'nowrap' }} title="Toggle Language">
            {isEnglish ? '🇪🇸 ES' : '🇺🇸 EN'}
          </button>
          <div className="desktop-nav" style={{ display: 'none', alignItems: 'center' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {user.role === 'customer' ? (
                  <>
                    <Link to="/profile" className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}>
                      <UserIcon size={16} /> {t('profile', 'Profile')}
                    </Link>
                    <Link to="/dashboard" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}>
                      {t('dashboard', 'Dashboard')}
                    </Link>
                  </>
                ) : (
                  <Link to="/admin" className="btn btn-secondary" style={{ padding: '8px 16px', backgroundColor: 'var(--surface-container)', borderColor: 'var(--border)', borderRadius: 'var(--radius-full)' }}>
                    <ShieldAlert size={16} /> {user.role === 'admin' ? t('admin_portal', 'Admin Portal') : t('employee_portal', 'Employee Portal')}
                  </Link>
                )}
                <button onClick={handleLogoutClick} className="btn btn-icon btn-secondary" title={t('logout', 'Logout')} style={{ padding: '8px', border: 'none' }}>
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link to="/login" className="btn btn-secondary" style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--on-background)',
                  textDecoration: 'none'
                }}>
                  {t('login', 'Login')}
                </Link>
                <Link to="/fleet" className="btn btn-primary" style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '14px',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                  textDecoration: 'none',
                  border: 'none'
                }}>
                  {t('book_now', 'Book Now')}
                </Link>
              </div>
            )}
          </div>

        {/* Mobile Menu Icon */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'block',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--on-background)'
          }}
          className="mobile-menu-btn"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {isOpen && (
        <div style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border-light)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }} className="mobile-drawer">
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              <Link to="/" onClick={() => setIsOpen(false)} style={{ padding: '16px', fontSize: '18px', fontWeight: 600, color: 'var(--on-background)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>{t('home', 'Home')}</Link>
              <Link to="/fleet" onClick={() => setIsOpen(false)} style={{ padding: '16px', fontSize: '18px', fontWeight: 600, color: 'var(--on-background)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>{t('our_fleet', 'Our Fleet')}</Link>
              <Link to="/story" onClick={() => setIsOpen(false)} style={{ padding: '16px', fontSize: '18px', fontWeight: 600, color: 'var(--on-background)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>{t('our_story', 'Our Story')}</Link>

              <Link to="/contact" onClick={() => setIsOpen(false)} style={{ padding: '16px', fontSize: '18px', fontWeight: 600, color: 'var(--on-background)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>{t('contact_us', 'Contact Us')}</Link>
            </nav>
            
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

          {user ? (
            <>
              {user.role === 'customer' ? (
                <>
                  <Link to="/profile" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserIcon size={18} /> {t('profile', 'My Profile')}
                  </Link>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserIcon size={18} /> {t('dashboard', 'My Dashboard')}
                  </Link>
                </>
              ) : (
                <Link to="/admin" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                  <ShieldAlert size={18} /> {user.role === 'admin' ? t('admin_portal', 'Admin Portal') : t('employee_portal', 'Employee Portal')}
                </Link>
              )}
              <button
                onClick={handleLogoutClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--error)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '8px 0'
                }}
              >
                <LogOut size={18} /> {t('logout', 'Logout')}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/login" onClick={() => setIsOpen(false)} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', borderRadius: 'var(--radius-full)' }}>
                {t('login', 'Login')}
              </Link>
              <Link to="/fleet" onClick={() => setIsOpen(false)} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', borderRadius: 'var(--radius-full)' }}>
                {t('book_now', 'Book Now')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Inlined styling for navigation media queries */}
      <style>{`
        @media (min-width: 769px) {
          .desktop-nav { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
          .mobile-drawer { display: none !important; }
        }
      `}</style>
    </header>
  );
};
