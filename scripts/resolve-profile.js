const fs = require('fs');
const path = require('path');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function loadAll(dir) {
  const items = {};
  if (!fs.existsSync(dir)) return items;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const full = path.join(dir, f);
    const data = loadJson(full);
    if (Array.isArray(data)) {
      for (const it of data) if (it.id) items[it.id] = it;
    } else if (data && data.id) {
      items[data.id] = data;
    } else {
      // if file contains multiple named entries keyed by id
      for (const v of Object.values(data)) if (v && v.id) items[v.id] = v;
    }
  }
  return items;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const profilesDir = path.join(root, 'profiles');
  const dataDir = path.join(root, 'data');
  const dist = path.join(root, 'dist', 'viewmodels');
  if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

  const argv = require('minimist')(process.argv.slice(2));
  const slug = argv.profile || argv.p || 'devops';
  const locale = argv.locale || argv.l || 'en';

  const profiles = [];
  for (const f of fs.readdirSync(profilesDir).filter(x => x.endsWith('.json'))) profiles.push(loadJson(path.join(profilesDir, f)));
  const profile = profiles.find(p => p.slug === slug || p.id === slug);
  if (!profile) {
    console.error('Profile not found:', slug);
    process.exit(2);
  }

  const people = loadAll(dataDir);
  const projects = loadAll(path.join(root, 'data'));
  const experiences = loadAll(path.join(root, 'data'));

  // Minimal normalization: select person (only one expected)
  const personFile = path.join(root, 'data', 'person.json');
  const person = fs.existsSync(personFile) ? loadJson(personFile) : {};

  const view = {
    profile: { id: profile.id, slug: profile.slug, title: profile.title && profile.title[locale] ? profile.title[locale] : profile.title },
    locale,
    person: { name: (person.name && person.name[locale]) || person.name || '' , contact: person.contact || {} },
    featuredProjects: [],
    experiences: []
  };

  // featured projects
  if (Array.isArray(profile.featuredProjectIds)) {
    for (const pid of profile.featuredProjectIds.slice(0, profile.maxProjects || 3)) {
      const p = projects[pid];
      if (p) view.featuredProjects.push({ id: p.id, title: (p.title && p.title[locale]) || p.title, summary: (p.summary && p.summary[locale]) || p.summary });
    }
  }

  // experiences: try to load experience.json if present
  const expFile = path.join(root, 'data', 'experience.json');
  if (fs.existsSync(expFile)) {
    const exps = loadJson(expFile);
    if (Array.isArray(exps)) {
      for (const e of exps) {
        view.experiences.push({ id: e.id, company: e.company, role: (e.role && e.role[locale]) || e.role, startDate: e.startDate, endDate: e.endDate, bullets: e.bullets || [] });
      }
    }
  }

  const out = path.join(dist, `${slug}-${locale}.json`);
  fs.writeFileSync(out, JSON.stringify(view, null, 2), 'utf8');
  console.log('Wrote view-model to', out);
}

if (require.main === module) main();
