/**
 * AddVehicleModal Component
 * 
 * Modal for adding a new vehicle inline within the ICS-212 form
 * Adapted from VehicleManagement component
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';
import { showToast } from '../mobile/Toast';
import type { Vehicle } from '../../types';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleAdded: (vehicle: Vehicle) => void;
}

interface VehicleFormData {
  regUnit: string;
  agency: string;
  vehicleMake: string;
  vehicleType: string;
  incidentId: string;
  vehicleId: string;
  features: string;
  licenseNumber: string;
  notes: string;
  vehicleStatus: 'Active' | 'Inactive' | 'Maintenance' | 'Deployed';
}

export function AddVehicleModal({ isOpen, onClose, onVehicleAdded }: AddVehicleModalProps) {
  const [formData, setFormData] = useState<VehicleFormData>({
    regUnit: '',
    agency: '',
    vehicleMake: '',
    vehicleType: '',
    incidentId: '',
    vehicleId: '',
    features: '',
    licenseNumber: '',
    notes: '',
    vehicleStatus: 'Active'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      regUnit: '',
      agency: '',
      vehicleMake: '',
      vehicleType: '',
      incidentId: '',
      vehicleId: '',
      features: '',
      licenseNumber: '',
      notes: '',
      vehicleStatus: 'Active'
    });
    setFormErrors({});
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required: Registered Unit
    if (!formData.regUnit.trim()) {
      errors.regUnit = 'Registered Unit is required';
    } else if (formData.regUnit.length > 100) {
      errors.regUnit = 'Registered Unit must be 100 characters or less';
    }
    
    // Required: Make
    if (!formData.vehicleMake.trim()) {
      errors.vehicleMake = 'Vehicle Make is required';
    }
    
    // At least one other field must be filled
    const otherFields = [
      formData.agency,
      formData.vehicleType,
      formData.incidentId,
      formData.vehicleId,
      formData.features,
      formData.licenseNumber,
      formData.notes
    ];
    
    if (!otherFields.some(field => field.trim())) {
      errors.general = 'At least one additional field must be filled';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast({ message: 'Please fix the validation errors', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create vehicle');
      }
      
      const result = await response.json();
      showToast({ message: 'Vehicle created successfully', type: 'success' });
      
      // Return the newly created vehicle to parent
      onVehicleAdded(result.vehicle);
      
      // Close modal and reset form
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating vehicle:', error);
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to create vehicle', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Modal */}
          <motion.div 
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add New Vehicle
              </h2>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* General Error */}
                {formErrors.general && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    {formErrors.general}
                  </div>
                )}

                {/* Registered Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Registered Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.regUnit}
                    onChange={(e) => setFormData({ ...formData, regUnit: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
                      formErrors.regUnit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="e.g., USAR-01"
                    disabled={isSubmitting}
                  />
                  {formErrors.regUnit && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.regUnit}</p>
                  )}
                </div>

                {/* Agency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Agency
                  </label>
                  <input
                    type="text"
                    value={formData.agency}
                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., FEMA"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Make */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Make <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleMake}
                    onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
                      formErrors.vehicleMake ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="e.g., Ford, Chevrolet, International"
                    disabled={isSubmitting}
                  />
                  {formErrors.vehicleMake && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.vehicleMake}</p>
                  )}
                </div>

                {/* Category/Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category/Type
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Heavy Rescue Truck, Cargo Trailer"
                    disabled={isSubmitting}
                  />
                </div>

                {/* License Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., ABC-1234"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Incident ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Incident ID
                  </label>
                  <input
                    type="text"
                    value={formData.incidentId}
                    onChange={(e) => setFormData({ ...formData, incidentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., INC-2024-001"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Classification (Vehicle ID) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Classification
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., VEHICLE-001"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Features
                  </label>
                  <textarea
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Describe special features, equipment, or capabilities"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.vehicleStatus}
                    onChange={(e) => setFormData({ ...formData, vehicleStatus: e.target.value as VehicleFormData['vehicleStatus'] })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    disabled={isSubmitting}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Deployed">Deployed</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Additional notes or comments"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-6 sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 -mx-6 px-6 py-4 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Vehicle
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

export default AddVehicleModal;
