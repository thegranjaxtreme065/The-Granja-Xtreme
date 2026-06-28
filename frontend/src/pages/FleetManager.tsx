import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Pencil, Wrench, Search, LayoutGrid, List } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { uploadImage } from '../utils/upload';
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
  currentOdometer: number;
  currentFuelLevel: number;
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

export const FleetManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [atvs, setAtvs] = useState<ATV[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [selectedAtvId, setSelectedAtvId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'MAINTENANCE' | 'RENTED'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);

  // Form states for Add ATV
  const [name, setName] = useStickyState('', 'atv_name');
  const [nameEs, setNameEs] = useStickyState('', 'atv_name_es');
  const [model, setModel] = useStickyState('', 'atv_model');
  const [year, setYear] = useStickyState(new Date().getFullYear(), 'atv_year');
  const [ratePerDay, setRatePerDay] = useStickyState(80, 'atv_rate_day');
  const [hourlyRate, setHourlyRate] = useStickyState(15, 'atv_rate_hour');
  const [description, setDescription] = useStickyState('', 'atv_desc');
  const [descriptionEs, setDescriptionEs] = useStickyState('', 'atv_desc_es');
  const [displacement, setDisplacement] = useStickyState('570 cc', 'atv_disp');
  const [fuelCapacity, setFuelCapacity] = useStickyState('4.5 gal', 'atv_fuel');
  const [weightLimit, setWeightLimit] = useStickyState('485 lbs', 'atv_weight');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useStickyState<string>('AVAILABLE', 'atv_status');
  const [categoryId, setCategoryId] = useStickyState<string>('', 'atv_category');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for Maintenance log
  const [serviceType, setServiceType] = useState('Oil Change');
  const [maintDesc, setMaintDesc] = useState('');
  const [cost, setCost] = useState(50);
  const [maintError, setMaintError] = useState('');

  const loadFleet = async () => {
    try {
      const [atvsData, categoriesData] = await Promise.all([
        fetchAPI('/atvs'),
        fetchAPI('/vehicle-categories')
      ]);
      setAtvs(atvsData || []);
      setCategories(categoriesData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setNameEs('');
    setModel('');
    setYear(new Date().getFullYear());
    setRatePerDay(80);
    setHourlyRate(15);
    setDescription('');
    setDescriptionEs('');
    setDisplacement('570 cc');
    setFuelCapacity('4.5 gal');
    setWeightLimit('485 lbs');
    setImageUrls([]);
    setStatus('AVAILABLE');
    setCategoryId('');
    setErrorMsg('');
  };

  const handleAutoTranslateName = async () => {
    if (!name) return;
    setIsTranslatingTitle(true);
    try {
      const res = await fetchAPI('/translations', {
        method: 'POST',
        body: { text: name, targetLang: 'es' }
      });
      if (res && res.translated) {
        setNameEs(res.translated);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslatingTitle(false);
    }
  };

  const handleAutoTranslateDesc = async () => {
    if (!description) return;
    setIsTranslatingDesc(true);
    try {
      const res = await fetchAPI('/translations', {
        method: 'POST',
        body: { text: description, targetLang: 'es' }
      });
      if (res && res.translated) {
        setDescriptionEs(res.translated);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslatingDesc(false);
    }
  };

  useEffect(() => {
    loadFleet();

    const handleOpenAddModal = () => {
      resetForm();
      setShowAddModal(true);
    };

    window.addEventListener('openAddAtvModal', handleOpenAddModal);
    return () => {
      window.removeEventListener('openAddAtvModal', handleOpenAddModal);
    };
  }, []);



  const handleAddAtv = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const images = imageUrls.length > 0 ? imageUrls : ['/images/vasile-valcan-1HqixV1agUw-unsplash.jpg'];
      await fetchAPI('/atvs', {
        method: 'POST',
        body: {
          name,
          nameEs,
          model,
          year,
          ratePerDay,
          hourlyRate,
          description,
          descriptionEs,
          category: categoryId || undefined,
          specs: { displacement, fuelCapacity, weightLimit },
          images
        }
      });
      setShowAddModal(false);
      loadFleet();
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add ATV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    try {
      setIsUploading(true);
      setErrorMsg('');
      const urls = await Promise.all(files.map(file => uploadImage(file, 'atvs')));
      setImageUrls(prev => [...prev, ...urls]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
      // Reset input value so same files can be selected again if needed
      e.target.value = '';
    }
  };

  const handleOpenEdit = (atv: ATV) => {
    setSelectedAtvId(atv._id);
    setName(atv.name);
    setNameEs(atv.nameEs || '');
    setModel(atv.model);
    setYear(atv.year);
    setRatePerDay(atv.ratePerDay);
    setHourlyRate(atv.hourlyRate);
    setDescription(atv.description || '');
    setDescriptionEs(atv.descriptionEs || '');
    setDisplacement(atv.specs.displacement);
    setFuelCapacity(atv.specs.fuelCapacity);
    setWeightLimit(atv.specs.weightLimit);
    setImageUrls(atv.images || []);
    setStatus(atv.status);
    setCategoryId(atv.category?._id || '');
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleEditAtv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAtvId) return;
    setErrorMsg('');
    try {
      const images = imageUrls;
      await fetchAPI(`/atvs/${selectedAtvId}`, {
        method: 'PUT',
        body: {
          name,
          nameEs,
          model,
          year,
          ratePerDay,
          hourlyRate,
          description,
          descriptionEs,
          category: categoryId || undefined,
          status,
          specs: { displacement, fuelCapacity, weightLimit },
          images
        }
      });
      setShowEditModal(false);
      loadFleet();
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update ATV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAtvId) return;
    setMaintError('');
    try {
      await fetchAPI(`/atvs/${selectedAtvId}/maintenance`, {
        method: 'POST',
        body: {
          serviceType,
          description: maintDesc,
          cost,
          completedAt: new Date().toISOString()
        }
      });
      await fetchAPI(`/atvs/${selectedAtvId}`, {
        method: 'PUT',
        body: { status: 'AVAILABLE' }
      });
      setShowMaintModal(false);
      setMaintDesc('');
      loadFleet();
    } catch (err: any) {
      setMaintError(err.message || 'Failed to log service record.');
    }
  };

  const handleDeleteAtv = async (id: string) => {
    if (!window.confirm('Are you sure you want to completely remove this ATV from the fleet registry? This action cannot be undone.')) return;
    try {
      await fetchAPI(`/atvs/${id}`, { method: 'DELETE' });
      loadFleet();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ATV.');
    }
  };

  const renderAtvFormFields = () => (
    <>
      <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.atvBrandName', 'ATV Brand Name')}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('fleetManager.placeholderBrand', 'e.g. Polaris Sportsman 570')} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
        </div>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            {t('fleetManager.atvNameEs', 'Name (Spanish)')}
            <button type="button" onClick={handleAutoTranslateName} disabled={isTranslatingTitle || !name} style={{ background: 'none', border: 'none', color: '#4d7c0f', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
              {isTranslatingTitle ? t('fleetManager.translating', 'Translating...') : t('fleetManager.autoTranslate', 'Auto-Translate')}
            </button>
          </label>
          <input type="text" value={nameEs} onChange={(e) => setNameEs(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.modelSeries', 'Model Series')}</label>
        <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder={t('fleetManager.placeholderSeries', 'e.g. Utility Edition')} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
      </div>
      <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.modelYear', 'Model Year')}</label>
          <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.ratePerDay', 'Rate / Day ($)')}</label>
          <input type="number" value={ratePerDay} onChange={(e) => setRatePerDay(parseFloat(e.target.value))} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.ratePerHour', 'Rate / Hour ($)')}</label>
          <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value))} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.vehicleCategory', 'Vehicle Category')}</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}>
          <option value="">{t('fleetManager.selectCategory', 'Select a category...')}</option>
          {categories.map(cat => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.displacement', 'Displacement')}</label>
          <input type="text" value={displacement} onChange={(e) => setDisplacement(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.fuelTank', 'Fuel Tank')}</label>
          <input type="text" value={fuelCapacity} onChange={(e) => setFuelCapacity(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.weightLimit', 'Weight Limit')}</label>
          <input type="text" value={weightLimit} onChange={(e) => setWeightLimit(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.imageUpload', 'Image Upload (Select multiple)')}</label>
        <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={isUploading} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
        {isUploading && <p style={{ fontSize: '12px', color: '#64748b' }}>{t('fleetManager.uploadingImages', 'Uploading images...')}</p>}
        {imageUrls.length > 0 && (
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {imageUrls.map((url, index) => (
              <div 
                key={url + index} 
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                  const toIndex = index;
                  if (fromIndex !== toIndex) {
                    const newUrls = [...imageUrls];
                    const [moved] = newUrls.splice(fromIndex, 1);
                    newUrls.splice(toIndex, 0, moved);
                    setImageUrls(newUrls);
                  }
                }}
                style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'grab' }}
              >
                <img src={url} alt={`preview-${index}`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {index === 0 && (
                  <div style={{ position: 'absolute', top: 4, left: 4, background: '#4d7c0f', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    {t('fleetManager.thumbnail', 'Thumbnail')}
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== index))}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.vehicleDescriptionEn', 'Vehicle Description (English)')}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('fleetManager.placeholderVehicleDescEn', 'Write performance specs, trail suitability...')} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical', marginBottom: '16px' }} rows={3} required />

        <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          {t('fleetManager.vehicleDescriptionEs', 'Vehicle Description (Spanish)')}
          <button type="button" onClick={handleAutoTranslateDesc} disabled={isTranslatingDesc || !description} style={{ background: 'none', border: 'none', color: '#4d7c0f', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
            {isTranslatingDesc ? t('fleetManager.translating', 'Translating...') : t('fleetManager.autoTranslate', 'Auto-Translate')}
          </button>
        </label>
        <textarea value={descriptionEs} onChange={(e) => setDescriptionEs(e.target.value)} placeholder={t('fleetManager.placeholderVehicleDescEs', 'Escribe especificaciones de rendimiento...')} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }} rows={3} />
      </div>
    </>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>{t('fleetManager.loading', 'Loading fleet registry...')}</div>;

  const countByStatus = (status: string) => atvs.filter(a => a.status === status).length;
  
  let filteredAtvs = filter === 'ALL' ? atvs : atvs.filter(a => a.status === filter);
  if (filterCategory !== 'ALL') {
    filteredAtvs = filteredAtvs.filter(a => a.category?._id === filterCategory);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredAtvs = filteredAtvs.filter(a => a.name.toLowerCase().includes(q) || a.model.toLowerCase().includes(q) || a._id.toLowerCase().includes(q));
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return { bg: '#d9f99d', text: '#3f6212', label: t('fleetManager.statusAvailable', 'Available') };
      case 'RENTED': return { bg: '#ccfbf1', text: '#0f766e', label: t('fleetManager.statusRented', 'Rented') };
      case 'MAINTENANCE': return { bg: '#fee2e2', text: '#b91c1c', label: t('fleetManager.statusMaintenance', 'Maintenance') };
      default: return { bg: '#f1f5f9', text: '#475569', label: t('fleetManager.statusRetired', 'Retired') };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Action / Filter Bar */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px 24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder={t('fleetManager.searchPlaceholder', 'Search by model or ID...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px 10px 40px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', color: '#334155', outline: 'none'
              }}
            />
          </div>

          <div style={{ flex: '0 1 180px' }}>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', color: '#334155', outline: 'none'
              }}
            >
              <option value="ALL">{t('fleetManager.allCategories', 'All Categories')}</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>
                  {i18n.language.startsWith('es') && cat.nameEs ? cat.nameEs : cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: '2 1 auto', justifyContent: 'center' }}>
            <button 
              onClick={() => setFilter('ALL')}
              style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: filter === 'ALL' ? '#4d7c0f' : '#f8fafc', color: filter === 'ALL' ? 'white' : '#64748b', whiteSpace: 'nowrap' }}
            >
              {t('fleetManager.filterAll', 'All Vehicles')}
            </button>
            <button 
              onClick={() => setFilter('AVAILABLE')}
              style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: filter === 'AVAILABLE' ? '#4d7c0f' : '#f8fafc', color: filter === 'AVAILABLE' ? 'white' : '#64748b', whiteSpace: 'nowrap' }}
            >
              {t('fleetManager.filterAvailable', 'Available')} ({countByStatus('AVAILABLE')})
            </button>
            <button 
              onClick={() => setFilter('MAINTENANCE')}
              style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: filter === 'MAINTENANCE' ? '#4d7c0f' : '#f8fafc', color: filter === 'MAINTENANCE' ? 'white' : '#64748b', whiteSpace: 'nowrap' }}
            >
              {t('fleetManager.filterMaintenance', 'Maintenance')} ({countByStatus('MAINTENANCE')})
            </button>
            <button 
              onClick={() => setFilter('RENTED')}
              style={{ padding: '8px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: filter === 'RENTED' ? '#4d7c0f' : '#f8fafc', color: filter === 'RENTED' ? 'white' : '#64748b', whiteSpace: 'nowrap' }}
            >
              {t('fleetManager.filterRented', 'Rented')} ({countByStatus('RENTED')})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', color: viewMode === 'grid' ? '#0f172a' : '#64748b', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                style={{ border: 'none', background: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? '#0f172a' : '#64748b', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet View */}
      {viewMode === 'grid' ? (
        <div className="admin-grid-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {filteredAtvs.map((atv) => {
            const badge = getStatusBadge(atv.status);
            const formattedId = `GX-${atv._id.substring(atv._id.length - 4).toUpperCase()}`;
            return (
              <div key={atv._id} style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ position: 'relative', height: '220px' }}>
                  <img src={atv.images[0] || '/images/vasile-valcan-1HqixV1agUw-unsplash.jpg'} alt={atv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', top: '16px', right: '16px',
                    backgroundColor: badge.bg, color: badge.text,
                    padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 800
                  }}>
                    {badge.label}
                  </div>
                </div>
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3, flex: 1, paddingRight: '12px' }}>{atv.name} {atv.model}</h3>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ca8a04', whiteSpace: 'nowrap' }}>${atv.ratePerDay}<span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{t('fleetManager.perDay', '/day')}</span></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>
                    ID: {formattedId} | {atv.specs?.displacement || '4x4 Utility'} | {atv.year} {t('fleetManager.model', 'Model')}
                  </div>
  
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleOpenEdit(atv)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', border: '1px solid #84cc16', backgroundColor: 'transparent', color: '#4d7c0f', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Pencil size={14} /> {t('fleetManager.edit', 'Edit')}
                    </button>
                    <button 
                      onClick={() => { setSelectedAtvId(atv._id); setShowMaintModal(true); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Wrench size={14} /> {t('fleetManager.service', 'Service')}
                    </button>
                    <button 
                      onClick={() => handleDeleteAtv(atv._id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-table-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '800px' }}>
          {filteredAtvs.map((atv) => {
            const badge = getStatusBadge(atv.status);
            const formattedId = `GX-${atv._id.substring(atv._id.length - 4).toUpperCase()}`;
            return (
              <div key={atv._id} style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px'
              }}>
                <img src={atv.images[0] || '/images/vasile-valcan-1HqixV1agUw-unsplash.jpg'} alt={atv.name} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{atv.name} {atv.model}</h3>
                    <div style={{
                      backgroundColor: badge.bg, color: badge.text,
                      padding: '4px 10px', borderRadius: '16px', fontSize: '10px', fontWeight: 800
                    }}>
                      {badge.label}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    ID: {formattedId} &bull; {atv.specs?.displacement || '4x4 Utility'} &bull; {atv.year} {t('fleetManager.model', 'Model')}
                  </div>
                </div>

                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ca8a04', paddingRight: '24px', borderRight: '1px solid #e2e8f0' }}>
                  ${atv.ratePerDay}<span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{t('fleetManager.perDay', '/day')}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleOpenEdit(atv)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #84cc16', backgroundColor: 'transparent', color: '#4d7c0f', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Pencil size={14} /> {t('fleetManager.edit', 'Edit')}
                  </button>
                  <button 
                    onClick={() => { setSelectedAtvId(atv._id); setShowMaintModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Wrench size={14} /> {t('fleetManager.service', 'Service')}
                  </button>
                  <button 
                    onClick={() => handleDeleteAtv(atv._id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {filteredAtvs.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          {t('fleetManager.noVehicles', 'No vehicles match the selected criteria.')}
        </div>
      )}

      {/* Add ATV Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="admin-modal-content" style={{ width: '500px', padding: '32px', backgroundColor: 'white', borderRadius: '16px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>{t('fleetManager.registerNewQuad', 'Register New ATV Quad')}</h2>
            <form onSubmit={handleAddAtv} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
              {renderAtvFormFields()}
              {errorMsg && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>{errorMsg}</div>}
              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#4d7c0f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                {t('fleetManager.saveQuadToFleet', 'Save Quad to Fleet')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit ATV Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="admin-modal-content" style={{ width: '500px', padding: '32px', backgroundColor: 'white', borderRadius: '16px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <button onClick={() => { setShowEditModal(false); resetForm(); }} style={{ position: 'absolute', top: '24px', right: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={20} color="#4d7c0f" /> {t('fleetManager.editAtvDetails', 'Edit ATV Details')}
            </h2>
            <form onSubmit={handleEditAtv} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
              {renderAtvFormFields()}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.vehicleStatus', 'Vehicle Status')}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}>
                  <option value="AVAILABLE">{t('fleetManager.statusOptAvailable', 'Available')}</option>
                  <option value="RENTED">{t('fleetManager.statusOptRented', 'Rented (Out on Trail)')}</option>
                  <option value="MAINTENANCE">{t('fleetManager.statusOptMaintenance', 'Maintenance (In Shop)')}</option>
                  <option value="DECOMMISSIONED">{t('fleetManager.statusOptRetired', 'Decommissioned (Retired)')}</option>
                </select>
              </div>
              {errorMsg && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>{errorMsg}</div>}
              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#4d7c0f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                {t('fleetManager.saveChanges', 'Save Changes')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Log Maintenance Modal */}
      {showMaintModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="admin-modal-content" style={{ width: '450px', padding: '32px', backgroundColor: 'white', borderRadius: '16px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <button onClick={() => setShowMaintModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>{t('fleetManager.logMaintenanceRecord', 'Log Service Maintenance Record')}</h2>
            <form onSubmit={handleLogMaintenance}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.serviceType', 'Service Type')}</label>
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}>
                  <option value="Oil Change">{t('fleetManager.serviceTypes.oilChange', 'Oil Change')}</option>
                  <option value="Tire Replacement">{t('fleetManager.serviceTypes.tireReplacement', 'Tire Replacement')}</option>
                  <option value="Engine Tuning">{t('fleetManager.serviceTypes.engineTuning', 'Engine Tuning')}</option>
                  <option value="Brake Adjustment">{t('fleetManager.serviceTypes.brakeAdjustment', 'Brake Adjustment')}</option>
                  <option value="Body Repair">{t('fleetManager.serviceTypes.bodyRepair', 'Body Repair')}</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.serviceCost', 'Service Cost ($)')}</label>
                <input type="number" value={cost} onChange={(e) => setCost(parseFloat(e.target.value))} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} required />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t('fleetManager.serviceDescDetails', 'Service Description Details')}</label>
                <textarea value={maintDesc} onChange={(e) => setMaintDesc(e.target.value)} placeholder={t('fleetManager.placeholderServiceDesc', 'e.g. Changed air filter, flushed brake lines...')} style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }} rows={4} required />
              </div>
              {maintError && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>{maintError}</div>}
              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                {t('fleetManager.logServiceEvent', 'Log Service Event')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
