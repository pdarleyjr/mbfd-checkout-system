import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, AlertCircle, CheckCircle, TrendingUp, Package, RefreshCw, Lightbulb, Activity, Truck } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { githubService } from '../lib/github';
import { useInventory } from '../hooks/useInventory';
import { useSupplyTasks } from '../hooks/useSupplyTasks';
import { useApparatusStatus } from '../hooks/useApparatusStatus';
import { fetchAIInsights, generateAIInsights } from '../lib/inventory';
import type { AIInsight, AIInsightData } from '../lib/inventory';
import type { Defect } from '../types';

interface DashboardHomeProps {
  adminPassword: string;
}

interface FleetInsight {
  text: string;
  type: 'critical' | 'warning' | 'positive' | 'info';
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ adminPassword }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Fleet insights state
  const [fleetInsights, setFleetInsights] = useState<FleetInsight[]>([]);
  const [fleetHealthScore, setFleetHealthScore] = useState(0);
  const [defects, setDefects] = useState<Defect[]>([]);
  
  // Inventory insights state
  const [inventoryInsights, setInventoryInsights] = useState<AIInsight | null>(null);
  const [parsedInventoryInsight, setParsedInventoryInsight] = useState<AIInsightData | null>(null);
  
  // Data from hooks
  const { items: inventoryItems, isLoading: inventoryLoading } = useInventory();
  const { tasks: pendingTasks, isLoading: tasksLoading } = useSupplyTasks('pending');
  const { allVehicles, loading: statusLoading } = useApparatusStatus();
  
  // Summary statistics
  const [stats, setStats] = useState({
    totalDefects: 0,
    criticalIssues: 0,
    pendingTasks: 0,
    outOfServiceVehicles: 0,
    lowStockItems: 0,
    todaySubmissions: 0,
  });

  const loadAllData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      // Load defects and compute fleet insights
      await loadFleetData();
      
      // Load inventory AI insights
      await loadInventoryInsights();
      
      // Compute summary statistics
      computeStatistics();
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Don't throw - allow partial data to be shown
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadFleetData = async () => {
    try {
      const allDefects = await githubService.getAllDefects();
      setDefects(allDefects);
      
      // Generate insights from defects
      const insights: FleetInsight[] = [];
      
      // Critical issues (missing items)
      const criticalDefects = allDefects.filter(d => d.status === 'missing');
      if (criticalDefects.length > 0) {
        insights.push({
          text: `${criticalDefects.length} critical item${criticalDefects.length !== 1 ? 's' : ''} missing across the fleet - immediate action required`,
          type: 'critical'
        });
      }
      
      // Damaged items
      const damagedDefects = allDefects.filter(d => d.status === 'damaged');
      if (damagedDefects.length > 0) {
        insights.push({
          text: `${damagedDefects.length} damaged item${damagedDefects.length !== 1 ? 's' : ''} requiring repair or replacement`,
          type: 'warning'
        });
      }
      
      // Apparatus with multiple issues
      const apparatusDefectCounts = new Map<string, number>();
      allDefects.forEach(d => {
        apparatusDefectCounts.set(d.apparatus, (apparatusDefectCounts.get(d.apparatus) || 0) + 1);
      });
      
      const apparatusWithMultipleIssues = Array.from(apparatusDefectCounts.entries())
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1]);
      
      if (apparatusWithMultipleIssues.length > 0) {
        const [apparatus, count] = apparatusWithMultipleIssues[0];
        insights.push({
          text: `${apparatus} has ${count} open issues - prioritize for comprehensive inspection`,
          type: 'warning'
        });
      }
      
      // Fleet health score
      const affectedApparatus = apparatusDefectCounts.size;
      const healthScore = Math.max(0, 100 - (affectedApparatus * 7) - (allDefects.length * 2));
      setFleetHealthScore(healthScore);
      
      if (healthScore >= 90 && allDefects.length === 0) {
        insights.push({
          text: `Fleet operating at optimal condition with ${healthScore}% health score`,
          type: 'positive'
        });
      } else if (healthScore >= 90) {
        insights.push({
          text: `Fleet health score: ${healthScore}% - minor issues detected but overall good condition`,
          type: 'info'
        });
      }
      
      setFleetInsights(insights);
    } catch (error) {
      console.error('Error loading fleet data:', error);
      // Set empty insights on error - show graceful degradation
      setFleetInsights([{
        text: 'Unable to load fleet data. Please refresh or check your connection.',
        type: 'warning'
      }]);
    }
  };

  const loadInventoryInsights = async () => {
    try {
      const result = await fetchAIInsights();
      if (result.insights && result.insights.length > 0) {
        const latest = result.insights[0];
        setInventoryInsights(latest);
        
        try {
          const parsed = JSON.parse(latest.insight_json) as AIInsightData;
          setParsedInventoryInsight(parsed);
        } catch (parseError) {
          console.error('Failed to parse inventory insights:', parseError);
          // Keep the insight but don't show parsed data
          setParsedInventoryInsight(null);
        }
      } else {
        // No insights available - this is okay, not an error
        setInventoryInsights(null);
        setParsedInventoryInsight(null);
      }
    } catch (error) {
      console.error('Error loading inventory insights:', error);
      // Set null - gracefully handle missing inventory insights
      setInventoryInsights(null);
      setParsedInventoryInsight(null);
    }
  };

  const handleReAnalyze = async () => {
    setIsRefreshing(true);
    try {
      // Regenerate inventory AI insights
      await generateAIInsights({
        tasks: pendingTasks,
        inventory: inventoryItems,
      });
      
      // Reload all data
      await loadAllData(false);
    } catch (error) {
      console.error('Error re-analyzing:', error);
      alert('Failed to re-analyze data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const computeStatistics = () => {
    const criticalCount = defects.filter(d => d.status === 'missing').length;
    const outOfService = allVehicles.filter(v => 
      v.status.toLowerCase().includes('out of service')
    ).length;
    
    // Estimate low stock items from pending tasks
    const lowStock = new Set(pendingTasks.filter(t => 
      t.deficiencyType === 'missing'
    ).map(t => t.itemName)).size;
    
    setStats({
      totalDefects: defects.length,
      criticalIssues: criticalCount,
      pendingTasks: pendingTasks.length,
      outOfServiceVehicles: outOfService,
      lowStockItems: lowStock,
      todaySubmissions: 0, // Would need daily submissions API
    });
  };

  // Auto-load on mount
  useEffect(() => {
    if (adminPassword && !inventoryLoading && !tasksLoading && !statusLoading) {
      loadAllData();
    }
  }, [adminPassword, inventoryLoading, tasksLoading, statusLoading]);

  // Update stats when data changes
  useEffect(() => {
    if (!isLoading && defects.length >= 0) {
      computeStatistics();
    }
  }, [defects, pendingTasks, allVehicles]);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 animate-pulse">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Loading Dashboard</h3>
        <p className="text-gray-600">Gathering fleet data and AI insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Re-Analyze Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-7 h-7 lg:w-8 lg:h-8 text-blue-600" />
            AI-Powered Fleet Overview
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time insights powered by AI • {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        <Button
          onClick={handleReAnalyze}
          disabled={isRefreshing}
          variant="secondary"
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Re-Analyzing...' : 'Re-Analyze'}
        </Button>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <Card className="border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">{fleetHealthScore}%</span>
            </div>
            <p className="text-xs font-semibold text-blue-900">Fleet Health</p>
          </CardContent>
        </Card>

        <Card className={`border-${stats.criticalIssues > 0 ? 'red' : 'green'}-300 bg-gradient-to-br from-${stats.criticalIssues > 0 ? 'red' : 'green'}-50 to-${stats.criticalIssues > 0 ? 'red' : 'green'}-100`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className={`w-5 h-5 text-${stats.criticalIssues > 0 ? 'red' : 'green'}-600`} />
              <span className={`text-2xl font-bold text-${stats.criticalIssues > 0 ? 'red' : 'green'}-600`}>{stats.criticalIssues}</span>
            </div>
            <p className={`text-xs font-semibold text-${stats.criticalIssues > 0 ? 'red' : 'green'}-900`}>Critical Issues</p>
          </CardContent>
        </Card>

        <Card className="border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{stats.totalDefects}</span>
            </div>
            <p className="text-xs font-semibold text-orange-900">Total Issues</p>
          </CardContent>
        </Card>

        <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">{stats.pendingTasks}</span>
            </div>
            <p className="text-xs font-semibold text-purple-900">Pending Tasks</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</span>
            </div>
            <p className="text-xs font-semibold text-yellow-900">Low Stock Items</p>
          </CardContent>
        </Card>

        <Card className="border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Truck className="w-5 h-5 text-gray-600" />
              <span className="text-2xl font-bold text-gray-600">{stats.outOfServiceVehicles}</span>
            </div>
            <p className="text-xs font-semibold text-gray-900">Out of Service</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Fleet Insights - Priority Alerts */}
      {fleetInsights.length > 0 && (
        <Card className="border-blue-300">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              AI Fleet Insights - Priority Alerts
            </h3>
            <div className="space-y-3">
              {fleetInsights.map((insight, index) => {
                const colors = {
                  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600' },
                  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-600' },
                  positive: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-600' },
                  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-600' },
                };
                const color = colors[insight.type];
                const Icon = insight.type === 'critical' || insight.type === 'warning' ? AlertTriangle : 
                            insight.type === 'positive' ? CheckCircle : TrendingUp;

                return (
                  <div key={index} className={`flex items-start gap-3 p-4 ${color.bg} rounded-lg border ${color.border}`}>
                    <Icon className={`w-5 h-5 ${color.icon} flex-shrink-0 mt-0.5`} />
                    <p className={`text-sm font-medium ${color.text} flex-1`}>{insight.text}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory AI Insights */}
      {parsedInventoryInsight && (
        <Card className="border-green-300">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-6 h-6 text-green-600" />
              Inventory Intelligence
            </h3>
            
            <div className="space-y-4">
              {/* Summary */}
              {parsedInventoryInsight.summary && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm font-medium text-blue-900">{parsedInventoryInsight.summary}</p>
                </div>
              )}

              {/* Reorder Suggestions */}
              {parsedInventoryInsight.reorderSuggestions && parsedInventoryInsight.reorderSuggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-green-600" />
                    Recommended Actions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsedInventoryInsight.reorderSuggestions.slice(0, 4).map((suggestion, idx) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-green-900 text-sm truncate">{suggestion.item}</p>
                            <p className="text-green-700 text-xs mt-1">{suggestion.reason}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                            suggestion.urgency?.toLowerCase() === 'high' ? 'bg-red-100 text-red-800' :
                            suggestion.urgency?.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {suggestion.urgency || 'Low'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring Issues */}
              {parsedInventoryInsight.recurringIssues && parsedInventoryInsight.recurringIssues.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <h4 className="font-semibold text-orange-900 mb-2">⚠️ Recurring Issues</h4>
                  <ul className="space-y-1">
                    {parsedInventoryInsight.recurringIssues.slice(0, 3).map((issue, idx) => (
                      <li key={idx} className="text-sm text-orange-800">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {inventoryInsights && (
              <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                Generated: {new Date(inventoryInsights.created_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button 
              onClick={() => window.location.hash = '#/admin?tab=fleet'}
              variant="secondary"
              className="w-full justify-start"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              View All Issues
            </Button>
            <Button 
              onClick={() => window.location.hash = '#/admin?tab=inventory'}
              variant="secondary"
              className="w-full justify-start"
            >
              <Package className="w-4 h-4 mr-2" />
              Manage Inventory
            </Button>
            <Button 
              onClick={() => window.location.hash = '#/admin?tab=apparatus-status'}
              variant="secondary"
              className="w-full justify-start"
            >
              <Truck className="w-4 h-4 mr-2" />
              Fleet Status
            </Button>
            <Button 
              onClick={handleReAnalyze}
              disabled={isRefreshing}
              className="w-full justify-start"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {fleetInsights.length === 0 && !parsedInventoryInsight && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Fleet Operating Optimally</h3>
            <p className="text-gray-600">No critical issues or actionable insights at this time.</p>
            <Button onClick={handleReAnalyze} variant="secondary" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
