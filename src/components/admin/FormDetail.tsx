/**
 * Form Detail Component
 * 
 * Displays complete ICS-212 form information with PDF preview
 * Features:
 * - PDF preview in iframe
 * - Complete form metadata
 * - Download PDF button
 * - Email distribution button
 * - Vehicle history timeline
 */

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/config';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { showToast } from '../mobile/Toast';

interface FormDetailProps {
  formId: string;
}

export function FormDetail({ formId }: FormDetailProps) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    fetchFormDetail();
  }, [formId]);

  const fetchFormDetail = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ics212/forms/${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      const data = await response.json();
      setForm(data.form);
    } catch (error) {
      console.error('Error fetching form detail:', error);
      showToast({ message: 'Failed to load form details', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (form?.pdf_url) {
      window.open(form.pdf_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Form not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-xl text-gray-900 dark:text-white">
          {form.vehicle_id_no}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{form.incident_name}</p>
        <div className="mt-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            form.release_decision === 'hold' 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {form.release_decision === 'hold' ? '🔴 HOLD' : '🟢 RELEASED'}
          </span>
        </div>
      </div>

      {/* PDF Preview */}
      {form.pdf_url && (
        <div className="px-4">
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
            <iframe
              src={form.pdf_url}
              className="w-full"
              style={{ height: '400px' }}
              title="PDF Preview"
            />
          </div>
          <TouchFeedback>
            <button
              onClick={handleDownloadPDF}
              className="w-full mt-2 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              📥 Download PDF
            </button>
          </TouchFeedback>
        </div>
      )}

      {/* Form Details */}
      <div className="px-4 space-y-3">
        <h4 className="font-semibold text-gray-900 dark:text-white">Inspection Details</h4>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Inspector:</span>
            <p className="text-gray-900 dark:text-white">{form.inspector_name_print}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Date:</span>
            <p className="text-gray-900 dark:text-white">{form.inspector_date}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Time:</span>
            <p className="text-gray-900 dark:text-white">{form.inspector_time}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Vehicle Type:</span>
            <p className="text-gray-900 dark:text-white">{form.vehicle_type}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">License:</span>
            <p className="text-gray-900 dark:text-white">{form.vehicle_license_no}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Agency/Unit:</span>
            <p className="text-gray-900 dark:text-white">{form.agency_reg_unit}</p>
          </div>
        </div>

        {form.additional_comments && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Comments:</span>
            <p className="text-sm text-gray-900 dark:text-white mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded">
              {form.additional_comments}
            </p>
          </div>
        )}

        {form.github_issue_number && (
          <TouchFeedback>
            <a
              href={`https://github.com/pdarleyjr/mbfd-checkout-system/issues/${form.github_issue_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-lg text-center font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              View GitHub Issue #{form.github_issue_number} →
            </a>
          </TouchFeedback>
        )}
      </div>
    </div>
  );
}
