import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, Calendar, Shield, Gauge, CheckCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Modal } from './ui/Modal';
import { InspectionCard } from './InspectionCard';
import { githubService } from '../lib/github';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { useLocalStorage, useFieldHistory } from '../hooks/useLocalStorage';
import type { User, ChecklistData, ChecklistItem, GitHubIssue, ItemStatus, OfficerChecklistItem } from '../types';

export const InspectionWizard: React.FC = () => {
  const navigate = useNavigate();
  const device = useDeviceDetection();
  const [user, setUser] = useState<User | null>(null);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [items, setItems] = useState<Map<string, ChecklistItem>>(new Map());
  const [existingDefects, setExistingDefects] = useState<Map<string, GitHubIssue>>(new Map());
  const [officerItems, setOfficerItems] = useState<OfficerChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionDefectCount, setSubmissionDefectCount] = useState(0);

  // LocalStorage for remembering last entries
  const [lastOfficerValues, setLastOfficerValues] = useLocalStorage<Record<string, string | number>>('mbfd_last_officer_values', {});

  useEffect(() => {
    // Load user data from session storage
    const userData = sessionStorage.getItem('user');
    if (!userData) {
      navigate('/');
      return;
    }

    const parsedUser: User = JSON.parse(userData);
    setUser(parsedUser);

    // Load checklist data
    loadChecklistData(parsedUser);
  }, [navigate]);

  const loadChecklistData = async (userData: User) => {
    try {
      // Determine which checklist to load based on apparatus type
      let checklistFile: string;
      
      if (userData.apparatus.startsWith('Engine')) {
        checklistFile = 'engine_checklist.json';
      } else if (userData.apparatus === 'Ladder 1') {
        checklistFile = 'ladder1_checklist.json';
      } else if (userData.apparatus === 'Ladder 3') {
        checklistFile = 'ladder3_checklist.json';
      } else if (userData.apparatus === 'Rope Inventory') {
        checklistFile = 'rope_checklist.json';
      } else {
        // All Rescue units use the same checklist
        checklistFile = 'rescue_checklist.json';
      }
      
      // Load checklist JSON
      const response = await fetch(`/mbfd-checkout-system/data/${checklistFile}`);
      const data: ChecklistData = await response.json();
      setChecklist(data);

      // Initialize all items with 'present' status
      const itemsMap = new Map<string, ChecklistItem>();
      data.compartments.forEach(compartment => {
        compartment.items.forEach(item => {
          // Handle both string and object format
          const itemName = typeof item === 'string' ? item : item.name;
          const itemId = `${compartment.id}:${itemName}`;
          itemsMap.set(itemId, {
            name: itemName,
            status: 'present',
            inputType: typeof item === 'object' ? item.inputType : 'checkbox',
            expectedQuantity: typeof item === 'object' ? item.expectedQuantity : undefined,
          });
        });
      });
      setItems(itemsMap);

      // Initialize officer checklist with last saved values
      if (data.officerChecklist) {
        setOfficerItems(data.officerChecklist.map(item => ({
          ...item,
          checked: false,
          value: lastOfficerValues[item.id] || ''
        })));
      }

      // Fetch existing defects for this apparatus
      const defects = await githubService.checkExistingDefects(userData.apparatus);
      setExistingDefects(defects);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading inspection data. Please try again.');
      setIsLoading(false);
    }
  };

  const handleItemStatusChange = (itemId: string, status: ItemStatus, notes?: string, photoUrl?: string) => {
    setItems(prevItems => {
      const newItems = new Map(prevItems);
      const item = newItems.get(itemId);
      if (item) {
        newItems.set(itemId, { ...item, status, notes, photoUrl });
      }
      return newItems;
    });
  };

  const handleOfficerItemChange = (index: number, checked: boolean, value?: string | number) => {
    setOfficerItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], checked, value };
      
      // Save to localStorage for next time
      const newValues = { ...lastOfficerValues };
      newValues[newItems[index].id] = value || '';
      setLastOfficerValues(newValues);
      
      return newItems;
    });
  };

  const handleCheckAllOfficer = () => {
    setOfficerItems(prev => prev.map(item => ({
      ...item,
      checked: true,
      // Keep existing values, only fill empty required fields with placeholder
      value: item.value || (item.required && item.inputType !== 'checkbox' ? 'N/A' : item.value)
    })));
  };

  const handleCheckAllCompartment = () => {
    if (!currentCompartment) return;
    
    setItems(prevItems => {
      const newItems = new Map(prevItems);
      currentCompartment.items.forEach(item => {
        const itemName = typeof item === 'string' ? item : item.name;
        const itemId = `${currentCompartment.id}:${itemName}`;
        const existingItem = newItems.get(itemId);
        if (existingItem) {
          newItems.set(itemId, { ...existingItem, status: 'present' });
        }
      });
      return newItems;
    });
  };

  const handleSubmit = async () => {
    if (!user || !checklist) return;

    setIsSubmitting(true);

    try {
      // Collect all defects
      const defects: Array<{
        compartment: string;
        item: string;
        status: 'missing' | 'damaged';
        notes: string;
        photoUrl?: string;
      }> = [];

      items.forEach((item) => {
        if (item.status !== 'present') {
          const compartment = checklist.compartments.find(
            c => c.items.some(i => (typeof i === 'string' ? i : i.name) === item.name)
          );
          defects.push({
            compartment: compartment?.title || 'Unknown',
            item: item.name,
            status: item.status,
            notes: item.notes || '',
            photoUrl: item.photoUrl,
          });
        }
      });

      // Submit inspection
      await githubService.submitChecklist({
        user,
        apparatus: user.apparatus,
        date: new Date().toISOString(),
        items: Array.from(items.values()),
        defects,
        shift: user.shift,
        unitNumber: user.unitNumber,
        officerChecklist: officerItems,
      });

      // Clear session and show success modal
      sessionStorage.removeItem('user');
      setSubmissionDefectCount(defects.length);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error submitting inspection:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Error submitting inspection. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'No internet connection. Please check your connection and try again.';
        } else if (error.message.includes('defect submissions failed')) {
          errorMessage = 'Some defects failed to submit. Please check your connection and try again. Partial data may have been recorded.';
        }
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading inspection checklist...</p>
        </div>
      </div>
    );
  }

  if (!user || !checklist) {
    return null;
  }

  // Calculate total steps (officer checklist + all compartments)
  const hasOfficerChecklist = officerItems.length > 0;
  const totalSteps = (hasOfficerChecklist ? 1 : 0) + checklist.compartments.length;
  
  // Determine if we're on officer checklist step
  const isOfficerStep = hasOfficerChecklist && currentStep === 0;
  const compartmentIndex = hasOfficerChecklist ? currentStep - 1 : currentStep;
  const currentCompartment = !isOfficerStep ? checklist.compartments[compartmentIndex] : null;
  
  const isLastStep = currentStep === totalSteps - 1;
  
  // Check if current step is complete
  const canProceed = isOfficerStep 
    ? officerItems.every(item => {
        if (item.inputType === 'checkbox') return item.checked;
        if (item.required) return item.checked && item.value && item.value.toString().trim() !== '';
        return item.checked || (item.value && item.value.toString().trim() !== '');
      })
    : currentCompartment?.items.every(item => {
        const itemName = typeof item === 'string' ? item : item.name;
        const itemId = `${currentCompartment.id}:${itemName}`;
        const checkedItem = items.get(itemId);
        return checkedItem?.status !== undefined;
      });

  // Get today's schedule
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = checklist.dailySchedule?.find(s => s.day === today);

  // Determine container width based on device
  const containerClass = device.isDesktop 
    ? 'max-w-7xl mx-auto' 
    : device.isTablet 
    ? 'max-w-4xl px-4' 
    : 'max-w-2xl px-4';

  // Grid columns based on device
  const gridClass = device.isDesktop 
    ? 'grid grid-cols-2 lg:grid-cols-3 gap-4' 
    : 'space-y-3';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-900 to-blue-800 text-white sticky top-0 z-10 shadow-2xl">
        <div className={`${containerClass} mx-auto ${device.isDesktop ? 'px-6' : 'px-4'} py-4`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold">{user.apparatus}</h1>
              <p className="text-sm text-blue-100">
                {user.name} • {user.rank}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200">Shift {user.shift}</p>
              <p className="text-sm font-semibold">Unit {user.unitNumber}</p>
              {device.isDesktop && (
                <p className="text-xs text-blue-300 mt-1">🖥️ Desktop Mode</p>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  idx < currentStep
                    ? 'bg-green-400'
                    : idx === currentStep
                    ? 'bg-white'
                    : 'bg-blue-600'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-blue-100 mt-2 text-center font-medium">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>
      </div>

      {/* Daily Schedule Banner */}
      {todaySchedule && todaySchedule.tasks.length > 0 && todaySchedule.tasks[0] !== 'None' && (
        <div className={`${containerClass} mx-auto ${device.isDesktop ? 'px-6' : 'px-4'} mt-4`}>
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400 rounded-2xl p-4 shadow-md">
            <div className="flex items-start gap-3">
              <Calendar className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 mb-1">Today's Schedule - {today}</h3>
                <ul className="space-y-1">
                  {todaySchedule.tasks.map((task, idx) => (
                    <li key={idx} className="text-sm text-amber-800 font-medium">• {task}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`${containerClass} mx-auto ${device.isDesktop ? 'px-6' : 'px-4'} py-6`}>
        <Card className={`shadow-2xl ${device.isDesktop ? 'rounded-xl' : 'rounded-2xl'}`}>
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOfficerStep ? (
                  <Shield className="w-8 h-8 text-blue-700" />
                ) : (
                  <Gauge className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isOfficerStep ? 'Officer Checklist' : currentCompartment?.title}
                  </h2>
                  <p className="text-sm text-gray-600 font-medium">
                    {isOfficerStep 
                      ? 'Complete all officer-specific checks'
                      : 'Check all equipment in this compartment'
                    }
                  </p>
                </div>
              </div>
              
              {/* Check All Button */}
              <Button
                onClick={isOfficerStep ? handleCheckAllOfficer : handleCheckAllCompartment}
                variant="secondary"
                className="flex items-center gap-2 h-10 px-4 text-sm font-bold bg-blue-100 hover:bg-blue-200 text-blue-800"
              >
                <CheckCheck className="w-5 h-5" />
                {device.isMobile ? 'All OK' : 'Check All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className={device.isDesktop ? "p-6" : "p-4"}>
            {isOfficerStep ? (
              <div className={gridClass}>
                {officerItems.map((item, idx) => (
                  <OfficerChecklistField
                    key={item.id}
                    item={item}
                    index={idx}
                    onChange={handleOfficerItemChange}
                  />
                ))}
              </div>
            ) : (
              <div className={gridClass}>
                {currentCompartment?.items.map((item) => {
                  const itemName = typeof item === 'string' ? item : item.name;
                  const itemId = `${currentCompartment.id}:${itemName}`;
                  const checkedItem = items.get(itemId);
                  const defectKey = `${currentCompartment.title}:${itemName}`;
                  const hasExistingDefect = existingDefects.has(defectKey);
                  const itemData = typeof item === 'object' ? item : { name: item, inputType: 'checkbox' as const };

                  return (
                    <InspectionCard
                      key={itemId}
                      item={itemData}
                      compartmentId={currentCompartment.id}
                      status={checkedItem?.status || 'present'}
                      hasExistingDefect={hasExistingDefect}
                      onStatusChange={(status, notes, photoUrl) =>
                        handleItemStatusChange(itemId, status, notes, photoUrl)
                      }
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 p-4 shadow-2xl">
        <div className={`${containerClass} mx-auto ${device.isDesktop ? 'px-6' : ''} flex gap-3`}>
          {currentStep > 0 && (
            <Button
              onClick={() => setCurrentStep(currentStep - 1)}
              variant="secondary"
              className="flex items-center gap-2 h-14 px-6 rounded-xl font-bold bg-gray-100 hover:bg-gray-200 text-gray-800"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </Button>
          )}

          <div className="flex-1" />

          {!isLastStep ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed}
              className="flex items-center gap-2 h-14 px-8 rounded-xl font-bold shadow-lg bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 disabled:from-gray-400 disabled:to-gray-500"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed || isSubmitting}
              className="flex items-center gap-2 h-14 px-8 rounded-xl font-bold shadow-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Complete Inspection
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="Inspection Complete!"
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ✅ Inspection Submitted Successfully!
            </h3>
            <p className="text-gray-700 font-medium">
              Your {user?.apparatus} inspection has been recorded.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <p className="text-sm text-gray-800 font-semibold">
              <strong>Defects Reported:</strong> {submissionDefectCount}
            </p>
            {submissionDefectCount > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Issues have been logged and will be reviewed by maintenance.
              </p>
            )}
          </div>

          <Button
            onClick={handleSuccessModalClose}
            className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900"
          >
            Return to Home
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// Officer Checklist Field Component
interface OfficerChecklistFieldProps {
  item: OfficerChecklistItem;
  index: number;
  onChange: (index: number, checked: boolean, value?: string | number) => void;
}

const OfficerChecklistField: React.FC<OfficerChecklistFieldProps> = ({ item, index, onChange }) => {
  const { history, addToHistory } = useFieldHistory(item.id);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (checked: boolean, value?: string | number) => {
    onChange(index, checked, value);
    if (value && typeof value === 'string') {
      addToHistory(value);
    }
  };

  if (item.inputType === 'checkbox') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-gray-300 transition-all hover:border-blue-400 shadow-sm">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(e) => handleChange(e.target.checked)}
          className="w-6 h-6 rounded-lg border-2 border-gray-400 text-blue-600 focus:ring-4 focus:ring-blue-400 cursor-pointer"
        />
        <label className="flex-1 font-semibold text-gray-900 cursor-pointer">
          {item.name}
        </label>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => handleChange(!item.checked, item.value)}
          className="w-5 h-5 rounded border-2 border-gray-400 text-blue-600 cursor-pointer"
        />
        <label className="font-semibold text-gray-900 text-sm">
          {item.name}
          {item.required && <span className="text-red-600 ml-1">*</span>}
        </label>
      </div>
      <div className="relative">
        <input
          type={item.inputType === 'number' || item.inputType === 'percentage' ? 'number' : 'text'}
          value={item.value || ''}
          onChange={(e) => handleChange(item.checked, item.inputType === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={item.inputType === 'percentage' ? 'Enter %' : item.inputType === 'number' ? 'Enter number' : 'Enter value'}
          className="w-full px-3 py-3 text-base rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none bg-white text-gray-900 font-medium"
        />
        {showSuggestions && history.length > 0 && item.inputType === 'text' && (
          <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-40 overflow-y-auto">
            {history.map((val, idx) => (
              <button
                key={idx}
                onClick={() => {
                  handleChange(true, val);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors text-gray-900 font-medium"
              >
                {val}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};