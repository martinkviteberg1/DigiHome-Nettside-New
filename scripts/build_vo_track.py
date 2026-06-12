#!/usr/bin/env python3
"""
Bygger det tidslinje-justerte voiceover-sporet for DigiHome-filmen.
Klipper replikkene fra ElevenLabs-raafilen (basert paa silencedetect-analyse)
og plasserer dem sample-noeyaktig paa filmens 84s tidslinje.
Output: /app/public/film/vo/vo-track.mp3
"""
import subprocess

RAW = "/app/public/film/vo/vo_raw.mp3"
NORM = "/tmp/vo_norm.wav"
OUT = "/app/public/film/vo/vo-track.mp3"
FILM_LEN = 84.0

# (filmStart, srcIn, srcOut)
SEGMENTS = [
    (1.00, 1.08, 5.31),     # 1  DigiHome introduserer: Utleie paa autopilot.
    (5.85, 6.83, 10.08),    # 2  En komplett utleietjeneste - som styrer seg selv.
    (10.30, 11.96, 14.51),  # 3  Du aktiverer den med ett trykk.
    (15.20, 17.50, 25.90),  # 4  Annonsen skrives automatisk...
    (27.00, 30.68, 33.69),  # 5  Visningene? Booker seg selv.
    (30.80, 37.32, 45.59),  # 6  Hver soeker screenes...
    (39.85, 47.14, 50.91),  # 7  Kontrakten signeres digitalt - med BankID.
    (44.35, 52.98, 59.17),  # 8  Og husleien? Utbetales automatisk...
    (51.20, 61.25, 67.87),  # 9  Med dynamisk utleie...
    (59.40, 70.52, 76.85),  # 10 Leietakerne dine? Faar svar paa sekunder...
    (68.75, 82.05, 82.76),  # 11a Annonse.
    (69.60, 83.38, 84.16),  # 11b Visning.
    (70.45, 84.70, 85.55),  # 11c Screening.
    (71.30, 86.11, 86.83),  # 11d Kontrakt.
    (72.15, 87.39, 88.15),  # 11e Husleie.
    (74.55, 88.68, 90.09),  # 11f Alt - haandtert.
    (76.30, 91.08, 93.25),  # 12 Trygt. Automagisk.
    (79.55, 95.10, 99.05),  # 13 DigiHome. Utleie paa autopilot.
]

# 1) normaliser loudness paa raafilen
subprocess.run([
    "ffmpeg", "-y", "-i", RAW,
    "-af", "loudnorm=I=-15.5:TP=-1.5:LRA=11",
    "-ar", "44100", "-ac", "2", NORM,
], check=True, capture_output=True)

# 2) klipp + plasser hvert segment, miks sammen
parts = []
labels = []
for i, (at, a, b) in enumerate(SEGMENTS):
    delay_ms = int(round(at * 1000))
    fade_out_st = (b - a) - 0.035
    parts.append(
        f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,"
        f"afade=t=in:st=0:d=0.03,afade=t=out:st={fade_out_st:.3f}:d=0.035,"
        f"adelay={delay_ms}|{delay_ms}[s{i}]"
    )
    labels.append(f"[s{i}]")

fc = ";".join(parts) + ";" + "".join(labels) + \
    f"amix=inputs={len(SEGMENTS)}:normalize=0,apad,atrim=0:{FILM_LEN}[out]"

subprocess.run([
    "ffmpeg", "-y", "-i", NORM,
    "-filter_complex", fc, "-map", "[out]",
    "-ar", "44100", "-ac", "2", "-b:a", "192k", OUT,
], check=True, capture_output=True)

print("OK:", OUT)
# verifiser plassering
out = subprocess.run(
    ["ffmpeg", "-i", OUT, "-af", "silencedetect=noise=-40dB:d=0.5", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
ends = [line.split("silence_end: ")[1].split(" ")[0]
        for line in out.splitlines() if "silence_end" in line]
print("tale starter ved:", ", ".join(ends))
