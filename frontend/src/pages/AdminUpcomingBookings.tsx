import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../utils/api';
import { Calendar, Truck, User, ArrowRight, CheckCircle, Search, FileText, Package } from 'lucide-react';
import { AdminBookingDetailsModal } from '../components/AdminBookingDetailsModal';
import { useTranslation } from 'react-i18next';

interface ExtraCharge {
  reason: string;
  description: string;
  amount: number;
}

interface Accessory {
  _id: string;
  name: string;
  nameEs?: string;
  price: number;
}

interface Booking {
  _id: string;
  startDate: string;
  endDate: string;
  status: 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';
  atvId: { _id: string; name: string; model: string; ratePerDay: number; images: string[] };
  customerId: { _id: string; firstName: string; lastName: string; email: string; phone: string };
  notes?: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  extraCharges?: ExtraCharge[];
  finalTotal?: number;
}

export const AdminUpcomingBookings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Active'>('All');
  const [search, setSearch] = useState('');

  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  const [checkInNotes, setCheckInNotes] = useState('');
  
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [chargeReason, setChargeReason] = useState('Damage');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [processRefund, setProcessRefund] = useState(true);

  const [availableAccessories, setAvailableAccessories] = useState<Accessory[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<{ accessoryId: string; name: string; quantity: number; price: number }[]>([]);

  const [detailsModalOpen, setDetailsModalOpen] = useState<string | null>(null);

  const loadAccessories = async () => {
    try {
      const data = await fetchAPI('/accessories');
      setAvailableAccessories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBookings = async () => {
    try {
      const data = await fetchAPI('/bookings');
      // Show only operational statuses
      setBookings(data.filter((b: any) => ['Pending', 'Reserved', 'Upcoming', 'Active', 'Completed'].includes(b.status)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    loadAccessories();
  }, []);

  const openCheckIn = (b: Booking) => {
    setActiveBooking(b);
    setCheckInNotes(b.notes || '');
    setSelectedAccessories([]);
    setCheckInModalOpen(true);
  };

  const openCheckOut = (b: Booking) => {
    setActiveBooking(b);
    setExtraCharges([]);
    setProcessRefund(true);
    setCheckOutModalOpen(true);
  };

  const addExtraCharge = () => {
    if (!chargeDescription || !chargeAmount) return;
    setExtraCharges([...extraCharges, { reason: chargeReason, description: chargeDescription, amount: Number(chargeAmount) }]);
    setChargeDescription('');
    setChargeAmount('');
  };

  const removeCharge = (index: number) => {
    setExtraCharges(extraCharges.filter((_, i) => i !== index));
  };

  const handleCheckIn = async () => {
    if (!activeBooking) return;
    try {
      const mappedAccessories = selectedAccessories.map(acc => ({
        ...acc,
        accessoryId: acc.accessoryId // Make sure the backend expects accessoryId mapping properly
      }));

      await fetchAPI(`/bookings/${activeBooking._id}/checkin`, {
        method: 'POST',
        body: { 
          actualCheckInTime: new Date().toISOString(), 
          notes: checkInNotes,
          accessories: mappedAccessories.length > 0 ? mappedAccessories : undefined
        }
      });
      setCheckInModalOpen(false);
      loadBookings();
    } catch (e) {
      alert(t('Failed to check in'));
    }
  };

  const handleCheckOut = async () => {
    if (!activeBooking) return;
    try {
      await fetchAPI(`/bookings/${activeBooking._id}/checkout`, {
        method: 'POST',
        body: { actualCheckOutTime: new Date().toISOString(), extraCharges, processRefund }
      });
      setCheckOutModalOpen(false);
      loadBookings();
    } catch (e) {
      alert(t('Failed to check out'));
    }
  };

  const filteredBookings = bookings.filter(b => {
    // Treat 'Pending' or 'Reserved' as 'Upcoming' for operations workflow
    const currentStatus = (b.status === ('Pending' as any) || b.status === ('Reserved' as any)) ? 'Upcoming' : b.status;
    
    if (filter !== 'All' && currentStatus !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (!b.customerId?.firstName?.toLowerCase().includes(searchLower) &&
          !b.customerId?.lastName?.toLowerCase().includes(searchLower) &&
          !b._id.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid #e2e8f0' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
          <input 
            type="text" 
            placeholder={t("Search by customer name or Booking ID...")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          {['All', 'Upcoming', 'Active'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              style={{
                padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                backgroundColor: filter === f ? 'white' : 'transparent',
                color: filter === f ? '#0f172a' : '#64748b',
                boxShadow: filter === f ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {t(f)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="admin-table-container">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t("Booking ID")}</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t("Customer")}</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t("ATV")}</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t("Schedule")}</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t("Status")}</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>{t("Loading operations...")}</td></tr>
            ) : filteredBookings.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>{t("No bookings match the current filter.")}</td></tr>
            ) : (
              filteredBookings.map(b => {
                const isUpcoming = b.status === ('Pending' as any) || b.status === ('Reserved' as any) || b.status === 'Upcoming';
                const isActive = b.status === 'Active';
                const isCompleted = b.status === 'Completed';

                return (
                  <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>
                      {b._id.substring(b._id.length - 6).toUpperCase()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                          {b.customerId?.firstName?.[0]}{b.customerId?.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{b.customerId?.firstName} {b.customerId?.lastName}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{b.customerId?.phone || b.customerId?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        <Truck size={16} color="#94a3b8" /> {b.atvId?.name} {b.atvId?.model}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        <Calendar size={16} color="#94a3b8" /> 
                        {new Date(b.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {new Date(b.startDate).toDateString() !== new Date(b.endDate).toDateString() && ` - ${new Date(b.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap',
                        backgroundColor: b.status === 'Cancelled' ? '#fee2e2' : isUpcoming ? '#fef3c7' : isActive ? '#ecfccb' : isCompleted ? '#e0e7ff' : '#f1f5f9',
                        color: b.status === 'Cancelled' ? '#b91c1c' : isUpcoming ? '#b45309' : isActive ? '#4d7c0f' : isCompleted ? '#4338ca' : '#475569'
                      }}>
                        {b.status === 'Cancelled' ? t('CANCELLED') : isUpcoming ? t('UPCOMING') : t(b.status.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                        <button 
                          onClick={() => setDetailsModalOpen(b._id)}
                          style={{ padding: '6px 12px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          {t("View")}
                        </button>
                        {isUpcoming && (
                          <button 
                            onClick={() => openCheckIn(b)}
                            style={{ padding: '6px 12px', backgroundColor: '#4d7c0f', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {t("Check-In")}
                          </button>
                        )}
                        {isActive && (
                          <button 
                            onClick={() => openCheckOut(b)}
                            style={{ padding: '6px 12px', backgroundColor: '#f59e0b', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {t("Check-Out")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
</div>
      </div>

      {/* CHECK-IN MODAL */}
      {checkInModalOpen && activeBooking && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800 }}>{t("Check-In Workflow")}</h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>{t("Process the customer arrival and hand over the ATV.")}</p>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#64748b' }}>{t("Customer:")}</span>
                <span style={{ fontWeight: 700 }}>{activeBooking.customerId?.firstName} {activeBooking.customerId?.lastName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#64748b' }}>{t("ATV:")}</span>
                <span style={{ fontWeight: 700 }}>{activeBooking.atvId?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#64748b' }}>{t("Actual Start Time:")}</span>
                <span style={{ fontWeight: 700, color: '#4d7c0f' }}>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{t("Pre-Ride Notes")}</label>
              <textarea 
                value={checkInNotes}
                onChange={e => setCheckInNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit' }}
                placeholder={t("E.g. Verified license and waiver.")}
              />
            </div>

            {/* Accessories Section */}
            {availableAccessories.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={16} /> {t("Add Accessories")}
                </h3>
                
                {selectedAccessories.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {selectedAccessories.map((acc, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{acc.name} - ${acc.price.toFixed(2)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{t("Qty:")}</span>
                            <input 
                              type="number" 
                              min="1" 
                              value={acc.quantity} 
                              onChange={(e) => {
                                const newQty = Math.max(1, parseInt(e.target.value) || 1);
                                setSelectedAccessories(selectedAccessories.map((a, i) => i === index ? { ...a, quantity: newQty } : a));
                              }}
                              style={{ width: '50px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                            />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '50px', textAlign: 'right' }}>${(acc.price * acc.quantity).toFixed(2)}</span>
                          <button onClick={() => setSelectedAccessories(selectedAccessories.filter((_, i) => i !== index))} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{t("Remove")}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const accessory = availableAccessories.find(a => a._id === e.target.value);
                      if (accessory) {
                        const exists = selectedAccessories.find(a => a.accessoryId === accessory._id);
                        if (exists) {
                          setSelectedAccessories(selectedAccessories.map(a => a.accessoryId === accessory._id ? { ...a, quantity: a.quantity + 1 } : a));
                        } else {
                          const accName = i18n.language === 'es' ? (accessory.nameEs || accessory.name) : accessory.name;
                          setSelectedAccessories([...selectedAccessories, { accessoryId: accessory._id, name: accName, price: accessory.price, quantity: 1 }]);
                        }
                      }
                      e.target.value = "";
                    }}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="">{t("-- Select Accessory --")}</option>
                    {availableAccessories.map(a => {
                      const accName = i18n.language === 'es' ? (a.nameEs || a.name) : a.name;
                      return <option key={a._id} value={a._id}>{accName} (${a.price.toFixed(2)})</option>;
                    })}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setCheckInModalOpen(false)} style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t("Cancel")}</button>
              <button onClick={handleCheckIn} style={{ padding: '10px 24px', backgroundColor: '#4d7c0f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>{t("Confirm Check-In")}</button>
            </div>
          </div>
        </div>
      )}

      {/* CHECK-OUT MODAL */}
      {checkOutModalOpen && activeBooking && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800 }}>{t("Check-Out Workflow")}</h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>{t("Process the customer return and log any extra charges.")}</p>
            
            <div className="checkout-form-grid" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{t("Actual Check-In")}</div>
                <div style={{ fontWeight: 700 }}>{activeBooking.actualCheckInTime ? new Date(activeBooking.actualCheckInTime).toLocaleTimeString() : t('N/A')}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{t("Actual Check-Out")}</div>
                <div style={{ fontWeight: 700, color: '#f59e0b' }}>{new Date().toLocaleTimeString()}</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>{t("Extra Charges")}</h3>
              
              {/* Added Charges List */}
              {extraCharges.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {extraCharges.map((charge, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px dashed #fca5a5' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b' }}>{charge.reason}</div>
                        <div style={{ fontSize: '12px', color: '#b91c1c' }}>{charge.description}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontWeight: 800, color: '#991b1b' }}>${charge.amount.toFixed(2)}</div>
                        <button onClick={() => removeCharge(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>{t("Remove")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Charge Form */}
              <div className="checkout-charge-form" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <select value={chargeReason} onChange={e => setChargeReason(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '130px' }}>
                  <option value="Damage">{t("Damage")}</option>
                  <option value="Maintenance">{t("Maintenance")}</option>
                  <option value="Cleaning">{t("Cleaning")}</option>
                  <option value="Fuel">{t("Fuel")}</option>
                  <option value="Late Return">{t("Late Return")}</option>
                  <option value="Extended Tour">{t("Extended Tour")}</option>
                  <option value="Other">{t("Other")}</option>
                </select>
                <input 
                  type="text" 
                  placeholder={t("Description...")}
                  value={chargeDescription}
                  onChange={e => setChargeDescription(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input 
                  type="number" 
                  placeholder={t("Amount")}
                  value={chargeAmount}
                  onChange={e => setChargeAmount(e.target.value)}
                  style={{ width: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <button onClick={addExtraCharge} style={{ padding: '10px 16px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>{t("Add")}</button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <input 
                type="checkbox" 
                id="processRefund"
                checked={processRefund}
                onChange={e => setProcessRefund(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="processRefund" style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                {t("Process Security Deposit Refund Automatically")}
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => setCheckOutModalOpen(false)} style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t("Cancel")}</button>
              <button onClick={handleCheckOut} style={{ padding: '10px 24px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>{t("Complete Check-Out")}</button>
            </div>
          </div>
        </div>
      )}

      {detailsModalOpen && (
        <AdminBookingDetailsModal 
          bookingId={detailsModalOpen} 
          onClose={() => setDetailsModalOpen(null)} 
          onUpdate={loadBookings} 
        />
      )}
    </div>
  );
};
