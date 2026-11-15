/* GhostCat OS — site officiel — developed by 0x3
   Pas de framework, pas de dépendance, pas de traceur.
   Le français est écrit dans la page ; ce fichier porte l'anglais,
   détecte le système du visiteur et lit la dernière version sur GitHub. */
(function () {
  "use strict";

  var REPO = "data-0x3/ghostcat-os";
  var SITE = "https://data-0x3.github.io/ghostcat-os/";
  var CMD_WIN = "irm " + SITE + "win.txt | iex";
  var CMD_NIX = "curl -fsSL " + SITE + "get.sh | bash";

  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ---------- écran de démarrage : une seule fois par visite ---------- */
  try { sessionStorage.setItem("gc-booted", "1"); } catch (e) {}

  /* ---------- textes ---------- */
  var EN = {
    "skip": "Skip to content",
    "nav.privacy": "Privacy",
    "nav.distro": "Distribution",
    "nav.source": "Source code",
    "distro.title": "A real distribution",
    "distro.lead": "GhostCat starts from Arch Linux, but everything you see is GhostCat's own: its package repository, its installer, its desktop and its updates.",
    "f1.t": "GhostCat Installer",
    "f1.d": "Pick the drive, tick encryption if you like, create your account. The system is copied from the stick, nothing is downloaded, and an external drive also boots on another PC.",
    "f2.t": "Recovery snapshots",
    "f2.d": "Before every update, GhostCat keeps a copy of the system. If something breaks, pick the previous state in the boot menu.",
    "f3.t": "Safe updates",
    "f3.d": "<code>ghostcat-update</code> reads the Arch Linux news first, updates the signing keys, then everything else.",
    "f4.t": "GhostCat desktop",
    "f4.d": "A ghost menu, a shield that shows your protection, a desktop that fades in, and the welcome message on first launch.",
    "f5.t": "Ghost mode",
    "f5.d": "One button in quick settings: the desktop goes through Tor and your Wi-Fi gets a new MAC address.",
    "f6.t": "GhostCat repository",
    "f6.d": "Every piece of GhostCat is a package published on this site. They update with the rest of the system.",
    "shot.installer": "GhostCat Installer: each step shows up like a system boot log.",
    "shot.boot": "The GhostCat boot menu, with its recovery snapshots.",
    "src.title": "Source code",
    "src.lead": "GhostCat is free software, under the GPL-3.0 licence. All the code is here, no account needed.",
    "src.pkgs": "GhostCat packages",
    "src.pkgs.lead": "These are the packages the ISO installs. On an installed GhostCat, they arrive with the updates.",
    "src.upgrade": "Move an older install to the GhostCat repository",

    "nav.tools": "Tools",
    "nav.download": "Download",
    "nav.install": "Install",
    "hero.pitch": "A cybersecurity Linux distribution built on Arch. Your Red, Blue and Purple Team tools in one place, and your privacy set before your first click.",
    "copy": "Copy",
    "copied": "Copied",
    "hero.hint.win": "Paste it into PowerShell. It downloads the ISO, checks it and saves it to Downloads.",
    "hero.hint.nix": "Paste it into a terminal. It downloads the ISO, checks it and saves it to ~/Downloads.",
    "hero.other": "Other methods",
    "release.loading": "Looking for the latest release…",
    "privacy.title": "Set before your first click",
    "privacy.lead": "On first boot, GhostCat walks you through language, keyboard and time zone. Everything else is already locked down, and you can change it whenever you like.",
    "p1.t": "Random MAC address",
    "p1.d": "Every Wi-Fi network sees a different device. Nobody can follow you from one café to the next.",
    "p2.t": "Encrypted DNS",
    "p2.d": "Your internet provider no longer sees which sites you ask for. It steps aside on its own when Mullvad or another VPN is connected.",
    "p3.t": "Firewall on, SSH off",
    "p3.d": "No incoming connection is accepted unless you decided so.",
    "p4.t": "Anonymous device",
    "p4.d": "Your computer's name is never sent to the router, and your IPv6 addresses change regularly.",
    "p5.t": "Hardened Firefox",
    "p5.d": "Strict tracking protection, HTTPS only, uBlock Origin, DuckDuckGo search and zero telemetry.",
    "p6.t": "No traces",
    "p6.d": "No location, no recent files history, and the trash empties itself after seven days.",
    "tools.title": "Attack, defend, prove",
    "tools.lead": "69 tools sorted into three teams inside GhostCat Hub. Each one starts in a click, and if it isn't installed yet, the Hub installs it for you.",
    "red.d": "Test a system by attacking it: recon, web, passwords, Wi-Fi, reverse engineering.",
    "tool.nmap": "maps ports and services",
    "tool.burp": "intercepts web traffic",
    "tool.msf": "exploits known flaws",
    "tool.hashcat": "tests password strength",
    "tool.ghidra": "takes programs apart",
    "blue.d": "Watch and defend: network traffic, intrusions, malware, incident response.",
    "tool.wireshark": "reads traffic packet by packet",
    "tool.suricata": "spots attacks on the network",
    "tool.opensnitch": "decides which app may reach the internet",
    "tool.yara": "recognises malware families",
    "tool.vol": "digs through memory after an incident",
    "purple.d": "Make both sides work together to prove your detections really work.",
    "loop.1": "Pick a technique in MITRE ATT&amp;CK",
    "loop.2": "Replay it with CALDERA or Atomic Red Team",
    "loop.3": "Check that Suricata, Zeek or Chainsaw caught it",
    "loop.4": "Write the missing Sigma or YARA rule",
    "shot.hub": "The GhostCat desktop and the Hub: your protection status, then your tools by team, each started or installed in one click.",
    "shot.setup": "GhostCat Setup, on first boot, before the desktop even appears.",
    "shot.purple": "The Purple Team loop, step by step.",
    "legal": "Offensive tools are only for your own systems, or with written permission.",
    "dl.title": "Download",
    "dl.lead": "One command: it finds the latest release, downloads the parts, joins them and checks the SHA256 fingerprint. If the connection drops, run it again and it picks up where it stopped.",
    "dl.files": "Files",
    "dl.win": "Right-click the Start button, open Terminal, then paste:",
    "dl.nix": "In a terminal:",
    "dl.manual": "Download every part, then join them in the same folder:",
    "need.pc": "64-bit UEFI PC",
    "need.pc.d": "Secure Boot turned off",
    "need.ram": "8 GB of RAM",
    "need.ram.d": "4 GB at the very least",
    "need.usb": "8 GB USB stick",
    "need.usb.d": "it will be wiped",
    "need.disk": "50 GB free",
    "need.disk.d": "internal or external drive",
    "in.title": "Install",
    "s1.t": "Prepare the USB stick",
    "s1.d": "Open <a href=\"https://rufus.ie\" rel=\"noopener\">Rufus</a>, pick your stick and the ISO, set the partition scheme to GPT, click Start and choose “Write in DD Image mode”. On Linux: <code>sudo dd if=ghostcat.iso of=/dev/sdX bs=4M status=progress</code>.",
    "s2.t": "Boot from it",
    "s2.d": "Turn off Secure Boot in the BIOS, then at startup open the boot menu with <kbd>F12</kbd>, <kbd>F8</kbd>, <kbd>F11</kbd> or <kbd>Esc</kbd> depending on your PC, and pick the stick.",
    "s3.t": "Answer the assistant",
    "s3.d": "Language, keyboard, time zone, privacy. Choose Try to explore GhostCat without touching your drives, or Install.",
    "s4.t": "Install to a drive",
    "s4.d": "GhostCat Installer opens: pick the drive (it will be wiped), encrypt it if you like, then create your account. The system is copied from the stick, nothing is downloaded.",
    "s5.t": "Let GhostCat finish",
    "s5.d": "Allow five to fifteen minutes. With the lite edition and an internet connection, you can add the heavy tools: they download during the install.",
    "s6.t": "Restart on your drive",
    "s6.d": "Remove the stick and pick your drive in the boot menu. The GhostCat menu also lists recovery snapshots, in case an update ever goes wrong.",
    "faq.title": "Questions",
    "q1": "Will it erase Windows?",
    "a1": "No. Only the drive you pick in the installer is wiped, and live mode writes nothing. You can also install GhostCat on an external drive and leave your PC as it is.",
    "q2": "Why turn off Secure Boot?",
    "a2": "GhostCat isn't signed by Microsoft. With Secure Boot on, the PC refuses to start from the stick.",
    "q3": "I already installed GhostCat. How do I move to the new version?",
    "a3": "One command adds the GhostCat repository and installs the new interface. Your files stay where they are:",
    "q4": "How do I update?",
    "a4": "From the ghost menu or the Hub, choose Update the system, or type <code>ghostcat-update</code>. A snapshot is taken before every update: if something breaks, pick it in the boot menu.",
    "q5": "Why is the ISO split into parts?",
    "a5": "GitHub limits each file to 2 GB. The download commands join and check everything for you.",
    "q6": "Is it legal?",
    "a6": "GhostCat is free and open, and owning these tools is legal. Using them against a system that isn't yours, without written permission, is not.",
    "foot.src": "Source code",
    "foot.note": "This site loads no external font and no tracker. Only the version number is read from GitHub."
  };

  /* Le français est lu une fois dans la page, pour pouvoir y revenir. */
  var FR = {
    "copied": "Copié",
    "hero.hint.nix": "À coller dans un terminal. La commande télécharge l'ISO, la vérifie et la range dans ~/Téléchargements."
  };
  $$("[data-i18n]").forEach(function (el) {
    var k = el.getAttribute("data-i18n");
    if (!(k in FR)) FR[k] = el.innerHTML;
  });

  var lang = store("gc-lang") || ((navigator.language || "fr").slice(0, 2) === "fr" ? "fr" : "en");
  function t(k) { var d = lang === "en" ? EN : FR; return d[k] !== undefined ? d[k] : FR[k]; }

  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v !== undefined) el.innerHTML = v;
    });
    $$("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    renderRelease();
    if (typeof renderSource === "function") renderSource();
  }

  $$("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      lang = b.getAttribute("data-lang");
      store("gc-lang", lang);
      applyLang();
    });
  });

  /* ---------- système du visiteur ---------- */
  var ua = navigator.userAgent || "";
  var isWin = /Windows/i.test(ua) || !/(Linux|Mac OS X|Macintosh|X11|CrOS)/i.test(ua);
  var heroCmd = $("#heroCmd"), heroHint = $("#heroHint");
  if (!isWin && heroCmd && heroHint) {
    heroCmd.textContent = CMD_NIX;
    heroHint.setAttribute("data-i18n", "hero.hint.nix");
  }

  /* ---------- onglets ---------- */
  var tabs = $$('[role="tab"]');
  function select(tab, focus) {
    tabs.forEach(function (x) {
      var on = x === tab;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(x.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { select(tab); });
    tab.addEventListener("keydown", function (e) {
      var n = null;
      if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") n = tabs[0];
      else if (e.key === "End") n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });
  if (!isWin && $("#tab-nix")) select($("#tab-nix"));

  /* ---------- boutons Copier ---------- */
  function selectText(el) {
    var r = document.createRange();
    r.selectNodeContents(el);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = $(btn.getAttribute("data-copy"));
      if (!src) return;
      var text = src.textContent.trim();
      var done = function () {
        btn.setAttribute("data-done", "");
        btn.textContent = t("copied");
        setTimeout(function () {
          btn.removeAttribute("data-done");
          btn.textContent = t("copy");
        }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { selectText(src); });
      } else {
        selectText(src);
      }
    });
  });

  /* ---------- dernière version publiée ---------- */
  var release = null, releaseFailed = false;

  function size(bytes) {
    var en = lang === "en", u, n;
    if (bytes >= 1073741824) { n = (bytes / 1073741824).toFixed(2); u = en ? " GB" : " Go"; }
    else if (bytes >= 1048576) { n = (bytes / 1048576).toFixed(1); u = en ? " MB" : " Mo"; }
    else { n = Math.max(1, Math.round(bytes / 1024)).toString(); u = en ? " KB" : " Ko"; }
    return (en ? n : n.replace(".", ",")) + u;
  }
  function date(iso) {
    try {
      return new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return iso.slice(0, 10); }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function renderRelease() {
    var line = $("#release"), list = $("#files"), sha = $("#sha");
    if (!line) return;

    if (releaseFailed) {
      line.removeAttribute("data-i18n");
      line.innerHTML = lang === "en"
        ? 'GitHub didn\'t answer. The command above still works, or open the <a href="https://github.com/' + REPO + '/releases/latest">releases page</a>.'
        : 'GitHub n\'a pas répondu. La commande ci-dessus marche quand même, ou ouvre la <a href="https://github.com/' + REPO + '/releases/latest">page des versions</a>.';
      return;
    }
    if (!release) return;

    var parts = release.assets.filter(function (a) { return /\.iso(\.part\d+)?$/.test(a.name); })
      .sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    var total = parts.reduce(function (s, a) { return s + a.size; }, 0);
    var num = (release.tag_name.match(/\d+/) || [release.tag_name])[0];

    line.removeAttribute("data-i18n");
    line.textContent = lang === "en"
      ? "Build " + num + ", released " + date(release.published_at) + ". " + size(total) + "."
      : "Build " + num + ", publiée le " + date(release.published_at) + ". " + size(total) + ".";

    if (list) {
      list.innerHTML = parts.map(function (a) {
        return '<li><a href="' + esc(a.browser_download_url) + '">' + esc(a.name) + "<span>" + size(a.size) + "</span></a></li>";
      }).join("");
    }

    var split = parts.filter(function (a) { return /\.part\d+$/.test(a.name); });
    if (split.length) {
      var base = split[0].name.replace(/\.part\d+$/, "");
      $("#cmdJoinWin").textContent = "copy /b " + split.map(function (a) { return a.name; }).join(" + ") + " " + base;
      $("#cmdJoinNix").textContent = "cat " + base + ".part* > " + base;
    } else {
      $$("#cmdJoinWin, #cmdJoinNix").forEach(function (c) { c.parentNode.hidden = true; });
    }

    var hash = (release.body || "").match(/\b[0-9a-f]{64}\b/i);
    if (sha) sha.textContent = hash ? "SHA256 " + hash[0].toLowerCase() : "";
  }

  /* ---------- code source et paquets, servis par ce site ---------- */
  var source = null, packages = null;
  function renderSource() {
    if (source) {
      $("#srcTar").textContent = size(source.tar_size);
      $("#srcZip").textContent = size(source.zip_size);
      $("#srcMeta").textContent = (lang === "en" ? "Version " : "Version ") + source.commit + (lang === "en" ? ", " : ", ") + date(source.date);
    }
    var list = $("#pkgs");
    if (list && packages) {
      list.innerHTML = packages.map(function (p) {
        return '<li><a href="repo/x86_64/' + esc(p.file) + '" download><b>' + esc(p.name) + "</b><span>" +
          esc(lang === "en" ? (p.desc_en || p.desc) : p.desc) + "</span><em>" + size(p.size) + "</em></a></li>";
      }).join("");
    }
  }
  if (window.fetch) {
    fetch("download/source.json").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { source = d; renderSource(); }).catch(function () {});
    fetch("repo/x86_64/packages.json").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { packages = d; renderSource(); }).catch(function () {});
  }

  if (window.fetch) {
    fetch("https://api.github.com/repos/" + REPO + "/releases/latest", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { release = data; renderRelease(); })
      .catch(function () { releaseFailed = true; renderRelease(); });
  }

  applyLang();
})();
