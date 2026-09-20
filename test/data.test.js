import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, classify } from '../lib/tfl.js';
import { summarize, filterLines, londonDate } from '../public/model.js';

test('multiple notices cannot be hidden by a good-service entry', () => {
  const [line] = normalize([{ id: 'central', name: 'Central', lineStatuses: [
    { statusSeverity: 10, statusSeverityDescription: 'Good Service' },
    { statusSeverity: 5, statusSeverityDescription: 'Part Closure', reason: 'Closure details' }
  ] }]).lines;
  assert.equal(line.state, 'disrupted');
  assert.equal(line.statuses[1].reason, 'Closure details');
});
test('missing and unfamiliar statuses are never classified as good', () => {
  assert.equal(classify([]), 'unknown');
  assert.equal(classify([{ code: 99 }]), 'notice');
  assert.equal(classify([{ code: 9 }]), 'delays');
  assert.throws(() => normalize([]));
  assert.throws(() => normalize([{ id: 'central' }]));
});
test('history excludes missing, unknown, expired and future samples from its denominator', () => {
  const now = Date.parse('2026-09-20T12:00:00Z');
  const sample = (at, state) => ({ at, lines: state ? { central: state } : {} });
  const stats = summarize([
    sample('2026-09-20T11:00:00Z', 'good'), sample('2026-09-20T10:00:00Z', 'disrupted'),
    sample('2026-09-20T09:00:00Z', 'unknown'), sample('2026-09-20T08:00:00Z'),
    sample('2026-09-10T08:00:00Z', 'good'), sample('2026-09-21T08:00:00Z', 'good'),
    sample('invalid', 'good')
  ], 'central', now);
  assert.deepEqual(stats, { total: 3, known: 2, good: 1, percent: 50 });
  assert.equal(summarize([], 'central', now).percent, null);
});
test('dates are bucketed in London time, including daylight saving', () => {
  assert.equal(londonDate('2026-09-19T23:30:00Z'), '2026-09-20');
  assert.equal(londonDate('2026-12-19T23:30:00Z'), '2026-12-19');
});
test('filters combine saved lines, disruptions and case-insensitive search', () => {
  const lines = [{ id: 'central', name: 'Central', state: 'good' }, { id: 'district', name: 'District', state: 'disrupted' }];
  assert.equal(filterLines(lines, { mode: 'saved', saved: [], search: '' }).length, 0);
  assert.equal(filterLines(lines, { mode: 'issues', saved: [], search: '' })[0].id, 'district');
  assert.equal(filterLines(lines, { mode: 'all', saved: [], search: ' CENT ' })[0].id, 'central');
});
