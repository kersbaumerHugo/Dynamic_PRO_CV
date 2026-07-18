const { spawnSync } = require('child_process');
const path = require('path');

test('html-validate passes for built HTML', () => {
  const script = path.resolve(__dirname, '../../../scripts/validate-html.js');
  const res = spawnSync('node', [script], { encoding: 'utf8' });
  console.log(res.stdout);
  if (res.status !== 0) console.error(res.stderr);
  expect(res.status).toBe(0);
});
