# App translations (AI4Bharat IndicTrans2)

The app is translated at runtime by `src/i18n/domTranslator.ts`. It swaps the English the user sees
for `public/locales/<lang>.json`. Those files are generated offline with
[IndicTrans2](https://github.com/AI4Bharat/IndicTrans2) (`ai4bharat/indictrans2-en-indic-dist-200M`).

Languages: hi, te, ta, kn, mr, bn, gu. The language is chosen in Settings → Language and saved in the
browser (`vizito_language`). User data (names, notes, prescriptions) is never translated. Mark anything
that must stay exactly as written with `translate="no"` or `data-no-translate`.

## One-time: model access

The IndicTrans2 weights on Hugging Face are gated. To get access:

1. Sign in at huggingface.co.
2. Open https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M and accept the terms.
3. Create a **read** token at https://huggingface.co/settings/tokens.
4. Save the token as the only line of `%USERPROFILE%\.cache\huggingface\token`. Never commit it.

## Regenerate (after UI text changes)

```bash
# 1. Collect the UI strings (run in each app)
node scripts/i18n/extract-strings.cjs src scripts/i18n/catalog.json

# 2. Translate on CPU in Docker (resumes if stopped; output in ./it2-out/<lang>.json)
docker build -t vizito-indictrans2 scripts/i18n
docker run --rm -v "$PWD/scripts/i18n:/work" -v vizito-hf-cache:/root/.cache/huggingface \
  -v "$HOME/.cache/huggingface/token:/root/.cache/huggingface/token:ro" \
  vizito-indictrans2 python translate.py catalog.json /work/it2-out --beams 3

# 3. Merge with the hand-written translations in LanguageContext.tsx (those win) into public/locales
node scripts/i18n/build-locales.cjs src/store/language/LanguageContext.tsx scripts/i18n/catalog.json scripts/i18n/it2-out public/locales
```

`{0}`, `{1}` slots and terms like Vizito, OPD, UPI, OTP are protected during translation. A line where a
slot was lost stays in English. The translations are machine-generated: have a native speaker review
clinical and payment wording before launch in a language.
