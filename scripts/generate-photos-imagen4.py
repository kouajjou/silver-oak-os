#!/usr/bin/env python3
"""
PHASE 2 PHOTOS — 12 portraits via Imagen 4.0 Ultra
6 chefs x 2 variantes = 12 images
V1 → /agents/<n>.jpg (photo active)
V2 → /agents/_bank/<n>_v2.jpg (banque AgentFactory)
"""
import os, sys, base64, json, time, requests
from pathlib import Path

GKEY = os.environ.get("GOOGLE_API_KEY", "")
if not GKEY:
    sys.exit("❌ GOOGLE_API_KEY missing")

OUTPUT_DIR = Path("/app/silver-oak-os/public/agents")
BANK_DIR = OUTPUT_DIR / "_bank"
META_DIR = OUTPUT_DIR / "_metadata"
for d in [OUTPUT_DIR, BANK_DIR, META_DIR]:
    d.mkdir(parents=True, exist_ok=True)

MODEL = "imagen-4.0-ultra-generate-001"

AGENTS = {
    "alex": {
        "role": "Chief of Staff",
        "prompt": "Editorial portrait photograph of a Mediterranean man, 38 years old, Andalusian Spanish features, salt-and-pepper short hair, warm hazel eyes, light olive tan skin, three-day stubble, navy linen blazer over white henley shirt, confident calm gaze. Soft natural window light from the left, shallow depth of field f/1.8, 85mm lens. Marbella villa background bokeh with olive trees and terracotta wall. Square portrait crop, shoulders-up. Magazine quality reminiscent of Monocle and Kinfolk. Photorealistic skin texture with visible pores, no AI smoothness."
    },
    "sara": {
        "role": "Communications",
        "prompt": "Editorial portrait photograph of a Mediterranean woman, 34 years old, southern Spanish features, dark wavy shoulder-length hair, deep brown eyes, olive skin, minimal natural makeup, cream silk blouse. Warm engaged smile with direct eye contact. Golden hour Marbella terrace light from upper left, bougainvillea bokeh background. Square portrait crop, shoulders-up. 85mm lens shallow depth of field. Magazine quality reminiscent of Vanity Fair Spain. Photorealistic natural skin texture, no airbrushing."
    },
    "leo": {
        "role": "Content",
        "prompt": "Editorial portrait photograph of a Mediterranean man, 30 years old, French-Spanish features, tousled dark brown hair, hazel-green eyes, light olive skin, clean shaven, vintage white t-shirt, unstructured beige linen jacket. Creative thoughtful expression with slight head tilt. Soft diffused overcast natural light, white-washed Andalusian wall background. Square portrait crop, shoulders-up. 85mm lens shallow depth of field. Magazine quality reminiscent of M le Mag du Monde. Photorealistic skin, natural texture, no AI smoothness."
    },
    "marco": {
        "role": "Operations",
        "prompt": "Editorial portrait photograph of a Mediterranean man, 42 years old, Italian or Greek features, short dark hair greying at temples, intense brown eyes, tanned skin, neatly trimmed beard, dark grey merino crewneck sweater. Steady reliable gaze, neutral confident expression. Hard side light from window, dark gradient background. Square portrait crop, shoulders-up. 85mm lens. Magazine quality reminiscent of Esquire Italia. Photorealistic with natural skin texture, visible pores, no airbrushing."
    },
    "nina": {
        "role": "Research",
        "prompt": "Editorial portrait photograph of a Mediterranean woman, 37 years old, Andalusian features, dark hair pulled back loosely with strands escaping, sharp grey-green eyes, fair olive skin, subtle natural freckles, round tortoiseshell glasses, charcoal turtleneck. Analytical curious expression. North-facing soft natural light, library bokeh background. Square portrait crop, shoulders-up. 85mm lens. Magazine quality reminiscent of El Pais Semanal. Photorealistic skin with natural texture, no smoothing."
    },
    "maestro": {
        "role": "CTO Orchestrator",
        "prompt": "Editorial portrait photograph of a Mediterranean person, 40 years old, ambiguous androgynous Iberian features, salt-and-pepper short hair, calm focused dark brown eyes, olive skin, minimal black mock-neck top. Quiet authority composed half-smile, direct eye contact. Studio softbox single light from left, deep grey gradient background. Square portrait crop, shoulders-up. 85mm lens. Magazine quality reminiscent of Wired editorial. Photorealistic skin with natural texture, visible pores, no AI sheen."
    }
}

def generate_imagen(prompt, label):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:predict?key={GKEY}"
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "1:1",
            "personGeneration": "allow_adult",
            "safetyFilterLevel": "block_only_high"
        }
    }
    r = requests.post(url, json=payload, timeout=90)
    if r.status_code != 200:
        print(f"  ❌ {label}: HTTP {r.status_code} — {r.text[:300]}")
        return None
    data = r.json()
    predictions = data.get("predictions", [])
    if not predictions:
        print(f"  ❌ {label}: no predictions — {json.dumps(data)[:200]}")
        return None
    img_b64 = predictions[0].get("bytesBase64Encoded")
    if not img_b64:
        print(f"  ❌ {label}: no bytesBase64Encoded")
        return None
    return base64.b64decode(img_b64)

def main():
    print("="*60)
    print(f"PHASE 2 PHOTOS — {MODEL}")
    print("="*60)
    results = []
    cost_per_img = 0.08
    total_cost = 0.0

    for agent, info in AGENTS.items():
        for variant in [1, 2]:
            label = f"{agent}_v{variant}"
            print(f"\n→ Generating {label} ({info['role']})...")
            t0 = time.time()

            img_bytes = generate_imagen(info["prompt"], label)
            elapsed = time.time() - t0

            if not img_bytes:
                results.append({"agent": agent, "variant": variant, "status": "FAIL"})
                continue

            out_path = OUTPUT_DIR / f"{agent}.jpg" if variant == 1 else BANK_DIR / f"{agent}_v2.jpg"
            out_path.write_bytes(img_bytes)
            size_kb = len(img_bytes) / 1024

            meta = {
                "agent": agent, "role": info["role"], "variant": variant,
                "model": MODEL, "cost_usd": cost_per_img,
                "size_kb": round(size_kb, 1), "generation_time_sec": round(elapsed, 2),
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "path": str(out_path)
            }
            (META_DIR / f"{agent}_v{variant}.json").write_text(json.dumps(meta, indent=2))

            total_cost += cost_per_img
            results.append({"agent": agent, "variant": variant, "status": "OK", "size_kb": round(size_kb,1), "time_sec": round(elapsed,2)})
            print(f"  ✅ {out_path.name} ({size_kb:.0f}KB, {elapsed:.1f}s)")

    ok = len([r for r in results if r["status"] == "OK"])
    print(f"\n{'='*60}")
    print(f"DONE: {ok}/12 images OK, total cost: ${total_cost:.2f}")
    print("="*60)

    summary = {"model": MODEL, "ok": ok, "failed": 12-ok, "total_cost_usd": round(total_cost,2), "results": results}
    (META_DIR / "summary.json").write_text(json.dumps(summary, indent=2))
    return summary

if __name__ == "__main__":
    main()
