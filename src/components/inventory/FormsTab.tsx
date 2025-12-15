import React, { useState, useEffect } from 'react';
import { List, Plus, FileUp, Edit2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { WORKER_URL } from '../../lib/config';
import FormEditor from './FormEditor';
import ImportFormModal from './ImportFormModal';

interface FormTemplate {
  id: string;
  name: string;
  apparatus_list: string[];
  modified_at: string;
}

interface FormsTabProps {
  adminPassword: string;
}

export const FormsTab: React.FC<FormsTabProps> = ({ adminPassword }) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newApparatusName, setNewApparatusName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${WORKER_URL}/api/forms`, {
        headers: { 'X-Admin-Password': adminPassword },
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddApparatus = async () => {
    if (!newApparatusName.trim() || !selectedTemplateId) {
      alert('Please enter apparatus name and select a template');
      return;
    }

    try {
      const res = await fetch(`${WORKER_URL}/api/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({
          apparatus: newApparatusName.trim(),
          templateId: selectedTemplateId,
        }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      
      setShowAddModal(false);
      setNewApparatusName('');
      setSelectedTemplateId('');
      fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add apparatus');
    }
  };

  const handleImportComplete = async (formJson: any, apparatusName: string, templateName: string) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({
          apparatus: apparatusName,
          templateName: templateName,
          formJson: formJson,
        }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      
      setShowImportModal(false);
      fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save imported form');
    }
  };

  if (loading) {
    return <div className="p-4">Loading forms...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <List className="w-6 h-6" />
          Inventory Forms Management
        </h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowImportModal(true)} className="flex items-center gap-2">
            <FileUp className="w-4 h-4" />
            Import from PDF
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Apparatus
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Template Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Apparatus
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Modified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No forms found. Import from PDF or add an apparatus to get started.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {template.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {template.apparatus_list.map((app, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(template.modified_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setEditingTemplateId(template.id)}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Apparatus Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setNewApparatusName('');
            setSelectedTemplateId('');
          }}
          title="Add New Apparatus"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apparatus Name
              </label>
              <input
                type="text"
                value={newApparatusName}
                onChange={(e) => setNewApparatusName(e.target.value)}
                placeholder="e.g., Engine 5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Use Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewApparatusName('');
                  setSelectedTemplateId('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddApparatus}>Add Apparatus</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportFormModal
          adminPassword={adminPassword}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Form Editor */}
      {editingTemplateId && (
        <FormEditor
          templateId={editingTemplateId}
          adminPassword={adminPassword}
          onClose={() => setEditingTemplateId(null)}
          onSaved={() => {
            setEditingTemplateId(null);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
};

export default FormsTab;
