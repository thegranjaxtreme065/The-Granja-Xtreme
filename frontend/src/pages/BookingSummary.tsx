import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStickyState } from '../hooks/useStickyState';
import { User as UserIcon, AlertTriangle, Wallet, ShieldCheck, Lock, Shield } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { useTranslation } from 'react-i18next';
import { formatAtvName } from '../utils/formatAtv';

const COUNTRY_CODES = [
  "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CN", "CO", "KM", "CD", "CG", "CR", "HR", "CU", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FJ", "FI", "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY", "HT", "HN", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT", "JM", "JP", "JO", "KZ", "KE", "KI", "KP", "KR", "XK", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "QA", "RO", "RU", "RW", "KN", "LC", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM", "TV", "UG", "UA", "AE", "GB", "US", "UY", "UZ", "VU", "VA", "VE", "VN", "YE", "ZM", "ZW"
];

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

export const BookingSummary: React.FC<{ user?: any }> = ({ user }) => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const translatedCountries = React.useMemo(() => {
    try {
      const displayNames = new Intl.DisplayNames([i18n.language || 'en'], { type: 'region' });
      return COUNTRY_CODES.map(code => displayNames.of(code) || code)
        .sort((a, b) => a.localeCompare(b));
    } catch (e) {
      // Fallback if Intl is not available or fails
      return COUNTRY_CODES;
    }
  }, [i18n.language]);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('Free cancellation 48 hours prior.');

  // Form State
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [country, setCountry] = useStickyState('', 'booking_country');
  const [passport, setPassport] = useStickyState(user?.passport || '', 'booking_passport');
  const [paymentMethod, setPaymentMethod] = useStickyState('Cash', 'booking_paymentMethod');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const paymentMethods = [
    'Cash',
    'Zelle',
    'PayPal',
    'Apple Pay',
    'Google Pay',
    'International Card',
    'Banco Popular',
    'Banreservas'
  ];

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const [bookingData, settingsData] = await Promise.all([
          fetchAPI(`/bookings/${bookingId}`),
          fetchAPI('/settings').catch(() => null)
        ]);
        setBooking(bookingData);
        if (settingsData?.cancellationPolicy) {
          setCancellationPolicy(settingsData.cancellationPolicy);
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

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('booking_firstName', firstName);
    localStorage.setItem('booking_lastName', lastName);
    localStorage.setItem('booking_email', email);
    localStorage.setItem('booking_phone', phone);
    localStorage.setItem('booking_passport', JSON.stringify(passport));
    navigate(`/checkout-confirm/${bookingId}?method=${paymentMethod}`);
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatDateDayOnly = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
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

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0', color: 'white' }}>{t("Loading checkout...")}</div>;
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


      {/* Progress Stepper */}
      <div className="checkout-stepper checkout-header-padding" style={{ padding: '32px 24px 16px 24px', fontSize: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#a3e635', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>1</div>
          <span className="checkout-stepper-text">{t("Select ATV")}</span>
        </div>
        <div style={{ width: '40px', height: '1px', backgroundColor: '#e5e7eb' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#a3e635', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>2</div>
          <span className="checkout-stepper-text">{t("Dates")}</span>
        </div>
        <div style={{ width: '40px', height: '1px', backgroundColor: '#e5e7eb' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4d7c0f', fontWeight: 600 }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#4d7c0f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>3</div>
          <span className="checkout-stepper-text">{t("Details")}</span>
        </div>
        <div style={{ width: '40px', height: '1px', backgroundColor: '#e5e7eb' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d1d5db' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>4</div>
          <span className="checkout-stepper-text">{t("Payment")}</span>
        </div>
        <div style={{ width: '40px', height: '1px', backgroundColor: '#e5e7eb' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d1d5db' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>5</div>
          <span className="checkout-stepper-text">{t("Finish")}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="checkout-main-layout checkout-main-padding" style={{ display: 'flex', padding: '24px 24px', gap: '48px', flex: 1 }}>
        
        {/* Left Form Area */}
        <form onSubmit={handleNextStep} style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Customer Details Box */}
          <div style={{
            border: '1px solid #f3f4f6',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserIcon size={20} style={{ color: '#65a30d' }} /> {t("Customer Details")}
            </h2>
            
            <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{t("First Name")}</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{t("Last Name")}</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }} />
              </div>
            </div>
            
            <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{t("Email Address")}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: '#6b7280', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{t("Passport / ID Number")}</label>
                <input type="text" value={passport} onChange={e => setPassport(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: '#6b7280', outline: 'none' }} />
              </div>
            </div>

            <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{t("Phone Number")}</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: '#6b7280', outline: 'none' }} />
              </div>
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{t("Country of Residence")}</label>
                <input 
                  type="text" 
                  value={country} 
                  onChange={e => {
                    setCountry(e.target.value);
                    setShowCountryDropdown(true);
                  }}
                  onFocus={() => setShowCountryDropdown(true)}
                  required 
                  autoComplete="new-password" // Prevents browser autofill from overlapping
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: '#6b7280', outline: 'none' }} 
                />
                {showCountryDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginTop: '4px',
                    zIndex: 50,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    {translatedCountries.filter(c => c.toLowerCase().includes(country.toLowerCase())).map(c => (
                      <div 
                        key={c}
                        onClick={() => {
                          setCountry(c);
                          setShowCountryDropdown(false);
                        }}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#374151',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {c}
                      </div>
                    ))}
                    {translatedCountries.filter(c => c.toLowerCase().includes(country.toLowerCase())).length === 0 && (
                      <div style={{ padding: '10px 16px', fontSize: '14px', color: '#9ca3af' }}>{t("No matches found")}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Payment Method Box */}
          <div style={{
            border: '1px solid #f3f4f6',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={20} style={{ color: '#65a30d' }} /> {t("Payment Preference")}
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              {t("We collect payment on arrival. Please select how you prefer to pay when you arrive at the trailhead.")}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {paymentMethods.map((method) => (
                <div
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  style={{
                    border: `2px solid ${paymentMethod === method ? '#4d7c0f' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    backgroundColor: paymentMethod === method ? '#f7fee7' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: `2px solid ${paymentMethod === method ? '#4d7c0f' : '#cbd5e1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {paymentMethod === method && <div style={{ width: '10px', height: '10px', backgroundColor: '#4d7c0f', borderRadius: '50%' }}></div>}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: paymentMethod === method ? 700 : 500, color: paymentMethod === method ? '#111827' : '#4b5563' }}>
                    {t(method)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px' }}>
            <Link to={`/atv/${booking.atvId._id}`} style={{ color: '#4b5563', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span dangerouslySetInnerHTML={{ __html: t('&larr; Back to Dates') }} />
            </Link>
            <button type="submit" style={{
              backgroundColor: '#4d7c0f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 28px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span dangerouslySetInnerHTML={{ __html: t('Confirm Details &rarr;') }} />
            </button>
          </div>

        </form>

        {/* Right Floating Summary Card */}
        <div style={{ flex: '0.8' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            position: 'sticky',
            top: '24px'
          }}>
            <div style={{ position: 'relative', height: '200px' }}>
              <img src={booking.atvId.images?.[0] || "/images/vasile-valcan-1HqixV1agUw-unsplash.jpg"} alt="ATV" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}></div>
              <div style={{ position: 'absolute', bottom: '20px', left: '24px', color: 'white' }}>
                <span style={{ backgroundColor: '#fef08a', color: '#854d0e', fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>{t("BEST SELLER")}</span>
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{formatAtvName(booking.atvId)}</h3>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
                <span style={{ color: '#6b7280' }}>{t("Experience Date")}</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{formatDateShort(booking.startDate)} - {formatDateShort(booking.endDate)}</span>
              </div>


              <div style={{ height: '1px', backgroundColor: '#f3f4f6', marginBottom: '24px' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                <span style={{ color: '#6b7280' }}>{t("Base Rental")}</span>
                <span style={{ color: '#111827', fontWeight: 500 }}>${pricing.baseRate.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                <span style={{ color: '#6b7280' }}>{t("Premium Insurance / Pass")}</span>
                <span style={{ color: '#111827', fontWeight: 500 }}>${pricing.passesFee.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '13px' }}>
                <span style={{ color: '#6b7280' }}>{t("Booking Fees & Taxes")}</span>
                <span style={{ color: '#111827', fontWeight: 500 }}>${pricing.tax.toFixed(2)}</span>
              </div>

              <div style={{
                backgroundColor: '#f7fee7',
                border: '1px solid #ecfccb',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#3f6212' }}>{t("Total")}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#3f6212' }}>${pricing.total.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: '#a3e635', fontWeight: 700, marginTop: '2px' }}>{t("INCLUDES ALL LOCAL TAXES")}</div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                fontSize: '12px',
                color: '#334155',
                lineHeight: '1.4'
              }}>
                <ShieldCheck size={16} style={{ color: '#0f766e', flexShrink: 0, marginTop: '2px' }} />
                <span><strong>{t("Cancellation Policy:")}</strong> {t(cancellationPolicy)}</span>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '32px', color: '#9ca3af' }}>
            <Lock size={18} />
            <Shield size={18} />
            <ShieldCheck size={18} />
          </div>
        </div>

      </div>
    </div>
  );
};
