import React, { type ReactNode, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  className = '',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const opacity = useTransform(y, [0, threshold], [0, 1]);
  const rotate = useTransform(y, [0, threshold], [0, 180]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.y;

    if (offset > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        y.set(0);
      }
    } else {
      y.set(0);
    }
  };

  const handleDrag = (_: any, info: PanInfo) => {
    // Only allow pull down at the top of the scroll
    const container = containerRef.current;
    if (container && container.scrollTop === 0 && info.offset.y > 0) {
      y.set(Math.min(info.offset.y, threshold * 1.5));
    }
  };

  return (
    <div ref={containerRef} className={`relative overflow-auto ${className}`}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-10"
        style={{
          opacity,
          height: useTransform(y, [0, threshold], [0, 60]),
        }}
      >
        <motion.div
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
          style={{
            rotate: isRefreshing ? undefined : rotate,
          }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={{
            repeat: isRefreshing ? Infinity : 0,
            duration: 1,
            ease: 'linear',
          }}
        />
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="touch-pan-x"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
