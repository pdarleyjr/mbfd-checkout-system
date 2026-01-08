/**
 * Analytics Dashboard Component
 * 
 * Displays statistics, trends, and insights for both ICS-212 and ICS-218 forms
 * Features:
 * - Key metrics cards (total forms, hold rate, etc.)
 * - Interactive charts using Recharts
 * - Mobile-responsive grid layout
 * - Real-time data updates
 * - Combined ICS 212 + ICS 218 analytics
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { API_BASE_URL, API_ENDPOINTS } from '../../lib/config';
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

interface ICS218Analytics {
  totalForms: number;
  totalVehicles: number;
  formsByCategory: Array<{ category: string; count: number }>;
  formsThisMonth: number;
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [ics212Analytics, setIcs212Analytics] = useState<AnalyticsData | null>(null);
  const [ics218Analytics, setIcs218Analytics] = useState<ICS218Analytics | null>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch ICS 212 analytics
      const ics212Response = await fetch(`${API_BASE_URL}/ics212/analytics`);
      if (ics212Response.ok) {
        const ics212Data = await ics212Response.json();
        setIcs212Analytics(ics212Data);
      }

      // Fetch ICS 218 forms to compute analytics
      const ics218Response = await fetch(`${API_ENDPOINTS.ics218Forms}?limit=1000`);
      if (ics218Response.ok) {
        const ics218Data = await ics218Response.json();
        const forms = ics218Data.forms || [];
        
        // Calculate ICS 218 analytics
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        const formsThisMonth = forms.filter((f: any) => {
          const formDate = new Date(f.created_at);
          return formDate.getMonth() === thisMonth && formDate.getFullYear() === thisYear;
        }).length;
        
        const totalVehicles = forms.reduce((sum: number, form: any) => sum + (form.vehicleCount || 0), 0);
        
        // Count by category
        const categoryCount: Record<string, number> = {};
        forms.forEach((form: any) => {
          const category = form.vehicle_category || 'Unknown';
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
        
        const formsByCategory = Object.entries(categoryCount).map(([category, count]) => ({
          category,
          count
        }));
        
        setIcs218Analytics({
          totalForms: forms.length,
          totalVehicles,
          formsByCategory,
          formsThisMonth
        });
      }
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

  if (!ics212Analytics) {
    return <div className="text-center text-red-500 p-4">Failed to load analytics</div>;
  }

  const pieData = [
    { name: 'HOLD', value: Math.round(ics212Analytics.holdRate), color: '#ef4444' },
    { name: 'RELEASED', value: Math.round(ics212Analytics.releaseRate), color: '#10b981' },
  ];

  // Combined form type comparison data
  const formTypeData = [
    { 
      name: 'ICS 212', 
      total: ics212Analytics.totalForms,
      thisMonth: ics212Analytics.formsThisMonth,
      color: '#3b82f6'
    },
    { 
      name: 'ICS 218', 
      total: ics218Analytics?.totalForms || 0,
      thisMonth: ics218Analytics?.formsThisMonth || 0,
      color: '#f97316'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total ICS 212 Forms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ICS 212 Forms</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {ics212Analytics.totalForms}
              </p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {ics212Analytics.formsThisMonth} this month
          </p>
        </div>

        {/* Total ICS 218 Forms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ICS 218 Forms</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {ics218Analytics?.totalForms || 0}
              </p>
            </div>
            <div className="text-4xl">🚗</div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {ics218Analytics?.formsThisMonth || 0} this month
          </p>
        </div>

        {/* HOLD Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">HOLD Rate</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                {ics212Analytics.holdRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-4xl">🔴</div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            ICS 212 only
          </p>
        </div>

        {/* Total Vehicles Tracked (ICS 218) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vehicles Tracked</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {ics218Analytics?.totalVehicles || 0}
              </p>
            </div>
            <div className="text-4xl">🚙</div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            ICS 218 vehicles
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Type Comparison Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Form Type Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Total Forms" />
              <Bar dataKey="thisMonth" fill="#10b981" name="This Month" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Release Decision Pie Chart (ICS 212) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ICS 212 Release Decisions
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

        {/* ICS 212 Forms Per Day Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ICS 212 Forms Per Day (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ics212Analytics.formsPerDay}>
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

        {/* ICS 218 Vehicle Categories */}
        {ics218Analytics && ics218Analytics.formsByCategory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ICS 218 Vehicle Categories
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ics218Analytics.formsByCategory} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis 
                  type="category" 
                  dataKey="category" 
                  stroke="#9ca3af"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Vehicles by Inspection Count (ICS 212) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top 10 Vehicles by ICS 212 Inspections
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ics212Analytics.topVehicles.slice(0, 10)}>
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
            Top Safety Item Failures (ICS 212)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ics212Analytics.safetyItemFailures.slice(0, 8)} layout="vertical">
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
