import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, User, Ticket, Star, MapPin, Award,
  FileText, CheckCircle, 
  ArrowRight, Clock, Plus,
  Search, SlidersHorizontal, RotateCcw, ArrowLeft, Printer,
  HelpCircle
} from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { formatAtvName } from '../utils/formatAtv';
import { SignatureModal } from '../components/SignatureModal';
import { GlobalLoader } from '../components/Skeletons';
import { useTranslation } from 'react-i18next';


interface Booking {
  _id: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Reserved' | 'Active' | 'Completed' | 'Cancelled' | 'Pending Signature' | 'Customer Signed' | 'Upcoming';
  payment: {
    status: string;
    amountPaid?: number;
    method?: string;
  };
  pricing: {
    total: number;
  };
  atvId: {
    name: string;
    model: string;
    images?: string[];
    ratePerDay?: number;
  };
  customerSignature?: string;
  customerSignedAt?: string;
  adminSignature?: string;
  adminSignedAt?: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  createdAt?: string;
}

interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passport?: string;
}

interface CustomerDashboardProps {
  user: User | null;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedContract, setSelectedContract] = useState<Booking | null>(null);
  const [signatureBookingId, setSignatureBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/dashboard');
      return;
    }
    const loadMyData = async () => {
      try {
        const [bookingsData, invoicesData] = await Promise.all([
          fetchAPI('/bookings/my'),
          fetchAPI('/invoices/my').catch(() => []) // gracefully handle if route fails
        ]);
        setBookings(bookingsData);
        setInvoices(invoicesData);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadMyData();
  }, [user, navigate]);

  if (loading) return <GlobalLoader />;

  const activeRentals = bookings.filter((b) => b.status === 'Active');
  const upcomingReservations = bookings.filter((b) => ['Upcoming', 'Pending Signature', 'Customer Signed'].includes(b.status));
  const sortedUpcoming = [...upcomingReservations].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const nextBooking = sortedUpcoming[0];

  const calculateDaysLeft = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(dateString);
    const diffTime = bookingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getStatusBadge = (status: Booking['status']) => {
    const styles: Record<string, React.CSSProperties> = {
      Pending: { background: '#e0f2fe', color: '#0369a1' },
      'Pending Signature': { background: '#fef08a', color: '#854d0e' },
      'Customer Signed': { background: '#e0f2fe', color: '#0369a1' },
      Upcoming: { background: '#e0f2fe', color: '#0369a1' },
      Active: { background: '#dcfce7', color: '#15803d' },
      Completed: { background: '#f3f4f6', color: '#4b5563' },
      Cancelled: { background: '#fee2e2', color: '#b91c1c' },
    };
    const labels: Record<string, string> = {
      Pending: 'Reserved',
      'Pending Signature': 'Awaiting Signature',
      'Customer Signed': 'Upcoming',
      Upcoming: 'Upcoming',
      Active: 'Riding',
      Completed: 'Completed',
      Cancelled: 'Cancelled',
    };
    const s = styles[status] || styles.Cancelled;
    return (
      <span style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '16px', fontWeight: 600, ...s }}>
        {labels[status] || 'Cancelled'}
      </span>
    );
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  /* ─── SIDEBAR (shared across all tabs) ─── */
  const sidebarTabs = [
    { id: 'profile', label: t('Profile'), icon: <User size={18} /> },
    { id: 'bookings', label: t('Bookings'), icon: <Calendar size={18} /> },
    { id: 'history', label: t('History'), icon: <Clock size={18} /> },
    { id: 'receipts', label: t('Receipts'), icon: <FileText size={18} /> },
    { id: 'contracts', label: t('Contracts'), icon: <FileText size={18} /> },
  ];

  /* ─── PROFILE TAB ─── */
  const renderProfile = () => (
    <>
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: '#111827' }}>
            {t("Welcome back,")} {user?.firstName}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>{t("Your next adventure is just around the corner.")}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/fleet')} style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#396759', border: 'none' }}>
            <Plus size={18} /> {t("Book New Adventure")}
          </button>
          <button 
            className="btn btn-outline" 
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            onClick={() => {
              if (bookings.length > 0) {
                setSelectedContract(bookings[0]);
                setActiveTab('contracts');
              } else {
                alert('No contracts available.');
              }
            }}
          >
            <FileText size={18} /> {t("View Last Contract")}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f3f4f6', color: '#396759' }}><Ticket size={24} /></div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>{t("Total Bookings")}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{bookings.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}><Calendar size={24} /></div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>{t("Upcoming Trips")}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{upcomingReservations.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}><Star size={24} /></div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>{t("Total Spent")}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>${bookings.reduce((sum, b) => sum + (b.pricing?.total || 0), 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Split: Upcoming Booking + Recent Activity */}
      <div className="checkout-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
        {/* Upcoming Booking Card */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#111827' }}>{t("Upcoming Booking")}</h2>
          {nextBooking ? (
            <div className="upcoming-booking-card">
              <div className="upcoming-booking-img-wrapper">
                <img src={nextBooking.atvId?.images?.[0] || "/images/vasile-valcan-1HqixV1agUw-unsplash.jpg"} alt="ATV Booking" className="upcoming-booking-img" style={{ objectFit: 'cover', background: '#f8fafc' }} />
                <div className="vip-badge"><Star size={16} fill="currentColor" /> {t("UPCOMING")}</div>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                  <div>
                    <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{formatAtvName(nextBooking.atvId)} {t("Rental")}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563' }}>
                      <MapPin size={18} /><span style={{ fontSize: '15px' }}>{t("The Granja Xtreme Headquarters")}</span>
                    </div>
                  </div>
                  <div className="countdown-box">
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#3730a3', lineHeight: 1 }}>
                      {calculateDaysLeft(nextBooking.startDate).toString().padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', marginTop: '4px', letterSpacing: '0.5px' }}>{t("DAYS LEFT")}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', marginBottom: '8px' }}>{t("DATE")}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                      {formatDate(nextBooking.startDate)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', marginBottom: '8px' }}>{t("STATUS")}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{nextBooking.status}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', marginBottom: '8px' }}>{t("VEHICLE")}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                      {formatAtvName(nextBooking.atvId)}
                    </div>
                  </div>
                </div>
                {nextBooking.status === 'Pending Signature' && (
                  <div>
                    <button 
                      onClick={() => setSignatureBookingId(nextBooking._id)} 
                      className="btn btn-primary" 
                      style={{ width: '100%', fontSize: '15px', padding: '14px', backgroundColor: '#396759', border: 'none' }}
                    >
                      {t("Complete Digital Signature")}
                    </button>
                    <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
                      {t("Your signature is required to finalize this reservation.")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: 'white', padding: '48px', borderRadius: '16px', textAlign: 'center', border: '1px dashed var(--border-light)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <Calendar size={48} style={{ color: '#e5e7eb', marginBottom: '16px' }} />
              <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '16px' }}>{t("You have no upcoming bookings.")}</p>
              <button onClick={() => navigate('/fleet')} className="btn btn-primary" style={{ backgroundColor: '#396759', border: 'none' }}>{t("Book an ATV Now")}</button>
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#111827' }}>{t("Recent Activity")}</h2>
          <div className="activity-timeline">
            {bookings.length > 0 ? bookings.slice(0, 4).map((booking, i, arr) => (
              <div className="activity-item" key={booking._id} style={i === arr.length - 1 ? { paddingBottom: 0 } : {}}>
                <div className="activity-icon" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}><CheckCircle size={20} /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827', marginBottom: '4px' }}>{t("Booking Created")}</div>
                  <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '4px' }}>{formatAtvName(booking.atvId)}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDate(booking.startDate)}</div>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0' }}>{t("No recent activity.")}</div>
            )}
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: '#396759', fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', margin: '0 auto' }}>
                {t("View All Activity")} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  /* ─── BOOKINGS TAB ─── */
  const renderBookings = () => (
    <>
      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: '#111827' }}>{t("My Bookings")}</h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>{t("Manage your active and upcoming adventures.")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/fleet')} style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#396759', border: 'none' }}>
          <Plus size={18} /> {t("Book New Adventure")}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {/* Active Rentals */}
        {activeRentals.length > 0 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} style={{ color: '#15803d' }} /> {t("Out on the Trails")}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {activeRentals.map((rental) => (
                <div key={rental._id} style={{ background: 'white', borderRadius: '16px', borderLeft: '6px solid #15803d', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{formatAtvName(rental.atvId)}</h3>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>{t("Model:")} {rental.atvId.model}</p>
                    </div>
                    {getStatusBadge(rental.status)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} /> {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
                  </div>
                  <button onClick={() => { setSelectedContract(rental); setActiveTab('contracts'); }} className="btn btn-outline" style={{ width: '100%' }}>{t("View Agreement")}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Reservations */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} style={{ color: '#0369a1' }} /> {t("Upcoming Reservations")}
          </h2>
          {upcomingReservations.length === 0 ? (
            <div style={{ background: 'white', padding: '48px', borderRadius: '16px', textAlign: 'center', border: '1px dashed var(--border-light)' }}>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>{t("You don't have any upcoming reservations scheduled.")}</p>
              <button onClick={() => navigate('/fleet')} className="btn btn-primary" style={{ backgroundColor: '#396759', border: 'none' }}>{t("Book an ATV Now")}</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {upcomingReservations.map((booking) => (
                <div key={booking._id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{formatAtvName(booking.atvId)}</h3>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>{t("Model:")} {booking.atvId.model}</p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div style={{ padding: '16px', background: '#f9f9ff', borderRadius: '8px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '13px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} /> {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {booking.status === 'Pending Signature' && (
                      <button 
                        onClick={() => setSignatureBookingId(booking._id)} 
                        className="btn btn-primary" 
                        style={{ flex: 1, fontSize: '13px', padding: '10px', backgroundColor: '#396759', border: 'none' }}
                      >
                        {t("Complete Signature")}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedReceipt(booking);
                        setActiveTab('receipts');
                      }} 
                      className="btn btn-outline" 
                      style={{ flex: 1, fontSize: '13px', padding: '10px' }}
                    >
                      {t("Invoice Details")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  /* ─── HISTORY TAB ─── */
  const ATV_IMAGES = [
    '/images/vasile-valcan-1HqixV1agUw-unsplash.jpg',
  ];

  const allBookingsSorted = bookings
    .filter(b => b.status === 'Completed' || b.status === 'Cancelled')
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const renderHistory = () => (
    <>
      {/* Header with search */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: '#111827' }}>{t("Booking History")}</h1>
            <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '16px' }}>{t("Review your current and past adventures at The Granja Xtreme.")}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <div className="history-search-bar">
              <Search size={18} style={{ color: '#9ca3af' }} />
              <input type="text" placeholder={t("Search by vehicle or ID...")} />
            </div>
            <button className="history-filter-btn">
              <SlidersHorizontal size={18} /> {t("Filters")}
            </button>
          </div>
        </div>
      </div>

      {/* All bookings as cards */}
      {allBookingsSorted.length === 0 ? (
        <div style={{ background: 'white', padding: '48px', borderRadius: '16px', textAlign: 'center', border: '1px dashed var(--border-light)' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>{t("You haven't made any bookings yet.")}</p>
          <button onClick={() => navigate('/fleet')} className="btn btn-primary" style={{ backgroundColor: '#396759', border: 'none' }}>{t("Book Your First Adventure")}</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {allBookingsSorted.map((b, idx) => {
            return (
              <div className="history-card" key={b._id}>
                {/* Left image */}
                <div className="history-card-img">
                  <img src={b.atvId?.images?.[0] || '/images/vasile-valcan-1HqixV1agUw-unsplash.jpg'} alt={b.atvId.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="history-card-badge">{t("VIP Experience")}</div>
                </div>

                {/* Right body */}
                <div className="history-card-body">
                  <div>
                    <div className="history-card-label past">
                      {b.status === 'Completed' ? t('Completed Adventure') : t('Cancelled Adventure')} <span className="dot" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>{formatAtvName(b.atvId)}</h3>
                      {getStatusBadge(b.status)}
                    </div>

                    <div className="history-card-meta">
                      <span><Calendar size={15} /> {formatDate(b.startDate)} - {formatDate(b.endDate)}</span>
                      <span><FileText size={15} /> ID: #GRX-{b._id.substring(0, 4).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="history-card-actions">
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{t("Total:")} ${b.pricing?.total?.toFixed(2) || '0.00'}</span>
                    {b.status === 'Completed' && b.payment?.status === 'Paid' && (
                      <button 
                        className="action-link" 
                        onClick={() => {
                          setSelectedReceipt(b);
                          setActiveTab('receipts');
                        }}
                      >
                        <FileText size={16} /> {t("Receipt")}
                      </button>
                    )}
                    <div style={{ marginLeft: 'auto' }}>
                      <button onClick={() => navigate('/fleet')} className="btn btn-outline" style={{ fontSize: '13px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RotateCcw size={16} /> {t("Rebook Expedition")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  /* ─── DOCUMENTS TAB (Receipts / Contracts) ─── */
  const renderReceiptDetail = (b: any) => {
    const diffTime = Math.abs(new Date(b.endDate).getTime() - new Date(b.startDate).getTime());
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    const baseRate = days * (b.atvId?.ratePerDay || 0);
    const tax = Math.round(baseRate * 0.1 * 100) / 100; // 10% tax
    const securityDeposit = 150; // Flat deposit
    const accessoriesSum = b.accessories ? b.accessories.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) : 0;
    const extraChargesSum = b.extraCharges ? b.extraCharges.reduce((acc: number, item: any) => acc + Number(item.amount), 0) : 0;
    const total = baseRate + tax + securityDeposit + accessoriesSum + extraChargesSum;

    const isPaid = b.payment?.status === 'Paid';
    const amountPaid = b.payment?.amountPaid !== undefined ? b.payment.amountPaid : (isPaid ? total : 0);
    const remainingBalance = b.payment?.remainingAmount !== undefined ? b.payment.remainingAmount : (total - amountPaid);

    const durationText = days === 1 ? '1 Day' : `${days} Days`;

    const formatDateTime = (dateString: string) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
    };

    const formatDateOnly = (dateString: string) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const pickupText = b.actualCheckInTime ? formatDateTime(b.actualCheckInTime) : formatDateOnly(b.startDate);
    const returnText = b.actualCheckOutTime ? formatDateTime(b.actualCheckOutTime) : formatDateOnly(b.endDate);

    return (
      <>
        {/* Top Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '24px', marginBottom: '32px' }}>
          <button onClick={() => setSelectedReceipt(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 700, color: '#111827', cursor: 'pointer' }}>
            <ArrowLeft size={20} /> {t("Receipt Details")}
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => window.print()}>
              <Printer size={18} /> {t("Print Receipt")}
            </button>
          </div>
        </div>

        <div className="no-print" style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
          {t("Receipts")} &gt; <span style={{ color: '#396759', fontWeight: 600 }}>TGX-RCP-{new Date(b.startDate).getFullYear()}-{b._id.substring(b._id.length - 4).toUpperCase()}</span>
        </div>

        {/* Invoice Card */}
        <div id="printable-document" style={{ background: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          {/* Card Header */}
          <div className="reduce-print-margin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#396759', letterSpacing: '2px', margin: 0 }}>THE GRANJA</h2>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#396759', letterSpacing: '2px', marginTop: '-4px', marginBottom: '24px' }}>XTREME</h2>
              
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                Calle Los Hidalgos, Sector Majagual<br />
                Sánchez, Samaná, Dominican Republic<br />
                <strong style={{ display: 'block', marginTop: '12px', color: '#111827' }}>+1 809-622-4122</strong>
                <a href="mailto:tgranjaxtreme065@gmail.com" style={{ color: '#396759', textDecoration: 'none' }}>tgranjaxtreme065@gmail.com</a>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              {b.status === 'Cancelled' ? (
                <div style={{ display: 'inline-block', border: '1px solid #9ca3af', color: '#4b5563', background: '#f3f4f6', padding: '4px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
                  {t("CANCELLED")}
                </div>
              ) : isPaid ? (
                <div style={{ display: 'inline-block', border: '1px solid #84cc16', color: '#65a30d', background: '#ecfccb', padding: '4px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
                  {t("PAID")}
                </div>
              ) : (
                <div style={{ display: 'inline-block', border: '1px solid #ef4444', color: '#b91c1c', background: '#fee2e2', padding: '4px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
                  {t("UNPAID")}
                </div>
              )}
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
                {t("Receipt #")}TGX-RCP-{new Date(b.startDate).getFullYear()}-{b._id.substring(b._id.length - 4).toUpperCase()}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                {t("Date & Time:")} <strong>{formatDateTime(b.createdAt || new Date().toISOString())}</strong><br />
              </div>
            </div>
          </div>

          {/* Billed To / Summary */}
          <div className="reduce-print-margin checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '48px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                {t("CUSTOMER DETAILS")}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.8 }}>
                {t("Phone:")} <strong style={{ color: '#111827' }}>{user?.phone || t('Not Provided')}</strong><br />
                {t("Email:")} <strong style={{ color: '#111827' }}>{user?.email}</strong><br />
                {t("Passport / ID:")} <strong style={{ color: '#111827' }}>{user?.passport || (() => {
                  try {
                    const saved = localStorage.getItem('booking_passport');
                    if (!saved) return t('Verified on File');
                    return saved.startsWith('"') ? JSON.parse(saved) : saved;
                  } catch {
                    return localStorage.getItem('booking_passport') || t('Verified on File');
                  }
                })()}</strong>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                {t("RENTAL SUMMARY")}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.8 }}>
                {t("ATV Assigned:")} <strong style={{ color: '#111827' }}>{formatAtvName(b.atvId)}</strong><br />
                {t("Pickup:")} <strong style={{ color: '#111827' }}>{pickupText}</strong><br />
                {t("Return:")} <strong style={{ color: '#111827' }}>{returnText}</strong><br />
                {t("Rental Duration:")} <strong style={{ color: '#111827' }}>{durationText}</strong>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="admin-table-container">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '32px' }}>
            <thead>
              <tr style={{ backgroundColor: '#eef2ff' }}>
                <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>{t("Description")}</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textAlign: 'center' }}>{t("Qty")}</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textAlign: 'right' }}>{t("Unit Price")}</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textAlign: 'right', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>{t("Total")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{t("ATV Rental -")} {formatAtvName(b.atvId)}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{t("Includes standard equipment and safety gear.")}</div>
                </td>
                <td style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>{days} {days > 1 ? t('Days') : t('Day')}</td>
                <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>${(b.atvId?.ratePerDay || 0).toFixed(2)}</td>
                <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, fontSize: '14px' }}>${baseRate.toFixed(2)}</td>
              </tr>
              {b.accessories && b.accessories.length > 0 && b.accessories.map((acc: any, index: number) => (
                <tr key={`acc-${index}`}>
                  <td style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{t(acc.name || '')}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{t("Accessory")}</div>
                  </td>
                  <td style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>{acc.quantity || 1}</td>
                  <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>${(acc.price || 0).toFixed(2)}</td>
                  <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, fontSize: '14px' }}>${((acc.price || 0) * (acc.quantity || 1)).toFixed(2)}</td>
                </tr>
              ))}
              {b.extraCharges && b.extraCharges.length > 0 && b.extraCharges.map((charge: any, index: number) => (
                <tr key={`charge-${index}`}>
                  <td style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{t(charge.reason || '')}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{charge.description ? t(charge.description) : ''}</div>
                  </td>
                  <td style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>1</td>
                  <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>${(Number(charge.amount) || 0).toFixed(2)}</td>
                  <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, fontSize: '14px' }}>${(Number(charge.amount) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
</div>

          {/* Totals */}
          <div className="reduce-print-margin" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '48px' }}>
            <div style={{ width: '360px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563' }}>
                <span>{t("ATV Rental -")} ({days} {days > 1 ? t('Days') : t('Day')})</span>
                <span>${baseRate.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563' }}>
                <span>{t("Luxury Tax (10%)")}</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              {b.accessories && b.accessories.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563' }}>
                  <span>{t("Accessories")}</span>
                  <span>${b.accessories.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toFixed(2)}</span>
                </div>
              )}
              {b.extraCharges && b.extraCharges.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563' }}>
                  <span>{t("Extra Charges")}</span>
                  <span>${b.extraCharges.reduce((acc: number, item: any) => acc + Number(item.amount), 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>
                <span>{t("Security Deposit (Refundable)")}</span>
                <span>${securityDeposit.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 8px', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                <span>{t("Grand Total")}</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#4b5563' }}>
                <span>{t("Amount Paid")} ({t(b.payment?.method || 'Card/Cash')})</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>-${amountPaid.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', fontSize: '20px', fontWeight: 800, color: remainingBalance > 0 ? '#b91c1c' : '#3f6212', borderTop: '2px solid #e5e7eb', marginTop: '8px' }}>
                <span>{t("REMAINING BALANCE")}</span>
                <span>${remainingBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Signature Space */}
          <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '64px', marginBottom: '24px' }}>
            <div>
              {b.customerSignature ? (
                <div style={{ height: '60px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #111827' }}>
                  <img src={b.customerSignature} alt="Customer Signature" style={{ maxHeight: '50px', maxWidth: '100%' }} />
                </div>
              ) : (
                <div style={{ borderBottom: '1px solid #111827', height: '60px', marginBottom: '8px' }}></div>
              )}
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t("Customer Signature")}</div>
              {b.customerSignedAt && (
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{t("Signed:")} {new Date(b.customerSignedAt).toLocaleString()}</div>
              )}
            </div>
            <div>
              {/* Optional secondary signature or stamp space */}
            </div>
          </div>

          {/* Footer Identifier */}
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace', marginTop: '32px' }}>
            TXN-{Math.random().toString(36).substring(2, 10).toUpperCase()}-A7F2 • {t("OFFICIAL RECEIPT")}
          </div>
        </div>

      </>
    );
  };

  const renderContractDetail = (b: Booking) => {
    return (
      <>
        {/* Top Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '24px', marginBottom: '32px' }}>
          <button onClick={() => setSelectedContract(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 700, color: '#111827', cursor: 'pointer' }}>
            <ArrowLeft size={20} /> {t("Contract #")}TGX-CTR-{new Date(b.startDate).getFullYear()}-{b._id.substring(b._id.length - 4).toUpperCase()}
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => window.print()}>
              <Printer size={18} /> {t("Print")}
            </button>
          </div>
        </div>

        {/* Contract Document */}
        <div id="printable-document" style={{ background: 'white', borderRadius: '4px', padding: '64px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '64px' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#3f6212', margin: 0 }}>Granja Xtreme</h2>
              <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6, marginTop: '12px' }}>
                Calle Los Hidalgos, Sector Majagual<br />
                Sánchez, Samaná, Dominican Republic<br />
                <strong style={{ display: 'block', marginTop: '12px', color: '#111827' }}>+1 809-622-4122</strong>
                <a href="mailto:tgranjaxtreme065@gmail.com" style={{ color: '#396759', textDecoration: 'none' }}>tgranjaxtreme065@gmail.com</a>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0, marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t("Rental Agreement")}</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '8px 16px', fontSize: '13px', alignItems: 'center' }}>
                <div style={{ color: '#6b7280', textAlign: 'right', fontWeight: 600 }}>{t("DATE:")}</div>
                <div style={{ color: '#111827', fontWeight: 700, textAlign: 'right' }}>{formatDate(b.startDate)}</div>
                
                <div style={{ color: '#6b7280', textAlign: 'right', fontWeight: 600 }}>{t("CONTRACT ID:")}</div>
                <div style={{ color: '#111827', fontWeight: 700, textAlign: 'right' }}>#TGX-CTR-{new Date(b.startDate).getFullYear()}-{b._id.substring(b._id.length - 4).toUpperCase()}</div>
                
                <div style={{ color: '#6b7280', textAlign: 'right', fontWeight: 600 }}>{t("STATUS:")}</div>
                <div style={{ color: '#15803d', fontWeight: 700, textAlign: 'right' }}>{t("APPROVED")}</div>
              </div>
            </div>
          </div>

          <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '48px' }}>
            {/* Customer Info */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '1px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '20px' }}>{t("I. CUSTOMER INFORMATION")}</div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>{t("Primary Renter")}</div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: 700 }}>{user?.firstName} {user?.lastName}</div>
              </div>
              

              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>{t("Contact Email")}</div>
                <div style={{ fontSize: '15px', color: '#111827' }}>{user?.email}</div>
              </div>
            </div>

            {/* Vehicle Specs */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '1px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '20px' }}>{t("II. VEHICLE SPECIFICATIONS")}</div>
              
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '60px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden' }}>
                  <img src={b.atvId?.images?.[0] || "/images/vasile-valcan-1HqixV1agUw-unsplash.jpg"} alt="ATV" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{formatAtvName(b.atvId)}</div>
                  <div style={{ fontSize: '12px', color: '#4b5563', fontStyle: 'italic', marginBottom: '12px' }}>VIN: 4XP2024-TR-90112</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', background: '#b4ebd1', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{t("PREMIUM CLASS")}</span>
                    <span style={{ fontSize: '10px', background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{t("GPS TRACKED")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div style={{ marginBottom: '64px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '1px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '20px' }}>{t("III. RENTAL AGREEMENT")}</div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.8, marginBottom: '48px' }}>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>{t("Customer receives the ATV in good condition.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer must have a valid driver’s license.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer must wear a helmet and safety equipment.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("No driving under the influence of alcohol or drugs.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer is responsible for any traffic violations or fines.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer is responsible for damages caused by negligence or misuse.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer may not lend, transfer, or sub-rent the ATV to another person.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("ATV must be returned on the agreed date and time.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Late returns may result in additional charges.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Granja Xtreme is not responsible for lost personal belongings.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer acknowledges and accepts the risks associated with ATV riding.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("In case of an accident, customer must notify Granja Xtreme immediately.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Security deposit amount (if applicable).")}</li>
                <li style={{ marginBottom: '8px' }}>{t("ATV number and vehicle information.")}</li>
              </ul>
            </div>

            <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '1px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '20px' }}>{t("IV. INSURANCE AND CUSTOMER RESPONSIBILITY")}</div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}>{t("The customer understands and agrees that any insurance available for the ATV provides coverage only as required by law and subject to the limits, conditions, and exclusions of the insurance policy.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("The customer acknowledges that such insurance may not cover all damages to the ATV, nor all property damage, bodily injury, or losses caused to third parties.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("The customer shall be fully responsible for any damage, loss, broken parts, mechanical damage, rollover, accident, misuse, negligence, reckless operation, or violation of this rental agreement occurring during the rental period.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("The customer shall also be responsible for any deductible, repair costs, loss of use, towing charges, recovery expenses, administrative fees, or any other costs not covered by the insurance policy.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("If damages or injuries caused to third parties exceed the insurance coverage limits or are excluded from coverage, the customer shall be solely responsible for such damages, claims, expenses, legal fees, and liabilities.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("The customer agrees to operate the ATV at their own risk and releases Granja Xtreme, its owners, employees, and representatives from liability for accidents, injuries, damages, or losses resulting from the customer’s negligence, misuse, violation of safety rules, or breach of this rental agreement.")}</p>
            </div>
          </div>

          {/* Signatures Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '64px', marginBottom: '64px' }}>
            <div>
              {b.customerSignature ? (
                <div style={{ height: '60px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #111827' }}>
                  <img src={b.customerSignature} alt="Customer Signature" style={{ maxHeight: '50px', maxWidth: '100%' }} />
                </div>
              ) : (
                <div style={{ borderBottom: '1px solid #111827', height: '60px', marginBottom: '8px' }}></div>
              )}
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t("Customer Signature")}</div>
              {b.customerSignedAt && (
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{t("Signed:")} {new Date(b.customerSignedAt).toLocaleString()}</div>
              )}
            </div>
            <div>
              {b.adminSignature ? (
                <div style={{ height: '60px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #111827' }}>
                  <img src={b.adminSignature} alt="Admin Signature" style={{ maxHeight: '50px', maxWidth: '100%' }} />
                </div>
              ) : (
                <div style={{ borderBottom: '1px solid #111827', height: '60px', marginBottom: '8px' }}></div>
              )}
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{t("Company Representative Signature")}</div>
              {b.adminSignedAt && (
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{t("Signed:")} {new Date(b.adminSignedAt).toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>

      </>
    );
  };

  const renderInvoiceDetail = (inv: any) => {
    const isPaid = inv.status === 'Paid';

    return (
      <>
        {/* Top Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '24px', marginBottom: '32px' }}>
          <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 700, color: '#111827', cursor: 'pointer' }}>
            <ArrowLeft size={20} /> Invoice Details
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '14px', borderColor: '#e5e7eb', color: '#111827' }} onClick={() => window.print()}>
              <Printer size={18} /> Print Invoice
            </button>
          </div>
        </div>

        <div className="no-print" style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
          Receipts & Invoices &gt; <span style={{ color: '#396759', fontWeight: 600 }}>{inv.invoiceNumber}</span>
        </div>

        {/* Invoice Card */}
        <div id="printable-document" style={{ background: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          {/* Card Header */}
          <div className="reduce-print-margin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#396759', letterSpacing: '2px', margin: 0 }}>THE GRANJA</h2>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#396759', letterSpacing: '2px', marginTop: '-4px', marginBottom: '24px' }}>XTREME</h2>
              
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                Calle Los Hidalgos, Sector Majagual<br />
                Sánchez, Samaná, Dominican Republic<br />
                <strong style={{ display: 'block', marginTop: '12px', color: '#111827' }}>+1 809-622-4122</strong>
                <a href="mailto:tgranjaxtreme065@gmail.com" style={{ color: '#396759', textDecoration: 'none' }}>tgranjaxtreme065@gmail.com</a>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              {isPaid ? (
                <div style={{ display: 'inline-block', border: '1px solid #84cc16', color: '#65a30d', background: '#ecfccb', padding: '4px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
                  PAID
                </div>
              ) : (
                <div style={{ display: 'inline-block', border: '1px solid #ef4444', color: '#b91c1c', background: '#fee2e2', padding: '4px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
                  {inv.status.toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
                Invoice {inv.invoiceNumber}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                Date: <strong>{new Date(inv.createdAt).toLocaleDateString()}</strong><br />
                Due Date: <strong style={{ color: '#b91c1c' }}>{new Date(inv.dueDate).toLocaleDateString()}</strong><br />
              </div>
            </div>
          </div>

          {/* Billed To / Summary */}
          <div className="reduce-print-margin" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '48px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                CUSTOMER DETAILS
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.8 }}>
                Phone: <strong style={{ color: '#111827' }}>{user?.phone || 'Not Provided'}</strong><br />
                Email: <strong style={{ color: '#111827' }}>{user?.email}</strong><br />
                Passport / ID: <strong style={{ color: '#111827' }}>{user?.passport || (() => {
                  try {
                    const saved = localStorage.getItem('booking_passport');
                    if (!saved) return 'Verified on File';
                    return saved.startsWith('"') ? JSON.parse(saved) : saved;
                  } catch {
                    return localStorage.getItem('booking_passport') || 'Verified on File';
                  }
                })()}</strong>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                INVOICE SUMMARY
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.8 }}>
                ATV Reference: <strong style={{ color: '#111827' }}>{formatAtvName(inv.atvId) || 'N/A'}</strong><br />
                Charge Type: <strong style={{ color: '#111827' }}>{inv.invoiceType || 'Additional Charge'}</strong><br />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="admin-table-container">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '32px' }}>
            <thead>
              <tr style={{ backgroundColor: '#eef2ff' }}>
                <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>Description</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textAlign: 'right', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{inv.invoiceType}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{inv.description}</div>
                </td>
                <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>${(inv.amount || 0).toFixed(2)}</td>
                <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, fontSize: '14px' }}>${(inv.amount || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
</div>

          {/* Totals Box */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <div style={{ width: '300px', backgroundColor: '#f9fafb', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px', color: '#4b5563' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>${(inv.amount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px', color: '#4b5563' }}>
                <span>Amount Paid</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>-${(inv.amount - inv.balance).toFixed(2)}</span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '16px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>Balance Due</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#396759' }}>${(inv.balance || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '64px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            Thank you for your business! Please remit payment by the due date.
          </div>
        </div>
      </>
    );
  };

  const renderDocuments = () => {
    if (activeTab === 'receipts' && selectedReceipt) {
      return renderReceiptDetail(selectedReceipt);
    }
    
    if (activeTab === 'receipts' && selectedInvoice) {
      return renderInvoiceDetail(selectedInvoice);
    }
    
    if (activeTab === 'contracts' && selectedContract) {
      return renderContractDetail(selectedContract);
    }

    return (
      <>
        <div className="dashboard-header" style={{ marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: '#111827' }}>
              {activeTab === 'receipts' ? t("Receipts & Invoices") : t("Contracts & Waivers")}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>{t("Download your official documentation.")}</p>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          {bookings.length === 0 ? (
            <div style={{ padding: '32px' }}>
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>{t("No documents available.")}</p>
            </div>
          ) : (
            <div className="admin-table-container">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9f9ff', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '20px 24px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{t("Document Name")}</th>
                  <th style={{ padding: '20px 24px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{t("Associated Booking")}</th>
                  <th style={{ padding: '20px 24px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{t("Date Issued")}</th>
                  <th style={{ padding: '20px 24px', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <React.Fragment key={b._id}>
                    {activeTab === 'contracts' && (
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FileText size={20} style={{ color: '#0369a1' }} />
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{t("ATV Rental Contract")}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{t("Liability Waiver")}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px', fontSize: '14px', color: '#4b5563' }}>#{b._id.substring(0, 8).toUpperCase()}</td>
                        <td style={{ padding: '20px 24px', fontSize: '14px', color: '#4b5563' }}>{formatDate(b.startDate)}</td>
                        <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => setSelectedContract(b)}
                              className="btn btn-outline"
                              style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <FileText size={16} /> {t("View Details")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {activeTab === 'receipts' && (
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Ticket size={20} style={{ color: '#15803d' }} />
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{t("Rental Invoice Receipt")}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{t("Payment Proof")}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px', fontSize: '14px', color: '#4b5563' }}>#{b._id.substring(0, 8).toUpperCase()}</td>
                        <td style={{ padding: '20px 24px', fontSize: '14px', color: '#4b5563' }}>{formatDate(b.startDate)}</td>
                        <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => setSelectedReceipt(b)}
                              className="btn btn-outline"
                              style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <FileText size={16} /> {t("View Details")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {activeTab === 'receipts' && invoices.filter(inv => inv.invoiceType !== 'Rental Charge').map((inv) => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Ticket size={20} style={{ color: '#b91c1c' }} />
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{inv.invoiceType || t('Invoice')}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{t("Additional Charge")}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '14px', color: '#4b5563' }}>#{inv.invoiceNumber}</td>
                    <td style={{ padding: '20px 24px', fontSize: '14px', color: '#4b5563' }}>{formatDate(inv.createdAt)}</td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="btn btn-outline"
                          style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <FileText size={16} /> {t("View Details")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          )}
        </div>
      </>
    );
  };

  /* ─── MAIN RENDER ─── */
  return (
    <div className="dashboard-page-container">
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 15mm;
          }
          .dashboard-sidebar, .no-print, footer, header, nav {
            display: none !important;
          }
          .dashboard-page-container {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .dashboard-main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          #printable-document {
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-document .reduce-print-margin {
            margin-bottom: 24px !important;
          }
          #printable-document table {
            margin-bottom: 16px !important;
          }
        }
      `}</style>

      {/* LEFT SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '24px', fontWeight: 800, lineHeight: 1.2 }}>
            The Granja<br />Xtreme
          </h1>
        </div>

        <div className="dashboard-sidebar-profile">
          <div style={{ width: '40px', height: '40px', backgroundColor: '#396759', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <User size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{t("Welcome back")}</div>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{t("Manage your adventure")}</div>
          </div>
        </div>

        <nav className="dashboard-sidebar-nav">
          {sidebarTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sidebar-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              style={{ width: '100%', border: 'none', background: activeTab === tab.id ? 'rgba(167, 201, 87, 0.6)' : 'transparent', textAlign: 'left' }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '24px' }}>
          <button onClick={() => navigate('/contact')} style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <HelpCircle size={18} /> {t("Need Help?")}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main" style={{ paddingBottom: '64px' }}>
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'bookings' && renderBookings()}
        {activeTab === 'history' && renderHistory()}
        {(activeTab === 'receipts' || activeTab === 'contracts') && renderDocuments()}
      </main>

      <SignatureModal 
        isOpen={!!signatureBookingId}
        onClose={() => setSignatureBookingId(null)}
        onComplete={async (url) => {
          if (!signatureBookingId) return;
          try {
            await fetchAPI(`/bookings/${signatureBookingId}/customer-signature`, {
              method: 'PUT',
              body: { signatureUrl: url }
            });
            setSignatureBookingId(null);
            window.location.reload();
          } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to save signature.');
          }
        }}
        title="Complete Your Reservation"
        subtitle="Please provide your digital signature below to finalize your booking contract."
      />
    </div>
  );
};
