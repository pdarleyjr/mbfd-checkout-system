/**
 * Vehicle Management Component
 * 
 * Manages vehicle database from Airtable
 * Features:
 * - List all vehicles
 * - View inspection history
 * - Quick links to inspect vehicle
 * - Mobile-responsive card layout
 * - Create, Update, Delete vehicle records
 */

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/config';
import type { Vehicle } from '../../types';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { SkeletonLoader } from '../mobile/SkeletonLoader';
import { showToast } from '../mobile/Toast';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Dialog
interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  vehicleName: string;
  isDeleting: boolean;
}

function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, vehicleName, isDeleting }: DeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Dialog */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Vehicle
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{vehicleName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vehicle Form Data
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

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Form states
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
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles`);
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      showToast({ message: 'Failed to load vehicles', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddVehicle = () => {
    resetForm();
    setModalMode('add');
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setFormData({
      regUnit: vehicle.regUnit || '',
      agency: vehicle.agency || '',
      vehicleMake: vehicle.vehicleMake || '',
      vehicleType: vehicle.vehicleType || '',
      incidentId: vehicle.incidentId || '',
      vehicleId: vehicle.vehicleId || '',
      features: vehicle.features || '',
      licenseNumber: vehicle.licenseNumber || '',
      notes: vehicle.notes || '',
      vehicleStatus: vehicle.vehicleStatus || 'Active'
    });
    setModalMode('edit');
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteDialogOpen(true);
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
      const url = modalMode === 'add' 
        ? `${API_BASE_URL}/vehicles`
        : `${API_BASE_URL}/vehicles/${selectedVehicle?.id}`;
      
      const method = modalMode === 'add' ? 'POST' : 'PATCH';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save vehicle');
      }
      
      showToast({ 
        message: modalMode === 'add' ? 'Vehicle created successfully' : 'Vehicle updated successfully', 
        type: 'success' 
      });
      
      setIsModalOpen(false);
      resetForm();
      await fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to save vehicle', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedVehicle) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/${selectedVehicle.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete vehicle');
      }
      
      showToast({ message: 'Vehicle deleted successfully', type: 'success' });
      setIsDeleteDialogOpen(false);
      setSelectedVehicle(null);
      await fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to delete vehicle', 
        type: 'error' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const searchLower = searchTerm.toLowerCase();
    return (
      vehicle.regUnit?.toLowerCase().includes(searchLower) ||
      vehicle.vehicleMake?.toLowerCase().includes(searchLower) ||
      vehicle.vehicleType?.toLowerCase().includes(searchLower) ||
      vehicle.licenseNumber?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} type="card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Vehicle Management
        </h1>
        <TouchFeedback>
          <button
            onClick={handleAddVehicle}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add New Vehicle
          </button>
        </TouchFeedback>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <input
          type="search"
          placeholder="Search vehicles by name, make, model, or license plate..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No vehicles found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Try a different search term' : 'Get started by adding a new vehicle'}
            </p>
          </div>
        ) : (
          filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              {/* Vehicle Icon & Name */}
              <div className="flex items-start gap-3 mb-4">
                <div className="text-4xl">
                  {vehicle.vehicleType?.toLowerCase().includes('truck') ? '🚛' : '🚗'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {vehicle.regUnit}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {vehicle.vehicleMake} {vehicle.vehicleType}
                  </p>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="space-y-2 text-sm">
                {vehicle.licenseNumber && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="font-medium">License:</span>
                    <span>{vehicle.licenseNumber}</span>
                  </div>
                )}
                {vehicle.agency && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Agency:</span>
                    <span>{vehicle.agency}</span>
                  </div>
                )}
                {vehicle.vehicleStatus && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.vehicleStatus === 'Active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {vehicle.vehicleStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {vehicle.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {vehicle.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <TouchFeedback>
                  <a
                    href={`/?vehicle=${encodeURIComponent(vehicle.regUnit)}`}
                    className="flex-1 py-2 px-4 bg-[#0066FF] text-white rounded-lg text-center text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    📋 New Inspection
                  </a>
                </TouchFeedback>
                <TouchFeedback>
                  <button
                    onClick={() => handleEditVehicle(vehicle)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Edit Vehicle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </TouchFeedback>
                <TouchFeedback>
                  <button
                    onClick={() => handleDeleteVehicle(vehicle)}
                    className="p-2 border border-red-300 dark:border-red-600 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete Vehicle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </TouchFeedback>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Vehicle' : 'Edit Vehicle'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>

          {/* Insurance Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Insurance Status
            </label>
            <select
              value={formData.vehicleStatus}
              onChange={(e) => setFormData({ ...formData, vehicleStatus: e.target.value as VehicleFormData['vehicleStatus'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
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
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {modalMode === 'add' ? 'Create Vehicle' : 'Update Vehicle'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        vehicleName={selectedVehicle?.regUnit || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}
