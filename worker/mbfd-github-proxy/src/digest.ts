/**
 * Daily Digest Email Generation Module
 * 
 * This module handles generating and sending daily digest emails
 * with inspection summaries and defect highlights
 */

import { 
  getPendingNotifications, 
  clearPendingNotifications,
  getEmailConfig,
  PendingNotification,
  EmailConfig
} from './kv-helpers';
import { sendGmailMessage } from './gmail';

interface Env {
  MBFD_CONFIG: KVNamespace;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  GMAIL_SENDER_EMAIL: string;
}

export async function sendDailyDigest(env: Env): Promise<void> {
  const config = await getEmailConfig(env);
  
  // Check if emails are enabled
  if (!config.enabled) {
    console.log('Email notifications disabled, skipping digest');
    return;
  }

  // Get today's pending notifications
  const notifications = await getPendingNotifications(env);
  
  if (notifications.length === 0) {
    console.log('No pending notifications to send');
    return;
  }

  // Generate email content
  const emailContent = generateDigestEmail(notifications, config);
  
  // Send digest email
  const result = await sendGmailMessage(env, {
    to: config.recipients,
    subject: emailContent.subject,
    textBody: emailContent.text,
    htmlBody: emailContent.html
  });

  if (result.success) {
    console.log(`Daily digest sent successfully to ${config.recipients.length} recipients`);
    console.log(`Message ID: ${result.messageId}`);
    
    // Clear the queue after successful send
    await clearPendingNotifications(env);
  } else {
    console.error('Failed to send daily digest:', result.error);
    // Don't clear the queue - we'll try again tomorrow
    throw new Error(`Digest send failed: ${result.error}`);
  }
}

export function generateDigestEmail(
  notifications: PendingNotification[],
  config: EmailConfig
): { subject: string; text: string; html: string } {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const subject = config.email_subject_template.replace('{date}', today);

  // Count stats
  const totalInspections = notifications.length;
  const criticalDefects = notifications.filter(n => n.hasCriticalDefects).length;
  const totalDefects = notifications.reduce((sum, n) => sum + n.defects.length, 0);

  // Text version
  const text = `
MBFD Daily Inspection Summary
${today}

Summary:
- Total Inspections: ${totalInspections}
- Total Defects Found: ${totalDefects}
- Critical Issues: ${criticalDefects}

Detailed Inspections:
${notifications.map((n, idx) => `
${idx + 1}. ${n.apparatus} - ${n.checklistType.toUpperCase()}
   Operator: ${n.operator}
   Time: ${new Date(n.timestamp).toLocaleTimeString('en-US')}
   Completion: ${n.completedItems}/${n.totalItems} items
   ${n.defects.length > 0 ? `
   Defects Found:
   ${n.defects.map(d => `
   - [${d.severity.toUpperCase()}] ${d.item} (${d.category})
   `).join('')}
   ` : '   No defects found'}
   ${n.githubIssueUrl ? `
View Details: ${n.githubIssueUrl}
` : ''}
`).join('\n---\n')}

--
MBFD Checkout System
This is an automated message. Please do not reply to this email.
`.trim();

  // HTML version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .summary { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .stats { display: flex; justify-content: space-around; margin: 10px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #dc2626; }
    .stat-label { font-size: 14px; color: #6b7280; }
    .inspection { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .inspection-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .apparatus { font-size: 18px; font-weight: bold; color: #dc2626; }
    .timestamp { color: #6b7280; font-size: 14px; }
    .defect { padding: 8px; margin: 5px 0; border-left: 4px solid #fbbf24; background: #fffbeb; }
    .defect.critical { border-left-color: #dc2626; background: #fef2f2; }
    .severity { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .severity.critical { background: #dc2626; color: white; }
    .severity.high { background: #ea580c; color: white; }
    .severity.medium { background: #fbbf24; color: #000; }
    .severity.low { background: #22c55e; color: white; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚒 MBFD Daily Inspection Summary</h1>
    <p style="margin: 5px 0 0 0;">${today}</p>
  </div>
  
  <div class="summary">
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${totalInspections}</div>
        <div class="stat-label">Inspections</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalDefects}</div>
        <div class="stat-label">Defects Found</div>
      </div>
      <div class="stat">
        <div class="stat-value">${criticalDefects}</div>
        <div class="stat-label">Critical Issues</div>
      </div>
    </div>
  </div>

  ${notifications.map(n => `
    <div class="inspection">
      <div class="inspection-header">
        <div class="apparatus">${n.apparatus} - ${n.checklistType.toUpperCase()}</div>
        <div class="timestamp">${new Date(n.timestamp).toLocaleString('en-US')}</div>
      </div>
      <p><strong>Operator:</strong> ${n.operator}</p>
      <p><strong>Completion:</strong> ${n.completedItems}/${n.totalItems} items</p>
      
      ${n.defects.length > 0 ? `
        <div style="margin-top: 10px;">
          <strong>Defects Found (${n.defects.length}):</strong>
          ${n.defects.map(d => `
            <div class="defect ${d.severity === 'critical' ? 'critical' : ''}">
              <span class="severity ${d.severity}">${d.severity}</span>
              <strong>${d.item}</strong>
              <span style="color: #6b7280; font-size: 14px;">(${d.category})</span>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: #22c55e;">✓ No defects found</p>'}
      
      ${n.githubIssueUrl ? `
        <p style="margin-top: 10px;">
          <a href="${n.githubIssueUrl}">View Full Details on GitHub →</a>
        </p>
      ` : ''}
    </div>
  `).join('')}

  <div class="footer">
    <p>MBFD Checkout System - Automated Daily Report</p>
    <p>Please do not reply to this email</p>
  </div>
</body>
</html>
`.trim();

  return { subject, text, html };
}

export function generateImmediateEmail(
  notification: PendingNotification
): { text: string; html: string } {
  const text = `
MBFD Inspection Alert
${notification.hasCriticalDefects ? '⚠️ CRITICAL DEFECTS FOUND' : 'Inspection Completed'}

Apparatus: ${notification.apparatus}
Type: ${notification.checklistType.toUpperCase()}
Operator: ${notification.operator}
Time: ${new Date(notification.timestamp).toLocaleString('en-US')}

Completion: ${notification.completedItems}/${notification.totalItems} items

${notification.defects.length > 0 ? `
Defects Found (${notification.defects.length}):
${notification.defects.map(d => `
- [${d.severity.toUpperCase()}] ${d.item} (${d.category})
`).join('')}
` : 'No defects found'}

${notification.githubIssueUrl ? `
View Details: ${notification.githubIssueUrl}
` : ''}

--
MBFD Checkout System
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: ${notification.hasCriticalDefects ? '#fef2f2' : '#f3f4f6'}; 
             border-left: 4px solid ${notification.hasCriticalDefects ? '#dc2626' : '#2563eb'}; 
             padding: 15px; margin: 20px 0; }
    .defect { padding: 8px; margin: 5px 0; border-left: 4px solid #fbbf24; background: #fffbeb; }
    .critical { border-left-color: #dc2626; background: #fef2f2; }
  </style>
</head>
<body>
  <div class="alert">
    <h2 style="margin-top: 0;">${notification.hasCriticalDefects ? '⚠️ CRITICAL DEFECTS FOUND' : '✓ Inspection Completed'}</h2>
    <p><strong>${notification.apparatus}</strong> - ${notification.checklistType.toUpperCase()}</p>
    <p>Operator: ${notification.operator}<br>
    Time: ${new Date(notification.timestamp).toLocaleString('en-US')}<br>
    Completion: ${notification.completedItems}/${notification.totalItems} items</p>
  </div>
  
  ${notification.defects.length > 0 ? `
    <h3>Defects Found (${notification.defects.length}):</h3>
    ${notification.defects.map(d => `
      <div class="defect ${d.severity === 'critical' ? 'critical' : ''}">
        <strong>[${d.severity.toUpperCase()}]</strong> ${d.item} <em>(${d.category})</em>
      </div>
    `).join('')}
  ` : '<p style="color: #22c55e;">✓ No defects found</p>'}
  
  ${notification.githubIssueUrl ? `
    <p><a href="${notification.githubIssueUrl}">View Full Details →</a></p>
  ` : ''}
</body>
</html>
`.trim();

  return { text, html };
}