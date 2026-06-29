import React, { useState, useEffect } from 'react';
import { Activity, Clock, Server, AlertCircle, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchAPI } from '../utils/api';

interface LogEntry {
  _id: string;
  action: string;
  userEmail: string;
  ipAddress: string;
  createdAt: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const AdminLogs: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (type !== 'all') queryParams.append('type', type);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      queryParams.append('page', page.toString());
      queryParams.append('limit', '20');

      const data = await fetchAPI(`/logs?${queryParams.toString()}`);
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotalLogs(data.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, type, startDate, endDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const getLogIcon = (type: string) => {
    switch(type) {
      case 'info': return <Activity size={18} color="var(--primary)" />;
      case 'success': return <Server size={18} color="var(--primary)" />;
      case 'warning': return <AlertCircle size={18} color="#f59e0b" />;
      case 'error': return <AlertCircle size={18} color="var(--error)" />;
      default: return <Clock size={18} color="var(--on-surface-variant)" />;
    }
  };

  const translateLogAction = (action: string) => {
    let match;
    
    // Cloudinary
    match = action.match(/Uploaded image to Cloudinary \((.*)\)/);
    if (match) return t('adminLogs.actions.uploadCloudinary', 'Uploaded image to Cloudinary ({{id}})', { id: match[1] });
    
    // Auth & Users
    if (action.startsWith('LOGIN_')) {
      const status = action.split('_')[1];
      if (status === 'SUCCESS') return t('adminLogs.actions.loginSuccess', 'Login Successful');
      if (status === 'FAILED') return t('adminLogs.actions.loginFailed', 'Login Failed');
      return t('adminLogs.actions.login', 'LOGIN_{{status}}', { status });
    }
    match = action.match(/New user registered via Firebase \((.*)\)/);
    if (match) return t('adminLogs.actions.newUserFirebase', 'New user registered via Firebase ({{role}})', { role: match[1] });
    if (action === 'Linked existing MongoDB user to Firebase Auth') return t('adminLogs.actions.linkedFirebase', 'Linked existing MongoDB user to Firebase Auth');
    if (action === 'Updated profile details') return t('adminLogs.actions.updatedProfile', 'Updated profile details');
    
    // Employees
    if (action === 'Created new employee') return t('adminLogs.actions.createdEmployee', 'Created new employee');
    match = action.match(/Updated employee profile \((.*)\)/);
    if (match) return t('adminLogs.actions.updatedEmployee', 'Updated employee profile ({{email}})', { email: match[1] });
    match = action.match(/Deleted employee \((.*)\)/);
    if (match) return t('adminLogs.actions.deletedEmployee', 'Deleted employee ({{email}})', { email: match[1] });
    match = action.match(/Reset password for employee \((.*)\)/);
    if (match) return t('adminLogs.actions.resetPassword', 'Reset password for employee ({{email}})', { email: match[1] });
    
    // ATVs
    match = action.match(/Added new ATV \((.*)\)/);
    if (match) return t('adminLogs.actions.addedAtv', 'Added new ATV ({{model}})', { model: match[1] });
    match = action.match(/Updated ATV \((.*)\)/);
    if (match) return t('adminLogs.actions.updatedAtv', 'Updated ATV ({{model}})', { model: match[1] });
    match = action.match(/Deleted ATV \((.*)\)/);
    if (match) return t('adminLogs.actions.deletedAtv', 'Deleted ATV ({{model}})', { model: match[1] });
    match = action.match(/Added maintenance log for ATV \((.*)\)/);
    if (match) return t('adminLogs.actions.addedMaintenance', 'Added maintenance log for ATV ({{model}})', { model: match[1] });
    match = action.match(/Added damage log for ATV \((.*)\)/);
    if (match) return t('adminLogs.actions.addedDamage', 'Added damage log for ATV ({{model}})', { model: match[1] });
    
    // CMS
    match = action.match(/Updated CMS section: (.*)/);
    if (match) return t('adminLogs.actions.updatedCms', 'Updated CMS section: {{key}}', { key: match[1] });
    
    // Bookings
    match = action.match(/Complete booking created for ATV (.*)/);
    if (match) return t('adminLogs.actions.bookingCreated', 'Complete booking created for ATV {{model}}', { model: match[1] });
    match = action.match(/Signed waiver for booking (.*)/);
    if (match) return t('adminLogs.actions.signedWaiver', 'Signed waiver for booking {{id}}', { id: match[1] });
    match = action.match(/Logged (.*) inspection for booking (.*)/);
    if (match) return t('adminLogs.actions.loggedInspection', 'Logged {{type}} inspection for booking {{id}}', { type: match[1], id: match[2] });
    match = action.match(/Updated booking (.*) status to (.*)/);
    if (match) return t('adminLogs.actions.updatedBookingStatus', 'Updated booking {{id}} status to {{status}}', { id: match[1], status: match[2] });
    match = action.match(/Generated receipt PDF for booking (.*)/);
    if (match) return t('adminLogs.actions.generatedReceipt', 'Generated receipt PDF for booking {{id}}', { id: match[1] });
    match = action.match(/Collected payment \$(.*) for booking (.*)/);
    if (match) return t('adminLogs.actions.collectedPayment', 'Collected payment ${{amount}} for booking {{id}}', { amount: match[1], id: match[2] });
    
    // Settings & Backups
    if (action === 'Updated system settings') return t('adminLogs.actions.updatedSettings', 'Updated system settings');
    if (action === 'Downloaded database backup') return t('adminLogs.actions.downloadedBackup', 'Downloaded database backup');
    
    return action;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label className="form-label">{t('adminLogs.searchLabel', 'Search')}</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder={t('adminLogs.searchPlaceholder', 'Search action or user...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px', margin: 0 }}
              />
            </div>
          </div>
          <div>
            <label className="form-label">{t('adminLogs.eventTypeLabel', 'Event Type')}</label>
            <div style={{ position: 'relative' }}>
              <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
              <select 
                className="form-input" 
                value={type}
                onChange={(e) => { setType(e.target.value); setPage(1); }}
                style={{ paddingLeft: '40px', margin: 0 }}
              >
                <option value="all">{t('adminLogs.allEvents', 'All Events')}</option>
                <option value="info">{t('adminLogs.info', 'Info')}</option>
                <option value="success">{t('adminLogs.success', 'Success')}</option>
                <option value="warning">{t('adminLogs.warning', 'Warning')}</option>
                <option value="error">{t('adminLogs.error', 'Error')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">{t('adminLogs.startDate', 'Start Date')}</label>
            <input 
              type="date" 
              className="form-input" 
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              style={{ margin: 0 }}
            />
          </div>
          <div>
            <label className="form-label">{t('adminLogs.endDate', 'End Date')}</label>
            <input 
              type="date" 
              className="form-input" 
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              style={{ margin: 0 }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div className="admin-table-container">
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-container)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{t('adminLogs.event', 'Event')}</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{t('adminLogs.user', 'User')}</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{t('adminLogs.ipAddress', 'IP Address')}</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{t('adminLogs.timestamp', 'Timestamp')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    {t('adminLogs.loadingLogs', 'Loading logs...')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    {t('adminLogs.noLogs', 'No activity logs found.')}
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {getLogIcon(log.type)}
                        <span style={{ fontWeight: 500, color: 'var(--on-background)' }}>{translateLogAction(log.action)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--on-surface-variant)', fontSize: '14px' }}>
                      {log.userEmail}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--on-surface-variant)', fontSize: '14px', fontFamily: 'monospace' }}>
                      {log.ipAddress}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--on-surface-variant)', fontSize: '14px' }}>
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
</div>
        </div>
        
        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>
              {t('adminLogs.showingLogs', 'Showing {{start}} to {{end}} of {{total}} logs', { start: ((page - 1) * 20) + 1, end: Math.min(page * 20, totalLogs), total: totalLogs })}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
                style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary"
                style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
