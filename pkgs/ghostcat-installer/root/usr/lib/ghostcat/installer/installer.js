/* GhostCat Installer — interface — developed by 0x3 · https://t.me/data0x3
   Parle à l'appli Python (window.webkit.messageHandlers.ghostcat) qui lance le moteur
   d'installation en root et renvoie son avancement dans window.ghostcatReply. */
"use strict";

const T = {
  fr: {
    s_disk: "Disque", s_crypt: "Chiffrement", s_user: "Compte", s_sum: "Résumé", s_install: "Installation",
    disk_t: "Où installer GhostCat ?", disk_sub: "Le disque choisi sera entièrement effacé. Un disque externe marche aussi : ton PC reste intact.",
    no_disk: "Aucun disque disponible. Branche un disque puis rouvre l'installeur.",
    crypt_t: "Chiffrer le disque ?", crypt_sub: "Sans la phrase, personne ne peut lire tes fichiers, même en démontant le PC.",
    crypt_on: "Chiffrer GhostCat", crypt_on_d: "La phrase est demandée à chaque démarrage. Si tu l'oublies, tes données sont perdues.",
    pass: "Mot de passe", pass2: "Encore une fois",
    user_t: "Ton compte", user_sub: "Tu t'en serviras pour te connecter et pour les actions d'administration.",
    fullname: "Ton nom", username: "Identifiant", hostname: "Nom de l'ordinateur",
    autologin: "Ouvrir la session sans mot de passe", autologin_d: "Plus rapide, moins sûr : déconseillé sur un PC portable.",
    heavy: "Ajouter les outils lourds", heavy_d: "Metasploit, Ghidra, Burp Suite… téléchargés pendant l'installation (connexion Internet nécessaire).",
    sum_t: "On y va ?", warn_t: "[ ATTENTION ]",
    warn: d => `Tout le contenu de ${d} sera effacé, définitivement.`,
    agree: "J'ai compris, efface ce disque et installe GhostCat",
    k_disk: "Disque", k_crypt: "Chiffrement", k_user: "Compte", k_host: "Ordinateur", k_extra: "Outils lourds",
    yes: "Oui", no: "Non",
    back: "Retour", next: "Continuer", install: "Installer",
    reboot: "Redémarrer", stay: "Rester sur le live",
    st: {check: "Vérifications", partition: "Partitions", format: "Formatage" , copy: "Copie du système", system: "Réglages du système",
         users: "Création de ton compte", boot: "Menu de démarrage", snapshots: "Instantanés de secours", extras: "Outils supplémentaires", finish: "Finitions"},
    done: "GhostCat est installé. Retire la clé USB et redémarre.",
    failed: e => `L'installation s'est arrêtée : ${e}. Le journal complet est dans /var/log/ghostcat-install.log.`,
    e_pp: "La phrase doit faire au moins 8 caractères.", e_pp2: "Les deux phrases sont différentes.",
    e_user: "Identifiant : lettres minuscules, chiffres, - et _ (commence par une lettre).",
    e_host: "Nom de l'ordinateur : lettres, chiffres et tirets.", e_pw: "Choisis un mot de passe.", e_pw2: "Les deux mots de passe sont différents.",
    hint: "Entrée pour continuer",
    tips: [
      "Avant chaque mise à jour, GhostCat prend un instantané du système. Si quelque chose casse, choisis l'instantané d'avant dans le menu de démarrage.",
      "Le bouclier en haut à droite montre ta protection : DNS chiffré, VPN, pare-feu.",
      "Le mode fantôme, dans les réglages rapides, fait passer le bureau par Tor et change ton adresse MAC.",
      "GhostCat Hub range 69 outils en trois équipes. Un outil manquant s'installe d'un clic.",
      "ghostcat-update met tout à jour : le système, les outils et GhostCat lui-même.",
    ],
  },
  en: {
    s_disk: "Drive", s_crypt: "Encryption", s_user: "Account", s_sum: "Summary", s_install: "Install",
    disk_t: "Where should GhostCat go?", disk_sub: "The chosen drive will be completely erased. An external drive works too: your PC stays untouched.",
    no_disk: "No drive available. Plug one in, then reopen the installer.",
    crypt_t: "Encrypt the drive?", crypt_sub: "Without the passphrase, nobody can read your files, even with the drive in hand.",
    crypt_on: "Encrypt GhostCat", crypt_on_d: "The passphrase is asked at every boot. Forget it and your data is gone.",
    pass: "Password", pass2: "Once more",
    user_t: "Your account", user_sub: "You'll use it to log in and for administration.",
    fullname: "Your name", username: "Username", hostname: "Computer name",
    autologin: "Log in without a password", autologin_d: "Faster, less safe: not advised on a laptop.",
    heavy: "Add the heavy tools", heavy_d: "Metasploit, Ghidra, Burp Suite… downloaded during the install (needs internet).",
    sum_t: "Ready?", warn_t: "[ WARNING ]",
    warn: d => `Everything on ${d} will be erased, for good.`,
    agree: "I understand, erase this drive and install GhostCat",
    k_disk: "Drive", k_crypt: "Encryption", k_user: "Account", k_host: "Computer", k_extra: "Heavy tools",
    yes: "Yes", no: "No",
    back: "Back", next: "Continue", install: "Install",
    reboot: "Restart", stay: "Stay in the live session",
    st: {check: "Checks", partition: "Partitions", format: "Formatting", copy: "Copying the system", system: "System settings",
         users: "Creating your account", boot: "Boot menu", snapshots: "Recovery snapshots", extras: "Extra tools", finish: "Finishing"},
    done: "GhostCat is installed. Remove the USB stick and restart.",
    failed: e => `The install stopped: ${e}. The full log is in /var/log/ghostcat-install.log.`,
    e_pp: "The passphrase needs at least 8 characters.", e_pp2: "The two passphrases differ.",
    e_user: "Username: lowercase letters, digits, - and _ (starts with a letter).",
    e_host: "Computer name: letters, digits and dashes.", e_pw: "Pick a password.", e_pw2: "The two passwords differ.",
    hint: "Enter to continue",
    tips: [
      "Before every update, GhostCat takes a snapshot of the system. If something breaks, pick the previous snapshot in the boot menu.",
      "The shield at the top right shows your protection: encrypted DNS, VPN, firewall.",
      "Ghost mode, in quick settings, routes the desktop through Tor and changes your MAC address.",
      "GhostCat Hub sorts 69 tools into three teams. A missing tool installs in one click.",
      "ghostcat-update updates everything: the system, the tools and GhostCat itself.",
    ],
  },
};
const STEPS = ["disk", "crypt", "user", "sum"];
const ORDER = ["check", "partition", "format", "copy", "system", "users", "boot", "snapshots", "extras", "finish"];

let lang = "fr", step = 0, disks = [], lite = false, busy = false, auto = false;
const C = {disk: null, encrypt: false, passphrase: "", fullname: "", username: "", hostname: "ghostcat", password: "", autologin: false, heavy: true};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const tx = () => T[lang] || T.en;

const bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ghostcat;
const send = m => { if (bridge) bridge.postMessage(JSON.stringify(m)); };

window.ghostcatReply = m => {
  if (m.type === "init") {
    lang = (m.lang || "fr").slice(0, 2);
    disks = m.disks || [];
    lite = !!m.lite;
    $("#heavyRow").hidden = !(lite && m.online);
    C.heavy = lite && !!m.online;
    i18n(); renderDisks(); go(0);
    if (m.autoinstall) autoInstall(m.autoinstall);
  }
  if (m.type === "backend") onBackend(m.data);
};

function i18n() {
  const t = tx();
  document.documentElement.lang = lang;
  $$("[data-t]").forEach(e => { const v = t[e.dataset.t]; if (typeof v === "string") e.textContent = v; });
  $("#hint").textContent = t.hint;
}

function size(b) {
  const g = b / 1e9;
  return g >= 1000 ? (g / 1000).toFixed(1) + " To" : Math.round(g) + " Go";
}

function renderDisks() {
  const t = tx();
  $("#disks").innerHTML = disks.length
    ? disks.map(d => `<li role="option" data-disk="${esc(d.path)}" aria-selected="${d.path === C.disk}">
        <b>${esc(d.model || d.path)}</b>
        <span class="size">${size(d.size)}</span>
        <small>${esc(d.path)}${d.tran ? " · " + esc(d.tran.toUpperCase()) : ""}${d.removable ? " · amovible" : ""}</small></li>`).join("")
    : `<li class="no">${esc(t.no_disk)}</li>`;
}

function renderLog(installing) {
  const t = tx();
  const names = ["s_disk", "s_crypt", "s_user", "s_sum", "s_install"];
  const at = installing ? 4 : step;
  const val = [C.disk || "", C.encrypt ? t.yes : t.no, C.username, "", ""];
  $("#logSteps").innerHTML = names.map((k, i) => {
    const cls = i < at ? "done" : i === at ? "now" : "";
    const tag = i < at ? "[  OK  ]" : i === at ? "[  ..  ]" : "[      ]";
    return `<li class="${cls}"><span class="tag">${tag}</span><span>${esc(t[k])}${i < at && val[i] ? `<span class="val">${esc(val[i])}</span>` : ""}</span></li>`;
  }).join("");
}

function renderSummary() {
  const t = tx();
  const d = disks.find(x => x.path === C.disk);
  const rows = [
    [t.k_disk, d ? `${d.model || d.path} (${d.path}, ${size(d.size)})` : C.disk],
    [t.k_crypt, C.encrypt ? t.yes : t.no],
    [t.k_user, `${C.fullname || C.username} (${C.username})`],
    [t.k_host, C.hostname],
  ];
  if (!$("#heavyRow").hidden) rows.push([t.k_extra, C.heavy ? t.yes : t.no]);
  $("#summary").innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("#warnText").textContent = t.warn(C.disk);
}

function go(n) {
  const back = n < step;
  step = Math.max(0, Math.min(STEPS.length - 1, n));
  $$(".pane").forEach(p => {
    const on = p.dataset.k === STEPS[step];
    p.classList.toggle("on", on);
    p.classList.toggle("from-left", on && back);
  });
  $("#back").disabled = step === 0;
  if (STEPS[step] === "sum") renderSummary();
  updateNext();
  renderLog(false);
}

/* ---------- validation ---------- */
const USER_RE = /^[a-z_][a-z0-9_-]{0,31}$/, HOST_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const RESERVED = ["root", "ghost", "bin", "daemon", "nobody", "admin", "sys", "sync", "mail", "http", "ftp", "git", "dbus", "polkitd"];

function check(showErrors) {
  const t = tx();
  const k = STEPS[step];
  if (k === "disk") return !!C.disk;
  if (k === "crypt") {
    if (!C.encrypt) { $("#ppMsg").textContent = ""; return true; }
    let e = "";
    if ($("#pp1").value.length < 8) e = t.e_pp;
    else if ($("#pp1").value !== $("#pp2").value) e = t.e_pp2;
    $("#ppMsg").textContent = showErrors ? e : "";
    return !e;
  }
  if (k === "user") {
    let e = "";
    if (!USER_RE.test(C.username) || RESERVED.includes(C.username)) e = t.e_user;
    else if (!HOST_RE.test(C.hostname)) e = t.e_host;
    else if (!$("#pw1").value) e = t.e_pw;
    else if ($("#pw1").value !== $("#pw2").value) e = t.e_pw2;
    $("#userMsg").textContent = showErrors ? e : "";
    $("#username").classList.toggle("bad", showErrors && e === t.e_user);
    $("#hostname").classList.toggle("bad", showErrors && e === t.e_host);
    return !e;
  }
  if (k === "sum") return $("#agree").checked;
  return true;
}

function updateNext() {
  const last = STEPS[step] === "sum";
  $("#next").textContent = last ? tx().install : tx().next;
  $("#next").disabled = (STEPS[step] === "disk" && !C.disk) || (last && !$("#agree").checked);
}

function next() {
  if (!check(true)) return;
  if (STEPS[step] === "sum") return start();
  go(step + 1);
}

/* ---------- saisie ---------- */
$("#back").addEventListener("click", () => go(step - 1));
$("#next").addEventListener("click", next);
$("#disks").addEventListener("click", e => {
  const li = e.target.closest("li[data-disk]");
  if (!li) return;
  C.disk = li.dataset.disk; renderDisks(); updateNext(); renderLog(false);
});
$("#encrypt").addEventListener("change", e => { C.encrypt = e.target.checked; $("#cryptFields").hidden = !C.encrypt; renderLog(false); });
$("#autologin").addEventListener("change", e => { C.autologin = e.target.checked; });
$("#heavy").addEventListener("change", e => { C.heavy = e.target.checked; });
$("#agree").addEventListener("change", updateNext);
let userTouched = false;
$("#fullname").addEventListener("input", e => {
  C.fullname = e.target.value;
  if (!userTouched) {
    C.username = e.target.value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .split(/\s+/)[0].replace(/[^a-z0-9_-]/g, "").replace(/^[^a-z_]+/, "").slice(0, 32);
    $("#username").value = C.username;
  }
});
$("#username").addEventListener("input", e => { userTouched = true; C.username = e.target.value.trim(); });
$("#hostname").addEventListener("input", e => { C.hostname = e.target.value.trim(); });
document.addEventListener("keydown", e => {
  if (busy) return;
  if (e.key === "Enter") { e.preventDefault(); if (!$("#next").disabled) next(); }
});

/* ---------- installation ---------- */
let tipTimer = 0;
function start() {
  if (busy) return;
  busy = true;
  C.passphrase = C.encrypt ? $("#pp1").value : "";
  C.password = $("#pw1").value;
  const t = tx();
  $("#setup").hidden = true;
  $("#apply").hidden = false;
  $("#tasks").innerHTML = ORDER.filter(k => k !== "extras" || C.heavy).map((k, i) =>
    `<li id="st-${k}" style="animation-delay:${i * 60}ms"><span class="tag">[      ]</span><span>${esc(t.st[k])}</span></li>`).join("");
  let n = 0;
  const showTip = () => {
    $("#tip").classList.add("fade");
    setTimeout(() => { $("#tip").textContent = t.tips[n++ % t.tips.length]; $("#tip").classList.remove("fade"); }, 500);
  };
  showTip(); tipTimer = setInterval(showTip, 9000);
  send({action: "install", config: {...C}});
  // on efface les mots de passe de l'interface dès qu'ils sont partis
  ["#pp1", "#pp2", "#pw1", "#pw2"].forEach(s => $(s).value = "");
  C.passphrase = C.password = "";
}

function onBackend(d) {
  const t = tx();
  if (typeof d.progress === "number") {
    const p = Math.round(d.progress * 100);
    $("#bar").style.width = p + "%";
    $("#pct").textContent = `${p} %`;
  }
  if (d.step) {
    const li = document.getElementById(`st-${d.step}`);
    if (li) {
      li.className = d.error ? "err" : d.state;
      li.querySelector(".tag").textContent = d.error ? "[FAILED]" : d.state === "ok" ? "[  OK  ]" : "[  ..  ]";
    }
  }
  if (d.error) {
    clearInterval(tipTimer);
    $("#tip").hidden = true;
    $("#err").textContent = t.failed(d.error);
    $("#doneActions").hidden = false;
    $("#reboot").hidden = true;
  }
  if (d.done) {
    clearInterval(tipTimer);
    $("#tip").classList.remove("fade");
    $("#tip").textContent = t.done;
    $("#doneActions").hidden = false;
  }
}
$("#reboot").addEventListener("click", () => send({action: "reboot"}));
$("#stay").addEventListener("click", () => send({action: "quit"}));

/* ---------- installation automatique (ghostcat.autoinstall=1, tests en machine virtuelle) ---------- */
function autoInstall(cfg) {
  auto = true;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  (async () => {
    await wait(2500);
    C.disk = cfg.disk || (disks[0] && disks[0].path); renderDisks(); go(1);
    // le test couvre le cas le plus délicat : disque chiffré (phrase tapable en AZERTY comme en QWERTY)
    $("#encrypt").checked = C.encrypt = true; $("#cryptFields").hidden = false;
    $("#pp1").value = $("#pp2").value = cfg.passphrase || "deluge orbite glyphe";
    await wait(2500); go(2);
    $("#fullname").value = C.fullname = cfg.fullname || "Ghost Test";
    $("#username").value = C.username = cfg.username || "ghost0";
    $("#pw1").value = $("#pw2").value = cfg.password || "ghostcat";
    await wait(2500); go(3);
    $("#agree").checked = true; updateNext();
    await wait(2500); start();
  })();
}

i18n(); go(0);
send({action: "init"});
