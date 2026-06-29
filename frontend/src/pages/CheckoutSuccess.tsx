import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, MapPin, Grid, FileText, Info } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { formatAtvName } from '../utils/formatAtv';
import { useTranslation } from 'react-i18next';

interface Booking {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  pricing?: {
    baseRate: number;
    tax: number;
    securityDeposit: number;
    total: number;
  };
  atvId: {
    _id: string;
    name: string;
    model: string;
    ratePerDay: number;
    images?: string[];
  };
}

export const CheckoutSuccess: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const data = await fetchAPI(`/bookings/${bookingId}`);
        setBooking(data);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message || 'Failed to fetch booking details.');
      } finally {
        setLoading(false);
      }
    };
    loadBooking();
  }, [bookingId]);

  const handleCopyId = () => {
    if (booking) {
      navigator.clipboard.writeText(`#GRX-${booking._id.substring(booking._id.length - 6).toUpperCase()}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • 09:00 AM`;
  };

  const calculatePricing = () => {
    if (!booking) return { baseRate: 0, tax: 0, total: 0, passesFee: 0 };
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const baseRate = days * (booking.atvId.ratePerDay || 0);
    const passesFee = 45;
    const tax = Math.round((baseRate + passesFee) * 0.1 * 100) / 100;
    const total = baseRate + passesFee + tax;
    return { baseRate, passesFee, tax, total };
  };

  const pricing = calculatePricing();

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0', color: 'white' }}>{t("Finalizing...")}</div>;
  if (errorMsg && !booking) return <div style={{ padding: '100px 0', textAlign: 'center', color: 'white' }}>{errorMsg}</div>;
  if (!booking) return null;

  const shortId = `#GRX-${booking._id.substring(booking._id.length - 6).toUpperCase()}`;

  return (
    <div style={{
      backgroundColor: 'transparent',
      width: '100%',
      minHeight: '600px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* Header section */}
      <div className="checkout-header-padding" style={{ padding: '48px 40px 32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#bef264',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '24px',
          boxShadow: '0 4px 14px rgba(190, 242, 100, 0.5)'
        }}>
          <CheckCircle2 size={40} style={{ color: '#4d7c0f' }} />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#4d7c0f', marginBottom: '12px' }}>{t("Adventure Secured!")}</h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          {t("Your reservation has been received. Payment will be collected when you arrive.")}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="checkout-main-padding" style={{ padding: '0 40px 40px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Booking Reference Bar */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              {t("Booking Reference")}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {shortId}
            </div>
          </div>
          <button 
            onClick={handleCopyId}
            style={{
              backgroundColor: copied ? '#bbf7d0' : '#dcfce7',
              color: '#166534',
              border: 'none',
              borderRadius: '24px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? t('Copied!') : t('Copy ID')}
          </button>
        </div>

        {/* Summary Split */}
        {/* Content Split */}
        <div className="checkout-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Summary + Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Reservation Summary */}
            <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#4d7c0f', marginBottom: '24px' }}>{t("Reservation Summary")}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{t("Experience")}</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatAtvName(booking.atvId)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{t("Vehicle")}</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{booking.atvId.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{t("Date & Time")}</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatDateTime(booking.startDate)}</span>
              </div>
              
              <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '8px 0' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>{t("Total Due on Arrival")}</span>
                <span style={{ color: '#4d7c0f', fontWeight: 800, fontSize: '18px' }}>${pricing.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{
                backgroundColor: '#4d7c0f',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.2s',
                width: '100%'
              }}>
              <Grid size={18} /> {t("View Dashboard")} &rarr;
            </button>
            
            <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button 
                onClick={() => navigate('/dashboard?tab=contracts')}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s',
                  width: '100%'
                }}>
                <FileText size={20} style={{ color: '#4d7c0f' }} />
                {t("View Contract")}
              </button>

              <button 
                onClick={() => navigate('/dashboard?tab=receipts')}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s',
                  width: '100%'
                }}>
                <FileText size={20} style={{ color: '#4d7c0f' }} />
                {t("View Receipt")}
              </button>
            </div>
          </div>
        </div>

        {/* Meeting Point */}
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ flex: 1, position: 'relative', minHeight: '160px' }}>
              <img src={booking.atvId.images?.[0] || "/images/vasile-valcan-1HqixV1agUw-unsplash.jpg"} alt="Trailhead" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)' }}></div>
              <div style={{ position: 'absolute', bottom: '16px', left: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
                <MapPin size={18} /> {t("North Ridge Trailhead")}
              </div>
            </div>
            <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'white' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{t("Meeting Point")}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{t("Base Camp Zulu")}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{t("Arrival required 30m prior")}</div>
            </div>
          </div>

        </div>

        {/* Bottom Info Alert */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginTop: '8px'
        }}>
          <Info size={20} style={{ color: '#166534', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.6' }}>
            {t("A confirmation email has been sent to your registered address. Please ensure you have your digital contract ready on your mobile device when arriving at the base camp.")}
          </div>
        </div>

      </div>
    </div>
  );
};
