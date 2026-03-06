import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { SectionHeader } from '../../components/SectionHeader';

function cleanHtml(text) {
  if (!text) return '';
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&lsquo;': '\u2018',
    '&rsquo;': '\u2019', '&ldquo;': '\u201C', '&rdquo;': '\u201D',
    '&hellip;': '…', '&bull;': '•', '&middot;': '·', '&copy;': '©',
    '&reg;': '®', '&trade;': '™', '&deg;': '°',
  };
  let cleaned = text;
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<\/?(p|div|h[1-6]|li|br|tr|td|th|blockquote|pre|section|article|header|footer)[^>]*>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  cleaned = cleaned.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
  Object.entries(entities).forEach(([entity, char]) => {
    cleaned = cleaned.split(entity).join(char);
  });
  cleaned = cleaned
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter((line, i, arr) => line || (arr[i - 1] !== ''))
    .join('\n')
    .trim();
  return cleaned;
}

// ── Excel mode ────────────────────────────────────────────────────────────────

function ExcelMode() {
  const [rows, setRows] = useState(null);
  const [columns, setColumns] = useState([]);
  const [targetCol, setTargetCol] = useState('');
  const [fileName, setFileName] = useState('');
  const [cleaned, setCleaned] = useState(false);
  const [stats, setStats] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setCleaned(false);
    setStats(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rawRows.length === 0) return;
      const cols = Object.keys(rawRows[0]);
      setColumns(cols);
      setRows(rawRows);
      // Auto-select WebDescr if present
      const auto = cols.find(c => /webdescr/i.test(c) || /web_descr/i.test(c) || /description/i.test(c));
      setTargetCol(auto || cols[0]);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleClean = useCallback(() => {
    if (!rows || !targetCol) return;
    let changed = 0;
    const cleaned = rows.map(row => {
      const orig = String(row[targetCol] ?? '');
      const result = cleanHtml(orig);
      if (orig !== result) changed++;
      return { ...row, [targetCol]: result };
    });
    setRows(cleaned);
    setCleaned(true);
    setStats({ total: rows.length, changed });
  }, [rows, targetCol]);

  const handleExport = useCallback(() => {
    if (!rows) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const outName = fileName.replace(/\.(xlsx|xls)$/i, '_cleaned.xlsx');
    XLSX.writeFile(wb, outName);
  }, [rows, fileName]);

  const handleReset = () => {
    setRows(null);
    setColumns([]);
    setTargetCol('');
    setFileName('');
    setCleaned(false);
    setStats(null);
  };

  return (
    <div>
      {!rows ? (
        <div style={{
          border: '2px dashed var(--border)',
          borderRadius: 12,
          padding: '48px 32px',
          textAlign: 'center',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
            Upload your catalog spreadsheet
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            The WebDescr (or any HTML-containing) column will be cleaned automatically.
          </div>
          <label style={{
            display: 'inline-block',
            background: 'var(--accent-purple)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            padding: '10px 24px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Choose Excel File (.xlsx)
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
          </label>
        </div>
      ) : (
        <div>
          {/* File loaded state */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: 'var(--accent-green)' }}>● {fileName}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rows.length.toLocaleString()} rows · {columns.length} columns</span>
            <button onClick={handleReset} style={{
              marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text-muted)', padding: '4px 12px', fontSize: 11,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Change file
            </button>
          </div>

          {/* Column selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Column to clean
            </label>
            <select
              value={targetCol}
              onChange={e => { setTargetCol(e.target.value); setCleaned(false); setStats(null); }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                padding: '8px 12px',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
                minWidth: 240,
              }}
            >
              {columns.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Preview sample */}
          {!cleaned && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Sample (first row)
              </div>
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 12,
                color: 'var(--text-muted)',
                maxHeight: 120,
                overflow: 'auto',
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}>
                {String(rows[0]?.[targetCol] || '(empty)').slice(0, 600)}
              </div>
            </div>
          )}

          {/* Stats after cleaning */}
          {cleaned && stats && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(63,185,80,0.08)',
              border: '1px solid rgba(63,185,80,0.3)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--accent-green)',
              marginBottom: 20,
            }}>
              ✓ Cleaned {stats.changed.toLocaleString()} of {stats.total.toLocaleString()} rows
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!cleaned ? (
              <button onClick={handleClean} style={{
                background: 'var(--accent-purple)', border: 'none', borderRadius: 8,
                color: '#fff', padding: '10px 24px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Clean "{targetCol}" →
              </button>
            ) : (
              <button onClick={handleExport} style={{
                background: 'var(--accent-green)', border: 'none', borderRadius: 8,
                color: '#fff', padding: '10px 24px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ↓ Export Cleaned Excel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Text mode ─────────────────────────────────────────────────────────────────

function TextMode() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleClean = useCallback(() => {
    setOutput(cleanHtml(input));
    setCopied(false);
  }, [input]);

  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output]);

  const textareaStyle = {
    width: '100%',
    minHeight: 280,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontFamily: 'DM Mono, monospace',
    fontSize: 13,
    padding: '14px 16px',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.6,
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Input (HTML)
        </div>
        <textarea
          style={textareaStyle}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste HTML content here…"
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={handleClean} style={{
            background: 'var(--accent-purple)', border: 'none', borderRadius: 6,
            color: '#fff', padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Clean →
          </button>
          <button onClick={() => { setInput(''); setOutput(''); }} style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-muted)', padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Clear
          </button>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Output (clean text)
          </span>
          {output && (
            <button onClick={handleCopy} style={{
              background: copied ? 'rgba(63,185,80,0.15)' : 'transparent',
              border: `1px solid ${copied ? 'var(--accent-green)' : 'var(--border)'}`,
              borderRadius: 6,
              color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
              padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          )}
        </div>
        <textarea
          style={{ ...textareaStyle, color: output ? 'var(--text-primary)' : 'var(--text-muted)' }}
          value={output}
          readOnly
          placeholder="Cleaned output will appear here…"
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CatalogCleanerPage() {
  const [mode, setMode] = useState('excel');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SectionHeader
        title="Catalog Cleaner"
        subtitle="Strip HTML from WebDescr and export a clean spreadsheet"
      />

      <div style={{ padding: '32px', maxWidth: 900, width: '100%', alignSelf: 'flex-start' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {['excel', 'text'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? 'rgba(188,140,255,0.15)' : 'transparent',
                border: `1px solid ${mode === m ? 'var(--accent-purple)' : 'var(--border)'}`,
                borderRadius: 8,
                color: mode === m ? 'var(--accent-purple)' : 'var(--text-muted)',
                padding: '7px 18px',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.1s',
              }}
            >
              {m === 'excel' ? '📂 Excel Mode' : '📝 Text / Paste Mode'}
            </button>
          ))}
        </div>

        {mode === 'excel' ? <ExcelMode /> : <TextMode />}
      </div>
    </div>
  );
}
