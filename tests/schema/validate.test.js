const { spawnSync } = require('child_process');
const path = require('path');

test('schema validation exits 0 for current fixtures', () => {
  const script = path.resolve(__dirname, '../../scripts/validate.js');
  const res = spawnSync('node', [script], { encoding: 'utf8' });
  if (res.error) throw res.error;
  console.log(res.stdout);
  if (res.status !== 0) {
    console.error(res.stderr);
  }
  expect(res.status).toBe(0);
});
