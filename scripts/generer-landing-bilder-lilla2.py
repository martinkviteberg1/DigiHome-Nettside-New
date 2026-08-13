"""Batch 2: flere maskoter (lilla univers) for /ny-forside."""
import asyncio
import base64
import os
import sys

from emergentintegrations.llm.chat import LlmChat, UserMessage

KEY = None
with open("/app/.env") as f:
    for line in f:
        if line.startswith("EMERGENT_LLM_KEY="):
            KEY = line.split("=", 1)[1].strip()
assert KEY

UT = "/app/public/landing"

MASKOT = (
    "an adorable tiny 3D mascot character shaped like a cozy Scandinavian house: "
    "soft rounded cream-white body, soft violet-purple gabled roof like a snug hat, "
    "two big friendly dark round eyes, subtle rosy blush cheeks, tiny stubby arms and legs, "
    "a small round warmly glowing window on its belly, a gentle happy smile, tiny green sprout on the rooftop. "
    "Pixar-style glossy 3D render, soft dreamy lighting, ultra high quality"
)

STIL = (
    "Premium SaaS landing page illustration. Soft lavender, periwinkle, lilac, "
    "mint-green and cream palette. Dreamy and calm. No text, no letters, no watermark, no logo."
)

FELLES = "plain very light lavender background with a subtle gradient, centered composition. "

BILDER = {
    "maskot-lupe-lilla": (
        f"Square portrait of {MASKOT}. The character curiously holds a big magnifying glass with both hands, "
        "one eye comically enlarged through the glass, standing on a small round patch of soft green grass. " + FELLES + STIL
    ),
    "maskot-foto-lilla": (
        f"Square portrait of {MASKOT}. The character happily holds a cute retro camera with both hands, taking a photo, "
        "small flash sparkle, standing on a small round patch of soft green grass. " + FELLES + STIL
    ),
    "maskot-kontrakt-lilla": (
        f"Square portrait of {MASKOT}. The character proudly holds a white paper document with a big violet wax seal and a small pen, "
        "standing on a small round patch of soft green grass. " + FELLES + STIL
    ),
    "maskot-mynt-lilla": (
        f"Square portrait of {MASKOT}. The character joyfully hugs a big shiny golden coin, a few smaller gold coins on the ground, "
        "standing on a small round patch of soft green grass. " + FELLES + STIL
    ),
    "maskot-sover-scene-lilla": (
        "Very wide 16:9 dreamy scene: soft lavender and periwinkle sky filled with gentle fluffy clouds, "
        f"and {MASKOT} sleeping peacefully curled up on a soft fluffy cloud in the center-right, eyes closed, tiny 'zzz' bubbles absent, "
        "a soft crescent moon far in the background, serene and magical, large calm empty sky areas on the left. "
        + STIL
    ),
    "maskot-duo-lilla": (
        f"Square portrait of two of {MASKOT} — one slightly bigger, one smaller like a little sibling — standing side by side waving cheerfully, "
        "on a small shared patch of soft green grass with tiny lavender flowers. " + FELLES + STIL
    ),
}


async def generer(navn, prompt):
    chat = (
        LlmChat(api_key=KEY, session_id=f"dh-landing3-{navn}", system_message="You are a world-class 3D illustrator.")
        .with_model("gemini", "gemini-2.5-flash-image")
        .with_params(modalities=["image", "text"])
    )
    tekst, bilder = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not bilder:
        print(f"  !! {navn}: ingen bilde ({(tekst or '')[:100]})")
        return False
    with open(os.path.join(UT, f"{navn}.png"), "wb") as f:
        f.write(base64.b64decode(bilder[0]["data"]))
    print(f"  ok {navn}")
    return True


async def main():
    kun = sys.argv[1] if len(sys.argv) > 1 else None
    for navn, prompt in BILDER.items():
        if kun and navn != kun:
            continue
        if not kun and os.path.exists(os.path.join(UT, f"{navn}.png")):
            print(f"  hopper over {navn}")
            continue
        print(f"genererer {navn} ...")
        if not await generer(navn, prompt):
            await generer(navn, prompt)
        await asyncio.sleep(2)


asyncio.run(main())
