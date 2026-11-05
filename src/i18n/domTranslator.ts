/**
 * Shows the app in another language without rewriting every screen: the English text the user sees
 * (text nodes plus placeholder / title / aria-label / alt) is looked up in a dictionary generated
 * offline with IndicTrans2 (scripts/i18n) and swapped in place. Originals are kept, so switching back
 * to English restores them exactly. Data (names, numbers, notes) is never in the dictionary, so it
 * stays as typed. Mark anything that must never change with translate="no" or data-no-translate.
 */
export type Dictionary = Record<string, string>;

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'svg']);

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const escapeRe = (s: string) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');

export class DomTranslator {
  private exact = new Map<string, string>();
  private patterns: Array<{ re: RegExp; to: string }> = [];
  private textOriginal = new WeakMap<Text, { src: string; out: string }>();
  private attrOriginal = new WeakMap<Element, Record<string, { src: string; out: string }>>();
  private touchedText = new Set<Text>();
  private touchedEls = new Set<Element>();
  private observer: MutationObserver | null = null;

  constructor(dict: Dictionary) {
    for (const [src, out] of Object.entries(dict)) {
      if (!out || out === src) continue;
      if (/\{\d+\}/.test(src)) {
        // "{0} doctors" → /^(.+?) doctors$/ ; slots may appear in any order in the translation.
        const order: number[] = [];
        const re = new RegExp('^' + escapeRe(src).replace(/\\?\{(\d+)\\?\}/g, (_m, n) => { order.push(Number(n)); return '(.+?)'; }) + '$');
        this.patterns.push({ re, to: out.replace(/\{(\d+)\}/g, (_m, n) => `$${order.indexOf(Number(n)) + 1}`) });
      } else {
        this.exact.set(norm(src), out);
      }
    }
  }

  private lookup(text: string): string | null {
    const key = norm(text);
    if (!key || !/[A-Za-z]/.test(key)) return null;
    const hit = this.exact.get(key);
    if (hit) return hit;
    for (const p of this.patterns) if (p.re.test(key)) return key.replace(p.re, p.to);
    return null;
  }

  private skip(el: Element | null): boolean {
    for (let e = el; e; e = e.parentElement) {
      if (SKIP_TAGS.has(e.tagName) || e.getAttribute('translate') === 'no' || e.hasAttribute('data-no-translate') || (e as HTMLElement).isContentEditable) return true;
    }
    return false;
  }

  private translateText(node: Text) {
    const value = node.nodeValue || '';
    const prev = this.textOriginal.get(node);
    if (prev && value === prev.out) return; // our own write
    const src = value;
    const out = this.lookup(src);
    if (!out || this.skip(node.parentElement)) return;
    const lead = src.match(/^\s*/)![0];
    const trail = src.match(/\s*$/)![0];
    const next = lead + out + trail;
    this.textOriginal.set(node, { src, out: next });
    this.touchedText.add(node);
    node.nodeValue = next;
  }

  private translateAttrs(el: Element) {
    if (this.skip(el)) return;
    for (const a of ATTRS) {
      const value = el.getAttribute(a);
      if (value == null) continue;
      const saved = this.attrOriginal.get(el) || {};
      if (saved[a] && saved[a].out === value) continue;
      const out = this.lookup(value);
      if (!out) continue;
      saved[a] = { src: value, out };
      this.attrOriginal.set(el, saved);
      this.touchedEls.add(el);
      el.setAttribute(a, out);
    }
  }

  private walk(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) { this.translateText(root as Text); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) this.translateAttrs(root as Element);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE) this.translateText(n as Text);
      else this.translateAttrs(n as Element);
    }
  }

  start(root: HTMLElement = document.body) {
    this.walk(root);
    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') this.translateText(r.target as Text);
        else if (r.type === 'attributes') this.translateAttrs(r.target as Element);
        else r.addedNodes.forEach((n) => this.walk(n));
      }
    });
    this.observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
  }

  /** Stop and put every original English string back. */
  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.touchedText.forEach((node) => {
      const o = this.textOriginal.get(node);
      if (o && node.nodeValue === o.out) node.nodeValue = o.src;
    });
    this.touchedEls.forEach((el) => {
      const saved = this.attrOriginal.get(el) || {};
      for (const [a, o] of Object.entries(saved)) if (el.getAttribute(a) === o.out) el.setAttribute(a, o.src);
    });
    this.touchedText.clear();
    this.touchedEls.clear();
  }
}

const cache = new Map<string, Promise<Dictionary>>();
/** public/locales/<lang>.json, generated by scripts/i18n/translate.py. Missing file → empty dictionary. */
export const loadDictionary = (lang: string): Promise<Dictionary> => {
  if (!cache.has(lang)) {
    cache.set(lang, fetch(`${import.meta.env.BASE_URL || '/'}locales/${lang}.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})));
  }
  return cache.get(lang)!;
};
