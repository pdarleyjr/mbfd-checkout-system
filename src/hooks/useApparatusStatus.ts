import { useState, useEffect, useCallback } from 'react';
import { fetchApparatusStatus } from '../lib/inventory';
import type { ApparatusStatus, Vehicle } from '../lib/inventory';

interface UseApparatusStatusReturn {
  statuses: ApparatusStatus[];
  allVehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getVehicleNumber: (unit: string) => string | undefined;
}

/**
 * Hook to fetch and manage apparatus status data (apparatus-to-vehicle mappings)
 */
export function useApparatusStatus(): UseApparatusStatusReturn {
  const [statuses, setStatuses] = useState<ApparatusStatus[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatuses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchApparatusStatus();
      setStatuses(data.statuses);
      setAllVehicles(data.allVehicles || []);
    } catch (err) {
      console.error('Error fetching apparatus status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch apparatus status');
    } finally {
      setLoading(false);
    }
  };

  // Get vehicle number for a specific apparatus unit - memoized to prevent infinite loops
  const getVehicleNumber = useCallback((unit: string): string | undefined => {
    const status = statuses.find(s => s.unit === unit);
    return status?.vehicleNo;
  }, [statuses]); // Only recreate when statuses change

  useEffect(() => {
    loadStatuses();
  }, []);

  return {
    statuses,
    allVehicles,
    loading,
    error,
    refetch: loadStatuses,
    getVehicleNumber,
  };
}
