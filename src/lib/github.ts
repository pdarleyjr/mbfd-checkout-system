import type { Defect, GitHubIssue, InspectionSubmission, EmailConfig } from '../types';
import { APPARATUS_LIST, LABELS, DEFECT_TITLE_REGEX, API_BASE_URL } from './config';

class GitHubService {
  private adminPassword: string | null = null;

  constructor() {
    // No token needed in frontend - handled by Cloudflare Worker
  }

  /**
   * Set admin password for authenticated requests
   */
  setAdminPassword(password: string): void {
    this.adminPassword = password;
  }

  /**
   * Clear admin password
   */
  clearAdminPassword(): void {
    this.adminPassword = null;
  }

  /**
   * Check if admin is authenticated
   */
  isAdminAuthenticated(): boolean {
    return this.adminPassword !== null;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(isAdmin: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (isAdmin && this.adminPassword) {
      headers['X-Admin-Password'] = this.adminPassword;
    }

    return headers;
  }

  /**
   * Fetch all open defects for a specific apparatus
   * Returns a map of items to their issue numbers for quick lookup
   */
  async checkExistingDefects(apparatus: string): Promise<Map<string, GitHubIssue>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/issues?state=open&labels=${LABELS.DEFECT},${encodeURIComponent(apparatus)}&per_page=100`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch defects: ${response.statusText}`);
        // Return empty map instead of throwing - no existing defects is OK
        return new Map<string, GitHubIssue>();
      }

      const data = await response.json();
      
      // Handle case where response is not an array (empty response, error, etc.)
      const issues: GitHubIssue[] = Array.isArray(data) ? data : [];
      const defectMap = new Map<string, GitHubIssue>();

      for (const issue of issues) {
        // Parse the issue title using the regex from config
        const match = issue.title.match(DEFECT_TITLE_REGEX);
        if (match) {
          const [, , compartment, item] = match;
          const key = `${compartment}:${item}`;
          defectMap.set(key, issue);
        }
      }

      return defectMap;
    } catch (error) {
      console.error('Error fetching existing defects:', error);
      // Return empty map instead of throwing - allow inspection to continue
      return new Map<string, GitHubIssue>();
    }
  }

  /**
   * Submit a checklist inspection
   * Creates new issues for new defects, adds comments to existing ones
   * Implements robust error handling: attempts all defects even if some fail
   */
  async submitChecklist(submission: InspectionSubmission): Promise<void> {
    const { user, apparatus, date, defects } = submission;

    // Get existing open defects for this apparatus
    const existingDefects = await this.checkExistingDefects(apparatus);

    // Track failures but continue processing all defects
    let defectErrors = 0;
    const errorMessages: string[] = [];

    // Process each defect (attempt all even if some fail)
    for (const defect of defects) {
      try {
        const defectKey = `${defect.compartment}:${defect.item}`;
        const existingIssue = existingDefects.get(defectKey);

        if (existingIssue) {
          // Add comment to existing issue
          await this.addCommentToDefect(
            existingIssue.number,
            user.name,
            user.rank,
            date,
            defect.notes,
            defect.photoUrl
          );
        } else {
          // Create new issue
          await this.createDefectIssue(
            apparatus,
            defect.compartment,
            defect.item,
            defect.status,
            defect.notes,
            user.name,
            user.rank,
            date,
            defect.photoUrl
          );
        }
      } catch (error) {
        defectErrors++;
        const errorMsg = `${defect.compartment}:${defect.item}`;
        errorMessages.push(errorMsg);
        console.error(`Failed to process defect ${errorMsg}:`, error);
        // Continue to next defect instead of throwing
      }
    }

    // If any defects failed, throw error before creating log
    // This prevents incomplete submissions from being logged
    if (defectErrors > 0) {
      throw new Error(`Failed to submit ${defectErrors} defect(s): ${errorMessages.join(', ')}. Please try again.`);
    }

    // Create a log entry (closed issue) for the completed inspection
    await this.createLogEntry(submission);

    // After successful submission, trigger inventory cross-matching
    if (defects.length > 0) {
      try {
        await this.createSupplyTasksForDefects(defects, apparatus);
      } catch (error) {
        console.error('Failed to create supply tasks (non-fatal):', error);
        // Don't throw - defects were submitted successfully
      }
    }
  }

  /**
   * Create a new defect issue
   */
  private async createDefectIssue(
    apparatus: string,
    compartment: string,
    item: string,
    status: 'missing' | 'damaged',
    notes: string,
    reportedBy: string,
    rank: string,
    date: string,
    photoUrl?: string
  ): Promise<void> {
    const title = `[${apparatus}] ${compartment}: ${item} - ${status === 'missing' ? 'Missing' : 'Damaged'}`;
    let body = `
## Defect Report

**Apparatus:** ${apparatus}
**Compartment:** ${compartment}
**Item:** ${item}
**Status:** ${status === 'missing' ? '❌ Missing' : '⚠️ Damaged'}
**Reported By:** ${reportedBy} (${rank})
**Date:** ${date}

### Notes
${notes}
`;

    // Add photo if available
    if (photoUrl) {
      body += `\n### Photo Evidence\n\n![Defect Photo](${photoUrl})\n`;
    }

    body += `\n---
*This issue was automatically created by the MBFD Checkout System.*`;

    body = body.trim();

    const labels = [LABELS.DEFECT, apparatus];
    if (status === 'damaged') {
      labels.push(LABELS.DAMAGED);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ title, body, labels }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create issue: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating defect issue:', error);
      throw error;
    }
  }

  /**
   * Add a verification comment to an existing defect
   */
  private async addCommentToDefect(
    issueNumber: number,
    verifiedBy: string,
    rank: string,
    date: string,
    notes?: string,
    photoUrl?: string
  ): Promise<void> {
    let body = `
### Verification Update

**Verified still present by:** ${verifiedBy} (${rank})
**Date:** ${date}

${notes ? `**Additional Notes:** ${notes}` : ''}
`;

    // Add photo if available
    if (photoUrl) {
      body += `\n### Photo Evidence\n\n![Defect Photo](${photoUrl})\n`;
    }

    body += `\n---
*This comment was automatically added by the MBFD Checkout System.*`;

    body = body.trim();

    try {
      const response = await fetch(`${API_BASE_URL}/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error adding comment to issue:', error);
      throw error;
    }
  }

  /**
   * Create a log entry for completed inspection
   */
  private async createLogEntry(submission: InspectionSubmission): Promise<void> {
    const { user, apparatus, date, items } = submission;
    
    const title = `[${apparatus}] Daily Inspection - ${date}`;
    
    // Try to create a hosted receipt
    let receiptURL: string | null = null;
    let fallbackMarkdown = '';
    
    try {
      // Import receipt helpers dynamically to avoid circular deps
      const { buildReceiptPayloadFromInspection, createHostedReceipt, buildReceiptMarkdown } = await import('./receipt');
      const receiptPayload = buildReceiptPayloadFromInspection(submission);
      
      // Attempt to create hosted receipt
      try {
        const response = await createHostedReceipt(API_BASE_URL, receiptPayload, this.adminPassword || undefined);
        receiptURL = response.url;
        console.log(`Created hosted receipt: ${receiptURL}`);
      } catch (receiptError) {
        console.error('Failed to create hosted receipt, using fallback:', receiptError);
        // Build fallback markdown
        fallbackMarkdown = buildReceiptMarkdown(receiptPayload);
      }
    } catch (error) {
      console.error('Receipt module import failed:', error);
      // Continue without receipt
    }
    
    // Build issue body with receipt link or embedded markdown
    let body = `
## Daily Inspection Log

**Apparatus:** ${apparatus}
**Conducted By:** ${user.name} (${user.rank})
**Date:** ${date}

### Summary
- **Total Items Checked:** ${items.length}
- **Issues Found:** ${submission.defects.length}

${submission.defects.length > 0 ? `
### Issues Reported
${submission.defects.map(d => `- ${d.compartment}: ${d.item} - ${d.status === 'missing' ? '❌ Missing' : '⚠️ Damaged'}`).join('\n')}`
 : '✅ All items present and working'}
`;

    // Add receipt link or fallback markdown
    if (receiptURL) {
      body += `\n\n---\n\n📋 **[View Full Printable Receipt](${receiptURL})**\n\n_This receipt contains the complete inspection details in a print-friendly format._\n`;
    } else if (fallbackMarkdown) {
      body += `\n\n---\n\n${fallbackMarkdown}\n`;
    }
    
    body += `\n---
*This inspection log was automatically created by the MBFD Checkout System.*`;

    body = body.trim();

    try {
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          title,
          body,
          labels: [LABELS.LOG, apparatus],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create log: ${response.statusText}`);
      }

      const issue = await response.json();

      // Immediately close the issue to mark it as a log entry
      const closeResponse = await fetch(`${API_BASE_URL}/issues/${issue.number}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ state: 'closed' }),
      });

      if (!closeResponse.ok) {
        // Log detailed error information for debugging
        const errorText = await closeResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        console.error(`Failed to close log issue #${issue.number}:`, {
          status: closeResponse.status,
          statusText: closeResponse.statusText,
          error: errorData,
          message: errorData.message || 'Unknown error'
        });
        
        // Don't throw - log was created successfully, just not closed
        // The workaround of querying 'state=all' handles this
        console.warn(`Log entry created as issue #${issue.number} but could not be closed. It may require manual closure or token permissions review.`);
      } else {
        console.log(`Successfully created and closed log issue #${issue.number}`);
      }
    } catch (error) {
      console.error('Error creating log entry:', error);
      throw error;
    }
  }

  /**
   * Fetch all open defects across all apparatus (ADMIN ONLY)
   */
  async getAllDefects(): Promise<Defect[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/issues?state=open&labels=${LABELS.DEFECT}&per_page=100`,
        {
          method: 'GET',
          headers: this.getHeaders(true), // Admin request
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please enter the admin password.');
        }
        throw new Error(`Failed to fetch defects: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle case where response is not an array
      const issues: GitHubIssue[] = Array.isArray(data) ? data : [];
      return issues.map(issue => this.parseDefectFromIssue(issue));
    } catch (error) {
      console.error('Error fetching all defects:', error);
      throw error;
    }
  }

  /**
   * Parse a defect object from a GitHub issue
   */
  private parseDefectFromIssue(issue: GitHubIssue): Defect {
    const match = issue.title.match(DEFECT_TITLE_REGEX);
    
    let apparatus = 'Rescue 1';
    let compartment = 'Unknown';
    let item = 'Unknown';
    let status: 'missing' | 'damaged' = 'missing';

    if (match) {
      apparatus = match[1];
      compartment = match[2];
      item = match[3];
      const statusStr = match[4];
      status = statusStr.toLowerCase() as 'missing' | 'damaged';
    }

    // Extract photo URL from issue body if present
    let photoUrl: string | undefined;
    if (issue.body) {
      // Look for markdown image syntax: ![alt](url)
      const photoMatch = issue.body.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
      if (photoMatch) {
        photoUrl = photoMatch[1];
      }
    }

    return {
      issueNumber: issue.number,
      apparatus,
      compartment,
      item,
      status,
      notes: issue.body || '',
      reportedBy: issue.user?.login || 'Unknown',
      reportedAt: issue.created_at,
      updatedAt: issue.updated_at,
      resolved: false,
      photoUrl,
    };
  }

  /**
   * Resolve a defect by closing the issue (ADMIN ONLY)
   */
  async resolveDefect(issueNumber: number, resolutionNote: string, resolvedBy: string): Promise<void> {
    try {
      // First, fetch the issue to get its current labels
      const issueResponse = await fetch(`${API_BASE_URL}/issues/${issueNumber}`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (!issueResponse.ok) {
        throw new Error(`Failed to fetch issue details: ${issueResponse.statusText}`);
      }

      const issue = await issueResponse.json();
      const currentLabels = issue.labels.map((label: any) => label.name);
      
      // Preserve apparatus labels and defect label, add resolved label
      const apparatusLabel = currentLabels.find((label: string) => 
        APPARATUS_LIST.includes(label as any)
      );
      const newLabels = [LABELS.DEFECT, LABELS.RESOLVED];
      if (apparatusLabel) {
        newLabels.push(apparatusLabel);
      }
      
      // Add resolution comment
      await fetch(`${API_BASE_URL}/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: this.getHeaders(true), // Admin request
        body: JSON.stringify({
          body: `
## ✅ Defect Resolved

**Resolved By:** ${resolvedBy}
**Date:** ${new Date().toISOString()}

### Resolution
${resolutionNote}

---
*This defect was marked as resolved via the MBFD Admin Dashboard.*
`.trim(),
        }),
      });

      // Close the issue and update labels (preserving apparatus label)
      const response = await fetch(`${API_BASE_URL}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers: this.getHeaders(true), // Admin request
        body: JSON.stringify({
          state: 'closed',
          labels: newLabels,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please enter the admin password.');
        }
        throw new Error(`Failed to resolve defect: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error resolving defect:', error);
      throw error;
    }
  }

  /**
   * Get fleet status summary - computes from defect list (ADMIN ONLY)
   * This method is kept for backward compatibility but should be deprecated
   * in favor of computing status directly from getAllDefects() result
   */
  async getFleetStatus(): Promise<Map<string, number>> {
    const defects = await this.getAllDefects();
    return this.computeFleetStatus(defects);
  }

  /**
   * Compute fleet status from a list of defects
   * Useful for avoiding redundant API calls
   */
  computeFleetStatus(defects: Defect[]): Map<string, number> {
    const statusMap = new Map<string, number>();

    // Initialize all apparatus with 0 defects
    for (const apparatus of APPARATUS_LIST) {
      statusMap.set(apparatus, 0);
    }

    // Count defects per apparatus
    defects.forEach(defect => {
      const current = statusMap.get(defect.apparatus) || 0;
      statusMap.set(defect.apparatus, current + 1);
    });

    return statusMap;
  }

  /**
   * Fetch inspection logs (ADMIN ONLY)
   * Get issues with 'Log' label (querying all states since closing may fail)
   */
  async getInspectionLogs(days: number = 7): Promise<GitHubIssue[]> {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);
      
      const response = await fetch(
        `${API_BASE_URL}/issues?state=all&labels=${LABELS.LOG}&per_page=100&since=${sinceDate.toISOString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(true), // Admin request
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please enter the admin password.');
        }
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching inspection logs:', error);
      throw error;
    }
  }

  /**
   * Get daily submission statistics (ADMIN ONLY)
   * Returns which vehicles have submitted today and total submissions per vehicle
   */
  async getDailySubmissions(): Promise<{
    today: string[];
    totals: Map<string, number>;
    lastSubmission: Map<string, string>;
  }> {
    try {
      const logs = await this.getInspectionLogs(1); // Today's logs
      const allLogs = await this.getInspectionLogs(30); // Last 30 days for totals
      
      const today = new Date().toLocaleDateString('en-US');
      const todaySubmissions: string[] = [];
      const totals = new Map<string, number>();
      const lastSubmission = new Map<string, string>();
      
      // Initialize totals for all apparatus
      APPARATUS_LIST.forEach(apparatus => {
        totals.set(apparatus, 0);
      });
      
      // Process all logs for totals and find latest submissions
      allLogs.forEach(log => {
        const match = log.title.match(/\[(.+)\]\s+Daily Inspection/);
        if (match) {
          const apparatus = match[1];
          const current = totals.get(apparatus) || 0;
          totals.set(apparatus, current + 1);
          
          // Track most recent submission date
          const submissionDate = new Date(log.created_at).toLocaleDateString('en-US');
          const currentLast = lastSubmission.get(apparatus);
          if (!currentLast || new Date(log.created_at) > new Date(currentLast)) {
            lastSubmission.set(apparatus, submissionDate);
          }
        }
      });
      
      // Check today's submissions
      logs.forEach(log => {
        const match = log.title.match(/\[(.+)\]\s+Daily Inspection/);
        if (match) {
          const apparatus = match[1];
          const logDate = new Date(log.created_at).toLocaleDateString('en-US');
          if (logDate === today && !todaySubmissions.includes(apparatus)) {
            todaySubmissions.push(apparatus);
          }
        }
      });
      
      return { today: todaySubmissions, totals, lastSubmission };
    } catch (error) {
      console.error('Error getting daily submissions:', error);
      throw error;
    }
  }

  /**
   * Analyze defects to identify low stock items (ADMIN ONLY)
   * Items reported as missing multiple times may indicate supply issues
   */
  async analyzeLowStockItems(): Promise<Array<{
    item: string;
    compartment: string;
    apparatus: string[];
    occurrences: number;
  }>> {
    try {
      // Get all defects from last 30 days
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 30);
      
      const response = await fetch(
        `${API_BASE_URL}/issues?state=all&labels=${LABELS.DEFECT}&per_page=100&since=${sinceDate.toISOString()}`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch defects for analysis: ${response.statusText}`);
      }

      const data = await response.json();
      // Handle case where response is not an array
      const issues: GitHubIssue[] = Array.isArray(data) ? data : [];
      const itemMap = new Map<string, {
        compartment: string;
        apparatus: Set<string>;
        occurrences: number;
      }>();

      // Analyze missing items
      issues.forEach(issue => {
        if (issue.title.includes('Missing')) {
          const match = issue.title.match(DEFECT_TITLE_REGEX);
          if (match) {
            const [, apparatus, compartment, item] = match;
            const key = `${compartment}:${item}`;
            
            if (itemMap.has(key)) {
              const data = itemMap.get(key)!;
              data.apparatus.add(apparatus);
              data.occurrences++;
            } else {
              itemMap.set(key, {
                compartment,
                apparatus: new Set([apparatus]),
                occurrences: 1,
              });
            }
          }
        }
      });

      // Convert to array and filter items with multiple occurrences
      const lowStockItems = Array.from(itemMap.entries())
        .filter(([, data]) => data.occurrences >= 2) // 2+ occurrences suggests supply issue
        .map(([key, data]) => ({
          item: key.split(':')[1],
          compartment: data.compartment,
          apparatus: Array.from(data.apparatus),
          occurrences: data.occurrences,
        }))
        .sort((a, b) => b.occurrences - a.occurrences);

      return lowStockItems;
    } catch (error) {
      console.error('Error analyzing low stock items:', error);
      throw error;
    }
  }

  /**
   * Send notification after inspection submission
   * Queues notification for daily digest or sends immediately based on configuration
   */
  async sendNotification(submission: {
    apparatus: string;
    operator: string;
    checklistType: string;
    totalItems: number;
    completedItems: number;
    defects: Array<{
      item: string;
      category: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
    }>;
    githubIssueUrl?: string;
  }): Promise<{ success: boolean; notification_sent: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/notify`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      return response.json();
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Get email configuration (ADMIN ONLY)
   */
  async getEmailConfig(adminPassword: string): Promise<EmailConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/email`, {
        method: 'GET',
        headers: {
          'X-Admin-Password': adminPassword,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch email configuration');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching email config:', error);
      throw error;
    }
  }

  /**
   * Update email configuration (ADMIN ONLY)
   */
  async updateEmailConfig(
    adminPassword: string,
    updates: Partial<EmailConfig>
  ): Promise<{ success: boolean; config: EmailConfig }> {
    try {
      const response = await fetch(`${API_BASE_URL}/config/email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to update email configuration');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating email config:', error);
      throw error;
    }
  }

  /**
   * Manually trigger daily digest (ADMIN ONLY)
   */
  async sendManualDigest(adminPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/digest/send`, {
      method: 'POST',
      headers: {
        'X-Admin-Password': adminPassword,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error('Failed to send digest');
    }

    return response.json();
  }

  /**
   * Get AI-generated fleet insights (admin only, requires Workers AI)
   */
  async getAIInsights(
    adminPassword: string,
    timeframe: 'week' | 'month' | 'all' = 'week',
    apparatus?: string
  ): Promise<{
    insights: string[];
    dataPoints: number;
    timeframe: string;
    apparatus: string;
    generatedAt: string;
  }> {
    const params = new URLSearchParams({
      timeframe,
      ...(apparatus && { apparatus })
    });

    const response = await fetch(`${API_BASE_URL}/analyze?${params}`, {
      method: 'GET',
      headers: {
        'X-Admin-Password': adminPassword,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      if (response.status === 503) {
        throw new Error('AI features not enabled');
      }
      throw new Error('Failed to fetch AI insights');
    }

    return response.json();
  }

  /**
   * Create supply tasks for reported defects by cross-matching with inventory
   */
  private async createSupplyTasksForDefects(
    defects: Array<{ compartment: string; item: string; status: 'missing' | 'damaged' }>,
    apparatus: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ defects, apparatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create supply tasks: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Created ${result.tasksCreated || 0} supply tasks from ${defects.length} defects`);
    } catch (error) {
      console.error('Error creating supply tasks:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const githubService = new GitHubService();