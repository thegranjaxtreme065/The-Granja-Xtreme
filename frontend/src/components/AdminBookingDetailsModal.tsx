import React, { useEffect, useState } from 'react';
import { X, Ban, FileText, User, Truck, CreditCard, Clock, CheckCircle, ArrowLeft, Printer, PenTool } from 'lucide-react';
import { auth } from '../config/firebase';
import { fetchAPI } from '../utils/api';
import { AdminCollectPaymentModal } from './AdminCollectPaymentModal';
import { SignatureModal } from './SignatureModal';
import { useTranslation } from 'react-i18next';

interface BookingDetailsProps {
  bookingId: string;
  onClose: () => void;
  onUpdate: () => void;
  initialTab?: 'details' | 'receipt' | 'contract';
}

export const AdminBookingDetailsModal: React.FC<BookingDetailsProps> = ({ bookingId, onClose, onUpdate, initialTab }) => {
  const { t } = useTranslation();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'receipt' | 'contract'>(initialTab || 'details');
  const [collectPaymentModalOpen, setCollectPaymentModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [showAdminSignatureModal, setShowAdminSignatureModal] = useState(false);
  const [showCustomerSignatureModal, setShowCustomerSignatureModal] = useState(false);



  const handleCollectPayment = async () => {
    try {
      const data = await fetchAPI(`/bookings/${bookingId}/invoice`);
      setInvoiceData(data);
      setCollectPaymentModalOpen(true);
    } catch (err) {
      alert(t('Failed to fetch invoice details'));
    }
  };

  const handleAdminSignatureComplete = async (url: string) => {
    try {
      await fetchAPI(`/bookings/${bookingId}/admin-signature`, {
        method: 'PUT',
        body: { signatureUrl: url }
      });
      setShowAdminSignatureModal(false);
      loadBooking();
      onUpdate();
    } catch (err: any) {
      alert(err.message || t('Failed to save admin signature.'));
    }
  };

  const handleCustomerSignatureComplete = async (url: string) => {
    try {
      await fetchAPI(`/bookings/${bookingId}/customer-signature`, {
        method: 'PUT',
        body: { signatureUrl: url }
      });
      setShowCustomerSignatureModal(false);
      loadBooking();
      onUpdate();
    } catch (err: any) {
      alert(err.message || t('Failed to save customer signature.'));
    }
  };

  const downloadWaiver = async (lang: 'EN' | 'ES') => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/bookings/${bookingId}/waiver/pdf?lang=${lang}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('PDF fetch failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contract-${bookingId}-${lang}.pdf`;
      a.click();
    } catch (e) {
      alert(t('Waiver not signed or PDF generation failed'));
    }
  };

  const downloadReceipt = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/bookings/${bookingId}/receipt/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('PDF fetch failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${bookingId}.pdf`;
      a.click();
    } catch (e) {
      alert(t('Failed to generate Receipt PDF'));
    }
  };

  const loadBooking = async () => {
    try {
      const data = await fetchAPI(`/bookings/${bookingId}`);
      setBooking(data);
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (err) {
      alert(t('Failed to load booking details'));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const handleCancel = async () => {
    if (!window.confirm(t('Are you sure you want to cancel this booking? This action cannot be undone.'))) return;
    try {
      await fetchAPI(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: { status: 'Cancelled' }
      });
      onUpdate();
      loadBooking();
    } catch (err) {
      alert(t('Failed to cancel booking'));
    }
  };

  const handleDownloadReceipt = () => {
    setActiveTab('receipt');
  };

  const handleDownloadContract = () => {
    setActiveTab('contract');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderReceiptView = () => {
    const b = booking;
    const diffTime = Math.abs(new Date(b.endDate).getTime() - new Date(b.startDate).getTime());
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    const baseRate = days * (b.atvId?.ratePerDay || 0);
    const tax = Math.round(baseRate * 0.1 * 100) / 100; // 10% tax
    const securityDeposit = 150; // Flat deposit
    const accessoriesSum = b.accessories ? b.accessories.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) : 0;
    const extraChargesSum = b.extraCharges ? b.extraCharges.reduce((acc: number, item: any) => acc + Number(item.amount), 0) : 0;
    const refundAmount = b.depositRefunded ? (b.depositRefundedAmount || 0) : 0;
    const total = baseRate + tax + securityDeposit + accessoriesSum + extraChargesSum - refundAmount;

    const isPaid = b.payment?.status === 'Paid' || b.invoice?.status === 'Paid';
    // Use amountPaid from backend if available, otherwise assume total if fully paid, or 0.
    const amountPaid = b.payment?.amountPaid !== undefined ? b.payment.amountPaid : (isPaid ? total : 0);
    const remainingBalance = b.payment?.remainingAmount !== undefined ? b.payment.remainingAmount : (total - amountPaid);

    const durationText = days === 1 ? '1 Day' : `${days} Days`;

    const formatDateTime = (dateString: string) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
    };

    const formatDateOnly = (dateString: string) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const pickupText = b.actualCheckInTime ? formatDateTime(b.actualCheckInTime) : formatDateOnly(b.startDate);
    const returnText = b.actualCheckOutTime ? formatDateTime(b.actualCheckOutTime) : formatDateOnly(b.endDate);

    const user = b.customerId;

    return (
      <div className="admin-modal-scroll" style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
        {/* Top Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px', marginBottom: '32px' }}>
          <button onClick={() => setActiveTab('details')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
            <ArrowLeft size={20} /> {t("Back to Details")}
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', color: '#1e3a8a', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }} onClick={() => window.print()}>
              <Printer size={18} /> {t("Print Receipt")}
            </button>
          </div>
        </div>

        <div className="no-print" style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
          {t("Receipts")} &gt; <span style={{ color: '#396759', fontWeight: 600 }}>TGX-RCP-{new Date(b.startDate).getFullYear()}-{b._id.substring(b._id.length - 4).toUpperCase()}</span>
        </div>

        {/* Invoice Card */}
        <div id="printable-document" style={{ background: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          {/* Card Header */}
          <div className="reduce-print-margin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#396759', letterSpacing: '2px', margin: 0 }}>THE GRANJA</h2>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#396759', letterSpacing: '2px', marginTop: '-4px', marginBottom: '24px' }}>XTREME</h2>
              
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                Calle Los Hidalgos, Sector Majagual<br />
                Sánchez, Samaná, Dominican Republic<br />
                <strong style={{ display: 'block', marginTop: '12px', color: '#111827' }}>+1 809-622-4122</strong>
                <a href="mailto:tgranjaxtreme065@gmail.com" style={{ color: '#396759', textDecoration: 'none' }}>tgranjaxtreme065@gmail.com</a>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              {b.status === 'Cancelled' ? (
                <div style={{ display: 'inline-block', border: '1px solid #9ca3af', color: '#4b5563', background: '#f3f4f6', padding: '4px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
                  {t("CANCELLED")}
                </div>
              ) : isPaid ? (
                <div style={{ display: 'inline-block', border: '1px solid #84cc16', color: '#65a30d', background: '#ecfccb', padding: '4px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
                  {t("PAID")}
                </div>
              ) : (
                <div style={{ display: 'inline-block', border: '1px solid #ef4444', color: '#b91c1c', background: '#fee2e2', padding: '4px 16px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
                  {t("UNPAID")}
                </div>
              )}
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
                {t("Receipt #")}TGX-RCP-{new Date(b.startDate).getFullYear()}-{b._id.substring(b._id.length - 4).toUpperCase()}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                {t("Date & Time:")} <strong>{formatDateTime(b.createdAt || new Date().toISOString())}</strong><br />
              </div>
            </div>
          </div>

          {/* Billed To / Summary */}
          <div className="reduce-print-margin checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '48px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                {t("CUSTOMER DETAILS")}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.8 }}>
                {t("Phone:")} <strong style={{ color: '#111827' }}>{user?.phone || t('Not Provided')}</strong><br />
                {t("Email:")} <strong style={{ color: '#111827' }}>{user?.email}</strong><br />
                {t("Passport / ID:")} <strong style={{ color: '#111827' }}>{user?.passport || (() => {
                  try {
                    const saved = localStorage.getItem('booking_passport');
                    if (!saved) return t('Verified on File');
                    return saved.startsWith('"') ? JSON.parse(saved) : saved;
                  } catch {
                    return localStorage.getItem('booking_passport') || t('Verified on File');
                  }
                })()}</strong>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                {t("RENTAL SUMMARY")}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.8 }}>
                {t("ATV Assigned:")} <strong style={{ color: '#111827' }}>{b.atvId?.name} {b.atvId?.model || ''}</strong><br />
                {t("Pickup:")} <strong style={{ color: '#111827' }}>{pickupText}</strong><br />
                {t("Return:")} <strong style={{ color: '#111827' }}>{returnText}</strong><br />
                {t("Rental Duration:")} <strong style={{ color: '#111827' }}>{t(durationText)}</strong>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="admin-table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '32px' }}>
              <thead>
                <tr style={{ backgroundColor: '#eef2ff' }}>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>{t("Description")}</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textAlign: 'center' }}>{t("Qty")}</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textAlign: 'right' }}>{t("Unit Price")}</th>
                  <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 700, color: '#4f46e5', textAlign: 'right', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>{t("Total")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{t("ATV Rental - ")}{b.atvId?.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{t("Includes standard equipment and safety gear.")}</div>
                  </td>
                  <td style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>{days} {days > 1 ? t('Days') : t('Day')}</td>
                  <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>${(b.atvId?.ratePerDay || 0).toFixed(2)}</td>
                  <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, fontSize: '14px' }}>${baseRate.toFixed(2)}</td>
                </tr>
                {b.accessories && b.accessories.length > 0 && b.accessories.map((acc: any, index: number) => (
                  <tr key={`acc-${index}`}>
                    <td style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{t(acc.name || '')}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{t("Accessory")}</div>
                    </td>
                    <td style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>{acc.quantity || 1}</td>
                    <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>${(acc.price || 0).toFixed(2)}</td>
                    <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, fontSize: '14px' }}>${((acc.price || 0) * (acc.quantity || 1)).toFixed(2)}</td>
                  </tr>
                ))}
                {b.extraCharges && b.extraCharges.length > 0 && b.extraCharges.map((charge: any, index: number) => (
                  <tr key={`charge-${index}`}>
                    <td style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', marginBottom: '4px' }}>{t(charge.reason || '')}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{charge.description ? t(charge.description) : ''}</div>
                    </td>
                    <td style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>1</td>
                    <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '14px' }}>${(Number(charge.amount) || 0).toFixed(2)}</td>
                    <td style={{ padding: '24px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, fontSize: '14px' }}>${(Number(charge.amount) || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="reduce-print-margin" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '48px' }}>
            <div style={{ width: '360px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563' }}>
                <span>{t("ATV Rental - ")} ({days} {days > 1 ? t('Days') : t('Day')})</span>
                <span>${baseRate.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563' }}>
                <span>{t("Luxury Tax (10%)")}</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              {b.accessories && b.accessories.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563' }}>
                  <span>{t("Accessories")}</span>
                  <span>${b.accessories.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toFixed(2)}</span>
                </div>
              )}
              {b.extraCharges && b.extraCharges.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563' }}>
                  <span>{t("Extra Charges")}</span>
                  <span>${b.extraCharges.reduce((acc: number, item: any) => acc + Number(item.amount), 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>
                <span>{t("Security Deposit (Refundable)")}</span>
                <span>${securityDeposit.toFixed(2)}</span>
              </div>
              {b.depositRefunded && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                  <span>{t("Security Deposit Refunded")}</span>
                  <span>-${(b.depositRefundedAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 8px', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                <span>{t("Grand Total")}</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#4b5563' }}>
                <span>{t("Amount Paid")} ({t(b.payment?.method || 'Card/Cash')})</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>-${amountPaid.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', fontSize: '20px', fontWeight: 800, color: remainingBalance > 0 ? '#b91c1c' : '#3f6212', borderTop: '2px solid #e5e7eb', marginTop: '8px' }}>
                <span>{t("REMAINING BALANCE")}</span>
                <span>${remainingBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Signature Space */}
          <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '64px', marginBottom: '24px' }}>
            <div>
              <div style={{ borderBottom: '1px solid #111827', height: '60px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {b.customerSignature ? <img src={b.customerSignature} style={{ maxHeight: '50px' }} alt="Customer Signature" /> : null}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                {t("Customer Signature")} {b.customerSignedAt ? `(${t("Signed:")} ${new Date(b.customerSignedAt).toLocaleDateString()})` : ''}
              </div>
            </div>
            <div>
            </div>
          </div>

          {/* Footer Identifier */}
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace', marginTop: '32px' }}>
            TXN-{Math.random().toString(36).substring(2, 10).toUpperCase()}-A7F2 • {t("OFFICIAL RECEIPT")}
          </div>
        </div>
      </div>
    );
  };

  const renderContractView = () => {
    return (
      <div className="admin-modal-scroll" style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '24px', marginBottom: '32px' }}>
          <button onClick={() => setActiveTab('details')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 700, color: '#111827', cursor: 'pointer' }}>
            <ArrowLeft size={20} /> {t("Contract #")}TGX-CTR-{new Date(booking.startDate).getFullYear()}-{booking._id.substring(booking._id.length - 4).toUpperCase()}
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', color: '#1e3a8a', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => window.print()}>
              <Printer size={18} /> {t("Print")}
            </button>
          </div>
        </div>

        {/* Contract Document */}
        <div id="printable-document" style={{ background: 'white', borderRadius: '4px', padding: '64px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', position: 'relative', color: '#111827' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '64px' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#3f6212', margin: 0 }}>Granja Xtreme</h2>
              <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6, marginTop: '12px' }}>
                Calle Los Hidalgos, Sector Majagual<br />
                Sánchez, Samaná, Dominican Republic<br />
                <strong style={{ display: 'block', marginTop: '12px', color: '#111827' }}>+1 809-622-4122</strong>
                <a href="mailto:tgranjaxtreme065@gmail.com" style={{ color: '#396759', textDecoration: 'none' }}>tgranjaxtreme065@gmail.com</a>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0, marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t("Rental Agreement")}</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '8px 16px', fontSize: '13px', alignItems: 'center' }}>
                <div style={{ color: '#6b7280', textAlign: 'right', fontWeight: 600 }}>{t("DATE:")}</div>
                <div style={{ color: '#111827', fontWeight: 700, textAlign: 'right' }}>{formatDate(booking.startDate)}</div>
                
                <div style={{ color: '#6b7280', textAlign: 'right', fontWeight: 600 }}>{t("CONTRACT ID:")}</div>
                <div style={{ color: '#111827', fontWeight: 700, textAlign: 'right' }}>#TGX-CTR-{new Date(booking.startDate).getFullYear()}-{booking._id.substring(booking._id.length - 4).toUpperCase()}</div>
                
                <div style={{ color: '#6b7280', textAlign: 'right', fontWeight: 600 }}>{t("STATUS:")}</div>
                <div style={{ color: '#15803d', fontWeight: 700, textAlign: 'right' }}>{t("APPROVED")}</div>
              </div>
            </div>
          </div>

          <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '48px' }}>
            {/* Customer Info */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '1px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '20px' }}>{t("I. CUSTOMER INFORMATION")}</div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>{t("Primary Renter")}</div>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: 700 }}>{booking.customerId?.firstName} {booking.customerId?.lastName}</div>
              </div>
              
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>{t("Contact Email")}</div>
                <div style={{ fontSize: '15px', color: '#111827' }}>{booking.customerId?.email}</div>
              </div>
            </div>

            {/* Vehicle Specs */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '1px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '20px' }}>{t("II. VEHICLE SPECIFICATIONS")}</div>
              
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '60px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src="/images/polaris_570.png" alt="ATV" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{booking.atvId?.name}</div>
                  <div style={{ fontSize: '12px', color: '#4b5563', fontStyle: 'italic', marginBottom: '12px' }}>{t("VIN:")} 4XP2024-TR-90112</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', background: '#b4ebd1', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{t("PREMIUM CLASS")}</span>
                    <span style={{ fontSize: '10px', background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{t("GPS TRACKED")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div style={{ marginBottom: '64px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '1px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '20px' }}>{t("III. RENTAL AGREEMENT")}</div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.8, marginBottom: '48px' }}>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>{t("Customer receives the ATV in good condition.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer must have a valid driver’s license.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer must wear a helmet and safety equipment.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("No driving under the influence of alcohol or drugs.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer is responsible for any traffic violations or fines.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer is responsible for damages caused by negligence or misuse.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer may not lend, transfer, or sub-rent the ATV to another person.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("ATV must be returned on the agreed date and time.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Late returns may result in additional charges.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Granja Xtreme is not responsible for lost personal belongings.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Customer acknowledges and accepts the risks associated with ATV riding.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("In case of an accident, customer must notify Granja Xtreme immediately.")}</li>
                <li style={{ marginBottom: '8px' }}>{t("Security deposit amount (if applicable).")}</li>
                <li style={{ marginBottom: '8px' }}>{t("ATV number and vehicle information.")}</li>
              </ul>
            </div>

            <div style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '1px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '20px' }}>{t("IV. INSURANCE AND CUSTOMER RESPONSIBILITY")}</div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}>{t("The customer understands and agrees that any insurance available for the ATV provides coverage only as required by law and subject to the limits, conditions, and exclusions of the insurance policy.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("The customer acknowledges that such insurance may not cover all damages to the ATV, nor all property damage, bodily injury, or losses caused to third parties.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("The customer shall be fully responsible for any damage, loss, broken parts, mechanical damage, rollover, accident, misuse, negligence, reckless operation, or violation of this rental agreement occurring during the rental period.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("The customer shall also be responsible for any deductible, repair costs, loss of use, towing charges, recovery expenses, administrative fees, or any other costs not covered by the insurance policy.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("If damages or injuries caused to third parties exceed the insurance coverage limits or are excluded from coverage, the customer shall be solely responsible for such damages, claims, expenses, legal fees, and liabilities.")}</p>
              <p style={{ marginBottom: '16px' }}>{t("The customer agrees to operate the ATV at their own risk and releases Granja Xtreme, its owners, employees, and representatives from liability for accidents, injuries, damages, or losses resulting from the customer’s negligence, misuse, violation of safety rules, or breach of this rental agreement.")}</p>
            </div>
          </div>

          {/* Manual Signature Space */}
          <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '64px', marginBottom: '64px' }}>
            <div>
              <div style={{ borderBottom: '1px solid #111827', height: '60px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {booking.customerSignature ? <img src={booking.customerSignature} style={{ maxHeight: '50px' }} alt="Customer Signature" /> : null}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                {t("Customer Signature")} {booking.customerSignedAt ? `(${t("Signed:")} ${new Date(booking.customerSignedAt).toLocaleDateString()})` : ''}
              </div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #111827', height: '60px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {booking.adminSignature ? <img src={booking.adminSignature} style={{ maxHeight: '50px' }} alt="Admin Signature" /> : null}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                {t("Company Representative")} {booking.adminSignedAt ? `(${t("Signed:")} ${new Date(booking.adminSignedAt).toLocaleDateString()})` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', color: '#64748b', fontWeight: 600 }}>{t("Loading Details...")}</div>
    </div>
  );

  if (!booking) return null;

  const diffTime = Math.abs(new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime());
  const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const baseRate = days * (booking.atvId?.ratePerDay || 0);
  const tax = Math.round(baseRate * 0.1 * 100) / 100; // 10% tax
  const securityDeposit = 150; // Flat deposit
  const accessoriesSum = booking.accessories ? booking.accessories.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) : 0;
  const extraChargesSum = booking.extraCharges ? booking.extraCharges.reduce((acc: number, item: any) => acc + Number(item.amount), 0) : 0;
  const refundAmount = booking.depositRefunded ? (booking.depositRefundedAmount || 0) : 0;
  const total = baseRate + tax + securityDeposit + accessoriesSum + extraChargesSum - refundAmount;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return { bg: '#fef3c7', text: '#b45309' };
      case 'Reserved':
      case 'Active': return { bg: '#ecfccb', text: '#4d7c0f' };
      case 'Completed': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'Cancelled': return { bg: '#fee2e2', text: '#b91c1c' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };
  const statusColors = getStatusColor(booking.status);
  const formattedId = `BK-${booking._id.substring(booking._id.length - 6).toUpperCase()}`;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 15mm; }
          body { 
            overflow: visible !important; 
          }
          /* Hide everything outside the modal */
          body > :not(#root) { display: none; }
          
          .admin-modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            background: white !important;
            display: block !important;
            backdrop-filter: none !important;
          }
          .admin-modal-content {
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            background: white !important;
            display: block !important;
          }
          .admin-modal-scroll, .admin-table-container {
            overflow: visible !important;
            height: auto !important;
            display: block !important;
          }
          #printable-document {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
        }
        @media (max-width: 640px) {
          #printable-document {
            padding: 24px !important;
          }
        }
      `}</style>
      <div className="admin-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
        <div className="admin-modal-content" style={{ width: '800px', maxHeight: '90vh', backgroundColor: '#f8fafc', borderRadius: '16px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div className="no-print" style={{ padding: '24px 32px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{t("Booking ")}{formattedId}</h2>
              <span style={{ backgroundColor: statusColors.bg, color: statusColors.text, padding: '4px 12px', borderRadius: '24px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {t(booking.status)}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Created {new Date(booking.createdAt).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        {/* Content */}
        {activeTab === 'details' && (
          <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
            
            {/* Action Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button onClick={handleDownloadReceipt} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                <FileText size={18} /> {t("View Receipt / Invoice")}
              </button>
              <button onClick={handleDownloadContract} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                <FileText size={18} /> {t("View Contract/Waiver")}
              </button>
            {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
              <button onClick={handleCancel} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', color: '#b91c1c', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <Ban size={18} /> {t("Cancel Booking")}
              </button>
            )}
          </div>

          <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Customer Details */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b', fontWeight: 800, fontSize: '16px' }}>
                <User size={20} color="#3b82f6" /> {t("Customer Information")}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Name")}</span> <strong>{booking.customerId?.firstName} {booking.customerId?.lastName}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Email")}</span> <strong>{booking.customerId?.email}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Phone")}</span> <strong>{booking.customerId?.phone}</strong></div>
              </div>
            </div>

            {/* ATV Details */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b', fontWeight: 800, fontSize: '16px' }}>
                <Truck size={20} color="#10b981" /> {t("Vehicle Assigned")}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Model")}</span> <strong>{booking.atvId?.name} {booking.atvId?.model}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Rate")}</span> <strong>${booking.atvId?.ratePerDay}{t("/day")}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Schedule")}</span> 
                  <strong style={{ textAlign: 'right' }}>
                    {booking.actualCheckInTime 
                      ? `${new Date(booking.actualCheckInTime).toLocaleDateString()} ${new Date(booking.actualCheckInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${t("(Checked-In)")}`
                      : `${new Date(booking.startDate).toLocaleDateString()} ${t("(Scheduled Start)")}`} <br/>
                    to {booking.actualCheckOutTime 
                      ? `${new Date(booking.actualCheckOutTime).toLocaleDateString()} ${new Date(booking.actualCheckOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${t("(Checked-Out)")}`
                      : `${new Date(booking.endDate).toLocaleDateString()} ${t("(Scheduled End)")}`}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Pricing Breakdown */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b', fontWeight: 800, fontSize: '16px' }}>
                <FileText size={20} color="#8b5cf6" /> {t("Financial Breakdown")}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Base Rate")}</span> <span>${baseRate.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Tax (10%)")}</span> <span>${tax.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Security Deposit")}</span> <span>${securityDeposit.toFixed(2)}</span></div>
                {booking.accessories && booking.accessories.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Accessories")}</span> <span>${booking.accessories.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toFixed(2)}</span></div>
                )}
                {booking.extraCharges && booking.extraCharges.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Extra Charges")}</span> <span>${booking.extraCharges.reduce((acc: number, item: any) => acc + Number(item.amount), 0).toFixed(2)}</span></div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Discount")}</span> <span style={{ color: '#10b981' }}>-$0.00</span></div>
                {booking.depositRefunded && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#059669', fontWeight: 600 }}>{t("Deposit Refunded")}</span> <span style={{ color: '#059669', fontWeight: 600 }}>-${(booking.depositRefundedAmount || 0).toFixed(2)}</span></div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  <span>{t("Total Cost")}</span> <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b', fontWeight: 800, fontSize: '16px' }}>
                <CreditCard size={20} color="#f59e0b" /> {t("Payment Status")}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                {booking.payment?.status === 'Paid' ? (
                  <><CheckCircle size={24} color="#10b981" /> <span style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{t("Paid in Full")}</span></>
                ) : booking.status === 'Cancelled' ? (
                  <><Ban size={24} color="#ef4444" /> <span style={{ fontSize: '16px', fontWeight: 800, color: '#b91c1c' }}>{t("Payment Cancelled")}</span></>
                ) : (
                  <><Clock size={24} color="#f59e0b" /> <span style={{ fontSize: '16px', fontWeight: 800, color: '#d97706' }}>{t("Unpaid")}</span></>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Method")}</span> <strong>{t(booking.payment?.method || 'Pending')}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Amount Paid")}</span> <strong style={{ color: '#10b981' }}>${(booking.payment?.amountPaid || 0).toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{t("Balance Remaining")}</span> <strong style={{ color: '#ef4444' }}>${(booking.payment?.remainingAmount !== undefined ? booking.payment.remainingAmount : total).toFixed(2)}</strong></div>
              </div>

              {booking.status !== 'Cancelled' && booking.payment?.status !== 'Paid' && (
                <button 
                  onClick={async () => {
                    try {
                      // Fetch invoices to find the one for this booking
                      const invData = await fetchAPI('/invoices');
                      const unpaid = invData.find((inv: any) => inv.bookingId === bookingId && inv.status !== 'Paid');
                      if (unpaid) {
                        setInvoiceData(unpaid);
                        setCollectPaymentModalOpen(true);
                      } else {
                        // Fallback invoice data based on booking totals if not directly linked
                        setInvoiceData({
                          _id: '',
                          bookingId: bookingId,
                          balance: booking.payment?.remainingAmount !== undefined ? booking.payment.remainingAmount : total,
                          amount: total
                        });
                        setCollectPaymentModalOpen(true);
                      }
                    } catch (e) {
                      console.error("Failed to load invoice", e);
                    }
                  }}
                  style={{ width: '100%', padding: '12px', marginTop: '16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {t("Collect Payment Manually")}
                </button>
              )}
            </div>
          </div>

          {/* Signatures Section */}
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b', fontWeight: 800, fontSize: '16px' }}>
              <PenTool size={20} color="#0891b2" /> {t("Digital Signatures")}
            </div>
            <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {t("Customer Signature")}
                  {booking.customerSignature && (
                    <button onClick={() => setShowCustomerSignatureModal(true)} style={{ background: 'none', border: 'none', color: '#0891b2', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <PenTool size={12} /> {t("Update")}
                    </button>
                  )}
                </div>
                {booking.customerSignature ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={booking.customerSignature} alt="Customer Signature" style={{ height: '60px', objectFit: 'contain' }} />
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                      {t("Signed:")} {new Date(booking.customerSignedAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <span>{t("Awaiting Customer Signature")}</span>
                    <button onClick={() => setShowCustomerSignatureModal(true)} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px', backgroundColor: '#0891b2', border: 'none' }}>
                      {t("Sign Now")}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {t("Representative Signature")}
                  {booking.adminSignature && (
                    <button onClick={() => setShowAdminSignatureModal(true)} style={{ background: 'none', border: 'none', color: '#0891b2', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <PenTool size={12} /> {t("Update")}
                    </button>
                  )}
                </div>
                {booking.adminSignature ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={booking.adminSignature} alt="Admin Signature" style={{ height: '60px', objectFit: 'contain' }} />
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                      {t("Signed:")} {new Date(booking.adminSignedAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <span>{t("Not Signed Yet")}</span>
                    <button onClick={() => setShowAdminSignatureModal(true)} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px', backgroundColor: '#0891b2', border: 'none' }}>
                      {t("Approve & Sign")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        )}
        
        {activeTab === 'receipt' && renderReceiptView()}
        {activeTab === 'contract' && renderContractView()}
      </div>

      <SignatureModal 
        isOpen={showAdminSignatureModal}
        onClose={() => setShowAdminSignatureModal(false)}
        onComplete={handleAdminSignatureComplete}
        title="Company Representative Signature"
        subtitle="Please provide your signature to approve and countersign the contract."
      />

      <SignatureModal 
        isOpen={showCustomerSignatureModal}
        onClose={() => setShowCustomerSignatureModal(false)}
        onComplete={handleCustomerSignatureComplete}
        title="Customer Signature"
        subtitle="Please provide the customer signature for the contract."
      />

      {collectPaymentModalOpen && invoiceData && (
        <AdminCollectPaymentModal
          invoice={invoiceData}
          onClose={() => setCollectPaymentModalOpen(false)}
          onSuccess={() => {
            loadBooking();
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </div>
    </>
  );
};
