"""Lager den «tomme» varianten av stuen i /public/interior-openplan.webp (bilde-til-bilde med Gemini
via Emergent-nøkkelen). Brukes i AnnonseScene: tomt rom -> møblert (det ekte bildet), merket «møblert med KI».

Kjør: python3 scripts/generer-tomt-rom.py [variantnavn]
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

INN = sys.argv[2] if len(sys.argv) > 2 else "/app/public/interior-openplan.webp"
UT_DIR = "/tmp/tomt-rom"
os.makedirs(UT_DIR, exist_ok=True)

PROMPT2 = (
    "Edit this interior photo: remove the two dark bar stools at the kitchen island, the brown vase with flowers on the countertop, and the two framed pictures on the right wall. "
    "Leave the countertop and the wall completely bare. Keep everything else pixel-identical: kitchen island, oven, lamps, windows, floor, walls, perspective, lighting, aspect ratio. Photorealistic."
)
PROMPT = (
    "Edit this exact interior photograph into a realistic EMPTY-room photograph of the same apartment, as a real-estate "
    "photographer would shoot it before the tenant moves in. Remove ALL movable furniture and loose objects: the beige sofa, "
    "the round coffee table, the two bar stools/chairs, the plants, the vase with flowers, the coffee press and cups, the cushions, "
    "the framed pictures on the right wall (leave the wall bare), the two dark wooden bar stools at the island (remove them completely), the small table lamp on the window sill. It is CRITICAL that the bar stools, the vase with flowers and the two framed pictures are gone. KEEP exactly: the fitted dark-wood kitchen island with white countertop and the built-in oven, "
    "the wall-mounted black articulated lamp, the white pendant lamp and ceiling rose, the windows with the view of wooden houses outside, "
    "the white walls, the light oak parquet floor, the door frame, the lighting direction, the perspective, camera position and aspect ratio. "
    "Reconstruct clean floor and wall where objects were removed, with natural soft shadows. Do not add any new objects, people, text or decorations. "
    "Photorealistic, same color grading, same daylight, real-estate listing quality."
)


async def main():
    navn = sys.argv[1] if len(sys.argv) > 1 else "tomt"
    with Image.open(INN) as im:
        im = im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=92)
    b64 = base64.b64encode(buf.getvalue()).decode()

    chat = (
        LlmChat(api_key=KEY, session_id=f"dh-tomt-rom-{navn}", system_message="You are a meticulous real-estate photo retoucher.")
        .with_model("gemini", "gemini-2.5-flash-image")
        .with_params(modalities=["image", "text"])
    )
    tekst, bilder = await chat.send_message_multimodal_response(UserMessage(text=(PROMPT2 if len(sys.argv) > 2 else PROMPT), file_contents=[ImageContent(image_base64=b64)]))
    if not bilder:
        print("!! ingen bilde:", (tekst or "")[:300])
        sys.exit(1)
    ut = os.path.join(UT_DIR, f"{navn}.png")
    with open(ut, "wb") as f:
        f.write(base64.b64decode(bilder[0]["data"]))
    with Image.open(ut) as r:
        print("ok", ut, r.size, (tekst or "")[:120])


asyncio.run(main())
