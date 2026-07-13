'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { showToast } from '@/utils/helpers';
import * as pdfjsLib from 'pdfjs-dist';

// Konfigurasi Worker PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

export default function PDFTools({ onToolComplete, onNavigate }) {
  // --- STATES UMUM ---
  const [activeTool, setActiveTool] = useState('merge');
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitPages, setSplitPages] = useState('');
  const [compressionLevel, setCompressionLevel] = useState('medium');

  // --- STATES UNTUK SMART EDIT ---
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [canvasActions, setCanvasActions] = useState([]);
  const [currentEditMode, setCurrentEditMode] = useState(null); // 'whiteout', 'highlight', 'draw', 'text'
  
  // Tool Settings
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');

  // Canvas Refs
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState([]);

  // ==================== HELPER FUNCTIONS ====================
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
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

  // ==================== FILE HANDLING ====================
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

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  const moveFile = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === files.length - 1)) return;
    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[index + direction];
    newFiles[index + direction] = temp;
    setFiles(newFiles);
  };

  // ==================== CORE PDF FUNCTIONS ====================
  const mergePDFs = async () => {
    if (files.length < 2) return showToast('Minimal 2 PDF untuk digabung', 'error');
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
      showToast('Error: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const splitPDF = async () => {
    if (files.length !== 1) return showToast('Pilih 1 PDF untuk dipisah', 'error');
    if (!splitPages.trim()) return showToast('Masukkan halaman yang ingin dipisah', 'error');
    setIsProcessing(true);
    showToast('Memisahkan PDF...', 'info');
    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();
      const pagesToExtract = parsePageRange(splitPages, totalPages);
      if (pagesToExtract.length === 0) return showToast('Halaman tidak valid', 'error');
      const splitPdf = await PDFDocument.create();
      const copiedPages = await splitPdf.copyPages(pdf, pagesToExtract.map(p => p - 1));
      copiedPages.forEach((page) => splitPdf.addPage(page));
      const pdfBytes = await splitPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([blob], `split_${Date.now()}.pdf`, { type: 'application/pdf' });
      await uploadToDriveVault(pdfFile, `Split PDF (${splitPages})`);
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const compressPDF = async () => {
    if (files.length !== 1) return showToast('Pilih 1 PDF untuk dikompres', 'error');
    setIsProcessing(true);
    showToast('Mengkompres PDF...', 'info');
    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const originalSize = files[0].size;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfBytes = await pdfDoc.save({ useObjectStreams: compressionLevel !== 'low' });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([blob], `compressed_${Date.now()}.pdf`, { type: 'application/pdf' });
      const reduction = ((originalSize - pdfFile.size) / originalSize * 100).toFixed(1);
      await uploadToDriveVault(pdfFile, `Compressed PDF (-${reduction}%)`);
      showToast(`Ukuran berkurang ${reduction}%`, 'success');
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==================== SMART EDIT FUNCTIONS ====================
  const loadPDF = async () => {
    if (files.length !== 1) return showToast('Pilih 1 PDF untuk diedit', 'error');
    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      setPdfDoc(pdf);
      setTotalPages(pdf.getPageCount());
      setCurrentPage(0);
      setCanvasActions([]);
      showToast('PDF berhasil dimuat untuk editing', 'success');
      setTimeout(() => renderPage(pdf, 0), 100);
    } catch (error) {
      showToast('Gagal memuat PDF: ' + error.message, 'error');
    }
  };

  const renderPage = async (pdf, pageIndex) => {
    if (!canvasRef.current) return;
    try {
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      redrawActions(context, canvas.width, canvas.height);
    } catch (error) {
      console.error('Render error:', error);
    }
  };

  const redrawActions = (context, canvasWidth, canvasHeight) => {
    // Render ulang semua aksi di atas canvas
    canvasActions.forEach(action => {
      if (action.page !== currentPage) return;
      
      if (action.type === 'whiteout') {
        context.fillStyle = 'white';
        context.fillRect(action.x, action.y, action.w, action.h);
      } else if (action.type === 'highlight') {
        context.fillStyle = action.color + '66';
        context.fillRect(action.x, action.y, action.w, action.h);
      } else if (action.type === 'draw') {
        context.strokeStyle = action.color;
        context.lineWidth = action.size;
        context.lineCap = 'round';
        context.beginPath();
        action.path.forEach((point, i) => {
          if (i === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.stroke();
      } else if (action.type === 'text') {
        context.fillStyle = action.color;
        context.font = `${action.size}px Arial`;
        context.fillText(action.text, action.x, action.y);
      }
    });
  };

  // Canvas Mouse Events
  const handleMouseDown = (e) => {
    if (!currentEditMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    
    if (currentEditMode === 'draw') {
      setCurrentPath([{ x, y }]);
    } else if (currentEditMode === 'text') {
      if (!textInput.trim()) return showToast('Masukkan text terlebih dahulu', 'error');
      const newAction = {
        type: 'text',
        page: currentPage,
        x, y,
        text: textInput,
        size: fontSize,
        color: textColor
      };
      setCanvasActions([...canvasActions, newAction]);
      // Redraw immediately
      const context = canvasRef.current.getContext('2d');
      context.fillStyle = textColor;
      context.font = `${fontSize}px Arial`;
      context.fillText(textInput, x, y);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentEditMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentEditMode === 'draw') {
      setCurrentPath([...currentPath, { x, y }]);
      const context = canvasRef.current.getContext('2d');
      context.strokeStyle = drawColor;
      context.lineWidth = 3;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
      context.lineTo(x, y);
      context.stroke();
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(false);
    
    if (currentEditMode === 'whiteout' || currentEditMode === 'highlight') {
      const w = x - startPos.x;
      const h = y - startPos.y;
      if (Math.abs(w) > 5 && Math.abs(h) > 5) {
        const newAction = {
          type: currentEditMode,
          page: currentPage,
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          w: Math.abs(w),
          h: Math.abs(h),
          color: highlightColor
        };
        setCanvasActions([...canvasActions, newAction]);
        // Update preview
        const context = canvasRef.current.getContext('2d');
        if (currentEditMode === 'whiteout') {
          context.fillStyle = 'white';
          context.fillRect(Math.min(startPos.x, x), Math.min(startPos.y, y), Math.abs(w), Math.abs(h));
        } else {
          context.fillStyle = highlightColor + '66';
          context.fillRect(Math.min(startPos.x, x), Math.min(startPos.y, y), Math.abs(w), Math.abs(h));
        }
      }
    } else if (currentEditMode === 'draw' && currentPath.length > 1) {
      const newAction = {
        type: 'draw',
        page: currentPage,
        path: currentPath,
        color: drawColor,
        size: 3
      };
      setCanvasActions([...canvasActions, newAction]);
    }
    
    setCurrentPath([]);
  };

  const saveEditedPDF = async () => {
    if (!pdfDoc) return showToast('PDF belum dimuat', 'error');
    setIsProcessing(true);
    showToast('Menyimpan perubahan...', 'info');
    
    try {
      const pages = pdfDoc.getPages();
      
      for (const action of canvasActions) {
        const page = pages[action.page];
        if (!page) continue;
        
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const canvas = canvasRef.current;
        if (!canvas) continue;
        
        const scaleX = pageWidth / canvas.width;
        const scaleY = pageHeight / canvas.height;
        
        if (action.type === 'whiteout') {
          page.drawRectangle({
            x: action.x * scaleX,
            y: pageHeight - (action.y + action.h) * scaleY,
            width: action.w * scaleX,
            height: action.h * scaleY,
            color: rgb(1, 1, 1),
          });
        } else if (action.type === 'highlight') {
          const color = hexToRgb(action.color);
          page.drawRectangle({
            x: action.x * scaleX,
            y: pageHeight - (action.y + action.h) * scaleY,
            width: action.w * scaleX,
            height: action.h * scaleY,
            color: rgb(color.r, color.g, color.b),
            opacity: 0.4,
          });
        } else if (action.type === 'draw') {
          const color = hexToRgb(action.color);
          for (let i = 1; i < action.path.length; i++) {
            page.drawLine({
              start: { x: action.path[i-1].x * scaleX, y: pageHeight - action.path[i-1].y * scaleY },
              end: { x: action.path[i].x * scaleX, y: pageHeight - action.path[i].y * scaleY },
              thickness: action.size * scaleX,
              color: rgb(color.r, color.g, color.b),
            });
          }
        } else if (action.type === 'text') {
          const color = hexToRgb(action.color);
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          page.drawText(action.text, {
            x: action.x * scaleX,
            y: pageHeight - action.y * scaleY,
            size: action.size * scaleX,
            font,
            color: rgb(color.r, color.g, color.b),
          });
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([blob], `edited_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      await uploadToDriveVault(pdfFile, `Smart Edited PDF (${canvasActions.length} changes)`);
    } catch (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadToDriveVault = async (file, description) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'PDF');
      formData.append('description', description);
      formData.append('customName', file.name);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        showToast(`${description} berhasil diupload!`, 'success');
        setFiles([]);
        setPdfDoc(null);
        setCanvasActions([]);
        if (onToolComplete) onToolComplete();
        setTimeout(() => onNavigate && onNavigate('documents'), 1500);
      } else {
        showToast('Gagal upload: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Upload error: ' + error.message, 'error');
    }
  };

  // ==================== UI RENDER ====================
  const tools = [
    { id: 'merge', label: 'Merge PDF', icon: 'fa-object-group', desc: 'Gabung beberapa PDF' },
    { id: 'split', label: 'Split PDF', icon: 'fa-object-ungroup', desc: 'Pisah halaman PDF' },
    { id: 'compress', label: 'Compress PDF', icon: 'fa-compress-arrows-alt', desc: 'Kecilkan ukuran PDF' },
    { id: 'edit', label: 'Smart Edit', icon: 'fa-pen-to-square', desc: 'Whiteout, Draw, Text' },
  ];

  return (
    <div className="fade-in max-w-6xl mx-auto animate-slide-up">
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
                Merge, Split, Compress, dan Smart Edit PDF
              </p>
            </div>
          </div>
        </div>

        {/* Tool Selection */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => { 
                setActiveTool(tool.id); 
                setFiles([]); 
                setPdfDoc(null);
                setCanvasActions([]);
              }}
              className={`p-4 rounded-xl border-2 transition text-left ${
                activeTool === tool.id
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-gray-200 dark:border-slate-700 hover:border-primary/50'
              }`}
            >
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-3">
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
            className="upload-zone cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-cloud-arrow-up text-4xl text-primary"></i>
              </div>
              <p className="text-lg font-semibold mb-2">Upload PDF</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {activeTool === 'merge' ? 'Minimal 2 PDF, maksimal 10 file' : '1 file PDF'}
              </p>
              <input 
                ref={fileInputRef}
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

        {/* File List (for merge) */}
        {files.length > 0 && activeTool === 'merge' && (
          <div className="mb-6 space-y-2 max-h-96 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-file-pdf text-white"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => moveFile(index, -1)} disabled={index === 0} className="p-2 rounded hover:bg-gray-200 disabled:opacity-30">
                    <i className="fa-solid fa-chevron-up text-xs"></i>
                  </button>
                  <button onClick={() => moveFile(index, 1)} disabled={index === files.length - 1} className="p-2 rounded hover:bg-gray-200 disabled:opacity-30">
                    <i className="fa-solid fa-chevron-down text-xs"></i>
                  </button>
                </div>
                <button onClick={() => removeFile(index)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ==================== SMART EDIT INTERFACE ==================== */}
        {activeTool === 'edit' && files.length === 1 && !pdfDoc && (
          <button onClick={loadPDF} className="btn-primary w-full py-3.5 mb-6">
            <i className="fa-solid fa-file-import mr-2"></i>
            Load PDF untuk Smart Edit
          </button>
        )}

        {activeTool === 'edit' && pdfDoc && (
          <div className="mb-6 bg-gray-50 dark:bg-slate-800 rounded-xl p-6 border-2 border-primary/30">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <i className="fa-solid fa-pen-nib text-primary"></i>
              Smart PDF Editor
              <span className="text-sm font-normal text-gray-500 ml-2">({canvasActions.length} perubahan)</span>
            </h3>

            {/* Page Navigation */}
            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={() => {
                  const newPage = Math.max(0, currentPage - 1);
                  setCurrentPage(newPage);
                  setTimeout(() => renderPage(pdfDoc, newPage), 100);
                }}
                disabled={currentPage === 0}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 disabled:opacity-50"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="font-medium">Page {currentPage + 1} of {totalPages}</span>
              <button
                onClick={() => {
                  const newPage = Math.min(totalPages - 1, currentPage + 1);
                  setCurrentPage(newPage);
                  setTimeout(() => renderPage(pdfDoc, newPage), 100);
                }}
                disabled={currentPage === totalPages - 1}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 disabled:opacity-50"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
              <button
                onClick={() => { setCanvasActions([]); renderPage(pdfDoc, currentPage); }}
                className="ml-auto px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm"
              >
                <i className="fa-solid fa-rotate-left mr-2"></i>
                Reset Edits
              </button>
            </div>

            {/* Canvas Preview */}
            <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-gray-300 dark:border-slate-700 overflow-auto max-h-[600px] flex justify-center">
              <canvas
                ref={canvasRef}
                className={`border border-gray-200 shadow-lg ${currentEditMode ? 'cursor-crosshair' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => isDrawing && handleMouseUp({ clientX: 0, clientY: 0 })}
              />
            </div>

            {/* Edit Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Whiteout */}
              <div className={`p-4 bg-white dark:bg-slate-900 rounded-lg border-2 transition ${currentEditMode === 'whiteout' ? 'border-primary' : 'border-gray-200 dark:border-slate-700'}`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-eraser text-warning"></i> Whiteout
                </h4>
                <p className="text-xs text-gray-500 mb-3">Tutup text lama dengan kotak putih</p>
                <button
                  onClick={() => setCurrentEditMode(currentEditMode === 'whiteout' ? null : 'whiteout')}
                  className={`btn-warning w-full text-sm ${currentEditMode === 'whiteout' ? 'ring-2 ring-primary' : ''}`}
                >
                  {currentEditMode === 'whiteout' ? '✓ Aktif' : 'Aktifkan'}
                </button>
              </div>

              {/* Highlight */}
              <div className={`p-4 bg-white dark:bg-slate-900 rounded-lg border-2 transition ${currentEditMode === 'highlight' ? 'border-primary' : 'border-gray-200 dark:border-slate-700'}`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-highlighter text-success"></i> Highlight
                </h4>
                <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="w-full h-8 mb-2 rounded" />
                <button
                  onClick={() => setCurrentEditMode(currentEditMode === 'highlight' ? null : 'highlight')}
                  className={`btn-success w-full text-sm ${currentEditMode === 'highlight' ? 'ring-2 ring-primary' : ''}`}
                >
                  {currentEditMode === 'highlight' ? '✓ Aktif' : 'Aktifkan'}
                </button>
              </div>

              {/* Draw */}
              <div className={`p-4 bg-white dark:bg-slate-900 rounded-lg border-2 transition ${currentEditMode === 'draw' ? 'border-primary' : 'border-gray-200 dark:border-slate-700'}`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-pen text-info"></i> Draw
                </h4>
                <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="w-full h-8 mb-2 rounded" />
                <button
                  onClick={() => setCurrentEditMode(currentEditMode === 'draw' ? null : 'draw')}
                  className={`btn-info w-full text-sm text-white ${currentEditMode === 'draw' ? 'ring-2 ring-primary' : ''}`}
                >
                  {currentEditMode === 'draw' ? '✓ Aktif' : 'Aktifkan'}
                </button>
              </div>

              {/* Add Text */}
              <div className={`p-4 bg-white dark:bg-slate-900 rounded-lg border-2 transition ${currentEditMode === 'text' ? 'border-primary' : 'border-gray-200 dark:border-slate-700'}`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-font text-primary"></i> Add Text
                </h4>
                <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Ketik text..." className="input w-full mb-2 text-sm" />
                <div className="flex gap-2 mb-2">
                  <input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="input w-1/2 text-sm" placeholder="Size" />
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="input w-1/2 h-10" />
                </div>
                <button
                  onClick={() => setCurrentEditMode(currentEditMode === 'text' ? null : 'text')}
                  className={`btn-primary w-full text-sm ${currentEditMode === 'text' ? 'ring-2 ring-secondary' : ''}`}
                >
                  {currentEditMode === 'text' ? '✓ Klik di PDF' : 'Aktifkan'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={saveEditedPDF} disabled={isProcessing || canvasActions.length === 0} className="btn-primary flex-1 py-3 disabled:opacity-50">
                {isProcessing ? <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk mr-2"></i> Save & Upload PDF</>}
              </button>
              <button onClick={() => { setPdfDoc(null); setCanvasActions([]); }} className="btn-secondary px-6">
                <i className="fa-solid fa-xmark mr-2"></i> Close
              </button>
            </div>
          </div>
        )}

        {/* Split Options */}
        {activeTool === 'split' && files.length === 1 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <label className="block text-sm font-medium mb-2">Halaman yang ingin dipisah:</label>
            <input type="text" value={splitPages} onChange={(e) => setSplitPages(e.target.value)} placeholder="Contoh: 1,2,3 atau 1-5" className="input w-full" />
          </div>
        )}

        {/* Compression Options */}
        {activeTool === 'compress' && files.length === 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Tingkat Kompresi:</label>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'medium', 'high'].map(level => (
                <button key={level} onClick={() => setCompressionLevel(level)} className={`p-3 rounded-lg border-2 capitalize transition ${compressionLevel === level ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-slate-700'}`}>
                  <span className="font-medium text-sm">{level}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Action Button (Non-Edit) */}
        {activeTool !== 'edit' && (
          <button
            onClick={activeTool === 'merge' ? mergePDFs : activeTool === 'split' ? splitPDF : compressPDF}
            disabled={files.length === 0 || isProcessing}
            className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing...</> : <><i className={`fa-solid ${activeTool === 'merge' ? 'fa-object-group' : activeTool === 'split' ? 'fa-object-ungroup' : 'fa-compress-arrows-alt'}`}></i> {activeTool === 'merge' ? 'Merge PDFs' : activeTool === 'split' ? 'Split PDF' : 'Compress PDF'}</>}
          </button>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <i className="fa-solid fa-info-circle mt-0.5"></i>
            <span>
              {activeTool === 'edit' && 'Smart Edit: Pilih tool (Whiteout/Highlight/Draw/Text), lalu klik & drag di preview PDF. Klik "Save & Upload" untuk menyimpan perubahan.'}
              {activeTool === 'merge' && 'Gabungkan beberapa file PDF menjadi satu dokumen.'}
              {activeTool === 'split' && 'Pisahkan halaman tertentu dari PDF.'}
              {activeTool === 'compress' && 'Kurangi ukuran file PDF.'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}