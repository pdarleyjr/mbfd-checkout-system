import { useState, useEffect, useCallback } from 'react';
import { fetchInventory } from '../lib/inventory';
import type { InventoryItem } from '../lib/inventory';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchInventory();
      setItems(data.items);
      setLastFetchedAt(data.fetchedAt);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inventory';
      setError(errorMessage);
      console.error('Error loading inventory:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  return {
    items,
    isLoading,
    error,
    lastFetchedAt,
    refresh: loadInventory,
  };
}