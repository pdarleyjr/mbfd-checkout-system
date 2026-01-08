import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import type {
  AnalyticsTimeframe,
  AdvancedAnalyticsResponse,
} from '../../../types';
import { API_BASE_URL } from '../../../lib/config';
import { cn } from '../../../lib/utils';

interface ProgressTrackingModuleProps {
  adminPassword: string;
}

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  secondary: '#8b5cf6',
};

export const ProgressTrackingModule: React.FC<ProgressTrackingModuleProps> = ({
  adminPassword,
}) => {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>({
    type: 'last30',
  });
  const [analytics, setAnalytics] = useState<AdvancedAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('timeframe', timeframe.type);
      if (timeframe.startDate) params.append('startDate', timeframe.startDate);
      if (timeframe.endDate) params.append('endDate', timeframe.endDate);

      const response = await fetch(`${API_BASE_URL}/analytics/advanced?${params}`, {
        headers: {
          'X-Admin-Password': adminPassword,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [adminPassword, timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  // Timeframe change handler
  const handleTimeframeChange = (type: AnalyticsTimeframe['type']) => {
    if (type === 'custom') {
      setShowDatePicker(true);
    } else {
      setTimeframe({ type });
    }
  };

  // Custom date range handler
  const handleCustomDateRange = () => {
    if (!customStartDate || !customEndDate) return;
    setTimeframe({
      type: 'custom',
      startDate: customStartDate,
      endDate: customEndDate,
    });
    setShowDatePicker(false);
  };

  // Export data as CSV
  const handleExportData = () => {
    if (!analytics) return;

    const csv = [
      'Metric,Value',
      `Total Submissions,${analytics.statistics.totalSubmissions}`,
      `Completion Rate,${analytics.statistics.completionRate}%`,
      `Pending Forms,${analytics.statistics.pendingForms}`,
      `Released Vehicles,${analytics.statistics.releasedVehicles}`,
      `Hold Vehicles,${analytics.statistics.holdVehicles}`,
      `Average Completion Time,${analytics.statistics.averageCompletionTime} min`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Metric Card Component
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    trend?: number;
    icon: React.ReactNode;
    color: string;
    warning?: boolean;
  }> = ({ title, value, trend, icon, color, warning }) => (
    <div
      className={cn(
        'bg-white rounded-lg border p-4 shadow-sm',
        warning && 'border-red-300 bg-red-50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center mt-2">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  trend > 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>{icon}</div>
      </div>
    </div>
  );

  if (loading && !analytics) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">Progress & Analytics</h2>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">Progress & Analytics</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to Load Analytics
            </h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchAnalytics} size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold text-gray-900">Progress & Analytics</h2>
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                autoRefresh
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              title="Auto-refresh every 30 seconds"
            >
              <RefreshCw
                className={cn('w-4 h-4', autoRefresh && 'animate-spin')}
              />
            </button>

            {/* Export button */}
            <Button size="sm" variant="secondary" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            {/* Timeframe selector */}
            <select
              value={timeframe.type}
              onChange={(e) =>
                handleTimeframeChange(e.target.value as AnalyticsTimeframe['type'])
              }
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="last30">Last 30 Days</option>
              <option value="deployment">Current Deployment</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Total Submissions"
            value={analytics.statistics.totalSubmissions}
            trend={analytics.statistics.totalSubmissionsTrend}
            icon={<CheckCircle2 className="w-6 h-6 text-blue-600" />}
            color="blue"
          />
          <MetricCard
            title="Completion Rate"
            value={`${analytics.statistics.completionRate}%`}
            trend={analytics.statistics.completionRateTrend}
            icon={<TrendingUp className="w-6 h-6 text-green-600" />}
            color="green"
          />
          <MetricCard
            title="Pending Forms"
            value={analytics.statistics.pendingForms}
            icon={<Clock className="w-6 h-6 text-yellow-600" />}
            color="yellow"
            warning={analytics.statistics.pendingForms > 5}
          />
          <MetricCard
            title="Released Vehicles"
            value={analytics.statistics.releasedVehicles}
            icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
            color="green"
          />
          <MetricCard
            title="Hold Vehicles"
            value={analytics.statistics.holdVehicles}
            icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
            color="red"
            warning={analytics.statistics.holdVehicles > 0}
          />
          <MetricCard
            title="Avg. Completion Time"
            value={`${analytics.statistics.averageCompletionTime}m`}
            icon={<Clock className="w-6 h-6 text-blue-600" />}
            color="blue"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submission Trend Chart */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Submission Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.submissionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Form Type Distribution */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Form Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.formTypeDistribution as any[]}
                  dataKey="count"
                  nameKey="formType"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: any) =>
                    `${entry.formType || entry.name}: ${entry.percentage || entry.percent}%`
                  }
                >
                  {analytics.formTypeDistribution.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        [
                          CHART_COLORS.primary,
                          CHART_COLORS.success,
                          CHART_COLORS.warning,
                          CHART_COLORS.secondary,
                        ][index % 4]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Vehicle Status Chart */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Vehicle Status
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.vehicleStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={CHART_COLORS.primary}>
                  {analytics.vehicleStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.status === 'Released'
                          ? CHART_COLORS.success
                          : entry.status === 'Hold'
                          ? CHART_COLORS.danger
                          : CHART_COLORS.warning
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Safety Item Failures */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Safety Item Failures
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={analytics.safetyItemFailures}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="item" width={90} />
                <Tooltip />
                <Bar dataKey="failureCount" fill={CHART_COLORS.danger} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Submissions Table */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-4 py-3 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Submissions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Form Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.recentSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      // Navigate to form detail
                      window.location.href = `#/admin/forms/${submission.id}`;
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {submission.formType}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {submission.vehicle}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(submission.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          submission.status === 'Released'
                            ? 'bg-green-100 text-green-700'
                            : submission.status === 'Hold'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        )}
                      >
                        {submission.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>

      {/* Custom Date Range Modal */}
      {showDatePicker && (
        <Modal
          isOpen={true}
          onClose={() => setShowDatePicker(false)}
          title="Select Custom Date Range"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDatePicker(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCustomDateRange}>
                <Calendar className="w-4 h-4 mr-2" />
                Apply
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};