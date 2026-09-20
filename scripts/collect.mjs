import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fetchStatus } from '../lib/tfl.js';

const file = process.argv[2] || 'history.json';
let samples = [];
try { samples = JSON.parse(await readFile(file, 'utf8')).samples; }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!Array.isArray(samples)) throw new Error('Invalid existing history; refusing to overwrite');
const current = await fetchStatus();
const cutoff = Date.now() - 7 * 86400000;
samples = samples.filter(s => Date.parse(s.at) >= cutoff);
samples.push({ at: current.fetchedAt, lines: Object.fromEntries(current.lines.map(l => [l.id, l.state])) });
await mkdir(dirname(file), { recursive: true });
await writeFile(file, JSON.stringify({ scheduled: process.env.GITHUB_ACTIONS === 'true', samples }, null, 2) + '\n');
console.log(`Stored ${samples.length} observations`);
