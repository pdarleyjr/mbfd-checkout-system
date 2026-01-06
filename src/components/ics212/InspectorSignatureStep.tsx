import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle } from 'lucide-react';
import TouchFeedback from '../mobile/TouchFeedback';
import SignatureCanvas from '../SignatureCanvas';
import type { ICS212FormData, DigitalSignature } from '../../types';

interface InspectorSignatureStepProps {
  formData: Partial<ICS212FormData>;
  onChange: (field: keyof ICS212FormData, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
}

export const InspectorSignatureStep: React.FC<InspectorSignatureStepProps> = ({
  formData,
  onChange,
  onNext,
  onBack,
  errors,
}) => {
  const [hasSignedForm, setHasSignedForm] = useState(!!formData.inspectorSignature);

  const handleSignatureSave = (signatureData: string) => {
    const signature: DigitalSignature = {
      imageData: signatureData,
      signedAt: new Date().toISOString(),
      signedBy: formData.inspectorNamePrint || '',
      ipAddress: undefined,
      deviceId: navigator.userAgent,
    };
    
    onChange('inspectorSignature', signature);
    setHasSignedForm(true);
    
    // Transition form status to inspector_signed
    onChange('status', 'inspector_signed');
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
    };
  };

  const { date: currentDate, time: currentTime } = getCurrentDateTime();

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Inspector Signature
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Sign to lock the inspection form and proceed to review
        </p>
      </div>

      {/* Form Lock Warning */}
      {hasSignedForm && (
        <motion.div
          className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 rounded-xl p-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-100">
                Form Locked
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Inspector signature has been recorded. Form is read-only.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Inspector Name */}
      <div>
        <label
          htmlFor="inspectorNamePrint"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Inspector Name (Print) *
        </label>
        <input
          type="text"
          id="inspectorNamePrint"
          value={formData.inspectorNamePrint || ''}
          onChange={(e) => onChange('inspectorNamePrint', e.target.value)}
          placeholder="Enter your full name"
          maxLength={100}
          disabled={hasSignedForm}
          className={`
            w-full px-4 py-3 text-base rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4
            ${hasSignedForm 
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 cursor-not-allowed' 
              : errors.inspectorNamePrint 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
            }
          `}
          style={{ minHeight: '56px' }}
        />
        {errors.inspectorNamePrint && !hasSignedForm && (
          <p className="mt-1 text-sm text-red-600">{errors.inspectorNamePrint}</p>
        )}
      </div>

      {/* Date and Time Display */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {new Date(formData.inspectorDate || currentDate).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Time</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formData.inspectorTime || currentTime}
          </p>
        </div>
      </div>

      {/* Signature Canvas */}
      <div>
        <SignatureCanvas
          onSave={handleSignatureSave}
          initialSignature={formData.inspectorSignature?.imageData}
          disabled={hasSignedForm}
          label="Inspector Signature"
        />
      </div>

      {/* Signature Confirmation */}
      {hasSignedForm && formData.inspectorSignature && (
        <motion.div
          className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-xl p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-bold text-green-900 dark:text-green-100">
                Signature Recorded
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Signed by {formData.inspectorNamePrint} on{' '}
                {new Date(formData.inspectorSignature.signedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Legal Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <strong>Notice:</strong> By signing this form, you certify that the inspection was conducted
          in accordance with ICS-212 standards and that all information is accurate to the best of your knowledge.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 sticky bottom-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg">
        {!hasSignedForm && (
          <TouchFeedback onTap={() => onBack()} hapticType="light">
            <button
              type="button"
              onClick={onBack}
              className="
                flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold
                py-4 px-6 rounded-xl transition-all
                focus:outline-none focus:ring-4 focus:ring-gray-300
              "
              style={{ minHeight: '56px' }}
            >
              Back
            </button>
          </TouchFeedback>
        )}

        <TouchFeedback onTap={() => onNext()} hapticType="medium">
          <button
            type="button"
            onClick={onNext}
            disabled={!hasSignedForm}
            className={`
              ${hasSignedForm ? 'flex-1' : 'flex-[2]'}
              font-bold py-4 px-6 rounded-xl transition-all shadow-lg
              focus:outline-none focus:ring-4
              ${hasSignedForm
                ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300 hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
            style={{ minHeight: '56px' }}
          >
            {hasSignedForm ? 'Next: Review & Submit' : 'Sign Form to Continue'}
          </button>
        </TouchFeedback>
      </div>
    </motion.div>
  );
};

export default InspectorSignatureStep;
