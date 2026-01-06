import React from 'react';
import { motion } from 'framer-motion';
import * as Progress from '@radix-ui/react-progress';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  showPercentage?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  labels,
  showPercentage = true,
  className = '',
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Step indicators */}
      <div className="flex justify-between items-center mb-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep - 1;
          const stepNumber = i + 1;

          return (
            <div key={i} className="flex flex-col items-center flex-1">
             <motion.div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-200 text-gray-600' : ''}
                `}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: i * 0.1,
                }}
              >
                {isCompleted ? '✓' : stepNumber}
              </motion.div>
              {labels && labels[i] && (
                <span
                  className={`
                    text-xs mt-1 text-center max-w-[60px] leading-tight
                    ${isCurrent ? 'font-semibold text-blue-600' : 'text-gray-600'}
                  `}
                >
                  {labels[i]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <Progress.Root
        className="relative overflow-hidden bg-gray-200 rounded-full w-full h-3 mt-4"
        value={progress}
      >
        <Progress.Indicator
          asChild
        >
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
            }}
          />
        </Progress.Indicator>
      </Progress.Root>

      {/* Percentage text */}
      {showPercentage && (
        <motion.div
          className="text-center mt-2 text-sm font-semibold text-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Step {currentStep} of {totalSteps} ({Math.round(progress)}% complete)
        </motion.div>
      )}
    </div>
  );
};

export default ProgressIndicator;
