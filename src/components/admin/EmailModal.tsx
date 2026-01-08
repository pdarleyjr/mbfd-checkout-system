import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mail } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';
import toast from 'react-hot-toast';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedForms: any[];
  onSuccess: () => void;
}

export function EmailModal({ isOpen, onClose, selectedForms, onSuccess }: EmailModalProps) {
  const [sending, setSending] = useState(false);
  const [sendToInspectors, setSendToInspectors] = useState(false);
  const [sendToAdmins, setSendToAdmins] = useState(true);
  const [customRecipients, setCustomRecipients] = useState('');
  const [subject, setSubject] = useState(`ICS-212 Forms - ${selectedForms.length} Inspection${selectedForms.length > 1 ? 's' : ''}`);
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    // Validate recipients
    const customEmails = customRecipients
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email && email.includes('@'));

    if (!sendToInspectors && !sendToAdmins && customEmails.length === 0) {
      toast.error('Please specify at least one recipient');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ics212/forms/batch-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formIds: selectedForms.map((f) => f.form_id),
          recipientOptions: {
            sendToInspectors,
            sendToAdmins,
            customRecipients: customEmails,
          },
          emailTemplate: {
            subject,
            body: message || undefined, // Use default template if empty
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success(`Email sent successfully to ${data.recipients} recipient(s)!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Email send error:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog static open={isOpen} onClose={onClose} className="relative z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-blue-600" />
                  <Dialog.Title className="text-xl font-semibold">
                    Email ICS-212 Forms
                  </Dialog.Title>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-4">
                {/* Forms Summary */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedForms.length} form{selectedForms.length > 1 ? 's' : ''} will be emailed as PDF attachments
                  </p>
                </div>

                {/* Recipients */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recipients
                  </label>

                  {/* Send to Inspectors */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sendToInspectors}
                      onChange={(e) => setSendToInspectors(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Send to Inspectors (if email available)
                    </span>
                  </label>

                  {/* Send to Admins */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sendToAdmins}
                      onChange={(e) => setSendToAdmins(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Send to Admins
                    </span>
                  </label>

                  {/* Custom Recipients */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Recipients (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={customRecipients}
                      onChange={(e) => setCustomRecipients(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Message (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Leave blank to use default template"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    If left blank, a professional template with form details will be used
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <Send className="w-4 h-4 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
