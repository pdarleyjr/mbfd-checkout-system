import React, { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  showHandle?: boolean;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  className = '',
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            {/* Bottom Sheet */}
            <Dialog.Content asChild>
              <motion.div
                className={`
                  fixed bottom-0 left-0 right-0 z-50
                  bg-white dark:bg-gray-800
                  rounded-t-3xl shadow-2xl
                  max-h-[90vh] overflow-hidden
                  ${className}
                `}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100) {
                    onClose();
                  }
                }}
              >
                {/* Drag handle */}
                {showHandle && (
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  </div>
                )}

                {/* Header */}
                {title && (
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                      {title}
                    </Dialog.Title>
                  </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export default BottomSheet;
