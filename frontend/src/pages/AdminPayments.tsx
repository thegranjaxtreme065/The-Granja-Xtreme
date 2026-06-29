import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Search, Filter, AlertCircle, TrendingUp, CreditCard, Download, Eye, Printer } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { AdminCollectPaymentModal } from '../components/AdminCollectPaymentModal';
import { AdminBookingDetailsModal } from '../components/AdminBookingDetailsModal';
import { auth } from '../config/firebase';
import { useTranslation } from 'react-i18next';
import { formatAtvName } from '../utils/formatAtv';

export function AdminPayments() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState<string | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const invData = await fetchAPI('/invoices');
      const payData = await fetchAPI('/invoices/payments');
      setInvoices(invData);
      setPayments(payData);
    } catch (err) {
      console.error('Failed to load payments data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalOutstanding = invoices
    .filter(inv => inv.bookingId?.status !== 'Cancelled')
    .reduce((acc, inv) => acc + (inv.balance || 0), 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysCollections = payments
    .filter(p => new Date(p.createdAt || p.collectionDate) >= today)
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyCollections = payments
    .filter(p => new Date(p.createdAt || p.collectionDate) >= firstDayOfMonth)
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  const unpaidCount = invoices.filter(inv => inv.status !== 'Paid' && inv.bookingId?.status !== 'Cancelled').length;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* KPI Cards */}
        <div className="admin-grid-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {/* Outstanding Balance - Premium Dark */}
          <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>{t('adminPayments.outstandingBalance', 'Outstanding Balance')}</span>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '8px' }}>
                <AlertCircle size={16} color="#ef4444" />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', marginBottom: '16px', position: 'relative' }}>${totalOutstanding.toFixed(2)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#ef4444', position: 'relative' }}>
              <AlertCircle size={14} /> {t('adminPayments.requiresAttention', 'Requires attention')}
            </div>
          </div>

          {/* Today's Collections */}
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{t('adminPayments.todaysCollections', "Today's Collections")}</span>
              <div style={{ backgroundColor: '#f0fdf4', padding: '6px', borderRadius: '8px' }}>
                <DollarSign size={16} color="#16a34a" />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>${todaysCollections.toFixed(2)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
              <TrendingUp size={14} /> {t('adminPayments.processedToday', 'Processed today')}
            </div>
          </div>

          {/* Monthly Collections */}
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{t('adminPayments.monthlyCollections', 'Monthly Collections')}</span>
              <div style={{ backgroundColor: '#eef2ff', padding: '6px', borderRadius: '8px' }}>
                <TrendingUp size={16} color="#4f46e5" />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>${monthlyCollections.toFixed(2)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#4f46e5' }}>
              <TrendingUp size={14} /> {t('adminPayments.currentMonthTotal', 'Current month total')}
            </div>
          </div>

          {/* Unpaid Invoices */}
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>{t('adminPayments.unpaidInvoices', 'Unpaid Invoices')}</span>
              <div style={{ backgroundColor: '#fffbeb', padding: '6px', borderRadius: '8px' }}>
                <FileText size={16} color="#d97706" />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>{unpaidCount}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#d97706' }}>
              <FileText size={14} /> {t('adminPayments.pendingResolution', 'Pending resolution')}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={20} />
              <input 
                type="text" 
                placeholder={t('adminPayments.searchPlaceholder', "Search by invoice #, customer, or phone...")} 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'All', value: 'All' },
                { label: 'Unpaid', value: 'Unpaid' },
                { label: 'Paid', value: 'Paid' },
                { label: 'Partially Paid', value: 'Partially Paid' },
                { label: 'Rental Charges', value: 'Rental Charges' },
                { label: 'Damage Charges', value: 'Damage Charges' }
              ].map(f => (
                <button 
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${filter === f.value ? 'var(--primary)' : '#e2e8f0'}`,
                    backgroundColor: filter === f.value ? 'var(--primary)' : 'white',
                    color: filter === f.value ? 'white' : '#475569',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  {t(`adminPayments.filter${f.value.replace(/\s+/g, '')}`, f.label)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
          <div className="admin-table-container">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{t('adminPayments.invoiceNum', 'Invoice #')}</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{t('adminPayments.customer', 'Customer')}</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{t('adminPayments.atvType', 'ATV / Type')}</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{t('adminPayments.amount', 'Amount')}</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{t('adminPayments.balance', 'Balance')}</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{t('adminPayments.status', 'Status')}</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{t('adminPayments.method', 'Method')}</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#374151' }}>{t('adminPayments.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filteredInvoices = invoices.filter(inv => {
                  if (filter === 'Unpaid' && (inv.status !== 'Unpaid' && inv.status !== 'Draft')) return false;
                  if (filter === 'Paid' && inv.status !== 'Paid') return false;
                  if (filter === 'Partially Paid' && inv.status !== 'Partially Paid') return false;
                  if (filter === 'Rental Charges' && inv.invoiceType !== 'Rental Charge') return false;
                  if (filter === 'Damage Charges' && inv.invoiceType !== 'Damage Charge') return false;
                  
                  if (search) {
                    const searchLower = search.toLowerCase();
                    if (!inv.invoiceNumber?.toLowerCase().includes(searchLower) &&
                        !inv.customerId?.firstName?.toLowerCase().includes(searchLower) &&
                        !inv.customerId?.lastName?.toLowerCase().includes(searchLower) &&
                        !inv.customerId?.phone?.includes(searchLower)) {
                      return false;
                    }
                  }
                  return true;
                });

                if (filteredInvoices.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                        {t('adminPayments.noInvoices', 'No invoices match the current filter.')}
                      </td>
                    </tr>
                  );
                }

                return filteredInvoices.map((inv) => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--primary)' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '1rem' }}>
                    <div>{inv.customerId?.firstName} {inv.customerId?.lastName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{inv.customerId?.phone}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>{formatAtvName(inv.atvId)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t(inv.invoiceType || '')}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>${inv.amount.toFixed(2)}</td>
                  <td style={{ padding: '1rem', color: inv.balance > 0 ? '#ef4444' : '#111827', fontWeight: '500' }}>
                    ${inv.balance.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: inv.bookingId?.status === 'Cancelled' ? '#fee2e2' : inv.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                        color: inv.bookingId?.status === 'Cancelled' ? '#991b1b' : inv.status === 'Paid' ? '#166534' : '#b45309'
                      }}>
                        {inv.bookingId?.status === 'Cancelled' ? t('adminPayments.cancelled', 'Cancelled') as string : t(`adminPayments.status${inv.status.replace(/\s+/g, '')}`, inv.status) as string}
                      </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#6b7280' }}>
                    {(() => {
                      const invPayments = payments.filter(p => {
                        const pid = p.invoiceId?._id || p.invoiceId;
                        const iid = inv._id;
                        return String(pid) === String(iid) && p.paymentMethod !== 'Refund';
                      });
                      if (invPayments.length > 0) {
                        return t(invPayments[0].paymentMethod || 'Paid');
                      }
                      if (inv.bookingId?.payment?.method) {
                        return t(inv.bookingId.payment.method);
                      }
                      return inv.status === 'Unpaid' || inv.status === 'Draft' ? t('adminPayments.onArrival', 'On Arrival') : t('adminPayments.unknown', 'Unknown');
                    })()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => setDetailsModalOpen(inv.bookingId?._id || inv.bookingId)}
                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer', color: '#374151' }} 
                        title={t('adminPayments.viewDetails', "View Details")}
                      >
                        <Eye size={16} />
                      </button>
                      {inv.status !== 'Paid' && inv.bookingId?.status !== 'Cancelled' && (
                        <button 
                          onClick={() => setSelectedInvoice(inv)}
                          style={{ padding: '0.5rem', border: '1px solid var(--primary)', borderRadius: '4px', background: 'var(--primary)', cursor: 'pointer', color: 'white' }} 
                          title={t('adminPayments.collectPayment', "Collect Payment")}
                        >
                          <CreditCard size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => setReceiptModalOpen(inv.bookingId?._id || inv.bookingId)}
                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer', color: '#374151' }} 
                        title={t('adminPayments.viewPrintReceipt', "View & Print Receipt")}
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                ));
              })()}
            </tbody>
          </table>
</div>
        </div>
      </div>
      {selectedInvoice && (
        <AdminCollectPaymentModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={loadData}
        />
      )}
      {detailsModalOpen && (
        <AdminBookingDetailsModal 
          bookingId={detailsModalOpen} 
          onClose={() => setDetailsModalOpen(null)} 
          onUpdate={loadData} 
        />
      )}
      {receiptModalOpen && (
        <AdminBookingDetailsModal 
          bookingId={receiptModalOpen} 
          onClose={() => setReceiptModalOpen(null)} 
          onUpdate={loadData}
          initialTab="receipt"
        />
      )}
    </>
  );
}
