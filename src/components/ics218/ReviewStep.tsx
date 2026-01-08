import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TouchFeedback from '../mobile/TouchFeedback';
import type { ICS218FormData } from '../../types';

interface ReviewStepProps {
  formData: Partial<ICS218FormData>;
  onSubmit: () => void;
  onBack: () => void;
  onGoToStep: (step: number) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  onSubmit,
  onBack,
  onGoToStep,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          Review & Submit
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review all information before submitting
        </p>
      </div>

      {/* Incident Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Incident Information
          </h3>
          <button
            type="button"
            onClick={() => onGoToStep(0)}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            Edit
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Incident Name:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formData.incidentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Incident Number:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formData.incidentNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Date Prepared:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formData.datePrepared} {formData.timePrepared}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Vehicle Category:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formData.vehicleCategory}</span>
          </div>
          {formData.operationalPeriod && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Operational Period:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formData.operationalPeriod}</span>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vehicle Inventory
          </h3>
          <button
            type="button"
            onClick={() => onGoToStep(1)}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            Edit
          </button>
        </div>
        <div className="text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            Total vehicles: <span className="font-semibold text-gray-900 dark:text-white">{formData.vehicles?.length || 0}</span>
          </p>
          {formData.vehicles && formData.vehicles.length > 0 && (
            <div className="mt-3 space-y-2">
              {formData.vehicles.map((vehicle, index) => (
                <div key={index} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-orange-600 font-medium">#{index + 1}</span>
                  <span className="truncate">
                    {vehicle.make} {vehicle.classification} - {vehicle.vehicleLicenseId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prepared By Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prepared By
          </h3>
          <button
            type="button"
            onClick={() => onGoToStep(2)}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            Edit
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Name:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formData.preparedBy?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Position/Title:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formData.preparedBy?.positionTitle}</span>
            </div>
          </div>
          {formData.preparedBy?.signature && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Signature:</p>
              <img
                src={formData.preparedBy.signature}
                alt="Signature"
                className="max-w-full h-auto"
                style={{ maxHeight: '60px' }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.preparedBy.signatureTimestamp && new Date(formData.preparedBy.signatureTimestamp).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-orange-600 dark:text-orange-400 text-2xl">⚠️</div>
          <div>
            <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
              Before Submitting
            </h4>
            <p className="text-sm text-orange-800 dark:text-orange-400">
              Please verify all information is correct. Once submitted, this form will be logged
              and cannot be edited.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <TouchFeedback onTap={onBack} hapticType="medium">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="
              flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-bold
              py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-gray-300
              disabled:cursor-not-allowed
            "
            style={{ minHeight: '56px' }}
          >
            Back
          </button>
        </TouchFeedback>

        <TouchFeedback onTap={handleSubmit} hapticType="heavy">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="
              flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800
              disabled:from-gray-300 disabled:to-gray-400 text-white font-bold
              py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-orange-300
              disabled:cursor-not-allowed
            "
            style={{ minHeight: '56px' }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              '✓ Submit Form'
            )}
          </button>
        </TouchFeedback>
      </div>
    </motion.div>
  );
};

export default ReviewStep;
