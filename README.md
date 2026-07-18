# resume-as-code

Resume-as-Code — JSON-driven multilingual ATS-friendly resume generator.

Quick start

1. Install dependencies
```bash
npm install
npx playwright install --with-deps
```

2. Validate data
```bash
npm run validate
```

3. Build HTML + manifest + validate
```bash
npm run build
```

4. Generate PDFs
```bash
npm run pdf
```

5. Serve locally
```bash
npm run dev
```

What is included
- JSON Schemas in `schemas/`
- Canonical data in `data/`
- Profiles in `profiles/`
- Nunjucks templates in `src/templates/`
- CSS for screen and print in `src/styles/`
- Build scripts in `scripts/`
- Tests with Vitest in `tests/`
- Resume sections for summaries, skills, experience, certifications, education, languages, and training

Build outputs
- Generated profile pages are written under `dist/<locale>/<profile-slug>/index.html`
- Root static landing page is copied into `dist/index.html`
- PDF exports are written to `dist/downloads/`

CI
- Pull requests run validation, tests, build and PDF generation (`.github/workflows/pull-request.yml`).
- Pushes to `main` build and deploy to GitHub Pages (`.github/workflows/deploy-pages.yml`).

Notes
- The project is intentionally small and follows the "one source of truth" principle. Edit JSON files in `data/` and `profiles/` to add content.
# Dynamic_PRO_CV