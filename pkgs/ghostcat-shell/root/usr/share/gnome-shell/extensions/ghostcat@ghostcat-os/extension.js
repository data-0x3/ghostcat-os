// GhostCat Shell — l'interface de GhostCat OS par-dessus GNOME Shell.
// developed by 0x3 · https://t.me/data0x3
//
// Ce que fait l'extension :
//   - le menu fantôme, à gauche de la barre : état de la protection et accès rapides ;
//   - le bouclier, à droite : DNS chiffré, VPN, pare-feu, mode fantôme, d'un coup d'œil ;
//   - le mode fantôme dans les réglages rapides : Tor + proxy du bureau + nouvelle adresse MAC ;
//   - l'apparition du bureau à l'ouverture de session, et le message de bienvenue la première fois ;
//   - la feuille de style GhostCat (stylesheet.css), chargée automatiquement par GNOME Shell.
//
// Tout ce qui touche au système passe par des programmes séparés et vérifiés
// (/usr/bin/ghostcat-status, /usr/lib/ghostcat/ghost-mode via pkexec).

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {QuickToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// ---------------------------------------------------------------- textes
const FR = (GLib.get_language_names()[0] || '').startsWith('fr');
const T = FR ? {
    hub: 'GhostCat Hub', red: 'Red Team', blue: 'Blue Team', purple: 'Purple Team',
    update: 'Mettre à jour le système', settings: 'Réglages GhostCat', overview: 'Vue d\'ensemble',
    dns_dot: 'DNS chiffré', dns_vpn: 'DNS du VPN', dns_off: 'DNS non chiffré',
    vpn_on: 'VPN connecté', vpn_off: 'Pas de VPN',
    fw_on: 'Pare-feu actif', fw_off: 'Pare-feu coupé',
    mac_on: 'Adresse MAC aléatoire', mac_off: 'Adresse MAC réelle',
    ghost: 'Mode fantôme', ghost_on: 'Mode fantôme : Tor actif', ghost_sub: 'Tor + nouvelle MAC',
    welcome: 'Welcome to GhostCat OS, the true privacy.',
    privacy: 'Protection',
} : {
    hub: 'GhostCat Hub', red: 'Red Team', blue: 'Blue Team', purple: 'Purple Team',
    update: 'Update the system', settings: 'GhostCat settings', overview: 'Overview',
    dns_dot: 'Encrypted DNS', dns_vpn: 'VPN DNS', dns_off: 'Unencrypted DNS',
    vpn_on: 'VPN connected', vpn_off: 'No VPN',
    fw_on: 'Firewall on', fw_off: 'Firewall off',
    mac_on: 'Random MAC address', mac_off: 'Real MAC address',
    ghost: 'Ghost mode', ghost_on: 'Ghost mode: Tor on', ghost_sub: 'Tor + new MAC',
    welcome: 'Welcome to GhostCat OS, the true privacy.',
    privacy: 'Protection',
};

// ---------------------------------------------------------------- outils
function run(argv) {
    return new Promise(resolve => {
        try {
            const proc = Gio.Subprocess.new(argv,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    const [, out] = p.communicate_utf8_finish(res);
                    resolve({ok: p.get_successful(), out: out || ''});
                } catch (e) {
                    resolve({ok: false, out: ''});
                }
            });
        } catch (e) {
            resolve({ok: false, out: ''});
        }
    });
}

function spawn(argv) {
    try {
        Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
    } catch (e) {
        console.warn(`GhostCat: ${argv[0]} : ${e.message}`);
    }
}

function launchApp(desktopId, fallback) {
    const app = Shell.AppSystem.get_default().lookup_app(desktopId);
    if (app)
        app.activate();
    else if (fallback)
        spawn(fallback);
}

function vbox(params = {}) {
    // St.BoxLayout : « vertical » est remplacé par « orientation » depuis GNOME 48
    const box = new St.BoxLayout(params);
    if ('orientation' in box)
        box.orientation = Clutter.Orientation.VERTICAL;
    else
        box.vertical = true;
    return box;
}

// ---------------------------------------------------------------- état de la protection
class StatusWatcher {
    constructor(onChange) {
        this._onChange = onChange;
        this.state = null;
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 12, () => {
            this.refresh();
            return GLib.SOURCE_CONTINUE;
        });
        this.refresh();
    }

    async refresh() {
        const r = await run(['/usr/bin/ghostcat-status']);
        if (!this._onChange)
            return;
        try {
            const s = JSON.parse(r.out);
            const changed = JSON.stringify(s) !== JSON.stringify(this.state);
            this.state = s;
            if (changed)
                this._onChange(s);
        } catch (e) {
            // ghostcat-status absent ou illisible : on garde le dernier état
        }
    }

    destroy() {
        if (this._timer)
            GLib.source_remove(this._timer);
        this._timer = 0;
        this._onChange = null;
    }
}

// une ligne façon journal de démarrage : [  OK  ] DNS chiffré
const StatusLine = GObject.registerClass(
class StatusLine extends PopupMenu.PopupBaseMenuItem {
    _init() {
        super._init({reactive: false, can_focus: false, style_class: 'ghostcat-status-line'});
        this._tag = new St.Label({style_class: 'ghostcat-tag', y_align: Clutter.ActorAlign.CENTER});
        this._text = new St.Label({style_class: 'ghostcat-status-text', y_align: Clutter.ActorAlign.CENTER});
        this.add_child(this._tag);
        this.add_child(this._text);
    }

    set(kind, text) {
        // kind : ok | warn | info
        const tags = {ok: '[  OK  ]', warn: '[ WARN ]', info: '[ INFO ]'};
        this._tag.text = tags[kind] || tags.info;
        for (const k of ['ok', 'warn', 'info'])
            this._tag.remove_style_class_name(`ghostcat-tag-${k}`);
        this._tag.add_style_class_name(`ghostcat-tag-${kind}`);
        this._text.text = text;
    }
});

function describe(s) {
    if (!s)
        return [];
    return [
        s.dns === 'dot' ? ['ok', T.dns_dot] : s.dns === 'vpn' ? ['info', T.dns_vpn] : ['warn', T.dns_off],
        s.vpn ? ['ok', `${T.vpn_on} (${s.vpn})`] : ['info', T.vpn_off],
        s.firewall ? ['ok', T.fw_on] : ['warn', T.fw_off],
        s.mac ? ['ok', T.mac_on] : ['warn', T.mac_off],
        ...(s.ghost ? [['ok', T.ghost_on]] : []),
    ];
}

// ---------------------------------------------------------------- menu fantôme (à gauche)
const GhostMenu = GObject.registerClass(
class GhostMenu extends PanelMenu.Button {
    _init(ext) {
        super._init(0.0, 'GhostCat', false);
        this.add_style_class_name('ghostcat-ghost-button');
        this.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(`${ext.path}/assets/ghost-symbolic.svg`),
            style_class: 'ghostcat-ghost-icon',
        }));

        // en-tête : fantôme + nom + version
        const head = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false, style_class: 'ghostcat-head'});
        head.add_child(new St.Icon({gicon: Gio.icon_new_for_string(`${ext.path}/assets/ghost.png`), icon_size: 48}));
        const names = vbox({y_align: Clutter.ActorAlign.CENTER});
        names.add_child(new St.Label({text: 'GHOSTCAT OS', style_class: 'ghostcat-head-title'}));
        names.add_child(new St.Label({text: osVersion(), style_class: 'ghostcat-head-sub'}));
        head.add_child(names);
        this.menu.addMenuItem(head);

        this._lines = [];
        this._linesSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._linesSection);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const item = (label, cb, cls) => {
            const it = new PopupMenu.PopupMenuItem(label);
            if (cls)
                it.add_style_class_name(cls);
            it.connect('activate', cb);
            this.menu.addMenuItem(it);
        };
        item(T.hub, () => launchApp('ghostcat-hub.desktop', ['ghostcat-hub']));
        item(T.red, () => spawn(['ghostcat-hub', '--view=red']), 'ghostcat-team-red');
        item(T.blue, () => spawn(['ghostcat-hub', '--view=blue']), 'ghostcat-team-blue');
        item(T.purple, () => spawn(['ghostcat-hub', '--view=purple']), 'ghostcat-team-purple');
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        item(T.overview, () => Main.overview.toggle());
        item(T.update, () => spawn(['ghostcat-update', '--gui']));
        item(T.settings, () => launchApp('ghostcat-setup.desktop', ['ghostcat-setup', '--windowed']));
    }

    setStatus(s) {
        const rows = describe(s);
        while (this._lines.length < rows.length) {
            const l = new StatusLine();
            this._lines.push(l);
            this._linesSection.addMenuItem(l);
        }
        this._lines.forEach((l, i) => {
            l.visible = i < rows.length;
            if (i < rows.length)
                l.set(...rows[i]);
        });
    }
});

function osVersion() {
    try {
        const [ok, bytes] = GLib.file_get_contents('/etc/os-release');
        if (ok) {
            const txt = new TextDecoder().decode(bytes);
            const m = txt.match(/^VERSION="?([^"\n]+)"?/m);
            if (m)
                return m[1];
        }
    } catch (e) {}
    return 'Phantom';
}

// ---------------------------------------------------------------- bouclier (à droite)
const Shield = GObject.registerClass(
class Shield extends PanelMenu.Button {
    _init(ext) {
        super._init(0.5, 'GhostCat Shield', false);
        this._ext = ext;
        this.add_style_class_name('ghostcat-shield');
        this._icon = new St.Icon({style_class: 'system-status-icon'});
        this.add_child(this._icon);
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem(T.privacy, {reactive: false, style_class: 'ghostcat-menu-title'}));
        this._lines = [];
        for (let i = 0; i < 5; i++) {
            const l = new StatusLine();
            this._lines.push(l);
            this.menu.addMenuItem(l);
        }
        this.setStatus(null);
    }

    setStatus(s) {
        let name = 'shield-ok';
        if (s && (s.dns === 'off' || !s.firewall))
            name = 'shield-warn';
        else if (s && (s.vpn || s.ghost))
            name = 'shield-vpn';
        this._icon.gicon = Gio.icon_new_for_string(`${this._ext.path}/assets/${name}-symbolic.svg`);
        for (const c of ['ok', 'warn', 'vpn'])
            this.remove_style_class_name(`ghostcat-shield-${c}`);
        this.add_style_class_name(`ghostcat-${name}`);
        const rows = describe(s);
        this._lines.forEach((l, i) => {
            l.visible = i < rows.length;
            if (i < rows.length)
                l.set(...rows[i]);
        });
    }
});

// ---------------------------------------------------------------- mode fantôme (réglages rapides)
const GhostToggle = GObject.registerClass(
class GhostToggle extends QuickToggle {
    _init(ext, onChanged) {
        super._init({
            title: T.ghost,
            subtitle: T.ghost_sub,
            gicon: Gio.icon_new_for_string(`${ext.path}/assets/ghost-symbolic.svg`),
            toggleMode: false,
        });
        this._busy = false;
        this._onChanged = onChanged;
        this.connect('clicked', () => this._flip());
    }

    sync(s) {
        if (!this._busy)
            this.checked = Boolean(s && s.ghost);
    }

    async _flip() {
        if (this._busy)
            return;
        this._busy = true;
        const on = !this.checked;
        const r = await run(['pkexec', '/usr/lib/ghostcat/ghost-mode', on ? 'on' : 'off']);
        if (r.ok) {
            setDesktopProxy(on);
            this.checked = on;
        }
        this._busy = false;
        this._onChanged?.();
    }
});

// proxy du bureau vers Tor (réglage de l'utilisateur, l'ancien mode est restauré)
function setDesktopProxy(on) {
    try {
        const proxy = new Gio.Settings({schema_id: 'org.gnome.system.proxy'});
        const socks = new Gio.Settings({schema_id: 'org.gnome.system.proxy.socks'});
        const stateDir = GLib.build_filenamev([GLib.get_user_state_dir(), 'ghostcat']);
        const saved = GLib.build_filenamev([stateDir, 'proxy-mode']);
        if (on) {
            GLib.mkdir_with_parents(stateDir, 0o700);
            GLib.file_set_contents(saved, proxy.get_string('mode'));
            socks.set_string('host', '127.0.0.1');
            socks.set_int('port', 9050);
            proxy.set_string('mode', 'manual');
        } else {
            let mode = 'none';
            try {
                const [ok, bytes] = GLib.file_get_contents(saved);
                if (ok)
                    mode = new TextDecoder().decode(bytes).trim() || 'none';
            } catch (e) {}
            proxy.set_string('mode', mode === 'manual' ? 'none' : mode);
        }
    } catch (e) {
        console.warn(`GhostCat: proxy : ${e.message}`);
    }
}

const GhostIndicator = GObject.registerClass(
class GhostIndicator extends SystemIndicator {
    _init(ext, onChanged) {
        super._init();
        this._dot = this._addIndicator();
        this._dot.gicon = Gio.icon_new_for_string(`${ext.path}/assets/ghost-symbolic.svg`);
        this._dot.visible = false;
        this.toggle = new GhostToggle(ext, onChanged);
        this.quickSettingsItems.push(this.toggle);
    }

    sync(s) {
        this.toggle.sync(s);
        this._dot.visible = Boolean(s && s.ghost);
    }

    destroy() {
        this.quickSettingsItems.forEach(i => i.destroy());
        super.destroy();
    }
});

// ---------------------------------------------------------------- apparition du bureau
// Joué une seule fois par session (l'extension est aussi réactivée au déverrouillage).
let introPlayed = false;

class Intro {
    constructor(ext) {
        this._ext = ext;
        this._timers = [];
        const mon = Main.layoutManager.primaryMonitor;
        this.actor = new St.Widget({
            style_class: 'ghostcat-intro',
            reactive: true,
            x: mon.x, y: mon.y, width: mon.width, height: mon.height,
            layout_manager: new Clutter.BinLayout(),
        });
        const box = vbox({x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER, style_class: 'ghostcat-intro-box'});
        this._ghost = new St.Icon({
            gicon: Gio.icon_new_for_string(`${ext.path}/assets/ghost.png`),
            icon_size: 176, opacity: 0, x_align: Clutter.ActorAlign.CENTER,
        });
        this._ghost.set_pivot_point(0.5, 0.5);
        this._label = new St.Label({style_class: 'ghostcat-intro-text', text: '', x_align: Clutter.ActorAlign.CENTER});
        box.add_child(this._ghost);
        box.add_child(this._label);
        this.actor.add_child(box);
        Main.layoutManager.uiGroup.add_child(this.actor);
        Main.layoutManager.uiGroup.set_child_above_sibling(this.actor, null);
    }

    _later(ms, fn) {
        const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            this._timers = this._timers.filter(t => t !== id);
            fn();
            return GLib.SOURCE_REMOVE;
        });
        this._timers.push(id);
    }

    play(first) {
        this._ghost.scale_x = this._ghost.scale_y = 0.86;
        this._ghost.ease({opacity: 255, scale_x: 1, scale_y: 1, duration: 700, mode: Clutter.AnimationMode.EASE_OUT_BACK});
        if (!first) {
            this._later(900, () => this._out());
            return;
        }
        // première ouverture de session : le message s'écrit lettre par lettre
        const text = T.welcome;
        let i = 0;
        this._later(800, () => {
            const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 42, () => {
                i++;
                this._label.text = text.slice(0, i) + (i < text.length ? '_' : '');
                if (i < text.length)
                    return GLib.SOURCE_CONTINUE;
                this._timers = this._timers.filter(t => t !== id);
                this._later(1800, () => this._out());
                return GLib.SOURCE_REMOVE;
            });
            this._timers.push(id);
        });
    }

    _out() {
        this._ghost.ease({scale_x: 1.12, scale_y: 1.12, duration: 500, mode: Clutter.AnimationMode.EASE_IN_QUAD});
        this.actor.ease({
            opacity: 0, duration: 650, mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
            onComplete: () => this.destroy(),
        });
    }

    destroy() {
        this._timers.forEach(id => GLib.source_remove(id));
        this._timers = [];
        if (this.actor) {
            this.actor.destroy();
            this.actor = null;
        }
    }
}

function firstSession() {
    const dir = GLib.build_filenamev([GLib.get_user_state_dir(), 'ghostcat']);
    const flag = GLib.build_filenamev([dir, 'welcomed']);
    if (GLib.file_test(flag, GLib.FileTest.EXISTS))
        return false;
    try {
        GLib.mkdir_with_parents(dir, 0o700);
        GLib.file_set_contents(flag, new Date().toISOString());
    } catch (e) {}
    return true;
}

// ---------------------------------------------------------------- extension
export default class GhostCatExtension extends Extension {
    enable() {
        this._menu = new GhostMenu(this);
        Main.panel.addToStatusArea('ghostcat-menu', this._menu, 0, 'left');

        this._shield = new Shield(this);
        Main.panel.addToStatusArea('ghostcat-shield', this._shield, 0, 'right');

        this._ghost = new GhostIndicator(this, () => this._watch?.refresh());
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._ghost);

        this._watch = new StatusWatcher(s => {
            this._menu?.setStatus(s);
            this._shield?.setStatus(s);
            this._ghost?.sync(s);
        });
        this._menu.menu.connect('open-state-changed', (_m, open) => {
            if (open)
                this._watch?.refresh();
        });

        Main.panel.add_style_class_name('ghostcat-panel');

        if (!introPlayed && Main.layoutManager._startingUp) {
            introPlayed = true;
            this._intro = new Intro(this);
            const first = firstSession();
            Main.layoutManager.connectObject('startup-complete', () => this._intro?.play(first), this);
        }
        introPlayed = true;
    }

    disable() {
        Main.layoutManager.disconnectObject(this);
        this._intro?.destroy();
        this._intro = null;
        this._watch?.destroy();
        this._watch = null;
        this._ghost?.destroy();
        this._ghost = null;
        this._shield?.destroy();
        this._shield = null;
        this._menu?.destroy();
        this._menu = null;
        Main.panel.remove_style_class_name('ghostcat-panel');
    }
}
