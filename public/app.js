import { COLORS, filterLines, summarize, londonDate } from './model.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const time = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const dateTime = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
let lines = [], samples = [], filter = 'all', fetchedAt = null, busy = false, historyFailed = false, scheduled = false;
let saved = [];
try { const stored = JSON.parse(localStorage.getItem('commute-lines') || '[]'); if (Array.isArray(stored)) saved = stored.filter(id => Object.hasOwn(COLORS, id)); } catch { /* Storage can be disabled in private browsing. */ }

$('#today').textContent = 'LONDON / ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();

function renderCommute() {
  const chosen = lines.filter(line => saved.includes(line.id));
  $('#saved-count').textContent = saved.length;
  $('#commute-lines').innerHTML = chosen.length ? chosen.map(line => `<span class="saved-chip"><i style="background:${COLORS[line.id] || '#777'}"></i>${escape(line.name)}</span>`).join('') : 'Save your lines using the + button below.';
  const affected = chosen.filter(line => line.state !== 'good');
  $('#commute-status').textContent = chosen.length ? (affected.length ? `${affected.length} of your ${chosen.length} saved lines have a notice. Check details below.` : 'Your saved lines are reporting good service.') : 'Your selection stays on this device. No account needed.';
}

function renderLines() {
  const open = new Set([...document.querySelectorAll('.line-card details[open]')].map(el => el.dataset.id));
  const visible = filterLines(lines, { mode: filter, search: $('#search').value, saved });
  $('#lines').innerHTML = visible.length ? visible.map(line => {
    const label = line.statuses.filter(s => s.code !== 10).map(s => s.label).join(' · ') || line.statuses[0]?.label || 'Status unavailable';
    return `<article class="line-card" style="--line-color:${COLORS[line.id] || '#777'}"><div class="line-card-top"><h3>${escape(line.name)}</h3><button class="save-button" data-save="${escape(line.id)}" aria-pressed="${saved.includes(line.id)}" aria-label="${saved.includes(line.id) ? 'Remove' : 'Save'} ${escape(line.name)} ${saved.includes(line.id) ? 'from' : 'to'} my commute">${saved.includes(line.id) ? '✓' : '+'}</button></div><details data-id="${escape(line.id)}" ${open.has(line.id) ? 'open' : ''}><summary aria-label="${escape(line.name)}: ${escape(label)}. Show details"><span class="status ${escape(line.state)}">${escape(label)}</span></summary><div class="status-detail">${line.statuses.map(s => `<p><strong>${escape(s.label)}</strong>${s.reason ? '<br>' + escape(s.reason) : ''}</p>`).join('') || '<p>TfL has not supplied a current status for this line.</p>'}<a href="https://tfl.gov.uk/tube-dlr-overground/status/" target="_blank" rel="noopener">More from TfL ↗</a></div></details></article>`;
  }).join('') : `<p class="empty">${filter === 'saved' && !saved.length ? 'No saved lines yet. Choose All lines, then use + to save your commute.' : 'No lines match this view. Try another filter or search.'}</p>`;
  renderCommute();
}

function updateAge() {
  if (!fetchedAt) return;
  const old = Date.now() - Date.parse(fetchedAt) > 180000;
  $('#updated').textContent = `${old ? 'Last received' : 'Updated'} ${time(fetchedAt)} London`;
  $('#live-label').textContent = old ? 'Older data' : 'Live feed';
  if (old) $('#commute-status').textContent = 'Status is more than three minutes old. Refresh before travelling.';
}

async function refresh() {
  if (busy) return;
  busy = true;
  $('#refresh').disabled = true;
  try {
    const response = await fetch('/api/status', { signal: AbortSignal.timeout(18000) });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.lines) || !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error(data.error || 'Unexpected response from TfL.');
    lines = data.lines;
    fetchedAt = data.fetchedAt;
    $('#error').hidden = true;
    const good = lines.filter(l => l.state === 'good').length;
    $('#good-count').textContent = good;
    $('#total-count').textContent = lines.length;
    $('#all-count').textContent = lines.length;
    $('#issues-count').textContent = lines.length - good;
    $('#network-caption').textContent = lines.length === good ? 'Good service across all monitored lines.' : `${lines.length - good} lines with delays, closures or other notices.`;
    $('#network-stripes').innerHTML = lines.map(l => `<span class="${escape(l.state)}"></span>`).join('');
    const selected = $('#history-line').value;
    $('#history-line').innerHTML = lines.map(l => `<option value="${escape(l.id)}">${escape(l.name)}</option>`).join('');
    $('#history-line').value = lines.some(l => l.id === selected) ? selected : lines[0].id;
    renderLines();
    renderHistory();
    updateAge();
  } catch (error) {
    $('#error').hidden = false;
    $('#error').textContent = `${error.name === 'TimeoutError' ? 'TfL took too long to respond.' : 'Live status could not be refreshed.'} ${fetchedAt ? 'Showing the last received status; check its timestamp.' : 'Please try Refresh or check TfL directly.'}`;
    if (!fetchedAt) {
      $('#lines').innerHTML = '<p class="empty">Live status is unavailable. <a href="https://tfl.gov.uk/tube-dlr-overground/status/">Check TfL service status ↗</a></p>';
      $('#network-caption').textContent = 'We couldn’t reach TfL. Please try again shortly.';
    }
    $('#live-label').textContent = 'Refresh failed';
  } finally { busy = false; $('#refresh').disabled = false; }
}

function renderHistory() {
  if (historyFailed) return;
  const id = $('#history-line').value;
  const name = lines.find(l => l.id === id)?.name || 'Central';
  $('#history-line-name').textContent = name + (['dlr', 'elizabeth'].includes(id) ? '' : ' line');
  const firstDay = new Date(londonDate(Date.now()) + 'T12:00:00Z');
  firstDay.setUTCDate(firstDay.getUTCDate() - 6);
  const displayedSamples = samples.filter(s => Number.isFinite(Date.parse(s.at)) && londonDate(s.at) >= londonDate(firstDay));
  const summary = summarize(displayedSamples, id);
  $('#history-score').innerHTML = `${summary.percent === null ? '—' : summary.percent + '%'}<small>good-service samples</small>`;
  $('#history-detail').textContent = summary.known ? `${summary.good} of ${summary.known} known-status observations reported good service. ${summary.total - summary.known ? `${summary.total - summary.known} unknown observations excluded. ` : ''}This measures snapshots, not journey punctuality.` : 'Observations are just getting started. Check back after the collector has run; no history is invented.';
  const timestamps = samples.map(s => Date.parse(s.at)).filter(Number.isFinite);
  const latest = timestamps.length ? Math.max(...timestamps) : null;
  $('#history-freshness').textContent = (latest ? `Latest sample: ${dateTime(latest)} London. ` : '') + (scheduled ? (latest && Date.now() - latest > 90 * 60000 ? 'Collection is delayed; gaps are not filled.' : 'Scheduled approximately every 30 minutes.') : 'Automatic collection is awaiting setup.');
  const today = londonDate(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => {
    // Noon UTC remains on the same London date, including DST transitions.
    const date = new Date(today + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() - 6 + i);
    return date;
  });
  $('#chart').innerHTML = days.map(day => {
    const key = londonDate(day);
    const daily = samples.filter(s => Number.isFinite(Date.parse(s.at)) && londonDate(s.at) === key);
    const stats = summarize(daily, id);
    const label = key === today ? 'Today' : new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short' }).format(day);
    const accessible = `${key}: ${stats.percent === null ? 'no known-status observations' : `${stats.percent}% good service, ${stats.known} observations`}`;
    return `<div class="day" role="img" aria-label="${accessible}" title="${accessible}"><strong>${stats.percent === null ? '—' : stats.percent + '%'}</strong><div class="bar-wrap"><div class="bar ${stats.percent === null ? 'no-data' : ''}">${stats.percent === null ? '' : `<div class="other"></div><div class="good" style="height:${stats.percent}%"></div>`}</div></div><span class="day-label">${label}</span><span class="sample-label">${stats.known} samples</span></div>`;
  }).join('');
}

async function loadHistory() {
  try {
    const response = await fetch('/api/history', { signal: AbortSignal.timeout(16000) });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.samples)) throw new Error('Unavailable');
    samples = data.samples;
    scheduled = data.scheduled === true;
    historyFailed = false;
    renderHistory();
  } catch {
    historyFailed = true;
    $('#chart').innerHTML = '<p class="empty">History is temporarily unavailable. Live status is separate and can still be refreshed.</p>';
    $('#history-score').innerHTML = '—<small>history unavailable</small>';
    $('#history-freshness').textContent = '';
    $('#history-detail').textContent = 'We couldn’t load the observation history. Try Refresh to load it again.';
  }
}

$('#lines').addEventListener('click', event => {
  const button = event.target.closest('[data-save]');
  if (!button) return;
  const id = button.dataset.save;
  saved = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
  let storageFailed = false;
  try { localStorage.setItem('commute-lines', JSON.stringify(saved)); } catch { storageFailed = true; }
  renderLines();
  document.querySelector(`[data-save="${CSS.escape(id)}"]`)?.focus();
  if (storageFailed) $('#commute-status').textContent += ' Your browser could not save this selection for next time.';
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(el => { el.classList.toggle('active', el === button); el.setAttribute('aria-pressed', String(el === button)); });
  renderLines();
}));
$('#search').addEventListener('input', renderLines);
$('#history-line').addEventListener('change', renderHistory);
$('#refresh').addEventListener('click', () => { refresh(); loadHistory(); });
$('#edit-commute').addEventListener('click', () => {
  $('#search').value = '';
  document.querySelector('[data-filter="all"]').click();
  $('#network').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  $('#search').focus({ preventScroll: true });
});
setInterval(() => { if (!document.hidden) refresh(); }, 60000);
setInterval(() => { if (!document.hidden) loadHistory(); }, 300000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateAge(); refresh(); loadHistory(); } });
renderCommute();
refresh();
loadHistory();
