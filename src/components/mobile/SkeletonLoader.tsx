import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  type?: 'text' | 'circle' | 'rectangle' | 'card';
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'text',
  width = '100%',
  height = type === 'text' ? '1rem' : type === 'circle' ? '3rem' : '8rem',
  count = 1,
  className = '',
}) => {
  const getShapeClass = () => {
    switch (type) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'rounded';
      case 'card':
        return 'rounded-xl';
      default:
        return 'rounded-lg';
    }
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      className={`bg-gray-300 dark:bg-gray-700 ${getShapeClass()} ${className}`}
      style={{
        width,
        height,
        aspectRatio: type === 'circle' ? '1' : undefined,
      }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: i * 0.1,
      }}
    />
  ));

  return (
    <div className="flex flex-col gap-3">
      {skeletons}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md space-y-3">
      <SkeletonLoader type="text" height="1.5rem" width="60%" />
      <SkeletonLoader type="text" count={3} />
      <div className="flex gap-2 mt-4">
        <SkeletonLoader type="rectangle" height="2.5rem" width="5rem" />
        <SkeletonLoader type="rectangle" height="2.5rem" width="5rem" />
      </div>
    </div>
  );
};

export default SkeletonLoader;
