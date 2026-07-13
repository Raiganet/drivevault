'use client';
import { useState, useRef } from 'react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { showToast } from '@/utils/helpers';

export default function QRGenerator({ onGenerateComplete, onNavigate }) {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [columns, setColumns] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && (
      uploadedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      uploadedFile.type === 'application/vnd.ms-excel'
    )) {
      setFile(uploadedFile);
      setData([]);
      setQrCodes({});
      setColumns([]);
      setSelectedColumn('');
      parseExcel(uploadedFile);
      showToast('File Excel berhasil diupload', 'success');
    } else {
      showToast('Pilih file Excel (.xlsx atau .xls)', 'error');
    }
  };

  const parseExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = jsonData[0];
          const rows = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          setColumns(headers);
          setData(rows);
          showToast(`${rows.length} data ditemukan`, 'success');
        }
      } catch (error) {
        console.error('Excel parse error:', error);
        showToast('Gagal membaca file Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const generateQRCode = async (text) => {
    try {
      return await QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('QR Generation error:', error);
      return null;
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedColumn) {
      showToast('Pilih kolom untuk generate QR', 'error');
      return;
    }

    if (data.length === 0) {
      showToast('Tidak ada data untuk di-generate', 'error');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    showToast('Generating QR Codes...', 'info');

    const newQrCodes = {};
    const total = data.length;

    for (let i = 0; i < total; i++) {
      const row = data[i];
      const value = row[selectedColumn];
      
      if (value) {
        const qrCode = await generateQRCode(String(value));
        if (qrCode) {
          newQrCodes[i] = qrCode;
        }
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setQrCodes(newQrCodes);
    setIsGenerating(false);
    showToast(`${Object.keys(newQrCodes).length} QR Code berhasil dibuat!`, 'success');

    if (onGenerateComplete) {
      onGenerateComplete(newQrCodes);
    }
  };

  const downloadWithQR = async () => {
    if (Object.keys(qrCodes).length === 0) {
      showToast('Generate QR Code terlebih dahulu', 'error');
      return;
    }

    setIsConverting(true);
    showToast('Membuat dokumen dengan QR Code...', 'info');

    try {
      // Create new workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data with QR code references
      const dataWithQR = data.map((row, index) => {
        const qrCode = qrCodes[index];
        return {
          ...row,
          'QR Code': qrCode ? 'Generated ✓' : 'Not Generated'
        };
      });

      // Add headers
      const headers = [...columns, 'QR Code'];
      const wsData = [headers, ...dataWithQR.map(row => 
        headers.map(header => row[header] || '')
      )];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = columns.map(() => ({ wch: 20 }));
      ws['!cols'].push({ wch: 25 }); // QR Code column

      XLSX.utils.book_append_sheet(wb, ws, 'Data dengan QR');

      // Generate Excel file
      const fileName = `QR_${file.name.replace('.xlsx', '').replace('.xls', '')}_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast('File berhasil didownload!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Gagal mendownload file', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const downloadQRImages = async () => {
    if (Object.keys(qrCodes).length === 0) {
      showToast('Generate QR Code terlebih dahulu', 'error');
      return;
    }

    showToast('Mempersiapkan download QR Codes...', 'info');

    // Download each QR code
    Object.entries(qrCodes).forEach(([index, qrCode]) => {
      const row = data[index];
      const serialNumber = row[selectedColumn] || `Row_${index + 1}`;
      
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = `QR_${serialNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    showToast(`${Object.keys(qrCodes).length} QR Code didownload!`, 'success');
  };

  const clearAll = () => {
    setFile(null);
    setData([]);
    setQrCodes({});
    setColumns([]);
    setSelectedColumn('');
    setProgress(0);
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
              <i className="fa-solid fa-qrcode text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">QR Code Generator</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate QR Code dari data Excel
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-6">
          <div 
            className="upload-zone cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-file-excel text-4xl text-green-600"></i>
              </div>
              <p className="text-lg font-semibold mb-2">Upload File Excel</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                .xlsx atau .xls (Max 10MB)
              </p>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
              <button className="btn-primary">
                <i className="fa-solid fa-file-import mr-2"></i>
                Pilih File Excel
              </button>
            </div>
          </div>
        </div>

        {/* File Info */}
        {file && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-file-excel text-green-600 text-2xl"></i>
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-300">{file.name}</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {(file.size / 1024).toFixed(2)} KB • {data.length} rows
                  </p>
                </div>
              </div>
              <button
                onClick={clearAll}
                className="text-sm text-red-600 hover:underline"
              >
                Hapus
              </button>
            </div>
          </div>
        )}

        {/* Column Selection */}
        {data.length > 0 && columns.length > 0 && (
          <div className="mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <label className="block text-sm font-medium mb-2">
                Pilih Kolom untuk Generate QR Code:
              </label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="input w-full mb-3"
              >
                <option value="">-- Pilih Kolom --</option>
                {columns.map((col, idx) => (
                  <option key={idx} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <i className="fa-solid fa-info-circle mr-1"></i>
                QR Code akan di-generate berdasarkan data di kolom yang dipilih
              </p>
            </div>
          </div>
        )}

        {/* Generate Button */}
        {data.length > 0 && (
          <button
            onClick={handleGenerateQR}
            disabled={isGenerating || !selectedColumn}
            className="btn-primary w-full py-3.5 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                Generating... {progress}%
              </>
            ) : (
              <>
                <i className="fa-solid fa-qrcode mr-2"></i>
                Generate {data.length} QR Codes
              </>
            )}
          </button>
        )}

        {/* Progress Bar */}
        {isGenerating && (
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

        {/* Preview Table */}
        {data.length > 0 && Object.keys(qrCodes).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <i className="fa-solid fa-table text-primary"></i>
                Preview Data dengan QR Code
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadWithQR}
                  disabled={isConverting}
                  className="btn-secondary text-sm"
                >
                  <i className="fa-solid fa-file-excel mr-2"></i>
                  Download Excel
                </button>
                <button
                  onClick={downloadQRImages}
                  className="btn-secondary text-sm"
                >
                  <i className="fa-solid fa-images mr-2"></i>
                  Download QR Images
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-slate-800">
                  <tr>
                    <th className="p-3 text-left font-semibold">No</th>
                    {columns.map((col, idx) => (
                      <th key={idx} className="p-3 text-left font-semibold">{col}</th>
                    ))}
                    <th className="p-3 text-center font-semibold">QR Code</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-slate-700">
                      <td className="p-3">{index + 1}</td>
                      {columns.map((col, idx) => (
                        <td key={idx} className="p-3">{row[col]}</td>
                      ))}
                      <td className="p-3 text-center">
                        {qrCodes[index] ? (
                          <img 
                            src={qrCodes[index]} 
                            alt="QR Code" 
                            className="w-20 h-20 mx-auto"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 10 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  ... dan {data.length - 10} data lainnya
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <i className="fa-solid fa-lightbulb mt-0.5"></i>
            <span>
              <strong>Cara Penggunaan:</strong><br/>
              1. Upload file Excel yang berisi data Serial Number<br/>
              2. Pilih kolom yang ingin di-generate menjadi QR Code<br/>
              3. Klik "Generate QR Codes"<br/>
              4. Download hasil dalam format Excel atau download semua QR Code sebagai gambar PNG
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}