import React, { useState } from 'react';
import { Check, X, AlertTriangle, WrenchIcon, Camera, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type { ItemStatus, CompartmentItem } from '../types';
import { WORKER_URL } from '../lib/config';

interface InspectionCardProps {
  item: string | CompartmentItem;
  compartmentId: string;
  status: ItemStatus;
  hasExistingDefect: boolean;
  onStatusChange: (status: ItemStatus, notes?: string, photoUrl?: string, fixedStatus?: 'fixed' | 'still_damaged', radioNumber?: string) => void;
}

export const InspectionCard: React.FC<InspectionCardProps> = ({
  item,
  status,
  hasExistingDefect,
  onStatusChange,
  compartmentId,
}) => {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [modalType, setModalType] = useState<'missing' | 'damaged'>('missing');
  const [notes, setNotes] = useState('');
  const [showDefectStatusModal, setShowDefectStatusModal] = useState(false);
  const [radioNumber, setRadioNumber] = useState('');
  
  // Photo upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  // Extract item data
  const itemName = typeof item === 'string' ? item : item.name;
  const expectedQuantity = typeof item === 'object' ? item.expectedQuantity : undefined;
  const itemNote = typeof item === 'object' ? item.note : undefined;
  const inputType = typeof item === 'object' ? item.inputType : 'checkbox';

  // Check if this is a radio item that needs special handling
  const isRadioItem = inputType === 'radio' || (typeof item === 'object' && item.name.toLowerCase().includes('radio'));

  const handleStatusClick = (newStatus: ItemStatus) => {
    if (newStatus === 'present') {
      // If there's an existing defect, show the fixed/still damaged modal
      if (hasExistingDefect) {
        setShowDefectStatusModal(true);
      } else {
        onStatusChange('present', undefined, undefined, undefined, radioNumber);
        setNotes('');
      }
    } else {
      setModalType(newStatus);
      setShowNotesModal(true);
    }
  };

  const handleDefectStatusChoice = (choice: 'fixed' | 'still_damaged' | 'no_change') => {
    if (choice === 'fixed') {
      onStatusChange('present', 'Item has been fixed and is now back in service', undefined, 'fixed');
    } else if (choice === 'still_damaged') {
      onStatusChange('damaged', 'Issue still present - previously reported', undefined, 'still_damaged');
    } else {
      // no_change - just mark as present without additional notification
      onStatusChange('present');
    }
    setShowDefectStatusModal(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP, or GIF)');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedPhotoUrl(null);
    setUploadError(null);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('inspector', 'Inspector'); // Will be filled from actual user context
      formData.append('apparatus', compartmentId.split('-')[0] || 'Unknown');
      formData.append('item', itemName);
      formData.append('reportedAt', new Date().toISOString());

      const response = await fetch(`${WORKER_URL}/api/uploads`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadedPhotoUrl(result.photoUrl);
      return result.photoUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setUploadError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitNotes = async () => {
    if (!notes.trim()) {
      alert('Please enter notes describing the issue');
      return;
    }

    // Upload photo if one is selected
    let photoUrl = uploadedPhotoUrl;
    if (selectedFile && !uploadedPhotoUrl) {
      photoUrl = await uploadPhoto();
      if (!photoUrl && uploadError) {
        // Photo upload failed but allow submission
        const proceed = confirm(
          `Photo upload failed: ${uploadError}\n\nDo you want to submit without the photo?`
        );
        if (!proceed) return;
      }
    }

    onStatusChange(modalType, notes, photoUrl || undefined, undefined, radioNumber);
    setShowNotesModal(false);
    setNotes('');
    handleRemovePhoto();
  };

  const handleCancel = () => {
    setShowNotesModal(false);
    setNotes('');
    handleRemovePhoto();
  };

  // Special rendering for radio items with text input
  if (isRadioItem) {
    return (
      <>
        <div
          className={cn(
            'p-4 rounded-2xl transition-all duration-200 border-2 shadow-sm space-y-3',
            {
              'bg-white border-gray-200 hover:border-gray-300': status === 'present' && !hasExistingDefect,
              'bg-green-50 border-green-500 shadow-green-100': status === 'present' && !hasExistingDefect,
              'bg-red-50 border-red-500 shadow-red-100': status === 'missing',
              'bg-yellow-50 border-yellow-500 shadow-yellow-100': status === 'damaged',
              'bg-orange-50 border-orange-500 shadow-orange-100': hasExistingDefect,
            }
          )}
        >
          {/* Item Name and Status Buttons Row */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="font-semibold text-gray-900 text-base leading-tight">
                {itemName}
              </p>
              {itemNote && (
                <p className="text-xs text-gray-500 mt-1">{itemNote}</p>
              )}
              {hasExistingDefect && (
                <span className="inline-block mt-2 px-3  py-1 bg-orange-600 text-white text-xs font-bold rounded-full shadow-sm">
                  ⚠️ Previously Reported
                </span>
              )}
            </div>

            {/* Status Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleStatusClick('present')}
                className={cn(
                  'flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 active:scale-95',
                  status === 'present'
                    ? 'bg-green-500 text-white shadow-lg scale-105 shadow-green-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300'
                )}
                title="Present/Working"
              >
                <Check className="w-7 h-7 stroke-[3]" />
              </button>

              <button
                onClick={() => handleStatusClick('missing')}
                className={cn(
                  'flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 active:scale-95',
                  status === 'missing'
                    ? 'bg-red-500 text-white shadow-lg scale-105 shadow-red-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300'
                )}
                title="Missing"
              >
                <X className="w-7 h-7 stroke-[3]" />
              </button>

              <button
                onClick={() => handleStatusClick('damaged')}
                className={cn(
                  'flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 active:scale-95',
                  status === 'damaged'
                    ? 'bg-yellow-500 text-white shadow-lg scale-105 shadow-yellow-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300'
                )}
                title="Damaged"
              >
                <AlertTriangle className="w-7 h-7 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Radio Number Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Radio Number (Optional):
            </label>
            <input
              type="text"
              value={radioNumber}
              onChange={(e) => setRadioNumber(e.target.value)}
              placeholder="Enter radio #"
              className="w-full px-3 py-2 text-sm rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none bg-white text-gray-900 font-medium"
            />
          </div>
        </div>

        {/* Include the modals for radio items too */}
        <Modal
          isOpen={showDefectStatusModal}
          onClose={() => setShowDefectStatusModal(false)}
          title={`Previously Reported Issue: "${itemName}"`}
        >
          <div className="space-y-4">
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
              <p className="text-sm text-orange-900 font-semibold mb-2">
                ⚠️ This item was previously reported as defective.
              </p>
              <p className="text-xs text-orange-800">
                Please select the current status of this item:
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleDefectStatusChoice('fixed')}
                className="w-full h-14 text-base font-bold rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 flex items-center justify-center gap-2"
              >
                <WrenchIcon className="w-5 h-5" />
                Fixed / Back in Service
              </Button>

              <Button
                onClick={() => handleDefectStatusChoice('still_damaged')}
                variant="secondary"
                className="w-full h-14 text-base font-bold rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-900 flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Still Damaged / Missing
              </Button>

              <Button
                onClick={() => handleDefectStatusChoice('no_change')}
                variant="secondary"
                className="w-full h-12 text-sm font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Skip - No Change
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showNotesModal}
          onClose={handleCancel}
          title={`Item ${modalType === 'missing' ? 'Missing' : 'Damaged'}: "${itemName}"`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100">
              {modalType === 'missing' ? (
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-600" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-600">
                  {modalType === 'missing' ? 'Missing Equipment' : 'Damaged Equipment'}
                </p>
                <p className="text-xs text-gray-500">Please provide detailed information</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-400 focus:border-blue-500 outline-none transition-all resize-none text-base"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide as much detail as possible to help with resolution
              </p>
            </div>

            {isRadioItem && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Radio Number (if known)
                </label>
                <input
                  type="text"
                  value={radioNumber}
                  onChange={(e) => setRadioNumber(e.target.value)}
                  placeholder="Enter radio # if known"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none bg-white text-gray-900"
                />
              </div>
            )}

            {/* Photo Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📸 Photo (Optional)
              </label>
              
              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRemovePhoto}
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                    >
                      Remove Photo
                    </Button>
                    {!uploadedPhotoUrl && (
                      <Button
                        onClick={uploadPhoto}
                        disabled={isUploading}
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Now
                          </>
                        )}
                      </Button>
                    )}
                    {uploadedPhotoUrl && (
                      <span className="flex-1 text-sm text-green-600 font-semibold flex items-center justify-center gap-1">
                        ✓ Uploaded
                      </span>
                    )}
                  </div>
                  {uploadError && (
                    <p className="text-xs text-red-600">{uploadError}</p>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="photo-upload-radio"
                  />
                  <label
                    htmlFor="photo-upload-radio"
                    className="flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Camera className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700">Take Photo or Upload</p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP, or GIF (max 10MB)</p>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSubmitNotes}
                className="flex-1 h-12 text-base font-bold rounded-xl"
                disabled={isUploading}
              >
                Submit Report
              </Button>
              <Button
                onClick={handleCancel}
                variant="secondary"
                className="flex-1 h-12 text-base font-bold rounded-xl"
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl transition-all duration-200 border-2 shadow-sm',
          {
            'bg-white border-gray-200 hover:border-gray-300': status === 'present' && !hasExistingDefect,
            'bg-green-50 border-green-500 shadow-green-100': status === 'present' && !hasExistingDefect,
            'bg-red-50 border-red-500 shadow-red-100': status === 'missing',
            'bg-yellow-50 border-yellow-500 shadow-yellow-100': status === 'damaged',
            'bg-orange-50 border-orange-500 shadow-orange-100': hasExistingDefect,
          }
        )}
      >
        {/* Item Name */}
        <div className="flex-1 min-w-0 pr-3">
          <p className="font-semibold text-gray-900 text-base leading-tight">
            {itemName}
            {expectedQuantity && (
              <span className="text-sm text-gray-600 ml-1">({expectedQuantity})</span>
            )}
          </p>
          {itemNote && (
            <p className="text-xs text-gray-500 mt-1">{itemNote}</p>
          )}
          {hasExistingDefect && (
            <span className="inline-block mt-2 px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full shadow-sm">
              ⚠️ Previously Reported
            </span>
          )}
        </div>

        {/* Status Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          {/* Present Button */}
          <button
            onClick={() => handleStatusClick('present')}
            className={cn(
              'flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 active:scale-95',
              status === 'present'
                ? 'bg-green-500 text-white shadow-lg scale-105 shadow-green-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300'
            )}
            title="Present/Working"
          >
            <Check className="w-7 h-7 stroke-[3]" />
          </button>

          {/* Missing Button */}
          <button
            onClick={() => handleStatusClick('missing')}
            className={cn(
              'flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 active:scale-95',
              status === 'missing'
                ? 'bg-red-500 text-white shadow-lg scale-105 shadow-red-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300'
            )}
            title="Missing"
          >
            <X className="w-7 h-7 stroke-[3]" />
          </button>

          {/* Damaged Button */}
          <button
            onClick={() => handleStatusClick('damaged')}
            className={cn(
              'flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 active:scale-95',
              status === 'damaged'
                ? 'bg-yellow-500 text-white shadow-lg scale-105 shadow-yellow-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300'
            )}
            title="Damaged"
          >
            <AlertTriangle className="w-7 h-7 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Defect Status Modal (for previously reported items) */}
      <Modal
        isOpen={showDefectStatusModal}
        onClose={() => setShowDefectStatusModal(false)}
        title={`Previously Reported Issue: "${itemName}"`}
      >
        <div className="space-y-4">
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
            <p className="text-sm text-orange-900 font-semibold mb-2">
              ⚠️ This item was previously reported as defective.
            </p>
            <p className="text-xs text-orange-800">
              Please select the current status of this item:
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => handleDefectStatusChoice('fixed')}
              className="w-full h-14 text-base font-bold rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 flex items-center justify-center gap-2"
            >
              <WrenchIcon className="w-5 h-5" />
              Fixed / Back in Service
            </Button>

            <Button
              onClick={() => handleDefectStatusChoice('still_damaged')}
              variant="secondary"
              className="w-full h-14 text-base font-bold rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-900 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              Still Damaged / Missing
            </Button>

            <Button
              onClick={() => handleDefectStatusChoice('no_change')}
              variant="secondary"
              className="w-full h-12 text-sm font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Skip - No Change
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notes Modal */}
      <Modal
        isOpen={showNotesModal}
        onClose={handleCancel}
        title={`Item ${modalType === 'missing' ? 'Missing' : 'Damaged'}: "${itemName}"`}
      >
        <div className="space-y-4">
          {/* Issue Type Badge */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100">
            {modalType === 'missing' ? (
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <X className="w-6 h-6 text-red-600" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-600">
                {modalType === 'missing' ? 'Missing Equipment' : 'Damaged Equipment'}
              </p>
              <p className="text-xs text-gray-500">Please provide detailed information</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-400 focus:border-blue-500 outline-none transition-all resize-none text-base"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide as much detail as possible to help with resolution
            </p>
          </div>

          {/* Photo Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📸 Photo (Optional)
            </label>
            
            {previewUrl ? (
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleRemovePhoto}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    Remove Photo
                  </Button>
                  {!uploadedPhotoUrl && (
                    <Button
                      onClick={uploadPhoto}
                      disabled={isUploading}
                      size="sm"
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Now
                        </>
                      )}
                    </Button>
                  )}
                  {uploadedPhotoUrl && (
                    <span className="flex-1 text-sm text-green-600 font-semibold flex items-center justify-center gap-1">
                      ✓ Uploaded
                    </span>
                  )}
                </div>
                {uploadError && (
                  <p className="text-xs text-red-600">{uploadError}</p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Camera className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Take Photo or Upload</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP, or GIF (max 10MB)</p>
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmitNotes}
              className="flex-1 h-12 text-base font-bold rounded-xl"
              disabled={isUploading}
            >
              Submit Report
            </Button>
            <Button
              onClick={handleCancel}
              variant="secondary"
              className="flex-1 h-12 text-base font-bold rounded-xl"
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};