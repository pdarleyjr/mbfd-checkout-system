/**
 * Forms List Component
 * 
 * Displays ICS-212 and ICS-218 forms with real-time search, filtering, and pagination
 * Features:
 * - Mobile-responsive card/list layout
 * - Form type filter (All, ICS 212, ICS 218)
 * - Real-time search across vehicle ID, incident name, inspector
 * - Filter by status (HOLD/RELEASED for ICS 212)
 * - Swipeable list items with quick actions
 * - Pull-to-refresh
 * - Infinite scroll pagination
 * - Edit and Regenerate PDF functionality for ICS-212 forms
 */

import { useState, useCallback, useEffect } from 'react';
import { SwipeableListItem } from '../mobile/SwipeableListItem';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { SkeletonLoader } from '../mobile/SkeletonLoader';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { showToast } from '../mobile/Toast';
import { BottomSheet } from '../mobile/BottomSheet';
import { FormDetail } from './FormDetail';
import { ICS218Detail } from './ICS218Detail';
import { EditSubmissionModal } from './EditSubmissionModal';
import { EmailModal } from './EmailModal';
import { API_BASE_URL, API_ENDPOINTS } from '../../lib/config';
import { Edit, RefreshCw, DownloadCloud, Mail } from 'lucide-react';

interface ICS212Form {
  id: number;
  form_id: string;
  incident_name: string;
  vehicle_id_no: string;
  vehicle_type: string;
  release_decision: 'hold' | 'release';
  inspector_name_print: string;
  inspector_date: string;
  inspector_time: string;
  pdf_url?: string;
  github_issue_number?: number;
  created_at: string;
  pass_count?: number;
  fail_count?: number;
  formType: 'ICS212';
}

interface ICS218Form {
  id: string;
  incident_name: string;
  incident_number: string;
  date_prepared: string;
  time_prepared: string;
  vehicle_category: string;
  prepared_by_name: string;
  pdf_url?: string;
  github_issue_number?: number;
  created_at: string;
  vehicleCount: number;
  formType: 'ICS218';
}

type UnifiedForm = ICS212Form | ICS218Form;

export function FormsList() {
  const [forms, setForms] = useState<UnifiedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [formTypeFilter, setFormTypeFilter] = useState<'all' | 'ICS212' | 'ICS218'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'hold' | 'release'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFormType, setSelectedFormType] = useState<'ICS212' | 'ICS218' | null>(null);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<ICS212Form | null>(null);
  const [regeneratingPdfId, setRegeneratingPdfId] = useState<string | null>(null);

  // Batch selection state
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const fetchForms = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!append) setLoading(true);

    try {
      const promises: Promise<any>[] = [];
      
      // Fetch ICS 212 forms if needed
      if (formTypeFilter === 'all' || formTypeFilter === 'ICS212') {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '20',
          sortBy: 'date',
          sortOrder: 'desc',
        });

        if (searchTerm) params.set('search', searchTerm);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);

        promises.push(
          fetch(`${API_BASE_URL}/ics212/forms?${params}`)
            .then(r => r.ok ? r.json() : { forms: [] })
            .then(data => data.forms.map((f: ICS212Form) => ({ ...f, formType: 'ICS212' as const })))
        );
      }
      
      // Fetch ICS 218 forms if needed
      if (formTypeFilter === 'all' || formTypeFilter === 'ICS218') {
        const params = new URLSearchParams({
          limit: '20',
          offset: ((pageNum - 1) * 20).toString(),
        });

        if (searchTerm) params.set('incident', searchTerm);

        promises.push(
          fetch(`${API_ENDPOINTS.ics218Forms}?${params}`)
            .then(r => r.ok ? r.json() : { forms: [] })
            .then(data => data.forms.map((f: any) => ({ ...f, formType: 'ICS218' as const })))
        );
      }

      const results = await Promise.all(promises);
      const allForms = results.flat();
      
      // Sort by created_at date
      allForms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      if (append) {
        setForms(prev => [...prev, ...allForms]);
      } else {
        setForms(allForms);
      }
      
      // For simplicity, set totalPages based on result count
      setTotalPages(allForms.length >= 20 ? pageNum + 1 : pageNum);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching forms:', error);
      showToast({ message: 'Failed to load forms', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, formTypeFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchForms(1, false);
  }, [searchTerm, formTypeFilter, statusFilter, dateFrom, dateTo]);

  const handleRefresh = async () => {
    await fetchForms(1, false);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loading) {
      fetchForms(page + 1, true);
    }
  };

  const handleDownloadPDF = async (form: UnifiedForm) => {
    if (!form.pdf_url) {
      showToast({ message: 'PDF not available', type: 'error' });
      return;
    }
    window.open(form.pdf_url, '_blank');
  };

  const handleViewForm = (formId: string, formType: 'ICS212' | 'ICS218') => {
    setSelectedFormId(formId);
    setSelectedFormType(formType);
  };

  const handleEditForm = (form: ICS212Form) => {
    setSelectedSubmission(form);
    setIsEditModalOpen(true);
  };

  const handleRegeneratePDF = async (formId: string) => {
    setRegeneratingPdfId(formId);
    try {
      const response = await fetch(`${API_BASE_URL}/ics212/forms/${formId}/regenerate-pdf`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate PDF');
      }

      showToast({ message: 'PDF regenerated successfully', type: 'success' });
      // Refresh forms list to show new PDF URL
      await fetchForms(1, false);
    } catch (error) {
      console.error('Error regenerating PDF:', error);
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to regenerate PDF', 
        type: 'error' 
      });
    } finally {
      setRegeneratingPdfId(null);
    }
  };

  const handleSaveEdit = async () => {
    // Refresh forms list after successful save
    await fetchForms(1, false);
  };

  // Toggle individual checkbox
  const toggleFormSelection = (formId: string) => {
    setSelectedFormIds((prev) =>
      prev.includes(formId)
        ? prev.filter((id) => id !== formId)
        : [...prev, formId]
    );
  };

  // Select all ICS-212 forms (max 50)
  const selectAllForms = () => {
    const ics212Forms = forms
      .filter((f) => f.formType === 'ICS212')
      .map((f) => (f as ICS212Form).form_id);
    
    if (ics212Forms.length > 50) {
      showToast({ 
        message: 'Maximum 50 forms can be downloaded at once. First 50 selected.', 
        type: 'warning' 
      });
      setSelectedFormIds(ics212Forms.slice(0, 50));
    } else {
      setSelectedFormIds(ics212Forms);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFormIds([]);
  };

  // Batch download handler
  const handleBatchDownload = async () => {
    if (selectedFormIds.length === 0) return;

    setIsDownloadingBatch(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ics212/forms/batch-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formIds: selectedFormIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download forms');
      }

      // Get success/failure counts from headers
      const successCount = response.headers.get('X-Success-Count');
      const failureCount = response.headers.get('X-Failure-Count');

      // Download ZIP file
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || 'ICS212_Forms.zip';

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success message
      let message = `Downloaded ${successCount || selectedFormIds.length} forms`;
      if (failureCount && parseInt(failureCount) > 0) {
        message += ` (${failureCount} PDFs not available)`;
      }
      showToast({ message, type: 'success' });
      
      // Clear selection
      clearSelection();
    } catch (error) {
      console.error('Batch download error:', error);
      showToast({ 
        message: error instanceof Error ? error.message : 'Failed to download forms', 
        type: 'error' 
      });
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const getFormTypeBadge = (formType: 'ICS212' | 'ICS218') => {
    if (formType === 'ICS212') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          ICS 212
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        ICS 218
      </span>
    );
  };

  const getStatusBadge = (status: 'hold' | 'release') => {
    if (status === 'hold') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          🔴 HOLD
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        🟢 RELEASED
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
        {/* Search Input */}
        <div>
          <input
            type="search"
            placeholder="Search by vehicle ID, incident, or inspector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Form Type Filter Pills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Form Type
          </label>
          <div className="flex flex-wrap gap-2">
            <TouchFeedback>
              <button
                onClick={() => setFormTypeFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formTypeFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                All Forms
              </button>
            </TouchFeedback>
            <TouchFeedback>
              <button
                onClick={() => setFormTypeFilter('ICS212')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formTypeFilter === 'ICS212'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                ICS 212
              </button>
            </TouchFeedback>
            <TouchFeedback>
              <button
                onClick={() => setFormTypeFilter('ICS218')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formTypeFilter === 'ICS218'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                ICS 218
              </button>
            </TouchFeedback>
          </div>
        </div>

        {/* Status Filter (ICS 212 only) */}
        {(formTypeFilter === 'all' || formTypeFilter === 'ICS212') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status (ICS 212)
            </label>
            <div className="flex flex-wrap gap-2">
              <TouchFeedback>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  All
                </button>
              </TouchFeedback>
              <TouchFeedback>
                <button
                  onClick={() => setStatusFilter('hold')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === 'hold'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  HOLD
                </button>
              </TouchFeedback>
              <TouchFeedback>
                <button
                  onClick={() => setStatusFilter('release')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === 'release'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  RELEASED
                </button>
              </TouchFeedback>
            </div>
          </div>
        )}

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar - Show when items selected */}
      {selectedFormIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedFormIds.length} form{selectedFormIds.length > 1 ? 's' : ''} selected
              </span>
              <TouchFeedback>
                <button
                  onClick={clearSelection}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Clear Selection
                </button>
              </TouchFeedback>
            </div>
            <div className="flex gap-2">
              <TouchFeedback>
                <button
                  onClick={handleBatchDownload}
                  disabled={isDownloadingBatch}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  {isDownloadingBatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-4 h-4" />
                      Download Selected ({selectedFormIds.length})
                    </>
                  )}
                </button>
              </TouchFeedback>
              <TouchFeedback>
                <button
                  onClick={() => {
                    if (selectedFormIds.length > 10) {
                      showToast({ message: 'Maximum 10 forms can be emailed at once', type: 'warning' });
                      return;
                    }
                    setIsEmailModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Email Selected ({selectedFormIds.length})
                </button>
              </TouchFeedback>
            </div>
          </div>
        </div>
      )}

      {/* Select All Checkbox - Show for ICS-212 forms */}
      {!loading && forms.filter((f) => f.formType === 'ICS212').length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
          <TouchFeedback>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  selectedFormIds.length > 0 &&
                  selectedFormIds.length === forms.filter((f) => f.formType === 'ICS212').length
                }
                onChange={(e) => (e.target.checked ? selectAllForms() : clearSelection())}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select All ICS-212 Forms ({forms.filter((f) => f.formType === 'ICS212').length})
              </span>
            </label>
          </TouchFeedback>
        </div>
      )}

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {forms.length} form{forms.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Forms List */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-3">
          {loading && page === 1 ? (
            // Initial loading state
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLoader key={i} type="card" />
            ))
          ) : forms.length === 0 ? (
            // Empty state
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No forms found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            // Forms list
            forms.map((form) => (
              <SwipeableListItem
                key={`${form.formType}-${form.id}`}
                leftAction={{
                  label: 'View',
                  color: '#3b82f6',
                  onTrigger: () => handleViewForm(
                    form.formType === 'ICS212' ? (form as ICS212Form).form_id : (form as ICS218Form).id,
                    form.formType
                  )
                }}
                rightAction={{
                  label: 'Download',
                  color: '#10b981',
                  onTrigger: () => handleDownloadPDF(form)
                }}
              >
                <TouchFeedback>
                  <div
                    onClick={() => handleViewForm(
                      form.formType === 'ICS212' ? (form as ICS212Form).form_id : (form as ICS218Form).id,
                      form.formType
                    )}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox - Only for ICS-212 forms */}
                      {form.formType === 'ICS212' && (
                        <div 
                          className="flex-shrink-0 pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TouchFeedback>
                            <input
                              type="checkbox"
                              checked={selectedFormIds.includes((form as ICS212Form).form_id)}
                              onChange={() => toggleFormSelection((form as ICS212Form).form_id)}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </TouchFeedback>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Form Type Badge and Primary Info */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getFormTypeBadge(form.formType)}
                          {form.formType === 'ICS212' && (
                            <>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {(form as ICS212Form).vehicle_id_no}
                              </h3>
                              {getStatusBadge((form as ICS212Form).release_decision)}
                            </>
                          )}
                          {form.formType === 'ICS218' && (
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                              {(form as ICS218Form).incident_name}
                            </h3>
                          )}
                        </div>

                        {/* Incident Name / Secondary Info */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                          {form.formType === 'ICS212' ? (form as ICS212Form).incident_name : (form as ICS218Form).vehicle_category}
                        </p>

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          {form.formType === 'ICS212' && (
                            <>
                              <span>🔍 {(form as ICS212Form).inspector_name_print}</span>
                              <span>📅 {new Date((form as ICS212Form).inspector_date).toLocaleDateString()}</span>
                              {(form as ICS212Form).pass_count !== undefined && (form as ICS212Form).fail_count !== undefined && (
                                <span>
                                  ✅ {(form as ICS212Form).pass_count} / ❌ {(form as ICS212Form).fail_count}
                                </span>
                              )}
                            </>
                          )}
                          {form.formType === 'ICS218' && (
                            <>
                              <span>👤 {(form as ICS218Form).prepared_by_name}</span>
                              <span>📅 {new Date((form as ICS218Form).date_prepared).toLocaleDateString()}</span>
                              <span>🚗 {(form as ICS218Form).vehicleCount} vehicle{(form as ICS218Form).vehicleCount !== 1 ? 's' : ''}</span>
                            </>
                          )}
                        </div>

                        {/* Action Buttons for ICS-212 */}
                        {form.formType === 'ICS212' && (
                          <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                            <TouchFeedback>
                              <button
                                onClick={() => handleEditForm(form as ICS212Form)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                              >
                                <Edit className="w-3 h-3" />
                                Edit
                              </button>
                            </TouchFeedback>
                            <TouchFeedback>
                              <button
                                onClick={() => handleRegeneratePDF((form as ICS212Form).form_id)}
                                disabled={regeneratingPdfId === (form as ICS212Form).form_id}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RefreshCw className={`w-3 h-3 ${regeneratingPdfId === (form as ICS212Form).form_id ? 'animate-spin' : ''}`} />
                                {regeneratingPdfId === (form as ICS212Form).form_id ? 'Regenerating...' : 'Regenerate PDF'}
                              </button>
                            </TouchFeedback>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </TouchFeedback>
              </SwipeableListItem>
            )) 
          )}
        </div>
      </PullToRefresh>

      {/* Load More Button */}
      {page < totalPages && !loading && (
        <TouchFeedback>
          <button
            onClick={handleLoadMore}
            className="w-full py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Load More
          </button>
        </TouchFeedback>
      )}

      {/* Loading more indicator */}
      {loading && page > 1 && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Form Detail Modals */}
      {selectedFormId && selectedFormType === 'ICS212' && (
        <BottomSheet isOpen={true} onClose={() => setSelectedFormId(null)} title="Form Details">
          <FormDetail formId={selectedFormId} />
        </BottomSheet>
      )}

      {selectedFormId && selectedFormType === 'ICS218' && (
        <BottomSheet isOpen={true} onClose={() => setSelectedFormId(null)} title="Form Details">
          <ICS218Detail formId={selectedFormId} />
        </BottomSheet>
      )}

      {/* Edit Submission Modal */}
      {isEditModalOpen && selectedSubmission && (
        <EditSubmissionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedSubmission(null);
          }}
          submission={selectedSubmission}
          onSave={handleSaveEdit}
        />
      )}

      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        selectedForms={forms.filter((f) => f.formType === 'ICS212' && selectedFormIds.includes((f as ICS212Form).form_id))}
        onSuccess={() => {
          clearSelection();
          fetchForms(1, false);
        }}
      />
    </div>
  );
}
