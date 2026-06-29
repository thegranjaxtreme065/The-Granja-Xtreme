import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, CheckCircle, RefreshCcw } from 'lucide-react';
import { uploadBase64Image } from '../utils/upload';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (signatureUrl: string) => Promise<void> | void;
  title?: string;
  subtitle?: string;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ 
  isOpen, 
  onClose, 
  onComplete,
  title = "Digital Signature Required",
  subtitle = "Please sign below to authorize and complete the reservation."
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClear = () => {
    sigCanvas.current?.clear();
    setError('');
  };

  const handleComplete = async () => {
    if (sigCanvas.current?.isEmpty()) {
      setError('Please provide a signature before completing.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      // Using getCanvas() instead of getTrimmedCanvas() to avoid Vite/trim-canvas import errors
      const base64Str = sigCanvas.current?.getCanvas().toDataURL('image/png');
      if (!base64Str) throw new Error('Failed to capture signature.');

      const url = await uploadBase64Image(base64Str, 'signatures');
      await onComplete(url);
    } catch (err: any) {
      setError(err.message || 'Failed to save signature. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{title}</h2>
            <p style={{ fontSize: '13px', color: '#64748b' }}>{subtitle}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
              padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Canvas Area */}
        <div style={{ padding: '24px', backgroundColor: '#f1f5f9' }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            border: '2px dashed #cbd5e1',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
          }}>
            <SignatureCanvas 
              ref={sigCanvas} 
              penColor="#0f172a"
              canvasProps={{
                width: 450, 
                height: 200, 
                className: 'sigCanvas',
                style: { width: '100%', height: '200px', touchAction: 'none' }
              }} 
            />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '16px',
          backgroundColor: 'white'
        }}>
          <button 
            onClick={handleClear}
            disabled={isSubmitting}
            style={{
              padding: '12px 20px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
          >
            <RefreshCcw size={16} /> Clear
          </button>
          
          <button 
            onClick={handleComplete}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4d7c0f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: 1,
              justifyContent: 'center',
              opacity: isSubmitting ? 0.8 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            {isSubmitting ? 'Saving Signature...' : (
              <><CheckCircle size={18} /> Complete Reservation</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
