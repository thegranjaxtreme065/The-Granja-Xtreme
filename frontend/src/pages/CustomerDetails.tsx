import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../utils/api';
import { ArrowLeft, Mail, Phone, Calendar, Banknote, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatAtvName } from '../utils/formatAtv';

interface Booking {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  finalTotal?: number;
  atvId: { _id: string; name: string; model: string; images: string[] };
}

interface CustomerMetrics {
  totalRentals: number;
  totalSpend: number;
  status: string;
}

export const CustomerDetails: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState<any>(null);
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await fetchAPI(`/auth/customers/${id}/details`);
        setCustomer(data.customer);
        setMetrics(data.metrics);
        setBookings(data.bookings);
      } catch (e) {
        console.error(e);
        setError('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };
    if (id) loadDetails();
  }, [id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>{t("Loading customer profile...")}</div>;
  if (error || !customer) return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error || t('Customer not found')}</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VIP':
        return { bg: '#fef3c7', text: '#b45309', label: t('Premium/VIP'), dot: '#d97706' };
      case 'Active':
        return { bg: '#ecfccb', text: '#4d7c0f', label: t('Confirmed'), dot: '#65a30d' };
      default:
        return { bg: '#f1f5f9', text: '#475569', label: t('Pending'), dot: '#94a3b8' };
    }
  };

  const badge = getStatusBadge(metrics?.status || 'Pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate('/admin/customers')}
          style={{ padding: '8px', borderRadius: '50%', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{t("Customer Profile")}</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>{t("Detailed view and booking history")}</p>
        </div>
      </div>

      <div className="checkout-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>
        
        {/* Left Col: Profile Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e2e8f0', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: '#475569' }}>
              {customer.firstName[0]}{customer.lastName[0]}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>{customer.firstName} {customer.lastName}</h2>
            
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: badge.bg,
              color: badge.text,
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '11px',
              fontWeight: 700,
              marginBottom: '24px'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: badge.dot }}></div>
              {badge.label}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={16} color="#94a3b8" />
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{customer.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Phone size={16} color="#94a3b8" />
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{customer.phone || t('No phone')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={16} color="#94a3b8" />
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{t("Joined")} {new Date(customer.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Stats & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="admin-grid-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>{t("Total Spend (LTV)")}</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>${metrics?.totalSpend.toFixed(2)}</div>
              </div>
              <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '12px' }}>
                <Banknote size={24} color="#84cc16" />
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>{t("Total Rentals")}</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{metrics?.totalRentals}</div>
              </div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '12px' }}>
                <ShieldCheck size={24} color="#3b82f6" />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px 0' }}>{t("Booking History")}</h3>
            
            {bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>{t("No bookings found for this customer.")}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bookings.map(booking => (
                  <div key={booking._id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img src={booking.atvId?.images?.[0] || 'https://via.placeholder.com/60'} alt="ATV" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{formatAtvName(booking.atvId)}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {new Date(booking.startDate).toLocaleString()} — {new Date(booking.endDate).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#166534' }}>${(booking.finalTotal || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>{booking.status}</div>
                      </div>
                      <button style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        {t("Details")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
