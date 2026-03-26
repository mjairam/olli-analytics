import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { SectionHeader } from '../../components/SectionHeader';

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function parseDateCell(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  const s = String(val);
  // "M/D/YYYY HH:MM" or "M/D/YYYY"
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`;
  // "YYYY-MM-DD"
  const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return m2[1];
  return null;
}

function formatDateDisplay(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

function formatDateTime(val) {
  if (!val) return '—';
  if (val instanceof Date) {
    return val.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return String(val);
}

function formatCurrency(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── File Upload Zone ─────────────────────────────────────────────────────────

function UploadZone({ onLoad }) {
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      onLoad(rows, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent-yellow)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '64px 80px',
        textAlign: 'center',
        background: dragging ? 'rgba(227,179,65,0.06)' : 'var(--bg-surface)',
        transition: 'all 0.15s',
        minWidth: 320,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>💳</div>
      <p style={{ color: 'var(--text-primary)', fontSize: 15, marginBottom: 8, fontWeight: 500 }}>
        Drop your Transactions file here
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>
        Refreshable Transactions .xlsx
      </p>
      <label style={{
        display: 'inline-block',
        padding: '8px 20px',
        background: 'transparent',
        border: '1px solid var(--accent-yellow)',
        color: 'var(--accent-yellow)',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 13,
      }}>
        Browse file
        <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      </label>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPI({ label, value, color, note }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 200,
      background: 'var(--bg-surface)',
      border: `1px solid ${color}44`,
      borderRadius: 12,
      padding: '22px 24px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{note}</div>}
    </div>
  );
}

// ─── Transaction Table ────────────────────────────────────────────────────────

const TABLE_COLS = [
  { key: 'PaymentID',   label: 'Payment ID' },
  { key: '_name',       label: 'Name' },
  { key: 'PayType',     label: 'Card Type' },
  { key: 'Amount',      label: 'Amount',     money: true },
  { key: 'OrderNumber', label: 'Order #' },
  { key: '_date',       label: 'Date / Time' },
];

function TxTable({ rows, accentColor, emptyMsg }) {
  if (!rows || rows.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>{emptyMsg}</div>;
  }

  const thStyle = {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    background: 'var(--bg-surface)',
  };

  const tdStyle = {
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {TABLE_COLS.map(c => <th key={c.key} style={thStyle}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
              {TABLE_COLS.map(c => {
                const v = row[c.key];
                const isAmount = c.money;
                return (
                  <td key={c.key} style={{
                    ...tdStyle,
                    color: isAmount ? accentColor : 'var(--text-primary)',
                    fontWeight: isAmount ? 600 : 400,
                  }}>
                    {isAmount ? formatCurrency(v) : (v ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── XLSX Export ──────────────────────────────────────────────────────────────

function buildExportWorkbook({ date, revenue, refundTotal, net, refundRows, paidRows }) {
  const wb = XLSXStyle.utils.book_new();
  const ws = {};
  const merges = [];

  const put = (col, row, v, t, style) => {
    ws[`${col}${row}`] = { v: v ?? '', t: t || (typeof v === 'number' ? 'n' : 's'), s: style || {} };
  };

  const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const HEADERS = ['Payment ID', 'Name', 'Card Type', 'Amount', 'Order #', 'Date / Time'];

  const headerStyle = (color) => ({
    font: { bold: true, sz: 11, color: { rgb: color || 'FFFFFF' } },
    fill: { fgColor: { rgb: color === 'FFFFFF' ? '1F2937' : (color === 'F85149' ? '4A1A1A' : '1A3A1A') } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: '374151' } },
    },
  });

  const numFmt = { numFmt: '#,##0.00' };
  const kpiLabelStyle = { font: { bold: true, sz: 11 }, alignment: { horizontal: 'left' } };
  const kpiValueStyle = (color) => ({ font: { bold: true, sz: 13, color: { rgb: color } }, alignment: { horizontal: 'right' }, ...numFmt });

  // ─── Row 1: Title ────────────────────────────────────────────────────────
  put('A', 1, `Daily Reconciliation — ${formatDateDisplay(date)}`, 's', { font: { bold: true, sz: 14 }, alignment: { horizontal: 'left' } });
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  // ─── Rows 3-5: KPI summary ───────────────────────────────────────────────
  put('A', 3, 'Revenue', 's', kpiLabelStyle);
  put('B', 3, revenue, 'n', kpiValueStyle('3FB950'));
  put('D', 3, 'Refunds', 's', kpiLabelStyle);
  put('E', 3, refundTotal, 'n', kpiValueStyle('F85149'));

  put('A', 4, 'Net Total', 's', kpiLabelStyle);
  put('B', 4, net, 'n', kpiValueStyle(net >= 0 ? '3FB950' : 'F85149'));

  // ─── Refunds section ─────────────────────────────────────────────────────
  const refundStart = 7;
  put('A', refundStart - 1, `Refunds  (${refundRows.length})`, 's', {
    font: { bold: true, sz: 12, color: { rgb: 'F85149' } },
    alignment: { horizontal: 'left' },
  });
  merges.push({ s: { r: refundStart - 2, c: 0 }, e: { r: refundStart - 2, c: 5 } });

  HEADERS.forEach((h, i) => put(COLS[i], refundStart, h, 's', headerStyle('F87171')));

  refundRows.forEach((row, ri) => {
    const r = refundStart + 1 + ri;
    const bg = ri % 2 === 0 ? 'FFFFFF' : 'FEF2F2';
    const rowStyle = { fill: { fgColor: { rgb: bg } }, font: { sz: 11 }, alignment: { horizontal: 'left' } };
    put('A', r, row.PaymentID, 's', rowStyle);
    put('B', r, row._name, 's', rowStyle);
    put('C', r, row.PayType, 's', rowStyle);
    ws[`D${r}`] = { v: row.Amount || 0, t: 'n', s: { ...rowStyle, ...numFmt, font: { sz: 11, color: { rgb: 'DC2626' } } } };
    put('E', r, row.OrderNumber, 's', rowStyle);
    put('F', r, row._date, 's', rowStyle);
  });

  // ─── Paid section ────────────────────────────────────────────────────────
  const paidStart = refundStart + refundRows.length + 3;
  put('A', paidStart - 1, `Paid Transactions  (${paidRows.length})`, 's', {
    font: { bold: true, sz: 12, color: { rgb: '3FB950' } },
    alignment: { horizontal: 'left' },
  });
  merges.push({ s: { r: paidStart - 2, c: 0 }, e: { r: paidStart - 2, c: 5 } });

  HEADERS.forEach((h, i) => put(COLS[i], paidStart, h, 's', headerStyle('6EE7B7')));

  paidRows.forEach((row, ri) => {
    const r = paidStart + 1 + ri;
    const bg = ri % 2 === 0 ? 'FFFFFF' : 'F0FFF4';
    const rowStyle = { fill: { fgColor: { rgb: bg } }, font: { sz: 11 }, alignment: { horizontal: 'left' } };
    put('A', r, row.PaymentID, 's', rowStyle);
    put('B', r, row._name, 's', rowStyle);
    put('C', r, row.PayType, 's', rowStyle);
    ws[`D${r}`] = { v: row.Amount || 0, t: 'n', s: { ...rowStyle, ...numFmt, font: { sz: 11, color: { rgb: '16A34A' } } } };
    put('E', r, row.OrderNumber, 's', rowStyle);
    put('F', r, row._date, 's', rowStyle);
  });

  const lastRow = paidStart + paidRows.length + 1;
  ws['!ref'] = `A1:F${lastRow}`;
  ws['!cols'] = [
    { wch: 12 }, // Payment ID
    { wch: 24 }, // Name
    { wch: 12 }, // Card Type
    { wch: 12 }, // Amount
    { wch: 12 }, // Order #
    { wch: 22 }, // Date
  ];
  ws['!rows'] = [{ hpt: 24 }];
  ws['!merges'] = merges;

  XLSXStyle.utils.book_append_sheet(wb, ws, 'Reconciliation');
  return wb;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const [rawRows, setRawRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [results, setResults] = useState(null);

  const handleLoad = useCallback((rows, name) => {
    setRawRows(rows);
    setFileName(name);
    setResults(null);
    setSelectedDate('');
  }, []);

  const handleReset = () => {
    setRawRows(null);
    setFileName('');
    setSelectedDate('');
    setResults(null);
  };

  const handleReconcile = () => {
    if (!rawRows || !selectedDate) return;

    const paid = [];
    const refunds = [];

    rawRows.forEach(row => {
      const status = String(row.PayStatus || '').trim();
      const amount = typeof row.Amount === 'number' ? row.Amount : parseFloat(row.Amount) || 0;

      if (status === 'Paid') {
        const d = parseDateCell(row.PaidDate);
        if (d === selectedDate) {
          paid.push({
            ...row,
            Amount: amount,
            _name: `${row.FirstName || ''} ${row.LastName || ''}`.trim(),
            _date: formatDateTime(row.PaidDate),
          });
        }
      } else if (status === 'Refunded') {
        const d = parseDateCell(row.PaidDate);
        if (d === selectedDate) {
          refunds.push({
            ...row,
            Amount: amount,
            _name: `${row.FirstName || ''} ${row.LastName || ''}`.trim(),
            _date: formatDateTime(row.PaidDate),
          });
        }
      }
    });

    // Sort both by their relevant time descending
    paid.sort((a, b) => String(b.PaidDate).localeCompare(String(a.PaidDate)));
    refunds.sort((a, b) => String(b.ModifiedDate).localeCompare(String(a.ModifiedDate)));

    const revenue = paid.reduce((s, r) => s + r.Amount, 0);
    const refundTotal = refunds.reduce((s, r) => s + r.Amount, 0);

    setResults({ paid, refunds, revenue, refundTotal, net: revenue - refundTotal });
  };

  const handleExport = () => {
    if (!results) return;
    const wb = buildExportWorkbook({
      date: selectedDate,
      revenue: results.revenue,
      refundTotal: results.refundTotal,
      net: results.net,
      refundRows: results.refunds,
      paidRows: results.paid,
    });
    XLSXStyle.writeFile(wb, `reconciliation_${selectedDate}.xlsx`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SectionHeader
        title="Daily Reconciliation Tool"
        subtitle="Summarize daily revenue and refunds from your transactions export"
      />

      <div style={{ padding: '32px', maxWidth: 1100, width: '100%' }}>

        {/* ── File Upload ─────────────────────────────────────────────────── */}
        {!rawRows ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <UploadZone onLoad={handleLoad} />
          </div>
        ) : (
          <>
            {/* ── File info bar ─────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 18px', background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 12, color: 'var(--accent-green)' }}>● {fileName}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {rawRows.length.toLocaleString()} transactions loaded
              </span>
              <button onClick={handleReset} style={{
                marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-muted)', padding: '4px 12px',
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Change file
              </button>
            </div>

            {/* ── Date picker + Reconcile ───────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date to reconcile
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); setResults(null); }}
                  style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)', padding: '9px 14px',
                    fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              <button
                onClick={handleReconcile}
                disabled={!selectedDate}
                style={{
                  background: selectedDate ? 'var(--accent-yellow)' : 'var(--border)',
                  border: 'none', borderRadius: 8,
                  color: selectedDate ? '#0d1117' : 'var(--text-muted)',
                  padding: '9px 26px', fontSize: 13, fontWeight: 700,
                  cursor: selectedDate ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                Reconcile →
              </button>

              {results && (
                <button
                  onClick={handleExport}
                  style={{
                    background: 'transparent', border: '1px solid var(--accent-yellow)',
                    borderRadius: 8, color: 'var(--accent-yellow)',
                    padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ↓ Export XLSX
                </button>
              )}
            </div>

            {/* ── Results ──────────────────────────────────────────────── */}
            {results && (
              <>
                {/* KPI row */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
                  <KPI
                    label="Revenue"
                    value={formatCurrency(results.revenue)}
                    color="var(--accent-green)"
                    note={`${results.paid.length} paid transaction${results.paid.length !== 1 ? 's' : ''}`}
                  />
                  <KPI
                    label="Refunds"
                    value={formatCurrency(results.refundTotal)}
                    color="var(--accent-red)"
                    note={`${results.refunds.length} refund${results.refunds.length !== 1 ? 's' : ''}`}
                  />
                  <KPI
                    label="Net Total"
                    value={formatCurrency(results.net)}
                    color={results.net >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'}
                    note={`For ${formatDateDisplay(selectedDate)}`}
                  />
                </div>

                {/* Refunds table */}
                <div style={{ marginBottom: 36 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                    <h2 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 400, color: 'var(--accent-red)' }}>
                      Refunds
                    </h2>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {results.refunds.length} transaction{results.refunds.length !== 1 ? 's' : ''} · {formatCurrency(results.refundTotal)}
                    </span>
                  </div>
                  <TxTable
                    rows={results.refunds}
                    accentColor="var(--accent-red)"
                    emptyMsg="No refunds on this date."
                  />
                </div>

                {/* Paid table */}
                <div style={{ marginBottom: 36 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                    <h2 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 400, color: 'var(--accent-green)' }}>
                      Paid Transactions
                    </h2>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {results.paid.length} transaction{results.paid.length !== 1 ? 's' : ''} · {formatCurrency(results.revenue)}
                    </span>
                  </div>
                  <TxTable
                    rows={results.paid}
                    accentColor="var(--accent-green)"
                    emptyMsg="No paid transactions on this date."
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
