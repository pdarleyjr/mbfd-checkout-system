/**
 * Edit Submission Modal Component
 * 
 * Modal for editing ICS-212 form submissions from admin dashboard
 * Features:
 * - Full form editing capabilities
 * - Inspection items with Pass/Fail/N/A selection
 * - Auto-calculation of release decision
 * - PATCH API integration
 * - Mobile-responsive layout
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { showToast } from '../mobile/Toast';
import { API_BASE_URL } from '../../lib/config';
import type { InspectionItem } from '../../types';

interface EditSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
  onSave: () => void;
}

export function EditSubmissionModal({ isOpen, onClose, submission, onSave }: EditSubmissionModalProps) {
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // When submission changes, update formData
  useEffect(() => {
    if (submission && isOpen) {
      // Parse inspection_items if it's a JSON string
      const inspectionItems = typeof submission.inspection_items === 'string' 
        ? JSON.parse(submission.inspection_items)
        : submission.inspection_items || [];

      setFormData({
        ...submission,
        inspection_items: inspectionItems,
      });
    }
  }, [submission, isOpen]);

  // Calculate release decision based on inspection items
  const releaseDecision = useMemo(() => {
    if (!formData?.inspection_items) return formData?.release_decision || 'release';
    
    const safetyItemsFailed = formData.inspection_items.some(
      (item: InspectionItem) => item.isSafetyItem && item.status === 'fail'
    );
    return safetyItemsFailed ? 'hold' : 'release';
  }, [formData?.inspection_items]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInspectionItemChange = (itemNumber: number, status: 'pass' | 'fail' | 'n/a') => {
    setFormData((prev: any) => ({
      ...prev,
      inspection_items: prev.inspection_items.map((item: InspectionItem) =>
        item.itemNumber === itemNumber ? { ...item, status } : item
      ),
    }));
  };

  const handleSave = async () => {
    if (!formData || !submission?.form_id) return;

    setIsSaving(true);
    try {
      // Prepare data for PATCH request
      const updateData = {
        incident_name: formData.incident_name,
        inspector_date: formData.inspector_date,
        inspector_time: formData.inspector_time,
        order_no: formData.order_no,
        vehicle_type: formData.vehicle_type,
        vehicle_license_no: formData.vehicle_license_no,
        agency_reg_unit: formData.agency_reg_unit,
        vehicle_id_no: formData.vehicle_id_no,
        inspection_items: JSON.stringify(formData.inspection_items),
        additional_comments: formData.additional_comments,
        release_decision: releaseDecision,
        inspector_name_print: formData.inspector_name_print,
      };

      const response = await fetch(`${API_BASE_URL}/ics212/forms/${submission.form_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update submission');
      }

      showToast({ message: 'Submission updated successfully', type: 'success' });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating submission:', error);
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to update submission', 
        type: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!formData) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            {/* Modal */}
            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:w-full md:max-w-4xl bg-white dark:bg-gray-800 md:rounded-lg shadow-xl overflow-hidden flex flex-col md:max-h-[90vh]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header - Sticky */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                  <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                    Edit ICS-212 Submission
                  </Dialog.Title>
                  <TouchFeedback>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={isSaving}
                    >
                      <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </TouchFeedback>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-6">
                    {/* Release Decision Banner */}
                    <div className={`
                      p-4 rounded-xl border-2 flex items-center gap-3
                      ${releaseDecision === 'hold'
                        ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-700'
                        : 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-700'
                      }
                    `}>
                      {releaseDecision === 'hold' ? (
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      )}
                      <div>
                        <p className={`font-bold text-lg ${releaseDecision === 'hold' ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>
                          {releaseDecision === 'hold' ? '🔴 HOLD FOR REPAIRS' : '🟢 RELEASED'}
                        </p>
                        {releaseDecision === 'hold' && (
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Safety Item – Do Not Release Until Repaired
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Incident Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Incident Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Incident Name *
                          </label>
                          <input
                            type="text"
                            value={formData.incident_name || ''}
                            onChange={(e) => handleFieldChange('incident_name', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Date *
                            </label>
                            <input
                              type="date"
                              value={formData.inspector_date || ''}
                              onChange={(e) => handleFieldChange('inspector_date', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Time *
                            </label>
                            <input
                              type="time"
                              value={formData.inspector_time || ''}
                              onChange={(e) => handleFieldChange('inspector_time', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Order Number
                          </label>
                          <input
                            type="text"
                            value={formData.order_no || ''}
                            onChange={(e) => handleFieldChange('order_no', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Vehicle Information
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle Type *
                            </label>
                            <input
                              type="text"
                              value={formData.vehicle_type || ''}
                              onChange={(e) => handleFieldChange('vehicle_type', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              License Number *
                            </label>
                            <input
                              type="text"
                              value={formData.vehicle_license_no || ''}
                              onChange={(e) => handleFieldChange('vehicle_license_no', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Agency Reg/Unit *
                            </label>
                            <input
                              type="text"
                              value={formData.agency_reg_unit || ''}
                              onChange={(e) => handleFieldChange('agency_reg_unit', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Vehicle ID
                            </label>
                            <input
                              type="text"
                              value={formData.vehicle_id_no || ''}
                              onChange={(e) => handleFieldChange('vehicle_id_no', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inspection Items */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Inspection Items
                      </h3>
                      <div className="space-y-3">
                        {formData.inspection_items?.map((item: InspectionItem) => (
                          <div key={item.itemNumber} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-start gap-3">
                              {item.isSafetyItem && (
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                              )}
                              <div className="flex-1">
                                <div className="mb-3">
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {item.itemNumber}. {item.description}
                                  </h4>
                                  {item.reference && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.reference}</p>
                                  )}
                                </div>

                                {/* Status Buttons */}
                                <div className="flex gap-2">
                                  <TouchFeedback>
                                    <button
                                      type="button"
                                      onClick={() => handleInspectionItemChange(item.itemNumber, 'pass')}
                                      className={`
                                        flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                                        font-medium transition-all border-2
                                        ${item.status === 'pass'
                                          ? 'bg-green-500 text-white border-green-600 shadow-md'
                                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                        }
                                      `}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Pass
                                    </button>
                                  </TouchFeedback>

                                  <TouchFeedback>
                                    <button
                                      type="button"
                                      onClick={() => handleInspectionItemChange(item.itemNumber, 'fail')}
                                      className={`
                                        flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                                        font-medium transition-all border-2
                                        ${item.status === 'fail'
                                          ? 'bg-red-500 text-white border-red-600 shadow-md'
                                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                        }
                                      `}
                                    >
                                      <XCircle className="w-4 h-4" />
                                      Fail
                                    </button>
                                  </TouchFeedback>

                                  <TouchFeedback>
                                    <button
                                      type="button"
                                      onClick={() => handleInspectionItemChange(item.itemNumber, 'n/a')}
                                      className={`
                                        flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                                        font-medium transition-all border-2
                                        ${item.status === 'n/a'
                                          ? 'bg-gray-400 text-white border-gray-500 shadow-md'
                                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                                        }
                                      `}
                                    >
                                      N/A
                                    </button>
                                  </TouchFeedback>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Additional Comments
                      </h3>
                      <textarea
                        value={formData.additional_comments || ''}
                        onChange={(e) => handleFieldChange('additional_comments', e.target.value)}
                        rows={4}
                        placeholder="Any additional notes or observations..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                      />
                    </div>

                    {/* Inspector Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Inspector Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Inspector Name *
                          </label>
                          <input
                            type="text"
                            value={formData.inspector_name_print || ''}
                            onChange={(e) => handleFieldChange('inspector_name_print', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        {/* Signature Display (Read-only) */}
                        {formData.inspector_signature && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Inspector Signature (Read-only)
                            </label>
                            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                              <img
                                src={formData.inspector_signature}
                                alt="Inspector Signature"
                                className="max-w-xs h-auto"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer - Sticky */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-white dark:bg-gray-800">
                  <TouchFeedback>
                    <button
                      onClick={onClose}
                      className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </TouchFeedback>
                  <TouchFeedback>
                    <button
                      onClick={handleSave}
                      className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      disabled={isSaving}
                    >
                      {isSaving && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </TouchFeedback>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
