import React, { type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';

interface SwipeAction {
  label: string;
  icon?: string;
  color: string;
  onTrigger: () => void;
}

interface SwipeableListItemProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  threshold?: number;
  className?: string;
}

export const SwipeableListItem: React.FC<SwipeableListItemProps> = ({
  children,
  leftAction,
  rightAction,
  threshold = 80,
  className = '',
}) => {
  const x = useMotionValue(0);
  const backgroundColor = useTransform(
    x,
    [-threshold, 0, threshold],
    [
      rightAction?.color || '#ef4444',
      '#ffffff',
      leftAction?.color || '#10b981',
    ]
  );

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;

    if (offset > threshold && leftAction) {
      leftAction.onTrigger();
      x.set(0);
    } else if (offset < -threshold && rightAction) {
      rightAction.onTrigger();
      x.set(0);
    } else {
      x.set(0);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background actions */}
      <div className="absolute inset-0 flex justify-between items-center px-6">
        {leftAction && (
          <motion.div
            className="flex items-center gap-2 text-white font-semibold"
            style={{ opacity: useTransform(x, [0, threshold], [0, 1]) }}
          >
            {leftAction.icon && <span>{leftAction.icon}</span>}
            <span>{leftAction.label}</span>
          </motion.div>
        )}
        {rightAction && (
          <motion.div
            className="flex items-center gap-2 text-white font-semibold ml-auto"
            style={{ opacity: useTransform(x, [-threshold, 0], [1, 0]) }}
          >
            <span>{rightAction.label}</span>
            {rightAction.icon && <span>{rightAction.icon}</span>}
          </motion.div>
        )}
      </div>

      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: rightAction ? -threshold * 1.5 : 0, right: leftAction ? threshold * 1.5 : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{
          x,
          backgroundColor,
        }}
        className="relative z-10 bg-white dark:bg-gray-800 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableListItem;
