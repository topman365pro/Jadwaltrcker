// Import exactly as Vercel's Node runtime does, without Vite or tsx loaders.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import handler from '../.runtime/api/school.js';
process.env.ADMIN_TOKEN = 'native-runtime-test-key';
const server = createServer((req, res) => { void handler(req, res); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const url = `http://127.0.0.1:${server.address().port}`;
  const denied = await fetch(url, { method: 'POST' });
  assert.equal(denied.status, 401);
  const accepted = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer native-runtime-test-key' } });
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { authorized: true });
  console.log('Native Node runtime verified: function imports and requests work without a development loader.');
} finally {
  await new Promise(resolve => server.close(resolve));
}
