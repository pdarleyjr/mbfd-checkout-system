import type { Apparatus } from '../types';

/**
 * Cloudflare Worker URL for API requests
 */
export const WORKER_URL = 'https://mbfd-github-proxy.pdarleyjr.workers.dev';

/**
 * API base URL (derives from WORKER_URL for consistency)
 */
export const API_BASE_URL = `${WORKER_URL}/api`;

/**
 * Feature flag for dynamic forms management
 * Set to false initially for safe rollout
 * When enabled, forms are loaded from D1 database instead of static JSON files
 */
export const FORMS_MANAGEMENT_ENABLED = true;

/**
 * List of all apparatus in the MBFD fleet
 * Update this list when new apparatus are added to the system
 */
export const APPARATUS_LIST: Apparatus[] = [
  'Engine 1', 'Engine 2', 'Engine 3', 'Engine 4',
  'Ladder 1', 'Ladder 3',
  'Rescue 1', 'Rescue 2', 'Rescue 3', 'Rescue 4',
  'Rescue 11', 'Rescue 22', 'Rescue 44',
  'Rope Inventory'
];

/**
 * GitHub issue label constants
 * These labels are used to categorize and filter issues
 */
export const LABELS = {
  DEFECT: 'Defect',
  LOG: 'Log',
  DAMAGED: 'Damaged',
  RESOLVED: 'Resolved',
} as const;

/**
 * Regular expression for parsing defect issue titles
 * Format: [Apparatus] Compartment: Item - Status
 */
export const DEFECT_TITLE_REGEX = /\[(.+)\]\s+(.+):\s+(.+?)\s+-\s+(Missing|Damaged)/;