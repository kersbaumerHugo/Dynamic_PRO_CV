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

function resolveProfile(profileId, locale) {
  const root = path.resolve(__dirname, '..');
  const profilesDir = path.join(root, 'profiles');
  const dataDir = path.join(root, 'data');
  const dist = path.join(root, 'dist', 'viewmodels');
  if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

  const profiles = [];
  for (const f of fs.readdirSync(profilesDir).filter(x => x.endsWith('.json'))) profiles.push(loadJson(path.join(profilesDir, f)));
  const profile = profiles.find(p => p.slug === profileId || p.id === profileId);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const summariesPath = path.join(root, 'data', 'summaries.json');
  const skillsPath = path.join(root, 'data', 'skills.json');
  const projectsPath = path.join(root, 'data', 'projects.json');
  const experiencePath = path.join(root, 'data', 'experience.json');
  const linksPath = path.join(root, 'data', 'links.json');
  const languagesPath = path.join(root, 'data', 'languages.json');
  const trainingsPath = path.join(root, 'data', 'trainings.json');
  const certificationsPath = path.join(root, 'data', 'certifications.json');
  const educationPath = path.join(root, 'data', 'education.json');

  const summaries = fs.existsSync(summariesPath) ? loadJson(summariesPath) : [];
  const skills = fs.existsSync(skillsPath) ? loadJson(skillsPath) : [];
  const projects = fs.existsSync(projectsPath) ? loadJson(projectsPath) : [];
  const experiences = fs.existsSync(experiencePath) ? loadJson(experiencePath) : [];
  const links = fs.existsSync(linksPath) ? loadJson(linksPath) : [];
  const languages = fs.existsSync(languagesPath) ? loadJson(languagesPath) : [];
  const trainings = fs.existsSync(trainingsPath) ? loadJson(trainingsPath) : [];
  const certifications = fs.existsSync(certificationsPath) ? loadJson(certificationsPath) : [];
  const education = fs.existsSync(educationPath) ? loadJson(educationPath) : [];

  const summaryMap = summaries.reduce((acc, item) => { if (item && item.id) acc[item.id] = item; return acc; }, {});
  const skillsMap = skills.reduce((acc, item) => { if (item && item.id) acc[item.id] = item; return acc; }, {});
  const projectsMap = projects.reduce((acc, item) => { if (item && item.id) acc[item.id] = item; return acc; }, {});

  const personFile = path.join(root, 'data', 'person.json');
  const person = fs.existsSync(personFile) ? loadJson(personFile) : {};

  const profileTitle = profile.title && profile.title[locale] ? profile.title[locale] : profile.title;
  const featuredProjects = Array.isArray(profile.featuredProjectIds) ? profile.featuredProjectIds.slice(0, profile.maxProjects || 3).map(pid => {
    const p = projectsMap[pid];
    if (!p) return null;
    return {
      id: p.id,
      title: (p.title && p.title[locale]) || p.title,
      summary: (p.summary && p.summary[locale]) || p.summary,
      repositoryUrl: p.repositoryUrl,
      visibility: p.visibility
    };
  }).filter(Boolean) : [];

  const view = {
    profile: {
      id: profile.id,
      slug: profile.slug,
      title: profileTitle,
      summary: profile.summaryId && summaryMap[profile.summaryId] ? (summaryMap[profile.summaryId].text && summaryMap[profile.summaryId].text[locale]) || summaryMap[profile.summaryId].text : null,
      featuredSkills: Array.isArray(profile.featuredSkillIds) ? profile.featuredSkillIds.map(sid => skillsMap[sid]).filter(Boolean) : [],
      featuredProjects
    },
    locale,
    person: { name: (person.name && person.name[locale]) || person.name || '', contact: person.contact || {} },
    featuredProjects,
    experiences: [],
    links: links.map(link => ({ id: link.id, type: link.type, url: link.url, label: (link.label && link.label[locale]) || link.label })),
    languages: languages.map(lang => ({ id: lang.id, label: (lang.label && lang.label[locale]) || lang.label })),
    trainings: trainings.map(t => ({ id: t.id, title: (t.title && t.title[locale]) || t.title, institution: t.institution, year: t.year, link: t.link })),
    certifications: certifications.map(c => ({ id: c.id, name: (c.name && c.name[locale]) || c.name, issuer: c.issuer, year: c.year, credentialUrl: c.credentialUrl })),
    education: education.map(e => ({ id: e.id, degree: (e.degree && e.degree[locale]) || e.degree, institution: e.institution, year: e.year }))
  };

  if (Array.isArray(experiences)) {
    view.experiences = experiences.map(e => ({
      id: e.id,
      company: e.company,
      role: (e.role && e.role[locale]) || e.role,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      bullets: Array.isArray(e.bullets) ? e.bullets.map(b => ({ id: b.id, text: (b.text && b.text[locale]) || b.text })) : []
    }));
  }

  const out = path.join(dist, `${profileId}-${locale}.json`);
  fs.writeFileSync(out, JSON.stringify(view, null, 2), 'utf8');
  console.log('Wrote view-model to', out);
}

if (require.main === module) {
  const argv = require('minimist')(process.argv.slice(2));
  const slug = argv.profile || argv.p || 'devops';
  const locale = argv.locale || argv.l || 'en';
  resolveProfile(slug, locale);
}

module.exports = resolveProfile;
