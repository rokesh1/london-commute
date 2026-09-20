import test from 'node:test';
import assert from 'node:assert/strict';
import status from '../api/status.js';
import history from '../api/history.js';

function response() {
  return { code: 200, headers: {}, body: null,
    status(code) { this.code = code; return this; },
    setHeader(key, value) { this.headers[key] = value; },
    json(body) { this.body = body; return this; }
  };
}

test('status reports upstream failure without fabricated values', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unavailable'); });
  const res = response();
  await status({ method: 'GET' }, res);
  assert.equal(res.code, 502);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.body.lines, undefined);
});
test('a missing history branch is a truthful empty state', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ status: 404 }));
  const res = response();
  await history({ method: 'GET' }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.samples, []);
});
test('public endpoints do not allow writes', async () => {
  for (const handler of [status, history]) {
    const res = response();
    await handler({ method: 'POST' }, res);
    assert.equal(res.code, 405);
  }
});
