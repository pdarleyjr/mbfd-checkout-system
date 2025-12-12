import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, AlertTriangle, CheckCircle, TrendingUp, Package, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { githubService } from '../lib/github';
import { APPARATUS_LIST } from '../lib/config';

interface AIFleetInsightsProps {
  adminPassword: string;
  onCriticalAlertCount?: (count: number) => void;
}

interface AIInsightsData {
  insights: string[];
  dataPoints: number;
  timeframe: string;
  apparatus: string;
  generatedAt: string;
}

export const AIFleetInsights: React.FC<AIFleetInsightsProps> = ({ adminPassword, onCriticalAlertCount }) => {
  const [aiInsights, setAiInsights] = useState<AIInsightsData | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const [selectedApparatus, setSelectedApparatus] = useState<string>('all');

  const loadAIInsights = async () => {
    if (!adminPassword) {
      setInsightsError('Admin authentication required');
      return;
    }
    
    setIsLoadingInsights(true);
    setInsightsError(null);
    
    try {
      const apparatus = selectedApparatus === 'all' ? undefined : selectedApparatus;
      const insights = await githubService.getAIInsights(
        adminPassword,
        selectedTimeframe,
        apparatus
      );
      
      setAiInsights(insights);
      
      // Check for critical alerts
      const criticalCount = insights.insights.filter((insight: string) => 
        insight.toLowerCase().includes('critical') || 
        insight.toLowerCase().includes('immediate') ||
        insight.toLowerCase().includes('urgent')
      ).length;
      
      if (onCriticalAlertCount) {
        onCriticalAlertCount(criticalCount);
      }
    } catch (error: any) {
      console.error('Error loading AI insights:', error);
      setInsightsError(error.message || 'Failed to load AI insights');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const renderInsightCard = (insight: string, index: number) => {
    const isCritical = insight.toLowerCase().includes('critical') || insight.toLowerCase().includes('urgent');
    const isWarning = insight.toLowerCase().includes('warning') || insight.toLowerCase().includes('attention');
    const isPositive = insight.toLowerCase().includes('good') || insight.toLowerCase().includes('excellent') || insight.toLowerCase().includes('optimal');

    let bgColor = 'bg-blue-50';
    let borderColor = 'border-blue-200';
    let textColor = 'text-blue-800';
    let icon = <CheckCircle className="w-5 h-5 text-blue-600" />;

    if (isCritical) {
      bgColor = 'bg-red-50';
      borderColor = 'border-red-200';
      textColor = 'text-red-800';
      icon = <AlertTriangle className="w-5 h-5 text-red-600" />;
    } else if (isWarning) {
      bgColor = 'bg-yellow-50';
      borderColor = 'border-yellow-200';
      textColor = 'text-yellow-800';
      icon = <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    } else if (isPositive) {
      bgColor = 'bg-green-50';
      borderColor = 'border-green-200';
      textColor = 'text-green-800';
      icon = <CheckCircle className="w-5 h-5 text-green-600" />;
    }

    return (
      <div key={index} className={`flex items-start gap-3 p-4 ${bgColor} rounded-lg border ${borderColor}`}>
        {icon}
        <p className={`text-sm font-medium ${textColor} flex-1`}>{insight}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-blue-600" />
            Fleet Insights - AI Analysis
          </h2>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Powered by Cloudflare Workers AI (Llama 3 8B)
          </p>
        </div>
        <Button
          onClick={loadAIInsights}
          disabled={isLoadingInsights}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingInsights ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Timeframe Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Analysis Timeframe
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'week', label: 'Last Week' },
                  { value: 'month', label: 'Last Month' },
                  { value: 'all', label: 'All Time' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedTimeframe(value as any)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedTimeframe === value
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Apparatus Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Apparatus
              </label>
              <select
                value={selectedApparatus}
                onChange={(e) => setSelectedApparatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Apparatus</option>
                {APPARATUS_LIST.map((apparatus) => (
                  <option key={apparatus} value={apparatus}>
                    {apparatus}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Analyze Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={loadAIInsights}
              disabled={isLoadingInsights}
              className="w-full md:w-auto flex items-center gap-2"
            >
              <Brain className="w-5 h-5" />
              {isLoadingInsights ? 'Analyzing Fleet...' : 'Analyze Fleet'}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Click "Analyze Fleet" to generate insights. Analysis is rate-limited to once per 5 minutes per configuration to conserve AI resources.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoadingInsights && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">AI Analysis in Progress</h3>
              <p className="text-gray-600">Analyzing inspection data and generating insights...</p>
              <div className="mt-4 w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {insightsError && !isLoadingInsights && (
        <Card className="border-red-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">Analysis Unavailable</h3>
                <p className="text-red-700 text-sm mb-4">{insightsError}</p>
                {insightsError.includes('503') || insightsError.includes('enabled') ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                    <p className="font-semibold mb-2">AI service is temporarily unavailable.</p>
                    <p>This could be due to:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Cloudflare Workers AI service maintenance</li>
                      <li>AI features not configured in the worker</li>
                      <li>Network connectivity issues</li>
                    </ul>
                    <p className="mt-3 font-medium">You can still view raw data in other dashboard tabs.</p>
                  </div>
                ) : (
                  <Button onClick={loadAIInsights} variant="secondary">
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!aiInsights && !isLoadingInsights && !insightsError && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Analyze</h3>
            <p className="text-gray-600 mb-4">
              Select your filters above and click "Analyze Fleet" to generate AI insights.
            </p>
            <p className="text-sm text-gray-500">
              AI analysis reviews inspection logs and identifies patterns, trends, and actionable recommendations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Results */}
      {aiInsights && !isLoadingInsights && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Analysis Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Data Points</p>
                      <p className="text-2xl font-bold text-blue-600">{aiInsights.dataPoints}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Timeframe</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">{aiInsights.timeframe}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Apparatus</p>
                      <p className="text-lg font-semibold text-gray-900">{aiInsights.apparatus || 'All'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Insights Found</p>
                      <p className="text-2xl font-bold text-purple-600">{aiInsights.insights.length}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Generated at: {new Date(aiInsights.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights List */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                AI-Generated Insights
              </h3>
              
              {aiInsights.insights.length > 0 ? (
                <div className="space-y-3">
                  {aiInsights.insights.map((insight, index) => renderInsightCard(insight, index))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-900">Fleet Operating Optimally</p>
                  <p className="text-gray-600 mt-2">AI analysis found no issues or recommendations at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistical Visualization */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Fleet Health Score
              </h3>
              
              <div className="space-y-4">
                {/* Overall Health */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Overall Fleet Health</span>
                    <span className={`text-lg font-bold ${
                      aiInsights.dataPoints > 0 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {aiInsights.dataPoints > 0 ? Math.max(70, 100 - (aiInsights.insights.length * 5)) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                      style={{ width: `${aiInsights.dataPoints > 0 ? Math.max(70, 100 - (aiInsights.insights.length * 5)) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Insights Breakdown */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Critical</p>
                    <p className="text-2xl font-bold text-red-600">
                      {aiInsights.insights.filter(i => i.toLowerCase().includes('critical')).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Warnings</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {aiInsights.insights.filter(i => i.toLowerCase().includes('warning')).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Recommendations</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {aiInsights.insights.filter(i => !i.toLowerCase().includes('critical') && !i.toLowerCase().includes('warning')).length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
