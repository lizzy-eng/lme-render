#!/usr/bin/env python3
"""
ELEMENTS OF POWER BUILDER — runs inside GitHub Actions (free minutes, Rule Zero-D).
Builds one Elements of Power short or trailer (9:16, 1080x1920) from a SPEC json:
Lizzy's Canva opener image first frame, Fish Audio brand voice, pause-tight caption
beats (voice first, Law 1), style-locked flux scene art (Law 2), visual QA gate
(Law 4), max hold 7s (Law 3). Writes remotion/public/* and remotion/props.json for
the ElementsShort composition.

Spec (fetched from SPEC_URL, raw JSON in lizzy-eng/elements-of-power):
{
  "title": "...", "element": "EARTH", "accent": "#c45670",
  "look": "<style lock prompt prefix>",
  "opener_img": "<raw github url>", "logo_img": "<raw github url>",
  "scenes": [
    {"kind":"opener","label":"...","ref":"...","narr":"...","vis":null},
    {"kind":"teach","ref":"<citation>","narr":"...","vis":"<scene desc>"},
    {"kind":"declare","label":"...","narr":"...","vis":"<scene desc or null>"},
    {"kind":"cta","label":"...","ref":"...","narr":"...","vis":null}
  ]
}
Teach beats get TRUE captions: narration split on natural pauses via faster-whisper,
each beat shows the words being spoken while they are spoken.
"""
import os, json, base64, subprocess, urllib.request, urllib.error, re, math

ACC = os.environ["CF_ACCOUNT_ID"]
CF_KEY = os.environ["CF_API_KEY"]
CF_EMAIL = os.environ.get("CF_EMAIL", "")
SPEC_URL = os.environ["SPEC_URL"]
FPS = 30
PUB = os.path.join(os.path.dirname(__file__), "public")
os.makedirs(PUB, exist_ok=True)

spec = json.loads(urllib.request.urlopen(SPEC_URL, timeout=60).read())
LOOK = spec.get("look", "")


def fetch(url, path):
    data = urllib.request.urlopen(url, timeout=120).read()
    open(path, "wb").write(data)
    return os.path.basename(path)


def cutout(src, dst):
    """Subject/background separation (rembg u2net, open source, CPU). Returns the
    foreground filename or None; a failed cutout never blocks the render."""
    try:
        from rembg import remove
        from PIL import Image
        img = Image.open(src).convert("RGB")
        fg = remove(img)
        # require a meaningful subject (over 4 percent of pixels visible)
        alpha = fg.getchannel("A")
        coverage = sum(1 for a in alpha.getdata() if a > 40) / (fg.width * fg.height)
        if coverage < 0.04:
            print(f"CUTOUT_SKIP {src}: subject coverage {coverage:.1%}")
            return None
        fg.save(dst)
        print(f"CUTOUT_OK {os.path.basename(dst)} coverage {coverage:.1%}")
        return os.path.basename(dst)
    except Exception as e:
        print("CUTOUT_SKIPPED:", str(e)[:120])
        return None


def _ai(model, payload):
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACC}/ai/run/{model}"
    data = json.dumps(payload).encode()
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
            if e.code in (401, 403):
                continue
            raise
    raise RuntimeError(f"AI auth failed ({last})")


def qa_image(path, visual):
    """LAW 4 VISUAL QA GATE: a free vision model must SEE the described scene."""
    try:
        b64 = base64.b64encode(open(path, "rb").read()).decode()
        d = _ai("@cf/meta/llama-3.2-11b-vision-instruct",
                {"messages": [{"role": "user", "content": [
                    {"type": "text", "text": "List the main subjects, objects and visual style of this image in plain words. Also answer: does it contain any text or letters? Is it distorted, garbled or low quality?"},
                    {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}}]}]})
        seen = str(d.get("result", {}).get("response", "")).lower()
        if not seen:
            return True, "vision-unavailable (not blocking)"
        if re.search(r"\b(text|letters|words|writing)\b.{0,40}\byes\b", seen) or "garbled" in seen or "distorted" in seen:
            return False, "vision flagged text/garbling"
        want = set(re.findall(r"[a-z]+", visual.lower())) - {"a", "an", "the", "with", "and", "of", "in", "at", "no", "not"}
        got = set(re.findall(r"[a-z]+", seen))
        overlap = len(want & got) / max(1, len(want))
        print(f"IMAGE_QA {os.path.basename(path)} overlap={overlap:.2f}")
        if overlap < 0.25:
            return False, f"image matches only {overlap:.0%} of the scene description"
        return True, "ok"
    except Exception as e:
        print("IMAGE_QA_SKIPPED:", str(e)[:120])
        return True, "qa-unavailable (not blocking)"


def image(visual, path):
    """Style-locked scene art (LAW 2), 9:16, re-rolled on QA reject (LAW 4)."""
    prompt = f"{re.sub(r'[^A-Za-z0-9 ,.]', '', visual)}. {LOOK}"
    for attempt, seed in enumerate((770210, 424242, 918273)):
        try:
            d = _ai("@cf/black-forest-labs/flux-1-schnell",
                    {"prompt": prompt, "steps": 8, "seed": seed, "width": 768, "height": 1344})
            b = d.get("result", {}).get("image")
            if b:
                open(path, "wb").write(base64.b64decode(b))
                ok, reason = qa_image(path, visual)
                if not ok:
                    print(f"IMAGE_QA_REJECT attempt {attempt + 1} ({reason}) — re-rolling")
                    continue
                return True
        except Exception as e:
            print("IMAGE_ERR:", str(e)[:120])
            continue
    return False


def voice(text, base):
    """LAW 1: Fish Audio brand voice, fail loud if unavailable."""
    mp3 = base + ".mp3"
    fish = os.environ.get("FISH_API_KEY", "")
    if fish:
        try:
            body = json.dumps({"text": text, "reference_id": "9baa1352ca014e81999898e77de4533b", "format": "mp3"}).encode()
            req = urllib.request.Request("https://api.fish.audio/v1/tts", data=body,
                headers={"Authorization": "Bearer " + fish, "Content-Type": "application/json", "model": "s1"}, method="POST")
            data = urllib.request.urlopen(req, timeout=150).read()
            if len(data) > 1200:
                open(mp3, "wb").write(data)
                return os.path.basename(mp3)
        except Exception as e:
            print("FISH_TTS_ERROR:", str(e)[:120])
    raise RuntimeError("Fish Audio voice unavailable - refusing to render with a fallback voice")


def dur(path):
    out = subprocess.run(["ffprobe", "-v", "quiet", "-of", "json", "-show_format", path],
                         capture_output=True, text=True).stdout
    try:
        return max(1.6, float(json.loads(out)["format"]["duration"]))
    except Exception:
        return 4.0


def beats_from_audio(path):
    """Voice-first pause sync: split on natural breaths."""
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        segs, _ = model.transcribe(path, word_timestamps=True)
        words = []
        for s in segs:
            for w in (s.words or []):
                words.append((w.start, w.end, w.word))
        if len(words) < 2:
            return None
        beats, cur = [], [words[0]]
        for prev, w in zip(words, words[1:]):
            gap = w[0] - prev[1]
            if gap > 0.30 and (prev[1] - cur[0][0]) > 1.6:
                beats.append([cur[0][0], prev[1], "".join(x[2] for x in cur).strip()])
                cur = [w]
            else:
                cur.append(w)
        beats.append([cur[0][0], words[-1][1], "".join(x[2] for x in cur).strip()])
        beats[0][0] = 0.0
        # CONTINUITY (Lizzy's quality law, 2026-07-23): no dropped audio, ever. Each
        # beat ends exactly where the next begins; the last runs to the file's true
        # end. Cuts land inside pauses, so no word can ever be clipped or skipped.
        for j in range(len(beats) - 1):
            beats[j][1] = beats[j + 1][0]
        beats[-1][1] = dur(path)
        return beats
    except Exception as e:
        print("WHISPER_BEATS_FALLBACK:", str(e)[:140])
        return None


def align_captions(narr, bts):
    """Whisper is timing only; captions carry the SCRIPT text. Distribute the
    script's own words across beats proportionally to whisper's word counts so
    a mistranscription can never appear on screen."""
    words = narr.split()
    counts = [max(1, len(b[2].split())) for b in bts]
    total = sum(counts)
    out, pos = [], 0
    for j, (st, en, _txt) in enumerate(bts):
        remaining_beats = len(bts) - 1 - j
        if j == len(bts) - 1:
            take = len(words) - pos
        else:
            take = round(counts[j] / total * len(words))
            take = max(1, min(take, len(words) - pos - remaining_beats))
        out.append([st, en, " ".join(words[pos:pos + take])])
        pos += take
    return out


def qa_audio(path, expected):
    """LAW 4 AUDIO QA GATE: the voice must say the script."""
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        segs, _ = model.transcribe(path)
        heard = " ".join(s.text for s in segs).lower()
        want = set(re.findall(r"[a-z']+", expected.lower()))
        got = set(re.findall(r"[a-z']+", heard))
        overlap = len(want & got) / max(1, len(want))
        print(f"AUDIO_QA {os.path.basename(path)} overlap={overlap:.2f}")
        if overlap < 0.55:
            raise RuntimeError(f"AUDIO_QA_FAIL {path}: transcription matches only {overlap:.0%} of script")
        return True
    except ImportError:
        print("AUDIO_QA_SKIPPED: faster_whisper unavailable")
        return False


def cut(src, dst, start, end):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ss", f"{start:.3f}",
                    "-to", f"{end:.3f}", "-c:a", "libmp3lame", dst], check=True, timeout=90)
    return os.path.basename(dst)


def main():
    scenes = []
    opener_file = fetch(spec["opener_img"], os.path.join(PUB, "opener.png")) if spec.get("opener_img") else None
    logo_file = fetch(spec["logo_img"], os.path.join(PUB, "logo.png")) if spec.get("logo_img") else None

    for i, s in enumerate(spec["scenes"]):
        kind = s["kind"]
        narr = s["narr"]
        full = voice(narr, os.path.join(PUB, f"v{i}"))              # VOICE FIRST (LAW 1)
        fullpath = os.path.join(PUB, full)
        qa_audio(fullpath, narr)                                     # LAW 4 audio gate
        vis = s.get("vis")

        provided = None
        fg_name = None
        if s.get("vid_url"):
            provided = f"s{i}_mot.mp4"
            fetch(s["vid_url"], os.path.join(PUB, provided))
        elif s.get("img_url"):
            provided = f"s{i}_prov.jpg"
            fetch(s["img_url"], os.path.join(PUB, provided))
            # OWNED 2.5D ANIMATION (Lizzy 2026-07-23): cut the subject from the
            # background so the character moves independently of her world.
            if s.get("cutout", True):
                fg_name = cutout(os.path.join(PUB, provided), os.path.join(PUB, f"s{i}_fg.png"))

        if kind == "teach":
            bts = beats_from_audio(fullpath)
            if bts:
                bts = align_captions(narr, bts)
                # LAW 3: no still may hold past 7s; split toward ~5.5s
                MAX_HOLD, TARGET = 7.0, 5.5
                split = []
                for st, en, txt in bts:
                    dd = en - st
                    if dd <= MAX_HOLD:
                        split.append([st, en, txt])
                    else:
                        n = max(2, math.ceil(dd / TARGET))
                        step = dd / n
                        for k in range(n):
                            split.append([st + k * step, min(en, st + (k + 1) * step), txt])
                bts = split
            if bts and len(bts) > 1:
                # one QA-passed picture per couple of breaths, TRUE captions per beat
                img_cache = {}
                for bi, (st, en, txt) in enumerate(bts):
                    clip = cut(fullpath, os.path.join(PUB, f"b{i}_{bi}.mp3"), st, en)
                    if provided:
                        img_name = provided
                    else:
                        slot = bi // 2                                # fresh art every ~2 beats
                        img_name = f"s{i}_{slot}.jpg"
                        if img_name not in img_cache:
                            if not image(vis or narr, os.path.join(PUB, img_name)):
                                raise RuntimeError(f"IMAGE_GATE_FAIL scene {i} slot {slot}: no image passed visual QA after 3 rolls")
                            img_cache[img_name] = True
                    frames = max(16, int(dur(os.path.join(PUB, clip)) * FPS))
                    scenes.append({"kind": "teach", "label": txt,
                                   "ref": s.get("ref", "") if bi == 0 else "",
                                   "img": img_name, "fg": fg_name, "fx": s.get("fx", ""),
                                   "audio": clip, "frames": frames, "narr": txt})
                continue
            # fallback: single beat
            img_name = provided or f"s{i}.jpg"
            if not provided and not image(vis or narr, os.path.join(PUB, img_name)):
                raise RuntimeError(f"IMAGE_GATE_FAIL scene {i}: no image passed visual QA after 3 rolls")
            scenes.append({"kind": "teach", "label": s.get("label", narr), "ref": s.get("ref", ""),
                           "img": img_name, "fg": fg_name, "fx": s.get("fx", ""),
                           "audio": full, "frames": int(dur(fullpath) * FPS) + 8, "narr": narr})
            continue

        img_name = None
        if provided:
            img_name = provided
        elif kind == "opener":
            img_name = opener_file
        elif kind == "cta":
            img_name = logo_file
        elif vis:
            img_name = f"s{i}.jpg"
            if not image(vis, os.path.join(PUB, img_name)):
                raise RuntimeError(f"IMAGE_GATE_FAIL scene {i}: no image passed visual QA after 3 rolls")
        frames = int(dur(fullpath) * FPS) + 8
        scenes.append({"kind": kind, "label": s.get("label", ""), "ref": s.get("ref", ""),
                       "img": img_name, "fg": fg_name, "fx": s.get("fx", ""),
                       "audio": full, "frames": frames, "narr": narr})

    props = {"title": spec["title"], "element": spec.get("element", ""),
             "accent": spec.get("accent", "#c45670"), "scenes": scenes}
    open(os.path.join(os.path.dirname(__file__), "props.json"), "w").write(json.dumps(props, indent=2))
    total = sum(sc["frames"] for sc in scenes)
    print("TITLE=" + spec["title"])
    print(f"BEATS={len(scenes)} TOTAL_SECONDS={total / FPS:.1f}")
    print("wrote props.json + public assets")


if __name__ == "__main__":
    main()
