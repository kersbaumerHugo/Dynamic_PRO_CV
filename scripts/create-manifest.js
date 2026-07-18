const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function main() {
  const root = path.resolve(__dirname, '..');
  const dist = path.join(root, 'dist');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  let commit = null;
  try { commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch (e) { commit = null; }

  const outputs = [];
  // collect html outputs
  function walkHtml(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walkHtml(full);
      else if (f === 'index.html') {
        const rel = path.relative(dist, full).replace(/\\\\/g, '/');
        const parts = rel.split('/');
        const entry = { html: rel };
        if (parts.length >= 3) {
          entry.locale = parts[0];
          entry.profile = parts[1];
        } else {
          entry.locale = 'root';
          entry.profile = 'root';
        }
        outputs.push(entry);
      }
    }
  }

  walkHtml(dist);

  // collect pdf outputs
  const pdfDir = path.join(dist, 'downloads');
  if (fs.existsSync(pdfDir)) {
    for (const f of fs.readdirSync(pdfDir).filter(x => x.endsWith('.pdf'))) {
      const parts = f.split('-');
      const profile = parts[2] || 'unknown';
      const locale = f.includes('-en.pdf') ? 'en' : 'pt-BR';
      outputs.push({ profile, locale, pdf: `downloads/${f}` });
    }
  }

  const manifest = {
    version: pkg.version || '0.0.0',
    commit: commit,
    generatedAt: new Date().toISOString(),
    outputs
  };
  fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Wrote dist/manifest.json');
}

if (require.main === module) main();
