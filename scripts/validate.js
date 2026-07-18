const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const schemasDir = path.resolve(__dirname, '..', 'schemas');
  const dataDir = path.resolve(__dirname, '..', 'data');

  if (!fs.existsSync(schemasDir)) {
    console.error('Schemas directory not found:', schemasDir);
    process.exit(2);
  }

  const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.json'));
  const schemas = {};
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
      // also check nested arrays commonly used
      for (const v of Object.values(data)) {
        if (Array.isArray(v)) for (const it of v) if (it && it.id) ids.push(it.id);
      }
    }
    return ids;
  }

  function isUrl(s) {
    try { new URL(s); return true; } catch (e) { return false; }
  }

  function checkLocalized(obj, fieldPath, errors) {
    if (obj && typeof obj === 'object') {
      if (!('en' in obj) || !('pt-BR' in obj)) {
        errors.push(`${fieldPath} missing required locale keys (en, pt-BR)`);
      }
    }
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
        let data;
        try { data = loadJson(full); } catch (e) { errors.push(`Failed to parse ${f}: ${e.message}`); continue; }
        const base = path.basename(f, '.json');
        const schema = schemas[base] || schemas[`${base}`];
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

        // quick localized checks for common files
        if (base === 'person') {
          checkLocalized(data.name, `${f}.name`, errors);
          if (data.contact && data.contact.website && !isUrl(data.contact.website)) errors.push(`${f}.contact.website is not a valid URL`);
        }
      }
    }

    // Validate profiles and references
    if (fs.existsSync(profilesDir)) {
      const profileFiles = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json'));
      for (const f of profileFiles) {
        const full = path.join(profilesDir, f);
        let p;
        try { p = loadJson(full); } catch (e) { errors.push(`Failed to parse profile ${f}: ${e.message}`); continue; }
        // schema validate
        const schema = schemas['profile'];
        if (schema) {
          const validate = ajv.compile(schema);
          const valid = validate(p);
          if (!valid) {
            errors.push(`Schema errors in profile ${f}:`);
            for (const err of validate.errors) errors.push(`  ${err.instancePath} ${err.message}`);
          }
        }

        checkLocalized(p.title, `${f}.title`, errors);

        // cross references: summaryId, featuredProjectIds
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
