import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, RefreshCw } from 'lucide-react';
import { fetchAPI } from '../utils/api';
import { formatAtvName } from '../utils/formatAtv';

interface Booking {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  customerId: {
    firstName: string;
    lastName: string;
  };
  atvId: {
    _id: string;
    name: string;
    currentOdometer: number;
    currentFuelLevel: number;
  };
}

export const InspectionForm: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get('type') as 'CHECK_OUT' | 'CHECK_IN' || 'CHECK_OUT';
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [odometer, setOdometer] = useState(0);
  const [fuelLevel, setFuelLevel] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [authName, setAuthName] = useState('');
  const [isSigned, setIsSigned] = useState(false);

  // Default checklist parts for checking
  const PARTS_LIST = ['Front Bumper', 'Rear Rack', 'Handlebars / Controls', 'Left Side Fenders', 'Right Side Fenders', 'Tires & Rims', 'Engine Protective Guard'];

  const [damages, setDamages] = useState<Record<string, { status: 'OK' | 'SCRATCHED' | 'DENTED' | 'BROKEN'; notes: string }>>({});

  useEffect(() => {
    const loadBookingData = async () => {
      try {
        const data = await fetchAPI(`/bookings/${bookingId}`);
        setBooking(data);
        // Prepopulate odo and fuel from ATV current state
        setOdometer(data.atvId.currentOdometer);
        setFuelLevel(data.atvId.currentFuelLevel);

        // Prepopulate damages checklist to OK
        const initialDamages: typeof damages = {};
        PARTS_LIST.forEach((part) => {
          initialDamages[part] = { status: 'OK', notes: '' };
        });
        setDamages(initialDamages);

      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to load reservation details.');
      } finally {
        setLoading(false);
      }
    };
    loadBookingData();
  }, [bookingId]);

  const handleStatusChange = (part: string, status: 'OK' | 'SCRATCHED' | 'DENTED' | 'BROKEN') => {
    setDamages((prev) => ({
      ...prev,
      [part]: { ...prev[part], status }
    }));
  };

  const handleNotesChange = (part: string, notes: string) => {
    setDamages((prev) => ({
      ...prev,
      [part]: { ...prev[part], notes }
    }));
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    
    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;
    
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;
    
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (odometer < booking.atvId.currentOdometer) {
      setErrorMsg(`Odometer cannot be less than previous reading (${booking.atvId.currentOdometer} miles).`);
      return;
    }

    if (!isSigned) {
      setErrorMsg('Digital signature is required to authorize this audit form.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL('image/png') : '';

    // Format damages checklist to API model format
    const formattedDamages = Object.keys(damages).map((part) => ({
      part,
      status: damages[part].status,
      notes: damages[part].notes || undefined
    }));

    try {
      await fetchAPI(`/bookings/${bookingId}/inspection`, {
        method: 'POST',
        body: {
          type,
          odometer,
          fuelLevel,
          damages: formattedDamages,
          staffName: authName,
          signatureData
        }
      });
      navigate('/admin');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit inspection checklist.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}>Loading checklist parameters...</div>;
  if (!booking) return <div style={{ textAlign: 'center', padding: '100px 0' }}>Reservation not found.</div>;

  return (
    <div className="section-spacing">
      <div className="container" style={{ maxWidth: '800px' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '32px' }}>
          <span className="label-sm" style={{ color: 'var(--secondary)' }}>Staff Checklist Forms</span>
          <h1 className="display-lg" style={{ marginTop: '4px' }}>
            {type === 'CHECK_OUT' ? 'Adventure Started!' : 'Adventure Completed!'}
          </h1>
          <h2 className="title-md" style={{ marginTop: '8px', color: 'var(--on-surface)' }}>
            ATV {type === 'CHECK_OUT' ? 'Check-Out Departure' : 'Return Check-In'} Audit
          </h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginTop: '6px' }}>
            Booking ID: <strong>{booking._id}</strong> | ATV: <strong>{formatAtvName(booking.atvId)}</strong> | Client: <strong>{booking.customerId.firstName} {booking.customerId.lastName}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Odometer and Fuel Specs Card */}
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Odometer & Fuel Readings</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="grid-2">
              <div className="form-group">
                <label className="form-label">Odometer Reading (Miles)</label>
                <input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(parseInt(e.target.value) || 0)}
                  className="form-input"
                  min={booking.atvId.currentOdometer}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'block', marginTop: '4px' }}>
                  Previous check-out: {booking.atvId.currentOdometer} miles.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Fuel Level (%)</label>
                <input
                  type="number"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(parseInt(e.target.value) || 0)}
                  className="form-input"
                  min={0}
                  max={100}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'block', marginTop: '4px' }}>
                  Current tank level: {booking.atvId.currentFuelLevel}%.
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Physical Damages Checklist Card */}
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Physical Parts Condition Audit</h3>
            <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
              Inspect the ATV and select appropriate status flags. Describe details if scratches/dents/breaks are discovered.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {PARTS_LIST.map((part) => (
                <div key={part} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <strong style={{ fontSize: '15px' }}>{part}</strong>
                    
                    {/* Status Selectors */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['OK', 'SCRATCHED', 'DENTED', 'BROKEN'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(part, status)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            cursor: 'pointer',
                            backgroundColor: damages[part]?.status === status
                              ? (status === 'OK' ? 'rgba(167, 201, 87, 0.2)' : status === 'BROKEN' ? 'rgba(186, 26, 26, 0.15)' : 'rgba(212, 175, 55, 0.2)')
                              : '#ffffff',
                            color: damages[part]?.status === status
                              ? (status === 'OK' ? 'var(--primary-dark)' : status === 'BROKEN' ? 'var(--error)' : '#8c6a08')
                              : 'var(--on-surface-variant)',
                            borderColor: damages[part]?.status === status
                              ? (status === 'OK' ? 'var(--primary)' : status === 'BROKEN' ? 'var(--error)' : 'var(--accent)')
                              : 'var(--border-light)'
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Damage Details Input */}
                  {damages[part]?.status !== 'OK' && (
                    <input
                      type="text"
                      placeholder="Specify damage coordinates or description (e.g. Scratched left fender shell)"
                      value={damages[part]?.notes}
                      onChange={(e) => handleNotesChange(part, e.target.value)}
                      className="form-input"
                      style={{ fontSize: '13px', padding: '8px 12px' }}
                      required
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Final Authorization Signature Pad Card */}
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Final Authorization</h3>
            <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
              Authorized staff member must sign and verify that the above information is correct and the ATV status is recorded accurately.
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Authorized Staff Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Staff Digital Signature</label>
              <div style={{ position: 'relative', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#fcfcfc', height: '150px' }}>
                <canvas
                  ref={canvasRef}
                  width={750}
                  height={150}
                  style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                  Use mouse or touch screen to draw your signature inside the box.
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={12} /> Clear Pad
                </button>
              </div>
            </div>
          </div>

          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel Audit
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={submitting}
            >
              {submitting ? 'Saving inspection log...' : <>Submit Inspection Audit <Check size={18} /></>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
