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
  const [flashOn, setFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);
  
  // Smart Scanner States
  const [currentStep, setCurrentStep] = useState(0);
  const [currentImage, setCurrentImage] = useState(null);
  const [corners, setCorners] = useState([]);
  const [draggingCorner, setDraggingCorner] = useState(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);

  // Detect mobile & orientation
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };
    
    checkMobile();
    checkOrientation();
    window.addEventListener('resize', () => { checkMobile(); checkOrientation(); });
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Check flash capability
  const checkFlashCapability = (stream) => {
    try {
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      
      // Method 1: getCapabilities
      if (track.getCapabilities) {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          setHasFlash(true);
          console.log('✅ Flash available (capabilities)');
          return;
        }
      }
      
      // Method 2: getSettings + applyConstraints test
      if (track.getSettings) {
        const settings = track.getSettings();
        if (settings.torch !== undefined) {
          setHasFlash(true);
          console.log('✅ Flash available (settings)');
          return;
        }
      }
      
      // Method 3: Try applyConstraints directly
      track.applyConstraints({ advanced: [{ torch: true }] })
        .then(() => {
          setHasFlash(true);
          console.log('✅ Flash available (constraint test)');
          track.applyConstraints({ advanced: [{ torch: false }] });
        })
        .catch(() => {
          setHasFlash(false);
          console.log('❌ Flash not available');
        });
    } catch (error) {
      console.log('Flash check error:', error);
      setHasFlash(false);
    }
  };

  // Toggle flash
  const toggleFlash = async () => {
    if (!trackRef.current) {
      showToast('Kamera belum aktif', 'error');
      return;
    }
    
    try {
      await trackRef.current.applyConstraints({
        advanced: [{ torch: !flashOn }]
      });
      setFlashOn(!flashOn);
      showToast(flashOn ? '🔦 Flash OFF' : '⚡ Flash ON', 'info');
    } catch (error) {
      console.error('Flash error:', error);
      showToast('Flash tidak didukung perangkat ini', 'warning');
    }
  };

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      console.log('📷 Starting camera...');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      console.log('✅ Camera stream obtained');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 Video metadata loaded:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          videoRef.current.play().then(() => {
            console.log('▶️ Video playing');
            setIsCameraActive(true);
            checkFlashCapability(stream);
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
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    trackRef.current = null;
    setIsCameraActive(false);
    setFlashOn(false);
    console.log('🛑 Camera stopped');
  }, []);

  useEffect(() => {
    if (mode === 'camera' && currentStep === 0) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, startCamera, stopCamera, currentStep]);

  // FIXED: Capture with rotation handling
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      showToast('Kamera belum siap', 'error');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    console.log('📸 Capture:', videoWidth, 'x', videoHeight, 'Portrait:', isPortrait);
    
    // Handle rotation: if video is landscape but device is portrait, rotate
    if (isPortrait && videoWidth > videoHeight) {
      // Swap dimensions for portrait output
      canvas.width = videoHeight;
      canvas.height = videoWidth;
      
      // Rotate 90 degrees clockwise
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(video, -videoWidth / 2, -videoHeight / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      
      console.log('🔄 Rotated to portrait:', canvas.width, 'x', canvas.height);
    } else {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      ctx.drawImage(video, 0, 0);
    }
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    startSmartScan(imageData);
    showToast('Foto berhasil diambil!', 'success');
  }, [isCameraActive, isPortrait]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => startSmartScan(event.target.result);
        reader.readAsDataURL(file);
      }
    });
    if (files.length > 0) {
      showToast(`${files.length} gambar ditambahkan`, 'success');
    }
  };

  // Smart Scanner Core
  const startSmartScan = (imageData) => {
    setCurrentImage(imageData);
    setCurrentStep(1);
    setFilter('original');
    setBrightness(0);
    setContrast(0);
    setSharpness(0);
    
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      const padding = Math.min(img.width, img.height) * 0.05;
      setCorners([
        { x: padding, y: padding },
        { x: img.width - padding, y: padding },
        { x: img.width - padding, y: img.height - padding },
        { x: padding, y: img.height - padding }
      ]);
    };
    img.src = imageData;
  };

  // Draw image on crop canvas
  useEffect(() => {
    if (currentStep === 1 && currentImage && cropCanvasRef.current && corners.length === 4) {
      const canvas = cropCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Draw polygon overlay
        ctx.strokeStyle = '#7C3AED';
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 8]);
        ctx.fillStyle = 'rgba(124, 58, 237, 0.15)';
        
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw corner handles
        corners.forEach((corner, idx) => {
          // Outer ring
          ctx.fillStyle = 'white';
          ctx.strokeStyle = '#7C3AED';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Inner dot
          ctx.fillStyle = '#7C3AED';
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 12, 0, Math.PI * 2);
          ctx.fill();
          
          // Number
          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(idx + 1, corner.x, corner.y);
        });
      };
      img.src = currentImage;
    }
  }, [currentStep, currentImage, corners]);

  const applyPerspectiveCorrection = () => {
    if (!currentImage || corners.length !== 4) return Promise.resolve(currentImage);
    
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
            } else if (filterType === 'sepia') {
              data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
              data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
              data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
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

  // FIXED: Touch-friendly corner drag handlers
  const getCanvasCoordinates = (e) => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleCornerDown = (e, cornerIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingCorner(cornerIndex);
    console.log('👆 Corner', cornerIndex, 'grabbed');
  };

  const handleMove = useCallback((e) => {
    if (draggingCorner === null || !cropCanvasRef.current) return;
    e.preventDefault();
    
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    setCorners(prev => {
      const newCorners = [...prev];
      newCorners[draggingCorner] = { 
        x: Math.max(0, Math.min(imageDimensions.width, coords.x)),
        y: Math.max(0, Math.min(imageDimensions.height, coords.y))
      };
      return newCorners;
    });
  }, [draggingCorner, imageDimensions]);

  const handleUp = useCallback((e) => {
    if (draggingCorner !== null) {
      console.log('✋ Corner', draggingCorner, 'released');
    }
    setDraggingCorner(null);
  }, [draggingCorner]);

  const filterOptions = [
    { id: 'original', label: 'Original', icon: 'fa-image' },
    { id: 'grayscale', label: 'Grayscale', icon: 'fa-circle-half-stroke' },
    { id: 'bw', label: 'B&W', icon: 'fa-chess-board' },
    { id: 'magic', label: 'Magic', icon: 'fa-wand-magic-sparkles' },
    { id: 'sepia', label: 'Sepia', icon: 'fa-palette' },
  ];

  const steps = [
    { id: 1, label: 'Crop', icon: 'fa-crop-simple' },
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
              className={`w-full h-full object-cover ${isPortrait ? 'rotate-0' : ''}`}
              style={{ transform: isPortrait ? 'rotate(0deg)' : 'rotate(0deg)' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Flash Button - ALWAYS VISIBLE */}
            {isCameraActive && (
              <button
                onClick={toggleFlash}
                className={`absolute top-4 right-4 w-12 h-12 rounded-full backdrop-blur-md transition shadow-lg ${
                  flashOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title={flashOn ? 'Flash ON - Klik untuk matikan' : 'Flash OFF - Klik untuk nyalakan'}
              >
                <i className={`fa-solid ${flashOn ? 'fa-bolt' : 'fa-bolt-slash'} text-lg`}></i>
              </button>
            )}
            
            {/* Camera Controls */}
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

        {/* STEP 1: CROP & PERSPECTIVE */}
        {currentStep === 1 && currentImage && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-crop-simple text-primary"></i>
                Step 1: Crop & Perspective
              </h3>
              <button onClick={() => { setCurrentStep(0); setCurrentImage(null); }} className="text-sm text-danger hover:underline">
                <i className="fa-solid fa-xmark mr-1"></i> Cancel
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-2 mb-4">
              {steps.map((step) => (
                <div key={step.id} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium text-center transition ${
                  currentStep === step.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                }`}>
                  <i className={`fa-solid ${step.icon} mr-1`}></i>
                  {step.label}
                </div>
              ))}
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <i className="fa-solid fa-lightbulb mt-0.5"></i>
                <span>
                  <strong>Drag 4 corner points</strong> untuk menyesuaikan area dokumen. 
                  Perspective akan diluruskan otomatis saat diproses.
                </span>
              </p>
            </div>

            {/* Crop Canvas with draggable corners */}
            <div className="relative bg-gray-100 dark:bg-slate-900 rounded-xl overflow-hidden mb-4 border-2 border-primary/30">
              <canvas
                ref={cropCanvasRef}
                className="w-full block"
                style={{ 
                  maxHeight: '60vh', 
                  touchAction: 'none',
                  cursor: draggingCorner !== null ? 'grabbing' : 'crosshair'
                }}
                onMouseMove={handleMove}
                onMouseUp={handleUp}
                onMouseLeave={handleUp}
                onTouchMove={handleMove}
                onTouchEnd={handleUp}
                onTouchCancel={handleUp}
              />
              
              {/* Draggable corner handles (HTML overlay) */}
              {corners.length === 4 && cropCanvasRef.current && (
                <>
                  {corners.map((corner, idx) => {
                    const canvas = cropCanvasRef.current;
                    const scaleX = canvas.offsetWidth / canvas.width;
                    const scaleY = canvas.offsetHeight / canvas.height;
                    
                    return (
                      <div
                        key={idx}
                        className={`absolute rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm transition-transform ${
                          draggingCorner === idx ? 'scale-125 bg-yellow-500 z-30' : 'bg-primary z-20'
                        }`}
                        style={{
                          width: '48px',
                          height: '48px',
                          left: `${corner.x * scaleX - 24}px`,
                          top: `${corner.y * scaleY - 24}px`,
                          touchAction: 'none'
                        }}
                        onMouseDown={(e) => handleCornerDown(e, idx)}
                        onTouchStart={(e) => handleCornerDown(e, idx)}
                      >
                        {idx + 1}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setCurrentStep(2)} className="btn-primary flex-1">
                Next: Enhance <i className="fa-solid fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ENHANCE */}
        {currentStep === 2 && currentImage && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-sliders text-primary"></i>
                Step 2: Enhancement
              </h3>
              <button onClick={() => setCurrentStep(1)} className="text-sm text-primary hover:underline">
                <i className="fa-solid fa-arrow-left mr-1"></i> Back
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {steps.map((step) => (
                <div key={step.id} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium text-center transition ${
                  currentStep === step.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                }`}>
                  <i className={`fa-solid ${step.icon} mr-1`}></i>
                  {step.label}
                </div>
              ))}
            </div>

            <div className="relative bg-gray-100 dark:bg-slate-900 rounded-xl overflow-hidden mb-4 border-2 border-primary/30">
              <img src={currentImage} alt="Preview" className="w-full" />
            </div>

            <div className="space-y-4 p-4 bg-white dark:bg-slate-800 rounded-xl">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-medium text-sm flex items-center gap-2">
                    <i className="fa-solid fa-sun text-warning"></i> Brightness
                  </label>
                  <span className="text-sm font-semibold text-primary">{brightness > 0 ? '+' : ''}{brightness}</span>
                </div>
                <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-medium text-sm flex items-center gap-2">
                    <i className="fa-solid fa-circle-half-stroke text-info"></i> Contrast
                  </label>
                  <span className="text-sm font-semibold text-primary">{contrast > 0 ? '+' : ''}{contrast}</span>
                </div>
                <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-medium text-sm flex items-center gap-2">
                    <i className="fa-solid fa-bullseye text-danger"></i> Sharpness
                  </label>
                  <span className="text-sm font-semibold text-primary">{sharpness}</span>
                </div>
                <input type="range" min="0" max="100" value={sharpness} onChange={(e) => setSharpness(Number(e.target.value))} className="w-full" />
              </div>

              <button onClick={() => { setBrightness(0); setContrast(0); setSharpness(0); }} className="btn-secondary w-full text-sm">
                <i className="fa-solid fa-rotate-left mr-2"></i> Reset Enhancements
              </button>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setCurrentStep(1)} className="btn-secondary flex-1">
                <i className="fa-solid fa-arrow-left mr-2"></i> Back
              </button>
              <button onClick={() => setCurrentStep(3)} className="btn-primary flex-1">
                Next: Filter <i className="fa-solid fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FILTER */}
        {currentStep === 3 && currentImage && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-palette text-primary"></i>
                Step 3: Filter
              </h3>
              <button onClick={() => setCurrentStep(2)} className="text-sm text-primary hover:underline">
                <i className="fa-solid fa-arrow-left mr-1"></i> Back
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {steps.map((step) => (
                <div key={step.id} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium text-center transition ${
                  currentStep === step.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                }`}>
                  <i className={`fa-solid ${step.icon} mr-1`}></i>
                  {step.label}
                </div>
              ))}
            </div>

            {/* Filter preview */}
            <div className="relative bg-gray-100 dark:bg-slate-900 rounded-xl overflow-hidden mb-4 border-2 border-primary/30">
              <img 
                src={currentImage} 
                alt="Preview" 
                className="w-full"
                style={{
                  filter: filter === 'grayscale' ? 'grayscale(100%)' :
                          filter === 'bw' ? 'grayscale(100%) contrast(200%)' :
                          filter === 'sepia' ? 'sepia(100%)' :
                          filter === 'magic' ? 'contrast(1.3) brightness(1.1) saturate(1.2)' :
                          'none'
                }}
              />
              <div className="absolute top-2 right-2 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                {filterOptions.find(f => f.id === filter)?.label}
              </div>
            </div>

            {/* Filter options with active state */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {filterOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilter(opt.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    filter === opt.id 
                      ? 'border-primary bg-primary/10 shadow-lg scale-105' 
                      : 'border-gray-200 dark:border-slate-700 hover:border-primary/50'
                  }`}
                >
                  <i className={`fa-solid ${opt.icon} text-2xl mb-2 ${
                    filter === opt.id ? 'text-primary' : 'text-gray-400'
                  }`}></i>
                  <p className={`text-sm font-medium ${
                    filter === opt.id ? 'text-primary font-bold' : 'text-gray-600 dark:text-gray-400'
                  }`}>{opt.label}</p>
                  {filter === opt.id && (
                    <div className="mt-2 text-xs text-primary font-semibold">
                      <i className="fa-solid fa-check-circle mr-1"></i>
                      Active
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setCurrentStep(2)} className="btn-secondary flex-1">
                <i className="fa-solid fa-arrow-left mr-2"></i> Back
              </button>
              <button onClick={processCurrentImage} disabled={isProcessing} className="btn-primary flex-1 disabled:opacity-50">
                {isProcessing ? (
                  <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Processing...</>
                ) : (
                  <><i className="fa-solid fa-check mr-2"></i> Add to Document</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Images List & PDF Generation */}
        {images.length > 0 && currentStep === 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <i className="fa-solid fa-images text-primary"></i>
                Pages ({images.length})
              </h3>
              <button onClick={() => setImages([])} className="text-xs text-danger hover:underline">Clear All</button>
            </div>

            <div className="relative bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden mb-3 aspect-[3/4]">
              <img src={images[currentIndex]?.filtered} alt="Preview" className="w-full h-full object-contain" />
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Page {currentIndex + 1} of {images.length}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {images.map((img, idx) => (
                <div key={img.id} className={`relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                  idx === currentIndex ? 'border-primary shadow-lg' : 'border-transparent'
                }`} onClick={() => setCurrentIndex(idx)}>
                  <img src={img.filtered} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">{idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate PDF Button */}
        {images.length > 0 && currentStep === 0 && (
          <button onClick={generatePDF} disabled={isProcessing} className="btn-primary w-full py-3.5 disabled:opacity-50">
            {isProcessing ? (
              <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Processing...</>
            ) : (
              <><i className="fa-solid fa-file-pdf mr-2"></i> Generate PDF & Upload ({images.length} page{images.length !== 1 ? 's' : ''})</>
            )}
          </button>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <i className="fa-solid fa-info-circle mt-0.5"></i>
            <span>
              <strong>Smart Scanner Features:</strong><br/>
               Flash camera (klik icon bolt di kamera)<br/>
              📄 Drag 4 corner points untuk crop & perspective correction<br/>
              💡 Brightness, contrast, dan sharpness enhancement<br/>
              🔍 Filter: Original, Grayscale, B&W, Magic, Sepia
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
