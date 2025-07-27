import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Dataset, DataPoint } from '../types';

interface DataImportProps {
  onDataImported: (dataset: Dataset) => void;
}

export const DataImport: React.FC<DataImportProps> = ({ onDataImported }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewData, setPreviewData] = useState<DataPoint[]>([]);
  const [fileName, setFileName] = useState('');
  const [columnMeta, setColumnMeta] = useState<Record<string, { type: string; description: string }>>({});
  // Remove onDataImported from file processing, only call on button click
  // Store the last processed dataset in a state
  const [pendingDataset, setPendingDataset] = useState<Dataset | null>(null);

  // Update columnMeta when previewData changes
  useEffect(() => {
    if (previewData.length > 0) {
      const detected = detectColumnTypes(previewData);
      const meta: Record<string, { type: string; description: string }> = {};
      for (const key of Object.keys(previewData[0])) {
        meta[key] = {
          type: detected[key] || 'string',
          description: ''
        };
      }
      setColumnMeta(meta);
    }
  }, [previewData]);

  const handleTypeChange = (col: string, type: string) => {
    setColumnMeta(prev => ({ ...prev, [col]: { ...prev[col], type } }));
  };
  const handleDescChange = (col: string, desc: string) => {
    setColumnMeta(prev => ({ ...prev, [col]: { ...prev[col], description: desc } }));
  };

const detectColumnTypes = (data: DataPoint[]) => {
  if (data.length === 0) return {};
  
  const firstRow = data[0];
  const columnTypes: Record<string, string> = {};

  for (const [key, value] of Object.entries(firstRow)) {
    if (value === null || value === undefined) {
      columnTypes[key] = 'unknown';
      continue;
    }

    const type = typeof value;
    if (type === 'string') {
      // Check if it's a date string
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        columnTypes[key] = 'date';
      } else {
        columnTypes[key] = 'string';
      }
    } else if (type === 'number') {
      columnTypes[key] = 'number';
    } else if (type === 'boolean') {
      columnTypes[key] = 'boolean';
    } else {
      columnTypes[key] = type;
    }
  }

  return columnTypes;
};

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    setUploadStatus('processing');
    setFileName(file.name);
    setErrorMessage('');

    const excelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls',
      '.xlsx'
    ];

    if (file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const data = Array.isArray(json) ? json : [json];
          const columns = data.length > 0 ? Object.keys(data[0]) : [];
          
          const dataset: Dataset = {
            id: Date.now().toString(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            data,
            columns,
            uploadDate: new Date(),
            columnMeta: columnMeta
          };

          setPreviewData(data.slice(0, 5));
          setUploadStatus('success');
          setPendingDataset(dataset);
        } catch (error) {
          setErrorMessage('Invalid JSON format');
          setUploadStatus('error');
        }
      };
      reader.readAsText(file);
    } else if (
      excelTypes.includes(file.type) ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.xlsx')
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          let columns: string[] = [];
          if (json.length > 0 && typeof json[0] === 'object' && json[0] !== null && !Array.isArray(json[0])) {
            columns = Object.keys(json[0] as object);
          }

          const dataset: Dataset = {
            id: Date.now().toString(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            data: json as DataPoint[],
            columns,
            uploadDate: new Date(),
            columnMeta: columnMeta
          };

          setPreviewData((json as DataPoint[]).slice(0, 5));
          setUploadStatus('success');
          setPendingDataset(dataset);
        } catch (error) {
          setErrorMessage('Invalid Excel file format');
          setUploadStatus('error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            setErrorMessage('CSV parsing errors detected');
            setUploadStatus('error');
            return;
          }

          const data = result.data as DataPoint[];
          const columns = result.meta.fields || [];

          const dataset: Dataset = {
            id: Date.now().toString(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            data,
            columns,
            uploadDate: new Date(),
            columnMeta: columnMeta
          };

          setPreviewData(data.slice(0, 5));
          setUploadStatus('success');
          setPendingDataset(dataset);
        },
        error: (error) => {
          setErrorMessage(error.message);
          setUploadStatus('error');
        }
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadSampleData = () => {
    const sampleData = [
      { date: '2024-01-01', revenue: 50000, customers: 120, orders: 95 },
      { date: '2024-01-02', revenue: 52000, customers: 125, orders: 98 },
      { date: '2024-01-03', revenue: 48000, customers: 118, orders: 92 },
      { date: '2024-01-04', revenue: 55000, customers: 132, orders: 105 },
      { date: '2024-01-05', revenue: 51000, customers: 128, orders: 99 }
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-business-data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Import Data</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload CSV or JSON files to start analyzing your business data
          </p>
        </div>
        <button
          onClick={downloadSampleData}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg"
        >
          <Download className="w-4 h-4" />
          Download Sample
        </button>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            {uploadStatus === 'processing' ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            ) : uploadStatus === 'success' ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : uploadStatus === 'error' ? (
              <AlertTriangle className="w-12 h-12 text-red-500" />
            ) : (
              <Upload className="w-12 h-12 text-gray-400" />
            )}
          </div>

          <div>
            {uploadStatus === 'success' ? (
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                File uploaded successfully!
              </h3>
            ) : uploadStatus === 'error' ? (
              <div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Upload failed
                </h3>
                <p className="text-red-500 dark:text-red-400 mt-1">{errorMessage}</p>
              </div>
            ) : uploadStatus === 'processing' ? (
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                Processing file...
              </h3>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Drop your files here, or{' '}
                  <label className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    browse
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv,.json,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleFileInput}
                    />
                  </label>
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Supports CSV and JSON files up to 10MB
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Status */}
      {fileName && uploadStatus === 'success' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{fileName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ready for analysis</p>
            </div>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={!pendingDataset || uploadStatus !== 'success'}
            onClick={() => {
              if (pendingDataset) {
                onDataImported({ ...pendingDataset, columnMeta });
                setPendingDataset(null);
              }
            }}
          >
            Import Data
          </button>
        </div>
      )}
{previewData.length > 0 && (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Preview</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">First 5 rows of your data</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {Object.keys(previewData[0] || {}).map((key) => {
              return (
                <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex flex-col gap-1">
                    <span>{key}</span>
                    <select
                      className="mt-1 text-xs rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={columnMeta[key]?.type || 'string'}
                      onChange={e => handleTypeChange(key, e.target.value)}
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                      <option value="unknown">Unknown</option>
                    </select>
                    <input
                      className="mt-1 text-xs rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      type="text"
                      placeholder="Description"
                      value={columnMeta[key]?.description || ''}
                      onChange={e => handleDescChange(key, e.target.value)}
                      maxLength={60}
                    />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
          {previewData.map((row, index) => (
            <tr key={index}>
              {Object.values(row).map((value, i) => (
                <td key={i} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                  {String(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
      {/* Data Preview */}
      {/* {previewData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-card shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Preview</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">First 5 rows of your data</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {Object.keys(previewData[0] || {}).map((key) => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {previewData.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )} */}
    </div>
  );
};