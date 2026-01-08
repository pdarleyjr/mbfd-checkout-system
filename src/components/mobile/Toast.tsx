import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast as reactHotToast, type Toast as ToastType } from 'react-hot-toast';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

const showToast = ({ message, type = 'info', duration = 3000 }: ToastProps) => {
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠️',
  };

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600',
  };

  reactHotToast.custom(
    (t: ToastType) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
            className={`${bgColors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md`}
            style={{
              backdropFilter: 'blur(10px)',
            }}
          >
            <span className="text-2xl">{icons[type]}</span>
            <p className="text-sm font-medium">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    { duration }
  );
};

export const Toast: React.FC = () => {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
    />
  );
};

export { showToast };
export default Toast;
