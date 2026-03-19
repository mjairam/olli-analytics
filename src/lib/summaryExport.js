import XLSXStyle from 'xlsx-js-style';

// ─── Style Helpers ────────────────────────────────────────────────────────────

const BASE = { font: { sz: 11 } };

function s(overrides) {
  return { ...BASE, ...overrides };
}

const STYLES = {
  asOf:         s({ font: { bold: true, sz: 13 }, alignment: { horizontal: 'left', vertical: 'center' } }),
  metricLabel:  s({ alignment: { horizontal: 'left', vertical: 'center' } }),
  boldLabel:    s({ font: { bold: true, sz: 11 }, alignment: { horizontal: 'left', vertical: 'center' } }),
  colHeader:    s({ font: { bold: true, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }),
  fyHeader:     s({ font: { bold: true, sz: 11, color: { rgb: '1F7A2E' } }, fill: { fgColor: { rgb: 'C6EFCE' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }),
  ytdHeader:    s({ font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'BDD7EE' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { left: { style: 'medium', color: { rgb: '2F75B6' } } } }),
  currHeader:   s({ font: { bold: true, sz: 11, color: { rgb: '2F75B6' } }, fill: { fgColor: { rgb: 'DDEBF7' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }),
  num:          s({ alignment: { horizontal: 'right', vertical: 'center' } }),
  numBold:      s({ font: { bold: true, sz: 11 }, alignment: { horizontal: 'right', vertical: 'center' } }),
  fyNum:        s({ fill: { fgColor: { rgb: 'E2EFDA' } }, alignment: { horizontal: 'right', vertical: 'center' } }),
  fyNumBold:    s({ font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'E2EFDA' } }, alignment: { horizontal: 'right', vertical: 'center' } }),
  ytdNum:       s({ fill: { fgColor: { rgb: 'DDEBF7' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { left: { style: 'medium', color: { rgb: '2F75B6' } } } }),
  ytdNumBold:   s({ font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'DDEBF7' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { left: { style: 'medium', color: { rgb: '2F75B6' } } } }),
  currNum:      s({ fill: { fgColor: { rgb: 'DDEBF7' } }, alignment: { horizontal: 'right', vertical: 'center' } }),
  sideHeader:   s({ font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'BDD7EE' } }, alignment: { horizontal: 'center', vertical: 'center' } }),
  sideSubHdr:   s({ font: { bold: true, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }),
  sideLabel:    s({ font: { sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' } }),
  sideNum:      s({ font: { sz: 10 }, alignment: { horizontal: 'right', vertical: 'center' } }),
  note:         s({ font: { italic: true, sz: 9, color: { rgb: '767676' } }, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } }),
  blank:        s({ alignment: {} }),
};

// ─── Format Helpers ───────────────────────────────────────────────────────────

function fmtDateLong(iso) {
  if (!iso) return '';
  const months = ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
  const [y, m, d] = iso.split('-');
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

function fmtDateShort(iso) {
  // "2026-02-28" → "02/28/26"
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${String(y).slice(2)}`;
}

function fmtDateDisplay(iso) {
  // "2026-02-28" → "2/28/2026"
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

function colLetter(idx) {
  if (idx < 26) return String.fromCharCode(65 + idx);
  return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
}

// ─── Metric Row Definitions ───────────────────────────────────────────────────

const EXPORT_METRICS = [
  { key: 'totalReg',            label: 'Total Registration',                   bold: true },
  { key: 'num1day',             label: '# of 1-Day Lectures' },
  { key: 'reg1day',             label: '1-Day Registration' },
  { key: 'totalRegExcSS',       label: 'Total Registration Excluding SS',       bold: true },
  { key: 'pct1dayOfTotalExcSS', label: '1 Day Reg. % of Total (Exc SS)',        pct: true },
  { key: 'numSS',               label: 'Number of Special Speakers' },
  { key: 'regSS',               label: 'Special Speaker Registrations' },
  { key: 'num4wk',              label: 'Number of 4-Week Courses' },
  { key: 'reg4wk',              label: '4-Week Registration' },
  { key: 'num5wk',              label: 'Number of 5-Week Courses' },
  { key: 'reg5wk',              label: '5-Week Registration' },
  { key: 'num6wk',              label: 'Number of 6-Week Courses' },
  { key: 'reg6wk',              label: '6-Week Registration' },
  { key: 'num7wk',              label: 'Number of 7-Week Courses' },
  { key: 'reg7wk',              label: '7-Week Registration' },
  { key: 'num8wk',              label: 'Number of 8-Week Courses' },
  { key: 'reg8wk',              label: '8-Week Registration' },
  { key: 'num9wk',              label: 'Number of 9-Week Courses' },
  { key: 'reg9wk',              label: '9-Week Registration' },
  { key: 'numStudents',         label: 'Number of Students',                    noFY: true },
  { key: 'avgClasses',          label: 'Average Number of Classes per Student', noFY: true, decimal: true },
];

// ─── Main Export Function ─────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {Array}  opts.consolidatedCols   [{type:'term'|'fy'|'ytd', key, label, isCurrent}]
 * @param {object} opts.allMetrics         {key → {totalReg, num1day, ...}} for term, fy, ytd keys
 * @param {string} opts.cutoffDate         YYYY-MM-DD  (main cutoff, for "As of" label)
 * @param {string} opts.currentFY          e.g. 'FY 25/26'
 * @param {string} opts.priorFY            e.g. 'FY 24/25'
 * @param {number} opts.currentMemCount
 * @param {number} opts.priorMemCount
 * @param {string} opts.currentMemDate     YYYY-MM-DD
 * @param {string} opts.priorMemDate       YYYY-MM-DD
 * @param {string} opts.currentMemStart    YYYY-MM-DD (first enrollment date note)
 * @param {string} opts.priorMemStart      YYYY-MM-DD (first enrollment date note)
 * @param {number} opts.currentSpringReg
 * @param {number} opts.priorSpringReg
 * @param {string} opts.currentSpringDate  YYYY-MM-DD
 * @param {string} opts.priorSpringDate    YYYY-MM-DD
 */
export function exportSummaryXLSX({
  consolidatedCols,
  allMetrics,
  cutoffDate,
  currentFY,
  priorFY,
  currentMemCount,
  priorMemCount,
  currentMemDate,
  priorMemDate,
  currentMemStart,
  priorMemStart,
  currentSpringReg,
  priorSpringReg,
  currentSpringDate,
  priorSpringDate,
}) {
  const ws = {};
  const merges = [];

  const put = (colIdx, rowIdx, v, t, style) => {
    const addr = `${colLetter(colIdx)}${rowIdx}`;
    ws[addr] = { v: v ?? '', t: t || (typeof v === 'number' ? 'n' : 's'), s: style || STYLES.blank };
  };

  // Column 0 = A (metric labels), columns 1..N = data cols
  const numDataCols = consolidatedCols.length;

  // ─── Row 1: "As of [date]" ────────────────────────────────────────────────
  put(0, 1, cutoffDate ? `As of ${fmtDateLong(cutoffDate)}` : 'Summary Export', 's', STYLES.asOf);

  // ─── Row 2: Column headers ────────────────────────────────────────────────
  consolidatedCols.forEach((col, i) => {
    const hStyle = col.type === 'fy'  ? STYLES.fyHeader
                 : col.type === 'ytd' ? STYLES.ytdHeader
                 : col.isCurrent      ? STYLES.currHeader
                 :                      STYLES.colHeader;
    put(1 + i, 2, col.label, 's', hStyle);
  });

  // ─── Data rows (starting at row 3) ───────────────────────────────────────
  EXPORT_METRICS.forEach((metric, mi) => {
    const row = 3 + mi;
    put(0, row, metric.label, 's', metric.bold ? STYLES.boldLabel : STYLES.metricLabel);

    consolidatedCols.forEach((col, i) => {
      const isFyOrYtd = col.type === 'fy' || col.type === 'ytd';
      // numStudents / avgClasses intentionally blank for FY/YTD columns
      if (metric.noFY && isFyOrYtd) {
        put(1 + i, row, '', 's', col.type === 'fy' ? STYLES.fyNum : STYLES.ytdNum);
        return;
      }

      const metrics = allMetrics[col.key];
      const val = metrics?.[metric.key];

      const baseStyle = col.type === 'fy'  ? (metric.bold ? STYLES.fyNumBold  : STYLES.fyNum)
                      : col.type === 'ytd' ? (metric.bold ? STYLES.ytdNumBold : STYLES.ytdNum)
                      : col.isCurrent      ? STYLES.currNum
                      : metric.bold        ? STYLES.numBold
                      :                      STYLES.num;

      if (val == null) {
        put(1 + i, row, '', 's', baseStyle);
      } else if (metric.pct) {
        ws[`${colLetter(1 + i)}${row}`] = { v: val, t: 'n', s: { ...baseStyle, numFmt: '0.0%' } };
      } else if (metric.decimal) {
        ws[`${colLetter(1 + i)}${row}`] = { v: val, t: 'n', s: { ...baseStyle, numFmt: '0.00' } };
      } else {
        ws[`${colLetter(1 + i)}${row}`] = { v: val, t: 'n', s: { ...baseStyle, numFmt: '#,##0' } };
      }
    });
  });

  // ─── Side boxes ───────────────────────────────────────────────────────────
  // Start 2 columns after the last data column (one blank gap)
  const sideCol = 1 + numDataCols + 1; // 0-indexed column index

  const fyShort = (fy) => fy ? fy.replace('FY ', '') : '';

  // Membership box rows 1-7
  // Row 1: "Membership" header spanning 3 cols
  put(sideCol, 1, 'Membership', 's', STYLES.sideHeader);
  merges.push({ s: { r: 0, c: sideCol }, e: { r: 0, c: sideCol + 2 } });

  // Row 2: sub-headers
  put(sideCol,     2, 'Fiscal Year',               's', STYLES.sideSubHdr);
  put(sideCol + 1, 2, 'Membership',                's', STYLES.sideSubHdr);
  put(sideCol + 2, 2, 'Percent increase/decrease', 's', STYLES.sideSubHdr);

  // Row 3: current FY
  put(sideCol,     3, fyShort(currentFY), 's', STYLES.sideLabel);
  if (currentMemCount != null) {
    ws[`${colLetter(sideCol + 1)}3`] = { v: currentMemCount, t: 'n', s: { ...STYLES.sideNum, numFmt: '#,##0' } };
  }
  put(sideCol + 2, 3, '', 's', STYLES.sideNum);

  // Row 4: prior FY + pct change
  put(sideCol, 4, fyShort(priorFY), 's', STYLES.sideLabel);
  if (priorMemCount != null) {
    ws[`${colLetter(sideCol + 1)}4`] = { v: priorMemCount, t: 'n', s: { ...STYLES.sideNum, numFmt: '#,##0' } };
  }
  if (currentMemCount != null && priorMemCount != null && priorMemCount > 0) {
    const pct = ((currentMemCount - priorMemCount) / priorMemCount) * 100;
    ws[`${colLetter(sideCol + 2)}4`] = { v: pct, t: 'n', s: { ...STYLES.sideNum, numFmt: '0.00' } };
  }

  // Rows 5-6: notes
  if (currentMemStart && currentMemDate) {
    const note = `*${fyShort(currentFY)} figures from ${fmtDateDisplay(currentMemStart)}-${fmtDateDisplay(currentMemDate)}`;
    put(sideCol, 5, note, 's', STYLES.note);
    merges.push({ s: { r: 4, c: sideCol }, e: { r: 4, c: sideCol + 2 } });
  }
  if (priorMemStart && priorMemDate) {
    const note = `*${fyShort(priorFY)} figures from ${fmtDateDisplay(priorMemStart)}-${fmtDateDisplay(priorMemDate)}`;
    put(sideCol, 6, note, 's', STYLES.note);
    merges.push({ s: { r: 5, c: sideCol }, e: { r: 5, c: sideCol + 2 } });
  }

  // Spring Registration box rows 9-13
  const SBR = 9; // spring box start row
  const springLabel = cutoffDate
    ? `Spring Registration ${fmtDateShort(cutoffDate)}`
    : 'Spring Registration YoY';

  put(sideCol, SBR, springLabel, 's', STYLES.sideHeader);
  merges.push({ s: { r: SBR - 1, c: sideCol }, e: { r: SBR - 1, c: sideCol + 2 } });

  put(sideCol,     SBR + 1, 'Date',                    's', STYLES.sideSubHdr);
  put(sideCol + 1, SBR + 1, 'Registration',             's', STYLES.sideSubHdr);
  put(sideCol + 2, SBR + 1, 'Percent increase/decrease','s', STYLES.sideSubHdr);

  // Current spring row
  put(sideCol, SBR + 2, currentSpringDate ? fmtDateDisplay(currentSpringDate) : '', 's', STYLES.sideLabel);
  if (currentSpringReg != null) {
    ws[`${colLetter(sideCol + 1)}${SBR + 2}`] = { v: currentSpringReg, t: 'n', s: { ...STYLES.sideNum, numFmt: '#,##0' } };
  }
  put(sideCol + 2, SBR + 2, '', 's', STYLES.sideNum);

  // Prior spring row
  put(sideCol, SBR + 3, priorSpringDate ? fmtDateDisplay(priorSpringDate) : '', 's', STYLES.sideLabel);
  if (priorSpringReg != null) {
    ws[`${colLetter(sideCol + 1)}${SBR + 3}`] = { v: priorSpringReg, t: 'n', s: { ...STYLES.sideNum, numFmt: '#,##0' } };
  }
  if (currentSpringReg != null && priorSpringReg != null && priorSpringReg > 0) {
    const pct = ((currentSpringReg - priorSpringReg) / priorSpringReg) * 100;
    ws[`${colLetter(sideCol + 2)}${SBR + 3}`] = { v: pct, t: 'n', s: { ...STYLES.sideNum, numFmt: '0.00' } };
  }

  // ─── Sheet metadata ───────────────────────────────────────────────────────
  const lastDataRow = 2 + EXPORT_METRICS.length;
  const lastRow = Math.max(lastDataRow, SBR + 3);
  const lastColIdx = sideCol + 2;
  ws['!ref'] = `A1:${colLetter(lastColIdx)}${lastRow}`;

  // Column widths
  const colWidths = [{ wch: 36 }]; // A: metric label
  consolidatedCols.forEach(col => {
    const w = col.type === 'fy' ? 9 : col.type === 'ytd' ? 11 : col.isCurrent ? 12 : 9;
    colWidths.push({ wch: w });
  });
  colWidths.push({ wch: 2 });   // blank gap
  colWidths.push({ wch: 12 });  // Fiscal Year / Date
  colWidths.push({ wch: 12 });  // Membership / Registration
  colWidths.push({ wch: 12 });  // Percent
  ws['!cols'] = colWidths;

  // Row heights
  ws['!rows'] = [
    { hpt: 28 }, // row 1: As of date
    { hpt: 42 }, // row 2: term headers (wrapped text)
  ];

  ws['!merges'] = merges;

  // ─── Build workbook and download ──────────────────────────────────────────
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Summary');
  XLSXStyle.writeFile(wb, 'summary_export.xlsx');
}
