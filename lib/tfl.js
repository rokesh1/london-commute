export const ENDPOINT = 'https://api.tfl.gov.uk/Line/Mode/tube,dlr,elizabeth-line/Status';

// TfL severity codes are categories, not a numeric ranking.
export function classify(statuses) {
  if (!statuses.length) return 'unknown';
  if (statuses.some(s => [1, 2, 3, 4, 5, 6, 7, 16, 20].includes(s.code))) return 'disrupted';
  if (statuses.some(s => [8, 9].includes(s.code))) return 'delays';
  if (statuses.every(s => s.code === 10)) return 'good';
  return 'notice';
}

export function normalize(raw, fetchedAt = new Date().toISOString()) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Empty or invalid TfL response');
  const lines = raw.map(line => {
    if (typeof line.id !== 'string' || typeof line.name !== 'string' || !Array.isArray(line.lineStatuses)) {
      throw new Error('Unexpected TfL line schema');
    }
    const statuses = line.lineStatuses.map(s => ({
      code: s.statusSeverity,
      label: s.statusSeverityDescription || 'Status unavailable',
      reason: s.reason || '',
    }));
    return { id: line.id, name: line.name, mode: line.modeName, statuses, state: classify(statuses) };
  });
  return { fetchedAt, lines };
}

export async function fetchStatus() {
  const url = new URL(ENDPOINT);
  if (process.env.TFL_APP_KEY) url.searchParams.set('app_key', process.env.TFL_APP_KEY);
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`TfL returned ${response.status}`);
  return normalize(await response.json());
}
