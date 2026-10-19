"""Erzeugt für jedes Deck ein PDF zum Durchscrollen am Handy (eine Karte pro Bildschirm).

Aufruf (im Repo-Hauptordner):  python tools/make_pdf.py [--out pdf]
Benötigt: reportlab  (pip install reportlab)
"""
import argparse
import json
import re
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
W, H = 360, 720   # Hochformat, ungefähr ein Handy-Bildschirm
M = 34            # Seitenrand
PDF_RULE = "Jede Karte füllt einen Bildschirm. Scrollt erst weiter, wenn ihr bereit seid."

for name, file in [("Serif", "Caladea-Regular"), ("Serif-Bold", "Caladea-Bold"), ("Serif-Italic", "Caladea-Italic")]:
    pdfmetrics.registerFont(TTFont(name, str(WEB / "fonts" / f"{file}.ttf")))
SANS, SANS_BOLD = "Helvetica", "Helvetica-Bold"


def load_decks():
    """Liest die Decks in der Reihenfolge, in der index.html sie einbindet."""
    order = re.findall(r'src="decks/([\w-]+)\.js"', (WEB / "index.html").read_text(encoding="utf-8"))
    decks = []
    for deck_id in order:
        src = (WEB / "decks" / f"{deck_id}.js").read_text(encoding="utf-8")
        decks.append(json.loads(src[src.index("{"): src.rindex("}") + 1]))
    return decks


def interleave(lvl):
    """Verteilt die Wildcards gleichmäßig zwischen die Fragen (wie in der App)."""
    qs, ws = lvl["fragen"], lvl["wildcards"]
    step = len(qs) / (len(ws) + 1)
    slots = {int(step * (i + 1) + 0.5) for i in range(len(ws))}
    out, wi = [], 0
    for i, q in enumerate(qs, 1):
        out.append((q, False))
        if i in slots and wi < len(ws):
            out.append((ws[wi], True))
            wi += 1
    return out + [(w, True) for w in ws[wi:]]


class Deck:
    def __init__(self, c, deck):
        self.c, self.d, self.f = c, deck, deck["farben"]

    # ---- Bausteine ----
    def bg(self, t, frame=None, width=0.6):
        c = self.c
        c.setFillColor(HexColor(t["bg"]))
        c.rect(0, 0, W, H, stroke=0, fill=1)
        c.setStrokeColor(HexColor(frame or t["muted"]))
        c.setLineWidth(width)
        c.roundRect(14, 14, W - 28, H - 28, 18, stroke=1, fill=0)

    def label(self, text, x, y, color, size=8.5, align="left", spacing=1.6):
        c = self.c
        c.saveState()
        c.setFillColor(HexColor(color))
        w = pdfmetrics.stringWidth(text, SANS_BOLD, size) + spacing * (len(text) - 1)
        x = x - w if align == "right" else x - w / 2 if align == "center" else x
        t = c.beginText()
        t.setFont(SANS_BOLD, size)
        t.setCharSpace(spacing)
        t.setTextOrigin(x, y)
        t.textOut(text)
        c.drawText(t)
        c.restoreState()

    def para(self, text, font, size, lead, color, x, y_center, width, align=TA_LEFT):
        p = Paragraph(text, ParagraphStyle("p", fontName=font, fontSize=size, leading=lead,
                                           textColor=HexColor(color), alignment=align))
        _, h = p.wrap(width, H)
        p.drawOn(self.c, x, y_center - h / 2)
        return h

    def rule(self, x, y, color):
        self.c.setStrokeColor(HexColor(color))
        self.c.setLineWidth(1.4)
        self.c.line(x, y, x + 36, y)

    def star(self, cx, cy, r, color):
        k = 0.22
        p = self.c.beginPath()
        pts = [(cx, cy + r), (cx + r * k, cy + r * k), (cx + r, cy), (cx + r * k, cy - r * k),
               (cx, cy - r), (cx - r * k, cy - r * k), (cx - r, cy), (cx - r * k, cy + r * k)]
        p.moveTo(*pts[0])
        for pt in pts[1:]:
            p.lineTo(*pt)
        p.close()
        self.c.setFillColor(HexColor(color))
        self.c.drawPath(p, stroke=0, fill=1)

    def hint(self, t, text):
        self.label(text.upper(), W / 2, 42, t["muted"], size=7.5, align="center")
        c = self.c
        c.setStrokeColor(HexColor(t["muted"]))
        c.setLineWidth(1)
        c.line(W / 2 - 4, 32, W / 2, 28)
        c.line(W / 2, 28, W / 2 + 4, 32)

    # ---- Seiten ----
    def cover(self):
        t, d = self.f["start"], self.d
        nq = sum(len(l["fragen"]) for l in d["level"])
        nw = sum(len(l["wildcards"]) for l in d["level"])
        self.bg(t)
        self.label(d["eyebrow"].upper(), M, H - 70, t["accent"])
        self.para(d["titel"].replace(" ", "<br/>"), "Serif-Bold", 58, 58, t["fg"], M, H / 2 + 60, W - 2 * M)
        self.para(d["untertitel"], "Serif-Italic", 17, 23, t["fg"], M, H / 2 - 40, W - 2 * M - 20)
        self.rule(M, H / 2 - 92, t["accent"])
        self.label(f"3 LEVEL  ·  {nq} FRAGEN  ·  {nw} WILDCARDS", M, H / 2 - 116, t["muted"])
        self.hint(t, "zu den Regeln")

    def rules(self):
        t = self.f["rules"]
        self.bg(t)
        self.label("BEVOR IHR LOSLEGT", M, H - 70, t["accent"])
        self.para("So spielt ihr", "Serif-Bold", 34, 38, t["fg"], M, H - 120, W - 2 * M)
        y = H - 170
        for i, r in enumerate(self.d["regeln"] + [PDF_RULE], 1):
            p = Paragraph(r, ParagraphStyle("b", fontName=SANS, fontSize=12.5, leading=18, textColor=HexColor(t["fg"])))
            _, h = p.wrap(W - 2 * M - 30, H)
            self.label(f"{i:02d}", M, y - 12, t["accent"], size=10, spacing=0.5)
            p.drawOn(self.c, M + 30, y - h)
            y -= h + 20
        self.hint(t, "zu Level 1")

    def intro(self, lvl):
        t = self.f[str(lvl["nummer"])]
        self.bg(t)
        self.label(f"LEVEL {lvl['nummer']} VON 3", M, H - 70, t["accent"])
        c = self.c
        c.setFillColor(HexColor(t["fg"]))
        c.setFont("Serif-Bold", 150)
        c.drawString(M - 6, H / 2 + 40, str(lvl["nummer"]))
        self.para(lvl["name"], "Serif-Bold", 40, 44, t["fg"], M, H / 2, W - 2 * M)
        self.rule(M, H / 2 - 34, t["accent"])
        p = Paragraph(lvl["intro"], ParagraphStyle("i", fontName="Serif-Italic", fontSize=17, leading=24, textColor=HexColor(t["fg"])))
        _, h = p.wrap(W - 2 * M - 20, H)
        p.drawOn(c, M, H / 2 - 54 - h)
        self.hint(t, "erste Karte")

    def card(self, lvl, text, idx, total, wild):
        n = str(lvl["nummer"])
        if wild:
            frame = self.f["rahmen"][n]
            t = {"bg": self.f["wild"]["bg"], "fg": self.f["wild"]["fg"], "accent": frame, "muted": frame}
            self.bg(t, frame=frame, width=5)
        else:
            t = self.f[n]
            self.bg(t)
        top = t["accent"] if wild else t["muted"]
        self.label(f"LEVEL {lvl['nummer']}  ·  {lvl['name'].upper()}", M, H - 56, top)
        self.label(f"{idx:02d} / {total:02d}", W - M, H - 56, top, align="right", spacing=0.8)
        if wild:
            self.star(W / 2, H / 2 + 122, 13, t["accent"])
            self.label("WILDCARD", W / 2, H / 2 + 92, t["accent"], size=11, align="center", spacing=3)
            self.para(text, "Serif", 23, 31, t["fg"], M + 4, H / 2 - 10, W - 2 * M - 8, TA_CENTER)
        else:
            size, lead = (27, 35) if len(text) < 70 else (24, 32)
            h = self.para(text, "Serif", size, lead, t["fg"], M, H / 2, W - 2 * M - 6)
            self.rule(M, H / 2 + h / 2 + 22, t["accent"])
        self.label(self.d["titel"].upper(), W / 2, 40, top, size=7.5, align="center", spacing=2.4)

    def final(self):
        t = self.f["start"]
        self.bg(t)
        self.label("LETZTE KARTE", W / 2, H - 70, t["accent"], align="center")
        self.star(W / 2, H / 2 + 112, 13, t["accent"])
        self.para(self.d["abschluss"], "Serif", 25, 34, t["fg"], M + 6, H / 2 + 10, W - 2 * M - 12, TA_CENTER)
        self.para("Danke fürs Spielen.", "Serif-Italic", 15, 20, t["muted"], M, H / 2 - 120, W - 2 * M, TA_CENTER)

    def build(self):
        pages = [self.cover, self.rules]
        for lvl in self.d["level"]:
            pages.append(lambda l=lvl: self.intro(l))
            cards = interleave(lvl)
            for i, (text, wild) in enumerate(cards, 1):
                pages.append(lambda l=lvl, t=text, i=i, n=len(cards), w=wild: self.card(l, t, i, n, w))
        pages.append(self.final)
        for draw in pages:
            draw()
            self.c.showPage()
        return len(pages)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="pdf", help="Zielordner (Standard: pdf)")
    out = Path(ap.parse_args().out)
    out.mkdir(parents=True, exist_ok=True)
    for deck in load_decks():
        path = out / f"Naeher-dran-{deck['name']}.pdf"
        c = canvas.Canvas(str(path), pagesize=(W, H))
        c.setTitle(f"{deck['titel']} – {deck['name']}")
        c.setSubject("Fragenspiel in drei Leveln, eine Karte pro Seite")
        n = Deck(c, deck).build()
        c.save()
        print(f"{path}  ({n} Seiten)")


if __name__ == "__main__":
    main()
