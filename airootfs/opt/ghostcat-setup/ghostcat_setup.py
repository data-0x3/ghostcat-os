#!/usr/bin/env python3
"""GhostCat Setup — assistant de démarrage (langue, clavier, fuseau, vie privée).
developed by 0x3 · https://t.me/data0x3

Les réglages système passent par /usr/local/lib/ghostcat/setup-apply (root,
liste blanche). Les réglages utilisateur (disposition active, traces GNOME,
langue du compte) sont faits ici, sans droits particuliers.
"""
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
HELPER = "/usr/local/lib/ghostcat/setup-apply"
CONF_DIR = Path.home() / ".config" / "ghostcat"
SAVED = Path("/etc/ghostcat/setup.json")

XKB = {  # même table que le helper : clé -> (layout, variant)
    "fr": ("fr", ""), "fr-bepo": ("fr", "bepo"), "be": ("be", ""), "ch-fr": ("ch", "fr"), "ca-fr": ("ca", ""),
    "us": ("us", ""), "us-intl": ("us", "intl"), "gb": ("gb", ""), "de": ("de", ""), "ch-de": ("ch", ""),
    "es": ("es", ""), "it": ("it", ""), "pt": ("pt", ""), "br": ("br", ""), "nl": ("nl", ""), "pl": ("pl", ""),
    "tr": ("tr", ""), "ru": ("ru", ""), "ua": ("ua", ""),
}
SYSTEM_PRIVACY = ("mac", "dns", "firewall", "anon", "browser", "tor")


def sh(*cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None


def gset(schema, key, value):
    sh("gsettings", "set", schema, key, value)


def set_keyboard(key):
    if key not in XKB:
        return
    layout, variant = XKB[key]
    src = f"{layout}+{variant}" if variant else layout
    gset("org.gnome.desktop.input-sources", "sources", f"[('xkb', '{src}')]")


def zones():
    r = sh("timedatectl", "list-timezones", "--no-pager")
    if r and r.returncode == 0 and r.stdout.strip():
        return r.stdout.split()
    base = Path("/usr/share/zoneinfo")
    out = []
    for region in ("Africa", "America", "Asia", "Atlantic", "Australia", "Europe", "Indian", "Pacific"):
        for f in (base / region).rglob("*"):
            if f.is_file():
                out.append(str(f.relative_to(base)))
    return sorted(out)


def current():
    cur = {}
    try:
        saved = json.loads(SAVED.read_text())
        cur.update({k: saved[k] for k in ("lang", "keymap", "timezone") if k in saved})
        priv = {k: saved[k] for k in (*SYSTEM_PRIVACY, "traces") if k in saved}
        if priv:
            cur["privacy"] = priv
    except (OSError, ValueError):
        pass
    if "lang" not in cur:
        lang = os.environ.get("LANG", "").split(".")[0]
        if lang and lang != "C":
            cur["lang"] = lang
    tz = os.path.realpath("/etc/localtime").split("zoneinfo/")[-1]
    if "/" in tz and "timezone" not in cur:
        cur["timezone"] = tz
    return cur


def run_helper(payload):
    data = json.dumps(payload)
    for prefix in (["sudo", "-n"], ["pkexec"]):
        if not shutil.which(prefix[0]):
            continue
        try:
            r = subprocess.run([*prefix, HELPER], input=data, capture_output=True, text=True, timeout=120)
        except (OSError, subprocess.TimeoutExpired):
            continue
        if r.returncode == 0:
            return True
        if prefix[0] == "pkexec" and r.returncode in (126, 127):   # annulé par l'utilisateur
            return False
    return False


def apply(settings, mode, progress):
    lang, kbd, tz = settings.get("lang"), settings.get("keymap"), settings.get("timezone")
    priv = settings.get("privacy") or {}
    ok = True

    progress("t_lang", "run")
    payload = {"lang": lang, "keymap": kbd, "timezone": tz,
               "privacy": {k: bool(priv.get(k)) for k in SYSTEM_PRIVACY if k in priv}}
    sys_ok = run_helper(payload)
    if lang:   # langue du compte (lue par GDM au prochain login)
        uid = os.getuid()
        sh("busctl", "call", "org.freedesktop.Accounts", f"/org/freedesktop/Accounts/User{uid}",
           "org.freedesktop.Accounts.User", "SetLanguage", "s", f"{lang}.UTF-8")
    progress("t_lang", "ok" if sys_ok else "err")

    progress("t_kbd", "run"); set_keyboard(kbd); time.sleep(.35); progress("t_kbd", "ok" if sys_ok else "err")
    progress("t_tz", "run"); time.sleep(.35); progress("t_tz", "ok" if sys_ok else "err")

    progress("t_priv", "run")
    traces = bool(priv.get("traces", True))
    gset("org.gnome.system.location", "enabled", "false" if traces else "true")
    gset("org.gnome.desktop.privacy", "remember-recent-files", "false" if traces else "true")
    gset("org.gnome.desktop.privacy", "remove-old-trash-files", "true" if traces else "false")
    gset("org.gnome.desktop.privacy", "remove-old-temp-files", "true" if traces else "false")
    time.sleep(.35)
    progress("t_priv", "ok" if sys_ok else "err")
    ok = ok and sys_ok

    progress("t_session", "run")
    CONF_DIR.mkdir(parents=True, exist_ok=True)
    (CONF_DIR / "setup-done").write_text(json.dumps(settings, ensure_ascii=False))
    if mode == "install":
        (CONF_DIR / "launch-install").touch()
    time.sleep(.5)
    progress("t_session", "ok")
    return ok


def next_step(lang_changed):
    if lang_changed and shutil.which("gnome-session-quit"):
        # la langue de GNOME change à la reconnexion (automatique dans le live)
        subprocess.Popen(["gnome-session-quit", "--logout", "--no-prompt"], start_new_session=True)
    else:
        subprocess.Popen(["/usr/local/bin/ghostcat-session-start"], start_new_session=True)


def main():
    import gi
    gi.require_version("Gtk", "4.0")
    gi.require_version("WebKit", "6.0")
    from gi.repository import Gtk, WebKit, GLib, Gdk

    app = Gtk.Application(application_id="os.ghostcat.Setup")

    def on_activate(app):
        win = Gtk.ApplicationWindow(application=app, title="GhostCat Setup")
        win.set_default_size(1200, 800)
        win.set_icon_name("ghostcat-hub")
        if "--windowed" not in sys.argv:
            win.fullscreen()

        ucm = WebKit.UserContentManager()
        view = WebKit.WebView(user_content_manager=ucm)
        view.get_settings().set_allow_file_access_from_file_urls(True)
        bg = Gdk.RGBA(); bg.parse("#000000"); view.set_background_color(bg)

        def reply(payload):
            GLib.idle_add(lambda: view.evaluate_javascript(
                f"window.ghostcatReply({json.dumps(payload)});", -1, None, None, None, None, None) and False)

        def worker(settings, mode):
            start_lang = os.environ.get("LANG", "").split(".")[0]
            ok = apply(settings, mode, lambda t, s: reply({"type": "progress", "task": t, "state": s}))
            reply({"type": "done", "ok": ok})
            time.sleep(1.4 if ok else 4)
            GLib.idle_add(win.close)
            next_step(bool(settings.get("lang")) and settings.get("lang") != start_lang)

        def on_message(_ucm, value):
            try:
                msg = json.loads(value.to_string())
            except (ValueError, TypeError):
                return
            if not isinstance(msg, dict):
                return
            act = msg.get("action")
            if act == "init":
                reply({"type": "init", "zones": zones(), "current": current()})
            elif act == "kbd_preview":
                set_keyboard(msg.get("keymap"))
            elif act == "apply" and isinstance(msg.get("settings"), dict):
                mode = "install" if msg.get("mode") == "install" else "try"
                threading.Thread(target=worker, args=(msg["settings"], mode), daemon=True).start()

        ucm.connect("script-message-received::ghostcat", on_message)
        ucm.register_script_message_handler("ghostcat", None)

        def on_decide(_v, decision, kind):   # aucune navigation hors de l'assistant
            if kind in (WebKit.PolicyDecisionType.NAVIGATION_ACTION, WebKit.PolicyDecisionType.NEW_WINDOW_ACTION):
                uri = decision.get_navigation_action().get_request().get_uri() or ""
                if not uri.startswith("file://"):
                    decision.ignore()
                    return True
            return False

        view.connect("decide-policy", on_decide)
        view.load_uri((HERE / "index.html").as_uri())
        win.set_child(view)
        win.present()

    app.connect("activate", on_activate)
    return app.run([sys.argv[0]])


if __name__ == "__main__":
    sys.exit(main())
