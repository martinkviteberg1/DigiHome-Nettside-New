"""Lager en redigert variant av et interiørbilde (bilde-til-bilde med Gemini via Emergent-nøkkelen).

Brukes for før/etter i AnnonseFilm: soverommet «før» (useng, rotete) -> «etter» (det ekte bildet, redd opp).

Kjør: python3 scripts/generer-variant.py <variant> <inn.webp> [ut-dir]
  variant: useng | tomt
"""
import asyncio
import base64
import io
import os
import sys

from PIL import Image
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

KEY = None
with open("/app/.env") as f:
    for line in f:
        if line.startswith("EMERGENT_LLM_KEY="):
            KEY = line.split("=", 1)[1].strip()
assert KEY, "EMERGENT_LLM_KEY mangler"

VARIANT = sys.argv[1] if len(sys.argv) > 1 else "useng"
INN = sys.argv[2] if len(sys.argv) > 2 else "/app/public/interior-bedroom2.webp"
UT_DIR = sys.argv[3] if len(sys.argv) > 3 else "/tmp/variant"
os.makedirs(UT_DIR, exist_ok=True)

PROMPTS = {
    "useng": (
        "Edit this exact bedroom photograph so it looks like an ordinary lived-in morning BEFORE the bed was made, as a tenant's quick phone snapshot. "
        "Make the bed clearly UNMADE: the white duvet rumpled, folded back and hanging partly off the near corner of the bed, the sheet creased, "
        "the pillows flattened and pushed unevenly against the headboard wall, the grey patterned throw crumpled in a heap at the foot of the bed. "
        "Add a casual grey knitted sweater dropped on the bed and a paperback book face-down on the mattress. Leave the left curtain hanging slightly askew. "
        "KEEP EXACTLY the same room, camera position, perspective, lens, framing and aspect ratio: the same white walls, the window with the white wooden house outside, "
        "both beige curtains, the white wardrobe on the right, the small wooden bedside table on the left, the light floor, the same soft daylight and color grading. "
        "Do not add people, text, or new furniture. Photorealistic, natural, believable — not staged."
    ),
    "fasade": (
        "Edit this exact photograph: REMOVE the man standing on the sidewalk completely, and reconstruct what is behind him — the facade, the dark entrance door, "
        "the stone steps, the wall, the pavement — so the street is empty. Keep EVERYTHING else pixel-identical: the same building, windows with warm interior light, "
        "the two wall lanterns, the balcony, the street lamp, the dusk sky tone, camera position, perspective, framing, aspect ratio and color grading. "
        "Do not add people, cars, text or objects. Photorealistic, seamless."
    ),
    "tomt": (
        "Edit this exact interior photograph into a realistic EMPTY-room photograph of the same apartment. Remove all movable furniture and loose objects. "
        "Keep walls, floor, windows, fixed lamps, perspective, camera position, lighting and aspect ratio identical. Photorealistic."
    ),
}


async def main():
    with Image.open(INN) as im:
        im = im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=94)
    b64 = base64.b64encode(buf.getvalue()).decode()

    chat = (
        LlmChat(api_key=KEY, session_id=f"dh-variant-{VARIANT}", system_message="You are a meticulous real-estate photo retoucher.")
        .with_model("gemini", "gemini-2.5-flash-image")
        .with_params(modalities=["image", "text"])
    )
    tekst, bilder = await chat.send_message_multimodal_response(UserMessage(text=PROMPTS[VARIANT], file_contents=[ImageContent(image_base64=b64)]))
    if not bilder:
        print("!! ingen bilde:", (tekst or "")[:300])
        sys.exit(1)
    ut = os.path.join(UT_DIR, f"{VARIANT}.png")
    with open(ut, "wb") as f:
        f.write(base64.b64decode(bilder[0]["data"]))
    with Image.open(ut) as r:
        print("ok", ut, r.size, (tekst or "")[:120])


asyncio.run(main())
