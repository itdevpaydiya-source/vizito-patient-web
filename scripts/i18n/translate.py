"""Translate the UI catalog (English) into Indian languages with AI4Bharat IndicTrans2.

Follows the IndicTrans2 Hugging Face inference example (https://github.com/AI4Bharat/IndicTrans2,
huggingface_interface/). Runs on CPU in Docker (see scripts/i18n/README.md):

    python translate.py catalog.json out/ --langs hi,te --beams 3

- {0}, {1} pattern slots and brand/abbreviation terms (Vizito, OPD, UPI, ...) are swapped for
  rare numbers before translation and put back afterwards; a line where a slot did not survive is
  left out (the app then shows English for it).
- Writes out/<lang>.json ({ english: translation }) and resumes from it if stopped.
"""
import argparse, json, os, re, sys, time

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

try:
    from IndicTransToolkit.processor import IndicProcessor
except ImportError:  # older/newer package layouts
    from IndicTransToolkit import IndicProcessor

MODEL = "ai4bharat/indictrans2-en-indic-dist-200M"
CODES = {"hi": "hin_Deva", "te": "tel_Telu", "ta": "tam_Taml", "kn": "kan_Knda", "mr": "mar_Deva", "bn": "ben_Beng", "gu": "guj_Gujr"}
# Kept exactly as written (brand names, abbreviations people know in English).
KEEP = ["Vizito", "VIZITO", "OPD", "UPI", "OTP", "CSV", "PDF", "GST", "IST", "QR", "SMS", "ICU", "ECG", "MRI", "CT", "IPD", "Wi-Fi", "WhatsApp", "Google", "Razorpay", "PIN", "ID", "PAN", "IFSC", "KYC", "TAT", "EMI", "SOS"]
SLOT_BASE, KEEP_BASE = 9050, 9100
# Leading/trailing separators ("· bag", "Threshold:") are cut off before translation and put back after,
# so the model only sees words (it tends to drop such marks).
EDGE = re.compile(r"^([\s·•,—–|(-]*)(.*?)([\s·•—–|:(,-]*)$", re.S)


def protect(text):
    """Swap {n} slots and KEEP terms for numbers the model copies through unchanged."""
    keys = {}
    def slot(m):
        token = str(SLOT_BASE + int(m.group(1)))
        keys[token] = m.group(0)
        return token
    out = re.sub(r"\{(\d+)\}", slot, text)
    for i, term in enumerate(KEEP):
        token = str(KEEP_BASE + i)
        pattern = r"(?<![A-Za-z])" + re.escape(term) + r"(?![A-Za-z])"
        if re.search(pattern, out):
            out = re.sub(pattern, token, out)
            keys[token] = term
    return out, keys


def restore(text, keys):
    for token, original in keys.items():
        if token not in text:
            return None
        text = text.replace(token, original)
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("catalog")
    ap.add_argument("outdir")
    ap.add_argument("--langs", default=",".join(CODES))
    ap.add_argument("--beams", type=int, default=1)
    ap.add_argument("--batch", type=int, default=128)
    ap.add_argument("--threads", type=int, default=max(1, (os.cpu_count() or 4) - 2))
    ap.add_argument("--limit", type=int, default=0, help="translate only the first N strings (trial run)")
    args = ap.parse_args()

    torch.set_num_threads(args.threads)
    catalog = json.load(open(args.catalog, encoding="utf-8"))
    if args.limit:
        catalog = catalog[: args.limit]
    os.makedirs(args.outdir, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL, trust_remote_code=True).eval()
    ip = IndicProcessor(inference=True)

    for lang in args.langs.split(","):
        tgt = CODES[lang]
        path = os.path.join(args.outdir, f"{lang}.json")
        done = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
        todo = [s for s in catalog if s not in done and s not in KEEP and EDGE.match(s).group(2).strip()]
        todo.sort(key=len)  # similar lengths per batch = less padding
        print(f"[{lang}] {len(done)} done, {len(todo)} to go", flush=True)
        start, failed = time.time(), 0
        for b in range(0, len(todo), args.batch):
            chunk = todo[b : b + args.batch]
            edges = [EDGE.match(s).groups() for s in chunk]
            prepared = [protect(core) for _, core, _ in edges]
            batch = ip.preprocess_batch([p[0] for p in prepared], src_lang="eng_Latn", tgt_lang=tgt)
            inputs = tokenizer(batch, truncation=True, padding="longest", return_tensors="pt", return_attention_mask=True)
            with torch.no_grad():
                # Output is never much longer than the input; capping it keeps a stray batch from running to 256 tokens.
                cap = min(256, int(inputs["input_ids"].shape[1] * 2.5) + 8)
                generated = model.generate(**inputs, use_cache=True, min_length=0, max_length=cap, num_beams=args.beams, num_return_sequences=1)
            decoded = tokenizer.batch_decode(generated.detach().cpu().tolist(), skip_special_tokens=True, clean_up_tokenization_spaces=True)
            outputs = ip.postprocess_batch(decoded, lang=tgt)
            for src, (lead, _, trail), (_, keys), translated in zip(chunk, edges, prepared, outputs):
                restored = restore(translated.strip().rstrip(":"), keys)
                if restored:
                    done[src] = lead + restored + trail
                else:
                    failed += 1
            if True:  # save every batch (batches are slow on CPU)
                json.dump(done, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
                rate = (b + len(chunk)) / max(1e-6, time.time() - start)
                print(f"[{lang}] {b + len(chunk)}/{len(todo)}  {rate:.1f} str/s  slots lost: {failed}", flush=True)
        json.dump(done, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        print(f"[{lang}] finished: {len(done)} strings, {failed} left in English", flush=True)


if __name__ == "__main__":
    sys.exit(main())
