import { Octokit } from '@octokit/rest';
import type { Apparatus, Defect, GitHubIssue, InspectionSubmission } from '../types';

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const REPO_OWNER = 'pdarleyjr';
const REPO_NAME = 'mbfd-checkout-system';

class GitHubService {
  private octokit: Octokit;

  constructor() {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured. Please contact your system administrator.');
    }

    this.octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });
  }

  /**
   * Fetch all open defects for a specific apparatus
   * Returns a map of items to their issue numbers for quick lookup
   */
  async checkExistingDefects(apparatus: Apparatus): Promise<Map<string, GitHubIssue>> {
    try {
      const { data: issues } = await this.octokit.rest.issues.listForRepo({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: 'open',
        labels: `Defect,${apparatus}`,
        per_page: 100,
      });

      const defectMap = new Map<string, GitHubIssue>();

      for (const issue of issues) {
        // Parse the issue title to extract compartment and item
        // Expected format: "[Apparatus] Compartment: Item - Status"
        const match = issue.title.match(/\[.+\]\s+(.+):\s+(.+?)\s+-\s+(Missing|Damaged)/);
        if (match) {
          const [, compartment, item] = match;
          const key = `${compartment}:${item}`;
          defectMap.set(key, issue as GitHubIssue);
        }
      }

      return defectMap;
    } catch (error) {
      console.error('Error fetching existing defects:', error);
      throw error;
    }
  }

  /**
   * Submit a checklist inspection
   * Creates new issues for new defects, adds comments to existing ones
   */
  async submitChecklist(submission: InspectionSubmission): Promise<void> {
    const { user, apparatus, date, defects } = submission;

    // Get existing open defects for this apparatus
    const existingDefects = await this.checkExistingDefects(apparatus);

    // Process each defect
    for (const defect of defects) {
      const defectKey = `${defect.compartment}:${defect.item}`;
      const existingIssue = existingDefects.get(defectKey);

      if (existingIssue) {
        // Add comment to existing issue
        await this.addCommentToDefect(
          existingIssue.number,
          user.name,
          user.rank,
          date,
          defect.notes
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
          date
        );
      }
    }

    // Create a log entry (closed issue) for the completed inspection
    await this.createLogEntry(submission);
  }

  /**
   * Create a new defect issue
   */
  private async createDefectIssue(
    apparatus: Apparatus,
    compartment: string,
    item: string,
    status: 'missing' | 'damaged',
    notes: string,
    reportedBy: string,
    rank: string,
    date: string
  ): Promise<void> {
    const title = `[${apparatus}] ${compartment}: ${item} - ${status === 'missing' ? 'Missing' : 'Damaged'}`;
    const body = `
## Defect Report

**Apparatus:** ${apparatus}
**Compartment:** ${compartment}
**Item:** ${item}
**Status:** ${status === 'missing' ? '❌ Missing' : '⚠️ Damaged'}
**Reported By:** ${reportedBy} (${rank})
**Date:** ${date}

### Notes
${notes}

---
*This issue was automatically created by the MBFD Checkout System.*
    `.trim();

    const labels = ['Defect', apparatus];
    if (status === 'damaged') {
      labels.push('Damaged');
    }

    try {
      await this.octokit.rest.issues.create({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        title,
        body,
        labels,
      });
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
    notes?: string
  ): Promise<void> {
    const body = `
### Verification Update

**Verified still present by:** ${verifiedBy} (${rank})
**Date:** ${date}

${notes ? `**Additional Notes:** ${notes}` : ''}

---
*This comment was automatically added by the MBFD Checkout System.*
    `.trim();

    try {
      await this.octokit.rest.issues.createComment({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: issueNumber,
        body,
      });
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
    const body = `
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

---
*This inspection log was automatically created by the MBFD Checkout System.*
    `.trim();

    try {
      const { data: issue } = await this.octokit.rest.issues.create({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        title,
        body,
        labels: ['Log', apparatus],
      });

      // Immediately close the issue to mark it as a log entry
      await this.octokit.rest.issues.update({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: issue.number,
        state: 'closed',
      });
    } catch (error) {
      console.error('Error creating log entry:', error);
      throw error;
    }
  }

  /**
   * Fetch all open defects across all apparatus
   */
  async getAllDefects(): Promise<Defect[]> {
    try {
      const { data: issues } = await this.octokit.rest.issues.listForRepo({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: 'open',
        labels: 'Defect',
        per_page: 100,
      });

      return issues.map(issue => this.parseDefectFromIssue(issue as GitHubIssue));
    } catch (error) {
      console.error('Error fetching all defects:', error);
      throw error;
    }
  }

  /**
   * Parse a defect object from a GitHub issue
   */
  private parseDefectFromIssue(issue: GitHubIssue): Defect {
    const match = issue.title.match(/\[(.+)\]\s+(.+):\s+(.+?)\s+-\s+(Missing|Damaged)/);
    
    let apparatus: Apparatus = 'Rescue 1';
    let compartment = 'Unknown';
    let item = 'Unknown';
    let status: 'missing' | 'damaged' = 'missing';

    if (match) {
      apparatus = match[1] as Apparatus;
      compartment = match[2];
      item = match[3];
      const statusStr = match[4];
      status = statusStr.toLowerCase() as 'missing' | 'damaged';
    }

    return {
      issueNumber: issue.number,
      apparatus,
      compartment,
      item,
      status,
      notes: issue.body || '',
      reportedBy: issue.user.login,
      reportedAt: issue.created_at,
      updatedAt: issue.updated_at,
      resolved: false,
    };
  }

  /**
   * Resolve a defect by closing the issue
   */
  async resolveDefect(issueNumber: number, resolutionNote: string, resolvedBy: string): Promise<void> {
    try {
      // Add resolution comment
      await this.octokit.rest.issues.createComment({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: issueNumber,
        body: `
## ✅ Defect Resolved

**Resolved By:** ${resolvedBy}
**Date:** ${new Date().toISOString()}

### Resolution
${resolutionNote}

---
*This defect was marked as resolved via the MBFD Admin Dashboard.*
        `.trim(),
      });

      // Close the issue
      await this.octokit.rest.issues.update({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: issueNumber,
        state: 'closed',
        labels: ['Defect', 'Resolved'],
      });
    } catch (error) {
      console.error('Error resolving defect:', error);
      throw error;
    }
  }

  /**
   * Get fleet status summary
   */
  async getFleetStatus(): Promise<Map<Apparatus, number>> {
    const defects = await this.getAllDefects();
    const statusMap = new Map<Apparatus, number>();

    // Initialize all apparatus with 0 defects
    const allApparatus: Apparatus[] = ['Rescue 1', 'Rescue 2', 'Rescue 3', 'Rescue 11', 'Engine 1'];
    allApparatus.forEach(apparatus => statusMap.set(apparatus, 0));

    // Count defects per apparatus
    defects.forEach(defect => {
      const current = statusMap.get(defect.apparatus) || 0;
      statusMap.set(defect.apparatus, current + 1);
    });

    return statusMap;
  }
}

// Export a singleton instance
export const githubService = new GitHubService();