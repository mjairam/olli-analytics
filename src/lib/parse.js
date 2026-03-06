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
  const order = { 'summer a': 1, 'summer b': 2, 'fall': 3, 'spring': 4 };
  return `${yr}-${order[season] ?? 9}`;
}

export function sortedTerms(terms) {
  return [...terms].sort((a, b) => termSortKey(a).localeCompare(termSortKey(b)));
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseRawData(rawRows) {
  const classRecs = [], memRecs = [], membershipMap = {};

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
      // If SKU is malformed and we can't determine type, fall back based on admin unit
      const weekGroup = wg ? wg.key : (au === 'Onetime Lectures' ? '1day' : null);
      classRecs.push({
        profileId: r.ProfileId, firstName: r.FirstName||'', lastName: r.LastName||'',
        email: r.email||'', address1: r.address1||'', city: r.city||'',
        state: r.state||'', zip: r.zipcode||'', county: r.County||'',
        term: r.Term||'', buildingCity: normCampus(r.BuildingCity||''),
        title: r.Title||'', lectureType: lt,
        weekGroup, classId: r.ClassID,
        netAmount: typeof r.NetAmount==='number' ? r.NetAmount : parseFloat(r.NetAmount)||0,
        enrollDate: excelDateToISO(r.EnrollmentDate),
      });
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

  return { classRecs, memRecs, membershipMap, memSkus, classMap, terms, campuses, memYears };
}

// ─── Membership Helpers ───────────────────────────────────────────────────────

/**
 * Get deduplicated member profileIds for a given year+campus filter.
 * Dedup: if a profileId appears multiple times, keep earliest enrollDate.
 */
export function getMemberSet(memRecs, year, campus) {
  const byProfile = {};
  memRecs.forEach(r => {
    if (year && year !== 'ALL' && r.year !== year) return;
    if (campus && campus !== 'ALL' && r.campus !== campus) return;
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
