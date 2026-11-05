#!/usr/bin/env node
/**
 * Builds public/locales/<lang>.json for the runtime translator (src/i18n/domTranslator.ts):
 *   - the human translations already in the app's LanguageContext.tsx (these win), plus
 *   - the IndicTrans2 machine translations from scripts/i18n/translate.py, limited to this app's catalog.
 *
 *   node scripts/i18n/build-locales.cjs <LanguageContext.tsx> <catalog.json> [machine-dir] [public/locales]
 */
const fs = require('fs');
const path = require('path');
const ts = require(require.resolve('typescript', { paths: [process.cwd()] }));

const [ctxFile, catalogFile, machineDir = '', outDir = 'public/locales'] = process.argv.slice(2);
const LANGS = ['hi', 'te', 'ta', 'kn', 'mr', 'bn', 'gu'];

// The `translations` object literal from LanguageContext.tsx, evaluated as plain data.
function humanTranslations(file) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let literal = null;
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText(sf) === 'translations' && n.initializer) literal = n.initializer.getText(sf);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!literal) return {};
  const js = ts.transpileModule(`module.exports = ${literal};`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', js)(m, m.exports);
  return m.exports;
}

const human = humanTranslations(ctxFile);
const catalog = new Set(JSON.parse(fs.readFileSync(catalogFile, 'utf8')));
fs.mkdirSync(outDir, { recursive: true });
for (const lang of LANGS) {
  const machinePath = machineDir && path.join(machineDir, `${lang}.json`);
  const machine = machinePath && fs.existsSync(machinePath) ? JSON.parse(fs.readFileSync(machinePath, 'utf8')) : {};
  const dict = {};
  for (const [src, out] of Object.entries(machine)) if (catalog.has(src) && out && out !== src) dict[src] = out;
  for (const [src, out] of Object.entries(human[lang] || {})) if (out && out !== src) dict[src] = out;
  const sorted = Object.fromEntries(Object.entries(dict).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(outDir, `${lang}.json`), JSON.stringify(sorted));
  console.log(`${lang}: ${Object.keys(sorted).length} strings (${Object.keys(human[lang] || {}).length} human, ${Object.keys(machine).length} machine available)`);
}
