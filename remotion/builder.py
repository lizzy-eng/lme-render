#!/usr/bin/env python3
"""
FACELESS REMOTION BUILDER — runs inside GitHub Actions (real Node + Chrome, free minutes).
Generates the listicle script + Naomi cast images (free Workers AI) + neural voice (edge-tts),
measures durations, and writes remotion/public/* + remotion/props.json for the Remotion render.
No new secret: uses the Cloudflare global key already stored for the runner deploy.
"""
import os, json, base64, subprocess, urllib.request, urllib.error, re

ACC = os.environ["CF_ACCOUNT_ID"]
CF_KEY = os.environ["CF_API_KEY"]       # global key (cfk_, X-Auth) OR scoped token (cfut_, Bearer)
CF_EMAIL = os.environ.get("CF_EMAIL", "")
TOPIC = os.environ.get("TOPIC", "5 quiet ways to hear God in the messy middle").strip()
NSCENES = max(3, min(8, int(os.environ.get("NSCENES", "5"))))
CASTKEY = os.environ.get("CAST", "naomi").lower()
FPS = 30
PUB = os.path.join(os.path.dirname(__file__), "public")
os.makedirs(PUB, exist_ok=True)

CAST = {
    "naomi": {"seed": 770210, "desc": "Naomi, a warm Black woman in her early thirties, short natural curly afro, "
              "rich dark-brown skin, soft almond eyes, gentle rounded cheeks, small gold hoop earrings, soft blush-pink top"},
    "grace": {"seed": 448190, "desc": "Grace, a Black woman in her fifties, silver-grey natural coils, warm deep-brown skin, "
              "kind lined eyes, elegant, wearing a soft grey wrap"},
}
PERSON = CAST.get(CASTKEY, CAST["naomi"])
LOOK = ("polished 3D Pixar-style animated still, cinematic, soft warm lighting, gentle depth of field, "
        "rose-pink and silver-grey accents, wholesome and uplifting, highly detailed, adult, no text, no words")


def _ai(model, payload):
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACC}/ai/run/{model}"
    data = json.dumps(payload).encode()
    # Global key (cfk_) authenticates via X-Auth headers; scoped tokens (cfut_/cfat_) via
    # Bearer. Try whichever fits, so this works no matter which key the secret holds.
    header_sets = []
    if CF_EMAIL:
        header_sets.append({"X-Auth-Key": CF_KEY, "X-Auth-Email": CF_EMAIL})
    header_sets.append({"Authorization": f"Bearer {CF_KEY}"})
    last = None
    for hdrs in header_sets:
        try:
            req = urllib.request.Request(url, data=data, headers={**hdrs, "Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 401:
                continue
            raise
    raise RuntimeError(f"AI auth failed ({last})")


def script(topic, n):
    sysmsg = "You write high-retention faceless YouTube LISTICLE shorts. Return ONLY valid JSON, no prose, no code fences."
    prompt = (f'Topic: "{topic}". Build a NUMBERED listicle short with exactly {n} items. '
              'JSON: {"title":"<punchy on-screen title, <=7 words>","hook":"<one spoken opening sentence>",'
              '"items":[{"label":"<3 to 6 word on-screen headline>","narration":"<1-2 calm spoken sentences, no number>",'
              '"visual":"<setting and posture only, no hands/holding>","emotion":"<facial expression, e.g. peaceful, hopeful, weary, joyful, resolved>"}],'
              '"cta":"<one spoken closing call to action>"}. Exactly ' + str(n) + ' items.')
    d = _ai("@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            {"messages": [{"role": "system", "content": sysmsg}, {"role": "user", "content": prompt}], "max_tokens": 1400})
    res = d.get("result", {})
    rsp = res.get("response")
    if rsp is None:  # OpenAI-style models return choices[].message.content
        try:
            rsp = res["choices"][0]["message"]["content"]
        except Exception:
            rsp = ""
    if isinstance(rsp, dict):
        return rsp
    m = re.search(r"\{[\s\S]*\}", rsp if isinstance(rsp, str) else json.dumps(rsp))
    if not m:
        raise RuntimeError("script model returned no JSON: " + str(rsp)[:200])
    return json.loads(m.group(0))


def image(visual, emotion, path):
    face = f"her face clearly and genuinely expresses {emotion or 'warmth'}"
    frame = ("head-and-shoulders portrait, camera close on her face, face in sharp focus, "
             "hands and arms not visible, no hands, no objects held")
    clean = re.sub(r"[^A-Za-z0-9 ,.]", "", str(visual))
    attempts = [
        f"{PERSON['desc']}. {clean}. {face}. {frame}. {LOOK}",
        f"Close head-and-shoulders portrait of {PERSON['desc']}. {face}. {frame}. {LOOK}",
        f"Close 3D Pixar-style face portrait of {PERSON['desc']}, {face}, soft cinematic light, no hands, no text",
    ]
    for p in attempts:
        try:
            d = _ai("@cf/black-forest-labs/flux-1-schnell", {"prompt": p, "steps": 8, "seed": PERSON["seed"]})
            b = d.get("result", {}).get("image")
            if b:
                open(path, "wb").write(base64.b64decode(b))
                return True
        except Exception:
            continue
    return False


def voice(text, base):
    mp3 = base + ".mp3"
    try:
        subprocess.run(["edge-tts", "--voice", "en-US-AriaNeural", "--text", text, "--write-media", mp3],
                       check=True, timeout=45)
        if os.path.exists(mp3) and os.path.getsize(mp3) > 800:
            return os.path.basename(mp3)
    except Exception:
        pass
    wav = base + ".wav"
    subprocess.run(["espeak-ng", "-v", "en-us", "-s", "150", "-w", wav, text], check=True, timeout=45)
    return os.path.basename(wav)


def dur(path):
    out = subprocess.run(["ffprobe", "-v", "quiet", "-of", "json", "-show_format", path],
                         capture_output=True, text=True).stdout
    try:
        return max(1.8, float(json.loads(out)["format"]["duration"]))
    except Exception:
        return 3.0


def main():
    sc = script(TOPIC, NSCENES)
    title = sc.get("title") or TOPIC
    items = (sc.get("items") or [])[:NSCENES]
    scenes = []

    def add(kind, number, label, narration, visual, emotion):
        i = len(scenes)
        img_name = None
        if visual is not None:
            img_name = f"img{i}.jpg"
            if not image(visual, emotion, os.path.join(PUB, img_name)):
                img_name = None
        aud = voice(narration or label, os.path.join(PUB, f"voice{i}"))
        frames = int(dur(os.path.join(PUB, aud)) * FPS) + 8
        scenes.append({"kind": kind, "number": number, "label": label, "narration": narration,
                       "img": img_name, "audio": aud, "frames": frames})

    add("title", 0, title, sc.get("hook") or title, f"a serene moment reflecting {title}", "serene, welcoming")
    for n, it in enumerate(items, 1):
        add("item", n, it.get("label") or f"Number {n}",
            f"Number {n}. {it.get('narration') or it.get('label') or ''}",
            it.get("visual") or it.get("label") or title, it.get("emotion") or "warm")
    add("cta", 0, sc.get("cta") or "Follow for more.", sc.get("cta") or "Follow for more like this.", None, None)

    props = {"title": title, "accent": "#c45670", "scenes": scenes}
    open(os.path.join(os.path.dirname(__file__), "props.json"), "w").write(json.dumps(props, indent=2))
    print("TITLE=" + title)
    print("SCENES=" + str(len(scenes)))
    print("wrote props.json + public assets")


if __name__ == "__main__":
    main()
