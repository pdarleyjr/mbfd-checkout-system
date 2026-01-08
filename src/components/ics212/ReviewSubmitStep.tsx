import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Edit, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TouchFeedback from '../mobile/TouchFeedback';
import SignatureCanvas from '../SignatureCanvas';
import type { ICS212FormData, DigitalSignature } from '../../types';

interface ReviewSubmitStepProps {
  formData: Partial<ICS212FormData>;
  onChange: (field: keyof ICS212FormData, value: any) => void;
  onBack: () => void;
  onGoToStep: (step: number) => void;
  onSubmit: () => Promise<void>;
}

export const ReviewSubmitStep: React.FC<ReviewSubmitStepProps> = ({
  formData,
  onChange,
  onBack,
  onGoToStep,
  onSubmit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasOperatorSigned, setHasOperatorSigned] = useState(!!formData.operatorSignature);

  const handleOperatorSignatureSave = (signatureData: string) => {
    const signature: DigitalSignature = {
      imageData: signatureData,
      signedAt: new Date().toISOString(),
      signedBy: formData.operatorNamePrint || '',
      ipAddress: undefined,
      deviceId: navigator.userAgent,
    };
    
    onChange('operatorSignature', signature);
    onChange('operatorDate', new Date().toISOString().split('T')[0]);
    onChange('operatorTime', new Date().toTimeString().slice(0, 5));
    setHasOperatorSigned(true);
  };

  const handleFinalSubmit = async () => {
    if (!hasOperatorSigned) {
      toast.error('Operator signature required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit();
      toast.success('Form submitted successfully!');
    } catch (error) {
      toast.error('Submission failed. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate counts
  const passCount = formData.inspectionItems?.filter(item => item.status === 'pass').length || 0;
  const failCount = formData.inspectionItems?.filter(item => item.status === 'fail').length || 0;
  const naCount = formData.inspectionItems?.filter(item => item.status === 'n/a').length || 0;
  const releaseDecision = formData.releaseStatus || 'release';

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6 pb-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Review & Submit
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review all information before final submission
        </p>
      </div>

      {/* Incident Information Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Incident Information
          </h3>
          <button
            type="button"
            onClick={() => onGoToStep(0)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Incident Name</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formData.incidentName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Date/Time</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formData.inspectorDate} {formData.inspectorTime}
            </p>
          </div>
          {formData.orderNo && (
            <div className="col-span-2">
              <p className="text-gray-600 dark:text-gray-400">Order Number</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formData.orderNo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Information Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Vehicle Information
          </h3>
          <button
            type="button"
            onClick={() => onGoToStep(1)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Vehicle ID</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formData.vehicleIdNo || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Odometer</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formData.odometerReading?.toLocaleString() || 'N/A'} mi
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">License Plate</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formData.vehicleLicenseNo || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Type</p>
            <p className="font-semibold text-gray-900 dark:text-white">{formData.vehicleType || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Inspection Results Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Inspection Results
          </h3>
          <button
            type="button"
            onClick={() => onGoToStep(2)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{passCount}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Passed</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{failCount}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{naCount}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">N/A</p>
          </div>
        </div>

        {/* Release Decision Badge */}
        <div className={`
          p-4 rounded-lg text-center font-bold text-lg
          ${releaseDecision === 'hold'
            ? 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-100'
            : 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100'
          }
        `}>
          {releaseDecision === 'hold' ? '🔴 HOLD FOR REPAIRS' : '🟢 RELEASED'}
        </div>
      </div>

      {/* Comments Card */}
      {formData.additionalComments && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Additional Comments
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(3)}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.additionalComments}
          </p>
        </div>
      )}

      {/* Inspector Signature Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          Inspector Signature
        </h3>
        <div className="flex items-center gap-4">
          {formData.inspectorSignature?.imageData && (
            <img 
              src={formData.inspectorSignature.imageData} 
              alt="Inspector signature" 
              className="h-20 border border-gray-300 rounded bg-white"
            />
          )}
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">
              {formData.inspectorNamePrint}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Signed: {formData.inspectorSignature && new Date(formData.inspectorSignature.signedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Operator Signature Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          Operator Signature Required
        </h3>
        
        <div className="space-y-4">
          <div>
            <label
              htmlFor="operatorNamePrint"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Operator Name (Print) *
            </label>
            <input
              type="text"
              id="operatorNamePrint"
              value={formData.operatorNamePrint || ''}
              onChange={(e) => onChange('operatorNamePrint', e.target.value)}
              placeholder="Enter operator full name"
              maxLength={100}
              disabled={hasOperatorSigned}
              className={`
                w-full px-4 py-3 text-base rounded-xl border-2 transition-all
                focus:outline-none focus:ring-4
                ${hasOperatorSigned 
                  ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 cursor-not-allowed' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                }
              `}
            />
          </div>

          <SignatureCanvas
            onSave={handleOperatorSignatureSave}
            initialSignature={formData.operatorSignature?.imageData}
            disabled={hasOperatorSigned}
            label="Operator Signature"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg">
        <div className="flex gap-3">
          <TouchFeedback onTap={() => onBack()} hapticType="light">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="
                flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold
                py-4 px-6 rounded-xl transition-all
                focus:outline-none focus:ring-4 focus:ring-gray-300
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              style={{ minHeight: '56px' }}
            >
              Back
            </button>
          </TouchFeedback>

          <TouchFeedback onTap={handleFinalSubmit} hapticType="heavy">
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={!hasOperatorSigned || isSubmitting}
              className={`
                flex-[2] font-bold py-4 px-6 rounded-xl transition-all
                focus:outline-none focus:ring-4 flex items-center justify-center gap-2
                ${hasOperatorSigned && !isSubmitting
                  ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-300 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
              style={{ minHeight: '56px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Final Form
                </>
              )}
            </button>
          </TouchFeedback>
        </div>
      </div>
    </motion.div>
  );
};

export default ReviewSubmitStep;
