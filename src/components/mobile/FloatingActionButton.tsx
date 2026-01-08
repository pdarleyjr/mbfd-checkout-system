import React, { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import TouchFeedback from './TouchFeedback';

interface FloatingActionButtonProps {
  icon?: ReactNode;
  label?: string;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  extended?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  variant = 'primary',
  extended = false,
  disabled = false,
  className = '',
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6',
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
    >
      <TouchFeedback onTap={onClick} hapticType="medium" disabled={disabled}>
        <motion.button
          className={`
            ${extended ? 'px-6 py-4' : 'w-14 h-14'}
            rounded-full
            shadow-2xl
            flex items-center justify-center gap-2
            font-semibold text-base
            transition-all duration-200
            ${variantClasses[variant]}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-3xl'}
          `}
          whileHover={disabled ? {} : { scale: 1.05 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          disabled={disabled}
          style={{
            minHeight: extended ? '56px' : '56px',
          }}
        >
          {icon && <span className="text-xl">{icon}</span>}
          {extended && label && <span>{label}</span>}
        </motion.button>
      </TouchFeedback>
    </motion.div>
  );
};

export default FloatingActionButton;
