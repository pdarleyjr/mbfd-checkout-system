import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TouchFeedback from '../mobile/TouchFeedback';
import SignatureCanvas from '../SignatureCanvas';
import type { ICS218FormData } from '../../types';

interface PreparedByStepProps {
  formData: Partial<ICS218FormData>;
  onChange: (field: keyof ICS218FormData, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
}

export const PreparedByStep: React.FC<PreparedByStepProps> = ({
  formData,
  onChange,
  onNext,
  onBack,
  errors,
}) => {
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const handleSignatureSave = (signature: string) => {
    onChange('preparedBy', {
      ...formData.preparedBy,
      signature,
      signatureTimestamp: new Date().toISOString(),
    });
    setShowSignaturePad(false);
  };

  const handleSignatureClear = () => {
    onChange('preparedBy', {
      ...formData.preparedBy,
      signature: '',
      signatureTimestamp: '',
    });
  };

  return (
    <motion.form
      className="space-y-6 p-4 md:p-6"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Prepared By Information
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
         Form preparer details and signature
        </p>
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="preparedByName"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Name *
        </label>
        <input
          type="text"
          id="preparedByName"
          value={formData.preparedBy?.name || ''}
          onChange={(e) => onChange('preparedBy', {
            ...formData.preparedBy,
            name: e.target.value,
          })}
          placeholder="Enter your full name"
          maxLength={100}
          className={`
            w-full px-4 py-3 text-base rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4
            ${errors.preparedByName 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
              : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
            }
          `}
          style={{ minHeight: '56px' }}
        />
        {errors.preparedByName && (
          <p className="mt-1 text-sm text-red-600">{errors.preparedByName}</p>
        )}
      </div>

      {/* Position/Title */}
      <div>
        <label
          htmlFor="preparedByPosition"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Position/Title *
        </label>
        <input
          type="text"
          id="preparedByPosition"
          value={formData.preparedBy?.positionTitle || ''}
          onChange={(e) => onChange('preparedBy', {
            ...formData.preparedBy,
            positionTitle: e.target.value,
          })}
          placeholder="e.g., Equipment Manager, Logistics Chief"
          maxLength={100}
          className={`
            w-full px-4 py-3 text-base rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4
            ${errors.preparedByPosition 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
              : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
            }
          `}
          style={{ minHeight: '56px' }}
        />
        {errors.preparedByPosition && (
          <p className="mt-1 text-sm text-red-600">{errors.preparedByPosition}</p>
        )}
      </div>

      {/* Signature */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Signature *
        </label>
        
        {!formData.preparedBy?.signature ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowSignaturePad(true)}
              className="
                w-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium
                py-4 px-6 rounded-xl transition-all border-2 border-dashed border-orange-300
                focus:outline-none focus:ring-4 focus:ring-orange-200
              "
              style={{ minHeight: '56px' }}
            >
              <span className="text-lg">✍️</span> Tap to Sign
            </button>
            {errors.preparedBySignature && (
              <p className="text-sm text-red-600">{errors.preparedBySignature}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-700 border-2 border-green-500 rounded-xl p-4">
              <img
                src={formData.preparedBy.signature}
                alt="Signature"
                className="max-w-full h-auto"
                style={{ maxHeight: '100px' }}
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Signed: {formData.preparedBy.signatureTimestamp ? new Date(formData.preparedBy.signatureTimestamp).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignatureClear}
              className="
                w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium
                py-3 px-6 rounded-xl transition-all
                focus:outline-none focus:ring-4 focus:ring-red-200
              "
            >
              Clear Signature
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <TouchFeedback onTap={onBack} hapticType="medium">
          <button
            type="button"
            onClick={onBack}
            className="
              flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold
              py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-gray-300
            "
            style={{ minHeight: '56px' }}
          >
            Back
          </button>
        </TouchFeedback>

        <TouchFeedback onTap={() => onNext()} hapticType="medium">
          <button
            type="submit"
            className="
              flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold
              py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-orange-300
            "
            style={{ minHeight: '56px' }}
          >
            Next: Review & Submit
          </button>
        </TouchFeedback>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Sign Here
              </h3>
              <button
                type="button"
                onClick={() => setShowSignaturePad(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SignatureCanvas
              onSave={handleSignatureSave}
            />
          </div>
        </div>
      )}
    </motion.form>
  );
};

export default PreparedByStep;
