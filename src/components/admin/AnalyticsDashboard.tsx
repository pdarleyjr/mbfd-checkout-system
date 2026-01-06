/**
 * Analytics Dashboard Component
 * 
 * Displays statistics, trends, and insights for ICS-212 forms
 * Features:
 * - Key metrics cards (total forms, hold rate, etc.)
 * - Interactive charts using Recharts
 * - Mobile-responsive grid layout
 * - Real-time data updates
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '../../lib/config';
import { SkeletonLoader } from '../mobile/SkeletonLoader';

interface AnalyticsData {
  totalForms: number;
  formsThisMonth: number;
  formsThisWeek: number;
  holdRate: number;
  releaseRate: number;
  topVehicles: Array<{ vehicleId: string; count: number}>;
  safetyItemFailures: Array<{ item: string; count: number }>;
  formsPerDay: Array<{ date: string; count: number }>;
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ics212/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} type="card" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center text-red-500 p-4">Failed to load analytics</div>;
  }

  const pieData = [
    { name: 'HOLD', value: Math.round(analytics.holdRate), color: '#ef4444' },
    { name: 'RELEASED', value: Math.round(analytics.releaseRate), color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Forms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Forms</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.totalForms}
              </p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.formsThisMonth}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        {/* HOLD Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">HOLD Rate</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                {analytics.holdRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-4xl">🔴</div>
          </div>
        </div>

        {/* RELEASED Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">RELEASED Rate</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {analytics.releaseRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-4xl">🟢</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms Per Day Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Forms Per Day (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.formsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Release Decision Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Release Decisions
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Vehicles Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top 10 Vehicles by Inspection Count
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.topVehicles.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="vehicleId" 
                stroke="#9ca3af"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 10 }}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Safety Item Failures */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Safety Item Failures
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.safetyItemFailures.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis 
                type="category" 
                dataKey="item" 
                stroke="#9ca3af"
                width={150}
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
