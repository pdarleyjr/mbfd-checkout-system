import React, { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface TouchFeedbackProps {
  children: ReactNode;
  onTap?: () => void;
  hapticType?: 'light' | 'medium' | 'heavy';
  disabled?: boolean;
  className?: string;
}

export const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  onTap,
  hapticType = 'light',
  disabled = false,
  className = '',
}) => {
  const simulateHaptic = () => {
    // Simulate haptic feedback using Vibration API if available
    if ('vibrate' in navigator && !disabled) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      navigator.vibrate(patterns[hapticType]);
    }
  };

  const handleTap = () => {
    if (!disabled) {
      simulateHaptic();
      onTap?.();
    }
  };

  return (
    <motion.div
      className={`touch-feedback ${className} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      whileTap={disabled ? {} : { scale: 0.95 }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
      onTapStart={handleTap}
      style={{
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      {children}
    </motion.div>
  );
};

export default TouchFeedback;
