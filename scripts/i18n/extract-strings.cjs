#!/usr/bin/env node
/**
 * Collects the English text a user can see in the app (JSX text, labels, placeholders, toasts,
 * option labels...) into a catalog for translation. Template literals become patterns with {0}, {1}.
 *
 *   node scripts/i18n/extract-strings.cjs src scripts/i18n/catalog.json
 *
 * The catalog is translated by scripts/i18n/translate.py (IndicTrans2) into public/locales/<lang>.json,
 * which the app's DOM translator applies at runtime (src/i18n/domTranslator.ts).
 */
const fs = require('fs');
const path = require('path');
const ts = require(require.resolve('typescript', { paths: [process.cwd()] }));

const [srcDir = 'src', outFile = 'scripts/i18n/catalog.json'] = process.argv.slice(2);

const TEXT_ATTRS = new Set(['placeholder', 'title', 'aria-label', 'alt', 'label', 'helperText', 'description', 'emptyText']);
const SKIP_ATTRS = new Set(['className', 'class', 'style', 'key', 'id', 'href', 'to', 'src', 'type', 'role', 'name', 'value', 'htmlFor', 'inputMode', 'autoComplete', 'pattern', 'accept', 'target', 'rel', 'method', 'data-testid', 'form', 'list', 'variant', 'size', 'tone', 'icon', 'aria-labelledby', 'aria-describedby', 'aria-controls']);
const TEXT_PROPS = /^(label|title|sub|subtitle|description|desc|message|placeholder|text|heading|hint|helper|cta|ctaLabel|emptyText|empty|caption|note|tooltip|confirmLabel|cancelLabel|actionLabel|subtext|body|summary|reason|info|name|short|long|question|answer|tagline|blurb)$/;
const TEXT_CALLS = /^(notify|showToast|toast|setToast|setError|setErr|setServerErr|setMessage|setNotice|alert|confirm|w|t|errMsg|fail|success|warn|setStatusText|setInfo)$/;

const out = new Map(); // text -> first source location
const add = (raw, where) => {
  if (typeof raw !== 'string') return;
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!looksLikeText(s)) return;
  if (!out.has(s)) out.set(s, where);
};

function looksLikeText(s) {
  if (s.length < 2 || s.length > 400) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (/^(https?:|mailto:|tel:|\/|\.\/|#|data:)/.test(s)) return false;
  if (/^\S+@\S+\.\S+$/.test(s)) return false; // e-mail addresses
  if (/[ऀ-෿]/.test(s)) return false; // already in an Indic script (language names)
  if (/^[A-Z0-9_]+$/.test(s) && !/\s/.test(s) && s.length > 3) return false; // ENUM_VALUES
  if (/[{}<>]|=>|\$\{/.test(s.replace(/\{\d+\}/g, ''))) return false; // code
  const tokens = s.split(' ');
  // Tailwind / class lists: every token is a utility-like word and at least one has a dash or colon.
  if (tokens.every((t) => /^[!a-z0-9:\-[\]/.%#()_,]+$/.test(t)) && tokens.some((t) => /[-:[]/.test(t))) return false;
  // Single lowercase identifiers (enum values, keys) are not UI text.
  if (tokens.length === 1 && /^[a-z][a-zA-Z0-9_.-]*$/.test(s)) return false;
  if (/^[a-z]+(_[a-z]+)+$/.test(s)) return false;
  return true;
}

function templateToPattern(node) {
  let text = node.head.text;
  node.templateSpans.forEach((span, i) => { text += `{${i}}` + span.literal.text; });
  return /[A-Za-z]{2}/.test(text.replace(/\{\d+\}/g, '')) ? text : null;
}

function attrName(n) { return n.name && (n.name.escapedText || n.name.text || (n.name.getText && n.name.getText())); }

function inside(node, pred) {
  for (let p = node.parent; p; p = p.parent) { const r = pred(p); if (r !== undefined) return r; }
  return false;
}

function visit(node, sf) {
  const where = () => `${path.relative(process.cwd(), sf.fileName)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;

  if (ts.isJsxText(node)) add(node.text, where());

  if (ts.isJsxAttribute(node)) {
    const name = String(attrName(node));
    const init = node.initializer;
    if (init && TEXT_ATTRS.has(name) && ts.isStringLiteral(init)) add(init.text, where());
  }

  const isStr = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
  const isTpl = ts.isTemplateExpression(node);
  if (isStr || isTpl) {
    const text = isStr ? node.text : templateToPattern(node);
    if (text) {
      // Skip strings that are attribute values of non-text attributes (className, href, ...).
      const skip = inside(node, (p) => (ts.isJsxAttribute(p) ? SKIP_ATTRS.has(String(attrName(p))) : (ts.isSourceFile(p) ? false : undefined)));
      const parent = node.parent;
      const inJsx = inside(node, (p) => (ts.isJsxExpression(p) ? true : ts.isSourceFile(p) || ts.isFunctionLike(p) ? false : undefined));
      const isProp = parent && ts.isPropertyAssignment(parent) && parent.initializer === node && TEXT_PROPS.test(String(parent.name.text || parent.name.escapedText || ''));
      const isCallArg = parent && ts.isCallExpression(parent) && TEXT_CALLS.test(parent.expression.getText(sf).split('.').pop());
      const isNewError = parent && ts.isNewExpression(parent) && /Error$/.test(parent.expression.getText(sf));
      const isFallback = parent && ts.isBinaryExpression(parent) && parent.right === node && (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken || parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) && /[A-Z]/.test(text[0]) && /\s/.test(text);
      const isTernary = parent && ts.isConditionalExpression(parent) && inJsx;
      const isArrayItem = parent && ts.isArrayLiteralExpression(parent) && /[A-Z]/.test(text[0]) && /\s|^[A-Z][a-z]+$/.test(text);
      const isReturn = parent && ts.isReturnStatement(parent) && /[A-Z]/.test(text[0]) && /\s/.test(text);
      if (!skip && (inJsx || isProp || isCallArg || isNewError || isFallback || isTernary || isArrayItem || isReturn)) add(text, where());
    }
  }
  ts.forEachChild(node, (c) => visit(c, sf));
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!/^(node_modules|__tests__|mocks|__mocks__)$/.test(entry.name)) walk(p); continue; }
    if (!/\.(tsx|ts)$/.test(entry.name) || /\.(test|spec|d)\.tsx?$/.test(entry.name)) continue;
    const sf = ts.createSourceFile(p, fs.readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true, p.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    visit(sf, sf);
  }
}

walk(srcDir);
const catalog = [...out.keys()].sort((a, b) => a.localeCompare(b));
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(catalog, null, 1));
console.log(`${catalog.length} strings -> ${outFile} (${catalog.filter((s) => /\{\d+\}/.test(s)).length} patterns)`);
