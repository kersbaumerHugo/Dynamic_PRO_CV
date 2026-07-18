const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function generate() {
  const root = path.resolve(__dirname, '..');
  const dist = path.join(root, 'dist');
  const profilesDir = path.join(root, 'profiles');
  const downloads = path.join(dist, 'downloads');
  if (!fs.existsSync(downloads)) fs.mkdirSync(downloads, { recursive: true });

  const profiles = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(profilesDir, f), 'utf8'))).filter(p => p.enabled);
  const locales = ['en', 'pt-BR'];

  const browser = await chromium.launch();
  const context = await browser.newContext({ javaScriptEnabled: true });
  const page = await context.newPage();

  try {
    for (const profile of profiles) {
      for (const locale of locales) {
        const htmlPath = path.join(dist, locale, profile.slug, 'index.html');
        if (!fs.existsSync(htmlPath)) {
          console.warn('HTML not found, skipping PDF for', htmlPath);
          continue;
        }

        const vmPath = path.join(dist, 'viewmodels', `${profile.id}-${locale}.json`);
        let displayName = '';
        if (fs.existsSync(vmPath)) {
          const vm = JSON.parse(fs.readFileSync(vmPath, 'utf8'));
          displayName = (vm.person && vm.person.name) || '';
        }

        const fileUrl = 'file://' + htmlPath;
        console.log('Loading', fileUrl);
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        // verify page contains expected text
        const bodyText = await page.evaluate(() => document.body.innerText || '');
        if (displayName && !bodyText.includes(displayName)) {
          console.warn(`Warning: rendered HTML for ${profile.id}/${locale} does not include name '${displayName}'`);
        }

        const filename = (() => {
          const base = 'hugo-kersbaumer-' + profile.slug;
          if (locale === 'en') return `${base}-resume-en.pdf`;
          return `${base}-curriculo-pt-br.pdf`;
        })();

        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' } });
        const outPath = path.join(downloads, filename);
        fs.writeFileSync(outPath, pdfBuffer);
        const stat = fs.statSync(outPath);
        if (stat.size < 1000) throw new Error(`Generated PDF ${outPath} is too small (${stat.size} bytes)`);
        console.log('Wrote PDF', outPath, stat.size, 'bytes');
      }
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  generate().then(() => { console.log('PDF generation completed'); process.exit(0); }).catch(err => { console.error(err); process.exit(2); });
}
console.log('PDF generation stub — implement Playwright-based renderer in a later step.');
