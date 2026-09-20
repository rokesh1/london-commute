export const COLORS = {
  bakerloo: '#B36305', central: '#E32017', circle: '#FFD300', district: '#00782A',
  dlr: '#00A4A7', elizabeth: '#6950A1', 'hammersmith-city': '#F3A9BB', jubilee: '#A0A5A9',
  metropolitan: '#9B0056', northern: '#242527', piccadilly: '#003688', victoria: '#0098D4', 'waterloo-city': '#95CDBA'
};
export const londonDate = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export function summarize(samples, id, now = Date.now()) {
  const valid = samples.filter(s => Number.isFinite(Date.parse(s.at)) && now - Date.parse(s.at) <= 7 * 86400000 && Date.parse(s.at) <= now && typeof s.lines?.[id] === 'string');
  const observed = valid.filter(s => s.lines[id] !== 'unknown');
  const good = observed.filter(s => s.lines[id] === 'good').length;
  return { total: valid.length, known: observed.length, good, percent: observed.length ? Math.round(good / observed.length * 100) : null };
}
export function filterLines(lines, { mode, search, saved }) {
  return lines.filter(line => (mode !== 'saved' || saved.includes(line.id)) && (mode !== 'issues' || line.state !== 'good') && line.name.toLowerCase().includes(search.toLowerCase().trim()));
}
