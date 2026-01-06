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
 */

import { useState, useCallback, useEffect } from 'react';
import { SwipeableListItem } from '../mobile/SwipeableListItem';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { SkeletonLoader } from '../mobile/SkeletonLoader';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { Toast, showToast } from '../mobile/Toast';
import { BottomSheet } from '../mobile/BottomSheet';
import { FormDetail } from './FormDetail';
import { ICS218Detail } from './ICS218Detail';
import { API_BASE_URL, API_ENDPOINTS } from '../../lib/config';

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
                    <div className="flex items-start justify-between gap-4">
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
        </div>
      </PullToRefresh>

      {/* Form Detail Bottom Sheet */}
      {selectedFormId && selectedFormType && (
        <BottomSheet
          isOpen={!!selectedFormId}
          onClose={() => {
            setSelectedFormId(null);
            setSelectedFormType(null);
          }}
          title="Form Details"
        >
          {selectedFormType === 'ICS212' && <FormDetail formId={selectedFormId} />}
          {selectedFormType === 'ICS218' && <ICS218Detail formId={selectedFormId} />}
        </BottomSheet>
      )}

      {/* Toast Component */}
      <Toast />
    </div>
  );
}
