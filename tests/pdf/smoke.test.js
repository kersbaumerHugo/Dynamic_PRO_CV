const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

test('generate PDFs smoke', () => {
  const script = path.resolve(__dirname, '../../scripts/generate-pdfs.js');
  const res = spawnSync('node', [script], { encoding: 'utf8', env: process.env });
  console.log(res.stdout);
  if (res.status !== 0) {
    console.error(res.stderr);
  }
  expect(res.status).toBe(0);

  const downloads = path.resolve(__dirname, '../../dist/downloads');
  expect(fs.existsSync(downloads)).toBe(true);
  const files = fs.readdirSync(downloads).filter(f => f.endsWith('.pdf'));
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const s = fs.statSync(path.join(downloads, f));
    expect(s.size).toBeGreaterThan(1000);
  }
});
