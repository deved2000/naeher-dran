"""Erzeugt alle App-Icons (Web-App und Android) aus einer Vorlage.

Aufruf (im Repo-Hauptordner):  python tools/make_icons.py
Benötigt: Pillow  (pip install pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "web" / "fonts" / "Caladea-Bold.ttf"
INK = (31, 39, 51, 255)
CREAM = (245, 238, 227, 255)
CORAL = (229, 142, 109, 255)
RING = (154, 163, 175, 140)
WHITE = (255, 255, 255, 255)


def motif(draw, box, fg=CREAM, star=CORAL):
    """Zeichnet das „N“ mit Stern mittig in box=(x0, y0, size)."""
    x0, y0, s = box
    f = ImageFont.truetype(str(FONT), int(s * 0.56))
    bb = draw.textbbox((0, 0), "N", font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    draw.text((x0 + (s - w) / 2 - bb[0] - s * 0.03, y0 + (s - h) / 2 - bb[1] + s * 0.02), "N", font=f, fill=fg)
    cx, cy, r, k = x0 + s * 0.70, y0 + s * 0.29, s * 0.085, 0.22
    draw.polygon([(cx, cy - r), (cx + r * k, cy - r * k), (cx + r, cy), (cx + r * k, cy + r * k),
                  (cx, cy + r), (cx - r * k, cy + r * k), (cx - r, cy), (cx - r * k, cy - r * k)], fill=star)


def render(size, kind):
    S = size * 4  # vierfach zeichnen, dann verkleinern (Kantenglättung)
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if kind == "round":            # rundes Icon mit feinem Ring
        d.ellipse((0, 0, S - 1, S - 1), fill=INK)
        m = int(S * 0.075)
        d.ellipse((m, m, S - 1 - m, S - 1 - m), outline=RING, width=max(2, S // 128))
        motif(d, (0, 0, S))
    elif kind == "square":         # vollflächig (iPhone rundet selbst ab)
        d.rectangle((0, 0, S, S), fill=INK)
        motif(d, (0, 0, S))
    elif kind == "maskable":       # Motiv in der sicheren Zone (80 %)
        d.rectangle((0, 0, S, S), fill=INK)
        motif(d, (S * 0.18, S * 0.18, S * 0.64))
    elif kind == "foreground":     # Android adaptive Icon: 108 dp, sichtbarer Kern 66 dp
        motif(d, (S * 0.21, S * 0.21, S * 0.58))
    elif kind == "monochrome":     # Android 13+ „Designte Symbole“
        motif(d, (S * 0.21, S * 0.21, S * 0.58), fg=WHITE, star=WHITE)
    return im.resize((size, size), Image.LANCZOS)


def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print("geschrieben:", path.relative_to(ROOT))


if __name__ == "__main__":
    web = ROOT / "web" / "icons"
    save(render(192, "round"), web / "icon-192.png")
    save(render(512, "round"), web / "icon-512.png")
    save(render(512, "maskable"), web / "icon-maskable-512.png")
    save(render(180, "square"), web / "apple-touch-icon.png")

    res = ROOT / "android" / "app" / "src" / "main" / "res"
    for dens, scale in {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}.items():
        save(render(int(48 * scale), "round"), res / f"mipmap-{dens}" / "ic_launcher.png")
        save(render(int(108 * scale), "foreground"), res / f"mipmap-{dens}" / "ic_launcher_foreground.png")
        save(render(int(108 * scale), "monochrome"), res / f"mipmap-{dens}" / "ic_launcher_monochrome.png")
