import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Clock, Truck, ShieldAlert, Users, FileText } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { AdminBookingModal } from '../components/AdminBookingModal';
import { FleetCheckModal } from '../components/FleetCheckModal';
import { AdminBookingDetailsModal } from '../components/AdminBookingDetailsModal';
import { SkeletonGrid } from '../components/Skeletons';
import { formatAtvName } from '../utils/formatAtv';

interface Booking {
  _id: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Reserved' | 'Active' | 'Completed' | 'Cancelled' | 'Pending Signature' | 'Customer Signed' | 'Upcoming';
  finalTotal: number;
  payment?: { status: string; paidAmount: number; remainingAmount: number };
  atvId: { _id: string; name: string; model: string; ratePerDay: number; images: string[] };
  customerId: { _id: string; firstName: string; lastName: string; email: string; phone: string };
  notes?: string;
}

export const AdminBookings: React.FC = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2024, 10, 1)); 
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [vehicleFilter, setVehicleFilter] = useState('All Vehicles');
  const [atvs, setAtvs] = useState<any[]>([]);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showFleetCheck, setShowFleetCheck] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<string | null>(null);
  
  const [atvStats, setAtvStats] = useState({ total: 0, available: 0, maintenance: 0 });
  const [staffCount, setStaffCount] = useState(0);

  const loadDashboardData = async () => {
    try {
      const [bData, aData, sData] = await Promise.all([
        fetchAPI('/bookings'),
        fetchAPI('/atvs'),
        fetchAPI('/employees').catch(() => []) // Fallback if no permission
      ]);
      setBookings(bData);
      setAtvs(aData);
      
      const total = aData.length;
      const maintenance = aData.filter((a: any) => a.status === 'MAINTENANCE' || a.status === 'Maintenance').length;
      setAtvStats({ total, available: total - maintenance, maintenance });
      setStaffCount(sData.length || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const d = new Date();
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(d.getDate());
    loadDashboardData();

    const handleOpenAdd = () => setShowAddBooking(true);
    window.addEventListener('openAddBookingModal', handleOpenAdd);
    return () => window.removeEventListener('openAddBookingModal', handleOpenAdd);
  }, []);

  const updateBookingStatus = async (id: string, newStatus: string) => {
    try {
      await fetchAPI(`/bookings/${id}/status`, {
        method: 'PUT',
        body: { status: newStatus }
      });
      loadDashboardData();
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    }
  };

  const collectPayment = async (id: string, amount: number) => {
    try {
      await fetchAPI(`/bookings/${id}/collect-payment`, {
        method: 'PUT',
        body: { amount, notes: 'Collected at desk' }
      });
      loadDashboardData();
    } catch (e) {
      console.error(e);
      alert('Failed to collect payment');
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = [
    t('adminBookings.months.january', 'January'), t('adminBookings.months.february', 'February'),
    t('adminBookings.months.march', 'March'), t('adminBookings.months.april', 'April'),
    t('adminBookings.months.may', 'May'), t('adminBookings.months.june', 'June'),
    t('adminBookings.months.july', 'July'), t('adminBookings.months.august', 'August'),
    t('adminBookings.months.september', 'September'), t('adminBookings.months.october', 'October'),
    t('adminBookings.months.november', 'November'), t('adminBookings.months.december', 'December')
  ];
  const dayNames = [
    t('adminBookings.days.sun', 'SUN'), t('adminBookings.days.mon', 'MON'),
    t('adminBookings.days.tue', 'TUE'), t('adminBookings.days.wed', 'WED'),
    t('adminBookings.days.thu', 'THU'), t('adminBookings.days.fri', 'FRI'),
    t('adminBookings.days.sat', 'SAT')
  ];

  const uniqueVehicles = Array.from(new Set(atvs.map(a => `${a.name} ${a.model}`.trim())));

  const getBookingsForDate = (dateNum: number) => {
    return bookings.filter(b => {
      const bDate = new Date(b.startDate);
      const isDateMatch = bDate.getDate() === dateNum && bDate.getMonth() === currentDate.getMonth() && bDate.getFullYear() === currentDate.getFullYear();
      if (!isDateMatch) return false;

      if (vehicleFilter !== 'All Vehicles') {
        const atvName = formatAtvName(b.atvId);
        if (atvName !== vehicleFilter) return false;
      }

      if (statusFilter === 'All Statuses') return true;
      if (statusFilter === 'Pending') return ['Pending', 'Pending Signature', 'Customer Signed'].includes(b.status);
      if (statusFilter === 'Confirmed/Approved') return ['Reserved', 'Upcoming'].includes(b.status as string);
      if (statusFilter === 'Checked In' || statusFilter === 'In Progress (Rental Active)') return b.status === 'Active';
      if (statusFilter === 'Checked Out / Completed') return b.status === 'Completed';
      if (statusFilter === 'Cancelled') return b.status === 'Cancelled';
      
      return true;
    });
  };

  const selectedBookings = selectedDate ? getBookingsForDate(selectedDate) : [];
  const pendingSelected = selectedBookings.filter(b => b.status === 'Pending' || b.status === 'Pending Signature' || b.status === 'Customer Signed');
  const confirmedSelected = selectedBookings.filter(b => (b.status as any) === 'Reserved' || b.status === 'Active' || b.status === 'Completed');
  const cancelledSelected = selectedBookings.filter(b => b.status === 'Cancelled');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Filter / Navigation Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px 24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '13px', fontWeight: 600, color: '#334155', outline: 'none', whiteSpace: 'nowrap' }}>
            <option value="All Vehicles">{t('adminBookings.allVehicles', 'All Vehicles')}</option>
            {uniqueVehicles.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '13px', fontWeight: 600, color: '#334155', outline: 'none', whiteSpace: 'nowrap' }}>
            <option value="All Statuses">{t('adminBookings.allStatuses', 'All Statuses')}</option>
            <option value="Pending">{t('adminBookings.status.pending', 'Pending')}</option>
            <option value="Confirmed/Approved">{t('adminBookings.status.confirmed', 'Confirmed/Approved')}</option>
            <option value="Checked In">{t('adminBookings.status.checkedIn', 'Checked In')}</option>
            <option value="In Progress (Rental Active)">{t('adminBookings.status.inProgress', 'In Progress (Rental Active)')}</option>
            <option value="Checked Out / Completed">{t('adminBookings.status.completed', 'Checked Out / Completed')}</option>
            <option value="Cancelled">{t('adminBookings.status.cancelled', 'Cancelled')}</option>
          </select>
          <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '8px', padding: '4px' }}>
            <button onClick={() => setViewMode('month')} style={{ border: 'none', backgroundColor: viewMode === 'month' ? 'white' : 'transparent', padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: viewMode === 'month' ? 700 : 600, color: viewMode === 'month' ? '#0f172a' : '#64748b', boxShadow: viewMode === 'month' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('adminBookings.month', 'Month')}</button>
            <button onClick={() => setViewMode('week')} style={{ border: 'none', backgroundColor: viewMode === 'week' ? 'white' : 'transparent', padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: viewMode === 'week' ? 700 : 600, color: viewMode === 'week' ? '#0f172a' : '#64748b', boxShadow: viewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('adminBookings.week', 'Week')}</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '15px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
          <button onClick={prevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}><ChevronLeft size={20} /></button>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          <button onClick={nextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="checkout-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        
        {/* Calendar Grid */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {dayNames.map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>{day}</div>
            ))}
          </div>
          
          {viewMode === 'month' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', gridAutoRows: '100px' }}>
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#fafafa', border: '1px dashed #e2e8f0' }} />
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dateNum = i + 1;
                const dateBookings = getBookingsForDate(dateNum);
                const isSelected = selectedDate === dateNum;
                
                return (
                  <div 
                    key={dateNum} 
                    onClick={() => setSelectedDate(dateNum)}
                    style={{ 
                      padding: '8px', 
                      borderRadius: '8px', 
                      border: isSelected ? '2px solid #84cc16' : '1px solid #f1f5f9', 
                      backgroundColor: isSelected ? '#f7fee7' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#4d7c0f' : '#475569', marginBottom: '4px' }}>
                      {dateNum}
                    </div>
                    {dateBookings.slice(0, 3).map(b => {
                      const isPending = b.status === 'Pending' || b.status === 'Pending Signature' || b.status === 'Customer Signed';
                      const isConfirmed = (b.status as any) === 'Reserved' || b.status === 'Active' || b.status === 'Completed';
                      const isCancelled = b.status === 'Cancelled';
                      return (
                        <div key={b._id} style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          padding: '4px 6px', 
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          borderLeft: `3px solid ${isCancelled ? '#ef4444' : isPending ? '#f59e0b' : isConfirmed ? '#65a30d' : '#94a3b8'}`,
                          backgroundColor: isCancelled ? '#fee2e2' : isPending ? '#fef3c7' : isConfirmed ? '#ecfccb' : '#f1f5f9',
                          color: isCancelled ? '#b91c1c' : isPending ? '#b45309' : isConfirmed ? '#4d7c0f' : '#475569'
                        }}>
                          {formatAtvName(b.atvId) || 'Booking'}
                        </div>
                      );
                    })}
                    {dateBookings.length > 3 && (
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>+{dateBookings.length - 3} {t('adminBookings.more', 'more')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', gridAutoRows: '200px' }}>
              {Array.from({ length: 7 }).map((_, i) => {
                // Calculate week days based on selectedDate or currentDate
                const currentDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate || 1).getDay();
                const diff = i - currentDayOfWeek;
                const weekDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), (selectedDate || 1) + diff);
                const dateNum = weekDate.getDate();
                
                // If the weekDate is in a different month, we just hide or show disabled (for simplicity, we'll just show it)
                const dateBookings = bookings.filter(b => {
                  const bDate = new Date(b.startDate);
                  return bDate.getDate() === dateNum && bDate.getMonth() === weekDate.getMonth() && bDate.getFullYear() === weekDate.getFullYear();
                });
                const isSelected = selectedDate === dateNum && weekDate.getMonth() === currentDate.getMonth();

                return (
                  <div 
                    key={i} 
                    onClick={() => {
                      setCurrentDate(new Date(weekDate.getFullYear(), weekDate.getMonth(), 1));
                      setSelectedDate(dateNum);
                    }}
                    style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: isSelected ? '2px solid #84cc16' : '1px solid #f1f5f9', 
                      backgroundColor: isSelected ? '#f7fee7' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.2s',
                      opacity: weekDate.getMonth() !== currentDate.getMonth() ? 0.5 : 1
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: isSelected ? 800 : 700, color: isSelected ? '#4d7c0f' : '#475569', marginBottom: '8px' }}>
                      {dateNum}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                      {dateBookings.map(b => {
                        const isPending = b.status === 'Pending' || b.status === 'Pending Signature' || b.status === 'Customer Signed';
                        const isConfirmed = (b.status as any) === 'Reserved' || b.status === 'Active' || b.status === 'Completed';
                        const isCancelled = b.status === 'Cancelled';
                        return (
                          <div key={b._id} style={{ 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            padding: '6px 8px', 
                            borderRadius: '4px',
                            borderLeft: `3px solid ${isCancelled ? '#ef4444' : isPending ? '#f59e0b' : isConfirmed ? '#65a30d' : '#94a3b8'}`,
                            backgroundColor: isCancelled ? '#fee2e2' : isPending ? '#fef3c7' : isConfirmed ? '#ecfccb' : '#f1f5f9',
                            color: isCancelled ? '#b91c1c' : isPending ? '#b45309' : isConfirmed ? '#4d7c0f' : '#475569'
                          }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatAtvName(b.atvId) || 'Booking'}</div>
                            <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.8 }}>{b.customerId?.firstName} {b.customerId?.lastName}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Date Sidebar */}
        <div style={{ backgroundColor: '#eef2ff', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2 }}>{t('adminBookings.selected', 'Selected')}<br/>{t('adminBookings.date', 'Date')}</h2>
            <div style={{ backgroundColor: 'white', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>{monthNames[currentDate.getMonth()].substring(0,3)}</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a' }}>{selectedDate}</span>
            </div>
          </div>

          {loading ? (
            <SkeletonGrid count={2} />
          ) : selectedBookings.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', backgroundColor: 'white', borderRadius: '12px' }}>{t('adminBookings.noBookings', 'No bookings for this date.')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
              
              {/* Pending Approvals */}
              {pendingSelected.map(booking => (
                <div key={booking._id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'inline-block', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', marginBottom: '12px', letterSpacing: '0.5px' }}>
                    {t('adminBookings.pendingApproval', 'PENDING APPROVAL')}
                  </div>
                  <div style={{ position: 'absolute', top: 0, right: 24, width: '4px', height: '30px', backgroundColor: '#fca5a5' }} />
                  
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{booking.customerId?.firstName} {booking.customerId?.lastName}</h3>
                  <p style={{ margin: '4px 0 16px 0', fontSize: '13px', color: '#64748b' }}>Meta Expedition Package</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                      <Truck size={16} color="#94a3b8" /> {formatAtvName(booking.atvId)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                      <Clock size={16} color="#94a3b8" /> 
                      {(booking as any).actualCheckOutTime ? `${t('adminBookings.checkedOutTime', 'Checked Out: ')}${new Date((booking as any).actualCheckOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : t('adminBookings.pendingCheckOut', 'Pending Check Out')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#166534', fontWeight: 800 }}>
                      <FileText size={16} color="#166534" /> ${booking.finalTotal?.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setSelectedBookingForDetails(booking._id)}
                      style={{ flex: 1, backgroundColor: 'white', color: '#1e3a8a', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('adminBookings.viewDetails', 'View Details')}
                    </button>
                    <button 
                      onClick={() => updateBookingStatus(booking._id, 'Upcoming')}
                      style={{ flex: 1, backgroundColor: '#4d7c0f', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('adminBookings.approve', 'Approve')}
                    </button>
                  </div>
                </div>
              ))}

              {confirmedSelected.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '1px', marginTop: '8px' }}>{t('adminBookings.confirmedForToday', 'CONFIRMED FOR TODAY')}</div>
                  {confirmedSelected.map(booking => (
                    <div key={booking._id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          {booking.customerId?.firstName} {booking.customerId?.lastName}
                        </h4>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>{t(`adminBookings.status.${booking.status.toLowerCase().replace(' ', '')}`, booking.status)}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{formatAtvName(booking.atvId)}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#475569', marginTop: '4px' }}>
                        <span>{(booking as any).actualCheckOutTime ? new Date((booking as any).actualCheckOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + t('adminBookings.checkoutSuffix', ' Check-out') : (booking as any).actualCheckInTime ? new Date((booking as any).actualCheckInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + t('adminBookings.checkinSuffix', ' Check-in') : t('adminBookings.scheduledStart', 'Scheduled Start')}</span>
                        {booking.payment?.status === 'Paid' ? (
                          <span style={{ fontStyle: 'italic', color: '#4d7c0f' }}>{t('adminBookings.paidInFull', 'Paid in full')}</span>
                        ) : (
                          <button 
                            onClick={() => collectPayment(booking._id, booking.payment?.remainingAmount || booking.finalTotal)}
                            style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                            {t('adminBookings.markAsPaid', 'Mark as Paid')} (${booking.payment?.remainingAmount || booking.finalTotal})
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedBookingForDetails(booking._id)}
                          style={{ backgroundColor: 'white', color: '#1e3a8a', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                          {t('adminBookings.details', 'Details')}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {cancelledSelected.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', letterSpacing: '1px', marginTop: '8px' }}>{t('adminBookings.cancelledForToday', 'CANCELLED FOR TODAY')}</div>
                  {cancelledSelected.map(booking => (
                    <div key={booking._id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#991b1b' }}>
                          {booking.customerId?.firstName} {booking.customerId?.lastName}
                        </h4>
                        <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>{t('adminBookings.cancelled', 'CANCELLED')}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#b91c1c' }}>{formatAtvName(booking.atvId)}</div>
                      <button 
                        onClick={() => setSelectedBookingForDetails(booking._id)}
                        style={{ marginTop: '8px', backgroundColor: 'white', color: '#991b1b', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                        {t('adminBookings.viewDetailsReceipt', 'View Details / Receipt')}
                      </button>
                    </div>
                  ))}
                </>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="admin-grid-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#f7fee7', padding: '8px', borderRadius: '50%' }}><Truck size={20} color="#4d7c0f" /></div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t('adminBookings.vehicleHealth', 'Vehicle Health')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{atvStats.available}<span style={{ fontSize: '18px', color: '#94a3b8' }}>/{atvStats.total}</span></div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>↗ {atvStats.total > 0 ? Math.round((atvStats.available / atvStats.total) * 100) : 0}{t('adminBookings.readySuffix', '% Ready')}</div>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${atvStats.total > 0 ? (atvStats.available / atvStats.total) * 100 : 0}%`, height: '100%', backgroundColor: '#4d7c0f', borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '50%' }}><Users size={20} color="#059669" /></div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t('adminBookings.staffing', 'Staffing')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{staffCount}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t('adminBookings.activeGuides', 'Active Guides')}</div>
          </div>
          <div style={{ display: 'flex', marginTop: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#475569' }}>JD</div>
            {staffCount > 1 && <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: '-8px', backgroundColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#475569' }}>SM</div>}
            {staffCount > 2 && <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: '-8px', backgroundColor: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'white' }}>TS</div>}
            {staffCount > 3 && <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: '-8px', backgroundColor: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'white' }}>+{staffCount - 3}</div>}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#fffbeb', padding: '8px', borderRadius: '50%' }}><ShieldAlert size={20} color="#d97706" /></div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t('adminBookings.maintenance', 'Maintenance')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#b91c1c', lineHeight: 1 }}>{atvStats.maintenance}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t('adminBookings.dueForService', 'Due for Service')}</div>
          </div>
          <button onClick={() => setShowFleetCheck(true)} style={{ width: '100%', padding: '10px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
            {t('adminBookings.scheduleFleetCheck', 'Schedule Fleet Check')}
          </button>
        </div>
      </div>
      
      {showAddBooking && (
        <AdminBookingModal 
          onClose={() => setShowAddBooking(false)} 
          onSuccess={() => {
            setShowAddBooking(false);
            loadDashboardData();
          }} 
        />
      )}
      
      {showFleetCheck && (
        <FleetCheckModal 
          onClose={() => setShowFleetCheck(false)} 
          onSuccess={() => {
            setShowFleetCheck(false);
            alert('Fleet check scheduled successfully!');
            loadDashboardData();
          }} 
        />
      )}

      {selectedBookingForDetails && (
        <AdminBookingDetailsModal 
          bookingId={selectedBookingForDetails} 
          onClose={() => setSelectedBookingForDetails(null)} 
          onUpdate={loadDashboardData} 
        />
      )}
    </div>
  );
};
