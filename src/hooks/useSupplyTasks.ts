import { useState, useEffect, useCallback } from 'react';
import { fetchTasks, updateTask } from '../lib/inventory';
import type { SupplyTask } from '../lib/inventory';

export function useSupplyTasks(status: 'pending' | 'completed' | 'canceled' = 'pending') {
  const [tasks, setTasks] = useState<SupplyTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchTasks(status);
      setTasks(data.tasks);
      setCount(data.count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMessage);
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  const completeTask = useCallback(async (
    taskId: string,
    chosenReplacement?: { itemId: string; itemName: string; qty: number },
    completedBy?: string,
    notes?: string
  ) => {
    try {
      await updateTask(taskId, {
        status: 'completed',
        chosenReplacement,
        completedBy,
        notes,
      });
      await loadTasks(); // Refresh list
    } catch (err) {
      throw err; // Let caller handle error
    }
  }, [loadTasks]);

  const cancelTask = useCallback(async (taskId: string, notes?: string) => {
    try {
      await updateTask(taskId, {
        status: 'canceled',
        notes,
      });
      await loadTasks(); // Refresh list
    } catch (err) {
      throw err; // Let caller handle error
    }
  }, [loadTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    count,
    refresh: loadTasks,
    completeTask,
    cancelTask,
  };
}