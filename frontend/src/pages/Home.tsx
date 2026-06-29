import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ArrowRight, Eye, Lock, Star, Compass, Mountain, Zap } from 'lucide-react';
import { SkeletonGrid } from '../components/Skeletons';
import { fetchAPI } from '../utils/api';

import { formatAtvName } from '../utils/formatAtv';

interface ATV {
  _id: string;
  name: string;
  model: string;
  ratePerDay: number;
  hourlyRate: number;
  specs: {
    displacement: string;
    fuelCapacity: string;
  };
  images: string[];
}

interface StatItem {
  value: string;
  label: string;
  showStars?: boolean;
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface TestimonialItem {
  quote: string;
  name: string;
  role: string;
  initials: string;
  stars: number;
}

interface GalleryItem {
  url: string;
  alt: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck size={36} />,
  Eye: <Eye size={36} />,
  Lock: <Lock size={36} />,
  Star: <Star size={36} />,
  Compass: <Compass size={36} />,
  Mountain: <Mountain size={36} />,
  Zap: <Zap size={36} />,
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [atvs, setAtvs] = useState<ATV[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for the search availability card


  const getAtvFallbackImage = (name: string, fallbackUrl: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('polaris') && lower.includes('scrambler')) return '/images/polaris_scrambler.png';
    if (lower.includes('polaris')) return '/images/polaris_570.png';
    if (lower.includes('grizzly') || lower.includes('yamaha')) return '/images/yamaha_grizzly.png';
    if (lower.includes('outlander') || lower.includes('can-am')) return '/images/canam_outlander.png';
    if (lower.includes('honda') || lower.includes('rubicon')) return '/images/honda_rubicon.png';
    if (lower.includes('kawasaki') || lower.includes('brute')) return '/images/kawasaki_brute.png';
    if (lower.includes('suzuki') || lower.includes('kingquad')) return '/images/suzuki_kingquad.png';
    return fallbackUrl || '/images/vasile-valcan-1HqixV1agUw-unsplash.jpg';
  };

  // CMS-driven state
  const [hero, setHero] = useState({
    title: 'Conquer the Wild in Absolute Luxury',
    subtitle: 'PREMIUM FOUR-WHEELER & ATV ADVENTURE RENTALS',
    description: 'Experience the raw energy of off-road adventure through private trails and premium machinery. Your elite outdoor escape starts here.'
  });

  const [stats, setStats] = useState<StatItem[]>([
    { value: '10k+', label: 'Adventures Hosted' },
    { value: '4.9', label: 'User Rating', showStars: true },
    { value: '45', label: 'Expert Guides' },
    { value: '150km', label: 'Private Trails' }
  ]);

  const [features, setFeatures] = useState<{ title: string; subtitle: string; items: FeatureItem[] }>({
    title: 'The Xtreme Standards',
    subtitle: "We don't just provide tours: we curate exclusive experiences that redefine off-road luxury.",
    items: [
      { icon: 'ShieldCheck', title: 'Premium Gear', description: 'Latest generation safety equipment and high-tech communication systems for every rider.' },
      { icon: 'Eye', title: 'Expert Guides', description: 'Certified pathfinders with deep knowledge of local ecology and technical off-road driving.' },
      { icon: 'Lock', title: 'Private Trails', description: 'Access to exclusive routes reserved only for our guests, ensuring a tranquil and wild journey.' }
    ]
  });

  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([
    { quote: "The private trail experience was unlike anything I've ever done. The equipment was pristine and the guide knew exactly how to push the excitement levels while keeping us safe. Truly premium.", name: 'Mickey Jensen', role: 'Adventure Enthusiast', initials: 'MJ', stars: 5 },
    { quote: "A perfect blend of luxury and adrenaline. The VIP forest escape felt exclusive and well-coordinated. Highly recommend for corporate retreats or high-end travelers.", name: 'Sarah Lopez', role: 'Executive Retreat Organizer', initials: 'SL', stars: 5 },
    { quote: "The Can-Am Mavericks are absolute beasts! Been to many off-road parks, but The Granja Xtreme's trails are technically challenging. The maintenance quality is top-notch.", name: 'Ryan Kim', role: 'Off-Road Racer', initials: 'RK', stars: 5 },
    { quote: "Absolutely phenomenal experience from start to finish. The ATVs were spotless, the staff was extremely professional, and the scenery was breathtaking.", name: 'Elena Rostova', role: 'Travel Blogger', initials: 'ER', stars: 5 }
  ]);

  const [gallery, setGallery] = useState<GalleryItem[]>([
    { url: '/images/kilyan-sockalingum-cxUgrQapYi4-unsplash.jpg', alt: 'Red ATVs on Trail' },
    { url: '/images/joe-neric-EGzkhZyFRX4-unsplash.jpg', alt: 'ATV Action in Dirt' },
    { url: '/images/joshua-hanson-zCRzigSZsRs-unsplash.jpg', alt: 'Forest Trail Riding' },
    { url: '/images/action_river.jpeg', alt: 'River Crossing' }
  ]);

  const avatarColors = [
    'rgba(167, 201, 87, 0.2)',
    'rgba(57, 103, 89, 0.2)',
    'rgba(212, 175, 55, 0.2)',
    'rgba(82, 113, 255, 0.2)'
  ];
  const avatarTextColors = ['var(--primary-dark)', 'var(--secondary)', '#8c6a08', '#2b44a8'];

  useEffect(() => {
    const loadData = async () => {
      try {
        const atvsData = await fetchAPI('/atvs');
        setAtvs(atvsData.slice(0, 4) || []);

        const heroData = await fetchAPI('/cms/homepage_hero');
        if (heroData?.value) setHero(heroData.value);

        const statsData = await fetchAPI('/cms/homepage_stats');
        if (statsData?.value?.items) setStats(statsData.value.items);

        const featData = await fetchAPI('/cms/homepage_features');
        if (featData?.value) setFeatures(featData.value);

        const testData = await fetchAPI('/cms/homepage_testimonials');
        if (testData?.value?.items) setTestimonials(testData.value.items);

        const galData = await fetchAPI('/cms/homepage_gallery');
        if (galData?.value?.items) setGallery(galData.value.items);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);



  return (
    <div style={{ backgroundColor: 'var(--background)' }}>
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(rgba(20, 27, 43, 0.55), rgba(20, 27, 43, 0.55)), url("/images/hero_home.jpeg") center/cover no-repeat',
        color: '#ffffff',
        textAlign: 'center',
        padding: '80px 24px'
      }}>
        <div style={{ width: '90%', maxWidth: '1200px', margin: '0 auto', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 className="display-xl" style={{
            marginBottom: '16px',
            color: '#ffffff',
            fontSize: '56px',
            fontWeight: 800,
            textShadow: '0 4px 12px rgba(20,27,43,0.35)',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-headline)'
          }}>
            {t('home_hero_title', hero.title)}
          </h1>
          <p style={{
            fontSize: '18px',
            lineHeight: '28px',
            color: '#f3f4f6',
            maxWidth: '800px',
            margin: '0 auto 40px auto',
            textShadow: '0 2px 6px rgba(20,27,43,0.3)',
            fontFamily: 'var(--font-body)'
          }}>
            {t('home_hero_description', hero.description)}
          </p>

          {/* Quick Action CTA */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={() => navigate('/fleet')}
              className="btn btn-primary" 
              style={{ padding: '16px 40px', borderRadius: 'var(--radius-sm)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
              {t('home_explore_fleet', 'Explore Our Fleet')}
            </button>
            <button 
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ 
                padding: '16px 40px', 
                borderRadius: 'var(--radius-sm)', 
                fontSize: '16px', 
                fontWeight: 600,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {t('home_learn_more', 'Learn More')}
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar — CMS Driven */}
      <section style={{
        backgroundColor: '#f1f3ff',
        padding: '50px 24px',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '32px',
          textAlign: 'center'
        }}>
          {stats.map((stat, i) => (
            <div key={i}>
              <h2 className="display-xl" style={{ color: 'var(--on-surface)', margin: 0, fontSize: '36px' }}>{stat.value}</h2>
              <p className="label-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px', fontSize: '12px' }}>
                {stat.showStars && <span style={{ color: 'var(--accent)' }}>★★★★★ </span>}
                {t(stat.label, stat.label)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Our Fleet Section */}
      <section className="section-spacing" style={{ backgroundColor: 'var(--background)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="label-sm" style={{ color: 'var(--secondary)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>{t('home_our_fleet_label', 'Our Fleet')}</span>
              <h2 className="display-lg" style={{ color: 'var(--on-surface)' }}>{t('home_engineered_dominance', 'Engineered for Dominance')}</h2>
              <p style={{ color: 'var(--on-surface-variant)', marginTop: '4px', fontSize: '14px' }}>
                {t('home_fleet_desc', 'Choose from our selection of high-performance vehicles, meticulously maintained for safety and luxury.')}
              </p>
            </div>
            <Link to="/fleet" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--secondary)', fontSize: '14px' }}>
              {t('home_view_fleet', 'View Full Fleet')} <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '0 5%' }}><SkeletonGrid count={3} /></div>
          ) : atvs.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '20px' }}>{t('home_no_atvs', 'No ATVs currently configured in the database.')}</p>
              <Link to="/fleet" className="btn btn-primary">{t('home_go_to_fleet', 'Go to Fleet Page')}</Link>
            </div>
          ) : (
            <div className="grid-3">
              {atvs.map((atv, index) => {
                const badges = ['Most Popular', 'Most Booked', 'VIP Experience', 'Top Rated'];
                const cardBadge = badges[index % 4];

                return (
                  <div className="card card-hover" key={atv._id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ height: '220px', overflow: 'hidden', position: 'relative', backgroundColor: 'var(--surface-container)' }}>
                      <img src={getAtvFallbackImage(atv.name, atv.images[0])} alt={atv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div className="badge badge-premium" style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'var(--accent)', color: 'var(--on-accent)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                        {cardBadge}
                      </div>
                    </div>
                    
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{formatAtvName({...atv, model: undefined})}</h3>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)' }}>${atv.ratePerDay}/Day</span>
                      </div>
                      
                      <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginBottom: '20px' }}>{atv.model}</p>
                      
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <strong>{t('home_capacity', 'Capacity:')}</strong> {atv.specs.displacement || '570cc'}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <strong>{t('home_fuel_type', 'Fuel Type:')}</strong> Gas ({atv.specs.fuelCapacity || '5.4 Gal'})
                        </span>
                      </div>

                      <div style={{ marginTop: 'auto' }}>
                        <Link to={`/atv/${atv._id}`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', fontSize: '13px', padding: '10px' }}>
                          {t('home_select_vehicle', 'Select Vehicle')}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* The Xtreme Standards — CMS Driven */}
      <section className="section-spacing" style={{ backgroundColor: '#141b2b', color: '#ffffff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 className="display-lg" style={{ color: '#ffffff', marginBottom: '16px' }}>{features.title}</h2>
            <p style={{ color: '#9ca3af', maxWidth: '600px', margin: '0 auto', fontSize: '14px', lineHeight: '22px' }}>
              {features.subtitle}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
            {features.items.map((feat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', color: 'var(--primary)', marginBottom: '20px' }}>
                  {ICON_MAP[feat.icon] || <ShieldCheck size={36} />}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#ffffff' }}>{t(feat.title, feat.title)}</h3>
                <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '22px' }}>{t(feat.description, feat.description)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — CMS Driven */}
      <section className="section-spacing" style={{ backgroundColor: '#f3f4f6' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 className="display-lg" style={{ color: 'var(--on-surface)' }}>{t('home_unforgettable_stories', 'Unforgettable Stories')}</h2>
          </div>

          <div className="grid-3">
            {testimonials.map((t_item, i) => (
              <div className="card" key={i} style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: 'var(--accent)', marginBottom: '16px' }}>
                    {'★'.repeat(t_item.stars)}{'☆'.repeat(5 - t_item.stars)}
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: '22px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                    "{t(t_item.quote, t_item.quote)}"
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: 'var(--radius-full)',
                    backgroundColor: avatarColors[i % avatarColors.length],
                    color: avatarTextColors[i % avatarTextColors.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '14px'
                  }}>
                    {t_item.initials}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{t(t_item.name, t_item.name)}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{t(t_item.role, t_item.role)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery — CMS Driven */}
      <section className="section-spacing" style={{ backgroundColor: 'var(--background)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="display-lg" style={{ color: 'var(--on-surface)' }}>{t('home_capture_thrill', 'Capture the Thrill')}</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '16px',
            height: '500px',
            overflow: 'hidden'
          }} className="gallery-layout-grid">
            
            {/* Left Large Column */}
            {gallery[0] && (
              <div style={{ height: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
                <img src={gallery[0].url} alt={gallery[0].alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {/* Center Stacked Column */}
            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '16px', height: '100%' }}>
              {gallery[1] && (
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <img src={gallery[1].url} alt={gallery[1].alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              {gallery[2] && (
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <img src={gallery[2].url} alt={gallery[2].alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {/* Right Tall Column */}
            {gallery[3] && (
              <div style={{ height: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <img src={gallery[3].url} alt={gallery[3].alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 900px) {
          .gallery-layout-grid {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
          .gallery-layout-grid > div {
            height: 300px !important;
          }
        }
      `}</style>
    </div>
  );
};
