import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatAtvName } from '../utils/formatAtv';
import { useTranslation } from 'react-i18next';
import { 
  ShieldAlert, 
  CheckCircle, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  ArrowRight, 
  Award,
  Sparkles,
  X,
  MapPin,
  Settings,
  Gauge,
  Activity,
  Info,
  Clock,
  Shield,
  ThumbsUp,
  Calendar,
  Users,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Heart,
  Share2,
  AlertTriangle,
  Eye,
  Flame,
  FileText
} from 'lucide-react';
import { SkeletonText, SkeletonCard } from '../components/Skeletons';
import { fetchAPI } from '../utils/api';
import { useStickyState } from '../hooks/useStickyState';

interface ATV {
  _id: string;
  name: string;
  nameEs?: string;
  model: string;
  year: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'DECOMMISSIONED';
  ratePerDay: number;
  hourlyRate: number;
  description: string;
  descriptionEs?: string;
  specs: {
    displacement: string;
    fuelCapacity: string;
    weightLimit: string;
  };
  images: string[];
}

interface User {
  firstName: string;
  email: string;
}

interface VehicleDetailsProps {
  user: User | null;
}



// Fallback images matching the design specs from Stitch
const GALLERY_FALLBACKS = [
  '/images/vasile-valcan-1HqixV1agUw-unsplash.jpg', // Big ATV
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800&auto=format&fit=crop', // Engine close up
  'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop', // Water splash
  'https://images.unsplash.com/photo-1470246973918-29a93221c455?q=80&w=800&auto=format&fit=crop', // Staging clearings
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop'  // POV handlebars
];

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [atv, setAtv] = useState<ATV | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useStickyState<string>('', 'booking_start');
  const [endDate, setEndDate] = useStickyState<string>('', 'booking_end');
  const [experienceLevel, setExperienceLevel] = useStickyState<string>('Intermediate / Advanced', 'booking_exp');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [bookingError, setBookingError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [bookedDates, setBookedDates] = useState<{startDate: string, endDate: string}[]>([]);
  

  
  // Custom states
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [relatedAtvs, setRelatedAtvs] = useState<ATV[]>([]);
  

  
  // Mock Data for Redesign
  const driveType = "4WD / AWD";
  const transmission = "Automatic CVT";
  const location = "Majagual, Samaná";
  const tagline = "Conquer any terrain with premium performance and ultimate reliability.";

  // Load main data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg('');
      setAvailable(null);
      try {
        // Fetch current ATV details
        const currentAtv = await fetchAPI(`/atvs/${id}`);
        setAtv(currentAtv);
        
        // Fetch booked dates for this ATV
        const booked = await fetchAPI(`/atvs/${id}/booked-dates`);
        if (Array.isArray(booked)) {
          setBookedDates(booked);
        }
        
        // Fetch related ATVs
        const allAtvs = await fetchAPI('/atvs');
        if (Array.isArray(allAtvs)) {
          const filtered = allAtvs.filter((item: ATV) => item._id !== id && item.status === 'AVAILABLE').slice(0, 3);
          setRelatedAtvs(filtered);
        }
      } catch (e) {
        console.error(e);
        setErrorMsg('Failed to load vehicle details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Check availability when date fields change
  useEffect(() => {
    if (!startDate || !endDate) {
      setAvailable(null);
      return;
    }
    const checkAvailability = async () => {
      setChecking(true);
      setAvailable(null);
      setErrorMsg('');
      try {
        const result = await fetchAPI(`/atvs/${id}/availability?start=${startDate}&end=${endDate}`);
        setAvailable(result.available);
        if (!result.available) {
          setErrorMsg(result.reason || 'This ATV is booked during these dates.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to check availability.');
      } finally {
        setChecking(false);
      }
    };
    
    // Simple debounce/check when both are valid
    if (new Date(startDate) <= new Date(endDate)) {
      checkAvailability();
    } else if (startDate && endDate) {
      setErrorMsg('Start date must be before end date.');
    }
  }, [startDate, endDate, id]);

  // Generate array of disabled dates from booked ranges
  const getDisabledDates = () => {
    const dates: Date[] = [];
    bookedDates.forEach(booking => {
      const current = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      // Ensure we start at beginning of day
      current.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  };
  
  const disabledDates = getDisabledDates();

  const handleBooking = async () => {
    if (!user) {
      navigate(`/login?redirect=/atv/${id}`);
      return;
    }

    if (!available) return;

    setSubmitting(true);
    setBookingError('');

    try {
      const res = await fetchAPI('/bookings', {
        method: 'POST',
        body: { atvId: id, startDate, endDate, notes: `Experience level: ${experienceLevel}` }
      });
      navigate(`/checkout/${res._id}`);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to initiate booking.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pricing helper
  const calculatePricing = () => {
    if (!atv || !startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const baseRate = days * atv.ratePerDay;
    const passesFee = 45.00; // Trail pass
    const tax = Math.round((baseRate + passesFee) * 0.1 * 100) / 100;
    const securityDeposit = 150.00;
    const total = baseRate + passesFee + tax;
    return { days, baseRate, passesFee, tax, securityDeposit, total };
  };

  const pricing = calculatePricing();



  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '120px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <SkeletonText height="500px" style={{ borderRadius: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
          <div>
            <SkeletonText width="80%" height="40px" style={{ marginBottom: '16px' }} />
            <SkeletonText width="40%" height="24px" style={{ marginBottom: '32px' }} />
            <SkeletonText width="100%" height="100px" />
          </div>
          <div>
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (!atv) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '120px 0' }}>
        <div className="display-md" style={{ color: 'var(--error)', marginBottom: '16px' }}>{t("Vehicle Specifications Not Found")}</div>
        <p style={{ color: 'var(--on-surface-variant)' }}>{t("The requested quad is not in our registry.")} <Link to="/fleet" style={{ color: 'var(--secondary)', fontWeight: 600 }}>{t("Browse our fleet")}</Link>.</p>
      </div>
    );
  }

  // Gallery images preparation
  const imagesToShow = atv.images ? atv.images.filter(img => img && img.trim() !== '') : [];
  while (imagesToShow.length < 5) {
    imagesToShow.push(GALLERY_FALLBACKS[imagesToShow.length]);
  }

  return (
    <div className="section-spacing" style={{ paddingTop: '16px' }}>
      <div className="container">
        
        {/* Gallery Section */}
        <section className="vehicle-gallery">
          
          {/* Main Large Photo */}
          <div className="vehicle-gallery-main">
            <img 
              src={imagesToShow[activeImgIndex]} 
              alt={atv.name} 
              onClick={() => setLightboxOpen(true)}
              onError={(e) => {
                e.currentTarget.src = GALLERY_FALLBACKS[0];
              }}
              style={{ cursor: 'pointer' }}
            />
            {/* Carousel Controls */}
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : imagesToShow.length - 1)); }}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255,255,255,0.8)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                color: 'var(--on-background)'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveImgIndex((prev) => (prev < imagesToShow.length - 1 ? prev + 1 : 0)); }}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255,255,255,0.8)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                color: 'var(--on-background)'
              }}
            >
              <ChevronRight size={20} />
            </button>

          </div>

          {/* Side Thumbnails */}
          <div className="vehicle-gallery-thumbs">
            {imagesToShow.slice(1, 5).map((img, index) => {
              const actualIdx = index + 1;
              const isLast = index === 3;
              const extraPhotos = imagesToShow.length - 5;
              
              return (
                <div 
                  key={actualIdx}
                  onClick={() => setActiveImgIndex(actualIdx)}
                  className={`vehicle-gallery-thumb${activeImgIndex === actualIdx ? ' active' : ''}`}
                >
                  <img 
                    src={img} 
                    alt={`${atv.name} thumbnail`} 
                    onError={(e) => {
                      e.currentTarget.src = GALLERY_FALLBACKS[actualIdx] || GALLERY_FALLBACKS[0];
                    }}
                  />
                  {isLast && extraPhotos > 0 && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '14px'
                    }}>
                      +{extraPhotos} {t("Photos")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Main Content & Sidebar Layout */}
        <div className="vehicle-layout-container">
          
          {/* Left Details Column */}
          <div className="vehicle-layout-main">
            
            {/* Title & Badge */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span className="badge" style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--secondary)', border: '1px solid var(--border)' }}>
                  {atv.ratePerDay > 100 ? t('Premium Elite') : t('Adventure Standard')}
                </span>
                <span className="badge" style={{ backgroundColor: atv.status === 'AVAILABLE' ? 'rgba(167, 201, 87, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: atv.status === 'AVAILABLE' ? 'var(--primary-dark)' : '#ef4444', border: atv.status === 'AVAILABLE' ? '1px solid var(--primary)' : '1px solid #ef4444' }}>
                  {atv.status === 'AVAILABLE' ? t('Available Now') : t(atv.status, atv.status)}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--on-surface-variant)', gap: '4px', marginLeft: 'auto' }}>
                  <MapPin size={16} />
                  <span className="body-md">{location}</span>
                </div>
              </div>
              <h1 className="display-xl" style={{ marginBottom: '8px', color: 'var(--on-background)' }}>
                {formatAtvName({...atv, name: i18n.language?.startsWith('es') ? (atv.nameEs || atv.name) : atv.name, model: undefined})}
              </h1>
              <p className="body-lg" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px', fontWeight: 500 }}>{t(tagline)}</p>
              
              <p className="body-md" style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                {i18n.language?.startsWith('es') ? (atv.descriptionEs || t(atv.description, atv.description)) : atv.description}
              </p>
            </div>

            {/* Specifications Cards Grid (6 Cards) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px'
            }}>
              {[
                { icon: Sparkles, label: 'Engine Size', value: atv.specs.displacement },
                { icon: Sliders, label: 'Fuel Capacity', value: atv.specs.fuelCapacity },
                { icon: Award, label: 'Weight Limit', value: atv.specs.weightLimit },
                { icon: Settings, label: 'Drive Type', value: driveType },
                { icon: Gauge, label: 'Transmission', value: transmission },
                { icon: Activity, label: 'Experience Level', value: experienceLevel },
              ].map((spec, idx) => (
                <div key={idx} style={{
                  padding: '20px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center' }}>
                    <spec.icon size={24} />
                  </div>
                  <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>{t(spec.label)}</span>
                  <div className="display-md" style={{ fontSize: '16px', color: 'var(--on-surface)' }}>{t(spec.value)}</div>
                </div>
              ))}
            </div>



            {/* The Experience */}
            <div>
              <h3 className="display-md" style={{ marginBottom: '16px' }}>{t("The Experience")}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--on-surface-variant)' }} className="body-md">
                <p>
                  {t("Dominate the landscape of The Granja Xtreme with a machine built for champions. The")} {atv.name} {t("combines a high-torque performance engine with a lightweight chassis, offering trail maneuverability that defies its size. Whether you're navigating tight technical forest sections or opening up the throttle on wide open flats, this vehicle provides a visceral, stable connection to the terrain.")}
                </p>
                <p>
                  {t("Our entire fleet is maintained to the highest safety and reliability standards, ensuring that while your off-road ride is extreme, your safety and the machine's mechanical performance are never in question.")}
                </p>
              </div>
            </div>

            {/* Features Highlights */}
            <div style={{ padding: '32px 0', borderTop: '1px solid var(--border-light)' }}>
              <h3 className="display-md" style={{ marginBottom: '24px' }}>{t("Key Features")}</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {[
                  { icon: Shield, text: 'Reinforced roll cage framework' },
                  { icon: MapPin, text: 'GPS enabled navigation unit' },
                  { icon: Settings, text: 'Electronic power steering (EPS)' },
                  { icon: Clock, text: 'Extended range fuel cell' },
                  { icon: Activity, text: 'Dynamic suspension tuning' },
                  { icon: ThumbsUp, text: 'Ergonomic racing seats' }
                ].map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <feature.icon size={20} style={{ color: 'var(--secondary)', flexShrink: 0, marginTop: '2px' }} />
                    <span className="body-md" style={{ color: 'var(--on-surface)' }}>{t(feature.text)}</span>
                  </div>
                ))}
              </div>
            </div>



            {/* Rental Rules & Check-out */}
            <div style={{ padding: '32px 0', borderTop: '1px solid var(--border-light)' }}>
              <h3 className="display-md" style={{ marginBottom: '24px' }}>{t("Rental Rules & Check-out requirements")}</h3>
              <div style={{
                padding: '24px',
                backgroundColor: 'rgba(57, 103, 89, 0.03)',
                borderRadius: '12px',
                borderLeft: '4px solid var(--secondary)',
                border: '1px solid var(--border-light)',
                borderLeftWidth: '5px'
              }}>
                <ul style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0
                }}>
                  {[
                    'Minimum age 18+ with valid identity card',
                    'Safety briefing mandatory before departure',
                    'Full safety gear provided (Helmet, Gloves)',
                    'Refundable security deposit required',
                    'Return with full fuel tank',
                    'No nighttime trail riding permitted'
                  ].map((rule, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                      <CheckCircle size={18} style={{ color: 'var(--secondary)', marginTop: '2px', flexShrink: 0 }} />
                      <span className="body-md" style={{ color: 'var(--on-surface)' }}>{t(rule)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Safety Information */}
            <div style={{ padding: '32px 0', borderTop: '1px solid var(--border-light)' }}>
              <h3 className="display-md" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={24} style={{ color: 'var(--secondary)' }} /> {t("Safety Information")}
              </h3>
              <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
                {t("Your safety is our absolute priority. Every vehicle undergoes a rigorous 40-point inspection prior to your reservation. Furthermore, all reservations include a complimentary guided briefing.")}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Info size={20} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                  <div>
                    <h5 className="display-sm" style={{ fontSize: '14px', marginBottom: '4px' }}>{t("Safety Briefing")}</h5>
                    <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>{t("A 15-minute operational and trail safety briefing is required for all riders, regardless of experience.")}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Info size={20} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                  <div>
                    <h5 className="display-sm" style={{ fontSize: '14px', marginBottom: '4px' }}>{t("Gear Provision")}</h5>
                    <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>{t("DOT-approved helmets and protective eyewear are provided and mandatory while operating the vehicle.")}</p>
                  </div>
                </div>
              </div>
            </div>


          </div>

          {/* Right Sidebar Booking Widget */}
          <aside>
            <div className="card" style={{
              padding: '32px',
              position: 'sticky',
              top: '100px',
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border-light)'
            }}>
              
              {/* Price Tag */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '32px' }}>
                <div>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--on-background)', fontFamily: 'var(--font-headline)' }}>
                    ${atv.ratePerDay}
                  </span>
                  <span style={{ color: 'var(--on-surface-variant)', fontSize: '15px', marginLeft: '4px' }}>/ {t("day")}</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(57, 103, 89, 0.08)',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  color: 'var(--secondary)'
                }}>
                  <CheckCircle size={14} style={{ color: 'var(--secondary)' }} />
                  <span className="label-sm" style={{ fontSize: '11px', fontWeight: 700 }}>{t("Best Value")}</span>
                </div>
              </div>

              {/* Booking Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="label-sm" style={{ fontSize: '11px', color: 'var(--outline)', display: 'block', marginBottom: '8px' }}>
                      {t("CHECK-IN DATE")}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <DatePicker 
                        selected={startDate ? new Date(`${startDate}T12:00:00`) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const val = `${year}-${month}-${day}`;
                            setStartDate(val);
                            if (!endDate || val > endDate) {
                              setEndDate(val);
                            }
                            setBookingError('');
                          } else {
                            setStartDate('');
                          }
                        }}
                        minDate={new Date()}
                        excludeDates={disabledDates}
                        placeholderText={t("Select Check-In")}
                        dateFormat={i18n.language?.startsWith('es') ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                        className="focus:border-primary"
                        wrapperClassName="date-picker-wrapper"
                        withPortal={window.innerWidth < 768}
                        customInput={
                          <input 
                            style={{
                              width: '100%',
                              padding: '16px',
                              backgroundColor: 'var(--background)',
                              borderRadius: '12px',
                              border: '1px solid var(--border-light)',
                              outline: 'none',
                              fontSize: '14px',
                              color: 'var(--on-background)',
                              fontFamily: 'inherit',
                              cursor: 'pointer'
                            }}
                          />
                        }
                      />
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label className="label-sm" style={{ fontSize: '11px', color: 'var(--outline)', display: 'block', marginBottom: '8px' }}>
                      {t("CHECK-OUT DATE")}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <DatePicker 
                        selected={endDate ? new Date(`${endDate}T12:00:00`) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const val = `${year}-${month}-${day}`;
                            setEndDate(val);
                            setBookingError('');
                          } else {
                            setEndDate('');
                          }
                        }}
                        minDate={startDate ? new Date(`${startDate}T12:00:00`) : new Date()}
                        excludeDates={disabledDates}
                        placeholderText={t("Select Check-Out")}
                        dateFormat={i18n.language?.startsWith('es') ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                        className="focus:border-primary"
                        wrapperClassName="date-picker-wrapper"
                        withPortal={window.innerWidth < 768}
                        customInput={
                          <input 
                            style={{
                              width: '100%',
                              padding: '16px',
                              backgroundColor: 'var(--background)',
                              borderRadius: '12px',
                              border: '1px solid var(--border-light)',
                              outline: 'none',
                              fontSize: '14px',
                              color: 'var(--on-background)',
                              fontFamily: 'inherit',
                              cursor: 'pointer'
                            }}
                          />
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label-sm" style={{ fontSize: '11px', color: 'var(--outline)', display: 'block', marginBottom: '8px' }}>
                    {t("EXPERIENCE LEVEL")}
                  </label>
                  <select 
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: 'var(--background)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-light)',
                      outline: 'none',
                      fontSize: '14px',
                      color: 'var(--on-background)'
                    }}
                    className="focus:border-primary"
                  >
                    <option value="Beginner">{t("Beginner")}</option>
                    <option value="Intermediate / Advanced">{t("Intermediate / Advanced")}</option>
                    <option value="Expert">{t("Expert")}</option>
                  </select>
                </div>
              </div>

              {/* Trust Indicators */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-surface-variant)' }}>
                  <Shield size={16} />
                  <span className="body-md" style={{ fontSize: '13px' }}>{t("100% Secure Booking")}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-surface-variant)' }}>
                  <Clock size={16} />
                  <span className="body-md" style={{ fontSize: '13px' }}>{t("Free cancellation up to 48 hours")}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-surface-variant)' }}>
                  <Award size={16} />
                  <span className="body-md" style={{ fontSize: '13px' }}>{t("Licensed Professional Guides")}</span>
                </div>
              </div>

              {/* Status Alert if not Available */}
              {atv.status !== 'AVAILABLE' && (
                <div className="alert alert-error" style={{ fontSize: '13px', margin: '0' }}>
                  {t("This vehicle is currently unavailable (Status: ")} {atv.status}).
                </div>
              )}

              {/* Booking Error */}
              {bookingError && (
                <div className="alert alert-error" style={{ fontSize: '13px', marginTop: '16px', backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <ShieldAlert size={16} />
                  <span>{bookingError}</span>
                </div>
              )}


              {/* Booking Feedback & Pricing Summary */}
              {atv.status === 'AVAILABLE' && (
                <>
                  {checking && (
                    <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'var(--background)', borderRadius: '8px', color: 'var(--secondary)', fontSize: '13px', marginBottom: '20px' }}>
                      {t("Checking availability...")}
                    </div>
                  )}

                  {errorMsg && (
                    <div className="alert alert-error" style={{ fontSize: '13px', padding: '12px', marginBottom: '20px' }}>
                      {errorMsg}
                    </div>
                  )}

                  {available === true && pricing && (
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="alert alert-success" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        padding: '12px',
                        margin: 0
                      }}>
                        <CheckCircle size={16} /> {t("Quad is available for these dates!")}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--on-surface-variant)' }}>{t("Daily Rate")} (${atv.ratePerDay} x {pricing.days} {t("days")})</span>
                          <span>${pricing.baseRate.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--on-surface-variant)' }}>{t("Trail Access Pass")}</span>
                          <span>${pricing.passesFee.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--on-surface-variant)' }}>{t("Taxes & Fees (10%)")}</span>
                          <span>${pricing.tax.toFixed(2)}</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px' }}>
                          <span>{t("Total")}</span>
                          <span style={{ color: 'var(--secondary)' }}>${pricing.total.toFixed(2)}</span>
                        </div>
                      </div>
                      </div>
                  )}

                  {!startDate && !endDate && (
                    <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'var(--background)', borderRadius: '8px', color: 'var(--outline)', fontSize: '13px', marginBottom: '20px' }}>
                      {t("Please select rental dates on the calendar to see pricing breakdown.")}
                    </div>
                  )}

                  <button
                    onClick={handleBooking}
                    disabled={submitting || atv.status !== 'AVAILABLE' || !startDate || !endDate || available === false}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '18px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      letterSpacing: '0.02em',
                      boxShadow: '0 4px 12px rgba(77, 124, 15, 0.2)',
                      opacity: (submitting || atv.status !== 'AVAILABLE' || !startDate || !endDate || available === false) ? 0.5 : 1
                    }}
                  >
                    {submitting ? t('Initiating Secure Booking...') : t('Reserve This Vehicle')}
                  </button>
                  <p style={{ textAlign: 'center', color: 'var(--outline)', fontSize: '12px', margin: '16px 0 0 0' }}>
                    {t("You won't be charged yet")}
                  </p>
                </>
              )}

            </div>
          </aside>

        </div>

        {/* Related Vehicles Section */}
        {relatedAtvs.length > 0 && (
          <section style={{ marginTop: '96px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '40px' }}>
              <h3 className="display-lg">{t("Other Elite Vehicles")}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="vehicle-cal-nav" onClick={() => {
                  const track = document.getElementById('related-carousel-track');
                  if (track) track.scrollBy({ left: -300, behavior: 'smooth' });
                }}>
                  <ChevronLeft size={20} />
                </button>
                <button className="vehicle-cal-nav" onClick={() => {
                  const track = document.getElementById('related-carousel-track');
                  if (track) track.scrollBy({ left: 300, behavior: 'smooth' });
                }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            
            <div className="carousel-container">
              <div className="carousel-track" id="related-carousel-track">
                {relatedAtvs.map((item) => (
                  <div 
                    key={item._id} 
                    className="card card-hover carousel-slide" 
                    style={{
                      backgroundColor: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                  <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }} className="group">
                    <img 
                      src={item.images[0] || GALLERY_FALLBACKS[0]} 
                      alt={item.name} 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.5s ease'
                      }}
                      className="group-hover:scale-105"
                    />
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      backgroundColor: 'var(--surface-container-high)',
                      color: 'var(--on-surface)',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '13px',
                      border: '1px solid var(--border)'
                    }}>
                      ${item.ratePerDay}/day
                    </div>
                  </div>
                  
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    <h4 className="display-md" style={{ fontSize: '18px', color: 'var(--on-background)' }}>{item.name}</h4>
                    <p className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '14px', flex: 1 }}>
                      {item.description.length > 120 ? `${item.description.slice(0, 120)}...` : item.description}
                    </p>
                    <Link 
                      to={`/atv/${item._id}`} 
                      className="btn btn-secondary" 
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        marginTop: '12px'
                      }}
                    >
                      {t("View Details")} <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </section>
        )}

      </div>

      {/* Mobile Sticky Booking Bar */}
      <div className="mobile-sticky-booking">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--on-background)', fontFamily: 'var(--font-headline)' }}>
            ${atv.ratePerDay}
          </span>
          <span style={{ color: 'var(--on-surface-variant)', fontSize: '13px' }}>/ {t("day")}</span>
        </div>
        <button 
          onClick={() => {
            if (startDate && endDate && available) {
              handleBooking();
            } else {
              window.scrollTo({ top: (document.querySelector('.vehicle-layout-container') as HTMLElement)?.offsetTop || 0, behavior: 'smooth' });
            }
          }}
          disabled={submitting}
          className="btn btn-primary"
          style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '15px', opacity: submitting ? 0.5 : 1 }}
        >
          {submitting ? t('Initiating Secure Booking...') : (startDate && endDate && available ? t('Reserve This Vehicle') : t("Check Dates"))}
        </button>
      </div>

      {/* Lightbox Modal */}
      <div className={`lightbox-overlay ${lightboxOpen ? 'open' : ''}`}>
        <div className="lightbox-header">
          <div style={{ fontWeight: 600 }}>{activeImgIndex + 1} / {imagesToShow.length}</div>
          <button className="lightbox-btn" onClick={() => setLightboxOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <div className="lightbox-content">
          <button 
            className="lightbox-btn lightbox-nav prev"
            onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => prev === 0 ? imagesToShow.length - 1 : prev - 1); }}
          >
            <ChevronLeft size={32} />
          </button>
          
          <img 
            src={imagesToShow[activeImgIndex]} 
            alt="ATV full screen" 
            className="lightbox-img"
          />
          
          <button 
            className="lightbox-btn lightbox-nav next"
            onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => prev === imagesToShow.length - 1 ? 0 : prev + 1); }}
          >
            <ChevronRight size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};
