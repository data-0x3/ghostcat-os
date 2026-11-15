#!/usr/bin/env python3
"""GhostCat Installer — fenêtre de l'installeur.
developed by 0x3 · https://t.me/data0x3

L'interface (index.html) tourne dans WebKit. Ce programme :
  - liste les disques où l'on peut installer (jamais celui du live) ;
  - lance le moteur (backend) en root, lui passe la configuration sur l'entrée standard,
    et renvoie son avancement à l'interface ;
  - redémarre la machine à la fin si on le demande.
Option de test : « ghostcat.autoinstall=1 » sur la ligne de commande du noyau installe
seul sur le premier disque (machines virtuelles de test), puis éteint la machine.
"""
import json
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

HERE = Path(__file__).resolve().parent
BACKEND = str(HERE / "backend")


def cmdline():
    try:
        return Path("/proc/cmdline").read_text().split()
    except OSError:
        return []


def live_disk():
    try:
        src = subprocess.run(["findmnt", "-no", "SOURCE", "/run/archiso/bootmnt"],
                             capture_output=True, text=True).stdout.strip()
        if src:
            pk = subprocess.run(["lsblk", "-no", "PKNAME", src], capture_output=True, text=True).stdout.strip()
            return "/dev/" + (pk or os.path.basename(src))
    except OSError:
        pass
    return None


def disks():
    try:
        out = subprocess.run(["lsblk", "-J", "-b", "-d", "-o", "PATH,SIZE,MODEL,TRAN,TYPE,RM,RO"],
                             capture_output=True, text=True, timeout=10).stdout
        devs = json.loads(out).get("blockdevices", [])
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return []
    skip = live_disk()
    res = []
    for d in devs:
        if d.get("type") != "disk" or d.get("ro") in (True, "1") or d.get("path") == skip:
            continue
        if not d.get("size") or int(d["size"]) < 20 * 10**9:      # 20 Go minimum
            continue
        if any(d["path"].startswith(p) for p in ("/dev/zram", "/dev/loop", "/dev/sr")):
            continue
        res.append({"path": d["path"], "size": int(d["size"]), "model": (d.get("model") or "").strip(),
                    "tran": d.get("tran") or "", "removable": d.get("rm") in (True, "1")})
    return res


def online():
    try:
        return subprocess.run(["nmcli", "-t", "networking", "connectivity"], capture_output=True,
                              text=True, timeout=5).stdout.strip() in ("full", "limited", "unknown")
    except (OSError, subprocess.TimeoutExpired):
        return False


def main():
    import gi
    gi.require_version("Gtk", "4.0")
    gi.require_version("WebKit", "6.0")
    from gi.repository import Gdk, GLib, Gtk, WebKit

    auto = "ghostcat.autoinstall=1" in cmdline()
    app = Gtk.Application(application_id="os.ghostcat.Installer")
    state = {"running": False}

    def on_activate(app):
        win = Gtk.ApplicationWindow(application=app, title="GhostCat Installer")
        win.set_default_size(1200, 800)
        win.set_icon_name("ghostcat-hub")
        win.maximize()

        ucm = WebKit.UserContentManager()
        view = WebKit.WebView(user_content_manager=ucm)
        bg = Gdk.RGBA()
        bg.parse("#000000")
        view.set_background_color(bg)

        def reply(payload):
            def push():
                view.evaluate_javascript(f"window.ghostcatReply({json.dumps(payload)});", -1, None, None, None, None, None)
                return False
            GLib.idle_add(push)

        def worker(cfg):
            data = json.dumps(cfg)
            argv = ["sudo", "-n", BACKEND] if shutil.which("sudo") else ["pkexec", BACKEND]
            try:
                proc = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=subprocess.DEVNULL, text=True, bufsize=1)
            except OSError as e:
                reply({"type": "backend", "data": {"error": str(e), "step": "check"}})
                return
            proc.stdin.write(data)
            proc.stdin.close()
            ok = False
            failed = False
            for line in proc.stdout:
                try:
                    msg = json.loads(line)
                except ValueError:
                    continue
                ok = ok or bool(msg.get("done"))
                failed = failed or bool(msg.get("error"))
                reply({"type": "backend", "data": msg})
            code = proc.wait()
            if code != 0 and not ok and not failed:   # sinon la vraie raison est déjà affichée
                reply({"type": "backend", "data": {"error": f"code {code}", "step": "finish"}})
            state["running"] = False
            if auto and ok:
                GLib.timeout_add_seconds(8, lambda: subprocess.Popen(["systemctl", "poweroff"]) and False)

        def on_message(_ucm, value):
            try:
                msg = json.loads(value.to_string())
            except (ValueError, TypeError):
                return
            if not isinstance(msg, dict):
                return
            act = msg.get("action")
            if act == "init":
                lst = disks()
                reply({"type": "init", "disks": lst, "lang": os.environ.get("LANG", "fr")[:2],
                       "lite": Path("/usr/share/ghostcat/edition").read_text().strip() == "lite"
                       if Path("/usr/share/ghostcat/edition").exists() else False,
                       "online": online(),
                       "autoinstall": {"disk": lst[0]["path"]} if auto and lst else None})
            elif act == "install" and isinstance(msg.get("config"), dict) and not state["running"]:
                state["running"] = True
                threading.Thread(target=worker, args=(msg["config"],), daemon=True).start()
            elif act == "reboot":
                subprocess.Popen(["systemctl", "reboot"])
            elif act == "quit":
                app.quit()

        ucm.connect("script-message-received::ghostcat", on_message)
        ucm.register_script_message_handler("ghostcat", None)

        def on_decide(_v, decision, kind):
            if kind in (WebKit.PolicyDecisionType.NAVIGATION_ACTION, WebKit.PolicyDecisionType.NEW_WINDOW_ACTION):
                uri = decision.get_navigation_action().get_request().get_uri() or ""
                if not uri.startswith("file://"):
                    decision.ignore()
                    return True
            return False

        def on_close(_w):
            return state["running"]          # pas de fermeture pendant l'installation

        view.connect("decide-policy", on_decide)
        win.connect("close-request", on_close)
        view.load_uri((HERE / "index.html").as_uri())
        win.set_child(view)
        win.present()

    app.connect("activate", on_activate)
    return app.run([sys.argv[0]])


if __name__ == "__main__":
    sys.exit(main())
