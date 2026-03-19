// ─── Lecture Type Constants ───────────────────────────────────────────────────

export const VALID_LTS = ['L1','L3','L4','L4J','L6','L7','L8','L9','S1','S1JR','S4','S6','S9','G1','G4','G6','G8','G9','X1','EX','L'];

export const LT_WEEKS = {
  L1:0, S1:0, S1JR:0, G1:0,
  X1:'EX',
  L3:3, L4:4, L4J:4, S4:4, G4:4,
  L6:6, S6:6, G6:6, L7:7,
  L8:8, G8:8, L9:9, S9:9, G9:9,
  EX:'EX', L:0,
};

export const WEEK_GROUPS = [
  { key:'1day',  label:'1-Day',     match: w => w === 0 },
  { key:'3wk',   label:'3-Week',    match: w => w === 3 },
  { key:'4wk',   label:'4-Week',    match: w => w === 4 },
  { key:'6wk',   label:'6-Week',    match: w => w === 6 },
  { key:'7wk',   label:'7-Week',    match: w => w === 7 },
  { key:'8wk',   label:'8-Week',    match: w => w === 8 },
  { key:'9wk',   label:'9-Week',    match: w => w === 9 },
  { key:'excur', label:'Excursion', match: w => w === 'EX' },
  { key:'other', label:'Other',     match: w => w == null },
];

// ─── Core Parsing Helpers ─────────────────────────────────────────────────────

export function extractLT(sku) {
  if (!sku) return '';
  const s = String(sku);
  for (const lt of [...VALID_LTS].sort((a,b) => b.length-a.length)) {
    const re = new RegExp('(?<=\\d)' + lt.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '(?=[A-Z]|$)');
    if (re.test(s)) return lt;
  }
  return '';
}

export function getWeekGroup(lt) {
  if (!lt) return null;
  const w = LT_WEEKS[lt];
  return w === undefined ? null : w;
}

export function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.slice(0,10);
  if (val instanceof Date) return val.toISOString().slice(0,10);
  return new Date(Math.round((val-25569)*86400*1000)).toISOString().slice(0,10);
}

export function parseMem(sku) {
  if (!sku) return null;
  const m = String(sku).match(/^MEM\s+(\d{2}-\d{2})\s+(.+)$/i);
  if (!m) return null;
  return { year: m[1], campus: m[2].trim(), full: sku };
}

export const BOCA_GROUP = new Set(['Boca','Boca Raton','Delray Beach']);

export function normCampus(raw) {
  if (!raw) return raw;
  if (BOCA_GROUP.has(raw.trim())) return 'Boca Raton';
  return raw.trim();
}

export function priorSemester(term) {
  if (!term || term === 'ALL') return null;
  return term.replace(/(\d{2})$/, (_, yr) => String(parseInt(yr) - 1).padStart(2, '0'));
}

// ─── Term Sorting ─────────────────────────────────────────────────────────────

// Summer A < Summer B < Fall < Spring within each year number
export function termSortKey(term) {
  if (!term) return '';
  const m = term.match(/^(Spring|Fall|Summer [AB])\s+(\d{2})$/i);
  if (!m) return term;
  const season = m[1].toLowerCase();
  const yr = m[2];
  // Chronological within calendar year: Spring(1) → Summer A(2) → Summer B(3) → Fall(4)
  const order = { 'spring': 1, 'summer a': 2, 'summer b': 3, 'fall': 4 };
  return `${yr}-${order[season] ?? 9}`;
}

export function sortedTerms(terms) {
  return [...terms].sort((a, b) => termSortKey(a).localeCompare(termSortKey(b)));
}

/**
 * Returns the fiscal year label for a term.
 * FY starts at Summer B: Summer B(N), Fall(N), Spring(N+1), Summer A(N+1) → "FY NN/NN+1"
 */
export function getFiscalYear(term) {
  if (!term) return null;
  const m = term.match(/^(Spring|Fall|Summer [AB])\s+(\d{2})$/i);
  if (!m) return null;
  const season = m[1].toLowerCase();
  const yr = parseInt(m[2], 10);
  // Summer B and Fall belong to FY yr/(yr+1)
  // Spring and Summer A belong to FY (yr-1)/yr
  const fyStart = (season === 'summer b' || season === 'fall') ? yr : yr - 1;
  const fyEnd = (fyStart + 1) % 100;
  return `FY ${String(fyStart).padStart(2, '0')}/${String(fyEnd).padStart(2, '0')}`;
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseRawData(rawRows) {
  const classRecs = [], memRecs = [], membershipMap = {};
  const droppedByUnit = {}; // tracks unrecognized AdminUnit values

  rawRows.forEach(r => {
    const au = r.AdminUnit || '';
    if (au === 'Membership' && r.sku && String(r.sku).startsWith('MEM')) {
      const m = parseMem(String(r.sku));
      if (m) {
        const sku = String(r.sku);
        if (!membershipMap[sku]) membershipMap[sku] = [];
        membershipMap[sku].push(r.ProfileId);
        memRecs.push({
          profileId: r.ProfileId, firstName: r.FirstName||'', lastName: r.LastName||'',
          email: r.email||'', address1: r.address1||'', city: r.city||'',
          state: r.state||'', zip: r.zipcode||'', county: r.County||'',
          sku, enrollDate: excelDateToISO(r.EnrollmentDate),
          campus: normCampus(m.campus), year: m.year,
        });
      }
    } else if (au === 'Onetime Lectures' || au === 'Multiweek Courses') {
      const lt = extractLT(r.sku);
      const wg = WEEK_GROUPS.find(g => g.match(getWeekGroup(lt)));
      const rawGroup = wg ? wg.key : 'other';
      // Onetime Lectures with an unreadable SKU are still 1-day events
      const weekGroup = (rawGroup === 'other' && au === 'Onetime Lectures') ? '1day' : rawGroup;
      classRecs.push({
        profileId: r.ProfileId, firstName: r.FirstName||'', lastName: r.LastName||'',
        email: r.email||'', address1: r.address1||'', city: r.city||'',
        state: r.state||'', zip: r.zipcode||'', county: r.County||'',
        term: r.Term||'', buildingCity: normCampus(r.BuildingCity||''),
        title: r.Title||'', lectureType: lt,
        weekGroup, classId: r.ClassID,
        instructor: r.InstructorName || r.Instructor ||
          ([r.InstructorLast, r.InstructorFirst].filter(Boolean).join(', ')) || '',
        netAmount: typeof r.NetAmount==='number' ? r.NetAmount : parseFloat(r.NetAmount)||0,
        enrollDate: excelDateToISO(r.EnrollmentDate),
        startDate: excelDateToISO(r.ClassStart || r.StartDate || r.ClassStartDate || r.MeetingStart || ''),
        endDate:   excelDateToISO(r.ClassEnd   || r.EndDate   || r.ClassEndDate   || r.MeetingEnd   || ''),
      });
    } else {
      // Row has an unrecognized AdminUnit — track it so we can warn the user
      const key = au || '(blank)';
      droppedByUnit[key] = (droppedByUnit[key] || 0) + 1;
    }
  });

  const memSkus = Object.keys(membershipMap).sort();

  const classMap = {};
  classRecs.forEach(r => {
    if (!r.classId || classMap[r.classId]) return;
    classMap[r.classId] = { term: r.term, buildingCity: r.buildingCity, lectureType: r.lectureType };
  });

  // Derive term list
  const termSet = new Set(classRecs.map(r => r.term).filter(Boolean));
  const terms = sortedTerms([...termSet]);

  // Derive campus list from classRecs
  const campusSet = new Set(classRecs.map(r => r.buildingCity).filter(Boolean));
  const campuses = [...campusSet].sort();

  // Membership years
  const memYearSet = new Set(memRecs.map(r => r.year).filter(Boolean));
  const memYears = [...memYearSet].sort().reverse();

  const totalDropped = Object.values(droppedByUnit).reduce((a, b) => a + b, 0);
  const blankTermRows = classRecs.filter(r => !r.term).length;
  const diagnostics = {
    totalRows: rawRows.length,
    classRows: classRecs.length,
    memRows: memRecs.length,
    droppedRows: totalDropped,
    droppedByUnit,
    blankTermRows, // class records that have no Term and won't appear in any column
  };

  return { classRecs, memRecs, membershipMap, memSkus, classMap, terms, campuses, memYears, diagnostics };
}

// ─── Membership Helpers ───────────────────────────────────────────────────────

/**
 * Get deduplicated member profileIds for a given year+campus filter.
 * Dedup: if a profileId appears multiple times, keep earliest enrollDate.
 * Optional cutoffDate excludes members who enrolled after that date.
 */
export function getMemberSet(memRecs, year, campus, cutoffDate = null) {
  const byProfile = {};
  memRecs.forEach(r => {
    if (year && year !== 'ALL' && r.year !== year) return;
    if (campus && campus !== 'ALL' && r.campus !== campus) return;
    if (cutoffDate && r.enrollDate > cutoffDate) return;
    if (!byProfile[r.profileId] || r.enrollDate < byProfile[r.profileId]) {
      byProfile[r.profileId] = r.enrollDate;
    }
  });
  return new Set(Object.keys(byProfile));
}

/**
 * Filter classRecs by term, campus, lectureType, cutoffDate
 */
export function filterClassRecs(classRecs, { term, campus, lectureType, cutoffDate } = {}) {
  return classRecs.filter(r => {
    if (term && term !== 'ALL' && r.term !== term) return false;
    if (campus && campus !== 'ALL' && r.buildingCity !== campus) return false;
    if (lectureType && lectureType !== 'ALL' && r.lectureType !== lectureType) return false;
    if (cutoffDate && r.enrollDate > cutoffDate) return false;
    return true;
  });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function toCSV(rows, cols) {
  const header = cols.map(c => `"${c.label ?? c.key}"`).join(',');
  const body = rows.map(row =>
    cols.map(c => {
      const v = row[c.key] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  return header + '\n' + body;
}

export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(1) + '%';
}

// ─── Summary Consolidation Helpers ───────────────────────────────────────────

/**
 * Consolidates "Summer A YY" and "Summer B YY" into "Summer YY".
 * All other terms are returned unchanged.
 */
export function consolidateTerm(term) {
  if (!term) return term;
  const m = term.match(/^Summer [AB]\s+(\d{2})$/i);
  return m ? `Summer ${m[1]}` : term;
}

/**
 * Fiscal year for consolidated summary terms (no A/B suffix).
 * "Summer YY" and "Fall YY" → FY YY/(YY+1)
 * "Spring YY" → FY (YY-1)/YY
 * Falls back to getFiscalYear() for original A/B terms.
 */
export function getFiscalYearSummary(term) {
  if (!term) return null;
  const orig = getFiscalYear(term);
  if (orig) return orig;
  const m = term.match(/^(Spring|Fall|Summer)\s+(\d{2})$/i);
  if (!m) return null;
  const season = m[1].toLowerCase();
  const yr = parseInt(m[2], 10);
  const fyStart = (season === 'summer' || season === 'fall') ? yr : yr - 1;
  const fyEnd = (fyStart + 1) % 100;
  return `FY ${String(fyStart).padStart(2, '0')}/${String(fyEnd).padStart(2, '0')}`;
}

/**
 * Sort key for consolidated summary terms.
 * Within each FY: Summer(1) → Fall(2) → Spring(3)
 */
export function termSortKeySummary(term) {
  if (!term) return '';
  const m = term.match(/^(Spring|Fall|Summer)\s+(\d{2})$/i);
  if (!m) return term;
  const season = m[1].toLowerCase();
  const yr = parseInt(m[2], 10);
  const fyStart = (season === 'summer' || season === 'fall') ? yr : yr - 1;
  const pos = season === 'summer' ? 1 : season === 'fall' ? 2 : 3;
  return `${String(fyStart).padStart(2, '0')}-${pos}`;
}

/**
 * Returns the same calendar date one year prior (YYYY-MM-DD format).
 */
export function priorYearDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(y) - 1}-${m}-${d}`;
}

export function fmtChange(curr, prior) {
  if (prior == null || prior === 0) {
    return curr > 0 ? { text: 'NEW', color: 'yellow' } : { text: '—', color: 'muted' };
  }
  const pct = ((curr - prior) / prior) * 100;
  const sign = pct >= 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(1)}%`,
    color: pct >= 0 ? 'green' : 'red',
  };
}
