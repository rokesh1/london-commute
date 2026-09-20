import { fetchStatus } from '../lib/tfl.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const data = await fetchStatus();
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'TfL status is temporarily unavailable. Please try again shortly.' });
  }
}
