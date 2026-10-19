/*
 * Näher dran – Fragenspiel
 * Code: MIT-Lizenz (siehe LICENSE). Inhalte der Decks: CC BY 4.0 (siehe LICENSE-CONTENT.md).
 *
 * Läuft unverändert im Browser (auch als Web-App vom Home-Bildschirm) und in der
 * Android-App, die diese Dateien aus ihren Assets lädt.
 */
(function () {
  "use strict";
  var DECKS = window.NAEHER_DRAN_DECKS || [];
  // Bedien-Regel, die in jedem Deck als letzte Regel angezeigt wird
  var APP_RULE = "Tippt auf den Bildschirm für die nächste Karte. Wischt nach rechts oder tippt auf den Pfeil unten links, um eine Karte zurückzugehen.";
  if (!DECKS.length) { document.getElementById("screen").textContent = "Keine Decks gefunden."; return; }
  function deckById(id) { for (var i = 0; i < DECKS.length; i++) if (DECKS[i].id === id) return DECKS[i]; return null; }

  var ICON_BACK = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_MENU = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M12 1.5c.6 5.6 2.9 8.6 10.5 10.5C14.9 13.9 12.6 16.9 12 22.5 11.4 16.9 9.1 13.9 1.5 12 9.1 10.1 11.4 7.1 12 1.5z"/></svg>';

  var app = document.getElementById("app");
  var scr = document.getElementById("screen");
  var ov = document.getElementById("overlay");

  // ---------- Speicher ----------
  var KEY = "naeherdran.v1";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function newSeed() { return Math.floor(Math.random() * 2147483646) + 1; }

  var S = load();
  if (!S.decks) { // Spielstand aus Version 1.0 übernehmen (nur ein Deck)
    S.decks = { klassisch: { pos: typeof S.pos === "number" ? S.pos : -1, seed: S.seed || newSeed(), seenRules: !!S.seenRules } };
    delete S.pos; delete S.seed; delete S.seenRules;
  }
  if (typeof S.shuffle !== "boolean") S.shuffle = false;
  if (!deckById(S.deck)) S.deck = DECKS[0].id;
  DECKS.forEach(function (d) {
    var p = S.decks[d.id] || (S.decks[d.id] = {});
    if (typeof p.pos !== "number") p.pos = -1;
    if (!p.seed) p.seed = newSeed();
  });

  var D, P, SEQ; // aktuelles Deck, sein Spielstand, sein Kartenstapel
  function selectDeck(id) {
    S.deck = id; D = deckById(id); P = S.decks[id]; SEQ = build();
    if (P.pos >= SEQ.length) P.pos = -1;
    save();
  }

  // ---------- Kartenstapel ----------
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function interleave(lvl) {
    var qs = lvl.fragen, ws = lvl.wildcards, out = [], wi = 0;
    var step = qs.length / (ws.length + 1), slots = {};
    for (var k = 0; k < ws.length; k++) slots[Math.round(step * (k + 1))] = true;
    for (var i = 0; i < qs.length; i++) {
      out.push({ t: qs[i], w: false });
      if (slots[i + 1] && wi < ws.length) out.push({ t: ws[wi++], w: true });
    }
    while (wi < ws.length) out.push({ t: ws[wi++], w: true });
    return out;
  }
  function build() {
    var seq = [], r = rng(P.seed);
    D.level.forEach(function (lvl, li) {
      seq.push({ type: "intro", lvl: lvl, li: li });
      var cards;
      if (S.shuffle) {
        cards = lvl.fragen.map(function (t) { return { t: t, w: false }; })
          .concat(lvl.wildcards.map(function (t) { return { t: t, w: true }; }));
        for (var i = cards.length - 1; i > 0; i--) {
          var j = Math.floor(r() * (i + 1)), tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
        }
        if (cards[0].w) { // nicht mit einer Wildcard einsteigen
          for (var k = 1; k < cards.length; k++) if (!cards[k].w) { var x = cards[0]; cards[0] = cards[k]; cards[k] = x; break; }
        }
      } else {
        cards = interleave(lvl);
      }
      cards.forEach(function (c, n) {
        seq.push({ type: "card", lvl: lvl, li: li, text: c.t, wild: c.w, n: n + 1, total: cards.length });
      });
    });
    seq.push({ type: "final" });
    return seq;
  }
  function introIndex(li) { for (var i = 0; i < SEQ.length; i++) if (SEQ[i].type === "intro" && SEQ[i].li === li) return i; return 0; }

  // ---------- Darstellung ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function themeOf(key) { return D.farben[String(key)]; }
  function wildTheme(n) { var f = D.farben; return { bg: f.wild.bg, fg: f.wild.fg, accent: f.rahmen[n], muted: f.rahmen[n] }; }

  function applyTheme(t, wild) {
    var st = app.style;
    st.setProperty("--bg", t.bg); st.setProperty("--fg", t.fg);
    st.setProperty("--accent", t.accent); st.setProperty("--muted", t.muted);
    st.setProperty("--frame", wild ? t.accent : t.muted);
    app.classList.toggle("wild", !!wild);
    try { if (window.Android && Android.setBarColor) Android.setBarColor(t.bg); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.bg);
  }

  function bar(i, progress) {
    return '<div class="bar">' +
      '<button class="icon' + (i <= 0 ? " ghost" : "") + '" data-a="prev" aria-label="Zurück">' + ICON_BACK + '</button>' +
      '<div class="progress"><div class="track"></div><div class="fill" style="width:' + Math.round(progress * 100) + '%"></div></div>' +
      '<button class="icon" data-a="menu" aria-label="Menü">' + ICON_MENU + '</button>' +
      '</div>';
  }

  function startHTML() {
    var nQ = 0, nW = 0;
    D.level.forEach(function (l) { nQ += l.fragen.length; nW += l.wildcards.length; });
    var resume = P.pos > 0 && P.pos < SEQ.length - 1;
    var it = resume ? SEQ[P.pos] : null;
    var where = it ? ("Level " + (it.li + 1) + (it.type === "card" ? " · Karte " + it.n + " von " + it.total : "")) : "";
    return '<div class="top"><span class="eyebrow">' + esc(D.eyebrow) + '</span></div>' +
      '<div class="body">' +
        '<h1 class="title">' + esc(D.titel).replace(" ", "<br>") + '</h1>' +
        '<p class="sub">' + esc(D.untertitel) + '</p>' +
        '<div class="rule"></div>' +
        '<p class="stats">3 Level · ' + nQ + ' Fragen · ' + nW + ' Wildcards</p>' +
      '</div>' +
      '<div class="actions">' +
        '<div class="decks">' + DECKS.map(function (d) {
          return '<button class="seg' + (d.id === D.id ? " on" : "") + '" data-a="deck" data-id="' + d.id + '">' + esc(d.name) + '</button>';
        }).join("") + '</div>' +
        (resume
          ? '<button class="btn primary" data-a="resume">Weiterspielen<small>' + where + '</small></button>' +
            '<button class="btn outline" data-a="new">Neu beginnen</button>'
          : '<button class="btn primary" data-a="new">Spiel starten</button>') +
        '<div class="row">' +
          '<button class="link" data-a="rules">So spielt ihr</button>' +
          '<label class="switch" data-a="noop"><input type="checkbox" id="shuffle"' + (S.shuffle ? " checked" : "") + '><span class="track"></span>Mischen</label>' +
        '</div>' +
      '</div>';
  }

  function rulesHTML() {
    return '<div class="top"><span class="eyebrow">Bevor ihr loslegt</span></div>' +
      '<div class="body"><h2>So spielt ihr</h2><ol>' +
        D.regeln.concat([APP_RULE]).map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") +
      '</ol></div>' +
      '<div class="actions"><button class="btn primary" data-a="rulesdone">' + (rulesReturn ? "Zurück zum Spiel" : "Los geht’s") + '</button></div>';
  }

  function introHTML(it, i) {
    var l = it.lvl;
    return '<div class="top"><span class="acc">' + (D.id !== DECKS[0].id ? esc(D.eyebrow) + ' · ' : '') + 'Level ' + l.nummer + ' von 3</span></div>' +
      '<div class="body">' +
        '<div class="bignum">' + l.nummer + '</div>' +
        '<div class="lname">' + esc(l.name) + '</div>' +
        '<div class="rule"></div>' +
        '<p class="intro">' + esc(l.intro) + '</p>' +
      '</div>' +
      '<div class="hint">Tippen, um zu beginnen</div>' +
      bar(i, 0);
  }

  function cardHTML(it, i) {
    var l = it.lvl, top = '<div class="top"><span>Level ' + l.nummer + ' · ' + esc(l.name) + '</span><span class="count">' + pad(it.n) + ' / ' + pad(it.total) + '</span></div>';
    var mid = it.wild
      ? '<div class="body"><div class="star">' + STAR + '</div><div class="wlabel">WILDCARD</div><p class="wq">' + esc(it.text) + '</p></div>'
      : '<div class="body"><div class="rule"></div><p class="q' + (it.text.length > 70 ? " long" : "") + '">' + esc(it.text) + '</p></div>';
    return top + mid + bar(i, it.n / it.total);
  }

  function finalHTML() {
    return '<div class="top"><span class="eyebrow">Letzte Karte</span></div>' +
      '<div class="body"><div class="star">' + STAR + '</div><p class="fq">' + esc(D.abschluss) + '</p><p class="thanks">Danke fürs Spielen.</p></div>' +
      '<div class="actions">' +
        '<button class="btn primary" data-a="again">Nochmal spielen</button>' +
        '<button class="btn outline" data-a="home">Zum Start</button>' +
      '</div>';
  }

  function menuHTML(i) {
    var cur = SEQ[i] ? SEQ[i].li : -1;
    return '<div class="backdrop" data-a="closemenu"></div>' +
      '<div class="sheet"><div class="grip"></div><div class="sheet-h">Springen zu</div>' +
      D.level.map(function (l, li) {
        var t = themeOf(l.nummer);
        return '<button class="item' + (li === cur ? " current" : "") + '" data-a="jump" data-l="' + li + '">' +
          '<span class="dot" style="background:' + t.bg + ';color:' + t.fg + '">' + l.nummer + '</span>' + esc(l.name) +
          '<span class="meta">' + (li === cur ? "Hier seid ihr" : l.fragen.length + " Fragen") + '</span></button>';
      }).join("") +
      '<div class="sep"></div>' +
      '<button class="item" data-a="rules">So spielt ihr</button>' +
      '<button class="item" data-a="home">Zum Start</button>' +
      '</div>';
  }

  // ---------- Navigation ----------
  var view = { name: "start", i: -1 };
  var menuOpen = false, rulesReturn = false, returnTo = 0;

  function show(v, dir) {
    view = v;
    if (v.name === "start") { applyTheme(themeOf("start")); paint(startHTML(), "", dir); return; }
    if (v.name === "rules") { applyTheme(themeOf("rules")); paint(rulesHTML(), "rules", dir); return; }
    var it = SEQ[v.i];
    P.pos = v.i; save();
    if (it.type === "intro") { applyTheme(themeOf(it.lvl.nummer)); paint(introHTML(it, v.i), "", dir); }
    else if (it.type === "card") {
      if (it.wild) applyTheme(wildTheme(it.lvl.nummer), true);
      else applyTheme(themeOf(it.lvl.nummer));
      paint(cardHTML(it, v.i), "card", dir);
    }
    else { applyTheme(themeOf("start")); paint(finalHTML(), "final", dir); }
  }
  function paint(html, cls, dir) {
    scr.className = "";
    scr.innerHTML = html;
    void scr.offsetWidth; // Animation neu starten
    scr.className = (cls ? cls + " " : "") + (dir > 0 ? "in-r" : dir < 0 ? "in-l" : "in-f");
    app.classList.remove("rules", "final");
    if (cls === "rules" || cls === "final") app.classList.add(cls);
  }

  function goSeq(i, dir) { closeMenu(); show({ name: "seq", i: Math.max(0, Math.min(i, SEQ.length - 1)) }, dir); }
  function next() { if (view.name === "seq" && view.i < SEQ.length - 1) goSeq(view.i + 1, 1); }
  function prev() { if (view.name === "seq" && view.i > 0) goSeq(view.i - 1, -1); }

  function openMenu() { menuOpen = true; ov.innerHTML = menuHTML(view.i); void ov.offsetWidth; ov.classList.add("open"); }
  function closeMenu() { if (!menuOpen) return; menuOpen = false; ov.classList.remove("open"); }

  function newGame() { P.seed = newSeed(); SEQ = build(); P.pos = 0; save(); }
  function startPlaying() {
    if (!P.seenRules) { rulesReturn = false; show({ name: "rules" }, 1); }
    else goSeq(0, 1);
  }

  var actions = {
    noop: function () {},
    deck: function (el) {
      var id = el.getAttribute("data-id");
      if (id !== D.id) { selectDeck(id); show({ name: "start" }, 0); }
    },
    resume: function () { goSeq(P.pos, 1); },
    "new": function () { newGame(); startPlaying(); },
    rules: function () { rulesReturn = view.name === "seq"; if (rulesReturn) returnTo = view.i; closeMenu(); show({ name: "rules" }, 1); },
    rulesdone: function () {
      P.seenRules = true; save();
      if (rulesReturn) { rulesReturn = false; goSeq(returnTo, -1); }
      else goSeq(Math.max(P.pos, 0), 1);
    },
    prev: prev,
    menu: openMenu,
    closemenu: closeMenu,
    jump: function (el) { goSeq(introIndex(+el.getAttribute("data-l")), 1); },
    home: function () { closeMenu(); show({ name: "start" }, -1); },
    again: function () { newGame(); goSeq(0, 1); }
  };

  // Antippen = weiter, Wischen = vor/zurück
  var tx = 0, ty = 0, tt = 0, swiped = false;
  app.addEventListener("touchstart", function (e) { var p = e.changedTouches[0]; tx = p.clientX; ty = p.clientY; tt = Date.now(); swiped = false; }, { passive: true });
  app.addEventListener("touchend", function (e) {
    var p = e.changedTouches[0], dx = p.clientX - tx, dy = p.clientY - ty;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - tt < 700 && !menuOpen) {
      swiped = true;
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  app.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-a]") : null;
    if (a) { var f = actions[a.getAttribute("data-a")]; if (f) f(a); return; }
    if (swiped) { swiped = false; return; }
    if (menuOpen) return;
    if (view.name === "seq") next();
  });
  app.addEventListener("change", function (e) {
    if (e.target.id === "shuffle") {
      S.shuffle = e.target.checked;
      DECKS.forEach(function (d) { S.decks[d.id].seed = newSeed(); S.decks[d.id].pos = -1; });
      SEQ = build(); save();
      show({ name: "start" }, 0);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " ") next();
    else if (e.key === "ArrowLeft") prev();
    else if (e.key === "Escape") window.onAndroidBack();
  });

  // Zurück-Taste von Android (wird von der App aufgerufen).
  // true = erledigt, false = App darf sich schließen.
  window.onAndroidBack = function () {
    if (menuOpen) { closeMenu(); return true; }
    if (view.name === "rules") {
      if (rulesReturn) { rulesReturn = false; goSeq(returnTo, -1); } else show({ name: "start" }, -1);
      return true;
    }
    if (view.name === "seq") {
      if (view.i > 0) { prev(); return true; }
      show({ name: "start" }, -1); return true;
    }
    return false;
  };

  // Bildschirm im Browser wach halten, solange gespielt wird (die Android-App macht das selbst)
  var wakeLock = null;
  function keepAwake() {
    if (wakeLock || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    navigator.wakeLock.request("screen").then(function (l) {
      wakeLock = l; l.addEventListener("release", function () { wakeLock = null; });
    }).catch(function () {});
  }
  document.addEventListener("visibilitychange", keepAwake);
  app.addEventListener("click", keepAwake);

  // Offline-Unterstützung für die Web-App (nicht nötig und nicht möglich in der Android-App)
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  selectDeck(S.deck);
  show({ name: "start" }, 0);
})();
