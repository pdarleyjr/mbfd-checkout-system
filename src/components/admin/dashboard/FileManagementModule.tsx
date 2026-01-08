import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye,
  Download,
  Trash2,
  Upload,
  Search,
  Filter,
  X,
  ChevronUp,
  ChevronDown,
  FileText,
  Package,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import type { FileMetadata, FileUploadProgress } from '../../../types';
import { API_BASE_URL } from '../../../lib/config';
import { cn } from '../../../lib/utils';

interface FileManagementModuleProps {
  adminPassword: string;
}

type SortColumn = 'filename' | 'uploadDate' | 'size' | 'fileType';
type SortDirection = 'asc' | 'desc';
type FileTypeFilter = 'All' | 'PDF' | 'Image' | 'Document';

export const FileManagementModule: React.FC<FileManagementModuleProps> = ({ adminPassword }) => {
  // State
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('All');
  const [sortColumn, setSortColumn] = useState<SortColumn>('uploadDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/files`, {
        headers: {
          'X-Admin-Password': adminPassword,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, [adminPassword]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Sorting handler
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort files
  const filteredAndSortedFiles = React.useMemo(() => {
    let result = [...files];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (file) =>
          file.filename.toLowerCase().includes(query) ||
          file.uploader.toLowerCase().includes(query)
      );
    }

    // Apply file type filter
    if (fileTypeFilter !== 'All') {
      result = result.filter((file) => file.fileType === fileTypeFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'filename':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'uploadDate':
          comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'fileType':
          comparison = a.fileType.localeCompare(b.fileType);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, searchQuery, fileTypeFilter, sortColumn, sortDirection]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedFileIds.size === filteredAndSortedFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredAndSortedFiles.map((f) => f.id)));
    }
  };

  const handleSelectFile = (fileId: string) => {
    const newSelection = new Set(selectedFileIds);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFileIds(newSelection);
  };

  // File operations
  const handleDownload = async (file: FileMetadata) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/${file.id}`, {
        headers: {
          'X-Admin-Password': adminPassword,
        },
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Password': adminPassword,
        },
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      await fetchFiles();
    } catch (err) {
      alert('Failed to delete file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleBatchDownload = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/batch-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({ fileIds: Array.from(selectedFileIds) }),
      });
      
      if (!response.ok) throw new Error('Batch download failed');
      
      const data = await response.json();
      window.open(data.zipUrl, '_blank');
    } catch (err) {
      alert('Failed to download files: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedFileIds.size} files?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedFileIds).map((id) =>
          fetch(`${API_BASE_URL}/files/${id}`, {
            method: 'DELETE',
            headers: {
              'X-Admin-Password': adminPassword,
            },
          })
        )
      );
      
      setSelectedFileIds(new Set());
      await fetchFiles();
    } catch (err) {
      alert('Failed to delete files: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // File upload
  const handleFileUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const newProgress: FileUploadProgress[] = files.map((file) => ({
      filename: file.name,
      progress: 0,
      status: 'pending',
    }));
    
    setUploadProgress((prev) => [...prev, ...newProgress]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.filename === file.name ? { ...p, status: 'uploading' } : p
          )
        );

        const response = await fetch(`${API_BASE_URL}/files/upload`, {
          method: 'POST',
          headers: {
            'X-Admin-Password': adminPassword,
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        setUploadProgress((prev) =>
          prev.map((p) =>
            p.filename === file.name
              ? { ...p, status: 'complete', progress: 100 }
              : p
          )
        );
      } catch (err) {
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.filename === file.name
              ? {
                  ...p,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : p
          )
        );
      }
    }

    // Refresh file list and clear progress after 2 seconds
    await fetchFiles();
    setTimeout(() => {
      setUploadProgress([]);
    }, 2000);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render sort icon
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">File Management</h2>
          <Package className="w-6 h-6 text-blue-600" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
        {/* Filters and Search */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files or uploaders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* File Type Filter */}
          <div className="flex gap-2">
            <Filter className="w-5 h-5 text-gray-500 self-center" />
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value as FileTypeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Types</option>
              <option value="PDF">PDF</option>
              <option value="Image">Image</option>
              <option value="Document">Document</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedFileIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedFileIds.size} file{selectedFileIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleBatchDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download as ZIP
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleBatchDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedFileIds(new Set())}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 transition-colors',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop files here, or click to select
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files);
                }
              }}
            />
          </div>

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadProgress.map((progress, index) => (
                <div key={index} className="bg-white rounded-lg p-2 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {progress.filename}
                    </span>
                    <span className={cn(
                      'text-xs font-medium',
                      progress.status === 'complete' ? 'text-green-600' :
                      progress.status === 'error' ? 'text-red-600' :
                      'text-blue-600'
                    )}>
                      {progress.status === 'complete' ? '✓ Complete' :
                       progress.status === 'error' ? '✗ Failed' :
                       'Uploading...'}
                    </span>
                  </div>
                  {progress.status !== 'complete' && progress.status !== 'error' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  )}
                  {progress.error && (
                    <p className="text-xs text-red-600 mt-1">{progress.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Files Table */}
        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
          {loading ? (
            // Skeleton loader
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to Load Files
              </h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchFiles} size="sm">
                Try Again
              </Button>
            </div>
          ) : filteredAndSortedFiles.length === 0 ? (
            // Empty state
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Files Found
              </h3>
              <p className="text-sm text-gray-600">
                {searchQuery || fileTypeFilter !== 'All'
                  ? 'Try adjusting your filters'
                  : 'Upload files to get started'}
              </p>
            </div>
          ) : (
            // Files table
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedFileIds.size === filteredAndSortedFiles.length &&
                        filteredAndSortedFiles.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('filename')}
                  >
                    Filename {renderSortIcon('filename')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('fileType')}
                  >
                    Type {renderSortIcon('fileType')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('size')}
                  >
                    Size {renderSortIcon('size')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Uploader
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('uploadDate')}
                  >
                    Upload Date {renderSortIcon('uploadDate')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Form
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      selectedFileIds.has(file.id) && 'bg-blue-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFileIds.has(file.id)}
                        onChange={() => handleSelectFile(file.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {file.filename}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          file.fileType === 'PDF'
                            ? 'bg-red-100 text-red-700'
                            : file.fileType === 'Image'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        )}
                      >
                        {file.fileType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{file.uploader}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(file.uploadDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {file.associatedForm || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {file.fileType === 'PDF' && (
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>

      {/* PDF Preview Modal */}
      {previewFile && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewFile(null)}
          title={`Preview: ${previewFile.filename}`}
          className="max-w-4xl"
        >
          <div className="h-[70vh]">
            <iframe
              src={previewFile.url}
              className="w-full h-full border-0 rounded"
              title={previewFile.filename}
            />
          </div>
        </Modal>
      )}
    </Card>
  );
};