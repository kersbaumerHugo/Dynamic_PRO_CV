const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function main() {
  const root = path.resolve(__dirname, '..');
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(dist)) {
    console.error('dist directory not found — run build first');
    process.exit(2);
  }

  console.log('Running html-validate on generated HTML files...');
  const htmlFiles = [];
  function walk(dir) {
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (file.endsWith('.html')) htmlFiles.push(full);
    }
  }
  walk(dist);

  if (htmlFiles.length === 0) {
    console.error('No HTML files found in dist');
    process.exit(1);
  }

  const res = spawnSync('npx', ['html-validate', ...htmlFiles], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error('html-validate reported issues');
    process.exit(res.status || 1);
  }
  console.log('html-validate passed');
}

if (require.main === module) main();
