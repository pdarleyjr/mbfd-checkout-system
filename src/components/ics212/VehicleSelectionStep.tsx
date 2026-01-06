import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TouchFeedback from '../mobile/TouchFeedback';
import VehicleAutocomplete from '../VehicleAutocomplete';
import type { ICS212FormData, Vehicle } from '../../types';

interface VehicleSelectionStepProps {
  formData: Partial<ICS212FormData>;
  onChange: (field: keyof ICS212FormData, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
}

export const VehicleSelectionStep: React.FC<VehicleSelectionStepProps> = ({
  formData,
  onChange,
  onNext,
  onBack,
  errors,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    // Auto-populate vehicle fields
    onChange('vehicleIdNo', vehicle.vehicleId);
    onChange('vehicleLicenseNo', vehicle.licensePlate || '');
    onChange('vehicleType', vehicle.vehicleType || '');
    onChange('agencyRegUnit', vehicle.agencyUnit || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
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
          Vehicle Selection
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select the vehicle to inspect
        </p>
      </div>

      {/* Vehicle Autocomplete */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Vehicle ID *
        </label>
        <VehicleAutocomplete
          value={formData.vehicleIdNo || ''}
          onChange={(value) => onChange('vehicleIdNo', value)}
          onVehicleSelect={handleVehicleSelect}
          error={errors.vehicleIdNo}
          apiEndpoint="/api/vehicles/autocomplete"
        />
        <p className="mt-1 text-xs text-gray-500">
          Search by vehicle ID, make, or model
        </p>
      </div>

      {/* Selected Vehicle Info Card */}
      {selectedVehicle && (
        <motion.div
          className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Selected Vehicle Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Make/Model</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {[selectedVehicle.year, selectedVehicle.make, selectedVehicle.model]
                  .filter(Boolean)
                  .join(' ') || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">License Plate</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedVehicle.licensePlate || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Agency Unit</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedVehicle.agencyUnit || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Status</p>
              <span
                className={`
                  inline-block px-2 py-1 text-xs font-medium rounded-full
                  ${selectedVehicle.status === 'In Service' 
                    ? 'bg-green-100 text-green-800' 
                    : selectedVehicle.status === 'Out of Service'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }
                `}
              >
                {selectedVehicle.status || 'Unknown'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Odometer Reading */}
      <div>
        <label
          htmlFor="odometerReading"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Odometer Reading (miles) *
        </label>
        <input
          type="number"
          id="odometerReading"
          value={formData.odometerReading || ''}
          onChange={(e) => onChange('odometerReading', parseInt(e.target.value) || 0)}
          placeholder="Enter current odometer reading"
          min={0}
          max={999999999}
          className={`
            w-full px-4 py-3 text-base rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4
            ${errors.odometerReading 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
            }
          `}
          style={{ minHeight: '56px' }}
        />
        {errors.odometerReading && (
          <p className="mt-1 text-sm text-red-600">{errors.odometerReading}</p>
        )}
        {selectedVehicle?.lastOdometer && (
          <p className="mt-1 text-xs text-gray-500">
            Last recorded: {selectedVehicle.lastOdometer.toLocaleString()} miles
          </p>
        )}
      </div>

      {/* Auto-populated fields (read-only display) */}
      <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Auto-Populated Vehicle Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              License Number
            </label>
            <input
              type="text"
              value={formData.vehicleLicenseNo || ''}
              onChange={(e) => onChange('vehicleLicenseNo', e.target.value)}
              placeholder="Enter license number"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Agency Reg/Unit
            </label>
            <input
              type="text"
              value={formData.agencyRegUnit || ''}
              onChange={(e) => onChange('agencyRegUnit', e.target.value)}
              placeholder="Enter agency unit"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Vehicle Type
            </label>
            <input
              type="text"
              value={formData.vehicleType || ''}
              onChange={(e) => onChange('vehicleType', e.target.value)}
              placeholder="e.g., Rescue, Engine, Ladder"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
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

        <TouchFeedback onTap={() => onNext()} hapticType="medium">
          <button
            type="submit"
            className="
              flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold
              py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-blue-300
            "
            style={{ minHeight: '56px' }}
          >
            Next: Inspection Items
          </button>
        </TouchFeedback>
      </div>
    </motion.form>
  );
};

export default VehicleSelectionStep;
