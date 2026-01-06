/**
 * Vehicle Management Component
 * 
 * Manages vehicle database from Airtable
 * Features:
 * - List all vehicles
 * - View inspection history
 * - Quick links to inspect vehicle
 * - Mobile-responsive card layout
 */

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/config';
import { TouchFeedback } from '../mobile/TouchFeedback';
import { SkeletonLoader } from '../mobile/SkeletonLoader';
import { showToast } from '../mobile/Toast';

interface Vehicle {
  id: string;
  fields: {
    NAME: string;
    UNIT: string;
    LICENSE_PLATE?: string;
    VEHICLE_TYPE?: string;
    STATUS?: string;
    NOTES?: string;
  };
}

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles`);
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      showToast({ message: 'Failed to load vehicles', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const searchLower = searchTerm.toLowerCase();
    return (
      vehicle.fields.NAME?.toLowerCase().includes(searchLower) ||
      vehicle.fields.UNIT?.toLowerCase().includes(searchLower) ||
      vehicle.fields.LICENSE_PLATE?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} type="card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <input
          type="search"
          placeholder="Search vehicles by name, unit, or license plate..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No vehicles found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try a different search term
            </p>
          </div>
        ) : (
          filteredVehicles.map((vehicle) => (
            <TouchFeedback key={vehicle.id}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
                {/* Vehicle Icon & Name */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-4xl">
                    {vehicle.fields.VEHICLE_TYPE?.toLowerCase().includes('truck') ? '🚛' : '🚗'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {vehicle.fields.NAME}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {vehicle.fields.UNIT}
                    </p>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="space-y-2 text-sm">
                  {vehicle.fields.LICENSE_PLATE && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="font-medium">License:</span>
                      <span>{vehicle.fields.LICENSE_PLATE}</span>
                    </div>
                  )}
                  {vehicle.fields.VEHICLE_TYPE && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Type:</span>
                      <span>{vehicle.fields.VEHICLE_TYPE}</span>
                    </div>
                  )}
                  {vehicle.fields.STATUS && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        vehicle.fields.STATUS === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {vehicle.fields.STATUS}
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {vehicle.fields.NOTES && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {vehicle.fields.NOTES}
                    </p>
                  </div>
                )}

                {/* Quick Action */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <TouchFeedback>
                    <a
                      href={`/?vehicle=${encodeURIComponent(vehicle.fields.NAME)}`}
                      className="block w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-center text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      📋 New Inspection
                    </a>
                  </TouchFeedback>
                </div>
              </div>
            </TouchFeedback>
          ))
        )}
      </div>
    </div>
  );
}
