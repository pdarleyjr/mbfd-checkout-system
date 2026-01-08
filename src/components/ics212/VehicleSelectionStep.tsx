import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import TouchFeedback from '../mobile/TouchFeedback';
import SkeletonLoader from '../mobile/SkeletonLoader';
import { AddVehicleModal } from './AddVehicleModal';
import { API_BASE_URL } from '../../lib/config';
import { showToast } from '../mobile/Toast';
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Fetch vehicles on mount
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles`);
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      showToast({ message: 'Failed to load vehicles', type: 'error' });
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    if (!vehicleId) {
      // Clear selection
      setSelectedVehicle(null);
      onChange('selectedVehicleId', '');
      onChange('vehicleIdNo', '');
      onChange('vehicleLicenseNo', '');
      onChange('vehicleType', '');
      onChange('agencyRegUnit', '');
      return;
    }

    // Special value for adding new vehicle
    if (vehicleId === '__ADD_NEW__') {
      setIsAddModalOpen(true);
      return;
    }

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      
      // Store the Airtable vehicle ID to track that a vehicle was selected
      onChange('selectedVehicleId', vehicle.id);
      
      // Auto-populate vehicle fields
      onChange('vehicleIdNo', vehicle.vehicleId || '');
      onChange('vehicleLicenseNo', vehicle.licenseNumber || '');
      onChange('vehicleType', vehicle.vehicleType || '');
      onChange('agencyRegUnit', vehicle.regUnit || '');
    }
  };

  const handleVehicleAdded = async (newVehicle: Vehicle) => {
    // Refresh vehicles list
    await fetchVehicles();
    
    // Auto-select the newly added vehicle
    setSelectedVehicle(newVehicle);
    onChange('vehicleIdNo', newVehicle.vehicleId || '');
    onChange('vehicleLicenseNo', newVehicle.licenseNumber || '');
    onChange('vehicleType', newVehicle.vehicleType || '');
    onChange('agencyRegUnit', newVehicle.regUnit || '');
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
          Select the vehicle to inspect or add a new one
        </p>
      </div>

      {/* Vehicle Dropdown */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Vehicle Type
        </label>
        {loadingVehicles ? (
          <SkeletonLoader type="rectangle" />
        ) : (
          <select
            value={selectedVehicle?.id || ''}
            onChange={(e) => handleVehicleSelect(e.target.value)}
            className={`
              w-full px-4 py-3 text-base rounded-xl border-2 transition-all
              focus:outline-none focus:ring-4
              ${errors.vehicleIdNo 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
              }
              dark:bg-gray-700 dark:text-white
            `}
            style={{ minHeight: '56px' }}
          >
            <option value="">Select a vehicle (optional)</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicleType && vehicle.vehicleMake 
                  ? `${vehicle.vehicleType} - ${vehicle.vehicleMake} ${vehicle.regUnit || ''}`
                  : vehicle.regUnit || vehicle.vehicleType || vehicle.vehicleMake || 'Unknown Vehicle'
                }
              </option>
            ))}
            <option value="__ADD_NEW__" className="font-semibold">
              + Add New Vehicle
            </option>
          </select>
        )}
        {!loadingVehicles && vehicles.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            No vehicles found. Click "+ Add New Vehicle" to create one.
          </p>
        )}
      </div>

      {/* Add Vehicle Button (alternative placement) */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Vehicle
        </button>
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
              <p className="text-gray-600 dark:text-gray-400">Make/Type</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {[selectedVehicle.vehicleMake, selectedVehicle.vehicleType]
                  .filter(Boolean)
                  .join(' ') || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">License Plate</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedVehicle.licenseNumber || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Agency Unit</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedVehicle.regUnit || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Status</p>
              <span
                className={`
                  inline-block px-2 py-1 text-xs font-medium rounded-full
                  ${selectedVehicle.vehicleStatus === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : selectedVehicle.vehicleStatus === 'Inactive'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }
                `}
              >
                {selectedVehicle.vehicleStatus || 'Unknown'}
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
          Odometer Reading (miles)
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
            dark:bg-gray-700 dark:text-white
          `}
          style={{ minHeight: '56px' }}
        />
        {errors.odometerReading && (
          <p className="mt-1 text-sm text-red-600">{errors.odometerReading}</p>
        )}
      </div>

      {/* Auto-populated fields (editable) */}
      <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Vehicle Information (Auto-populated, editable)
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
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

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onVehicleAdded={handleVehicleAdded}
      />
    </motion.form>
  );
};

export default VehicleSelectionStep;
