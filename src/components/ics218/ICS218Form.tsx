import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Save, Trash2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProgressIndicator from '../mobile/ProgressIndicator';
import IncidentInfoStep from './IncidentInfoStep';
import VehicleTableStep from './VehicleTableStep';
import PreparedByStep from './PreparedByStep';
import ReviewStep from './ReviewStep';
import type { ICS218FormData, ICS218DraftData } from '../../types';

const STEPS = [
  { id: 0, title: 'Incident Info', component: IncidentInfoStep },
  { id: 1, title: 'Vehicle Table', component: VehicleTableStep },
  { id: 2, title: 'Prepared By', component: PreparedByStep },
  { id: 3, title: 'Review & Submit', component: ReviewStep },
];

const INITIAL_FORM_DATA: Partial<ICS218FormData> = {
  status: 'draft',
  incidentName: '',
  incidentNumber: '',
  datePrepared: new Date().toISOString().split('T')[0],
  timePrepared: new Date().toTimeString().slice(0, 5),
  vehicleCategory: '',
  operationalPeriod: '',
  vehicles: [],
  preparedBy: {
    name: '',
    positionTitle: '',
    signature: '',
    signatureTimestamp: '',
  },
};

export const ICS218Form: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<ICS218FormData>>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<ICS218DraftData | null>(null);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (formData && !isSubmitted && currentStep > 0) {
        const draft: ICS218DraftData = {
          formData,
          currentStep,
          savedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        };
        localStorage.setItem('ics218-draft', JSON.stringify(draft));
        toast.success('Draft auto-saved', { duration: 1500, icon: '💾' });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(saveInterval);
  }, [formData, currentStep, isSubmitted]);

  // Draft recovery on mount
  useEffect(() => {
    const draftJson = localStorage.getItem('ics218-draft');
    if (draftJson) {
      try {
        const draft = JSON.parse(draftJson) as ICS218DraftData;
        const expiryDate = new Date(draft.expiresAt);
        const now = new Date();
        
        if (expiryDate > now) {
          setRecoveredDraft(draft);
          setShowDraftDialog(true);
        } else {
          // Draft expired, clear it
          localStorage.removeItem('ics218-draft');
        }
      } catch (error) {
        console.error('Failed to parse draft:', error);
        localStorage.removeItem('ics218-draft');
      }
    }
  }, []);

  const handleResumeDraft = () => {
    if (recoveredDraft) {
      setFormData(recoveredDraft.formData);
      setCurrentStep(recoveredDraft.currentStep);
      setShowDraftDialog(false);
      toast.success('Draft restored!');
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('ics218-draft');
    setShowDraftDialog(false);
    setRecoveredDraft(null);
    toast('Draft discarded', { icon: '🗑️' });
  };

  const handleFieldChange = (field: keyof ICS218FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Incident Info
        if (!formData.incidentName || formData.incidentName.length < 3) {
          newErrors.incidentName = 'Incident name must be at least 3 characters';
        }
        if (!formData.incidentNumber) {
          newErrors.incidentNumber = 'Incident number is required';
        }
        if (!formData.datePrepared) {
          newErrors.datePrepared = 'Date is required';
        }
        if (!formData.timePrepared) {
          newErrors.timePrepared = 'Time is required';
        }
        if (!formData.vehicleCategory) {
          newErrors.vehicleCategory = 'Vehicle category is required';
        }
        break;

      case 1: // Vehicle Table
        if (!formData.vehicles || formData.vehicles.length === 0) {
          newErrors.vehicles = 'At least one vehicle must be added';
        }
        break;

      case 2: // Prepared By
        if (!formData.preparedBy?.name || (formData.preparedBy?.name || '').length < 2) {
          newErrors.preparedByName = 'Name must be at least 2 characters';
        }
        if (!formData.preparedBy?.positionTitle) {
          newErrors.preparedByPosition = 'Position/Title is required';
        }
        if (!formData.preparedBy?.signature) {
          newErrors.preparedBySignature = 'Signature is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error('Please complete all required fields');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToStep = (step: number) => {
    if (step >= 0 && step < STEPS.length) {
      setCurrentStep(step);
    }
  };

  const handleManualSave = () => {
    const draft: ICS218DraftData = {
      formData,
      currentStep,
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem('ics218-draft', JSON.stringify(draft));
    toast.success('Draft saved manually!', { icon: '💾' });
  };

  const handleClearForm = () => {
    if (confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
      setFormData(INITIAL_FORM_DATA);
      setCurrentStep(0);
      setErrors({});
      localStorage.removeItem('ics218-draft');
      toast('Form cleared', { icon: '🗑️' });
    }
  };

  const handleSubmit = async () => {
    try {
      // Prepare submission data
      const submissionData: Partial<ICS218FormData> = {
        ...formData,
        id: `ICS218-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        status: 'submitted',
      };

      // Submit to backend (Phase 3 will implement this)
      // const response = await fetch('/api/ics218/submit', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${sessionStorage.getItem('ics218_access_token')}`,
      //   },
      //   body: JSON.stringify(submissionData),
      // });

      // For Phase 1/2, just show success
      console.log('ICS 218 Form Data:', submissionData);
      setIsSubmitted(true);
      localStorage.removeItem('ics218-draft');
      toast.success('Form submitted successfully!');
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit form. Please try again.');
      throw error;
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <img 
                src="/taskforce-io-logo.png" 
                alt="TASKFORCE IO" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  ICS-218 Support Vehicle/Equipment Inventory
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleManualSave}
                className="p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                title="Save Draft"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleClearForm}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                title="Clear Form"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator
            currentStep={currentStep + 1}
            totalSteps={STEPS.length}
            labels={STEPS.map(s => s.title)}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentStepComponent
              formData={formData}
              onChange={handleFieldChange}
              onNext={handleNext}
              onBack={handleBack}
              onGoToStep={handleGoToStep}
              onSubmit={handleSubmit}
              errors={errors}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Draft Recovery Dialog */}
      <AnimatePresence>
        {showDraftDialog && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Resume Draft?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We found a saved draft from{' '}
                {recoveredDraft && new Date(recoveredDraft.savedAt).toLocaleString()}.
                Would you like to resume where you left off?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors"
                >
                  Start Fresh
                </button>
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Resume Draft
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission Success Screen */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-8 text-center"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Form Submitted!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your ICS-218 form has been successfully submitted and logged.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors"
                >
                  Go Home
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData(INITIAL_FORM_DATA);
                    setCurrentStep(0);
                  }}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
                >
                  New Form
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ICS218Form;
