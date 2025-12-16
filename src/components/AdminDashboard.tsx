import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, AlertCircle, CheckCircle, ArrowLeft, Lock, Calendar, TrendingUp, AlertTriangle, Package, Mail, Brain, Warehouse, X as CloseIcon, Image as ImageIcon, Check, Menu, X, Home, List } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Modal } from './ui/Modal';
import { DashboardHome } from './DashboardHome';
import { AIFleetInsights } from './AIFleetInsights';
import { InventoryTab } from './inventory/InventoryTab';
import { ApparatusStatusTab } from './ApparatusStatusTab';
import { githubService } from '../lib/github';
import { formatDateTime } from '../lib/utils';
import { APPARATUS_LIST } from '../lib/config';
import type { Defect, EmailConfig, GitHubIssue } from '../types';
import { fetchTasks, markTasksViewed } from '../lib/inventory';
import FormsTab from './inventory/FormsTab';

type TabType = 'home' | 'fleet' | 'activity' | 'supplies' | 'inventory' | 'apparatus-status' | 'notifications' | 'insights' | 'forms';

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
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [fleetStatus, setFleetStatus] = useState<Map<string, number>>(new Map());
  const [defects, setDefects] = useState<Defect[]>([]);
  const [dailySubmissions, setDailySubmissions] = useState<DailySubmissions | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Inspection logs state
  const [inspectionLogs, setInspectionLogs] = useState<GitHubIssue[]>([]);
  const [selectedApparatus, setSelectedApparatus] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Email notification state
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // AI Insights state
  const [criticalAlertsCount, setCriticalAlertsCount] = useState(0);

  // Inventory notification state
  const [unseenInventoryCount, setUnseenInventoryCount] = useState(0);

  // Photo lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Defect resolution state
  const [defectToResolve, setDefectToResolve] = useState<Defect | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolvingDefect, setIsResolvingDefect] = useState(false);

  // Defect filter/search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterApparatus, setFilterApparatus] = useState<string | null>(null);

  // Fleet Status sub-tab state (for toggling between Defects and History)
  const [fleetSubTab, setFleetSubTab] = useState<'defects' | 'history'>('defects');

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadApparatusLogs = async (apparatus: string) => {
    try {
      setIsLoadingLogs(true);
      setSelectedApparatus(apparatus);
      setActiveTab('activity'); // Switch to activity tab
      const logs = await githubService.getInspectionLogs(30); // Last 30 days
      // Filter logs for this apparatus
      const filteredLogs = logs.filter(log => log.title.includes(`[${apparatus}]`));
      setInspectionLogs(filteredLogs);
    } catch (error) {
      console.error('Error loading apparatus logs:', error);
      alert('Failed to load inspection history');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadAllInspectionLogs = async () => {
    try {
      setIsLoadingLogs(true);
      setSelectedApparatus(null);
      const logs = await githubService.getInspectionLogs(30); // Last 30 days
      setInspectionLogs(logs);
    } catch (error) {
      console.error('Error loading all inspection logs:', error);
      // Don't alert, just log - this is not critical
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all defects (ONLY OPEN defects from GitHub Issues API)
      const allDefects = await githubService.getAllDefects();
      console.log('📊 Loaded defects:', allDefects.length, allDefects);
      
      // Compute fleet status from ONLY the open defects we just fetched
      const status = githubService.computeFleetStatus(allDefects);
      console.log('📊 Computed fleet status:', Object.fromEntries(status));
      
      // Update state - this should trigger re-render with correct colors
      setDefects(allDefects);
      setFleetStatus(status);
      
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

      // Fetch unseen inventory count
      try {
        const tasksData = await fetchTasks('pending');
        setUnseenInventoryCount(tasksData.unseenCount);
      } catch (err) {
        console.error('Error fetching unseen inventory count:', err);
      }

      // Load inspection logs for history
      try {
        const logs = await githubService.getInspectionLogs(30);
        setInspectionLogs(logs);
      } catch (err) {
        console.error('Error loading inspection logs:', err);
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

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);

    // When switching to inventory tab, mark tasks as viewed
    if (tab === 'inventory' && unseenInventoryCount > 0) {
      try {
        await markTasksViewed();
        setUnseenInventoryCount(0);
      } catch (err) {
        console.error('Error marking tasks as viewed:', err);
        // Non-fatal error, continue anyway
      }
    }

    // Load email config when switching to notifications tab
    if (tab === 'notifications' && !emailConfig) {
      loadEmailConfig();
    }

    // Reset critical alerts count when switching to insights tab
    if (tab === 'insights') {
      setCriticalAlertsCount(0);
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

  const handleResolveDefect = async () => {
    if (!defectToResolve || !defectToResolve.issueNumber) return;

    setIsResolvingDefect(true);
    try {
      // Call the resolve API
      await githubService.resolveDefect(
        defectToResolve.issueNumber,
        resolutionNote || 'Defect resolved via Admin Dashboard',
        'Admin'
      );

      // Update UI optimistically - remove defect from list
      setDefects(prevDefects => 
        prevDefects.filter(d => d.issueNumber !== defectToResolve.issueNumber)
      );

      // Update fleet status
      setFleetStatus(prevStatus => {
        const newStatus = new Map(prevStatus);
        const currentCount = newStatus.get(defectToResolve.apparatus) || 0;
        newStatus.set(defectToResolve.apparatus, Math.max(0, currentCount - 1));
        return newStatus;
      });

      // Close modal and reset
      setDefectToResolve(null);
      setResolutionNote('');
      
      // Optional: Show success message
      alert('Defect successfully resolved!');
    } catch (error) {
      console.error('Error resolving defect:', error);
      alert(`Failed to resolve defect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResolvingDefect(false);
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

  // Load inspection logs when switching to activity tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'activity' && inspectionLogs.length === 0 && !isLoadingLogs) {
      loadAllInspectionLogs();
    }
  }, [isAuthenticated, activeTab]);

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
      {/* Header - Responsive and Modern */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 border-b border-blue-700 shadow-xl sticky top-0 z-50 pt-safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">  
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <img 
                  src="/mbfd-checkout-system/mbfd_logo.jpg" 
                  alt="MBFD" 
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-blue-200 mt-0.5 hidden sm:block">MBFD Fleet Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => navigate('/')}
                variant="secondary"
                className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden lg:inline">Back to Login</span>
              </Button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
              </button>
            </div>
          </div>

          {/* Desktop Tabs - Horizontal scrollable on tablet */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden sm:block'}`}>
            <div className="flex gap-1 border-b border-blue-700 overflow-x-auto pb-px scrollbar-hide">
              <TabButton
                icon={Home}
                label="Home"
                isActive={activeTab === 'home'}
                onClick={() => handleTabChange('home')}
              />
              <TabButton
                icon={AlertCircle}
                label="Inspection Issues"
                badge={defects.length}
                isActive={activeTab === 'fleet'}
                onClick={() => handleTabChange('fleet')}
              />
              <TabButton
                icon={Calendar}
                label="Daily Activity"
                isActive={activeTab === 'activity'}
                onClick={() => handleTabChange('activity')}
              />
              <TabButton
                icon={Package}
                label="Supply Alerts"
                badge={lowStockItems.length}
                isActive={activeTab === 'supplies'}
                onClick={() => handleTabChange('supplies')}
              />
              <TabButton
                icon={Warehouse}
                label="Inventory"
                badge={unseenInventoryCount}
                isActive={activeTab === 'inventory'}
                onClick={() => handleTabChange('inventory')}
              />
              <TabButton
                icon={List}
                label="Forms"
                isActive={activeTab === 'forms'}
                onClick={() => handleTabChange('forms')}
              />
              <TabButton
                icon={Truck}
                label="Apparatus Status"
                isActive={activeTab === 'apparatus-status'}
                onClick={() => handleTabChange('apparatus-status')}
              />
              <TabButton
                icon={Mail}
                label="Notifications"
                isActive={activeTab === 'notifications'}
                onClick={() => handleTabChange('notifications')}
              />
              <TabButton
                icon={Brain}
                label="AI Insights"
                badge={criticalAlertsCount}
                badgeColor="red"
                isActive={activeTab === 'insights'}
                onClick={() => handleTabChange('insights')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Dashboard Home Tab */}
        {activeTab === 'home' && (
          <DashboardHome adminPassword={passwordInput} />
        )}

        {/* Inspection Issues Tab */}
        {activeTab === 'fleet' && (
          <>
            {/* Apparatus Overview Grid */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Equipment & Vehicle Issues by Apparatus / Unit</h2>
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
                            {isOk ? '✓ No Issues' : `${defectCount} Issue${defectCount !== 1 ? 's' : ''}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">Click to view history</p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sub-tab Navigation for Defects and History */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setFleetSubTab('defects')}
                  className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${
                    fleetSubTab === 'defects'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <AlertCircle className="w-5 h-5" />
                  Open Issues ({defects.length})
                </button>
                <button
                  onClick={() => {
                    setFleetSubTab('history');
                    if (inspectionLogs.length === 0 && !isLoadingLogs) {
                      loadAllInspectionLogs();
                    }
                  }}
                  className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${
                    fleetSubTab === 'history'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Calendar className="w-5 h-5" />
                  Inspection History (Last 30 Days)
                  {selectedApparatus && (
                    <span className="text-sm text-blue-600">- {selectedApparatus}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Open Defects Content */}
            {fleetSubTab === 'defects' && (
              <>
                {/* Search and Filter Controls */}
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Search defects..."
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    value={filterApparatus || ''}
                    onChange={(e) => setFilterApparatus(e.target.value || null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">All Apparatus</option>
                    {apparatusList.map(app => (
                      <option key={app} value={app}>{app}</option>
                    ))}
                  </select>
                </div>

                {defects.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-gray-900">No Open Issues</p>
                      <p className="text-gray-600 mt-1">All apparatus equipment and inventory are fully operational</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {/* Filter and sort the defects */}
                    {defects
                      .filter(d => 
                        (!filterApparatus || d.apparatus === filterApparatus) &&
                        (d.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.compartment.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.apparatus.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .sort((a, b) => 
                        a.apparatus.localeCompare(b.apparatus) ||
                        a.compartment.localeCompare(b.compartment) ||
                        a.item.localeCompare(b.item)
                      )
                      .map(defect => (
                      <Card key={`${defect.apparatus}-${defect.item}-${defect.issueNumber}`} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 min-w-0">
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
                                <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg mb-2 break-words">
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

                            {/* Resolve Button */}
                            <div className="md:text-right flex-shrink-0">
                              <Button
                                onClick={() => {
                                  setDefectToResolve(defect);
                                  setResolutionNote('');
                                }}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Resolve
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Inspection History Content */}
            {fleetSubTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {selectedApparatus && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        Filtered: {selectedApparatus}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedApparatus && (
                      <Button
                        onClick={loadAllInspectionLogs}
                        variant="secondary"
                        size="sm"
                      >
                        View All
                      </Button>
                    )}
                    <Button
                      onClick={() => selectedApparatus ? loadApparatusLogs(selectedApparatus) : loadAllInspectionLogs()}
                      variant="secondary"
                      size="sm"
                      disabled={isLoadingLogs}
                    >
                      {isLoadingLogs ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>
                </div>

                {isLoadingLogs ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Loading inspection logs...</p>
                  </div>
                ) : inspectionLogs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">
                        {selectedApparatus
                          ? `No inspection logs found for ${selectedApparatus} in the last 30 days.`
                          : 'No inspection logs found. Click an apparatus card in Fleet Status to view its history.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    { inspectionLogs.map(log => {
                      // Parse log details from title and body
                      const titleMatch = log.title.match(/\[(.+)\]\s+Daily Inspection\s*-\s*(.+)/);
                      const apparatus = titleMatch ? titleMatch[1] : 'Unknown';
                      const dateStr = titleMatch ? titleMatch[2] : formatDateTime(log.created_at);

                      // Extract inspector info from body
                      const inspectorMatch = log.body?.match(/\*\*Conducted By:\*\*\s*(.+?)\s*\((.+?)\)/);
                      const inspector = inspectorMatch ? inspectorMatch[1] : 'Unknown';
                      const rank = inspectorMatch ? inspectorMatch[2] : '';

                      // Extract item count
                      const itemsMatch = log.body?.match(/\*\*Total Items Checked:\*\*\s*(\d+)/);
                      const totalItems = itemsMatch ? parseInt(itemsMatch[1]) : 0;

                      // Extract defect count
                      const defectsMatch = log.body?.match(/\*\*Issues Found:\*\*\s*(\d+)/);
                      const defectCount = defectsMatch ? parseInt(defectsMatch[1]) : 0;

                      // Extract receipt URL if present
                      const receiptMatch = log.body?.match(/\[View Full Printable Receipt\]\((.+?)\)/);
                      const receiptUrl = receiptMatch ? receiptMatch[1] : null;

                      // Extract defect list
                      const defectsSection = log.body?.match(/### Issues Reported\n([\s\S]+?)(?:\n\n|$)/);
                      const defectsList = defectsSection 
                        ? defectsSection[1].split('\n').filter(line => line.trim().startsWith('-'))
                        : [];

                      return (
                        <Card
                          key={log.number}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                    {apparatus}
                                  </span>
                                  {defectCount === 0 ? (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" />
                                      All Clear
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold flex items-center gap-1">
                                      <AlertCircle className="w-4 h-4" />
                                      {defectCount} Issue{defectCount !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 mb-1">
                                  <strong>Inspector:</strong> {inspector} {rank && `(${rank})`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <strong>Date:</strong> {dateStr} • <strong>Items Checked:</strong> {totalItems}
                                </p>
                              </div>
                              <div className="text-right text-xs text-gray-500 flex-shrink-0">
                                <span className="text-xs text-gray-600">{inspector}</span> {rank && <span className="text-xs text-gray-600"> ({rank})</span>}
                              </div>
                            </div>
                            
                            {defectsList.length > 0 && (
                              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded">
                                <p className="text-sm font-semibold text-red-900 mb-2">Reported Issues:</p>
                                <ul className="text-sm text-red-800 space-y-1">
                                  {defectsList.map((defect, idx) => (
                                    <li key={idx} className="pl-2 break-words">{defect.replace(/^-\s*/, '')}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                              {receiptUrl && (
                                <a
                                  href={receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm font-semibold transition-colors"
                                >
                                  📋 View Receipt
                                </a>
                              )}
                              <a
                                href={`https://github.com/pdarleyjr/mbfd-checkout-system/issues/${log.number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-semibold transition-colors"
                              >
                                View on GitHub →
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Resolve Defect Modal */}
            <Modal
              isOpen={defectToResolve !== null}
              onClose={() => {
                if (!isResolvingDefect) {
                  setDefectToResolve(null);
                  setResolutionNote('');
                }
              }}
              title="Resolve Defect"
            >
              {defectToResolve && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Apparatus</p>
                    <p className="font-semibold text-gray-900">{defectToResolve.apparatus}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Defect</p>
                    <p className="font-semibold text-gray-900">
                      {defectToResolve.compartment}: {defectToResolve.item}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      defectToResolve.status === 'missing'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {defectToResolve.status === 'missing' ? '❌ Missing' : '⚠️ Damaged'}
                    </span>
                  </div>
                  <div>
                    <label htmlFor="resolution-note" className="block text-sm font-semibold text-gray-700 mb-2">
                      Resolution Notes (Optional)
                    </label>
                    <textarea
                      id="resolution-note"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Describe how this defect was resolved..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      rows={4}
                      disabled={isResolvingDefect}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleResolveDefect}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={isResolvingDefect}
                    >
                      {isResolvingDefect ? 'Resolving...' : 'Confirm Resolution'}
                    </Button>
                    <Button
                      onClick={() => {
                        setDefectToResolve(null);
                        setResolutionNote('');
                      }}
                      variant="secondary"
                      disabled={isResolvingDefect}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Modal>

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

        {/* Forms Tab */}
        {activeTab === 'forms' && (
          <FormsTab adminPassword={passwordInput} />
        )}

        {/* Apparatus Status Tab */}
        {activeTab === 'apparatus-status' && (
          <ApparatusStatusTab />
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                          onChange={(e) => saveEmailConfig({ email_mode: (e.target as any).value as any })}
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
                          onChange={(e) => saveEmailConfig({ email_mode: (e.target as any).value as any })}
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
                          onChange={(e) => saveEmailConfig({ email_mode: (e.target as any).value as any })}
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
                            onChange={(e) => {
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
                        onChange={(e) => saveEmailConfig({ enable_immediate_for_critical: (e.target as any).checked })}
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
                        onChange={(e) => setEmailConfig({ ...emailConfig, daily_email_hard_cap: parseInt((e.target as any).value) || 250 })}
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

// Tab Button Component for responsive navigation
interface TabButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  badgeColor?: 'red' | 'yellow';
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon: Icon, label, badge, badgeColor = 'red', isActive, onClick }) => {
  // Shorten label for mobile display
  const mobileLabel = label === 'Home' ? 'Home'
    : label === 'Inspection Issues' ? 'Issues'
    : label === 'Daily Activity' ? 'Activity'
    : label === 'Supply Alerts' ? 'Supplies'
    : label === 'Apparatus Status' ? 'Apparatus'
    : label === 'AI Insights' ? 'AI'
    : label;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 font-semibold transition-all whitespace-nowrap relative flex-shrink-0 text-sm sm:text-base ${
        isActive
          ? 'text-white border-b-2 border-white bg-white/10'
          : 'text-blue-200 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{mobileLabel}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`${badgeColor === 'red' ? 'bg-red-500' : 'bg-yellow-500'} text-white text-xs px-2 py-0.5 rounded-full font-bold min-w-[20px] text-center`}>
          {badge}
        </span>
      )}
    </button>
  );
};