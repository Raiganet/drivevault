'use client';
import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { showToast } from '@/utils/helpers';

export default function ScannerSimple({ onScanComplete, onNavigate }) {
  const [images, setImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImages(prev => [...prev, {
            id: Date.now() + Math.random(),
            src: event.target.result,
            name: file.name
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
    showToast(`${files.length} gambar ditambahkan`, 'success');
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePDF = async () => {
    if (images.length === 0) {
      showToast('Pilih gambar dulu', 'error');
      return;
    }

    setIsProcessing(true);
    showToast('Membuat PDF...', 'info');

    try {
      const pdf = new jsPDF();
      
      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();
        
        const img = images[i];
        const imgProps = pdf.getImageProperties(img.src);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(img.src, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `scan_${Date.now()}.pdf`, { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('category', 'PDF');
      formData.append('description', `Scanned - ${images.length} page(s)`);
      formData.append('customName', `Scan_${new Date().toLocaleDateString('id-ID')}.pdf`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        showToast('PDF berhasil diupload!', 'success');
        setImages([]);
        if (onScanComplete) onScanComplete();
        setTimeout(() => onNavigate && onNavigate('documents'), 1500);
      } else {
        showToast('Upload gagal: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fade-in max-w-4xl mx-auto p-4 lg:p-6">
      <div className="card-elevated p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-camera text-white text-xl"></i>
          </div>
          Scanner Dokumen
        </h2>

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <i className="fa-solid fa-info-circle mr-2"></i>
            Upload foto dokumen Anda (JPG, PNG). Kami akan convert ke PDF otomatis.
          </p>
        </div>

        <div 
          className="upload-zone mb-6 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <i className="fa-solid fa-cloud-arrow-up text-4xl text-primary"></i>
            </div>
            <h3 className="font-semibold text-lg mb-2">Upload Gambar</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Klik untuk pilih file atau drag & drop
            </p>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden"
              accept="image/*" 
              multiple
              onChange={handleFileUpload}
            />
            <button className="btn-primary">
              <i className="fa-solid fa-file-import mr-2"></i>
              Pilih File
            </button>
          </div>
        </div>

        {images.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Gambar ({images.length})</h3>
              <button 
                onClick={() => setImages([])}
                className="text-sm text-red-500 hover:underline"
              >
                Hapus Semua
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {images.map((img, idx) => (
                <div key={img.id} className="relative group">
                  <img 
                    src={img.src} 
                    alt={`Page ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-slate-700"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                  <p className="text-xs text-center mt-2 truncate">{img.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={generatePDF}
          disabled={images.length === 0 || isProcessing}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
              Processing...
            </>
          ) : (
            <>
              <i className="fa-solid fa-file-pdf mr-2"></i>
              Convert ke PDF & Upload ({images.length} file)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
