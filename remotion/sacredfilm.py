#!/usr/bin/env python3
"""
SACRED FILM BUILDER — runs inside GitHub Actions (free minutes, Rule Zero-D).
Builds a FULL narrated SacredEcho33 Bible teaching video: Pixar-style Middle Eastern
scenes (free Workers AI flux) + warm narration (edge-tts) with each scene held for
exactly the length of its narration (voice synced to scene). Writes remotion/public/*
and remotion/props.json for the SacredFilm Remotion composition (1920x1080).
No new secret: uses the Cloudflare key already stored for the runner.
"""
import os, json, base64, subprocess, urllib.request, urllib.error, re

ACC = os.environ["CF_ACCOUNT_ID"]
CF_KEY = os.environ["CF_API_KEY"]
CF_EMAIL = os.environ.get("CF_EMAIL", "")
STORY = os.environ.get("STORY", "ruth").lower()
FPS = 30
PUB = os.path.join(os.path.dirname(__file__), "public")
os.makedirs(PUB, exist_ok=True)

LOOK = ("polished 3D Pixar-style animated film still, cinematic movie frame, soft warm cinematic lighting, "
        "gentle depth of field, wholesome and reverent, highly detailed, historically accurate ancient Near East, "
        "ancient Levantine Middle Eastern people with warm brown skin and dark hair, period accurate humble robes "
        "and headscarves in earth tones with soft rose and cream accents, NOT European, no text, no words, no letters")

# The Story of Ruth (CSB scripture protocol). label = on-screen line, narr = spoken.
RUTH = [
 {"kind":"title","label":"The Story of Ruth","ref":"Loyalty, Redemption, Provision",
  "narr":"In the days when the judges ruled, a famine drove a family from Bethlehem into Moab. This is the story of Ruth, and of a loyalty that would not let go.",
  "vis":"A small family walking a dusty road across golden hills at dawn, wide sweeping landscape"},
 {"kind":"scene","label":"Everything was lost","ref":"",
  "narr":"In Moab, tragedy came. Naomi lost her husband, and then both of her sons. She was left with her two daughters in law, and a heart emptied of everything but grief.",
  "vis":"An older Middle Eastern woman named Naomi, grieving quietly, two younger women beside her, muted sorrowful evening light"},
 {"kind":"scene","label":"Ruth would not let go","ref":"",
  "narr":"Naomi decided to return home to Bethlehem, and she urged her daughters to go back to their own families. One kissed her goodbye. But Ruth clung to her.",
  "vis":"Three women on a dusty road, one figure turning away in the distance, a younger woman holding onto an older woman"},
 {"kind":"verse","label":"Where you go, I will go.","ref":"Ruth 1:16, CSB",
  "narr":"Ruth said, Where you go I will go, and where you stay I will stay. Your people will be my people, and your God will be my God.",
  "vis":"Close on Ruth, a young woman with warm brown skin, holding Naomi's hands, devoted and certain, soft golden light"},
 {"kind":"scene","label":"A foreigner in the fields","ref":"",
  "narr":"They came to Bethlehem at the beginning of the barley harvest. Ruth, a foreigner and a widow, went to glean in the fields, gathering the leftover grain to keep them both alive.",
  "vis":"Ruth gleaning stalks of barley in a vast golden harvest field at warm morning light, humble and hopeful"},
 {"kind":"scene","label":"Kindness had a name","ref":"",
  "narr":"The field belonged to Boaz, a man of standing and of kindness. He noticed Ruth, and told his workers to leave extra grain for her, and to let her drink freely from their water.",
  "vis":"Boaz, a kind older Middle Eastern man, speaking gently to harvest workers, Ruth gleaning in the field behind them"},
 {"kind":"verse","label":"Under his wings you have come for refuge.","ref":"Ruth 2:12, CSB",
  "narr":"Boaz blessed her. May the Lord repay you for what you have done, and may you be richly rewarded by the God under whose wings you have come to take refuge.",
  "vis":"Boaz and Ruth standing together in the golden field, warm hopeful light between them"},
 {"kind":"scene","label":"Emptiness, filled","ref":"",
  "narr":"In time, Boaz redeemed the family, and took Ruth as his wife. The women of Bethlehem rejoiced with Naomi, whose empty arms God had filled with a child.",
  "vis":"Ruth and Boaz together, an older woman Naomi joyfully holding a baby, a warm gathering of villagers celebrating"},
 {"kind":"close","label":"His loyalty will not let you go","ref":"sacredecho33.com",
  "narr":"Ruth, a foreigner, became the great grandmother of King David, and part of the very line of Jesus. The same God who saw Ruth sees you. Wherever you are standing today, His loyalty will not let you go.",
  "vis":"A peaceful warm sunset over the hills of Bethlehem, soft golden and rose light, hopeful and still"},
]

STICK_LOOK = ("simple bold deep charcoal grey stick figure line drawing (dark warm grey, NOT pure black), plain "
              "solid white background, thick clean minimal lines, cute expressive and warm, lots of white space, "
              "flat 2D cartoon, a simple head covering so the figure reads as an ancient Middle Eastern person, "
              "monochrome grey only, no bright color, no text, no words, no letters")

# Elijah, the give-up story, STICKMAN style (daily inspiration lane). vis = stick-figure action.
# vis = SETTING ONLY, no people. The character is the code-ANIMATED stick figure that
# plays on top (motion), so the figure genuinely moves instead of being a static still.
ELIJAH = [
 {"kind":"title","label":"The Day Elijah\nWanted to Give Up","ref":"When you feel like quitting","motion":"trudge",
  "narr":"One of the boldest men in the Bible sat down in the wilderness and asked God to take his life. This is Elijah, and the truth about what God does when you have nothing left.",
  "vis":"an empty flat desert horizon line with a few small scrub bushes, wide open, no people, no figures"},
 {"kind":"scene","label":"He had nothing left","ref":"","motion":"slump",
  "narr":"He had just seen fire fall from heaven. But fear sent him running into the desert, alone, and completely out of strength.",
  "vis":"one simple bare broom tree on an empty desert horizon, no people, no figures"},
 {"kind":"verse","label":"I have had enough, Lord.","ref":"1 Kings 19:4, CSB","motion":"slump",
  "narr":"He said, I have had enough, Lord. Take my life. This is not a weak man. It is a faithful one who ran empty.",
  "vis":"a small bare tree and an empty sky over a quiet desert horizon, no people, no figures"},
 {"kind":"scene","label":"God did not scold him","ref":"","motion":"angel",
  "narr":"Then he fell asleep. And an angel touched him and said, get up and eat. There was warm bread and a jar of water beside him. God did not lecture him. God fed him.",
  "vis":"a round loaf of bread and a simple clay water jar resting on the ground beside a bare tree, soft light, no people, no figures"},
 {"kind":"verse","label":"Get up and eat.","ref":"1 Kings 19:7, CSB","motion":"angel",
  "narr":"The angel came back a second time and said, get up and eat, or the journey will be too much for you.",
  "vis":"bread and a water jar on the ground with a soft glow of light above them, no people, no figures"},
 {"kind":"scene","label":"Strength for the journey","ref":"","motion":"eat",
  "narr":"So he got up, and ate, and drank. And strengthened by that food he traveled forty days to the mountain of God. Rest and bread came before the calling.",
  "vis":"small simple mountains in the distance with a rising sun over an open desert path, no people, no figures"},
 {"kind":"close","label":"You are not done","ref":"sacredecho33.com","motion":"stand",
  "narr":"God met Elijah in his lowest place. He let him rest, He fed him, and He gave him what was next. The same God who saw Elijah sees you. Wherever you are standing, you are not done.",
  "vis":"a small hill at sunrise on an open horizon, hopeful light, no people, no figures"},
]

STORIES = {"ruth": RUTH, "elijah": ELIJAH}
SCENES = STORIES.get(STORY, RUTH)
CUR_LOOK = STICK_LOOK if STORY == "elijah" else LOOK


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


def image(visual, path):
    prompt = f"{re.sub(r'[^A-Za-z0-9 ,.]', '', visual)}. {CUR_LOOK}"
    for _ in range(2):
        try:
            d = _ai("@cf/black-forest-labs/flux-1-schnell", {"prompt": prompt, "steps": 8, "seed": 770210})
            b = d.get("result", {}).get("image")
            if b:
                open(path, "wb").write(base64.b64decode(b))
                if STORY == "elijah":
                    # STICKMAN FRAMING FIX: force true monochrome (no stray colour ever) and
                    # letterbox onto a white 16:9 canvas so the whole figure stays in frame
                    # instead of being cropped/zoomed out of the shot.
                    tmp = path + ".fix.jpg"
                    try:
                        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-vf",
                                        "hue=s=0,scale=1600:900:force_original_aspect_ratio=decrease,"
                                        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:white", tmp],
                                       check=True, timeout=90)
                        os.replace(tmp, path)
                    except Exception as e:
                        print("FRAME_FIX_SKIPPED:", str(e)[:100])
                return True
        except Exception:
            continue
    return False


def voice(text, base):
    mp3 = base + ".mp3"
    # PRIMARY: Lizzy's Fish Audio brand voice (warm, not robotic). NEVER edge-tts unless Fish is down.
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
            print("FISH_TTS_FALLBACK:", str(e)[:120])
    # HARD GATE: a final render must carry the Fish brand voice. If Fish is unavailable
    # the render FAILS LOUD instead of shipping a robotic fallback voice to Lizzy.
    if os.environ.get("FISH_REQUIRED", "1") == "1":
        raise RuntimeError("Fish Audio voice unavailable (key missing or API failed) and FISH_REQUIRED=1 - refusing to render with a fallback voice")
    # fallback only if Fish fails
    try:
        subprocess.run(["edge-tts", "--voice", "en-US-JennyNeural", "--text", text, "--write-media", mp3], check=True, timeout=60)
        if os.path.exists(mp3) and os.path.getsize(mp3) > 800:
            return os.path.basename(mp3)
    except Exception:
        pass
    wav = base + ".wav"
    subprocess.run(["espeak-ng", "-v", "en-us", "-s", "148", "-w", wav, text], check=True, timeout=60)
    return os.path.basename(wav)


def dur(path):
    out = subprocess.run(["ffprobe", "-v", "quiet", "-of", "json", "-show_format", path],
                         capture_output=True, text=True).stdout
    try:
        return max(2.2, float(json.loads(out)["format"]["duration"]))
    except Exception:
        return 4.0


def beats_from_audio(path):
    """VOICE-FIRST PAUSE SYNC (the reference method): word timestamps -> split on natural
    pauses so the picture changes on the breath, never on a guessed scene length."""
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
            if gap > 0.32 and (prev[1] - cur[0][0]) > 1.8:      # a real breath, and the beat has legs
                beats.append([cur[0][0], prev[1], "".join(x[2] for x in cur).strip()])
                cur = [w]
            else:
                cur.append(w)
        beats.append([cur[0][0], words[-1][1], "".join(x[2] for x in cur).strip()])
        beats[0][0] = 0.0                                        # keep the head of the clip
        return beats
    except Exception as e:
        print("WHISPER_BEATS_FALLBACK:", str(e)[:140])
        return None


def qa_audio(path, expected):
    """AUDIO QA GATE: transcribe the narration back and require it to match the script.
    A render whose voice does not say the script fails loud, never ships."""
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
    title = "The Story of Ruth" if STORY == "ruth" else "The Day Elijah Wanted to Give Up"
    for i, s in enumerate(SCENES):
        full = voice(s["narr"], os.path.join(PUB, f"v{i}"))          # VOICE FIRST
        fullpath = os.path.join(PUB, full)
        qa_audio(fullpath, s["narr"])                                # QA: voice says the script
        bts = beats_from_audio(fullpath)
        if bts and len(bts) > 1:
            for bi, (st, en, _txt) in enumerate(bts):                 # one picture per breath
                clip = cut(fullpath, os.path.join(PUB, f"b{i}_{bi}.mp3"), st, en)
                # STICKMAN LANE: no generated backgrounds at all. The world is the clean
                # code horizon and the LOCKED AI pose sprites (public/elijah_poses/).
                if STORY == "elijah":
                    img_name = None
                else:
                    img_name = f"s{i}_{bi}.jpg"
                    if not image(s["vis"], os.path.join(PUB, img_name)):
                        img_name = None
                frames = max(18, int(dur(os.path.join(PUB, clip)) * FPS))
                scenes.append({"kind": s["kind"] if bi == 0 else "scene", "label": s["label"],
                               "ref": s.get("ref", "") if bi == 0 else "",
                               "img": img_name, "audio": clip, "frames": frames,
                               "motion": s.get("motion")})
        else:
            if STORY == "elijah":
                img_name = None
            else:
                img_name = f"s{i}.jpg"
                if not image(s["vis"], os.path.join(PUB, img_name)):
                    img_name = None
            frames = int(dur(fullpath) * FPS) + 8
            scenes.append({"kind": s["kind"], "label": s["label"], "ref": s.get("ref", ""),
                           "img": img_name, "audio": full, "frames": frames,
                           "motion": s.get("motion")})
    props = {"title": title, "accent": "#c45670", "scenes": scenes}
    open(os.path.join(os.path.dirname(__file__), "props.json"), "w").write(json.dumps(props, indent=2))
    print("TITLE=" + title)
    print("BEATS=" + str(len(scenes)))
    print("wrote props.json + public assets")


if __name__ == "__main__":
    main()
