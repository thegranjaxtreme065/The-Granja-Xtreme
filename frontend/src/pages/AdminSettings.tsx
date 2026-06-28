import React, { useState, useEffect } from 'react';
import { Settings, Save, Bell, Shield, Database, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchAPI } from '../utils/api';

export const AdminSettings: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('General');
  const [authLogs, setAuthLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameEs, setNewCategoryNameEs] = useState('');
  const [isTranslatingCat, setIsTranslatingCat] = useState(false);

  const [settings, setSettings] = useState({
    baseTaxRate: 8.5,
    securityDeposit: 500,
    operatingHours: { days: 'Monday to Sunday', open: '08:00', close: '18:00' },
    currency: 'USD',
    businessEmail: '',
    businessPhone: '',
    cancellationPolicy: 'Full refund 48 hours prior. No refund within 24 hours.',
    notifications: { newOrder: true, newMessage: true },
    sessionTimeoutMinutes: 30
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await fetchAPI('/settings');
        if (data) setSettings(data);
      } catch (err: any) {
        setErrorMsg(t('adminSettings.loadFailed', 'Failed to load settings.'));
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'Security') {
      const loadLogs = async () => {
        setLoadingLogs(true);
        try {
          const data = await fetchAPI('/logs/auth');
          if (data) setAuthLogs(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingLogs(false);
        }
      };
      loadLogs();
    }
    if (activeTab === 'Categories') {
      loadCategories();
    }
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const data = await fetchAPI('/vehicle-categories');
      if (data) setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await fetchAPI('/vehicle-categories', { method: 'POST', body: { name: newCategoryName, nameEs: newCategoryNameEs } });
      setNewCategoryName('');
      setNewCategoryNameEs('');
      setSuccessMsg(t('adminSettings.categoryAdded', 'Category added successfully.'));
      setTimeout(() => setSuccessMsg(''), 3000);
      loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add category');
    }
  };

  const handleAutoTranslateCategory = async () => {
    if (!newCategoryName) return;
    setIsTranslatingCat(true);
    try {
      const res = await fetchAPI('/translations', {
        method: 'POST',
        body: { text: newCategoryName, targetLang: 'es' }
      });
      if (res && res.translated) {
        setNewCategoryNameEs(res.translated);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslatingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await fetchAPI(`/vehicle-categories/${id}`, { method: 'DELETE' });
      setSuccessMsg(t('adminSettings.categoryDeleted', 'Category deleted successfully.'));
      setTimeout(() => setSuccessMsg(''), 3000);
      loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete category');
    }
  };

  const handleEditCategory = async (id: string, newName: string, newNameEs?: string) => {
    if (!newName.trim()) return;
    try {
      const body: any = { name: newName };
      if (newNameEs !== undefined) body.nameEs = newNameEs;
      await fetchAPI(`/vehicle-categories/${id}`, { method: 'PUT', body });
      setSuccessMsg(t('adminSettings.categoryUpdated', 'Category updated successfully.'));
      setTimeout(() => setSuccessMsg(''), 3000);
      loadCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update category');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await fetchAPI('/settings', { method: 'PUT', body: settings });
      setSuccessMsg(t('adminSettings.saveSuccess', 'System configuration saved successfully.'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || t('adminSettings.saveFailed', 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div className="checkout-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '32px' }}>
        {/* Settings Navigation */}
        <div className="card" style={{ padding: '16px', alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              type="button"
              onClick={() => setActiveTab('General')}
              className={`btn ${activeTab === 'General' ? '' : 'btn-secondary'}`} 
              style={{ justifyContent: 'flex-start', textAlign: 'left', ...(activeTab === 'General' ? { backgroundColor: 'var(--primary)', color: 'var(--on-primary)' } : { border: 'none', backgroundColor: 'transparent' }) }}>
              <Settings size={18} /> {t('adminSettings.tabGeneral', 'General')}
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('Notifications')}
              className={`btn ${activeTab === 'Notifications' ? '' : 'btn-secondary'}`} 
              style={{ justifyContent: 'flex-start', textAlign: 'left', ...(activeTab === 'Notifications' ? { backgroundColor: 'var(--primary)', color: 'var(--on-primary)' } : { border: 'none', backgroundColor: 'transparent' }) }}>
              <Bell size={18} /> {t('adminSettings.tabNotifications', 'Notifications')}
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('Categories')}
              className={`btn ${activeTab === 'Categories' ? '' : 'btn-secondary'}`} 
              style={{ justifyContent: 'flex-start', textAlign: 'left', ...(activeTab === 'Categories' ? { backgroundColor: 'var(--primary)', color: 'var(--on-primary)' } : { border: 'none', backgroundColor: 'transparent' }) }}>
              <List size={18} /> {t('adminSettings.tabCategories', 'Categories')}
            </button>
            <button 
              type="button" 
              onClick={() => setActiveTab('Security')}
              className={`btn ${activeTab === 'Security' ? '' : 'btn-secondary'}`} 
              style={{ justifyContent: 'flex-start', textAlign: 'left', ...(activeTab === 'Security' ? { backgroundColor: 'var(--primary)', color: 'var(--on-primary)' } : { border: 'none', backgroundColor: 'transparent' }) }}>
              <Shield size={18} /> {t('adminSettings.tabSecurity', 'Security')}
            </button>
            <button 
              type="button" 
              onClick={() => setActiveTab('Backups')}
              className={`btn ${activeTab === 'Backups' ? '' : 'btn-secondary'}`} 
              style={{ justifyContent: 'flex-start', textAlign: 'left', ...(activeTab === 'Backups' ? { backgroundColor: 'var(--primary)', color: 'var(--on-primary)' } : { border: 'none', backgroundColor: 'transparent' }) }}>
              <Database size={18} /> {t('adminSettings.tabBackups', 'Backups')}
            </button>
          </div>
        </div>

        {/* Settings Form */}
        <div className="card" style={{ padding: '32px' }}>
          {activeTab === 'Categories' ? (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                {t('adminSettings.vehicleCategories', 'Vehicle Categories')}
              </h3>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
                {t('adminSettings.categoriesDesc', 'Manage categories for your fleet. New categories will be auto-translated to Spanish.')}
              </p>
              
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '12px', marginBottom: '32px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('adminSettings.newCategoryName', 'e.g. Scooter')}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button 
                  type="button" 
                  onClick={handleAutoTranslateCategory} 
                  disabled={isTranslatingCat || !newCategoryName} 
                  style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  {isTranslatingCat ? t('adminSettings.translating', 'Translating...') : t('adminSettings.autoTranslate', 'Auto-Translate')}
                </button>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('adminSettings.newCategoryNameEs', 'Nombre en español')}
                  value={newCategoryNameEs}
                  onChange={(e) => setNewCategoryNameEs(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  {t('adminSettings.addCategory', 'Add Category')}
                </button>
              </form>

              <div className="admin-table-container" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-container)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>{t('adminSettings.categoryName', 'Name (English)')}</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>{t('adminSettings.categoryNameEs', 'Name (Spanish)')}</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{t('adminSettings.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>{t('adminSettings.noCategories', 'No categories found.')}</td></tr>
                    ) : (
                      categories.map(cat => (
                        <tr key={cat._id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px' }}>
                            <input 
                              type="text" 
                              defaultValue={cat.name}
                              className="form-input"
                              onBlur={(e) => {
                                if (e.target.value !== cat.name) {
                                  handleEditCategory(cat._id, e.target.value);
                                }
                              }}
                              style={{ padding: '4px 8px', minHeight: 'auto' }}
                            />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <input 
                              type="text" 
                              defaultValue={cat.nameEs || ''}
                              className="form-input"
                              placeholder={t('adminSettings.newCategoryNameEs', 'Nombre en español')}
                              onBlur={(e) => {
                                if (e.target.value !== (cat.nameEs || '')) {
                                  handleEditCategory(cat._id, cat.name, e.target.value);
                                }
                              }}
                              style={{ padding: '4px 8px', minHeight: 'auto' }}
                            />
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button 
                              type="button"
                              onClick={() => handleDeleteCategory(cat._id)}
                              style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                            >
                              {t('adminSettings.delete', 'Delete')}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {successMsg && (
                <div style={{ color: 'var(--success)', backgroundColor: 'rgba(34,197,94,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', marginTop: '24px' }}>
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div style={{ color: 'var(--error)', backgroundColor: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px', marginTop: '24px' }}>
                  {errorMsg}
                </div>
              )}
            </div>
          ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {activeTab === 'General' && (
              <>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    {t('adminSettings.rentalParams', 'Rental Parameters')}
                  </h3>
                  <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">{t('adminSettings.taxRateLabel', 'Base Tax Rate (%)')}</label>
                      <input type="number" value={settings.baseTaxRate} onChange={(e) => setSettings({ ...settings, baseTaxRate: parseFloat(e.target.value) })} step="0.1" className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('adminSettings.depositLabel', 'Default Security Deposit ($)')}</label>
                      <input type="number" value={settings.securityDeposit} onChange={(e) => setSettings({ ...settings, securityDeposit: parseFloat(e.target.value) })} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('adminSettings.currencyLabel', 'Currency')}</label>
                      <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="form-input">
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    {t('adminSettings.businessDetails', 'Business Details')}
                  </h3>
                  <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">{t('adminSettings.emailLabel', 'Business Email')}</label>
                      <input type="email" value={settings.businessEmail} onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('adminSettings.phoneLabel', 'Business Phone')}</label>
                      <input type="text" value={settings.businessPhone} onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })} className="form-input" required />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">{t('adminSettings.cancellationPolicyLabel', 'Cancellation Policy')}</label>
                    <textarea value={settings.cancellationPolicy} onChange={(e) => setSettings({ ...settings, cancellationPolicy: e.target.value })} className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} required />
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    {t('adminSettings.operatingHours', 'Operating Hours')}
                  </h3>
                  <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">{t('adminSettings.businessDaysLabel', 'Business Days')}</label>
                      <input type="text" placeholder={t('adminSettings.daysPlaceholder', 'e.g. Monday to Sunday')} value={settings.operatingHours?.days || ''} onChange={(e) => setSettings({ ...settings, operatingHours: { ...settings.operatingHours, days: e.target.value } })} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('adminSettings.openingTimeLabel', 'Opening Time')}</label>
                      <input type="time" value={settings.operatingHours.open} onChange={(e) => setSettings({ ...settings, operatingHours: { ...settings.operatingHours, open: e.target.value } })} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('adminSettings.closingTimeLabel', 'Closing Time')}</label>
                      <input type="time" value={settings.operatingHours.close} onChange={(e) => setSettings({ ...settings, operatingHours: { ...settings.operatingHours, close: e.target.value } })} className="form-input" required />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'Notifications' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  {t('adminSettings.systemAlerts', 'System Alerts')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.notifications?.newOrder !== false}
                      onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, newOrder: e.target.checked } })}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: 500 }}>{t('adminSettings.newOrderAlerts', 'New Order Alerts')}</span>
                  </label>
                  <p style={{ margin: '-8px 0 0 32px', fontSize: '14px', color: 'var(--on-surface-variant)' }}>{t('adminSettings.newOrderDesc', 'Get notified when a customer makes a new booking reservation.')}</p>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginTop: '16px' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.notifications?.newMessage !== false}
                      onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, newMessage: e.target.checked } })}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: 500 }}>{t('adminSettings.newMessageAlerts', 'New Message Alerts')}</span>
                  </label>
                  <p style={{ margin: '-8px 0 0 32px', fontSize: '14px', color: 'var(--on-surface-variant)' }}>{t('adminSettings.newMessageDesc', 'Get notified when someone submits an inquiry via the Contact form.')}</p>
                </div>
              </div>
            )}

            {activeTab === 'Security' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  {t('adminSettings.securityControls', 'Security Controls')}
                </h3>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
                  {t('adminSettings.securityDesc', 'Audit logs and active security controls for the Admin panel.')}
                </p>

                <div className="form-group" style={{ marginBottom: '32px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>{t('adminSettings.timeoutLabel', 'Auto-Logout Idle Timeout (Minutes)')}</label>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
                    {t('adminSettings.timeoutDesc', 'If an admin is inactive for this long, they will be automatically logged out.')}
                  </p>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    className="form-input"
                    value={settings.sessionTimeoutMinutes || 30}
                    onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                    style={{ maxWidth: '200px' }}
                  />
                </div>

                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>{t('adminSettings.auditLogTitle', 'Authentication Audit Log')}</h4>
                {loadingLogs ? (
                  <p style={{ color: 'var(--on-surface-variant)' }}>{t('adminSettings.loadingLogs', 'Loading logs...')}</p>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div className="admin-table-container">
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--surface-container)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>{t('adminSettings.time', 'Time')}</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>{t('adminSettings.event', 'Event')}</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>{t('adminSettings.email', 'Email')}</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>{t('adminSettings.ipAddress', 'IP Address')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authLogs.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>{t('adminSettings.noLogs', 'No recent login activity.')}</td></tr>
                        ) : (
                          authLogs.map(log => (
                            <tr key={log._id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px', color: 'var(--on-surface-variant)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                              <td style={{ padding: '12px', color: log.type === 'warning' ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>
                                {log.action.replace('LOGIN_', '')}
                              </td>
                              <td style={{ padding: '12px' }}>{log.userEmail}</td>
                              <td style={{ padding: '12px', color: 'var(--on-surface-variant)' }}>{log.ipAddress || t('adminSettings.unknownIp', 'Unknown')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Backups' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  {t('adminSettings.dbExport', 'Database Export')}
                </h3>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
                  {t('adminSettings.exportDesc', 'Download a secure, encrypted copy of your entire core database, including all customers, bookings, ATVs, invoices, and settings.')}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      const data = await fetchAPI('/settings/export-db');
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `granja_xtreme_backup_${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      setSuccessMsg(t('adminSettings.exportSuccess', 'Database export completed successfully.'));
                      setTimeout(() => setSuccessMsg(''), 4000);
                    } catch (err: any) {
                      setErrorMsg(err.message || t('adminSettings.exportFailed', 'Failed to export database.'));
                    }
                  }}
                >
                  <Database size={18} /> {t('adminSettings.downloadBtn', 'Download Full Database')}
                </button>
              </div>
            )}

            {successMsg && (
              <div style={{ color: 'var(--success)', backgroundColor: 'rgba(34,197,94,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div style={{ color: 'var(--error)', backgroundColor: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                {errorMsg}
              </div>
            )}

            {(activeTab === 'General' || activeTab === 'Notifications' || activeTab === 'Security') && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', alignSelf: 'flex-end' }}
              >
                {saving ? (
                  <span className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <><Save size={18} /> {t('adminSettings.saveConfig', 'Save Configuration')}</>
                )}
              </button>
            )}
          </form>
          )}
        </div>
      </div>
    </div>
  );
};
