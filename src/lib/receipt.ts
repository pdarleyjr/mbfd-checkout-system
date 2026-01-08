/**
 * Receipt generation and hosting utilities
 */

import type { InspectionSubmission } from '../types';
import { WORKER_URL } from './config';

const API_BASE_URL = `${WORKER_URL}/api`;

export interface ReceiptItem {
  compartment?: string;
  itemName: string;
  status: 'present' | 'missing' | 'damaged';
  notes?: string;
}

export interface ReceiptPayload {
  inspector: string;
  apparatus: string;
  date: string; // ISO format
  items: ReceiptItem[];
  summary?: {
    totalItems?: number;
    issuesFound?: number;
  };
}

export interface ReceiptResponse {
  ok: boolean;
  id: string;
  url: string;
}

/**
 * Build receipt payload from inspection submission data
 */
export function buildReceiptPayloadFromInspection(
  submission: InspectionSubmission
): ReceiptPayload {
  const { user, apparatus, date, items, defects } = submission;

  // Build a map of item names to compartments for lookup
  // For now, we'll use defects which already have compartment info
  // and items without compartments will show as N/A
  const defectCompartmentMap = new Map<string, string>();
  defects.forEach(d => {
    defectCompartmentMap.set(d.item, d.compartment);
  });

  const receiptItems: ReceiptItem[] = items.map(item => ({
    compartment: defectCompartmentMap.get(item.name) || undefined,
    itemName: item.name,
    status: item.status || 'present',
    notes: item.notes,
  }));

  const issuesFound = receiptItems.filter(i => i.status !== 'present').length;

  return {
    inspector: `${user.name} (${user.rank})`,
    apparatus,
    date,
    items: receiptItems,
    summary: {
      totalItems: items.length,
      issuesFound,
    },
  };
}

/**
 * Create a hosted receipt by POSTing to the worker
 * @throws Error if receipt creation fails
 */
export async function createHostedReceipt(
  apiBase: string,
  payload: ReceiptPayload,
  adminPassword?: string
): Promise<ReceiptResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (adminPassword) {
    headers['X-Admin-Password'] = adminPassword;
  }

  const response = await fetch(`${apiBase}/receipts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(
      `Failed to create receipt: ${response.status} ${errorData.message || response.statusText}`
    );
  }

  return await response.json();
}

/**
 * Build a fallback Markdown receipt for embedding in GitHub issues
 * Used when hosted receipt creation fails
 */
export function buildReceiptMarkdown(payload: ReceiptPayload): string {
  const { inspector, apparatus, date, items, summary } = payload;
  const dateFormatted = new Date(date).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const totalItems = summary?.totalItems ?? items.length;
  const issuesFound = summary?.issuesFound ?? items.filter(i => i.status !== 'present').length;

  const itemsMarkdown = items
    .map(item => {
      const statusEmoji =
        item.status === 'present' ? '✅' : item.status === 'missing' ? '❌' : '⚠️';
      const statusText =
        item.status === 'present' ? 'Present' : item.status === 'missing' ? 'Missing' : 'Damaged';

      return `- **${item.compartment || 'N/A'}**: ${item.itemName} - ${statusEmoji} ${statusText}${item.notes ? ` (_${item.notes}_)` : ''}`;
    })
    .join('\n');

  return `
## 🚒 Inspection Receipt

**Apparatus:** ${apparatus}  
**Inspector:** ${inspector}  
**Date:** ${dateFormatted}

### 📊 Summary
- **Items Checked:** ${totalItems}
- **Issues Found:** ${issuesFound}

### Inspection Details
${itemsMarkdown}

---
_This receipt was embedded as a fallback. Hosted receipt creation was unavailable._
`.trim();
}

/**
 * Helper to get the admin password from the github service or local storage
 * This mimics the pattern used in github.ts
 */
export function getAdminPasswordHeader(): string | undefined {
  // This should ideally come from the github service singleton
  // For now, we'll rely on callers providing it explicitly
  return undefined;
}

/**
 * Convenience function to create a receipt for a submission
 * Returns the receipt URL or null if creation failed
 */
export async function tryCreateReceipt(
  submission: InspectionSubmission,
  adminPassword?: string
): Promise<string | null> {
  try {
    const payload = buildReceiptPayloadFromInspection(submission);
    const response = await createHostedReceipt(API_BASE_URL, payload, adminPassword);
    console.log(`Created hosted receipt: ${response.url}`);
    return response.url;
  } catch (error) {
    console.error('Failed to create hosted receipt:', error);
    return null;
  }
}
