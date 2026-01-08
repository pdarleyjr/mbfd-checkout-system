import React, { useState, useEffect } from 'react';
import { Mail, Send, Save, Paperclip, X, Plus, Users } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import type { EmailRecipient, EmailTemplate, SentEmail, EmailAttachment } from '../../../types';
import { API_BASE_URL } from '../../../lib/config';
import { cn } from '../../../lib/utils';

interface IntegratedEmailModuleProps {
  adminPassword: string;
}

type ActiveTab = 'compose' | 'drafts' | 'sent' | 'templates';

export const IntegratedEmailModule: React.FC<IntegratedEmailModuleProps> = ({ adminPassword }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('compose');
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [ccField, setCcField] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  
  // Fetch templates
  useEffect(() => {
    if (activeTab === 'templates') {
      fetch(`${API_BASE_URL}/email/templates`, {
        headers: { 'X-Admin-Password': adminPassword }
      })
        .then(res => res.json())
        .then(data => setTemplates(data.templates || []))
        .catch(console.error);
    }
  }, [activeTab, adminPassword]);

  // Fetch sent emails
  useEffect(() => {
    if (activeTab === 'sent') {
      fetch(`${API_BASE_URL}/email/history`, {
        headers: { 'X-Admin-Password': adminPassword }
      })
        .then(res => res.json())
        .then(data => setSentEmails(data.emails || []))
        .catch(console.error);
    }
  }, [activeTab, adminPassword]);

  const handleSendEmail = async () => {
    if (!subject || !body || recipients.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({
          recipients,
          cc: ccField.split(',').filter(Boolean),
          subject,
          body,
          attachments,
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');
      
      alert('Email sent successfully!');
      setSubject('');
      setBody('');
      setRecipients([]);
      setAttachments([]);
    } catch (error) {
      alert('Failed to send email: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = () => {
    if (newRecipientEmail && newRecipientEmail.includes('@')) {
      setRecipients([...recipients, { email: newRecipientEmail, type: 'individual' }]);
      setNewRecipientEmail('');
      setShowAddRecipient(false);
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleLoadTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setBody(template.body);
    setActiveTab('compose');
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Email Center</h2>
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
      </CardHeader>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {(['compose', 'drafts', 'sent', 'templates'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium text-sm transition-colors capitalize whitespace-nowrap',
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="space-y-4">
            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <span>{recipient.email}</span>
                    <button onClick={() => handleRemoveRecipient(index)} className="hover:bg-blue-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowAddRecipient(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Individual
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setRecipients([...recipients, { email: 'all-submitters@group', type: 'group', name: 'All Submitters' }])}>
                  <Users className="w-4 h-4 mr-1" />
                  Add Group
                </Button>
              </div>
            </div>

            {/* CC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CC (comma-separated)</label>
              <input
                type="text"
                value={ccField}
                onChange={(e) => setCcField(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Load Template</label>
              <select
                onChange={(e) => {
                  const template = templates.find(t => t.id === e.target.value);
                  if (template) handleLoadTemplate(template);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email subject"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email message body..."
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
              {attachments.length > 0 && (
                <div className="mb-2 space-y-1">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{att.filename}</span>
                      <button onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}>
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button size="sm" variant="secondary">
                <Paperclip className="w-4 h-4 mr-2" />
                Add Attachment
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="primary" onClick={handleSendEmail} disabled={loading}>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button variant="secondary" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        )}

        {/* Sent Tab */}
        {activeTab === 'sent' && (
          <div className="space-y-2">
            {sentEmails.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sent emails</p>
            ) : (
              sentEmails.map((email) => (
                <div key={email.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{email.subject}</h3>
                      <p className="text-sm text-gray-600 mt-1">To: {email.recipients.join(', ')}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(email.sentAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      email.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {email.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.category}</p>
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{template.subject}</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => handleLoadTemplate(template)}>
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="text-center py-8 text-gray-500">
            Drafts feature coming soon
          </div>
        )}
      </CardContent>

      {/* Add Recipient Modal */}
      {showAddRecipient && (
        <Modal isOpen={true} onClose={() => setShowAddRecipient(false)} title="Add Recipient">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={newRecipientEmail}
                onChange={(e) => setNewRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowAddRecipient(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAddRecipient}>Add</Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};