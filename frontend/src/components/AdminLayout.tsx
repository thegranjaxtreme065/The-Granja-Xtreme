import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Truck, Package, Bell, Plus, Users, FileEdit, Settings, UserCog, ShieldAlert, MessageSquare, Globe, DollarSign, Menu, X, LogOut } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { auth } from '../config/firebase';
import { useTranslation } from 'react-i18next';

interface AdminLayoutProps {
  user: any;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en') ?? true;

  const toggleLanguage = () => {
    i18n.changeLanguage(isEnglish ? 'es' : 'en');
  };
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Analytics Filter State
  const [analyticsFilter, setAnalyticsFilter] = useState('Monthly');

  const getFilterDateString = () => {
    const now = new Date();
    const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (analyticsFilter === 'Daily') return format(now);
    if (analyticsFilter === 'Weekly') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      return `${format(past)} - ${format(now)}`;
    }
    if (analyticsFilter === 'Monthly') return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (analyticsFilter === 'Yearly') return now.getFullYear().toString();
    return format(now);
  };

  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const data = await fetchAPI('/notifications/unread');
        setNotifications(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadNotifs();

    const loadUnreadMessages = async () => {
      try {
        const data = await fetchAPI('/contact');
        const unread = data.filter((m: any) => m.status === 'unread').length;
        setUnreadMessagesCount(unread);
      } catch (e) {
        console.error(e);
      }
    };
    loadUnreadMessages();

    const handleRefresh = () => {
      loadNotifs();
      loadUnreadMessages();
    };
    window.addEventListener('refreshNotifications', handleRefresh);

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('refreshNotifications', handleRefresh);
    };
  }, []);

  const [sessionTimeoutMs, setSessionTimeoutMs] = useState(30 * 60 * 1000);

  useEffect(() => {
    fetchAPI('/settings').then(res => {
       if (res && res.sessionTimeoutMinutes) {
         setSessionTimeoutMs(res.sessionTimeoutMinutes * 60 * 1000);
       }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        auth.signOut();
      }, sessionTimeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }));
    
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(evt => document.removeEventListener(evt, resetTimer, { passive: true } as any));
    };
  }, [sessionTimeoutMs]);

  const handleNotificationClick = async (notif: any) => {
    try {
      await fetchAPI(`/notifications/${notif._id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
      setShowNotifications(false);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const translateNotificationTitle = (title: string) => {
    if (title === 'New Booking') return t('adminLayout.newBooking', 'New Booking');
    if (title === 'New Message') return t('adminLayout.newMessage', 'New Message');
    return title;
  };

  const translateNotificationMessage = (message: string) => {
    let match = message.match(/New booking #(.*) requires waiver and payment\./);
    if (match) return t('adminLayout.newBookingMsg', 'New booking #{{id}} requires waiver and payment.', { id: match[1] });
    
    match = message.match(/New inquiry from (.*)\./);
    if (match) return t('adminLayout.newInquiryMsg', 'New inquiry from {{name}}.', { name: match[1] });
    
    return message;
  };

  const sidebarLinks = [
    { name: t('Overview'), path: '/admin', icon: LayoutDashboard },
    { name: t('Customers'), path: '/admin/customers', icon: Users },
    { name: t('Bookings'), path: '/admin/bookings', icon: CalendarDays },
    { name: t('Operations'), path: '/admin/upcoming-bookings', icon: CalendarDays },
    { name: t('Payments'), path: '/admin/payments', icon: DollarSign },
    { name: t('Fleet'), path: '/admin/fleet', icon: Truck },
    { name: t('Accessories & Other Items'), path: '/admin/accessories', icon: Package },
    { name: t('Analytics'), path: '/admin/analytics', icon: LayoutDashboard },
    { name: t('Messages'), path: '/admin/messages', icon: MessageSquare }
  ];

  if (user?.role === 'admin') {
    sidebarLinks.push(
      { name: t('CMS'), path: '/admin/cms', icon: FileEdit },
      { name: t('Employees'), path: '/admin/employees', icon: UserCog },
      { name: t('Settings'), path: '/admin/settings', icon: Settings },
      { name: t('Activity Logs'), path: '/admin/logs', icon: ShieldAlert }
    );
  }

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/admin': return { title: t('Dashboard'), subtitle: t('Overview') };
      case '/admin/customers': return { title: t('Customer'), subtitle: t('Management') };
      case '/admin/fleet': return { title: t('Fleet Management'), subtitle: t('Oversee and maintain your high-performance ATV inventory.') };
      case '/admin/accessories': return { title: t('Accessories & Other Items'), subtitle: t('Manage additional items and add-ons for your rentals.') };
      case '/admin/bookings': return { title: t('Booking Management'), subtitle: t('Monitor your fleet performance and handle upcoming guest expeditions from a centralized calendar view.') };
      case '/admin/upcoming-bookings': return { title: t('Check-In & Check-Out'), subtitle: t('Manage customer arrivals and returns.') };
      case '/admin/analytics': return { title: t('Reports & Analytics'), subtitle: t('Real-time performance tracking and fleet intelligence.') };
      case '/admin/payments': return { title: t('Payments & Invoices'), subtitle: t('Manage collected payments and outstanding balances.') };
      case '/admin/cms': return { title: t('CMS Configuration'), subtitle: t('Manage content and landing page features.') };
      case '/admin/employees': return { title: t('Employee Directory'), subtitle: t('Manage staff accounts and permissions.') };
      case '/admin/settings': return { title: t('Global Settings'), subtitle: t('System configuration and policies.') };
      case '/admin/logs': return { title: t('Activity Logs'), subtitle: t('System-wide audit trail and security events.') };
      case '/admin/messages': return { title: t('Contact Messages'), subtitle: t('Customer inquiries and support requests.') };
      default: return { title: t('Admin'), subtitle: t('Panel') };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>
        {`
          .admin-sidebar-nav::-webkit-scrollbar {
            width: 6px;
          }
          .admin-sidebar-nav::-webkit-scrollbar-track {
            background: #0f172a;
          }
          .admin-sidebar-nav::-webkit-scrollbar-thumb {
            background: #1e293b;
            border-radius: 4px;
          }
          .admin-sidebar-nav::-webkit-scrollbar-thumb:hover {
            background: #334155;
          }
          .admin-sidebar-nav {
            scrollbar-width: thin;
            scrollbar-color: #1e293b #0f172a;
          }
        `}
      </style>
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`admin-sidebar-overlay ${isMobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`admin-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}
        style={{
        width: '260px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
      }}>
        {/* Logo Area */}
        <div style={{ padding: '32px 24px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#84cc16', lineHeight: '1.2' }}>The Granja Xtreme</div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#94a3b8', marginTop: '4px' }}>{user?.role === 'admin' ? t("ADMIN PANEL") : t("EMPLOYEE PANEL")}</div>
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              end={link.path === '/admin'}
              onClick={() => setIsMobileSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
                color: isActive ? '#0f172a' : '#cbd5e1',
                backgroundColor: isActive ? '#a3e635' : 'transparent',
                transition: 'all 0.2s',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <link.icon size={18} />
                {link.name}
              </div>
              {link.name === 'Messages' && unreadMessagesCount > 0 && (
                <div style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                  {unreadMessagesCount}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Back to Website & Logout */}
        <div style={{ padding: '0 16px 24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <NavLink
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              color: '#cbd5e1', // Changed from #94a3b8 to be more visible like page names
              backgroundColor: 'transparent',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#f8fafc';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#cbd5e1'; // Reset to new visible color
            }}
          >
            <Globe size={18} />
            {t("Back to Website")}
          </NavLink>

          <button
            onClick={() => {
              auth.signOut().then(() => navigate('/'));
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: '14px',
              color: '#ef4444',
              backgroundColor: 'transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={18} />
            {t("Logout")}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="admin-mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
            >
              <Menu size={24} />
            </button>
            <span style={{ fontSize: '18px', fontWeight: 700 }}>{t("ADMIN PANEL")}</span>
          </div>
        </div>

        {/* Top Header */}
        <header className="admin-top-header" style={{
          minHeight: '80px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'white',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {location.pathname === '/admin/customers' ? t('Customer Management') : title}
              </h1>
              {location.pathname !== '/admin/customers' && (
                <span style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{subtitle}</span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>

            {/* Language Toggle */}
            <button 
              onClick={toggleLanguage} 
              style={{ 
                padding: '6px 12px', 
                fontSize: '14px', 
                borderRadius: '16px', 
                minWidth: 'auto', 
                whiteSpace: 'nowrap',
                backgroundColor: 'transparent',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                cursor: 'pointer',
                fontWeight: 600
              }} 
              title="Toggle Language"
            >
              {isEnglish ? '🇪🇸 ES' : '🇺🇸 EN'}
            </button>
            
            {/* Bell */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <div 
                style={{ cursor: 'pointer', color: '#64748b', position: 'relative', padding: '8px' }}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', color: 'white', borderRadius: '10px', fontSize: '10px', fontWeight: 800, padding: '2px 6px', border: '2px solid white'
                  }}>
                    {notifications.length}
                  </div>
                )}
              </div>
              
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  width: '320px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  zIndex: 50,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>
                    {t("Notifications")}
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        {t("No new notifications")}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n._id} onClick={() => handleNotificationClick(n)} style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{translateNotificationTitle(n.title)}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{translateNotificationMessage(n.message)}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {location.pathname === '/admin' ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => window.location.href = '/admin/bookings?action=add'}
                  style={{
                  backgroundColor: '#4d7c0f', color: 'white', border: 'none', borderRadius: '24px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }}>
                  <Plus size={16} /> {t("Add Booking")}
                </button>
              </div>
            ) : location.pathname === '/admin/analytics' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <button onClick={() => setAnalyticsFilter('Daily')} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: analyticsFilter === 'Daily' ? 700 : 600, color: analyticsFilter === 'Daily' ? 'white' : '#64748b', border: 'none', backgroundColor: analyticsFilter === 'Daily' ? '#4d7c0f' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', flex: 1 }}>{t("Daily")}</button>
                  <button onClick={() => setAnalyticsFilter('Weekly')} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: analyticsFilter === 'Weekly' ? 700 : 600, color: analyticsFilter === 'Weekly' ? 'white' : '#64748b', border: 'none', backgroundColor: analyticsFilter === 'Weekly' ? '#4d7c0f' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', flex: 1 }}>{t("Weekly")}</button>
                  <button onClick={() => setAnalyticsFilter('Monthly')} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: analyticsFilter === 'Monthly' ? 700 : 600, color: analyticsFilter === 'Monthly' ? 'white' : '#64748b', border: 'none', backgroundColor: analyticsFilter === 'Monthly' ? '#4d7c0f' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', flex: 1 }}>{t("Monthly")}</button>
                  <button onClick={() => setAnalyticsFilter('Yearly')} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: analyticsFilter === 'Yearly' ? 700 : 600, color: analyticsFilter === 'Yearly' ? 'white' : '#64748b', border: 'none', backgroundColor: analyticsFilter === 'Yearly' ? '#4d7c0f' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', flex: 1 }}>{t("Yearly")}</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                  <CalendarDays size={14} color="#64748b" /> {getFilterDateString()}
                </div>
              </div>
            ) : location.pathname === '/admin/bookings' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => window.dispatchEvent(new Event('openAddBookingModal'))}
                  style={{
                    backgroundColor: '#4d7c0f', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                  }}
                >
                  <Plus size={16} /> {t("New Reservation")}
                </button>
              </div>
            ) : location.pathname === '/admin/fleet' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => window.dispatchEvent(new Event('openAddAtvModal'))}
                  style={{
                    backgroundColor: '#4d7c0f', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                  }}
                >
                  <Plus size={16} /> {t("Add New ATV")}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (user?.email?.split('@')[0] || t("User"))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {user?.role === 'admin' ? t("Administrator") : (user?.role === 'staff' ? t("Employee") : t("Customer"))}
                  </div>
                </div>
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName ? user.firstName + ' ' + (user.lastName || '') : user?.email || 'User')}&background=4d7c0f&color=fff`} 
                  alt={user?.firstName || "User"} 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="admin-main-content" style={{ flex: 1, overflowY: 'auto', padding: '48px', backgroundColor: '#f8fafc' }}>
          <Outlet context={{ analyticsFilter }} />
        </div>

      </main>
    </div>
  );
};
