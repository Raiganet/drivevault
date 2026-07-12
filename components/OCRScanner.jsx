'use client';
import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { showToast } from '@/utils/helpers';

export default function OCRScanner({ onOCRComplete, onNavigate }) {
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setExtractedText('');
        setConfidence(0);
      };
      reader.readAsDataURL(file);
      showToast('Gambar berhasil diupload', 'success');
    } else {
      showToast('Pilih file gambar (JPG, PNG)', 'error');
    }
  };

  const extractText = async () => {
    if (!image) {
      showToast('Upload gambar terlebih dahulu', 'error');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    showToast('Sedang mengekstrak text...', 'info');

    try {
      const result = await Tesseract.recognize(
        image,
        'ind+eng', // Indonesian + English
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
          errorHandler: (err) => {
            console.error('OCR Error:', err);
          }
        }
      );

      setExtractedText(result.data.text);
      setConfidence(result.data.confidence);
      showToast('Text berhasil diekstrak!', 'success');
      
      if (onOCRComplete) {
        onOCRComplete(result.data.text);
      }
    } catch (error) {
      console.error('OCR Error:', error);
      showToast('Gagal mengekstrak text: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!extractedText) return;

    try {
      await navigator.clipboard.writeText(extractedText);
      showToast('Text berhasil dicopy!', 'success');
    } catch (error) {
      // Fallback untuk browser lama
      const textArea = document.createElement('textarea');
      textArea.value = extractedText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Text berhasil dicopy!', 'success');
    }
  };

  const downloadAsText = () => {
    if (!extractedText) return;

    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr_text_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('File text berhasil didownload!', 'success');
  };

  const clearAll = () => {
    setImage(null);
    setExtractedText('');
    setProgress(0);
    setConfidence(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fade-in max-w-6xl mx-auto animate-slide-up">
      <div className="card-elevated p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-eye text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">OCR Scanner</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Extract text dari gambar/foto
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-6">
          <div 
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-image text-4xl text-primary"></i>
              </div>
              <p className="text-lg font-semibold mb-2">Upload Gambar</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                JPG, PNG (Max 10MB)
              </p>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <button className="btn-primary">
                <i className="fa-solid fa-file-import mr-2"></i>
                Pilih File
              </button>
            </div>
          </div>
        </div>

        {/* Image Preview */}
        {image && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <i className="fa-solid fa-image text-primary"></i>
                Preview Gambar
              </h3>
              <button
                onClick={clearAll}
                className="text-sm text-danger hover:underline"
              >
                Hapus
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-slate-700">
              <img 
                src={image} 
                alt="Upload preview" 
                className="w-full max-h-96 object-contain bg-gray-50 dark:bg-slate-900"
              />
            </div>
          </div>
        )}

        {/* Extract Button */}
        {image && !extractedText && (
          <button
            onClick={extractText}
            disabled={isProcessing}
            className="btn-primary w-full py-3.5 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                Processing... {progress > 0 && `(${progress}%)`}
              </>
            ) : (
              <>
                <i className="fa-solid fa-eye mr-2"></i>
                Extract Text dari Gambar
              </>
            )}
          </button>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Processing...</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Extracted Text Result */}
        {extractedText && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-file-lines text-success"></i>
                  Text Hasil OCR
                </h3>
                {confidence > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence: {confidence.toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="btn-secondary text-sm"
                  title="Copy to clipboard"
                >
                  <i className="fa-solid fa-copy mr-2"></i>
                  Copy
                </button>
                <button
                  onClick={downloadAsText}
                  className="btn-secondary text-sm"
                  title="Download as TXT"
                >
                  <i className="fa-solid fa-download mr-2"></i>
                  Download
                </button>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="w-full h-64 p-4 font-mono text-sm bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:border-primary"
                placeholder="Extracted text will appear here..."
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <i className="fa-solid fa-info-circle"></i>
              Text bisa diedit sebelum dicopy atau didownload
            </p>
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <i className="fa-solid fa-lightbulb mt-0.5"></i>
            <span>
              <strong>Tips:</strong> Untuk hasil terbaik, gunakan gambar dengan text yang jelas, 
              pencahayaan baik, dan resolusi tinggi. Mendukung Bahasa Indonesia dan Inggris.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}