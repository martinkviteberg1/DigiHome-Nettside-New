"""Engangsgenerering av illustrasjoner til /ny-forside (DigiHome landingsside).

Bruker Emergent universalnokkel + Gemini Nano Banana via emergentintegrations.
Lagrer PNG-er i /app/public/landing/. Kjores sekvensielt (rate limits).

  python3 scripts/generer-landing-bilder.py            # alle som mangler
  python3 scripts/generer-landing-bilder.py hero-scene # kun ett motiv
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

# Konsistent karakterbeskrivelse — gjentas i hver maskot-prompt.
MASKOT = (
    "an adorable tiny 3D mascot character shaped like a cozy Scandinavian house: "
    "soft rounded cream-white body, warm terracotta-orange gabled roof like a snug hat, "
    "two big friendly dark round eyes, subtle rosy blush cheeks, tiny stubby arms and legs, "
    "a small round window on its belly, a gentle happy smile, small green sprout on the rooftop. "
    "Pixar-style glossy 3D render, soft warm studio lighting, ultra high quality"
)

STIL = "Premium SaaS landing page illustration. Warm cream, peach, sage-green and terracotta palette. No text, no letters, no watermark, no logo."

BILDER = {
    "hero-scene": (
        "Very wide 16:9 dreamy pastoral landscape for a website hero: soft cream and peach "
        "morning sky with a few gentle fluffy clouds filling the upper half (large calm empty sky area), "
        "rolling sage-green meadows with a winding light stone path leading to the horizon, "
        "blossoming trees with soft white and peach flowers framing the left and right edges, "
        "a few tiny cozy houses with terracotta roofs in the far distance, soft morning haze, serene and minimalist. "
        + STIL
    ),
    "maskot-vink": (
        f"Square portrait of {MASKOT}. The character is waving cheerfully with one raised arm, "
        "standing on a small round patch of sage-green grass with three tiny wildflowers, "
        "plain soft cream background with a very subtle warm gradient, centered composition, lots of empty space around the character. "
        + STIL
    ),
    "maskot-nokkel": (
        f"Square portrait of {MASKOT}. The character proudly holds a big shiny golden key with both arms, "
        "standing on a small round patch of sage-green grass, "
        "plain soft cream background with a very subtle warm gradient, centered composition. "
        + STIL
    ),
    "maskot-titter": (
        f"Square illustration of {MASKOT}. Only the head, eyes and tiny hands of the character are visible, "
        "peeking curiously over the top edge of a rounded white card in the lower half of the image, "
        "plain soft cream background, playful and cute. "
        + STIL
    ),
    "maskot-hjerte": (
        f"Square portrait of {MASKOT}. The character hugs a soft rounded terracotta-red heart with both arms, eyes closed in a content smile, "
        "standing on a small round patch of sage-green grass, plain soft cream background with subtle warm gradient, centered. "
        + STIL
    ),
    "footer-scene": (
        "Very wide 16:9 dreamy meadow scene at golden hour for a website footer: warm peach-golden sky with "
        "soft glowing clouds filling the upper half (large calm empty sky area), sage-green meadow with scattered wildflowers, "
        "blossoming trees framing the left and right edges, "
        f"and {MASKOT} sitting contently in the meadow on the right third, gazing up at the sky, "
        "a winding little stone path, peaceful and warm. "
        + STIL
    ),
}


async def generer(navn: str, prompt: str) -> bool:
    chat = (
        LlmChat(api_key=KEY, session_id=f"dh-landing-{navn}", system_message="You are a world-class 3D illustrator.")
        .with_model("gemini", "gemini-2.5-flash-image")
        .with_params(modalities=["image", "text"])
    )
    tekst, bilder = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not bilder:
        print(f"  !! {navn}: ingen bilde returnert ({(tekst or '')[:120]})")
        return False
    data = base64.b64decode(bilder[0]["data"])
    sti = os.path.join(UT, f"{navn}.png")
    with open(sti, "wb") as f:
        f.write(data)
    print(f"  ok {navn}: {len(data)//1024} kB -> {sti}")
    return True


async def main():
    kun = sys.argv[1] if len(sys.argv) > 1 else None
    for navn, prompt in BILDER.items():
        if kun and navn != kun:
            continue
        sti = os.path.join(UT, f"{navn}.png")
        if not kun and os.path.exists(sti):
            print(f"  hopper over {navn} (finnes)")
            continue
        print(f"genererer {navn} ...")
        okk = await generer(navn, prompt)
        if not okk:
            print("  provde en gang til ...")
            await generer(navn, prompt)
        await asyncio.sleep(2)


asyncio.run(main())
