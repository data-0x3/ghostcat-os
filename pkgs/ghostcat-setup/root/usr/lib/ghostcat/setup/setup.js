/* GhostCat Setup — logique de l'assistant — developed by 0x3 · https://t.me/data0x3
   Parle à l'appli Python par window.webkit.messageHandlers.ghostcat (messages JSON)
   et reçoit ses réponses dans window.ghostcatReply. */
"use strict";

/* ---------- textes (l'anglais sert de repli pour les autres langues) ---------- */
const T = {
  fr: {
    welcome: "Welcome to GhostCat OS, the true privacy.",
    welcome_sub: "Quelques réglages et ton système est prêt. Tout reste sur ta machine.",
    start: "Commencer", back: "Retour", next: "Continuer",
    lang_t: "Ta langue", lang_sub: "Elle sera utilisée partout : menus, applications, dates.", search: "Rechercher",
    kbd_t: "Ton clavier", kbd_sub: "Choisis la disposition de tes touches.", kbd_try: "Essaie ton clavier ici : azerty, @, €, é",
    tz_t: "Ton fuseau horaire", tz_sub: "Pour l'heure et la date. Aucune localisation n'est utilisée.", tz_search: "Ville ou région",
    priv_t: "Ta vie privée", priv_sub: "Tout est activé par défaut. Coupe seulement ce qui te gêne.",
    ready_t: "Tout est prêt", ready_sub: "Tu pourras changer ces réglages plus tard dans Réglages GhostCat.",
    try_t: "Essayer", try_d: "Découvre le bureau et le Hub sans toucher à tes disques.",
    inst_t: "Installer", inst_d: "Garde ces réglages et installe GhostCat sur un disque.",
    s_lang: "Langue", s_kbd: "Clavier", s_tz: "Fuseau", s_priv: "Vie privée", s_ready: "Démarrage",
    on: "[ ACTIF ]", off: "[ COUPÉ ]", n_on: n => `${n} protections actives`,
    t_lang: "Langue du système", t_kbd: "Disposition du clavier", t_tz: "Fuseau horaire",
    t_priv: "Protections de la vie privée", t_session: "Préparation du bureau",
    fail: "Une étape a échoué. Tu peux continuer et réessayer plus tard dans Réglages GhostCat.",
    none: "Aucun résultat",
    hint: "Entrée pour continuer",
    p: {
      mac: ["Adresse MAC aléatoire", "Les réseaux Wi-Fi ne peuvent pas suivre ton appareil d'un lieu à l'autre."],
      dns: ["DNS chiffré", "Ton fournisseur d'accès ne voit plus les sites que tu demandes. Se met en pause tout seul quand un VPN est connecté."],
      firewall: ["Pare-feu", "Bloque toutes les connexions entrantes que tu n'as pas demandées."],
      anon: ["Appareil anonyme", "Le nom de ton PC n'est jamais envoyé au réseau, et tes adresses IPv6 changent."],
      browser: ["Firefox durci", "Anti-pistage strict, HTTPS obligatoire, uBlock Origin, zéro télémétrie."],
      traces: ["Aucune trace", "Ni localisation, ni historique des fichiers récents. La corbeille se vide après 7 jours."],
      tor: ["Tor au démarrage", "Démarre le réseau Tor à chaque allumage. Plus lent : coupé par défaut."],
    },
  },
  en: {
    welcome: "Welcome to GhostCat OS, the true privacy.",
    welcome_sub: "A few settings and your system is ready. Everything stays on your machine.",
    start: "Get started", back: "Back", next: "Continue",
    lang_t: "Your language", lang_sub: "Used everywhere: menus, apps, dates.", search: "Search",
    kbd_t: "Your keyboard", kbd_sub: "Pick your key layout.", kbd_try: "Try your keyboard here: qwerty, @, €",
    tz_t: "Your time zone", tz_sub: "For time and date. No location services are used.", tz_search: "City or region",
    priv_t: "Your privacy", priv_sub: "Everything is on by default. Only turn off what gets in your way.",
    ready_t: "All set", ready_sub: "You can change these settings later in GhostCat Settings.",
    try_t: "Try it", try_d: "Explore the desktop and the Hub without touching your drives.",
    inst_t: "Install", inst_d: "Keep these settings and install GhostCat on a drive.",
    s_lang: "Language", s_kbd: "Keyboard", s_tz: "Time zone", s_priv: "Privacy", s_ready: "Start",
    on: "[  ON  ]", off: "[ OFF  ]", n_on: n => `${n} protections on`,
    t_lang: "System language", t_kbd: "Keyboard layout", t_tz: "Time zone",
    t_priv: "Privacy protections", t_session: "Preparing the desktop",
    fail: "A step failed. You can continue and retry later in GhostCat Settings.",
    none: "No results",
    hint: "Enter to continue",
    p: {
      mac: ["Random MAC address", "Wi-Fi networks can't follow your device from place to place."],
      dns: ["Encrypted DNS", "Your ISP no longer sees which sites you look up. Pauses itself while a VPN is connected."],
      firewall: ["Firewall", "Blocks every incoming connection you didn't ask for."],
      anon: ["Anonymous device", "Your computer's name is never sent to the network, and your IPv6 addresses change."],
      browser: ["Hardened Firefox", "Strict anti-tracking, HTTPS only, uBlock Origin, zero telemetry."],
      traces: ["No traces", "No location, no recent files history. The trash empties after 7 days."],
      tor: ["Tor at startup", "Starts the Tor network at every boot. Slower: off by default."],
    },
  },
};

const LANGS = [
  ["fr_FR", "Français", "France"], ["fr_BE", "Français", "Belgique"], ["fr_CH", "Français", "Suisse"], ["fr_CA", "Français", "Canada"],
  ["en_US", "English", "United States"], ["en_GB", "English", "United Kingdom"], ["es_ES", "Español", "España"], ["de_DE", "Deutsch", "Deutschland"],
  ["de_CH", "Deutsch", "Schweiz"], ["it_IT", "Italiano", "Italia"], ["pt_PT", "Português", "Portugal"], ["pt_BR", "Português", "Brasil"],
  ["nl_NL", "Nederlands", "Nederland"], ["pl_PL", "Polski", "Polska"], ["tr_TR", "Türkçe", "Türkiye"], ["ru_RU", "Русский", "Россия"], ["uk_UA", "Українська", "Україна"]];
const KBDS = [
  ["fr", "Français (AZERTY)", "France"], ["fr-bepo", "Français (BÉPO)", "Ergonomique"], ["be", "Belge (AZERTY)", "Belgique"],
  ["ch-fr", "Suisse romand (QWERTZ)", "Suisse"], ["ca-fr", "Canadien français", "Canada"], ["us", "English US (QWERTY)", "United States"],
  ["us-intl", "US international", "Dead keys"], ["gb", "English UK (QWERTY)", "United Kingdom"], ["de", "Deutsch (QWERTZ)", "Deutschland"],
  ["ch-de", "Schweizerdeutsch", "Schweiz"], ["es", "Español", "España"], ["it", "Italiano", "Italia"], ["pt", "Português", "Portugal"],
  ["br", "Português (ABNT2)", "Brasil"], ["nl", "Nederlands", "Nederland"], ["pl", "Polski", "Polska"], ["tr", "Türkçe (Q)", "Türkiye"],
  ["ru", "Русский", "Россия"], ["ua", "Українська", "Україна"]];
const LANG_DEFAULTS = {
  fr_FR: ["fr", "Europe/Paris"], fr_BE: ["be", "Europe/Brussels"], fr_CH: ["ch-fr", "Europe/Zurich"], fr_CA: ["ca-fr", "America/Toronto"],
  en_US: ["us", "America/New_York"], en_GB: ["gb", "Europe/London"], es_ES: ["es", "Europe/Madrid"], de_DE: ["de", "Europe/Berlin"],
  de_CH: ["ch-de", "Europe/Zurich"], it_IT: ["it", "Europe/Rome"], pt_PT: ["pt", "Europe/Lisbon"], pt_BR: ["br", "America/Sao_Paulo"],
  nl_NL: ["nl", "Europe/Amsterdam"], pl_PL: ["pl", "Europe/Warsaw"], tr_TR: ["tr", "Europe/Istanbul"], ru_RU: ["ru", "Europe/Moscow"], uk_UA: ["ua", "Europe/Kyiv"]};
const PRIV = [["mac", true], ["dns", true], ["firewall", true], ["anon", true], ["browser", true], ["traces", true], ["tor", false]];
const STEPS = ["lang", "kbd", "tz", "privacy", "ready"];
const TASKS = ["t_lang", "t_kbd", "t_tz", "t_priv", "t_session"];

/* ---------- état ---------- */
const S = {lang: "fr_FR", keymap: "fr", timezone: "Europe/Paris", privacy: Object.fromEntries(PRIV)};
let step = 0, zones = [], pickedKbd = false, pickedTz = false, demo = false, busy = false;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const tx = () => T[S.lang.slice(0, 2)] || T.en;

/* ---------- pont vers l'appli ---------- */
const bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ghostcat;
const send = m => { if (bridge) bridge.postMessage(JSON.stringify(m)); };
window.ghostcatReply = m => {
  if (m.type === "init") {
    zones = m.zones || zones;
    demo = !!m.demo;
    if (m.current) for (const [k, v] of Object.entries(m.current)) {
      if (v == null || !(k in S)) continue;
      if (k === "privacy") Object.assign(S.privacy, v); else S[k] = v;
    }
    i18n(); renderAll();
    if (demo) runDemo();
  }
  if (m.type === "progress") setTask(m.task, m.state);
  if (m.type === "done") finished(m.ok);
};

/* ---------- textes ---------- */
function i18n() {
  const t = tx();
  document.documentElement.lang = S.lang.slice(0, 2);
  $$("[data-t]").forEach(e => { const v = t[e.dataset.t] ?? T.en[e.dataset.t]; if (typeof v === "string") e.textContent = v; });
  $$("[data-ph]").forEach(e => e.placeholder = t[e.dataset.ph] ?? "");
  $("#hint").textContent = t.hint;
}

/* ---------- listes ---------- */
function list(el, items, current, key, filter = "") {
  const f = filter.trim().toLowerCase();
  const shown = items.filter(o => (o[1] + " " + o[2] + " " + o[0]).toLowerCase().includes(f));
  el.innerHTML = shown.length
    ? shown.map(o => `<li role="option" data-${key}="${esc(o[0])}" aria-selected="${o[0] === current}">${esc(o[1])}<span>${esc(o[2])}</span></li>`).join("")
    : `<li class="empty">${esc(tx().none)}</li>`;
}
function zoneItems() {
  return zones.map(z => {
    const parts = z.split("/");
    return [z, parts[parts.length - 1].replace(/_/g, " "), parts.slice(0, -1).join(" / ").replace(/_/g, " ")];
  });
}
function scrollToSelected(el) {
  const sel = el.querySelector('[aria-selected="true"]');
  if (sel) sel.scrollIntoView({block: "center"});
}

function renderPrivacy() {
  const t = tx();
  $("#g-priv").innerHTML = PRIV.map(([k]) =>
    `<li><button role="switch" data-priv="${k}" aria-checked="${!!S.privacy[k]}">
       <b>${esc(t.p[k][0])}</b><small>${esc(t.p[k][1])}</small>
       <span class="state">${S.privacy[k] ? t.on : t.off}</span></button></li>`).join("");
}

function tzClock() {
  try {
    $("#tz-time").textContent = new Date().toLocaleTimeString(S.lang.replace("_", "-"), {hour: "2-digit", minute: "2-digit", timeZone: S.timezone});
    $("#tz-name").textContent = S.timezone.replace(/_/g, " ");
  } catch (e) { $("#tz-time").textContent = "--:--"; }
}

function renderLog() {
  const t = tx();
  const L = LANGS.find(l => l[0] === S.lang), K = KBDS.find(k => k[0] === S.keymap);
  const n = PRIV.filter(([k]) => S.privacy[k]).length;
  const rows = [
    ["s_lang", L ? `${L[1]} (${L[2]})` : S.lang],
    ["s_kbd", K ? K[1] : S.keymap],
    ["s_tz", S.timezone.replace(/_/g, " ")],
    ["s_priv", t.n_on(n)],
    ["s_ready", ""],
  ];
  $("#logSteps").innerHTML = rows.map(([k, v], i) => {
    const cls = i < step ? "done" : i === step ? "now" : "";
    const tag = i < step ? "[  OK  ]" : i === step ? "[  ..  ]" : "[      ]";
    return `<li class="${cls}"><span class="tag">${tag}</span><span>${esc(t[k])}${i <= step && v ? `<span class="val">${esc(v)}</span>` : ""}</span></li>`;
  }).join("");
}

function renderAll() {
  list($("#g-lang"), LANGS, S.lang, "lang", $("#q-lang").value);
  list($("#g-kbd"), KBDS, S.keymap, "kbd");
  list($("#g-tz"), zoneItems(), S.timezone, "tz", $("#q-tz").value);
  renderPrivacy(); tzClock(); renderLog();
}

/* ---------- navigation ---------- */
function go(n) {
  const back = n < step;
  step = Math.max(0, Math.min(STEPS.length - 1, n));
  $$(".pane").forEach(p => {
    const on = p.dataset.k === STEPS[step];
    p.classList.toggle("on", on);
    p.classList.toggle("from-left", on && back);
  });
  $("#back").disabled = step === 0;
  $("#next").hidden = STEPS[step] === "ready";
  $("#hint").hidden = STEPS[step] === "ready";
  renderLog();
  const pane = $(`.pane[data-k="${STEPS[step]}"]`);
  const lst = pane.querySelector(".list");
  if (lst) requestAnimationFrame(() => scrollToSelected(lst));
}

$("#start").addEventListener("click", () => {
  $("#welcome").classList.add("leaving");
  setTimeout(() => { $("#welcome").hidden = true; $("#setup").hidden = false; go(0); }, 420);
});
$("#back").addEventListener("click", () => go(step - 1));
$("#next").addEventListener("click", () => go(step + 1));

document.addEventListener("click", e => {
  const li = e.target.closest("li[role=option]");
  if (li && li.dataset.lang) {
    S.lang = li.dataset.lang;
    const d = LANG_DEFAULTS[S.lang];
    if (d && !pickedKbd) S.keymap = d[0];
    if (d && !pickedTz) S.timezone = d[1];
    i18n(); renderAll();
  } else if (li && li.dataset.kbd) {
    S.keymap = li.dataset.kbd; pickedKbd = true;
    send({action: "kbd_preview", keymap: S.keymap});
    renderAll();
  } else if (li && li.dataset.tz) {
    S.timezone = li.dataset.tz; pickedTz = true;
    renderAll();
  }
  const sw = e.target.closest("[data-priv]");
  if (sw) { S.privacy[sw.dataset.priv] = !S.privacy[sw.dataset.priv]; renderPrivacy(); renderLog(); }
  const ch = e.target.closest(".choice");
  if (ch) startApply(ch.dataset.mode);
});

$("#q-lang").addEventListener("input", e => list($("#g-lang"), LANGS, S.lang, "lang", e.target.value));
$("#q-tz").addEventListener("input", e => list($("#g-tz"), zoneItems(), S.timezone, "tz", e.target.value));

document.addEventListener("keydown", e => {
  if (busy) return;
  if (!$("#welcome").hidden) { if (e.key === "Enter") $("#start").click(); return; }
  if (e.key === "Enter" && STEPS[step] !== "ready" && !e.target.matches(".try")) { e.preventDefault(); go(step + 1); }
  if (e.key === "Escape") go(step - 1);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const lst = document.querySelector(".pane.on .list");
    if (!lst) return;
    const items = [...lst.querySelectorAll("li[role=option]")];
    const i = items.findIndex(li => li.getAttribute("aria-selected") === "true");
    const next = items[Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) { e.preventDefault(); next.click(); scrollToSelected(lst); }
  }
});
setInterval(tzClock, 15000);

/* ---------- application des réglages ---------- */
function startApply(mode) {
  if (busy) return;
  busy = true;
  const t = tx();
  $("#setup").hidden = true;
  $("#apply").hidden = false;
  $("#tasks").innerHTML = TASKS.map((k, i) =>
    `<li id="task-${k}" style="animation-delay:${i * 90}ms"><span class="tag">[      ]</span><span>${esc(t[k])}</span></li>`).join("");
  send({action: "apply", mode, settings: {lang: S.lang, keymap: S.keymap, timezone: S.timezone, privacy: S.privacy}});
  if (!bridge) {     // aperçu dans un navigateur : on simule
    TASKS.forEach((k, i) => { setTimeout(() => setTask(k, "run"), 400 + i * 500); setTimeout(() => setTask(k, "ok"), 800 + i * 500); });
  }
}
function setTask(k, state) {
  const li = document.getElementById(`task-${k}`);
  if (!li) return;
  li.className = state;
  li.querySelector(".tag").textContent = {run: "[  ..  ]", ok: "[  OK  ]", err: "[FAILED]"}[state] || "[      ]";
}
function finished(ok) { if (!ok) $("#err").textContent = tx().fail; }

/* ---------- bienvenue : la phrase s'écrit lettre par lettre ---------- */
function typeWelcome() {
  const line = $("#welcomeLine"), text = tx().welcome;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { line.textContent = text; $("#welcome").classList.add("ready"); return; }
  let i = 0;
  const tick = () => {
    i++;
    line.innerHTML = esc(text.slice(0, i)) + '<span class="cursor">&nbsp;</span>';
    if (i < text.length) setTimeout(tick, text[i - 1] === "," ? 260 : 46);
    else setTimeout(() => $("#welcome").classList.add("ready"), 300);
  };
  setTimeout(tick, 900);
}

/* ---------- mode démo (ghostcat.demo=1) : déroule tout seul, pour les captures ---------- */
function runDemo() {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  (async () => {
    await wait(5500); $("#start").click();
    for (let i = 0; i < STEPS.length - 1; i++) { await wait(3500); go(step + 1); }
    await wait(3500); startApply("try");
  })();
}

i18n(); renderAll(); go(0); typeWelcome();
send({action: "init"});
