import { createContext, useContext, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { parseRawData } from '../lib/parse';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadFile = useCallback((file) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const parsed = parseRawData(rawRows);
        setData(parsed);
        setFileName(file.name);
        setLoading(false);
      } catch (err) {
        setError('Failed to parse file: ' + err.message);
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setFileName(null);
    setError(null);
  }, []);

  return (
    <DataContext.Provider value={{ data, fileName, loading, error, loadFile, clearData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
