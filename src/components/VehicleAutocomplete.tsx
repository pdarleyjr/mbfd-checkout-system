import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Vehicle } from '../types';
import SkeletonLoader from './mobile/SkeletonLoader';

interface VehicleAutocompleteProps {
  value: string;
  onChange: (value: string, vehicle?: Vehicle) => void;
  onVehicleSelect?: (vehicle: Vehicle) => void;
  apiEndpoint?: string;
  className?: string;
  error?: string;
}

export const VehicleAutocomplete: React.FC<VehicleAutocompleteProps> = ({
  value,
  onChange,
  onVehicleSelect,
  apiEndpoint = '/api/vehicles/autocomplete',
  className = '',
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const debounceTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.trim().length < 2) {
      setVehicles([]);
      setIsOpen(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${apiEndpoint}?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setVehicles(data.vehicles || []);
          setIsOpen(true);
        }
      } catch (error)  {
        console.error('Vehicle search error:', error);
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, apiEndpoint]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSearchQuery(vehicle.vehicleId);
    onChange(vehicle.vehicleId, vehicle);
    onVehicleSelect?.(vehicle);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
          placeholder="Search vehicle ID, make, or model..."
          className={`
            w-full px-4 py-3 text-base rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4
            ${error 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
            }
            ${isLoading ? 'pr-12' : ''}
          `}
          style={{ minHeight: '48px' }} // 88px touch target with padding
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <motion.div
              className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && vehicles.length > 0 && (
          <motion.div
            className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-h-80 overflow-y-auto"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {vehicles.map((vehicle) => (
              <motion.button
                key={vehicle.id}
                onClick={() => handleVehicleSelect(vehicle)}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                style={{ minHeight: '56px' }}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {vehicle.vehicleId}
                    </p>
                    {(vehicle.make || vehicle.model) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {[vehicle.year, vehicle.make, vehicle.model]
                          .filter(Boolean)
                          .join(' ')}
                      </p>
                    )}
                    {vehicle.agencyUnit && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                        {vehicle.agencyUnit}
                      </p>
                    )}
                  </div>
                  {vehicle.status && (
                    <span
                      className={`
                        ml-3 px-2 py-1 text-xs font-medium rounded-full
                        ${vehicle.status === 'In Service' 
                          ? 'bg-green-100 text-green-800' 
                          : vehicle.status === 'Out of Service'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }
                      `}
                    >
                      {vehicle.status}
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton */}
      {isLoading && isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4">
          <SkeletonLoader type="text" count={3} />
        </div>
      )}
    </div>
  );
};

export default VehicleAutocomplete;
