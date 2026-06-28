import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Heart, ChevronDown, SlidersHorizontal, Calendar, Settings2 } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { SkeletonGrid } from '../components/Skeletons';

interface ATV {
  _id: string;
  name: string;
  model: string;
  year: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'DECOMMISSIONED';
  ratePerDay: number;
  hourlyRate: number;
  specs: {
    displacement: string;
    fuelCapacity: string;
    weightLimit: string;
  };
  images: string[];
  category?: {
    _id: string;
    name: string;
    nameEs?: string;
  };
}

const getAtvFallbackImage = (name: string, fallbackUrl: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('polaris') && lower.includes('scrambler')) return '/images/polaris_scrambler.png';
  if (lower.includes('polaris')) return '/images/polaris_570.png';
  if (lower.includes('grizzly') || lower.includes('yamaha')) return '/images/yamaha_grizzly.png';
  if (lower.includes('outlander') || lower.includes('can-am')) return '/images/canam_outlander.png';
  if (lower.includes('honda') || lower.includes('rubicon')) return '/images/honda_rubicon.png';
  if (lower.includes('kawasaki') || lower.includes('brute')) return '/images/kawasaki_brute.png';
  if (lower.includes('suzuki') || lower.includes('kingquad')) return '/images/suzuki_kingquad.png';
  return fallbackUrl || '/images/polaris_570.png';
};

const getAtvCategory = (atv: ATV, lang: string): string => {
  if (!atv.category) return 'Utility';
  return lang.startsWith('es') && atv.category.nameEs ? atv.category.nameEs : atv.category.name;
};

const getAtvSeats = (atv: ATV): string => {
  const lower = (atv.model + ' ' + atv.name).toLowerCase();
  if (lower.includes('max') || lower.includes('2-up') || lower.includes('touring')) return '2 Seats';
  return '1 Seat';
};

const getBadgeLabel = (atv: ATV, index: number): string | null => {
  const badges = ['Popular', 'Pro Choice', 'Best Value', 'Top Rated', 'Staff Pick'];
  if (atv.status !== 'AVAILABLE') return null;
  return badges[index % badges.length];
};

export const Fleet: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [atvs, setAtvs] = useState<ATV[]>([]);
  const [filteredAtvs, setFilteredAtvs] = useState<ATV[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const loadFleet = async () => {
      try {
        const [atvsData, catData] = await Promise.all([
          fetchAPI('/atvs'),
          fetchAPI('/vehicle-categories')
        ]);
        setAtvs(atvsData || []);
        setFilteredAtvs(atvsData || []);
        setCategories(catData || []);
      } catch (e) {
        console.error('Failed to load fleet.', e);
      } finally {
        setLoading(false);
      }
    };
    loadFleet();
  }, []);

  useEffect(() => {
    let result = atvs;

    if (filterStatus !== 'ALL') {
      result = result.filter((item) => item.status === filterStatus);
    }

    if (filterCategory !== 'ALL') {
      result = result.filter((item) => item.category?._id === filterCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q) ||
          item.specs.displacement.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'price-low') {
      result = [...result].sort((a, b) => a.ratePerDay - b.ratePerDay);
    } else if (sortBy === 'price-high') {
      result = [...result].sort((a, b) => b.ratePerDay - a.ratePerDay);
    } else if (sortBy === 'newest') {
      result = [...result].sort((a, b) => b.year - a.year);
    }

    setFilteredAtvs(result);
  }, [filterStatus, filterCategory, searchQuery, sortBy, atvs]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '80vh' }}>
      {/* Hero Header */}
      <section style={{
        padding: '48px 24px 0 24px',
        backgroundColor: 'var(--background)'
      }}>
        <div className="container">
          <h1 style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 800,
            fontSize: '42px',
            color: 'var(--on-background)',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            {t('fleet_title', 'Our Elite Fleet')}
          </h1>
          <p style={{
            color: 'var(--on-surface-variant)',
            fontSize: '16px',
            lineHeight: '26px',
            maxWidth: '550px',
            marginBottom: '0'
          }}>
            {t('fleet_subtitle_1', 'High-performance machines engineered for the rugged terrain of the wild.')}
            <br />{t('fleet_subtitle_2', 'Choose your partner for the ultimate adventure.')}
          </p>
        </div>
      </section>

      {/* Stitch-style Filter Bar */}
      <section style={{ padding: '28px 24px 40px 24px' }}>
        <div className="container">
          <div className="fleet-filter-bar">
            {/* Search */}
            <div className="fleet-filter-item fleet-filter-search">
              <Search size={16} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder={t('fleet_search_placeholder', 'Search models...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '14px',
                  color: 'var(--on-surface)',
                  width: '100%',
                  fontFamily: 'var(--font-body)'
                }}
              />
            </div>

            {/* Divider */}
            <div className="fleet-filter-divider" />

            {/* Category Filter */}
            <div className="fleet-filter-item">
              <div>
                <span className="fleet-filter-label">{t('fleet_category_type', 'CATEGORY')}</span>
                <div className="fleet-filter-select-wrap">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="fleet-filter-select"
                  >
                    <option value="ALL">{t('fleet_filter_all_cats', 'All Categories')}</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>
                        {i18n.language.startsWith('es') && cat.nameEs ? cat.nameEs : cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="fleet-filter-divider" />

            {/* Vehicle Type */}
            <div className="fleet-filter-item">
              <div>
                <span className="fleet-filter-label">{t('fleet_vehicle_status', 'STATUS')}</span>
                <div className="fleet-filter-select-wrap">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="fleet-filter-select"
                  >
                    <option value="ALL">{t('fleet_filter_all_status', 'All Statuses')}</option>
                    <option value="AVAILABLE">{t('fleet_filter_avail', 'Available')}</option>
                    <option value="RENTED">{t('fleet_filter_rented', 'Rented')}</option>
                    <option value="MAINTENANCE">{t('fleet_filter_maint', 'Maintenance')}</option>
                  </select>
                  <ChevronDown size={14} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="fleet-filter-divider" />

            {/* Sort By */}
            <div className="fleet-filter-item">
              <div>
                <span className="fleet-filter-label">{t('fleet_sort_by', 'SORT BY')}</span>
                <div className="fleet-filter-select-wrap">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="fleet-filter-select"
                  >
                    <option value="popularity">{t('fleet_sort_pop', 'Popularity')}</option>
                    <option value="price-low">{t('fleet_sort_low', 'Price: Low → High')}</option>
                    <option value="price-high">{t('fleet_sort_high', 'Price: High → Low')}</option>
                    <option value="newest">{t('fleet_sort_new', 'Newest First')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Cards Grid */}
      <section style={{ padding: '0 24px 80px 24px' }}>
        <div className="container">
          {loading ? (
            <SkeletonGrid count={6} />
          ) : filteredAtvs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 40px',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)'
            }}>
              <Search size={32} style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '16px' }}>{t('fleet_no_vehicles', 'No vehicles found matching your criteria.')}</p>
            </div>
          ) : (
            <div className="fleet-grid">
              {filteredAtvs.map((atv, index) => {
                const badge = getBadgeLabel(atv, index);
                const category = getAtvCategory(atv, i18n.language);
                const seats = getAtvSeats(atv);
                const isFav = favorites.has(atv._id);

                return (
                  <div className="fleet-card" key={atv._id}>
                    {/* Image Container */}
                    <div className="fleet-card-image">
                      <img
                        src={getAtvFallbackImage(atv.name, atv.images[0])}
                        alt={atv.name}
                      />

                      {/* Badge */}
                      {badge && (
                        <span className="fleet-card-badge">{t(badge, badge)}</span>
                      )}

                      {/* Hourly Rate Tag */}
                      <span className="fleet-card-hourly">
                        ${atv.hourlyRate}/{t('fleet_hr', 'hr')}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="fleet-card-body">
                      {/* Name + Heart */}
                      <div className="fleet-card-name-row">
                        <h3 className="fleet-card-name">{atv.name}</h3>
                        <button
                          className={`fleet-card-heart ${isFav ? 'active' : ''}`}
                          onClick={() => toggleFavorite(atv._id)}
                          aria-label="Add to favorites"
                        >
                          <Heart size={18} fill={isFav ? 'var(--error)' : 'none'} />
                        </button>
                      </div>

                      {/* Specs Row */}
                      <div className="fleet-card-specs">
                        <span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>
                          {atv.specs.displacement}
                        </span>
                        <span className="fleet-card-spec-dot">·</span>
                        <span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          {t(seats, seats)}
                        </span>
                        <span className="fleet-card-spec-dot">·</span>
                        <span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                          {category}
                        </span>
                      </div>

                      {/* Price + CTA */}
                      <div className="fleet-card-footer">
                        <div className="fleet-card-price">
                          <span className="fleet-card-price-label">{t('fleet_starting_at', 'STARTING AT')}</span>
                          <span className="fleet-card-price-value">${atv.ratePerDay} <span className="fleet-card-price-unit">/{t('fleet_day', 'day')}</span></span>
                        </div>
                        <Link to={`/atv/${atv._id}`} className="fleet-card-cta">
                          {t('fleet_view_details', 'View Details')}
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

      {/* Fleet Page Styles */}
      <style>{`
        /* ===== Filter Bar ===== */
        .fleet-filter-bar {
          display: flex;
          align-items: center;
          background: #ffffff;
          border-radius: 60px;
          padding: 8px 8px 8px 20px;
          box-shadow: 0 2px 12px rgba(20, 27, 43, 0.08), 0 0 0 1px rgba(20, 27, 43, 0.04);
          gap: 0;
          overflow-x: auto;
        }

        .fleet-filter-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          flex-shrink: 0;
        }

        .fleet-filter-search {
          flex: 1;
          min-width: 140px;
          gap: 8px;
        }

        .fleet-filter-divider {
          width: 1px;
          height: 32px;
          background-color: var(--border-light);
          flex-shrink: 0;
        }

        .fleet-filter-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          color: var(--on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 2px;
          font-family: var(--font-body);
        }

        .fleet-filter-select-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .fleet-filter-select {
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          font-weight: 500;
          color: var(--on-surface);
          cursor: pointer;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          padding: 0;
          font-family: var(--font-body);
        }

        .fleet-apply-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--primary-dark);
          color: #ffffff;
          border: none;
          border-radius: 40px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          flex-shrink: 0;
          font-family: var(--font-body);
          margin-left: 8px;
        }

        .fleet-apply-btn:hover {
          background-color: #3d5300;
          transform: translateY(-1px);
        }

        /* ===== Fleet Grid ===== */
        .fleet-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .fleet-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .fleet-grid {
            grid-template-columns: 1fr;
          }
          .fleet-filter-bar {
            border-radius: 16px;
            flex-wrap: wrap;
            padding: 12px;
            gap: 8px;
          }
          .fleet-filter-divider {
            display: none;
          }
          .fleet-filter-item {
            padding: 6px 8px;
          }
          .fleet-filter-search {
            width: 100%;
            flex: 1 1 100%;
          }
        }

        /* ===== Fleet Card ===== */
        .fleet-card {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(20, 27, 43, 0.06);
          border: 1px solid rgba(20, 27, 43, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .fleet-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 32px rgba(20, 27, 43, 0.12);
        }

        /* Image */
        .fleet-card-image {
          position: relative;
          height: 220px;
          overflow: hidden;
          background: var(--surface-container);
        }

        .fleet-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .fleet-card:hover .fleet-card-image img {
          transform: scale(1.05);
        }

        /* Badge */
        .fleet-card-badge {
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(20, 27, 43, 0.85);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 20px;
          letter-spacing: 0.02em;
          backdrop-filter: blur(4px);
          font-family: var(--font-body);
        }

        /* Hourly Rate */
        .fleet-card-hourly {
          position: absolute;
          top: 14px;
          right: 14px;
          background: var(--primary-dark);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 20px;
          font-family: var(--font-body);
        }

        /* Card Body */
        .fleet-card-body {
          padding: 20px 20px 22px 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        /* Name Row */
        .fleet-card-name-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .fleet-card-name {
          font-family: var(--font-headline);
          font-size: 18px;
          font-weight: 700;
          color: var(--on-background);
          line-height: 1.3;
        }

        .fleet-card-heart {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--on-surface-variant);
          padding: 2px;
          transition: var(--transition);
          flex-shrink: 0;
        }

        .fleet-card-heart:hover,
        .fleet-card-heart.active {
          color: var(--error);
          transform: scale(1.15);
        }

        /* Specs */
        .fleet-card-specs {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-light);
        }

        .fleet-card-specs span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: var(--on-surface-variant);
          font-weight: 500;
        }

        .fleet-card-spec-dot {
          color: var(--border) !important;
          font-size: 16px !important;
          font-weight: 400 !important;
        }

        /* Footer */
        .fleet-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
        }

        .fleet-card-price {
          display: flex;
          flex-direction: column;
        }

        .fleet-card-price-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 2px;
          font-family: var(--font-body);
        }

        .fleet-card-price-value {
          font-family: var(--font-headline);
          font-size: 22px;
          font-weight: 800;
          color: var(--on-background);
          line-height: 1.1;
        }

        .fleet-card-price-unit {
          font-size: 14px;
          font-weight: 500;
          color: var(--on-surface-variant);
        }

        /* CTA */
        .fleet-card-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 22px;
          border: 2px solid var(--on-background);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--on-background);
          text-decoration: none;
          transition: var(--transition);
          font-family: var(--font-body);
          letter-spacing: 0.01em;
          white-space: nowrap;
        }

        .fleet-card-cta:hover {
          background-color: var(--on-background);
          color: #ffffff;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};
