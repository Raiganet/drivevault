'use client';
import { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { showToast } from '@/utils/helpers';

export default function Scanner({ onScanComplete, onNavigate }) {
  const [mode, setMode] = useState('camera');
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      showToast('Tidak bisa akses kamera: ' + error.message, 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, facingMode]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    addImage(imageData);
    showToast('Foto berhasil diambil!', 'success');
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          addImage(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
    showToast(`${files.length} gambar ditambahkan`, 'success');
  };

  const addImage = (imageData) => {
    setImages(prev => [...prev, {
      id: Date.now() + Math.random(),
      original: imageData,
      filtered: imageData,
      filter: 'original'
    }]);
  };

  const applyFilter = (filterType) => {
    if (images.length === 0) return;
    
    const currentImage = images[currentIndex];
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(img, 0, 0);
      
      if (filterType !== 'original') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (filterType === 'grayscale') {
            const avg = (r + g + b) / 3;
            data[i] = avg;
            data[i + 1] = avg;
            data[i + 2] = avg;
          } else if (filterType === 'bw') {
            const avg = (r + g + b) / 3;
            const threshold = avg > 128 ? 255 : 0;
            data[i] = threshold;
            data[i + 1] = threshold;
            data[i + 2] = threshold;
          } else if (filterType === 'magic') {
            data[i] = Math.min(255, Math.max(0, (r - 128) * 1.5 + 128 + 20));
            data[i + 1] = Math.min(255, Math.max(0, (g - 128) * 1.5 + 128 + 20));
            data[i + 2] = Math.min(255, Math.max(0, (b - 128) * 1.5 + 128 + 20));
          } else if (filterType === 'sepia') {
            data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
            data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
            data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      const filteredData = canvas.toDataURL('image/jpeg', 0.9);
      setImages(prev => prev.map((img, idx) => 
        idx === currentIndex ? { ...img, filtered: filteredData, filter: filterType } : img
      ));
      setFilter(filterType);
    };
    img.src = currentImage.original;
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (currentIndex >= images.length - 1) {
      setCurrentIndex(Math.max(0, images.length - 2));
    }
  };

  const generatePDF = async () => {
    if (images.length === 0) {
      showToast('Tidak ada gambar untuk di-scan', 'error');
      return;
    }

    setIsProcessing(true);
    showToast('Membuat PDF...', 'info');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();

        const img = images[i].filtered;
        const imgProps = pdf.getImageProperties(img);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);
        const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;
        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        pdf.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
      }

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `scan_${Date.now()}.pdf`, { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('category', 'PDF');
      formData.append('description', `Scanned document - ${images.length} page(s)`);
      formData.append('customName', `Scan_${new Date().toLocaleDateString('id-ID')}.pdf`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        showToast(`PDF berhasil dibuat dan diupload! (${images.length} halaman)`, 'success');
        setImages([]);
        setCurrentIndex(0);
        if (onScanComplete) onScanComplete();
        setTimeout(() => onNavigate && onNavigate('documents'), 1500);
      } else {
        showToast('Gagal upload: ' + data.message, 'error');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      showToast('Error membuat PDF: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filterOptions = [
    { id: 'original', label: 'Original', icon: 'fa-image' },
    { id: 'grayscale', label: 'Grayscale', icon: 'fa-circle-half-stroke' },
    { id: 'bw', label: 'B&W', icon: 'fa-chess-board' },
    { id: 'magic', label: 'Magic', icon: 'fa-wand-magic-sparkles' },
    { id: 'sepia', label: 'Sepia', icon: 'fa-palette' },
  ];

  return (
    <div className="fade-in max-w-5xl mx-auto animate-slide-up">
      <div className="card-elevated p-4 lg:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-camera text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">Document Scanner</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Scan dokumen seperti CamScanner
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
              mode === 'camera' ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            <i className="fa-solid fa-camera"></i>
            Camera
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
              mode === 'upload' ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            <i className="fa-solid fa-upload"></i>
            Upload
          </button>
        </div>

        {mode === 'camera' && (
          <div className="relative bg-black rounded-2xl overflow-hidden mb-4 aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <button
                onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition"
                title="Switch Camera"
              >
                <i className="fa-solid fa-rotate"></i>
              </button>
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:scale-110 transition shadow-lg"
                title="Capture"
              >
                <div className="w-12 h-12 rounded-full bg-red-500 mx-auto"></div>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition"
                title="Upload"
              >
                <i className="fa-solid fa-image"></i>
              </button>
            </div>
          </div>
        )}

        {mode === 'upload' && (
          <div 
            className="upload-zone mb-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-cloud-arrow-up text-4xl text-primary"></i>
              </div>
              <p className="text-lg font-semibold mb-2">Click to upload images</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                JPG, PNG (Multiple files supported)
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
                Choose Images
              </button>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles text-primary"></i>
              Filter
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {filterOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => applyFilter(opt.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    filter === opt.id ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  <i className={`fa-solid ${opt.icon}`}></i>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <i className="fa-solid fa-images text-primary"></i>
                Pages ({images.length})
              </h3>
              <button
                onClick={() => { setImages([]); setCurrentIndex(0); }}
                className="text-xs text-danger hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="relative bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden mb-3 aspect-[3/4]">
              <img 
                src={images[currentIndex]?.filtered} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Page {currentIndex + 1} of {images.length}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {images.map((img, idx) => (
                <div 
                  key={img.id}
                  className={`relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                    idx === currentIndex ? 'border-primary shadow-lg' : 'border-transparent'
                  }`}
                  onClick={() => { setCurrentIndex(idx); setFilter(img.filter); }}
                >
                  <img src={img.filtered} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={generatePDF}
          disabled={images.length === 0 || isProcessing}
          className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin"></i>
              Processing...
            </>
          ) : (
            <>
              <i className="fa-solid fa-file-pdf"></i>
              Generate PDF & Upload ({images.length} page{images.length !== 1 ? 's' : ''})
            </>
          )}
        </button>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <i className="fa-solid fa-info-circle mt-0.5"></i>
            <span>
              <strong>Tips:</strong> Gunakan filter <strong>Magic</strong> untuk hasil seperti scan asli. 
              Filter <strong>B&W</strong> cocok untuk dokumen teks. Foto dengan pencahayaan baik untuk hasil terbaik.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}