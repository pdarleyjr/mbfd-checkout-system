import React from 'react';
import { motion } from 'framer-motion';
import TouchFeedback from '../mobile/TouchFeedback';
import type { ICS218FormData } from '../../types';

interface IncidentInfoStepProps {
  formData: Partial<ICS218FormData>;
  onChange: (field: keyof ICS218FormData, value: any) => void;
  onNext: () => void;
  errors: Record<string, string>;
}

const VEHICLE_CATEGORIES = [
  'Buses',
  'Generators',
  'Dozers',
  'Pickups/Sedans',
  'Rental Cars',
  'Heavy Equipment',
  'Emergency Vehicles',
  'Support Vehicles',
  'Other',
];

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
          Basic incident details for vehicle inventory
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
              : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
            }
          `}
          style={{ minHeight: '56px' }}
        />
        {errors.incidentName && (
          <p className="mt-1 text-sm text-red-600">{errors.incidentName}</p>
        )}
      </div>

      {/* Incident Number */}
      <div>
        <label
          htmlFor="incidentNumber"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Incident Number *
        </label>
        <input
          type="text"
          id="incidentNumber"
          value={formData.incidentNumber || ''}
          onChange={(e) => onChange('incidentNumber', e.target.value)}
          placeholder="e.g., INC-2024-00123"
          maxLength={50}
          className={`
            w-full px-4 py-3 text-base rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4
            ${errors.incidentNumber 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
              : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
            }
          `}
          style={{ minHeight: '56px' }}
        />
        {errors.incidentNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.incidentNumber}</p>
        )}
      </div>

      {/* Date/Time Prepared Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="datePrepared"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Date Prepared *
          </label>
          <input
            type="date"
            id="datePrepared"
            value={formData.datePrepared || getCurrentDate()}
            onChange={(e) => onChange('datePrepared', e.target.value)}
            max={getCurrentDate()}
            className={`
              w-full px-4 py-3 text-base rounded-xl border-2 transition-all
              focus:outline-none focus:ring-4
              ${errors.datePrepared 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
              }
            `}
            style={{ minHeight: '56px' }}
          />
          {errors.datePrepared && (
            <p className="mt-1 text-sm text-red-600">{errors.datePrepared}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="timePrepared"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Time Prepared *
          </label>
          <input
            type="time"
            id="timePrepared"
            value={formData.timePrepared || getCurrentTime()}
            onChange={(e) => onChange('timePrepared', e.target.value)}
            className={`
              w-full px-4 py-3 text-base rounded-xl border-2 transition-all
              focus:outline-none focus:ring-4
              ${errors.timePrepared 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
              }
            `}
            style={{ minHeight: '56px' }}
          />
          {errors.timePrepared && (
            <p className="mt-1 text-sm text-red-600">{errors.timePrepared}</p>
          )}
        </div>
      </div>

      {/* Vehicle Category */}
      <div>
        <label
          htmlFor="vehicleCategory"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Vehicle/Equipment Category *
        </label>
        <select
          id="vehicleCategory"
          value={formData.vehicleCategory || ''}
          onChange={(e) => onChange('vehicleCategory', e.target.value)}
          className={`
            w-full px-4 py-3 text-base rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4
            ${errors.vehicleCategory 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
              : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
            }
          `}
          style={{ minHeight: '56px' }}
        >
          <option value="">Select a category...</option>
          {VEHICLE_CATEGORIES.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {errors.vehicleCategory && (
          <p className="mt-1 text-sm text-red-600">{errors.vehicleCategory}</p>
        )}
      </div>

      {/* Operational Period (Optional) */}
      <div>
        <label
          htmlFor="operationalPeriod"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Operational Period <span className="text-gray-500">(Optional)</span>
        </label>
        <input
          type="text"
          id="operationalPeriod"
          value={formData.operationalPeriod || ''}
          onChange={(e) => onChange('operationalPeriod', e.target.value)}
          placeholder="e.g., 0800-2000 Day 1"
          maxLength={50}
          className="
            w-full px-4 py-3 text-base rounded-xl border-2 border-gray-300
            transition-all focus:outline-none focus:ring-4
            focus:border-orange-500 focus:ring-orange-100
          "
          style={{ minHeight: '56px' }}
        />
      </div>

      {/* Next Button */}
      <TouchFeedback onTap={() => onNext()} hapticType="medium">
        <button
          type="submit"
          className="
            w-full bg-orange-600 hover:bg-orange-700 text-white font-bold
            py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
            focus:outline-none focus:ring-4 focus:ring-orange-300
          "
          style={{ minHeight: '56px' }}
        >
          Next: Vehicle Table
        </button>
      </TouchFeedback>
    </motion.form>
  );
};

export default IncidentInfoStep;
