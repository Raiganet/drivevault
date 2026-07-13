'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { showToast } from '@/utils/helpers';

export default function Scanner({ onScanComplete, onNavigate }) {
  const [mode, setMode] = useState('upload');
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Smart Scanner States
  const [currentStep, setCurrentStep] = useState(0);
  const [currentImage, setCurrentImage] = useState(null);
  const [corners, setCorners] = useState([]);
  const [draggingCorner, setDraggingCorner] = useState(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Camera functions - FIXED
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      console.log('📷 Starting camera...');
      
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: isMobile ? 720 : 1280 },
          height: { ideal: isMobile ? 1280 : 720 }
        },
        audio: false
      });
      
      console.log('✅ Camera stream obtained');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log(' Video metadata loaded');
          videoRef.current.play().then(() => {
            console.log('▶️ Video playing');
            setIsCameraActive(true);
          }).catch(err => {
            console.error('❌ Play error:', err);
            setCameraError('Gagal memutar video: ' + err.message);
          });
        };
        
        videoRef.current.onerror = (err) => {
          console.error('❌ Video error:', err);
          setCameraError('Error video: ' + err.message);
        };
      }
    } catch (error) {
      console.error('❌ Camera access error:', error);
      let errorMessage = 'Tidak bisa akses kamera.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Izin kamera ditolak. Silakan izinkan akses kamera di browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Kamera tidak ditemukan di perangkat ini.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Kamera sedang digunakan aplikasi lain.';
      } else {
        errorMessage = error.message;
      }
      
      setCameraError(errorMessage);
      setIsCameraActive(false);
      showToast(errorMessage, 'error');
    }
  }, [facingMode, isMobile]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    console.log('️ Camera stopped');
  }, []);

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      showToast('Kamera belum siap', 'error');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    startSmartScan(imageData);
    showToast('Foto berhasil diambil!', 'success');
  }, [isCameraActive]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => startSmartScan(event.target.result);
        reader.readAsDataURL(file);
      }
    });
    showToast(`${files.length} gambar ditambahkan`, 'success');
  };

  // Smart Scanner Core
  const startSmartScan = (imageData) => {
    setCurrentImage(imageData);
    setCurrentStep(1);
    
    const img = new Image();
    img.onload = () => {
      const padding = 20;
      setCorners([
        { x: padding, y: padding },
        { x: img.width - padding, y: padding },
        { x: img.width - padding, y: img.height - padding },
        { x: padding, y: img.height - padding }
      ]);
    };
    img.src = imageData;
  };

  const applyPerspectiveCorrection = () => {
    if (!currentImage || corners.length !== 4) return null;
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    return new Promise((resolve) => {
      img.onload = () => {
        const topWidth = Math.sqrt(Math.pow(corners[1].x - corners[0].x, 2) + Math.pow(corners[1].y - corners[0].y, 2));
        const bottomWidth = Math.sqrt(Math.pow(corners[2].x - corners[3].x, 2) + Math.pow(corners[2].y - corners[3].y, 2));
        const leftHeight = Math.sqrt(Math.pow(corners[3].x - corners[0].x, 2) + Math.pow(corners[3].y - corners[0].y, 2));
        const rightHeight = Math.sqrt(Math.pow(corners[2].x - corners[1].x, 2) + Math.pow(corners[2].y - corners[1].y, 2));
        
        const outWidth = Math.round(Math.max(topWidth, bottomWidth));
        const outHeight = Math.round(Math.max(leftHeight, rightHeight));
        
        canvas.width = outWidth;
        canvas.height = outHeight;
        
        const srcCorners = corners;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
        
        const outputData = ctx.createImageData(outWidth, outHeight);
        
        for (let y = 0; y < outHeight; y++) {
          for (let x = 0; x < outWidth; x++) {
            const u = x / outWidth;
            const v = y / outHeight;
            
            const topX = srcCorners[0].x + (srcCorners[1].x - srcCorners[0].x) * u;
            const topY = srcCorners[0].y + (srcCorners[1].y - srcCorners[0].y) * u;
            const bottomX = srcCorners[3].x + (srcCorners[2].x - srcCorners[3].x) * u;
            const bottomY = srcCorners[3].y + (srcCorners[2].y - srcCorners[3].y) * u;
            
            const srcX = Math.round(topX + (bottomX - topX) * v);
            const srcY = Math.round(topY + (bottomY - topY) * v);
            
            const safeX = Math.max(0, Math.min(img.width - 1, srcX));
            const safeY = Math.max(0, Math.min(img.height - 1, srcY));
            
            const srcIdx = (safeY * img.width + safeX) * 4;
            const dstIdx = (y * outWidth + x) * 4;
            
            outputData.data[dstIdx] = imgData.data[srcIdx];
            outputData.data[dstIdx + 1] = imgData.data[srcIdx + 1];
            outputData.data[dstIdx + 2] = imgData.data[srcIdx + 2];
            outputData.data[dstIdx + 3] = 255;
          }
        }
        
        ctx.putImageData(outputData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = currentImage;
    });
  };

  const applyEnhancements = (imageData) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, data[i] + brightness));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
          
          data[i] = Math.min(255, Math.max(0, contrastFactor * (data[i] - 128) + 128));
          data[i + 1] = Math.min(255, Math.max(0, contrastFactor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.min(255, Math.max(0, contrastFactor * (data[i + 2] - 128) + 128));
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = imageData;
    });
  };

  const applyFilter = (imageData, filterType) => {
    return new Promise((resolve) => {
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
            const r = data[i], g = data[i + 1], b = data[i + 2];
            
            if (filterType === 'grayscale') {
              const avg = (r + g + b) / 3;
              data[i] = data[i + 1] = data[i + 2] = avg;
            } else if (filterType === 'bw') {
              const avg = (r + g + b) / 3;
              const threshold = avg > 128 ? 255 : 0;
              data[i] = data[i + 1] = data[i + 2] = threshold;
            } else if (filterType === 'magic') {
              data[i] = Math.min(255, Math.max(0, (r - 128) * 1.5 + 128 + 20));
              data[i + 1] = Math.min(255, Math.max(0, (g - 128) * 1.5 + 128 + 20));
              data[i + 2] = Math.min(255, Math.max(0, (b - 128) * 1.5 + 128 + 20));
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = imageData;
    });
  };

  const processCurrentImage = async () => {
    if (!currentImage) return;
    
    setIsProcessing(true);
    showToast('Memproses gambar...', 'info');
    
    try {
      let processed = currentImage;
      
      if (currentStep >= 1) {
        const corrected = await applyPerspectiveCorrection();
        if (corrected) processed = corrected;
      }
      
      if (currentStep >= 2 && (brightness !== 0 || contrast !== 0 || sharpness !== 0)) {
        processed = await applyEnhancements(processed);
      }
      
      if (currentStep >= 3 && filter !== 'original') {
        processed = await applyFilter(processed, filter);
      }
      
      const newImage = {
        id: Date.now() + Math.random(),
        original: currentImage,
        filtered: processed,
        filter: filter
      };
      
      setImages(prev => [...prev, newImage]);
      setCurrentIndex(images.length);
      setCurrentStep(0);
      setCurrentImage(null);
      setCorners([]);
      setBrightness(0);
      setContrast(0);
      setSharpness(0);
      setFilter('original');
      
      showToast('Gambar berhasil diproses!', 'success');
    } catch (error) {
      showToast('Error memproses: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();
        const img = images[i].filtered;
        const imgProps = pdf.getImageProperties(img);
        const ratio = Math.min(
          (pageWidth - margin * 2) / imgProps.width,
          (pageHeight - margin * 2) / imgProps.height
        );
        const finalWidth = imgProps.width * ratio;
        const finalHeight = imgProps.height * ratio;
        pdf.addImage(img, 'JPEG', (pageWidth - finalWidth) / 2, (pageHeight - finalHeight) / 2, finalWidth, finalHeight);
      }

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `scan_${Date.now()}.pdf`, { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('category', 'PDF');
      formData.append('description', `Scanned document - ${images.length} page(s)`);
      formData.append('customName', `Scan_${new Date().toLocaleDateString('id-ID')}.pdf`);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        showToast(`PDF berhasil diupload! (${images.length} halaman)`, 'success');
        setImages([]);
        setCurrentIndex(0);
        if (onScanComplete) onScanComplete();
        setTimeout(() => onNavigate && onNavigate('documents'), 1500);
      } else {
        showToast('Gagal upload: ' + data.message, 'error');
      }
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCropMouseDown = (e, cornerIndex) => {
    e.preventDefault();
    setDraggingCorner(cornerIndex);
  };

  const handleCropMouseMove = useCallback((e) => {
    if (draggingCorner === null || !cropCanvasRef.current) return;
    
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCorners(prev => {
      const newCorners = [...prev];
      newCorners[draggingCorner] = { 
        x: Math.max(0, Math.min(rect.width, x)),
        y: Math.max(0, Math.min(rect.height, y))
      };
      return newCorners;
    });
  }, [draggingCorner]);

  const handleCropMouseUp = () => {
    setDraggingCorner(null);
  };

  const filterOptions = [
    { id: 'original', label: 'Original', icon: 'fa-image' },
    { id: 'grayscale', label: 'Grayscale', icon: 'fa-circle-half-stroke' },
    { id: 'bw', label: 'B&W', icon: 'fa-chess-board' },
    { id: 'magic', label: 'Magic', icon: 'fa-wand-magic-sparkles' },
  ];

  const steps = [
    { id: 1, label: 'Crop & Perspective', icon: 'fa-crop-simple' },
    { id: 2, label: 'Enhance', icon: 'fa-sliders' },
    { id: 3, label: 'Filter', icon: 'fa-palette' },
  ];

  return (
    <div className="fade-in max-w-6xl mx-auto animate-slide-up">
      <div className="card-elevated p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-camera text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">Smart Document Scanner</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Auto edge detection, crop, perspective correction & enhancement
              </p>
            </div>
          </div>
        </div>

        {/* Camera Error */}
        {cameraError && mode === 'camera' && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
              <i className="fa-solid fa-exclamation-triangle mt-0.5"></i>
              {cameraError}
            </p>
            <button onClick={() => setMode('upload')} className="mt-2 btn-secondary text-sm">
              <i className="fa-solid fa-upload mr-2"></i>
              Gunakan Upload Mode
            </button>
          </div>
        )}

        {/* Mode Toggle */}
        {currentStep === 0 && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('camera')}
              className={`flex-1 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                mode === 'camera' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <i className="fa-solid fa-camera"></i> Camera
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                mode === 'upload' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <i className="fa-solid fa-upload"></i> Upload
            </button>
          </div>
        )}

        {/* Camera View */}
        {currentStep === 0 && mode === 'camera' && (
          <div className={`relative bg-black rounded-2xl overflow-hidden mb-4 ${
            isMobile ? 'aspect-[3/4] h-[60vh]' : 'aspect-video'
          }`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {!isCameraActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <button
                  onClick={startCamera}
                  className="btn-primary px-8 py-4 text-lg"
                >
                  <i className="fa-solid fa-video mr-2"></i>
                  Start Camera
                </button>
              </div>
            )}
            
            {isCameraActive && (
              <div className={`absolute ${isMobile ? 'bottom-20' : 'bottom-4'} left-0 right-0 flex justify-center gap-3`}>
                <button
                  onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white"
                >
                  <i className="fa-solid fa-rotate"></i>
                </button>
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:scale-110 transition shadow-lg"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500 mx-auto"></div>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white"
                >
                  <i className="fa-solid fa-image"></i>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Upload View */}
        {currentStep === 0 && mode === 'upload' && (
          <div className="upload-zone mb-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-cloud-arrow-up text-4xl text-primary"></i>
              </div>
              <p className="text-lg font-semibold mb-2">Click to upload images</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">JPG, PNG (Multiple files)</p>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
              <button className="btn-primary">
                <i className="fa-solid fa-file-import mr-2"></i> Choose Images
              </button>
            </div>
          </div>
        )}

        {/* Smart Scanner Steps */}
        {currentStep === 1 && currentImage && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-4">Step 1: Crop & Perspective</h3>
            <div className="relative bg-gray-100 rounded-xl overflow-hidden mb-4">
              <canvas ref={cropCanvasRef} className="w-full block" onMouseMove={handleCropMouseMove} onMouseUp={handleCropMouseUp} onMouseLeave={handleCropMouseUp} />
              {corners.length === 4 && corners.map((corner, idx) => (
                <div key={idx} className="absolute w-6 h-6 rounded-full bg-primary border-4 border-white shadow-lg cursor-move" style={{ left: `${corner.x - 12}px`, top: `${corner.y - 12}px` }} onMouseDown={(e) => handleCropMouseDown(e, idx)} />
              ))}
            </div>
            <button onClick={() => setCurrentStep(2)} className="btn-primary w-full">Next: Enhance</button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-4">Step 2: Enhancement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Brightness: {brightness}</label>
                <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contrast: {contrast}</label>
                <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sharpness: {sharpness}</label>
                <input type="range" min="0" max="100" value={sharpness} onChange={(e) => setSharpness(Number(e.target.value))} className="w-full" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setCurrentStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={() => setCurrentStep(3)} className="btn-primary flex-1">Next: Filter</button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-4">Step 3: Filter</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {filterOptions.map(opt => (
                <button key={opt.id} onClick={() => setFilter(opt.id)} className={`p-4 rounded-xl border-2 ${filter === opt.id ? 'border-primary bg-primary/10' : 'border-gray-200'}`}>
                  <i className={`fa-solid ${opt.icon} text-2xl mb-2`}></i>
                  <p className="text-sm">{opt.label}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentStep(2)} className="btn-secondary flex-1">Back</button>
              <button onClick={processCurrentImage} disabled={isProcessing} className="btn-primary flex-1 disabled:opacity-50">
                {isProcessing ? 'Processing...' : 'Add to Document'}
              </button>
            </div>
          </div>
        )}

        {/* Images List */}
        {images.length > 0 && currentStep === 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-3">Pages ({images.length})</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <div key={img.id} className="relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden cursor-pointer border-2" onClick={() => setCurrentIndex(idx)}>
                  <img src={img.filtered} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate PDF */}
        {images.length > 0 && currentStep === 0 && (
          <button onClick={generatePDF} disabled={isProcessing} className="btn-primary w-full py-3.5 disabled:opacity-50">
            {isProcessing ? 'Processing...' : `Generate PDF & Upload (${images.length} pages)`}
          </button>
        )}
      </div>
    </div>
  );
}
