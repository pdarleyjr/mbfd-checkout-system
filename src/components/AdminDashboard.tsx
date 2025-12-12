import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, AlertCircle, CheckCircle, ArrowLeft, Lock, Calendar, TrendingUp, AlertTriangle, Package, Mail, Brain, Warehouse, X as CloseIcon, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { AIFleetInsights } from './AIFleetInsights';
import { InventoryTab } from './inventory/InventoryTab';
import { githubService } from '../lib/github';
import { formatDateTime } from '../lib/utils';
import { APPARATUS_LIST } from '../lib/config';
import type { Defect, EmailConfig } from '../types';

type TabType = 'fleet' | 'activity' | 'supplies' | 'inventory' | 'notifications' | 'insights';

interface DailySubmissions {
  today: string[];
  totals: Map<string, number>;
  lastSubmission: Map<string, string>;
}

interface LowStockItem {
  item: string;
  compartment: string;
  apparatus: string[];
  occurrences: number;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('fleet');
  const [fleetStatus, setFleetStatus] = useState<Map<string, number>>(new Map());
  const [defects, setDefects] = useState<Defect[]>([]);
  const [dailySubmissions, setDailySubmissions] = useState<DailySubmissions | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Email notification state
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // AI Insights state
  const [criticalAlertsCount, setCriticalAlertsCount] = useState(0);

  // Photo lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const loadApparatusLogs = async (apparatus: string) => {
    try {
      const logs = await githubService.getInspectionLogs(30); // Last 30 days
      // Filter logs for this apparatus
      const filteredLogs = logs.filter(log => log.title.includes(`[${apparatus}]`));
      console.log('Loaded inspection logs:', filteredLogs);
    } catch (error) {
      console.error('Error loading apparatus logs:', error);
      alert('Failed to load inspection history');
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all defects
      const allDefects = await githubService.getAllDefects();
      
      // Compute fleet status from defects
      const status = githubService.computeFleetStatus(allDefects);
      
      setFleetStatus(status);
      setDefects(allDefects);
      
      // Fetch daily submissions and low stock items
      try {
        const submissions = await githubService.getDailySubmissions();
        setDailySubmissions(submissions);
      } catch (err) {
        console.error('Error fetching daily submissions:', err);
      }
      
      try {
        const lowStock = await githubService.analyzeLowStockItems();
        setLowStockItems(lowStock);
      } catch (err) {
        console.error('Error analyzing low stock:', err);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        setIsAuthenticated(false);
        githubService.clearAdminPassword();
        localStorage.removeItem('adminPassword');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) {
      setPasswordError('Please enter a password');
      return;
    }

    // Set the password and try to load data
    githubService.setAdminPassword(passwordInput);
    // Also store in localStorage for inventory API calls
    localStorage.setItem('adminPassword', passwordInput);
    
    try {
      await loadDashboardData();
      setIsAuthenticated(true);
      setPasswordError('');
    } catch (err) {
      console.error('Authentication failed:', err);
      if (err instanceof Error && err.message.includes('Unauthorized')) {
        setPasswordError('Incorrect password. Please try again.');
      } else if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setPasswordError('Network error. Please check your connection and try again.');
      } else {
        setPasswordError('Authentication failed. Please try again.');
      }
      githubService.clearAdminPassword();
      localStorage.removeItem('adminPassword');
    }
  };

  const loadEmailConfig = async () => {
    if (!passwordInput) return;
    
    setIsLoadingConfig(true);
    setConfigError(null);
    
    try {
      const config = await githubService.getEmailConfig(passwordInput);
      setEmailConfig(config);
    } catch (error) {
      setConfigError((error as Error).message || 'Failed to load email configuration');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const saveEmailConfig = async (updates: Partial<EmailConfig>) => {
    if (!passwordInput || !emailConfig) return;
    
    setIsSavingConfig(true);
    setConfigError(null);
    
    try {
      const result = await githubService.updateEmailConfig(passwordInput, updates);
      setEmailConfig(result.config);
      alert('Email configuration updated successfully');
    } catch (error) {
      setConfigError((error as Error).message || 'Failed to update email configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const sendTestDigest = async () => {
    if (!passwordInput) return;
    
    if (!confirm('Send a test daily digest email now?')) return;
    
    try {
      await githubService.sendManualDigest(passwordInput);
      alert('Test digest sent successfully! Check your email.');
    } catch (error) {
      alert('Failed to send test digest: ' + ((error as Error).message || 'Unknown error'));
    }
  };

  // Auto-refresh data every 2 minutes when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      loadDashboardData().catch(console.error);
    }, 120000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Show password prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Admin Access Required
              </h1>
              <p className="text-gray-600">Enter the admin password to continue</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordSubmit();
                    }
                  }}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-600 text-sm mt-2">{passwordError}</p>
                )}
              </div>

              <Button
                onClick={handlePasswordSubmit}
                className="w-full"
                size="lg"
              >
                Access Admin Dashboard
              </Button>

              <div className="text-center mt-4">
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const apparatusList: string[] = APPARATUS_LIST;
  const today = new Date().toLocaleDateString('en-US');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">MBFD Fleet Management System</p>
            </div>
            <Button
              onClick={() => navigate('/')}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${activeTab === 'fleet'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Truck className="w-5 h-5" />
              Fleet Status
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${activeTab === 'activity'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Calendar className="w-5 h-5" />
              Daily Activity
            </button>
            <button
              onClick={() => setActiveTab('supplies')}
              className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${activeTab === 'supplies'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Package className="w-5 h-5" />
              Supply Alerts
              {lowStockItems.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {lowStockItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${activeTab === 'inventory'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Warehouse className="w-5 h-5" />
              Inventory
            </button>
            <button
              onClick={() => {
                setActiveTab('notifications');
                if (!emailConfig) loadEmailConfig();
              }}
              className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${activeTab === 'notifications'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Mail className="w-5 h-5" />
              Notifications
            </button>
            <button
              onClick={() => {
                setActiveTab('insights');
                setCriticalAlertsCount(0); // Clear badge when viewing
              }}
              className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 relative ${activeTab === 'insights'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Brain className="w-5 h-5" />
              Fleet Insights
              {criticalAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {criticalAlertsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Fleet Status Tab */}
        {activeTab === 'fleet' && (
          <>
            {/* Fleet Status Grid */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Fleet Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {apparatusList.map(apparatus => {
                  const defectCount = fleetStatus.get(apparatus) || 0;
                  const isOk = defectCount === 0;

                  return (
                    <div 
                      key={apparatus}
                      className="cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => loadApparatusLogs(apparatus)}
                    >
                      <Card className={isOk ? 'border-green-500' : 'border-red-500'}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-3">
                            <Truck className={`w-8 h-8 ${isOk ? 'text-green-500' : 'text-red-500'}`} />
                            {isOk ? (
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            ) : (
                              <AlertCircle className="w-6 h-6 text-red-500" />
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 mb-1">{apparatus}</h3>
                          <p className={`text-sm font-semibold ${isOk ? 'text-green-600' : 'text-red-600'}`}>
                            {isOk ? '✓ All Clear' : `${defectCount} Defect${defectCount !== 1 ? 's' : ''}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">Click to view history</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Defects List */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Open Defects ({defects.length})
              </h2>

              {defects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-900">No Open Defects</p>
                    <p className="text-gray-600 mt-1">All apparatus are fully operational</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {defects.map(defect => (
                    <Card key={`${defect.apparatus}-${defect.item}`} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                {defect.apparatus}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                defect.status === 'missing'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {defect.status === 'missing' ? '❌ Missing' : '⚠️ Damaged'}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {defect.compartment}: {defect.item}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">
                              Reported by {defect.reportedBy} on {formatDateTime(defect.reportedAt)}
                            </p>
                            {defect.notes && (
                              <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg mb-2">
                                {defect.notes.split('\n').slice(0, 3).join('\n')}
                              </p>
                            )}
                            {defect.photoUrl && (
                              <div className="mt-3">
                                <button
                                  onClick={() => setLightboxPhoto(defect.photoUrl || null)}
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                  <span className="text-sm font-semibold">View Photo</span>
                                </button>
                              </div>
                            )}
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Photo Lightbox Modal */}
            {lightboxPhoto && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
                onClick={() => setLightboxPhoto(null)}
              >
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <CloseIcon className="w-6 h-6 text-gray-900" />
                </button>
                <img
                  src={lightboxPhoto}
                  alt="Defect photo"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        )}

        {/* Daily Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Daily Activity - {today}
              </h2>

              {/* Today's Submissions */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Submissions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {apparatusList.map(apparatus => {
                      const hasSubmitted = dailySubmissions?.today.includes(apparatus) || false;
                      return (
                        <div
                          key={apparatus}
                          className={`p-4 rounded-lg border-2 ${
                            hasSubmitted
                              ? 'bg-green-50 border-green-500'
                              : 'bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Truck className={`w-6 h-6 ${hasSubmitted ? 'text-green-600' : 'text-gray-400'}`} />
                            {hasSubmitted ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <p className="font-bold text-gray-900">{apparatus}</p>
                          <p className={`text-sm font-semibold ${hasSubmitted ? 'text-green-600' : 'text-gray-500'}`}>
                            {hasSubmitted ? '✓ Submitted' : 'Pending'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Submission Statistics */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Submission Statistics (Last 30 Days)
                  </h3>
                  <div className="space-y-3">
                    {apparatusList.map(apparatus => {
                      const total = dailySubmissions?.totals.get(apparatus) || 0;
                      const lastDate = dailySubmissions?.lastSubmission.get(apparatus);
                      const percentage = Math.round((total / 30) * 100);
                      
                      return (
                        <div key={apparatus} className="border-b border-gray-200 pb-3 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Truck className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold text-gray-900">{apparatus}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-blue-600">{total}</span>
                              <span className="text-sm text-gray-600 ml-1">submissions</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{percentage}% compliance rate</span>
                            {lastDate && <span>Last: {lastDate}</span>}
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Supply Alerts Tab */}
        {activeTab === 'supplies' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Supply Alerts
            </h2>

            {lowStockItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-900">No Supply Concerns</p>
                  <p className="text-gray-600 mt-1">All items are adequately stocked</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-sm text-orange-800">
                    <strong>Note:</strong> Items listed below have been reported missing multiple times across different apparatus in the last 30 days. 
                    This may indicate a supply shortage requiring attention.
                  </p>
                </div>

                {lowStockItems.map((item, index) => (
                  <Card key={index} className="border-orange-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                            <h3 className="text-lg font-bold text-gray-900">
                              {item.compartment}: {item.item}
                            </h3>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">
                              <strong>Reported missing {item.occurrences} time{(item.occurrences !== 1 ? 's' : '')}</strong> in the last 30 days
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-700">Affected apparatus:</span>
                              {item.apparatus.map(apparatus => (
                                <span
                                  key={apparatus}
                                  className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold"
                                >
                                  {apparatus}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full">
                            <span className="text-xl font-bold text-orange-600">{item.occurrences}</span>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <InventoryTab />
        )}

        {/* Fleet Insights Tab */}
        {activeTab === 'insights' && (
          <>
            <AIFleetInsights 
              adminPassword={passwordInput}
              onCriticalAlertCount={setCriticalAlertsCount}
            />
          </>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Email Notifications</h2>
              <Button
                onClick={sendTestDigest}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Send Test Digest
              </Button>
            </div>

            {configError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {configError}
              </div>
            )}

            {isLoadingConfig ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading configuration...</p>
              </div>
            ) : emailConfig ? (
              <div className="space-y-6">
                {/* Master Enable/Disable */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {emailConfig.enabled ? 'Notifications are currently enabled' : 'Notifications are currently disabled'}
                        </p>
                      </div>
                      <Button
                        onClick={() => saveEmailConfig({ enabled: !emailConfig.enabled })}
                        className={emailConfig.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                        disabled={isSavingConfig}
                      >
                        {emailConfig.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Mode */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Mode</h3>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="email_mode"
                          value="daily_digest"
                          checked={emailConfig.email_mode === 'daily_digest'}
                          onChange={e => saveEmailConfig({ email_mode: (e.target as any).value as any })}
                          className="mt-1 w-5 h-5 text-blue-600"
                        />
                        <div>
                          <span className="font-semibold">Daily Digest (Recommended)</span>
                          <p className="text-sm text-gray-600">Send one summary email per day at {emailConfig.digest_send_time}</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="email_mode"
                          value="per_submission"
                          checked={emailConfig.email_mode === 'per_submission'}
                          onChange={e => saveEmailConfig({ email_mode: (e.target as any).value as any })}
                          className="mt-1 w-5 h-5 text-blue-600"
                        />
                        <div>
                          <span className="font-semibold">Per Submission</span>
                          <p className="text-sm text-gray-600">Send an email immediately after each inspection</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="email_mode"
                          value="hybrid"
                          checked={emailConfig.email_mode === 'hybrid'}
                          onChange={e => saveEmailConfig({ email_mode: (e.target as any).value as any })}
                          className="mt-1 w-5 h-5 text-blue-600"
                        />
                        <div>
                          <span className="font-semibold">Hybrid</span>
                          <p className="text-sm text-gray-600">Immediate for critical defects, daily digest for routine</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Recipients */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Recipients</h3>
                    <div className="space-y-3">
                      {emailConfig.recipients.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={e => {
                              const newRecipients = [...emailConfig.recipients];
                              newRecipients[idx] = e.target.value;
                              setEmailConfig({ ...emailConfig, recipients: newRecipients });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="email@example.com"
                          />
                          <Button
                            onClick={() => {
                              const newRecipients = emailConfig.recipients.filter((_, i) => i !== idx);
                              saveEmailConfig({ recipients: newRecipients });
                            }}
                            variant="secondary"
                            className="bg-red-50 hover:bg-red-100 text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const newRecipients = [...emailConfig.recipients, ''];
                            setEmailConfig({ ...emailConfig, recipients: newRecipients });
                          }}
                          variant="secondary"
                        >
                          + Add Recipient
                        </Button>
                        <Button
                          onClick={() => saveEmailConfig({ recipients: emailConfig.recipients.filter(email => email !== '') })}
                          disabled={isSavingConfig}
                        >
                          Save Recipients
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Defect Alert */}
                <Card>
                  <CardContent className="p-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailConfig.enable_immediate_for_critical}
                        onChange={e => saveEmailConfig({ enable_immediate_for_critical: (e.target as any).checked })}
                        className="mt-1 w-5 h-5 text-blue-600 rounded"
                      />
                      <div>
                        <span className="font-semibold text-gray-900">Immediate Alerts for Critical Defects</span>
                        <p className="text-sm text-gray-600 mt-1">
                          Send immediate email when critical defects are found (only in hybrid mode)
                        </p>
                      </div>
                    </label>
                  </CardContent>
                </Card>

                {/* Daily Email Limit */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Email Limit</h3>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={emailConfig.daily_email_hard_cap}
                        onChange={e => setEmailConfig({ ...emailConfig, daily_email_hard_cap: parseInt((e.target as any).value) || 250 })}
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                        max="500"
                      />
                      <span className="text-gray-600">emails per day (max: 500)</span>
                      <Button
                        onClick={() => saveEmailConfig({ daily_email_hard_cap: emailConfig.daily_email_hard_cap })}
                        disabled={isSavingConfig}
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Current: {emailConfig.daily_email_hard_cap} / Recommended: 250
                    </p>
                  </CardContent>
                </Card>

                {/* Email Subject Template */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Subject Template</h3>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={emailConfig.email_subject_template}
                        onChange={e => setEmailConfig({ ...emailConfig, email_subject_template: (e.target as any).value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="MBFD Daily Inspection Summary - {date}"
                      />
                      <p className="text-sm text-gray-500">Use {'{date}'} for the current date</p>
                      <Button
                        onClick={() => saveEmailConfig({ email_subject_template: emailConfig.email_subject_template })}
                        disabled={isSavingConfig}
                      >
                        Save Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Click the button below to load email configuration</p>
                  <Button onClick={loadEmailConfig}>
                    Load Configuration
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};