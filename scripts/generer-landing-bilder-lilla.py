"""V2: Lilla univers (DigiHome-lilla, ala Unloopa-referansen) for /ny-forside.

Genererer *-lilla.png i /app/public/landing/. Kjor:
  python3 scripts/generer-landing-bilder-lilla.py            # alle som mangler
  python3 scripts/generer-landing-bilder-lilla.py hero-scene-lilla
"""
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
assert KEY, "EMERGENT_LLM_KEY mangler i /app/.env"

UT = "/app/public/landing"
os.makedirs(UT, exist_ok=True)

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

BILDER = {
    "hero-scene-lilla": (
        "Very wide 16:9 dreamy pastoral landscape for a website hero: soft lavender and periwinkle "
        "morning sky with gentle fluffy lilac-white clouds filling the upper half (large calm empty sky area), "
        "rolling soft green meadows with scattered lavender wildflowers and a winding light stone path leading to the horizon, "
        "blossoming trees with white and lilac flowers framing the left and right edges, "
        "a few tiny cozy houses with violet-purple roofs in the far distance, soft morning haze, serene and minimalist. "
        + STIL
    ),
    "maskot-vink-lilla": (
        f"Square portrait of {MASKOT}. The character is waving cheerfully with one raised arm, "
        "standing on a small round patch of soft green grass with three tiny lavender wildflowers, "
        "plain very light lavender background with a subtle gradient, centered composition, lots of empty space around the character. "
        + STIL
    ),
    "maskot-nokkel-lilla": (
        f"Square portrait of {MASKOT}. The character proudly holds a big shiny golden key with both arms, "
        "standing on a small round patch of soft green grass, "
        "plain very light lavender background with a subtle gradient, centered composition. "
        + STIL
    ),
    "maskot-titter-lilla": (
        f"Square illustration of {MASKOT}. Only the head, eyes and tiny hands of the character are visible, "
        "peeking curiously over the top edge of a rounded white card in the lower half of the image, "
        "plain very light lavender background, playful and cute. "
        + STIL
    ),
    "maskot-hjerte-lilla": (
        f"Square portrait of {MASKOT}. The character hugs a soft rounded violet-purple heart with both arms, eyes closed in a content smile, "
        "standing on a small round patch of soft green grass, plain very light lavender background with subtle gradient, centered. "
        + STIL
    ),
    "footer-scene-lilla": (
        "Very wide 16:9 dreamy meadow scene at dusk for a website footer: soft violet and periwinkle twilight sky with "
        "gently glowing lilac clouds and a few early stars filling the upper half (large calm empty sky area), "
        "soft green meadow with lavender wildflowers, blossoming trees framing the left and right edges, "
        f"and {MASKOT} sitting contently in the meadow on the right third, gazing up at the sky, "
        "a winding little stone path, peaceful and magical. "
        + STIL
    ),
}


async def generer(navn: str, prompt: str) -> bool:
    chat = (
        LlmChat(api_key=KEY, session_id=f"dh-landing2-{navn}", system_message="You are a world-class 3D illustrator.")
        .with_model("gemini", "gemini-2.5-flash-image")
        .with_params(modalities=["image", "text"])
    )
    tekst, bilder = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not bilder:
        print(f"  !! {navn}: ingen bilde ({(tekst or '')[:120]})")
        return False
    data = base64.b64decode(bilder[0]["data"])
    with open(os.path.join(UT, f"{navn}.png"), "wb") as f:
        f.write(data)
    print(f"  ok {navn}: {len(data)//1024} kB")
    return True


async def main():
    kun = sys.argv[1] if len(sys.argv) > 1 else None
    for navn, prompt in BILDER.items():
        if kun and navn != kun:
            continue
        if not kun and os.path.exists(os.path.join(UT, f"{navn}.png")):
            print(f"  hopper over {navn} (finnes)")
            continue
        print(f"genererer {navn} ...")
        if not await generer(navn, prompt):
            print("  prover en gang til ...")
            await generer(navn, prompt)
        await asyncio.sleep(2)


asyncio.run(main())
