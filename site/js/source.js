/* GhostCat OS — onglet Code source — developed by 0x3 · https://t.me/data0x3
   Lit source/tree.json (généré à chaque publication par tools/site-meta.py),
   affiche l'arborescence, et ouvre chaque fichier depuis source/f/<numéro>. */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); };

  var EN = {
    "skip": "Skip to the code", "nav.home": "Home", "nav.distro": "Distribution", "nav.download": "Download",
    "nav.source": "Source code", "title": "Source code",
    "lead": "GhostCat is free software, under the GPL-3.0 licence. Here is all of its code, file by file: the system, the apps, the installer, the theme and this website.",
    "find": "Find a file", "copy": "Copy", "copied": "Copied", "download": "Download",
    "loading": "Loading the code…", "binary": "Binary file: download it to open it.",
    "fail": "The code list could not be loaded. Download the archive above instead.",
    "meta": function (m) { return "Version " + m.commit + ", " + m.date + ". " + m.n + " files."; }
  };
  var FR = {
    "copied": "Copié", "binary": "Fichier binaire : télécharge-le pour l'ouvrir.",
    "fail": "La liste du code n'a pas pu être chargée. Télécharge plutôt l'archive ci-dessus.",
    "meta": function (m) { return "Version " + m.commit + ", " + m.date + ". " + m.n + " fichiers."; }
  };
  $$("[data-i18n]").forEach(function (el) { var k = el.getAttribute("data-i18n"); if (!(k in FR)) FR[k] = el.textContent; });
  $$("[data-i18n-ph]").forEach(function (el) { FR[el.getAttribute("data-i18n-ph")] = el.placeholder; });

  var lang = "fr";
  try { lang = localStorage.getItem("gc-lang") || ((navigator.language || "fr").slice(0, 2) === "fr" ? "fr" : "en"); } catch (e) {}
  function t(k) { var d = lang === "en" ? EN : FR; return d[k] !== undefined ? d[k] : FR[k]; }

  var data = null, current = null, objectUrl = null;

  function size(b) {
    var en = lang === "en";
    var r = b >= 1048576 ? (b / 1048576).toFixed(1) + (en ? " MB" : " Mo") : Math.max(1, Math.round(b / 1024)) + (en ? " KB" : " Ko");
    return en ? r : r.replace(".", ",");
  }
  function day(iso) {
    try { return new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {day: "numeric", month: "long", year: "numeric"}); }
    catch (e) { return iso.slice(0, 10); }
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(function (el) { var v = t(el.getAttribute("data-i18n")); if (typeof v === "string") el.textContent = v; });
    $$("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-ph")); });
    $$("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang)); });
    if (data) {
      $("#tarSize").textContent = size(data.tar_size);
      $("#zipSize").textContent = size(data.zip_size);
      $("#meta").textContent = t("meta")({commit: data.commit, date: day(data.date), n: data.files.length});
    }
  }
  $$("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      lang = b.getAttribute("data-lang");
      try { localStorage.setItem("gc-lang", lang); } catch (e) {}
      applyLang();
    });
  });

  /* ---------- arborescence ---------- */
  function buildTree(files) {
    var root = {dirs: {}, files: []};
    files.forEach(function (f) {
      var parts = f.p.split("/"), node = root;
      for (var i = 0; i < parts.length - 1; i++) {
        node = node.dirs[parts[i]] || (node.dirs[parts[i]] = {dirs: {}, files: [], path: parts.slice(0, i + 1).join("/")});
      }
      node.files.push(f);
    });
    return root;
  }
  function renderNode(node, depth) {
    var html = "";
    Object.keys(node.dirs).sort().forEach(function (name) {
      var d = node.dirs[name];
      html += '<li class="dir" data-dir="' + esc(d.path) + '"><button type="button" style="--d:' + depth + '">' + esc(name) + "</button><ul>" +
        renderNode(d, depth + 1) + "</ul></li>";
    });
    node.files.sort(function (a, b) { return a.p < b.p ? -1 : 1; }).forEach(function (f) {
      var name = f.p.split("/").pop();
      html += '<li class="file"><button type="button" role="treeitem" style="--d:' + depth + '" data-file="' + esc(f.p) + '">' + esc(name) + "</button></li>";
    });
    return html;
  }
  function openParents(path) {
    var parts = path.split("/");
    for (var i = 1; i < parts.length; i++) {
      var li = document.querySelector('.dir[data-dir="' + CSS.escape(parts.slice(0, i).join("/")) + '"]');
      if (li) li.classList.add("open");
    }
  }

  /* ---------- affichage d'un fichier ---------- */
  var COMMENT = /^\s*(#|\/\/|\/\*|\*|<!--|;)/;
  function show(path, push) {
    var f = data.files.filter(function (x) { return x.p === path; })[0];
    if (!f) return;
    current = f;
    $$(".tree button[aria-selected]").forEach(function (b) { b.removeAttribute("aria-selected"); });
    var btn = document.querySelector('.tree [data-file="' + CSS.escape(path) + '"]');
    if (btn) { btn.setAttribute("aria-selected", "true"); openParents(path); }
    var parts = path.split("/");
    $("#path").innerHTML = parts.map(function (p, i) { return i < parts.length - 1 ? "<span>" + esc(p) + " / </span>" : esc(p); }).join("");
    var raw = $("#rawBtn");
    raw.hidden = false; raw.href = "f/" + f.f; raw.setAttribute("download", parts[parts.length - 1]);
    $("#copyBtn").hidden = f.k !== "text";
    if (push) { try { history.replaceState(null, "", "#" + encodeURIComponent(path)); } catch (e) {} }
    var body = $("#body");
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    if (f.k === "bin") { body.innerHTML = '<p class="note">' + esc(t("binary")) + " (" + size(f.s) + ")</p>"; return; }
    body.innerHTML = '<p class="note">' + esc(t("loading")) + "</p>";
    fetch("f/" + f.f).then(function (r) { if (!r.ok) throw new Error(r.status); return f.k === "image" ? r.blob() : r.text(); })
      .then(function (content) {
        if (current !== f) return;
        if (f.k === "image") {
          var types = {svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif"};
          objectUrl = URL.createObjectURL(new Blob([content], {type: types[f.x] || "image/png"}));
          body.innerHTML = '<img alt="" src="' + objectUrl + '">';
          return;
        }
        var lines = content.replace(/\n$/, "").split("\n");
        body.innerHTML = '<div class="code">' + lines.map(function (l) {
          return COMMENT.test(l) ? '<div><span class="c">' + esc(l) + "</span></div>" : "<div>" + esc(l || " ") + "</div>";
        }).join("") + "</div>";
        body.scrollTop = 0;
        current.text = content;
      })
      .catch(function () { body.innerHTML = '<p class="note">' + esc(t("fail")) + "</p>"; });
  }

  $("#tree").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.file) { show(b.dataset.file, true); return; }
    b.parentNode.classList.toggle("open");
  });

  $("#copyBtn").addEventListener("click", function () {
    var btn = this;
    if (!current || !current.text || !navigator.clipboard) return;
    navigator.clipboard.writeText(current.text).then(function () {
      btn.setAttribute("data-done", ""); btn.textContent = t("copied");
      setTimeout(function () { btn.removeAttribute("data-done"); btn.textContent = t("copy"); }, 1500);
    });
  });

  /* recherche : n'affiche que les fichiers dont le chemin contient le texte */
  $("#find").addEventListener("input", function () {
    var q = this.value.trim().toLowerCase();
    if (!q) { $("#tree").innerHTML = renderNode(buildTree(data.files), 0); if (current) show(current.p, false); return; }
    var hits = data.files.filter(function (f) { return f.p.toLowerCase().indexOf(q) !== -1; }).slice(0, 300);
    $("#tree").innerHTML = hits.map(function (f) {
      return '<li class="file"><button type="button" style="--d:0" data-file="' + esc(f.p) + '"><span class="hit">' + esc(f.p) + "</span></button></li>";
    }).join("");
  });

  applyLang();
  fetch("tree.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      data = d;
      $("#tree").innerHTML = renderNode(buildTree(d.files), 0);
      applyLang();
      var want = decodeURIComponent((location.hash || "").slice(1));
      show(d.files.some(function (f) { return f.p === want; }) ? want : "README.md", false);
    })
    .catch(function () { $("#body").innerHTML = '<p class="note">' + esc(t("fail")) + "</p>"; });
})();
