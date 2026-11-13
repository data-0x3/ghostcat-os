#!/usr/bin/env python3
"""GhostCat OS — génère les lanceurs d'outils, les icônes et le rangement de la grille d'applis.
developed by 0x3 · https://t.me/data0x3

Usage :  python3 tools/make-assets.py     (depuis la racine du dépôt)
Sorties (dans airootfs/) :
  usr/share/applications/ghostcat-tool-<id>.desktop   un lanceur par outil du Hub
  usr/share/icons/hicolor/<n>x<n>/apps/ghostcat-tool-<id>.png
  usr/share/icons/GhostCat/…                          thème d'icônes (applis système + bouton Applications)
  usr/local/share/applications/<app>.desktop          applis masquées de la grille (NoDisplay)
"""
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "airootfs"
CATALOG = ROOT / "opt/ghostcat-hub/tools.js"
SIZES = (256, 128, 64, 48, 32)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TEAM = {"red": ((255, 77, 109), "X-GhostCat-Red"), "blue": ((77, 141, 255), "X-GhostCat-Blue"),
        "purple": ((178, 107, 255), "X-GhostCat-Purple"), "system": ((232, 232, 240), "X-GhostCat-System")}

# applis installées avec GNOME ou les outils, sans intérêt ici ou doublons de nos lanceurs
HIDE = """org.gnome.Tour yelp qv4l2 qvidcap lstopo lftp htop firewall-config avahi-discover bssh bvnc
xterm uxterm vim gvim org.gnome.Contacts org.gnome.Weather org.gnome.Maps org.gnome.SimpleScan
org.gnome.Epiphany org.gnome.Software org.gnome.Connections jshell-java-openjdk jconsole-java-openjdk
org.wireshark.Wireshark ghidra burpsuite zaproxy bloodhound opensnitch_ui gufw autopsy kismet
nm-applet electron cmake-gui assistant designer linguist qdbusviewer""".split()


# ---------------------------------------------------------------- icônes
def tile(size=256):
    """Carré arrondi sombre façon verre."""
    S = 1024
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((40, 40, S - 40, S - 40), radius=230, fill=255)
    grad = Image.new("RGBA", (S, S))
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        v = int(34 - 24 * y / S)
        gd.line([(0, y), (S, y)], fill=(v, v, v + 5, 255))
    img.paste(grad, (0, 0), mask)
    hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse((-200, -620, S + 200, 380), fill=(255, 255, 255, 22))
    img = Image.alpha_composite(img, Image.composite(hl, Image.new("RGBA", (S, S), (0, 0, 0, 0)), mask))
    rim = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(rim).rounded_rectangle((42, 42, S - 42, S - 42), radius=228, outline=(255, 255, 255, 70), width=6)
    return Image.alpha_composite(img, rim)


def finish(img, out_paths):
    for size, path in out_paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        img.resize((size, size), Image.LANCZOS).save(path)


def glow_layer(layer, color=(255, 255, 255), radius=18, strength=0.55):
    a = layer.split()[3].filter(ImageFilter.GaussianBlur(radius)).point(lambda v: int(v * strength))
    g = Image.new("RGBA", layer.size, color + (0,))
    g.putalpha(a)
    return g


def tool_icon(tool):
    color, _ = TEAM[tool["team"]]
    img = tile()
    S = img.size[0]
    small = {"à", "a", "de", "du", "le", "la", "les", "l'", "d'", "et", "the", "of"}
    words = [w for w in tool["name"].replace("&", " ").replace("-", " ").replace("'", "' ").split() if w.lower() not in small]
    txt = "".join(w[0] for w in words[:2]).upper()
    if len(txt) < 2:
        txt = tool["name"][:2].title()
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = ImageFont.truetype(FONT_B, 400 if len(txt) <= 2 else 300)
    w = d.textlength(txt, font=f)
    d.text(((S - w) / 2, S * 0.18), txt, font=f, fill=(245, 245, 250, 255))
    img = Image.alpha_composite(img, glow_layer(layer, color, 30, 0.6))
    img = Image.alpha_composite(img, layer)
    bar = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(bar).rounded_rectangle((S * .34, S * .78, S * .66, S * .81), radius=20, fill=color + (255,))
    img = Image.alpha_composite(img, glow_layer(bar, color, 24, 0.9))
    return Image.alpha_composite(img, bar)


# glyphes blancs des applis système (dessinés en 1024 px)
def G(draw_fn):
    def make():
        img = tile()
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw_fn(ImageDraw.Draw(layer), 1024)
        img = Image.alpha_composite(img, glow_layer(layer, (255, 255, 255), 22, 0.45))
        return Image.alpha_composite(img, layer)
    return make


W = (245, 245, 250, 255)
LW = 46


def g_terminal(d, S):
    d.line([(300, 380), (450, 512), (300, 644)], fill=W, width=LW, joint="curve")
    d.line([(520, 660), (720, 660)], fill=W, width=LW)


def g_folder(d, S):
    d.polygon([(250, 400), (250, 300), (450, 300), (500, 360), (774, 360), (774, 400)], fill=W)
    d.rounded_rectangle((250, 360, 774, 730), radius=50, outline=W, width=LW)


def g_gear(d, S):
    c = 512
    for k in range(8):
        a = k * math.pi / 4
        x, y = c + 220 * math.cos(a), c + 220 * math.sin(a)
        d.line([(c + 150 * math.cos(a), c + 150 * math.sin(a)), (x, y)], fill=W, width=90)
    d.ellipse((c - 175, c - 175, c + 175, c + 175), fill=(20, 20, 26, 255), outline=W, width=LW)
    d.ellipse((c - 70, c - 70, c + 70, c + 70), outline=W, width=LW)


def g_calc(d, S):
    d.rounded_rectangle((320, 250, 704, 774), radius=60, outline=W, width=LW)
    d.rectangle((390, 320, 634, 420), outline=W, width=30)
    for i in range(3):
        for j in range(3):
            x, y = 410 + i * 102, 500 + j * 90
            d.ellipse((x - 22, y - 22, x + 22, y + 22), fill=W)


def g_doc(d, S):
    d.rounded_rectangle((320, 230, 704, 794), radius=50, outline=W, width=LW)
    for k, w in enumerate((260, 260, 200, 240, 160)):
        d.line([(390, 350 + k * 85), (390 + w, 350 + k * 85)], fill=W, width=34)


def g_monitor(d, S):
    d.line([(230, 540), (380, 540), (450, 360), (560, 690), (640, 470), (700, 540), (800, 540)], fill=W, width=LW, joint="curve")


def g_disk(d, S):
    d.ellipse((262, 262, 762, 762), outline=W, width=LW)
    d.ellipse((452, 452, 572, 572), outline=W, width=LW)
    d.line([(600, 660), (690, 600)], fill=W, width=34)


def g_calendar(d, S):
    d.rounded_rectangle((260, 290, 764, 760), radius=60, outline=W, width=LW)
    d.line([(260, 410), (764, 410)], fill=W, width=LW)
    for x in (380, 644):
        d.line([(x, 240), (x, 330)], fill=W, width=LW)
    for i in range(4):
        for j in range(3):
            x, y = 350 + i * 108, 500 + j * 85
            d.ellipse((x - 20, y - 20, x + 20, y + 20), fill=W)


def g_clock(d, S):
    d.ellipse((262, 262, 762, 762), outline=W, width=LW)
    d.line([(512, 512), (512, 350)], fill=W, width=LW)
    d.line([(512, 512), (630, 590)], fill=W, width=LW)


def g_text(t, size=420):
    def f(d, S):
        fnt = ImageFont.truetype(FONT_B, size)
        w = d.textlength(t, font=fnt)
        d.text(((S - w) / 2, 270), t, font=fnt, fill=W)
    return f


def g_camera(d, S):
    d.rounded_rectangle((230, 340, 794, 730), radius=70, outline=W, width=LW)
    d.line([(400, 340), (450, 270), (574, 270), (624, 340)], fill=W, width=LW)
    d.ellipse((392, 415, 632, 655), outline=W, width=LW)


def g_music(d, S):
    d.line([(430, 300), (430, 640)], fill=W, width=LW)
    d.line([(650, 260), (650, 600)], fill=W, width=LW)
    d.line([(430, 300), (650, 260)], fill=W, width=LW)
    d.ellipse((310, 600, 450, 710), fill=W)
    d.ellipse((530, 560, 670, 670), fill=W)


def g_image(d, S):
    d.rounded_rectangle((240, 290, 784, 734), radius=50, outline=W, width=LW)
    d.line([(270, 680), (430, 500), (560, 640), (640, 560), (760, 690)], fill=W, width=LW, joint="curve")
    d.ellipse((580, 360, 680, 460), fill=W)


def g_bars(d, S):
    for k, h in enumerate((260, 420, 320, 500)):
        x = 330 + k * 120
        d.rounded_rectangle((x, 760 - h, x + 70, 760), radius=20, fill=W)


def g_network(d, S):
    pts = [(512, 300), (320, 680), (704, 680)]
    for a in pts:
        for b in pts:
            d.line([a, b], fill=W, width=34)
    for x, y in pts:
        d.ellipse((x - 70, y - 70, x + 70, y + 70), fill=(20, 20, 26, 255), outline=W, width=LW)


def g_pie(d, S):
    d.ellipse((262, 262, 762, 762), outline=W, width=LW)
    d.pieslice((262, 262, 762, 762), -90, 20, fill=W)


def g_play(d, S):
    d.polygon([(400, 300), (400, 724), (740, 512)], fill=W)


def g_box(d, S):
    d.rounded_rectangle((290, 290, 734, 750), radius=50, outline=W, width=LW)
    for k in range(5):
        y = 300 + k * 70
        d.line([(490 if k % 2 else 534, y), (534 if k % 2 else 490, y + 35)], fill=W, width=26)
    d.rounded_rectangle((470, 650, 554, 720), radius=12, outline=W, width=26)


def g_logs(d, S):
    for k in range(5):
        y = 330 + k * 95
        d.ellipse((290, y - 22, 334, y + 22), fill=W)
        d.line([(390, y), (390 + (380 if k % 2 == 0 else 280), y)], fill=W, width=36)


def g_key(d, S):
    d.ellipse((260, 380, 500, 620), outline=W, width=LW)
    d.line([(500, 500), (780, 500)], fill=W, width=LW)
    d.line([(700, 500), (700, 600)], fill=W, width=LW)
    d.line([(620, 500), (620, 580)], fill=W, width=LW)


GLYPHS = {
    g_terminal: "org.gnome.Console org.gnome.Terminal utilities-terminal",
    g_folder: "org.gnome.Nautilus system-file-manager",
    g_gear: "org.gnome.Settings preferences-system gnome-control-center",
    g_calc: "org.gnome.Calculator accessories-calculator",
    g_doc: "org.gnome.TextEditor accessories-text-editor",
    g_monitor: "org.gnome.SystemMonitor utilities-system-monitor",
    g_disk: "org.gnome.DiskUtility gparted",
    g_calendar: "org.gnome.Calendar",
    g_clock: "org.gnome.clocks",
    g_text("Aa"): "org.gnome.Characters",
    g_text("Ag", 380): "org.gnome.font-viewer",
    g_camera: "org.gnome.Snapshot",
    g_music: "org.gnome.Music",
    g_image: "org.gnome.Loupe",
    g_logs: "org.gnome.Logs",
    g_bars: "btop",
    g_network: "nm-connection-editor preferences-system-network",
    g_pie: "org.gnome.baobab",
    g_play: "mpv org.gnome.Showtime",
    g_box: "org.gnome.FileRoller",
    g_key: "org.gnome.seahorse.Application",
}
DOC_VIEWERS = "org.gnome.Papers org.gnome.Evince"

GHOST_SYMBOLIC = """<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 200 220">
<path fill="#2e3436" fill-rule="evenodd" d="M40 200 L40 90 C40 70 45 55 52 45 L48 8 L82 34 C88 32 94 31 100 31
C106 31 112 32 118 34 L152 8 L148 45 C155 55 160 70 160 90 L160 200 L146 186 L132 200 L118 186 L100 204 L82 186
L68 200 L54 186 Z M67 100 a11 15 0 1 0 22 0 a11 15 0 1 0 -22 0 Z M111 100 a11 15 0 1 0 22 0 a11 15 0 1 0 -22 0 Z"/>
</svg>
"""


def main():
    tools = json.loads(CATALOG.read_text()[CATALOG.read_text().index("["):CATALOG.read_text().rindex("]") + 1])

    apps = ROOT / "usr/share/applications"
    for old in apps.glob("ghostcat-tool-*.desktop"):
        old.unlink()
    for s in SIZES:
        for old in (ROOT / f"usr/share/icons/hicolor/{s}x{s}/apps").glob("ghostcat-tool-*.png"):
            old.unlink()

    for t in tools:
        _, cat = TEAM[t["team"]]
        desc = t["desc"].replace("\n", " ")
        (apps / f"ghostcat-tool-{t['id']}.desktop").write_text(
            "[Desktop Entry]\nType=Application\n"
            f"Name={t.get('name_en', t['name'])}\nName[fr]={t['name']}\n"
            f"Comment={t.get('desc_en', desc)}\nComment[fr]={desc}\n"
            f"Exec=/usr/local/bin/ghostcat-hub --run={t['id']}\n"
            f"Icon=ghostcat-tool-{t['id']}\nTerminal=false\nStartupNotify=false\n"
            f"Categories={cat};\nKeywords={t['cat']};{t['team']};cyber;security;\n", encoding="utf-8")
        img = tool_icon(t)
        finish(img, [(s, ROOT / f"usr/share/icons/hicolor/{s}x{s}/apps/ghostcat-tool-{t['id']}.png") for s in SIZES])

    theme = ROOT / "usr/share/icons/GhostCat"
    shutil.rmtree(theme, ignore_errors=True)
    dirs = [f"{s}x{s}/apps" for s in SIZES] + ["scalable/actions"]
    for fn, names in list(GLYPHS.items()) + [(G(g_doc), DOC_VIEWERS)]:
        img = (fn() if fn is not None and fn.__name__ == "make" else G(fn)())
        for name in names.split():
            finish(img, [(s, theme / f"{s}x{s}/apps/{name}.png") for s in SIZES])
    (theme / "scalable/actions").mkdir(parents=True, exist_ok=True)
    (theme / "scalable/actions/view-app-grid-symbolic.svg").write_text(GHOST_SYMBOLIC)
    sections = "".join(
        f"\n[{d}]\nSize={d.split('x')[0] if 'x' in d else 16}\nContext={'Applications' if 'apps' in d else 'Actions'}\n"
        + ("Type=Fixed\n" if "x" in d else "Type=Scalable\nMinSize=8\nMaxSize=512\n") for d in dirs)
    (theme / "index.theme").write_text(
        "[Icon Theme]\nName=GhostCat\nComment=GhostCat OS — developed by 0x3\n"
        "Inherits=Papirus-Dark,Adwaita,hicolor\n" f"Directories={','.join(dirs)}\n" + sections)

    hide = ROOT / "usr/local/share/applications"
    shutil.rmtree(hide, ignore_errors=True)
    hide.mkdir(parents=True)
    for app in HIDE:
        (hide / f"{app}.desktop").write_text(
            f"[Desktop Entry]\nType=Application\nName={app}\nExec=true\nNoDisplay=true\n"
            "# masqué de la grille par GhostCat OS (l'appli reste lançable par son nom)\n")
    print(f"{len(tools)} lanceurs + icônes, {sum(len(n.split()) for n in GLYPHS.values()) + 2} icônes système, "
          f"{len(HIDE)} applis masquées")


if __name__ == "__main__":
    main()
