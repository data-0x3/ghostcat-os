#!/usr/bin/env python3
"""GhostCat Hub — lanceur Red / Blue / Purple Team de GhostCat OS.
developed by 0x3 · https://t.me/data0x3

Interface HTML (Liquid Glass) affichée dans une fenêtre GTK4 + WebKit.
Sécurité : l'interface n'envoie que des *identifiants* d'outils ; les
commandes exécutées viennent exclusivement de tools.js, jamais de la page.
"""
import json
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
INDEX = HERE / "index.html"
CATALOG_FILE = HERE / "tools.js"
WELCOME_FLAG = Path.home() / ".config" / "ghostcat" / "welcomed"


def load_catalog():
    raw = CATALOG_FILE.read_text(encoding="utf-8")
    return {t["id"]: t for t in json.loads(raw[raw.index("["): raw.rindex("]") + 1])}


CATALOG = load_catalog()


def is_ready(tool):
    if tool.get("url"):
        return True
    checks = tool.get("check", [])
    return not checks or any(shutil.which(b) for b in checks)


def install_cmd(tool):
    if tool.get("install"):
        return tool["install"]
    if tool.get("pkg"):
        return f"sudo pacman -S --needed {shlex.quote(tool['pkg'])}"
    return None


def terminal(cmd, title):
    """Ouvre un terminal qui exécute cmd puis reste ouvert."""
    banner = f"printf '\\e[1;37m👻 GhostCat · {title}\\e[0m\\n\\n'"
    script = f"{banner}; {cmd}; echo; printf '\\e[90m— terminé, tu peux fermer cette fenêtre —\\e[0m\\n'; exec bash"
    for term in (["gnome-terminal", "--title", title, "--", "bash", "-lc", script],
                 ["kgx", "--title", title, "--", "bash", "-lc", script],
                 ["xterm", "-T", title, "-e", "bash", "-lc", script]):
        if shutil.which(term[0]):
            subprocess.Popen(term, start_new_session=True)
            return True
    return False


def open_url(url):
    if url.startswith(("https://", "http://")):
        subprocess.Popen(["xdg-open", url], start_new_session=True)


def handle(msg, reply):
    action, tool = msg.get("action"), CATALOG.get(msg.get("id", ""))
    if action == "status":
        reply({"type": "status", "installed": {i: is_ready(t) for i, t in CATALOG.items()}})
    elif action == "launch" and tool and tool.get("run"):
        if tool.get("gui"):
            subprocess.Popen(["bash", "-lc", tool["run"]], start_new_session=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            terminal(tool["run"], tool["name"])
    elif action == "install" and tool:
        cmd = install_cmd(tool)
        if cmd:
            terminal(cmd, f"Installation · {tool['name']}")
        else:
            reply({"type": "toast", "text": "Pas de méthode d'installation pour cet outil"})
    elif action == "open" and tool and tool.get("url"):
        open_url(tool["url"])
    elif action == "docs" and tool and tool.get("docs"):
        open_url(tool["docs"])
    elif action == "url" and msg.get("url") == "https://t.me/data0x3":
        open_url(msg["url"])


def run_webkit(start_view=None):
    import gi
    gi.require_version("Gtk", "4.0")
    gi.require_version("WebKit", "6.0")
    from gi.repository import Gtk, WebKit, GLib

    app = Gtk.Application(application_id="os.ghostcat.Hub")

    def on_activate(app):
        win = Gtk.ApplicationWindow(application=app, title="GhostCat Hub")
        win.set_default_size(1280, 820)
        win.set_icon_name("ghostcat-hub")

        ucm = WebKit.UserContentManager()
        view = WebKit.WebView(user_content_manager=ucm)
        settings = view.get_settings()
        settings.set_enable_developer_extras(bool(os.environ.get("GHOSTCAT_DEBUG")))
        settings.set_allow_file_access_from_file_urls(True)
        view.set_background_color(_rgba(0, 0, 0, 1))

        def reply(payload):
            js = f"window.ghostcatReply({json.dumps(payload)});"
            view.evaluate_javascript(js, -1, None, None, None, None, None)

        def on_message(_ucm, value):
            try:
                msg = json.loads(value.to_string())
                if isinstance(msg, dict):
                    handle(msg, reply)
            except (ValueError, TypeError):
                pass

        ucm.connect("script-message-received::ghostcat", on_message)
        ucm.register_script_message_handler("ghostcat", None)

        # liens externes -> navigateur, jamais dans la fenêtre du Hub
        def on_decide(_view, decision, kind):
            if kind == WebKit.PolicyDecisionType.NEW_WINDOW_ACTION:
                uri = decision.get_navigation_action().get_request().get_uri()
                open_url(uri or "")
                decision.ignore()
                return True
            if kind == WebKit.PolicyDecisionType.NAVIGATION_ACTION:
                uri = decision.get_navigation_action().get_request().get_uri() or ""
                if not uri.startswith("file://"):
                    open_url(uri)
                    decision.ignore()
                    return True
            return False

        view.connect("decide-policy", on_decide)
        # re-vérifier les outils quand on revient sur la fenêtre (après une install)
        win.connect("notify::is-active",
                    lambda w, _p: w.is_active() and reply({"type": "status",
                        "installed": {i: is_ready(t) for i, t in CATALOG.items()}}))

        uri = INDEX.as_uri() + (f"?view={start_view}" if start_view else "")
        view.load_uri(uri)
        win.set_child(view)
        win.present()

    def _rgba(r, g, b, a):
        from gi.repository import Gdk
        c = Gdk.RGBA(); c.red, c.green, c.blue, c.alpha = r, g, b, a
        return c

    app.connect("activate", on_activate)
    return app.run([sys.argv[0]])


def run_from_launcher(tool_id):
    """Lanceur de la grille d'applis : lance l'outil, ou propose de l'installer s'il manque."""
    tool = CATALOG.get(tool_id)
    if not tool:
        return 1
    if tool.get("url"):
        open_url(tool["url"])
    elif is_ready(tool) and tool.get("run"):
        if tool.get("gui"):
            subprocess.Popen(["bash", "-lc", tool["run"]], start_new_session=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            terminal(tool["run"], tool["name"])
    else:
        cmd = install_cmd(tool)
        if cmd:
            follow = f" && {tool['run']}" if tool.get("run") and not tool.get("gui") else ""
            terminal(f'echo "{tool["name"]} n\'est pas encore installé : installation…"; {cmd}{follow}',
                     f"Installation · {tool['name']}")
    return 0


def main():
    args = sys.argv[1:]
    run_id = next((a.split("=", 1)[1] for a in args if a.startswith("--run=")), None)
    if run_id:
        return run_from_launcher(run_id)
    if "--welcome" in args:              # lancé au premier login uniquement
        if WELCOME_FLAG.exists():
            return 0
        WELCOME_FLAG.parent.mkdir(parents=True, exist_ok=True)
        WELCOME_FLAG.touch()
    start = next((a.split("=", 1)[1] for a in args if a.startswith("--view=")), None)
    try:
        return run_webkit(start)
    except (ImportError, ValueError) as e:  # WebKit absent : repli navigateur (sans pont)
        print(f"[ghostcat-hub] WebKit indisponible ({e}), ouverture dans le navigateur", file=sys.stderr)
        subprocess.Popen(["xdg-open", INDEX.as_uri()], start_new_session=True)
        return 0


if __name__ == "__main__":
    sys.exit(main())
