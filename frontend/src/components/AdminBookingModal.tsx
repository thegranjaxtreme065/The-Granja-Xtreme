import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, User, Truck, CheckCircle2, PenTool } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { SignatureModal } from './SignatureModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTranslation } from 'react-i18next';
import { formatAtvName } from '../utils/formatAtv';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ATV {
  _id: string;
  name: string;
  nameEs?: string;
  model: string;
  unitNumber?: string;
  color?: string;
  ratePerDay: number;
}

export const AdminBookingModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [atvs, setAtvs] = useState<ATV[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedAtvId, setSelectedAtvId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cData, aData] = await Promise.all([
          fetchAPI('/auth/customers'),
          fetchAPI('/atvs')
        ]);
        setCustomers(cData);
        setAtvs(aData);
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  const calculateTotal = () => {
    if (!startDate || !endDate || !selectedAtvId) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return 0; // Invalid date range

    const days = Math.max(1, Math.ceil(diffTime / (1000 * 3600 * 24)));
    const atv = atvs.find(a => a._id === selectedAtvId);
    if (!atv) return 0;

    const baseRate = days * atv.ratePerDay;
    const tax = Math.round(baseRate * 0.1 * 100) / 100; // 10% tax
    const securityDeposit = 150; // Flat deposit
    return baseRate + tax + securityDeposit;
  };

  const handleReviewConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAPI(`/atvs/${selectedAtvId}/availability?start=${startDate}&end=${endDate}`);
      if (!result.available) {
        setError(result.reason || 'This ATV is already booked or unavailable for the selected dates.');
        return;
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to check availability');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const newBooking = await fetchAPI('/bookings/admin-create', {
        method: 'POST',
        body: {
          customerId: selectedCustomerId,
          atvId: selectedAtvId,
          startDate,
          endDate,
          notes
        }
      });
      setCreatedBookingId(newBooking._id);
      setShowSignature(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureComplete = async (url: string) => {
    try {
      await fetchAPI(`/bookings/${createdBookingId}/customer-signature`, {
        method: 'PUT',
        body: { signatureUrl: url }
      });
      setShowSignature(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save signature');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', padding: '32px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>New Reservation</h2>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <div style={{ flex: 1, height: '4px', backgroundColor: step >= 1 ? '#84cc16' : '#e2e8f0', borderRadius: '2px' }} />
          <div style={{ flex: 1, height: '4px', backgroundColor: step >= 2 ? '#84cc16' : '#e2e8f0', borderRadius: '2px' }} />
          <div style={{ flex: 1, height: '4px', backgroundColor: step >= 3 ? '#84cc16' : '#e2e8f0', borderRadius: '2px' }} />
        </div>

        {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>{error}</div>}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}><User size={16} /> Select Customer</label>
              <select 
                value={selectedCustomerId} 
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              >
                <option value="">-- Choose a customer --</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.firstName} {c.lastName} ({c.email})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                disabled={!selectedCustomerId}
                onClick={() => setStep(2)}
                style={{ backgroundColor: selectedCustomerId ? '#4d7c0f' : '#94a3b8', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: selectedCustomerId ? 'pointer' : 'not-allowed' }}
              >Next Step</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}><Truck size={16} /> Select Vehicle</label>
              <select 
                value={selectedAtvId} 
                onChange={(e) => setSelectedAtvId(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              >
                <option value="">-- {t('Choose a vehicle')} --</option>
                {atvs.map(a => {
                  const displayName = i18n.language?.startsWith('es') ? (a.nameEs || a.name) : a.name;
                  return <option key={a._id} value={a._id}>{formatAtvName({...a, name: displayName})} - ${a.ratePerDay}/{t('day')}</option>;
                })}
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}><CalendarIcon size={16} /> Select Dates</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <DatePicker
                    selected={startDate ? new Date(`${startDate}T12:00:00`) : null}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const val = `${year}-${month}-${day}`;
                        setStartDate(val);
                        if (endDate && val > endDate) {
                          setEndDate(val);
                        }
                      } else {
                        setStartDate('');
                      }
                    }}
                    minDate={new Date()}
                    dateFormat={i18n.language?.startsWith('es') ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                    placeholderText="Start Date"
                    customInput={<input style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />}
                  />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <DatePicker
                    selected={endDate ? new Date(`${endDate}T12:00:00`) : null}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const val = `${year}-${month}-${day}`;
                        setEndDate(val);
                      } else {
                        setEndDate('');
                      }
                    }}
                    minDate={startDate ? new Date(`${startDate}T12:00:00`) : undefined}
                    dateFormat={i18n.language?.startsWith('es') ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                    placeholderText="End Date"
                    customInput={<input style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Back</button>
              <button 
                disabled={!selectedAtvId || !startDate || !endDate || loading}
                onClick={handleReviewConfirm}
                style={{ backgroundColor: (selectedAtvId && startDate && endDate && !loading) ? '#4d7c0f' : '#94a3b8', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: (selectedAtvId && startDate && endDate && !loading) ? 'pointer' : 'not-allowed' }}
              >{loading ? 'Checking...' : 'Review & Confirm'}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Total Price (inc. Tax)</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>Admin Notes (Optional)</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="Walk-in, phone booking, etc."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', minHeight: '80px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Back</button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                style={{ backgroundColor: '#84cc16', color: '#0f172a', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PenTool size={18} /> {loading ? 'Processing...' : 'Sign & Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showSignature && (
        <SignatureModal
          isOpen={showSignature}
          onClose={() => { setShowSignature(false); onSuccess(); }} // Booking is created, so we refresh dashboard even if they cancel signature
          onComplete={handleSignatureComplete}
          title="Customer Signature Required"
          subtitle="Please have the customer sign below to authorize and confirm the reservation."
        />
      )}
    </div>
  );
};
