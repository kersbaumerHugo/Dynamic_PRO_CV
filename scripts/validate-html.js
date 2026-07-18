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
  const res = spawnSync('npx', ['html-validate', '"dist/**/*.html"'], { shell: true, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error('html-validate reported issues');
    process.exit(res.status || 1);
  }
  console.log('html-validate passed');
}

if (require.main === module) main();
