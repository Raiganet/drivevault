'use client';
import { useState, useRef } from 'react';
import { FILE_CATEGORIES, MAX_FILE_SIZE } from '@/utils/constants';
import { formatBytes, showToast } from '@/utils/helpers';

export default function Upload({ onUploadSuccess, onNavigate }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadCustomName, setUploadCustomName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    if (files.length === 0) return;
    
    const invalidFiles = files.filter(f => f.size > MAX_FILE_SIZE);
    if (invalidFiles.length > 0) {
      showToast(`${invalidFiles.length} file(s) exceed 10MB limit`, 'error');
      return;
    }
    
    setSelectedFiles(files);
    showToast(`${files.length} file(s) selected`, 'info');
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      showToast('Please select at least one file!', 'error');
      return;
    }

    if (!uploadCategory) {
      showToast('Please select file type!', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    let uploadedCount = 0;

    const uploadPromises = selectedFiles.map((file, index) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);
      formData.append('description', uploadDescription);
      formData.append('customName', uploadCustomName || file.name);

      return fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        setUploadProgress(((index + 1) / selectedFiles.length) * 100);
        if (data.success) {
          uploadedCount++;
          return true;
        } else {
          showToast(`Failed to upload ${file.name}: ${data.message}`, 'error');
          return false;
        }
      })
      .catch(err => {
        showToast(`Error uploading ${file.name}: ${err.message}`, 'error');
        return false;
      });
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
    
    if (uploadedCount > 0) {
      showToast(`Successfully uploaded ${uploadedCount} file(s)!`, 'success');
      setSelectedFiles([]);
      setUploadCategory('');
      setUploadCustomName('');
      setUploadDescription('');
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onUploadSuccess) onUploadSuccess();
      setTimeout(() => onNavigate && onNavigate('documents'), 1000);
    } else {
      showToast('No files were uploaded', 'warning');
    }
  };

  return (
    <div className="fade-in max-w-4xl mx-auto animate-slide-up">
      <div className="card-elevated p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-cloud-arrow-up text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">Upload Documents</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload files to your secure cloud storage
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleUpload} className="space-y-6">
          {/* Drop Zone */}
          <div 
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload files"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-cloud-arrow-up text-4xl text-primary"></i>
              </div>
              <p className="text-lg font-semibold mb-2">
                {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                PDF, JPG, PNG, DOC, XLS, CSV (Max 10MB each)
              </p>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.rar,.zip" 
                multiple
                onChange={handleFileSelect}
              />
              <button 
                type="button"
                className="btn-primary"
              >
                <i className="fa-solid fa-file-import mr-2"></i>
                Choose Files
              </button>
            </div>
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-check-circle text-success"></i>
                  {selectedFiles.length} file(s) selected
                </h3>
                <button 
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-sm text-danger hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-file text-primary"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-danger transition"
                      aria-label="Remove file"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Uploading...</span>
                <span className="font-semibold">{uploadProgress.toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                File Type <span className="text-danger">*</span>
              </label>
              <select 
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="select"
                required
              >
                <option value="">Select type...</option>
                {FILE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                File Name <span className="text-xs text-gray-400">(Optional)</span>
              </label>
              <input 
                type="text" 
                value={uploadCustomName}
                onChange={(e) => setUploadCustomName(e.target.value)}
                placeholder="Custom name"
                className="input"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <textarea 
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Add notes about this file..."
              rows="3"
              className="input resize-none"
            ></textarea>
          </div>
          
          <button 
            type="submit" 
            disabled={isUploading || selectedFiles.length === 0}
            className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Uploading... {uploadProgress.toFixed(0)}%
              </>
            ) : (
              <>
                <i className="fa-solid fa-upload"></i>
                Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : 'Documents'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
