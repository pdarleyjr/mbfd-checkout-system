import React, { useState } from 'react';
import { Upload, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { WORKER_URL } from '../../lib/config';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ImportFormModalProps {
  adminPassword: string;
  onClose: () => void;
  onImportComplete: (formJson: any, apparatusName: string, templateName: string) => void;
}

export const ImportFormModal: React.FC<ImportFormModalProps> = ({
  adminPassword,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [generatedJson, setGeneratedJson] = useState<any>(null);
  const [apparatusName, setApparatusName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }
    
    return fullText;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setProcessing(true);

    try {
      const text = await extractPdfText(file);
      setExtractedText(text);
      setStep('processing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract PDF text');
    } finally {
      setProcessing(false);
    }
  };

  const handleConvertToForm = async () => {
    if (!extractedText) return;

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${WORKER_URL}/api/forms/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({
          text: extractedText,
          fileName: selectedFile?.name || 'inventory.pdf',
        }),
      });

      if (res.status === 501) {
        setError('AI feature is not configured on the server. Please contact the administrator.');
        return;
      }

      if (res.status === 429) {
        setError('Daily AI quota exceeded. Please try again tomorrow.');
        return;
      }

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setGeneratedJson(data.formJson);
      setTemplateName(data.suggestedName || 'Imported Form');
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to form');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveForm = () => {
    if (!generatedJson || !apparatusName.trim() || !templateName.trim()) {
      setError('Please enter both apparatus name and template name');
      return;
    }

    onImportComplete(generatedJson, apparatusName.trim(), templateName.trim());
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">
          Select a PDF inventory sheet to import
        </p>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFileSelect(e)}
          className="hidden"
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload">
          <span className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors">
            Choose PDF File
          </span>
        </label>
        {selectedFile && (
          <p className="mt-4 text-sm text-gray-600">
            Selected: {selectedFile.name}
          </p>
        )}
      </div>

      {processing && (
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Loader className="w-5 h-5 animate-spin" />
          Extracting text from PDF...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600 mb-4">
        <CheckCircle className="w-5 h-5" />
        PDF text extracted successfully
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Extracted Text (editable)
        </label>
        <textarea
          value={extractedText}
          onChange={(e) => setExtractedText(e.target.value)}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="mt-2 text-sm text-gray-500">
          Review and edit the extracted text if needed before converting to a form.
        </p>
      </div>

      {processing && (
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Loader className="w-5 h-5 animate-spin" />
          Converting to form with AI...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose} disabled={processing}>
          Cancel
        </Button>
        <Button onClick={handleConvertToForm} disabled={processing || !extractedText.trim()}>
          Convert to Form
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600 mb-4">
        <CheckCircle className="w-5 h-5" />
        Form generated successfully
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Template Name
        </label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="e.g., Engine, Ladder, Rescue"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apparatus Name
        </label>
        <input
          type="text"
          value={apparatusName}
          onChange={(e) => setApparatusName(e.target.value)}
          placeholder="e.g., Engine 1, Rescue 5"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Generated Form JSON (preview)
        </label>
        <pre className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg overflow-auto max-h-64 text-xs font-mono">
          {JSON.stringify(generatedJson, null, 2)}
        </pre>
        <p className="mt-2 text-sm text-gray-500">
          {generatedJson?.compartments?.length || 0} compartments detected
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSaveForm} 
          disabled={!apparatusName.trim() || !templateName.trim()}
        >
          Save Form
        </Button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title="Import Form from PDF">
      <div className="min-h-[400px]">
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'review' && renderReviewStep()}
      </div>
    </Modal>
  );
};

export default ImportFormModal;
