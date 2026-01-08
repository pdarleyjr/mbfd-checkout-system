import React from 'react';
import { motion } from 'framer-motion';
import TouchFeedback from '../mobile/TouchFeedback';
import type { ICS212FormData } from '../../types';

interface IncidentInfoStepProps {
  formData: Partial<ICS212FormData>;
  onChange: (field: keyof ICS212FormData, value: any) => void;
  onNext: () => void;
  errors: Record<string, string>;
}

export const IncidentInfoStep: React.FC<IncidentInfoStepProps> = ({
  formData,
  onChange,
  onNext,
  errors,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  // Generate current date and time in proper format
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`; // HH:MM
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
          Incident Information
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Complete prior to vehicle inspection
        </p>
      </div>

      {/* Incident Name */}
      <div>
        <label
          htmlFor="incidentName"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Incident Name *
        </label>
        <input
          type="text"
          id="incidentName"
          value={formData.incidentName || ''}
          onChange={(e) => onChange('incidentName', e.target.value)}
          placeholder="e.g., Wildfire Response 2024"
          maxLength={100}
          className={`
            w-full px-4 py-3 text-base rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4
            ${errors.incidentName 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
            }
          `}
          style={{ minHeight: '56px' }}
        />
        {errors.incidentName && (
          <p className="mt-1 text-sm text-red-600">{errors.incidentName}</p>
        )}
      </div>

      {/* Date/Time Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="inspectorDate"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Date *
          </label>
          <input
            type="date"
            id="inspectorDate"
            value={formData.inspectorDate || getCurrentDate()}
            onChange={(e) => onChange('inspectorDate', e.target.value)}
            max={getCurrentDate()}
            className={`
              w-full px-4 py-3 text-base rounded-xl border-2 transition-all
              focus:outline-none focus:ring-4
              ${errors.inspectorDate 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
              }
            `}
            style={{ minHeight: '56px' }}
          />
          {errors.inspectorDate && (
            <p className="mt-1 text-sm text-red-600">{errors.inspectorDate}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="inspectorTime"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Time *
          </label>
          <input
            type="time"
            id="inspectorTime"
            value={formData.inspectorTime || getCurrentTime()}
            onChange={(e) => onChange('inspectorTime', e.target.value)}
            className={`
              w-full px-4 py-3 text-base rounded-xl border-2 transition-all
              focus:outline-none focus:ring-4
              ${errors.inspectorTime 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
              }
            `}
            style={{ minHeight: '56px' }}
          />
          {errors.inspectorTime && (
            <p className="mt-1 text-sm text-red-600">{errors.inspectorTime}</p>
          )}
        </div>
      </div>

      {/* Order Number (Optional) */}
      <div>
        <label
          htmlFor="orderNo"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Order Number <span className="text-gray-500">(Optional)</span>
        </label>
        <input
          type="text"
          id="orderNo"
          value={formData.orderNo || ''}
          onChange={(e) => onChange('orderNo', e.target.value)}
          placeholder="e.g., ORDER-2024-00123"
          maxLength={50}
          className="
            w-full px-4 py-3 text-base rounded-xl border-2 border-gray-300
            transition-all focus:outline-none focus:ring-4
            focus:border-blue-500 focus:ring-blue-100
          "
          style={{ minHeight: '56px' }}
        />
      </div>

      {/* Next Button */}
      <TouchFeedback onTap={() => onNext()} hapticType="medium">
        <button
          type="submit"
          className="
            w-full bg-blue-600 hover:bg-blue-700 text-white font-bold
            py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
            focus:outline-none focus:ring-4 focus:ring-blue-300
          "
          style={{ minHeight: '56px' }}
        >
          Next: Vehicle Selection
        </button>
      </TouchFeedback>
    </motion.form>
  );
};

export default IncidentInfoStep;
