const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const profilesDir = path.join(root, 'profiles');
const templatesDir = path.join(root, 'src', 'templates');
const stylesDir = path.join(root, 'src', 'styles');
const dist = path.join(root, 'dist');

function ensure(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

nunjucks.configure(templatesDir, { autoescape: true });

function copyStyles() {
  const out = path.join(dist, 'styles');
  ensure(out);
  for (const f of fs.readdirSync(stylesDir).filter(x => x.endsWith('.css'))) {
    fs.copyFileSync(path.join(stylesDir, f), path.join(out, f));
  }
}

function renderViewModel(vmPath, outDir) {
  const view = JSON.parse(fs.readFileSync(vmPath, 'utf8'));
  // enrich view for template
  const ctx = Object.assign({}, view, { locale: view.locale, profile: Object.assign({}, view.profile) });
  const html = nunjucks.render('layouts/resume.njk', ctx);
  ensure(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

function main() {
  ensure(dist);
  copyStyles();

  const profileFiles = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json'));
  const locales = ['en', 'pt-BR'];
  for (const pf of profileFiles) {
    const profile = JSON.parse(fs.readFileSync(path.join(profilesDir, pf), 'utf8'));
    if (!profile.enabled) continue;
    for (const locale of locales) {
      // generate viewmodel
      console.log(`Resolving view-model for ${profile.id} ${locale}`);
      try {
        execSync(`node scripts/resolve-profile.js --profile ${profile.id} --locale ${locale}`, { stdio: 'inherit' });
      } catch (e) {
        console.error('Failed to resolve view-model for', profile.id, locale, e.message);
        continue;
      }
      const vmPath = path.join(dist, 'viewmodels', `${profile.id}-${locale}.json`);
      if (!fs.existsSync(vmPath)) { console.warn('View-model missing:', vmPath); continue; }
      const outDir = path.join(dist, locale, profile.slug);
      renderViewModel(vmPath, outDir);
      console.log('Wrote', path.join(outDir, 'index.html'));
    }
  }
}

if (require.main === module) main();
