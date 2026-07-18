const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectIds(data) {
  const ids = [];
  if (Array.isArray(data)) {
    for (const item of data) if (item && item.id) ids.push(item.id);
  } else if (data && typeof data === 'object') {
    if (data.id) ids.push(data.id);
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) for (const it of v) if (it && it.id) ids.push(it.id);
      else if (v && typeof v === 'object') ids.push(...collectIds(v));
    }
  }
  return ids;
}

function isUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function containsRawHtml(value) {
  return typeof value === 'string' && /<\/?[a-z][^>]*>/i.test(value);
}

function isUrlKey(key) {
  if (!key) return false;
  const normalized = key.toLowerCase();
  return normalized.includes('url') || normalized.includes('website') || normalized.includes('link');
}

function isSafeSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function traverseData(data, callback, parentKey = '') {
  if (Array.isArray(data)) {
    data.forEach((item, index) => traverseData(item, callback, `${parentKey}[${index}]`));
    return;
  }
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      traverseData(data[key], callback, parentKey ? `${parentKey}.${key}` : key);
    }
    return;
  }
  callback(data, parentKey);
}

function validateFileContent(filePath, fileName, errors) {
  let data;
  try {
    data = loadJson(filePath);
  } catch (e) {
    errors.push(`Failed to parse ${fileName}: ${e.message}`);
    return null;
  }

  traverseData(data, (value, pathKey) => {
    if (typeof value === 'string') {
      if (containsRawHtml(value)) {
        errors.push(`${fileName}:${pathKey} contains raw HTML or markup-like content`);
      }
      if (isUrlKey(pathKey) && value.trim() !== '' && !isUrl(value)) {
        errors.push(`${fileName}:${pathKey} is not a valid URL: ${value}`);
      }
    }
  });

  return data;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const schemasDir = path.join(root, 'schemas');
  const dataDir = path.join(root, 'data');
  const profilesDir = path.join(root, 'profiles');

  if (!fs.existsSync(schemasDir)) {
    console.error('Schemas directory not found:', schemasDir);
    process.exit(2);
  }

  const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.json'));
  const schemas = {};
  for (const f of schemaFiles) {
    const full = path.join(schemasDir, f);
    const obj = loadJson(full);
    const key = path.basename(f, '.schema.json');
    schemas[key] = obj;
    if (obj.$id) ajv.addSchema(obj, obj.$id);
  }

  const allIds = new Map();
  const errors = [];

  // Validate data files
  if (fs.existsSync(dataDir)) {
    const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    for (const f of dataFiles) {
      const full = path.join(dataDir, f);
      const data = validateFileContent(full, f, errors);
      if (!data) continue;

      const base = path.basename(f, '.json');
      const schema = schemas[base];
      if (schema) {
        const validate = ajv.compile(schema);
        const valid = validate(data);
        if (!valid) {
          errors.push(`Schema errors in ${f}:`);
          for (const err of validate.errors) errors.push(`  ${err.instancePath} ${err.message}`);
        }
      }

      const ids = collectIds(data);
      for (const id of ids) {
        if (allIds.has(id)) errors.push(`Duplicate id '${id}' found in ${f} and ${allIds.get(id)}`);
        else allIds.set(id, f);
      }

      if (base === 'person') {
        if (data.name) {
          if (!data.name.en || !data.name['pt-BR']) errors.push(`${f}.name missing required locale keys (en, pt-BR)`);
        }
      }
    }
  }

  // Validate profiles and references
  if (fs.existsSync(profilesDir)) {
    const profileFiles = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json'));
    for (const f of profileFiles) {
      const full = path.join(profilesDir, f);
      const p = validateFileContent(full, `profiles/${f}`, errors);
      if (!p) continue;

      const schema = schemas['profile'];
      if (schema) {
        const validate = ajv.compile(schema);
        const valid = validate(p);
        if (!valid) {
          errors.push(`Schema errors in profile ${f}:`);
          for (const err of validate.errors) errors.push(`  ${err.instancePath} ${err.message}`);
        }
      }

      if (p.title) {
        if (!p.title.en || !p.title['pt-BR']) errors.push(`profiles/${f}.title missing required locale keys (en, pt-BR)`);
      }

      if (!isSafeSlug(p.slug)) {
        errors.push(`profiles/${f}.slug must match /^[a-z0-9]+(?:-[a-z0-9]+)*$/ but got '${p.slug}'`);
      }

      if (p.summaryId && !allIds.has(p.summaryId)) errors.push(`Profile ${f} references unknown summaryId '${p.summaryId}'`);
      if (Array.isArray(p.featuredProjectIds)) {
        for (const pid of p.featuredProjectIds) if (!allIds.has(pid)) errors.push(`Profile ${f} references unknown project id '${pid}'`);
      }
    }
  }

  // Additional checks: date formats and current/endDate logic across experiences
  const expFile = path.join(dataDir, 'experience.json');
  if (fs.existsSync(expFile)) {
    const exps = loadJson(expFile);
    if (Array.isArray(exps)) {
      for (const e of exps) {
        if (e.startDate && !/^\d{4}-\d{2}$/.test(e.startDate)) errors.push(`Experience ${e.id} has invalid startDate '${e.startDate}'`);
        if (e.endDate && e.endDate !== null && !/^\d{4}-\d{2}$/.test(e.endDate)) errors.push(`Experience ${e.id} has invalid endDate '${e.endDate}'`);
        if (e.current === true && e.endDate) errors.push(`Experience ${e.id} marked current but has endDate '${e.endDate}'`);
      }
    }
  }

  if (errors.length) {
    console.error('Validation failed with the following issues:');
    for (const line of errors) console.error(' -', line);
    process.exit(1);
  }

  console.log('Validation OK');
}

if (require.main === module) main();
