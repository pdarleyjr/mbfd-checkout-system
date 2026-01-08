import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import TouchFeedback from '../mobile/TouchFeedback';
import type { ICS212FormData, InspectionItem } from '../../types';

interface InspectionItemsStepProps {
  formData: Partial<ICS212FormData>;
  onChange: (field: keyof ICS212FormData, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
}

// Define all 17 inspection items (items 1-13 are safety-critical)
const INSPECTION_ITEMS: InspectionItem[] = [
  { itemNumber: 1, description: 'Gauges and lights', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 2, description: 'Seat belts', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 3, description: 'Glass and mirrors', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 4, description: 'Wipers and horn', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 5, description: 'Engine compartment', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 6, description: 'Fuel System', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 7, description: 'Steering', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 8, description: 'Brakes', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 9, description: 'Drive line U-joints', status: 'n/a', isSafetyItem: false, reference: 'Check play' },
  { itemNumber: 10, description: 'Springs and shocks', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 11, description: 'Exhaust system', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 12, description: 'Frame', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 13, description: 'Tire and wheels', status: 'n/a', isSafetyItem: true, reference: 'See back*' },
  { itemNumber: 14, description: 'Coupling devices / Emergency exit (buses)', status: 'n/a', isSafetyItem: false },
  { itemNumber: 15, description: 'Pump operation', status: 'n/a', isSafetyItem: false },
  { itemNumber: 16, description: 'Damage on incident', status: 'n/a', isSafetyItem: false },
  { itemNumber: 17, description: 'Other', status: 'n/a', isSafetyItem: false },
];

export const InspectionItemsStep: React.FC<InspectionItemsStepProps> = ({
  formData,
  onChange,
  onNext,
  onBack,
  errors: _errors,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['pre-trip', 'safety', 'operational']));
  
  // Initialize inspection items if not already set
  const inspectionItems = formData.inspectionItems || INSPECTION_ITEMS;

  // Calculate release decision
  const releaseDecision = useMemo(() => {
    const safetyItemsFailed = inspectionItems.some(
      item => item.isSafetyItem && item.status === 'fail'
    );
    return safetyItemsFailed ? 'hold' : 'release';
  }, [inspectionItems]);

  const handleItemStatusChange = (itemNumber: number, status: 'pass' | 'fail' | 'n/a') => {
    const updatedItems = inspectionItems.map(item =>
      item.itemNumber === itemNumber ? { ...item, status } : item
    );
    onChange('inspectionItems', updatedItems);
    onChange('releaseStatus', releaseDecision);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderInspectionItem = (item: InspectionItem) => {
    const itemData = inspectionItems.find(i => i.itemNumber === item.itemNumber) || item;

    return (
      <div key={item.itemNumber} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          {item.isSafetyItem && (
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {item.itemNumber}. {item.description}
                </h4>
                {item.reference && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.reference}</p>
                )}
              </div>
            </div>

            {/* Status Toggle Buttons */}
            <div className="flex gap-2 mt-3">
              <TouchFeedback onTap={() => handleItemStatusChange(item.itemNumber, 'pass')} hapticType="light">
                <button
                  type="button"
                  onClick={() => handleItemStatusChange(item.itemNumber, 'pass')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                    font-semibold transition-all border-2
                    ${itemData.status === 'pass'
                      ? 'bg-green-500 text-white border-green-600 shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }
                  `}
                  style={{ minHeight: '48px' }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Pass
                </button>
              </TouchFeedback>

              <TouchFeedback onTap={() => handleItemStatusChange(item.itemNumber, 'fail')} hapticType="medium">
                <button
                  type="button"
                  onClick={() => handleItemStatusChange(item.itemNumber, 'fail')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                    font-semibold transition-all border-2
                    ${itemData.status === 'fail'
                      ? 'bg-red-500 text-white border-red-600 shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }
                  `}
                  style={{ minHeight: '48px' }}
                >
                  <XCircle className="w-4 h-4" />
                  Fail
                </button>
              </TouchFeedback>

              <TouchFeedback onTap={() => handleItemStatusChange(item.itemNumber, 'n/a')} hapticType="light">
                <button
                  type="button"
                  onClick={() => handleItemStatusChange(item.itemNumber, 'n/a')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                    font-semibold transition-all border-2
                    ${itemData.status === 'n/a'
                      ? 'bg-gray-400 text-white border-gray-500 shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }
                  `}
                  style={{ minHeight: '48px' }}
                >
                  N/A
                </button>
              </TouchFeedback>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, sectionKey: string, items: InspectionItem[], subtitle?: string) => {
    const isExpanded = expandedSections.has(sectionKey);

    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
          <ChevronDown
            className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {items.map(renderInspectionItem)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Vehicle Inspection
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Inspect all items and mark Pass, Fail, or N/A
        </p>
      </div>

      {/* Release Decision Banner */}
      <motion.div
        className={`
          p-4 rounded-xl border-2 flex items-center justify-between
          ${releaseDecision === 'hold'
            ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-700'
            : 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-700'
          }
        `}
        layout
      >
        <div className="flex items-center gap-3">
          {releaseDecision === 'hold' ? (
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          )}
          <div>
            <p className={`font-bold text-lg ${releaseDecision === 'hold' ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>
              {releaseDecision === 'hold' ? '🔴 HOLD FOR REPAIRS' : '🟢 RELEASED'}
            </p>
            {releaseDecision === 'hold' && (
              <p className="text-sm text-red-700 dark:text-red-300">
                Safety Item – Do Not Release Until Repaired
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Inspection Sections */}
      <div className="space-y-4">
        {renderSection(
          'Pre-Trip Items',
          'pre-trip',
          INSPECTION_ITEMS.slice(0, 5),
          'Items 1-5'
        )}
        
        {renderSection(
          'Safety Equipment',
          'safety',
          INSPECTION_ITEMS.slice(5, 13),
          '⚠️ Items 6-13 - All Safety-Critical'
        )}
        
        {renderSection(
          'Operational Systems',
          'operational',
          INSPECTION_ITEMS.slice(13),
          'Items 14-17'
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 sticky bottom-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg">
        <TouchFeedback onTap={() => onBack()} hapticType="light">
          <button
            type="button"
            onClick={onBack}
            className="
              flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold
              py-4 px-6 rounded-xl transition-all
              focus:outline-none focus:ring-4 focus:ring-gray-300
            "
            style={{ minHeight: '56px' }}
          >
            Back
          </button>
        </TouchFeedback>

        <TouchFeedback onTap={() => onNext()} hapticType="medium">
          <button
            type="button"
            onClick={onNext}
            className="
              flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold
              py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-blue-300
            "
            style={{ minHeight: '56px' }}
          >
            Next: Comments
          </button>
        </TouchFeedback>
      </div>
    </motion.div>
  );
};

export default InspectionItemsStep;
