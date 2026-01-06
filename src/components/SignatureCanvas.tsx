import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';
import { motion } from 'framer-motion';
import TouchFeedback from './mobile/TouchFeedback';

interface SignatureCanvasProps {
  onSave: (signature: string) => void;
  initialSignature?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSave,
  initialSignature,
  disabled = false,
  label = 'Signature',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 0.5,
      maxWidth: 2.5,
    });

    signaturePadRef.current = signaturePad;

    // Resize canvas to match display size
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      signaturePad.clear();
      
      if (initialSignature && !signaturePad.isEmpty()) {
        signaturePad.fromDataURL(initialSignature);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track changes
    signaturePad.addEventListener('endStroke', () => {
      setIsEmpty(signaturePad.isEmpty());
    });

    // Load initial signature
    if (initialSignature) {
      signaturePad.fromDataURL(initialSignature);
      setIsEmpty(false);
    }

    if (disabled) {
      signaturePad.off();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      signaturePad.off();
    };
  }, [initialSignature, disabled]);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataURL = signaturePadRef.current.toDataURL('image/png');
      onSave(dataURL);
    }
  };

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {label} {disabled && <span className="text-gray-500">(Locked)</span>}
      </label>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`
            w-full border-2 rounded-lg touch-none
            ${disabled 
              ? 'border-gray-300 bg-gray-100 cursor-not-allowed' 
              : 'border-blue-400 bg-white'
            }
          `}
          style={{ 
            height: '150px',
            maxHeight: '200px',
          }}
        />
        
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Sign here</p>
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-2 mt-4">
          <TouchFeedback onTap={handleClear} hapticType="light">
            <button
              type="button"
              onClick={handleClear}
              disabled={isEmpty}
              className={`
                flex-1 px-4 py-3 rounded-xl font-semibold transition-all
                ${isEmpty 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                }
              `}
              style={{ minHeight: '48px' }}
            >
              Clear
            </button>
          </TouchFeedback>

          <TouchFeedback onTap={handleSave} hapticType="medium">
            <button
              type="button"
              onClick={handleSave}
              disabled={isEmpty}
              className={`
                flex-1 px-4 py-3 rounded-xl font-semibold transition-all
                ${isEmpty 
                  ? 'bg-blue-200 text-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
              style={{ minHeight: '48px' }}
            >
              Save Signature
            </button>
          </TouchFeedback>
        </div>
      )}
    </motion.div>
  );
};

export default SignatureCanvas;
