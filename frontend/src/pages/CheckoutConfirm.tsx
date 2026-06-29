import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Edit3, Clock, Users, Calendar, Info, Lock, Shield, CheckSquare, Square } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { formatAtvName } from '../utils/formatAtv';
import { SignatureModal } from '../components/SignatureModal';
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

export const CheckoutConfirm: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preferredMethod = queryParams.get('method') || 'Cash';

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passport] = useState(() => {
    const saved = localStorage.getItem('booking_passport');
    if (!saved) return '';
    try {
      return JSON.parse(saved);
    } catch {
      return saved; // Fallback in case it wasn't stringified
    }
  });

  const [showSignatureModal, setShowSignatureModal] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const data = await fetchAPI(`/bookings/${bookingId}`);
        setBooking(data);
        if (data.status === 'Pending Signature') {
          setAgreedToTerms(true);
          setShowSignatureModal(true);
        }
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message || 'Failed to fetch booking details.');
      } finally {
        setLoading(false);
      }
    };
    loadBooking();
  }, [bookingId]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      // If already pending signature, just open the modal
      if (booking?.status === 'Pending Signature') {
        setShowSignatureModal(true);
        setConfirming(false);
        return;
      }

      const customerData = {
        firstName: localStorage.getItem('booking_firstName') || '',
        lastName: localStorage.getItem('booking_lastName') || '',
        email: localStorage.getItem('booking_email') || '',
        phone: localStorage.getItem('booking_phone') || ''
      };
      
      await fetchAPI(`/bookings/${bookingId}/waiver`, {
        method: 'POST',
        body: { 
          customerName: 'Arrival Customer', 
          agreedToTerms: true, 
          termsVersion: 'v1.0', 
          passport,
          ...customerData
        }
      });
      setShowSignatureModal(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Confirmation failed.');
    } finally {
      setConfirming(false);
    }
  };

  const handleSignatureComplete = async (url: string) => {
    try {
      await fetchAPI(`/bookings/${bookingId}/customer-signature`, {
        method: 'PUT',
        body: { signatureUrl: url }
      });
      setShowSignatureModal(false);
      navigate(`/checkout-success/${bookingId}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save signature.');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const durationDays = booking ? Math.max(1, Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24))) : 1;

  const calculatePricing = () => {
    if (!booking) return { baseRate: 0, tax: 0, total: 0, passesFee: 0 };
    const baseRate = durationDays * (booking.atvId.ratePerDay || 0);
    const passesFee = 45; // Just combining the 35 + 10 into 45 or keeping the breakdown
    const tax = Math.round((baseRate + passesFee) * 0.1 * 100) / 100;
    const total = baseRate + passesFee + tax;
    return { baseRate, passesFee, tax, total };
  };

  const pricing = calculatePricing();

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0', color: 'white' }}>{t("Loading summary...")}</div>;
  if (errorMsg && !booking) return <div style={{ padding: '100px 0', textAlign: 'center', color: 'white' }}>{errorMsg}</div>;
  if (!booking) return null;

  return (
    <div style={{
      backgroundColor: 'transparent',
      width: '100%',
      minHeight: '800px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* Header section */}
      <div className="checkout-header-padding" style={{ padding: '40px 24px 24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>
            <ShieldCheck size={16} /> {t("Secure Checkout")}
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px' }}>{t("Booking Summary")}</h1>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '600px', lineHeight: '1.6' }}>
            {t("Review your adventure details before finalizing the reservation. Our all-terrain experiences are designed for maximum thrill and safety.")}
          </p>
        </div>
        
        <button 
          onClick={() => navigate(`/checkout/${bookingId}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--primary)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            color: 'var(--on-primary)',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            whiteSpace: 'nowrap'
          }}>
          <Edit3 size={16} /> {t("Edit Booking")}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="checkout-main-layout checkout-main-padding" style={{ display: 'flex', padding: '0 24px 40px 24px', gap: '24px' }}>
        
        {/* Left Pane */}
        <div style={{ flex: '1.4', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* ATV Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div style={{ position: 'relative', width: '40%', minHeight: '220px' }}>
              <img src={booking.atvId.images?.[0] || "/images/vasile-valcan-1HqixV1agUw-unsplash.jpg"} alt="ATV" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: '#fef08a', color: '#854d0e', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '4px' }}>
                {t("PREMIUM SELECTION")}
              </div>
            </div>
            <div style={{ width: '60%', padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>{formatAtvName(booking.atvId)}</h2>
              <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6', marginBottom: '24px', flex: 1 }}>
                {t("The pinnacle of off-road engineering. Premium performance shocks, and intelligent Throttle Control (iTC). Model: ")}{booking.atvId.model}.
              </p>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: '#3b82f6' }} />
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t("Duration")}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{durationDays === 1 ? t("Full Day (8am - 6pm)") : `${durationDays} ${t("Days")}`}</div>
                  </div>
                </div>
                <div style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: '#3b82f6' }} />
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t("Capacity")}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{t("2 Persons")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reservation Details Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: '#65a30d' }} /> {t("Reservation Details")}
            </h3>

            <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>{t("Date")}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{formatDate(booking.startDate)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>{t("Location")}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{t("The North Ridge Basecamp")}</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <Info size={18} style={{ color: '#65a30d', marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{t("Essential Information")}</div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                  {t("Please arrive 30 minutes early for the safety briefing and gear fitting. Remember to bring a valid driver's license and wear closed-toe shoes.")}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Pane */}
        <div style={{ flex: '1', display: 'flex' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #ecfccb',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            padding: '32px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>{t("Payment Summary")}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', color: '#475569', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("Base Rate")} ({durationDays === 1 ? t("Full Day") : `${durationDays} ${t("Days")}`})</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>${pricing.baseRate.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("Equipment Insurance")}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>$35.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("Safety Gear Bundle")}</span>
                <span style={{ fontWeight: 700, color: '#65a30d' }}>{t("FREE")}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("Environmental Fee")}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>$10.00</span>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#e2e8f0', marginBottom: '24px' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', color: '#475569', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("Subtotal")}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>${(pricing.baseRate + 45.00).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t("Taxes (10%)")}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>${pricing.tax.toFixed(2)}</span>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>{t("Payment Method")}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{t(preferredMethod)} {t("(On Arrival)")}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', lineHeight: '1.4' }}>
                {t("Payment will be collected manually at the trailhead.")}
              </div>
            </div>

            <div style={{
              backgroundColor: '#f3e8ff', // Light purple
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e1b4b' }}>{t("Total Cost")}</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#4d7c0f' }}>${pricing.total.toFixed(2)}</span>
            </div>

            {errorMsg && <div style={{ color: 'red', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{errorMsg}</div>}

            {/* Waiver Agreement */}
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} /> {t("Liability Waiver Agreement")}
              </h4>
              <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.7', marginBottom: '16px', maxHeight: '120px', overflowY: 'auto', paddingRight: '8px' }}>
                {t("I hereby acknowledge that operating an All-Terrain Vehicle (ATV) is a high-risk activity. I agree to wear a helmet at all times, follow all safety instructions, and assume full financial responsibility for any damages caused to the vehicle. I release The Granja Xtreme from any liability for personal injuries sustained during the rental duration. Helmets are mandatory. Operation is prohibited under the influence of drugs or alcohol. All riders must strictly stay within authorized zones.")}
              </div>
              <div 
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer', 
                  padding: '12px', 
                  backgroundColor: agreedToTerms ? '#ecfdf5' : 'white', 
                  borderRadius: '8px', 
                  border: `2px solid ${agreedToTerms ? '#10b981' : '#d1d5db'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                {agreedToTerms 
                  ? <CheckSquare size={22} color="#10b981" />
                  : <Square size={22} color="#9ca3af" />
                }
                <span style={{ fontSize: '13px', fontWeight: 600, color: agreedToTerms ? '#065f46' : '#374151' }}>
                  {t("I have read and agree to the Liability Waiver, Terms of Service, and Cancellation Policy.")}
                </span>
              </div>
            </div>

            <button 
              onClick={handleConfirm}
              disabled={confirming || !agreedToTerms}
              style={{
                backgroundColor: agreedToTerms ? '#4d7c0f' : '#94a3b8',
                color: 'white',
                border: 'none',
                padding: '16px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                width: '100%',
                cursor: (confirming || !agreedToTerms) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (confirming || !agreedToTerms) ? 0.8 : 1
              }}
            >  {confirming ? t('Processing...') : t('Confirm Reservation')}
            </button>

            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', lineHeight: '1.5', marginBottom: '32px' }}>
              {t("Your waiver acceptance is digitally recorded and legally binding.")}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', color: '#94a3b8' }}>
              <Lock size={18} />
              <Shield size={18} />
            </div>

          </div>
        </div>

      </div>

      <SignatureModal 
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onComplete={handleSignatureComplete}
        title={t("Complete Your Reservation")}
        subtitle={t("Please provide your digital signature below to finalize your booking contract.")}
      />
    </div>
  );
};
