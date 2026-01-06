import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TouchFeedback from '../mobile/TouchFeedback';
import VehicleAutocomplete from '../VehicleAutocomplete';
import type { ICS218FormData, Vehicle } from '../../types';

interface VehicleTableStepProps {
  formData: Partial<ICS218FormData>;
  onChange: (field: keyof ICS218FormData, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
}

export const VehicleTableStep: React.FC<VehicleTableStepProps> = ({
  formData,
  onChange,
  onNext,
  onBack,
  errors,
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const handleAddVehicle = () => {
    const newVehicle = {
      orderRequestNumber: '',
      incidentIdNo: '',
      classification: '',
      make: '',
      categoryKindType: '',
      features: '',
      agencyOwner: '',
      operatorNameContact: '',
      vehicleLicenseId: '',
      incidentAssignment: '',
      startDateTime: new Date().toISOString().slice(0, 16), // Format for datetime-local input
      releaseDateTime: '',
      airtableId: '',
    };
    
    const updatedVehicles = [...(formData.vehicles || []), newVehicle];
    onChange('vehicles', updatedVehicles);
    setExpandedRow(updatedVehicles.length - 1); // Expand new row
  };

  const handleRemoveVehicle = (index: number) => {
    const updatedVehicles = (formData.vehicles || []).filter((_, i) => i !== index);
    onChange('vehicles', updatedVehicles);
    if (expandedRow === index) {
      setExpandedRow(null);
    } else if (expandedRow !== null && expandedRow > index) {
      setExpandedRow(expandedRow - 1);
    }
  };

  const handleVehicleFieldChange = (index: number, field: string, value: any) => {
    const updatedVehicles = [...(formData.vehicles || [])];
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      [field]: value,
    };
    onChange('vehicles', updatedVehicles);
  };

  const handleAirtableVehicleSelect = (index: number, vehicle: Vehicle) => {
    // Auto-populate 7 fields from Airtable per ICS218_FORM_ANALYSIS.md
    const updatedVehicles = [...(formData.vehicles || [])];
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      // Auto-populated fields
      incidentIdNo: vehicle.vehicleId || '',         // Incident ID from Vehicle ID
      classification: vehicle.vehicleType || '',       // Classification
      make: vehicle.vehicleMake || '',                // Make
      categoryKindType: vehicle.vehicleType || '',    // Category/Kind/Type
      features: vehicle.features || '',               // Features
      agencyOwner: vehicle.agency || '',              // Agency/Owner
      vehicleLicenseId: vehicle.licenseNumber || '',  // License/ID
      airtableId: vehicle.id || '',                   // Store Airtable reference
    };
    onChange('vehicles', updatedVehicles);
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
          Vehicle/Equipment Inventory
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add vehicles using Airtable autocomplete. Many fields auto-fill from database.
        </p>
      </div>

      {/* Vehicle List */}
      <div className="space-y-4">
        {(formData.vehicles || []).map((vehicle, index) => (
          <motion.div
            key={index}
            className="border-2 border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Vehicle Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              onClick={() => setExpandedRow(expandedRow === index ? null : index)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                  #{index + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {vehicle.make || 'New Vehicle'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {vehicle.vehicleLicenseId || 'No license set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveVehicle(index);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <svg
                  className={`w-5 h-5 transition-transform ${expandedRow === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expanded Form */}
            <AnimatePresence>
              {expandedRow === index && (
                <motion.div
                  className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Airtable Autocomplete */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      🔍 Search Vehicle (Auto-populate from Airtable)
                    </label>
                    <VehicleAutocomplete
                      value={vehicle.make || ''}
                      onChange={(value) => handleVehicleFieldChange(index, 'make', value)}
                      onVehicleSelect={(selectedVehicle) => handleAirtableVehicleSelect(index, selectedVehicle)}
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Search by vehicle ID, make, or type to auto-fill fields
                    </p>
                  </div>

                  {/* Grid Layout for Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Order Request Number (Manual) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Order Request # (optional)
                      </label>
                      <input
                        type="text"
                        value={vehicle.orderRequestNumber || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'orderRequestNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Incident ID (Auto-filled) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Incident ID # ✨ Auto
                      </label>
                      <input
                        type="text"
                        value={vehicle.incidentIdNo || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'incidentIdNo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white bg-blue-50 dark:bg-blue-900/20"
                      />
                    </div>

                    {/* Classification (Auto-filled) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Classification ✨ Auto *
                      </label>
                      <input
                        type="text"
                        value={vehicle.classification || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'classification', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white bg-blue-50 dark:bg-blue-900/20"
                        required
                      />
                    </div>

                    {/* Make (Auto-filled) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Make ✨ Auto *
                      </label>
                      <input
                        type="text"
                        value={vehicle.make || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'make', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white bg-blue-50 dark:bg-blue-900/20"
                        required
                      />
                    </div>

                    {/* Category/Kind/Type (Auto-filled) */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category/Kind/Type ✨ Auto *
                      </label>
                      <input
                        type="text"
                        value={vehicle.categoryKindType || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'categoryKindType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white bg-blue-50 dark:bg-blue-900/20"
                        required
                      />
                    </div>

                    {/* Features (Auto-filled) */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Features ✨ Auto
                      </label>
                      <input
                        type="text"
                        value={vehicle.features || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'features', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white bg-blue-50 dark:bg-blue-900/20"
                      />
                    </div>

                    {/* Agency/Owner (Auto-filled) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Agency/Owner ✨ Auto *
                      </label>
                      <input
                        type="text"
                        value={vehicle.agencyOwner || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'agencyOwner', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white bg-blue-50 dark:bg-blue-900/20"
                        required
                      />
                    </div>

                    {/* Operator Name/Contact (Manual) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Operator Name/Contact *
                      </label>
                      <input
                        type="text"
                        value={vehicle.operatorNameContact || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'operatorNameContact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    {/* License/ID (Auto-filled) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        License/ID # ✨ Auto *
                      </label>
                      <input
                        type="text"
                        value={vehicle.vehicleLicenseId || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'vehicleLicenseId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white bg-blue-50 dark:bg-blue-900/20"
                        required
                      />
                    </div>

                    {/* Incident Assignment (Manual) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Incident Assignment *
                      </label>
                      <input
                        type="text"
                        value={vehicle.incidentAssignment || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'incidentAssignment', e.target.value)}
                        placeholder="e.g., Search & Rescue, Transport"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    {/* Start Date/Time (Manual) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Date/Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={vehicle.startDateTime || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'startDateTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    {/* Release Date/Time (Manual, Optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Release Date/Time (optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={vehicle.releaseDateTime || ''}
                        onChange={(e) => handleVehicleFieldChange(index, 'releaseDateTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Add Vehicle Button */}
      <TouchFeedback onTap={handleAddVehicle} hapticType="light">
        <button
          type="button"
          onClick={handleAddVehicle}
          className="
            w-full bg-blue-600 hover:bg-blue-700 text-white font-medium
            py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
            focus:outline-none focus:ring-4 focus:ring-blue-300
            flex items-center justify-center gap-2
          "
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Vehicle
        </button>
      </TouchFeedback>

      {errors.vehicles && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          {errors.vehicles}
        </p>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        * Required fields | ✨ Auto = Auto-populated from Airtable
      </p>

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
            Next: Prepared By ({(formData.vehicles || []).length} Vehicles)
          </button>
        </TouchFeedback>
      </div>
    </motion.form>
  );
};

export default VehicleTableStep;
