import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import TouchFeedback from '../mobile/TouchFeedback';
import type { ICS212FormData } from '../../types';

interface CommentsStepProps {
  formData: Partial<ICS212FormData>;
  onChange: (field: keyof ICS212FormData, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CommentsStep: React.FC<CommentsStepProps> = ({
  formData,
  onChange,
  onNext,
  onBack,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 2000;
  const currentLength = (formData.additionalComments || '').length;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [formData.additionalComments]);

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
          Additional Comments
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add any notes, repair recommendations, or additional findings (optional)
        </p>
      </div>

      {/* Comments Textarea */}
      <div>
        <label
          htmlFor="additionalComments"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          Comments <span className="text-gray-500">(Optional)</span>
        </label>
        <textarea
          ref={textareaRef}
          id="additionalComments"
          value={formData.additionalComments || ''}
          onChange={(e) => onChange('additionalComments', e.target.value)}
          placeholder="Enter any additional comments, notes, or repair recommendations..."
          maxLength={maxLength}
          rows={10}
          className="
            w-full px-4 py-3 text-base rounded-xl border-2 border-gray-300
            transition-all focus:outline-none focus:ring-4
            focus:border-blue-500 focus:ring-blue-100 resize-none
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
          "
          style={{ minHeight: '200px' }}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            Detailed notes help with repairs and maintenance tracking
          </p>
          <p className={`text-sm font-medium ${currentLength > maxLength * 0.9 ? 'text-red-600' : 'text-gray-600'}`}>
            {currentLength} / {maxLength}
          </p>
        </div>
      </div>

      {/* Quick Suggestion Buttons */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Quick Suggestions
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            'No issues found',
            'Minor wear observed',
            'Requires immediate attention',
            'Scheduled maintenance due',
            'Pre-incident condition noted',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                const current = formData.additionalComments || '';
                const separator = current ? '\n' : '';
                onChange('additionalComments', `${current}${separator}${suggestion}`);
              }}
              className="
                px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-700
                border border-gray-300 dark:border-gray-600
                hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-gray-600
                transition-colors text-gray-700 dark:text-gray-300
              "
            >
              + {suggestion}
            </button>
          ))}
        </div>
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
            Next: Inspector Signature
          </button>
        </TouchFeedback>
      </div>
    </motion.div>
  );
};

export default CommentsStep;
