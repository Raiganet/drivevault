'use client';
import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { showToast } from '@/utils/helpers';

export default function PDFTools({ onToolComplete, onNavigate }) {
  const [activeTool, setActiveTool] = useState('merge');
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitPages, setSplitPages] = useState('');
  const [compressionLevel, setCompressionLevel] = useState('medium');

  const handleFileUpload = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      showToast('Pilih file PDF saja', 'error');
      return;
    }

    if (activeTool === 'merge' && files.length + pdfFiles.length > 10) {
      showToast('Maksimal 10 file untuk merge', 'warning');
      return;
    }

    setFiles(prev => [...prev, ...pdfFiles]);
    showToast(`${pdfFiles.length} PDF ditambahkan`, 'success');
  }, [activeTool, files.length]);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index, direction) => {
    if (
      (direction === -1 && index === 0) ||
      (direction === 1 && index === files.length - 1)
    ) return;

    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[index + direction];
    newFiles[index + direction] = temp;
    setFiles(newFiles);
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      showToast('Minimal 2 PDF untuk digabung', 'error');
      return;
    }

    setIsProcessing(true);
    showToast('Menggabungkan PDF...', 'info');

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([blob], `merged_${Date.now()}.pdf`, { type: 'application/pdf' });

      await uploadToDriveVault(pdfFile, `Merged PDF (${files.length} files)`);
    } catch (error) {
      console.error('Merge error:', error);
      showToast('Error menggabungkan PDF: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const splitPDF = async () => {
    if (files.length !== 1) {
      showToast('Pilih 1 PDF untuk dipisah', 'error');
      return;
    }

    if (!splitPages.trim()) {
      showToast('Masukkan halaman yang ingin dipisah (contoh: 1,2,3 atau 1-5)', 'error');
      return;
    }

    setIsProcessing(true);
    showToast('Memisahkan PDF...', 'info');

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      const pagesToExtract = parsePageRange(splitPages, totalPages);
      
      if (pagesToExtract.length === 0) {
        showToast('Halaman tidak valid', 'error');
        setIsProcessing(false);
        return;
      }

      const splitPdf = await PDFDocument.create();
      const copiedPages = await splitPdf.copyPages(pdf, pagesToExtract.map(p => p - 1));
      copiedPages.forEach((page) => splitPdf.addPage(page));

      const pdfBytes = await splitPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([blob], `split_${Date.now()}.pdf`, { type: 'application/pdf' });

      await uploadToDriveVault(pdfFile, `Split PDF (${splitPages})`);
    } catch (error) {
      console.error('Split error:', error);
      showToast('Error memisahkan PDF: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const compressPDF = async () => {
    if (files.length !== 1) {
      showToast('Pilih 1 PDF untuk dikompres', 'error');
      return;
    }

    setIsProcessing(true);
    showToast('Mengkompres PDF...', 'info');

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const originalSize = files[0].size;

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const useObjectStreams = compressionLevel !== 'low';
      const compressStreams = compressionLevel === 'high';

      const pdfBytes = await pdfDoc.save({
        useObjectStreams,
        addDefaultPage: false,
        objectsPerTick: compressStreams ? 50 : undefined,
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([blob], `compressed_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      const compressedSize = pdfFile.size;
      const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

      await uploadToDriveVault(pdfFile, `Compressed PDF (-${reduction}%)`);
      showToast(`Ukuran berkurang ${reduction}%`, 'success');
    } catch (error) {
      console.error('Compress error:', error);
      showToast('Error mengkompres PDF: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const parsePageRange = (rangeStr, totalPages) => {
    const pages = new Set();
    const parts = rangeStr.split(',').map(s => s.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= totalPages) pages.add(i);
          }
        }
      } else {
        const pageNum = Number(part);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const uploadToDriveVault = async (file, description) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'PDF');
      formData.append('description', description);
      formData.append('customName', file.name);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        showToast(`${description} berhasil dibuat dan diupload!`, 'success');
        setFiles([]);
        setSplitPages('');
        if (onToolComplete) onToolComplete();
        setTimeout(() => onNavigate && onNavigate('documents'), 1500);
      } else {
        showToast('Gagal upload: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Upload error: ' + error.message, 'error');
    }
  };

  const tools = [
    { id: 'merge', label: 'Merge PDF', icon: 'fa-object-group', color: 'primary', desc: 'Gabung beberapa PDF jadi satu' },
    { id: 'split', label: 'Split PDF', icon: 'fa-object-ungroup', color: 'warning', desc: 'Pisah halaman PDF' },
    { id: 'compress', label: 'Compress PDF', icon: 'fa-compress-arrows-alt', color: 'success', desc: 'Kecilkan ukuran PDF' },
  ];

  return (
    <div className="fade-in max-w-5xl mx-auto animate-slide-up">
      <div className="card-elevated p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-file-pdf text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">PDF Tools</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Merge, Split, dan Compress PDF
              </p>
            </div>
          </div>
        </div>

        {/* Tool Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => { setActiveTool(tool.id); setFiles([]); }}
              className={`p-4 rounded-xl border-2 transition text-left ${
                activeTool === tool.id
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg gradient-${tool.color} flex items-center justify-center mb-3`}>
                <i className={`fa-solid ${tool.icon} text-white text-xl`}></i>
              </div>
              <h3 className="font-bold text-lg mb-1">{tool.label}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tool.desc}</p>
            </button>
          ))}
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <div 
            className="upload-zone"
            onClick={() => document.getElementById('pdfFileInput').click()}
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-cloud-arrow-up text-4xl text-primary"></i>
              </div>
              <p className="text-lg font-semibold mb-2">
                {activeTool === 'merge' ? 'Upload PDF untuk digabung' : 
                 activeTool === 'split' ? 'Upload PDF untuk dipisah' : 
                 'Upload PDF untuk dikompres'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {activeTool === 'merge' ? 'Minimal 2 PDF, maksimal 10 file' : 
                 activeTool === 'split' ? '1 file PDF' : 
                 '1 file PDF'}
              </p>
              <input 
                id="pdfFileInput"
                type="file" 
                className="hidden"
                accept="application/pdf" 
                multiple={activeTool === 'merge'}
                onChange={handleFileUpload}
              />
              <button className="btn-primary">
                <i className="fa-solid fa-file-import mr-2"></i>
                Pilih File PDF
              </button>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <i className="fa-solid fa-files text-primary"></i>
                Files ({files.length})
              </h3>
              <button
                onClick={() => setFiles([])}
                className="text-xs text-danger hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-file-pdf text-white"></i>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>

                  {activeTool === 'merge' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveFile(index, -1)}
                        disabled={index === 0}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        title="Move up"
                      >
                        <i className="fa-solid fa-chevron-up text-xs"></i>
                      </button>
                      <button
                        onClick={() => moveFile(index, 1)}
                        disabled={index === files.length - 1}
                        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        title="Move down"
                      >
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => removeFile(index)}
                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200"
                  >
                    <i className="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Split Options */}
        {activeTool === 'split' && files.length === 1 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <label className="block text-sm font-medium mb-2">
              Halaman yang ingin dipisah:
            </label>
            <input
              type="text"
              value={splitPages}
              onChange={(e) => setSplitPages(e.target.value)}
              placeholder="Contoh: 1,2,3 atau 1-5 atau 1,3,5-8"
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Pisahkan dengan koma (,) atau gunakan tanda strip (-) untuk range
            </p>
          </div>
        )}

        {/* Compression Options */}
        {activeTool === 'compress' && files.length === 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Tingkat Kompresi:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'medium', 'high'].map(level => (
                <button
                  key={level}
                  onClick={() => setCompressionLevel(level)}
                  className={`p-3 rounded-lg border-2 capitalize transition ${
                    compressionLevel === level
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <span className="font-medium text-sm">{level}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Low = Kualitas terbaik, High = Ukuran terkecil
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={activeTool === 'merge' ? mergePDFs : 
                   activeTool === 'split' ? splitPDF : 
                   compressPDF}
          disabled={files.length === 0 || isProcessing}
          className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin"></i>
              Processing...
            </>
          ) : (
            <>
              <i className={`fa-solid ${
                activeTool === 'merge' ? 'fa-object-group' : 
                activeTool === 'split' ? 'fa-object-ungroup' : 
                'fa-compress-arrows-alt'
              }`}></i>
              {activeTool === 'merge' ? 'Merge PDFs' : 
               activeTool === 'split' ? 'Split PDF' : 
               'Compress PDF'}
            </>
          )}
        </button>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <i className="fa-solid fa-info-circle mt-0.5"></i>
            <span>
              {activeTool === 'merge' && 'Gabungkan beberapa file PDF menjadi satu dokumen. Urutan file dapat diatur.'}
              {activeTool === 'split' && 'Pisahkan halaman tertentu dari PDF. Gunakan koma untuk halaman individual atau strip untuk range (contoh: 1,3,5-8).'}
              {activeTool === 'compress' && 'Kurangi ukuran file PDF dengan mempertahankan kualitas. Pilih tingkat kompresi sesuai kebutuhan.'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}