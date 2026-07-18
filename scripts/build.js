const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const dist = path.resolve(__dirname, '..', 'dist');
  ensureDir(dist);
  console.log('Created', dist);
  console.log('Running HTML render...');
  const { execSync } = require('child_process');
  execSync('node scripts/render-html.js', { stdio: 'inherit' });
}

if (require.main === module) main();
