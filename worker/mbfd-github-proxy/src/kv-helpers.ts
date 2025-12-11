/**
 * Cloudflare Workers KV Helper Functions
 * 
 * This module provides helper functions for managing email configuration,
 * notification queues, and rate limiting using Cloudflare Workers KV
 */

export interface EmailConfig {
  email_mode: 'daily_digest' | 'per_submission' | 'hybrid';
  daily_email_hard_cap: number;
  digest_send_time: string;
  digest_timezone: string;
  recipients: string[];
  enable_immediate_for_critical: boolean;
  email_subject_template: string;
  enabled: boolean;
}

export interface PendingNotification {
  timestamp: string;
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
  hasCriticalDefects: boolean;
  githubIssueUrl?: string;
}

interface Env {
  MBFD_CONFIG: KVNamespace;
}

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  email_mode: 'daily_digest',
  daily_email_hard_cap: 250,
  digest_send_time: '12:00',
  digest_timezone: 'America/Los_Angeles',
  recipients: ['admin@mbfd.org'],
  enable_immediate_for_critical: true,
  email_subject_template: 'MBFD Daily Inspection Summary - {date}',
  enabled: true
};

export async function getEmailConfig(env: Env): Promise<EmailConfig> {
  const config = await env.MBFD_CONFIG.get<EmailConfig>('email_config', 'json');
  return config || DEFAULT_EMAIL_CONFIG;
}

export async function updateEmailConfig(
  env: Env, 
  config: Partial<EmailConfig>
): Promise<EmailConfig> {
  const current = await getEmailConfig(env);
  const updated = { ...current, ...config };
  await env.MBFD_CONFIG.put('email_config', JSON.stringify(updated));
  return updated;
}

export async function queueNotification(
  env: Env,
  notification: PendingNotification
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `pending_notifications:${today}`;
  
  const existing = await env.MBFD_CONFIG.get<PendingNotification[]>(key, 'json');
  const updated = existing ? [...existing, notification] : [notification];
  
  // Store with 48-hour TTL (gives buffer for digest processing)
  await env.MBFD_CONFIG.put(key, JSON.stringify(updated), {
    expirationTtl: 172800 // 48 hours
  });
}

export async function getPendingNotifications(
  env: Env,
  date?: string
): Promise<PendingNotification[]> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const key = `pending_notifications:${targetDate}`;
  const notifications = await env.MBFD_CONFIG.get<PendingNotification[]>(key, 'json');
  return notifications || [];
}

export async function clearPendingNotifications(
  env: Env,
  date?: string
): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const key = `pending_notifications:${targetDate}`;
  await env.MBFD_CONFIG.delete(key);
}

export async function incrementEmailCounter(env: Env): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const key = `email_count:${today}`;
  
  const current = await env.MBFD_CONFIG.get(key);
  const count = current ? parseInt(current) + 1 : 1;
  
  // Set with 24-hour TTL
  await env.MBFD_CONFIG.put(key, count.toString(), {
    expirationTtl: 86400 // 24 hours
  });
  
  return count;
}

export async function getEmailCounter(env: Env): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const key = `email_count:${today}`;
  const count = await env.MBFD_CONFIG.get(key);
  return count ? parseInt(count) : 0;
}

export async function canSendEmail(env: Env): Promise<boolean> {
  const config = await getEmailConfig(env);
  if (!config.enabled) return false;
  
  const count = await getEmailCounter(env);
  return count < config.daily_email_hard_cap;
}