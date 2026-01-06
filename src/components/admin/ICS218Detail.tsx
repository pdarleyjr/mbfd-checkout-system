/**
 * ICS 218 Form Detail Component
 * 
 * Displays complete ICS 218 form details when admin clicks on a form
 * Shows incident info, vehicle table, prepared by info, PDF link, and GitHub issue
 */

import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../lib/config';
import { SkeletonLoader } from '../mobile/SkeletonLoader';

interface ICS218Vehicle {
  id: string;
  order_request_number?: string;
  incident_id_no?: string;
  classification: string;
  make: string;
  category_kind_type: string;
  features?: string;
  agency_owner: string;
  operator_name_contact: string;
  vehicle_license_id: string;
  incident_assignment: string;
  start_date_time: string;
  release_date_time?: string;
  row_order: number;
}

interface ICS218FormData {
  id: string;
  incident_name: string;
  incident_number: string;
  date_prepared: string;
  time_prepared: string;
  vehicle_category: string;
  prepared_by_name: string;
  prepared_by_position: string;
  signature_data: string;
  signature_timestamp: string;
  pdf_url?: string;
  pdf_filename?: string;
  github_issue_url?: string;
  github_issue_number?: number;
  created_at: string;
  vehicles: ICS218Vehicle[];
}

interface Props {
  formId: string;
}

export function ICS218Detail({ formId }: Props) {
  const [form, setForm] = useState<ICS218FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFormDetails();
  }, [formId]);

  const fetchFormDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.ics218FormById(formId));
      
      if (!response.ok) {
        throw new Error('Failed to fetch form details');
      }

      const data = await response.json();
      setForm(data.form);
    } catch (err) {
      console.error('Error fetching ICS 218 form details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (form?.pdf_url) {
      window.open(form.pdf_url, '_blank');
    }
  };

  const handleViewGitHub = () => {
    if (form?.github_issue_url) {
      window.open(form.github_issue_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <SkeletonLoader type="card" />
        <SkeletonLoader type="card" />
        <SkeletonLoader type="card" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {error || 'Form not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-h-[70vh] overflow-y-auto">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            ICS 218 - Support Vehicle/Equipment Log
          </h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            ICS 218
          </span>
        </div>
        
        {/* Incident Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Incident Name:</label>
            <p className="text-gray-900 dark:text-white">{form.incident_name}</p>
          </div>
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Incident Number:</label>
            <p className="text-gray-900 dark:text-white">{form.incident_number || 'N/A'}</p>
          </div>
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Date Prepared:</label>
            <p className="text-gray-900 dark:text-white">
              {new Date(form.date_prepared).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Time Prepared:</label>
            <p className="text-gray-900 dark:text-white">{form.time_prepared}</p>
          </div>
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Vehicle Category:</label>
            <p className="text-gray-900 dark:text-white">{form.vehicle_category}</p>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Vehicles ({form.vehicles.length})
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Classification</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Make/Type</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">License ID</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Agency</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Operator</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Assignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {form.vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 text-gray-900 dark:text-white">{vehicle.classification}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {vehicle.make} {vehicle.category_kind_type}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">{vehicle.vehicle_license_id}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">{vehicle.agency_owner}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">{vehicle.operator_name_contact}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">{vehicle.incident_assignment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prepared By Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Prepared By
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Name:</label>
            <p className="text-gray-900 dark:text-white">{form.prepared_by_name}</p>
          </div>
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Position/Title:</label>
            <p className="text-gray-900 dark:text-white">{form.prepared_by_position}</p>
          </div>
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Signature Date/Time:</label>
            <p className="text-gray-900 dark:text-white">
              {new Date(form.signature_timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Signature Preview */}
        {form.signature_data && (
          <div className="mt-4">
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-2">Signature:</label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-900 inline-block">
              <img 
                src={form.signature_data} 
                alt="Signature" 
                className="max-w-xs h-20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {form.pdf_url && (
          <button
            onClick={handleDownloadPDF}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        )}
        
        {form.github_issue_url && (
          <button
            onClick={handleViewGitHub}
            className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View GitHub Issue
          </button>
        )}
      </div>

      {/* Meta Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Form ID: {form.id} | Submitted: {new Date(form.created_at).toLocaleString()}
      </div>
    </div>
  );
}
