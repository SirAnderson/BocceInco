/* =========================================================================
   Zibello Arena Bocce — rendering dei dati del torneo (vanilla JS)
   I dati arrivano da data/tournament.js (window.TOURNAMENT).
   ========================================================================= */
(function () {
  "use strict";

  var T = window.TOURNAMENT;

  // FLAG — box "La mia classifica" nel riquadro La mia squadra (Home).
  // Mettere a false quando iniziano le eliminatorie (~01/07): i gironi non
  // interessano piu' in home page. Poi rilanciare tools/build_data.py (cache-bust).
  var SHOW_MY_STANDINGS = true;

  var VIEWS = ["home", "calendario", "classifiche", "tabellone"];
  var KO_SHORT = {
    "Ottavi di finale": "Ottavi", "Quarti di finale": "Quarti",
    "Semifinali": "Semifinale", "Finale 3°/4° posto": "Finale 3°/4°", "Finale": "Finale"
  };

  /* ---- helpers --------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function byIso(a, b) {
    var x = a.when && a.when.iso, y = b.when && b.when.iso;
    if (!x) return 1; if (!y) return -1;
    return x < y ? -1 : x > y ? 1 : a.id - b.id;
  }
  function dayKey(m) { return m.when ? m.when.day + "/" + m.when.month : "?"; }

  /* ---- girone chip ----------------------------------------------------- */
  function gchip(letter, opts) {
    opts = opts || {};
    var span = el("span", "gchip" + (opts.letterOnly ? " gchip--letter" : "") + (opts.lg ? " gchip--lg" : ""));
    span.setAttribute("data-gir", letter);
    span.textContent = opts.letterOnly ? letter : "Girone " + letter;
    return span;
  }
  function phaseBadge(label) {
    var span = el("span", "gchip gchip--letter");
    span.style.background = "var(--surface-3)";
    span.style.color = "var(--ink)";
    span.style.borderColor = "var(--line)";
    span.style.width = "auto";
    span.style.padding = "0.15rem 0.5rem";
    span.title = label;
    span.textContent = (KO_SHORT[label] || label).replace(" di finale", "").slice(0, 9);
    return span;
  }

  /* ---- match row ------------------------------------------------------- */
  function matchRow(m, opts) {
    opts = opts || {};
    var row = el("div", "match" + (opts.next ? " match--next" : ""));
    row.setAttribute("data-id", m.id);

    // colonna sinistra: girone o fase
    var left = el("div", "match__gir");
    left.appendChild(m.phase === "girone" ? gchip(m.group, { letterOnly: true }) : phaseBadge(m.phaseLabel));
    row.appendChild(left);

    // squadre
    var teams = el("div", "match__teams");
    var t1 = m.team1 || "Da definire", t2 = m.team2 || "Da definire";
    var w1 = m.played && m.winner === 1, w2 = m.played && m.winner === 2;
    teams.appendChild(teamLine(t1, w1, m.played, !m.team1));
    teams.appendChild(teamLine(t2, w2, m.played, !m.team2));
    row.appendChild(teams);

    // punteggio / orario
    if (m.played) {
      var sc = el("div", "match__score");
      sc.innerHTML = '<span class="' + (w1 ? "" : "s--lose") + '">' + m.score1 + "</span>" +
                     '<span class="vs">–</span>' +
                     '<span class="' + (w2 ? "" : "s--lose") + '">' + m.score2 + "</span>";
      row.appendChild(sc);
    } else {
      var tm = el("div", "match__time");
      if (m.when && m.when.time) {
        tm.innerHTML = esc(m.when.time) + (opts.showDate ? "<small>" + esc(m.when.dateLabel) + "</small>" : "");
      } else {
        tm.innerHTML = '<span class="muted">—</span>';
      }
      row.appendChild(tm);
    }
    return row;
  }
  function teamLine(name, win, played, tbd) {
    var cls = "match__team" + (played ? (win ? " match__team--win" : " match__team--lose") : "");
    var line = el("div", cls);
    var nm = el("span", "name" + (tbd ? " tie__name--tbd" : ""));
    nm.textContent = name;
    line.appendChild(nm);
    return line;
  }

  /* ---- HOME ------------------------------------------------------------ */
  function renderHome() {
    var played = T.matches.filter(function (m) { return m.phase === "girone" && m.played; });
    var upcoming = T.matches.filter(function (m) { return m.phase === "girone" && !m.played && m.when && m.when.iso; }).sort(byIso);
    var lastResults = played.slice().sort(byIso).reverse();

    // prossima giornata: solo il giorno successivo, con tutte le sue partite
    var nx = $("#home-next"); nx.innerHTML = "";
    if (upcoming.length) {
      var k0 = dayKey(upcoming[0]);
      var sameDay = upcoming.filter(function (m) { return dayKey(m) === k0; });
      var w = upcoming[0].when;
      var head = el("div", "nextday");
      head.innerHTML = "<span class='num'>" + w.day + "</span><span>" +
        esc(cap(w.weekday) + " " + w.day + " " + w.monthName) + "</span>";
      nx.appendChild(head);
      sameDay.forEach(function (m) { nx.appendChild(matchRow(m)); });
    } else {
      nx.appendChild(el("div", "empty-note", "Nessuna partita in programma."));
    }

    // ultimi risultati
    var lr = $("#home-last"); lr.innerHTML = "";
    if (lastResults.length) {
      lastResults.slice(0, 5).forEach(function (m) { lr.appendChild(matchRow(m)); });
    } else {
      lr.appendChild(el("div", "empty-note", "Ancora nessun risultato. Prima palla a breve!"));
    }

    // in testa ai gironi: le prime due
    var lead = $("#home-leaders"); lead.innerHTML = "";
    T.groups.forEach(function (g) {
      var st = (T.standings[g.letter] || []).slice(0, 2);
      var card = el("div", "standing");
      card.style.borderTopColor = g.color;
      var rows = st.map(function (r) {
        var rec = r.played > 0 ? r.won + "/" + r.played + " · " + signed(r.diff) : "—";
        return '<div class="leader">' +
          '<span class="leader__pos">' + r.pos + "</span>" +
          '<span class="leader__name">' + esc(r.team) + "</span>" +
          '<span class="leader__rec">' + rec + "</span></div>";
      }).join("");
      card.innerHTML =
        '<div class="standing__head" style="padding:var(--sp-3)">' + chipHTML(g.letter, false) + "</div>" +
        '<div class="leader-list">' + rows + "</div>";
      lead.appendChild(card);
    });
  }
  function chipHTML(letter, letterOnly) {
    return '<span class="gchip' + (letterOnly ? " gchip--letter" : "") + '" data-gir="' + letter + '">' +
      (letterOnly ? letter : "Girone " + letter) + "</span>";
  }
  function signed(n) { return (n > 0 ? "+" : "") + n; }

  /* ---- CALENDARIO ------------------------------------------------------ */
  var filterState = { gir: "ALL", team: "ALL", todo: false };

  // "Classifica completa": mostra anche PF/PS nelle classifiche (default off, persistito).
  var FULL_KEY = "zibello.stand.full";
  var fullStandings = false;

  var MYTEAM_KEY = "zibello.myteam";
  var myteam = "";
  var _allTeams = null;
  function allTeams() {
    if (!_allTeams) {
      _allTeams = [];
      T.groups.forEach(function (g) { g.teams.forEach(function (t) { _allTeams.push(t); }); });
      _allTeams.sort(function (a, b) { return a.localeCompare(b, "it"); });
    }
    return _allTeams;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }

  function buildFilters() {
    // girone toggles
    var wrap = $("#filter-gironi");
    var all = makeFbtn("Tutti", "ALL", filterState.gir === "ALL");
    all.addEventListener("click", function () { setGir("ALL"); });
    wrap.appendChild(all);
    T.groups.forEach(function (g) {
      var b = makeFbtn(g.letter, g.letter, false);
      b.classList.add("fbtn--gir");
      b.setAttribute("data-gir", g.letter);
      b.addEventListener("click", function () { setGir(g.letter); });
      wrap.appendChild(b);
    });
    // team select
    var sel = $("#filter-team");
    sel.innerHTML = '<option value="ALL">Tutte le squadre</option>';
    allTeams().forEach(function (t) {
      var o = el("option"); o.value = t; o.textContent = t; sel.appendChild(o);
    });
    sel.addEventListener("change", function () { filterState.team = sel.value; syncTeamUrl(); renderCalendar(true); });
    // todo toggle
    var todo = $("#filter-todo");
    todo.addEventListener("click", function () {
      filterState.todo = !filterState.todo;
      todo.setAttribute("aria-pressed", String(filterState.todo));
      renderCalendar(true);
    });
    // condividi
    var share = $("#filter-share");
    if (share) share.addEventListener("click", shareCalendar);
    // affordance di scroll della riga gironi: la sfumatura a destra sparisce a fine corsa
    var girRow = $("#filter-gironi");
    if (girRow) {
      girRow.addEventListener("scroll", updateGironeScrollHint, { passive: true });
      window.addEventListener("resize", updateGironeScrollHint);
    }
  }
  function updateGironeScrollHint() {
    var g = $("#filter-gironi");
    if (!g || g.offsetParent === null) return;  // non visibile: non valutare (dimensioni 0)
    g.classList.toggle("is-end", g.scrollLeft + g.clientWidth >= g.scrollWidth - 2);
  }

  // indicatore della tab attiva che scorre (nav in alto + bottom bar)
  function positionIndicator(nav, ind, mode) {
    if (!nav || !ind) return;
    var active = nav.querySelector('[aria-current="page"]');
    if (!active || active.offsetParent === null || !active.offsetWidth) { ind.style.width = "0px"; return; }
    if (mode === "center") {
      var w = 30;
      ind.style.width = w + "px";
      ind.style.transform = "translateX(" + Math.round(active.offsetLeft + (active.offsetWidth - w) / 2) + "px)";
    } else {
      var pad = parseFloat(getComputedStyle(active).paddingLeft) || 0;
      ind.style.width = Math.round(active.offsetWidth - pad * 2) + "px";
      ind.style.transform = "translateX(" + Math.round(active.offsetLeft + pad) + "px)";
    }
  }
  function updateNavIndicators() {
    positionIndicator($(".nav"), $(".nav__indicator"), "inset");
    positionIndicator($(".bottomnav"), $(".bottomnav__indicator"), "center");
  }
  function makeFbtn(label, val, pressed) {
    var b = el("button", "fbtn", esc(label));
    b.setAttribute("aria-pressed", String(!!pressed));
    b.setAttribute("data-val", val);
    return b;
  }
  function setGir(val) {
    filterState.gir = val;
    document.querySelectorAll("#filter-gironi .fbtn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-val") === val));
    });
    renderCalendar(true);
  }
  function matchPassesFilter(m) {
    if (filterState.todo && m.played) return false;
    if (filterState.gir !== "ALL") { if (m.group !== filterState.gir) return false; }
    if (filterState.team !== "ALL") {
      if (m.team1 !== filterState.team && m.team2 !== filterState.team) return false;
    }
    return true;
  }
  function renderCalendar(animate) {
    var list = $("#calendar-list");
    list.innerHTML = "";
    var ms = T.matches.filter(function (m) { return m.phase === "girone" && m.when && m.when.iso; })
                      .filter(matchPassesFilter).sort(byIso);
    $("#cal-count").textContent = ms.length + (ms.length === 1 ? " partita" : " partite");
    if (!ms.length) {
      list.appendChild(el("div", "empty-note", "Nessuna partita con questi filtri."));
      return;
    }
    var anim = animate && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var curKey = null, group = null, gi = 0;
    ms.forEach(function (m) {
      var k = dayKey(m);
      if (k !== curKey) {
        curKey = k;
        group = el("div", "daygroup");
        group.setAttribute("data-date", m.when.iso ? m.when.iso.slice(0, 10) : "");
        if (anim) { group.style.setProperty("--i", gi++); group.classList.add("is-enter"); }
        var head = el("div", "daygroup__date");
        head.innerHTML = '<span class="num">' + m.when.day + "</span><span>" +
          esc(cap(m.when.weekday) + " " + m.when.day + " " + m.when.monthName) + "</span>";
        group.appendChild(head);
        list.appendChild(group);
      }
      group.appendChild(matchRow(m, { showDate: false }));
    });
  }

  /* ---- CLASSIFICHE ----------------------------------------------------- */
  function renderStandings() {
    var grid = $("#standings-grid");
    grid.innerHTML = "";
    var full = fullStandings;
    grid.classList.toggle("is-full", full);
    T.groups.forEach(function (g) {
      var rows = T.standings[g.letter] || [];
      var anyPlayed = rows.some(function (r) { return r.played > 0; });
      var card = el("div", "standing");
      card.setAttribute("data-gir", g.letter);

      var head = el("div", "standing__head");
      head.innerHTML = chipHTML(g.letter, false);
      card.appendChild(head);

      var table = el("table");
      table.innerHTML =
        "<thead><tr>" +
          '<th class="c-pos" scope="col">#</th>' +
          '<th scope="col">Squadra</th>' +
          '<th class="c-num" scope="col" aria-label="Vinte su partite giocate" title="Vinte / Giocate">V/G</th>' +
          (full ?
            '<th class="c-num" scope="col" aria-label="Punti fatti" title="Punti fatti">PF</th>' +
            '<th class="c-num" scope="col" aria-label="Punti subiti" title="Punti subiti">PS</th>' : "") +
          '<th class="c-num" scope="col" aria-label="Differenza punti" title="Differenza punti">Diff</th>' +
        "</tr></thead>";
      var tb = el("tbody");
      rows.forEach(function (r, i) {
        var tr = el("tr");
        if (anyPlayed && i < 2) tr.className = "is-qualified";
        tr.innerHTML =
          '<td class="c-pos"><span class="pos-badge">' + r.pos + "</span></td>" +
          '<td class="team">' + esc(r.team) + "</td>" +
          '<td class="c-num">' + r.won + "/" + r.played + "</td>" +
          (full ?
            '<td class="c-num">' + r.pf + "</td>" +
            '<td class="c-num">' + r.pa + "</td>" : "") +
          '<td class="c-num ' + (r.diff >= 0 ? "diff--pos" : "diff--neg") + '">' + signed(r.diff) + "</td>";
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      card.appendChild(table);
      grid.appendChild(card);
    });
  }
  function applyStandingsFull() {
    var btn = $("#standings-full");
    if (btn) btn.setAttribute("aria-pressed", String(fullStandings));
    var legend = $(".standings-legend");
    if (legend) legend.classList.toggle("is-full", fullStandings);
    renderStandings();
  }
  function buildStandingsToggle() {
    fullStandings = lsGet(FULL_KEY) === "1";
    var btn = $("#standings-full");
    if (btn) btn.addEventListener("click", function () {
      fullStandings = !fullStandings;
      lsSet(FULL_KEY, fullStandings ? "1" : "");
      applyStandingsFull();
    });
    applyStandingsFull();
  }

  /* ---- TABELLONE ------------------------------------------------------- */
  // Orario compatto per il tabellone: "Mar 30/06 20:30" (giorno settimana a 3 lettere).
  function whenShort(w) {
    if (!w || !w.time) return null;
    var wd = w.weekday ? cap(w.weekday.slice(0, 3)) : "";
    var dd = ("0" + w.day).slice(-2), mm = ("0" + w.month).slice(-2);
    return (wd ? wd + " " : "") + dd + "/" + mm + " " + w.time;
  }
  function buildTie(m) {
    var tie = el("div", "tie" + (m.phase === "finale" ? " tie--final" : ""));
    tie.setAttribute("data-phase", m.phase);
    tie.appendChild(slot(m.team1));
    tie.appendChild(slot(m.team2));
    // Orario "Mar 30/06 20:30" dal JSON; placeholder dove la fase non e' ancora
    // calendarizzata, cosi' testiamo l'ingombro nel tabellone.
    tie.appendChild(el("div", "tie__when", esc(whenShort(m.when) || "Mar 30/06 20:30")));
    return tie;
  }
  function renderBracket() {
    var box = $("#bracket");
    box.innerHTML = "";
    // Albero principale: la finale e' la sola della sua colonna, quindi resta
    // centrata tra i due semifinali (i connettori convergono correttamente).
    var phases = [
      ["ottavi", "Ottavi"],
      ["quarti", "Quarti"],
      ["semifinali", "Semifinali"],
      ["finale", "Finale"]
    ];
    phases.forEach(function (p) {
      var ms = T.matches.filter(function (m) { return m.phase === p[0]; });
      if (!ms.length) return;
      var isFinals = p[0] === "finale";
      var col = el("div", "round" + (isFinals ? " round--finals" : ""));
      col.appendChild(el("div", "round__title", p[1]));
      var body = el("div", "round__body");
      ms.forEach(function (m) { body.appendChild(buildTie(m)); });
      // Finale 3°/4° posto: nella stessa colonna, subito sotto la finale.
      if (isFinals) {
        T.matches.filter(function (m) { return m.phase === "finale3"; }).forEach(function (m) {
          var third = el("div", "tie-third");
          third.appendChild(el("div", "tie__cap", "3°/4° posto"));
          third.appendChild(buildTie(m));
          body.appendChild(third);
        });
      }
      col.appendChild(body);
      box.appendChild(col);
    });
  }
  function slot(team, seedLabel) {
    var s = el("div", "tie__slot");
    var nm = el("span", "tie__name" + (team ? "" : " tie__name--tbd"));
    nm.textContent = team || "Da definire";
    s.appendChild(nm);
    if (seedLabel) s.appendChild(el("span", "tie__seed", esc(seedLabel)));
    return s;
  }
  function bracketTies(box, phase) {
    return [].slice.call(box.querySelectorAll('.tie[data-phase="' + phase + '"]'));
  }
  // Linee di collegamento del tabellone: overlay SVG calcolato dalle posizioni
  // reali dei tie. Va (ri)disegnato quando la vista e' visibile e al resize.
  function drawBracketConnectors() {
    var box = $("#bracket"); if (!box) return;
    var ns = "http://www.w3.org/2000/svg";
    var svg = box.querySelector(".bracket__links");
    var brect = box.getBoundingClientRect();
    var ott = bracketTies(box, "ottavi"), quar = bracketTies(box, "quarti"),
        semi = bracketTies(box, "semifinali"), fin = bracketTies(box, "finale");
    // vista nascosta o non ancora misurabile -> svuota e esci
    if (!brect.width || !ott.length) { if (svg) svg.innerHTML = ""; return; }
    if (!svg) {
      svg = document.createElementNS(ns, "svg");
      svg.setAttribute("class", "bracket__links");
      svg.setAttribute("aria-hidden", "true");
      box.insertBefore(svg, box.firstChild);
    }
    var W = box.scrollWidth, H = box.scrollHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    function rel(el) {
      var r = el.getBoundingClientRect();
      return { r: r.right - brect.left, l: r.left - brect.left, cy: r.top - brect.top + r.height / 2 };
    }
    var pairs = [];
    function link(children, parents) {
      children.forEach(function (c, i) { var p = parents[Math.floor(i / 2)]; if (p) pairs.push([c, p]); });
    }
    link(ott, quar);
    link(quar, semi);
    if (fin[0]) semi.forEach(function (s) { pairs.push([s, fin[0]]); }); // esclude la finale 3°/4°
    pairs.forEach(function (pr) {
      var c = rel(pr[0]), p = rel(pr[1]), midX = (c.r + p.l) / 2;
      var path = document.createElementNS(ns, "path");
      path.setAttribute("class", "bracket__link");
      path.setAttribute("d", "M" + c.r + " " + c.cy + " H" + midX + " V" + p.cy + " H" + p.l);
      svg.appendChild(path);
    });
  }

  /* ---- Navigazione tabellone (mobile): chip round + snap + pan verticale --- */
  function isMobileBracket() { return window.matchMedia("(max-width: 760px)").matches; }
  function bracketRoundEls() { return [].slice.call($("#bracket").querySelectorAll(".round")); }
  function offsetTopWithin(el, ancestor) {
    var y = 0;
    while (el && el !== ancestor) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }
  function buildRoundChips() {
    var bar = $("#bracket-rounds"); if (!bar) return;
    bar.innerHTML = "";
    bracketRoundEls().forEach(function (col, i) {
      var t = col.querySelector(".round__title");
      var chip = el("button", "bracket-round-chip");
      chip.type = "button";
      chip.setAttribute("role", "tab");
      chip.setAttribute("aria-selected", i === 0 ? "true" : "false");
      chip.textContent = t ? t.textContent : "R" + (i + 1);
      chip.addEventListener("click", function () { goToRound(i, true); });
      bar.appendChild(chip);
    });
  }
  function setActiveChip(i) {
    var bar = $("#bracket-rounds"); if (!bar) return;
    [].forEach.call(bar.children, function (c, idx) {
      c.setAttribute("aria-selected", idx === i ? "true" : "false");
    });
  }
  var _round = 0;
  function prefersReduce() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function panTopFor(i) {
    var box = $("#bracket"), sc = $(".bracket-scroll"), col = bracketRoundEls()[i];
    if (!box || !sc || !col || !isMobileBracket()) return 0;
    var first = col.querySelector(".round__body .tie"); if (!first) return 0;
    var max = Math.max(0, box.scrollHeight - sc.clientHeight);
    // porta il primo tie del round verso il top, coerente per tutti i round
    // (finale inclusa: sotto compare la 3°/4° posto).
    return Math.min(Math.max(0, offsetTopWithin(first, box) - 10), max);
  }
  // Paginazione discreta (mobile): l'albero e' traslato in orizzontale per
  // centrare il round attivo. Lo scroll orizzontale nativo e' disattivato; lo
  // swipe sposta di UN solo round per volta. Con la translateX si centra anche
  // la Finale (nessun limite di fine-scroll). Lo scroll verticale resta nativo.
  function positionBracket(i, smooth) {
    var box = $("#bracket"), sc = $(".bracket-scroll"), col = bracketRoundEls()[i];
    if (!box || !sc || !col) return;
    if (!isMobileBracket()) { box.style.transform = ""; return; } // desktop: albero intero
    if (!smooth) box.style.transition = "none";
    var tx = Math.round(sc.clientWidth / 2 - (col.offsetLeft + col.offsetWidth / 2));
    box.style.transform = "translateX(" + tx + "px)";
    if (!smooth) { void box.offsetWidth; box.style.transition = ""; } // reflow, poi ripristina la transizione
    sc.scrollTo({ top: panTopFor(i), behavior: (smooth && !prefersReduce()) ? "smooth" : "auto" });
  }
  function goToRound(i, smooth) {
    var n = bracketRoundEls().length; if (!n) return;
    _round = Math.max(0, Math.min(n - 1, i));
    setActiveChip(_round);
    positionBracket(_round, smooth);
  }
  function setupBracketSwipe(sc) {
    if (sc._swipeWired) return; sc._swipeWired = true;
    var x0 = 0, y0 = 0, lock = null, on = false;
    sc.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { on = false; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; lock = null; on = true;
    }, { passive: true });
    sc.addEventListener("touchmove", function (e) {
      if (!on || lock) return;
      var dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }, { passive: true });
    sc.addEventListener("touchend", function (e) {
      if (!on) return; on = false;
      if (lock !== "x" || !isMobileBracket()) return;
      var t = e.changedTouches && e.changedTouches[0]; if (!t) return;
      var dx = t.clientX - x0;
      if (Math.abs(dx) > 40) goToRound(_round + (dx < 0 ? 1 : -1), true); // un solo round per swipe
    }, { passive: true });
  }
  function setupBracketScroll() {
    var sc = $(".bracket-scroll"); if (!sc) return;
    buildRoundChips();
    setupBracketSwipe(sc);
    if (isMobileBracket()) { goToRound(Math.min(_round, bracketRoundEls().length - 1), false); }
    else { $("#bracket").style.transform = ""; sc.scrollTop = 0; }
  }

  /* ---- LA MIA SQUADRA -------------------------------------------------- */
  function teamStanding(t) {
    var keys = Object.keys(T.standings);
    for (var i = 0; i < keys.length; i++) {
      var rows = T.standings[keys[i]];
      for (var j = 0; j < rows.length; j++) {
        if (rows[j].team === t) return { letter: keys[i], row: rows[j] };
      }
    }
    return null;
  }
  function teamUpcomingMatches(t) {
    return T.matches.filter(function (m) {
      return m.phase === "girone" && !m.played && m.when && m.when.iso && (m.team1 === t || m.team2 === t);
    }).sort(byIso);
  }
  function teamLastMatch(t) {
    return T.matches.filter(function (m) {
      return m.played && (m.team1 === t || m.team2 === t);
    }).sort(byIso).reverse()[0] || null;
  }
  function panelCol(label, matches, emptyText) {
    var col = el("div", "myteam-card__col");
    col.appendChild(el("div", "myteam-card__label", esc(label)));
    if (matches && matches.length) {
      matches.forEach(function (m) {
        var item = el("div", "myteam-card__match");
        item.appendChild(el("div", "myteam-card__when",
          esc(cap(m.when.weekday) + " " + m.when.day + " " + m.when.monthName)));
        item.appendChild(matchRow(m));
        col.appendChild(item);
      });
    } else {
      // Riserva lo spazio della riga-data (assente qui) cosi' il riquadro vuoto
      // si allinea alla card dell'altra colonna invece di salire alla data.
      var empty = el("div", "myteam-card__match");
      var spacer = el("div", "myteam-card__when");
      spacer.setAttribute("aria-hidden", "true");
      spacer.textContent = " ";
      empty.appendChild(spacer);
      empty.appendChild(el("div", "empty-note", esc(emptyText)));
      col.appendChild(empty);
    }
    return col;
  }
  function myStandingsBlock(gir) {
    var rows = T.standings[gir] || [];
    var anyPlayed = rows.some(function (r) { return r.played > 0; });
    var wrap = el("div", "myteam-card__standings");
    wrap.setAttribute("data-gir", gir);
    wrap.appendChild(el("div", "myteam-card__label", "La mia classifica"));
    var box = el("div", "standing standing--bare");
    var table = el("table");
    table.innerHTML =
      "<thead><tr>" +
        '<th class="c-pos" scope="col">#</th>' +
        '<th scope="col">Squadra</th>' +
        '<th class="c-num" scope="col" aria-label="Vinte su partite giocate" title="Vinte / Giocate">V/G</th>' +
        '<th class="c-num" scope="col" aria-label="Differenza punti" title="Differenza punti">Diff</th>' +
      "</tr></thead>";
    var tb = el("tbody");
    rows.forEach(function (r, i) {
      var cls = [];
      if (anyPlayed && i < 2) cls.push("is-qualified");
      if (r.team === myteam) cls.push("is-me");
      var tr = el("tr", cls.join(" ") || null);
      tr.innerHTML =
        '<td class="c-pos"><span class="pos-badge">' + r.pos + "</span></td>" +
        '<td class="team">' + esc(r.team) +
          (r.team === myteam ? ' <span class="myteam-tag">tu</span>' : "") + "</td>" +
        '<td class="c-num">' + r.won + "/" + r.played + "</td>" +
        '<td class="c-num ' + (r.diff >= 0 ? "diff--pos" : "diff--neg") + '">' + signed(r.diff) + "</td>";
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    box.appendChild(table);
    wrap.appendChild(box);
    return wrap;
  }
  function renderMyTeam() {
    var panel = $("#myteam-panel"), clear = $("#myteam-clear"), label = $(".myteam__label"), sel = $("#myteam-select");
    if (sel && sel.value !== myteam) sel.value = myteam;
    if (!myteam) {
      panel.hidden = true; panel.innerHTML = "";
      if (clear) clear.hidden = true;
      if (label) label.hidden = false;
      return;
    }
    if (clear) clear.hidden = false;
    if (label) label.hidden = true;
    var st = teamStanding(myteam), gir = st ? st.letter : null;
    var card = el("div", "myteam-card");
    if (gir) card.setAttribute("data-gir", gir);
    var pos = st ? ordinal(st.row.pos) + " posto · " + st.row.won + "/" + st.row.played + " · " + signed(st.row.diff) : "";
    card.innerHTML =
      '<div class="myteam-card__head">' + (gir ? chipHTML(gir, false) : "") +
        '<div><div class="myteam-card__name">' + esc(myteam) + "</div>" +
        (pos ? '<div class="myteam-card__pos">' + esc(pos) + "</div>" : "") + "</div></div>";
    var last = teamLastMatch(myteam);
    var cols = el("div", "myteam-card__cols");
    cols.appendChild(panelCol("Prossime partite", teamUpcomingMatches(myteam), "Nessuna partita in programma."));
    cols.appendChild(panelCol("Ultimo risultato", last ? [last] : [], "Ancora nessun risultato."));
    card.appendChild(cols);
    if (SHOW_MY_STANDINGS && gir) card.appendChild(myStandingsBlock(gir));
    panel.hidden = false; panel.innerHTML = ""; panel.appendChild(card);
  }
  function ordinal(n) { return n + "º"; }
  // "La mia squadra" e' solo per il box in Home. Non tocca il filtro del
  // calendario: il Calendario resta generale (filtrabile solo se l'utente vuole).
  function setMyTeam(team) {
    myteam = team || "";
    lsSet(MYTEAM_KEY, myteam);
    renderMyTeam();
    if (myteam && !lsGet(WELCOMED_KEY)) {   // delight: solo la primissima volta
      lsSet(WELCOMED_KEY, "1");
      celebrateMyTeam(myteam);
    }
  }

  /* ---- delight: prima scelta della squadra ---------------------------- */
  var WELCOMED_KEY = "zibello.welcomed";
  function teamColor(team) {
    var st = teamStanding(team);
    if (!st) return "#ff3131";
    var g = T.groups.filter(function (x) { return x.letter === st.letter; })[0];
    return g ? g.color : "#ff3131";
  }
  function isBright(hex) {
    var c = String(hex).replace("#", "");
    if (c.length < 6) return true;
    var r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.18;  // troppo scuro -> solo fuoco
  }
  // "Braci vive": la card si accende di un anello di braci che ruota,
  // con una manciata di scintille che si alzano. Una sola volta (first-run).
  function celebrateMyTeam(team) {
    var host = $("#myteam-panel"); if (!host) return;
    var card = host.querySelector(".myteam-card"); if (!card) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var color = teamColor(team);
    var lit = isBright(color) ? color : "#ff7a2f";   // colore squadra leggibile sul fuoco
    var aura = el("div", "forge-aura" + (reduce ? " forge-aura--still" : ""));
    aura.style.setProperty("--ember-team", lit);
    host.insertBefore(aura, card);                    // dietro la card (z-index in CSS)
    aura.addEventListener("animationend", function (e) {
      if (e.animationName === "forgeAura" && aura.parentNode) aura.remove();
    });
    setTimeout(function () { if (aura.parentNode) aura.remove(); }, 3400);  // safety
    if (!reduce) emberLift(host, color);
  }
  function emberLift(host, color) {
    var canvas = el("canvas", "forge-sparks");
    host.appendChild(canvas);
    var rect = host.getBoundingClientRect();
    var W = rect.width, H = rect.height;
    if (W < 4 || H < 4) { canvas.remove(); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    var ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
    var fire = ["#ff3131", "#ff7a2f", "#ffc24a", "#ffe08a"];
    var pal = isBright(color) ? fire.concat([color]) : fire;
    var P = [], N = 34;
    for (var i = 0; i < N; i++) {
      P.push({
        x: W * (0.08 + Math.random() * 0.84), y: H * (0.22 + Math.random() * 0.55),
        vx: (Math.random() - 0.5) * 0.9, vy: -(0.8 + Math.random() * 2.1),
        r: 1 + Math.random() * 2.4, life: 0, max: 70 + Math.random() * 60,
        fl: Math.random() * 6.28, c: pal[(Math.random() * pal.length) | 0]
      });
    }
    var raf, stopped = false;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      var alive = false;
      for (var i = 0; i < P.length; i++) {
        var p = P[i]; if (p.life > p.max) continue;
        p.life++; alive = true;
        p.vy *= 0.99; p.vx *= 0.99; p.fl += 0.25;
        p.x += p.vx + Math.sin(p.fl) * 0.3; p.y += p.vy;
        var t = 1 - p.life / p.max;
        ctx.globalAlpha = Math.max(0, t * (0.65 + 0.35 * Math.sin(p.fl)));
        ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.4 + t * 0.6), 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over";
      if (alive && !stopped) raf = requestAnimationFrame(frame);
      else if (canvas.parentNode) canvas.remove();
    }
    raf = requestAnimationFrame(frame);
    setTimeout(function () { stopped = true; if (raf) cancelAnimationFrame(raf); if (canvas.parentNode) canvas.remove(); }, 2800);
  }
  function buildMyTeam() {
    var sel = $("#myteam-select"); if (!sel) return;
    sel.innerHTML = '<option value="">Scegli…</option>';
    allTeams().forEach(function (t) {
      var o = el("option"); o.value = t; o.textContent = t; sel.appendChild(o);
    });
    var saved = lsGet(MYTEAM_KEY);
    if (saved && allTeams().indexOf(saved) >= 0) myteam = saved;
    sel.addEventListener("change", function () { setMyTeam(sel.value); });
    var clear = $("#myteam-clear");
    if (clear) clear.addEventListener("click", function () { setMyTeam(""); });
    renderMyTeam();
  }

  /* ---- URL squadra + condivisione ------------------------------------- */
  // ?team=Nome nel calendario -> link diretto e condivisibile (es. WhatsApp).
  // Non tocca "La mia squadra" salvata: e' solo il filtro del calendario.
  function applyTeamParam() {
    try {
      var t = new URLSearchParams(location.search).get("team");
      if (t && allTeams().indexOf(t) >= 0) {
        filterState.team = t;
        var ft = $("#filter-team"); if (ft) ft.value = t;
      }
    } catch (e) {}
  }
  function syncTeamUrl() {
    try {
      var url = new URL(location.href);
      if (filterState.team && filterState.team !== "ALL") url.searchParams.set("team", filterState.team);
      else url.searchParams.delete("team");
      history.replaceState(null, "", url.toString());
    } catch (e) {}
  }
  function calendarShareUrl() {
    var url = new URL(location.href);
    if (filterState.team && filterState.team !== "ALL") url.searchParams.set("team", filterState.team);
    else url.searchParams.delete("team");
    url.hash = "calendario";
    return url.toString();
  }
  function shareCalendar() {
    var team = filterState.team;
    var label = (team && team !== "ALL") ? ("Calendario di " + team) : "Calendario del torneo";
    var text = label + " · Zibello Arena Bocce 2026";
    var link = calendarShareUrl();
    if (navigator.share) {
      navigator.share({ title: "Zibello Arena Bocce", text: text, url: link })
        .catch(function (err) {
          if (err && err.name === "AbortError") return;   // condivisione annullata
          waOpen(text, link);                              // qualunque altro errore -> WhatsApp
        });
      return;
    }
    waOpen(text, link);
  }
  // apre WhatsApp con un click su <a> reale: piu' affidabile di window.open
  // su mobile (niente blocco popup), e su contesti non-HTTPS dove share manca
  function waOpen(text, link) {
    var a = document.createElement("a");
    a.href = "https://wa.me/?text=" + encodeURIComponent(text + " " + link);
    a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    flashShare("Apro WhatsApp…");
  }
  function flashShare(msg) {
    var lbl = $("#filter-share-label"); if (!lbl) return;
    var prev = lbl.textContent; lbl.textContent = msg;
    setTimeout(function () { lbl.textContent = prev; }, 1800);
  }

  /* ---- Router ---------------------------------------------------------- */
  function currentView() {
    var h = (location.hash || "").replace("#", "");
    return VIEWS.indexOf(h) >= 0 ? h : "home";
  }
  function showView(name) {
    VIEWS.forEach(function (v) {
      var sec = document.getElementById("view-" + v);
      if (sec) sec.classList.toggle("is-active", v === name);
    });
    document.querySelectorAll(".nav__link, .bottomnav__link").forEach(function (a) {
      var is = a.getAttribute("href") === "#" + name;
      if (is) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    updateNavIndicators();
    updateStickyOffsets();
    // cambio vista: il calendario parte dal giorno corrente, gli altri dall'alto
    if (name === "calendario") requestAnimationFrame(updateGironeScrollHint);
    if (name === "tabellone") requestAnimationFrame(function () { drawBracketConnectors(); setupBracketScroll(); });
    if (showView._ready) {
      if (name === "calendario") jumpCalendarToday();
      else if (name === "home") jumpHomeToMyTeam();
      else window.scrollTo({ top: 0, behavior: "auto" });
    }
    document.title = (name === "home" ? "Zibello Arena Bocce 2026" :
      cap(name) + " · Zibello Arena Bocce 2026");
  }

  // altezze reali di header e filterbar -> stacking corretto delle sticky
  function updateStickyOffsets() {
    var header = document.querySelector(".site-header");
    if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
    var fb = document.querySelector(".filterbar");
    if (fb) document.documentElement.style.setProperty("--filterbar-h",
      (fb.offsetParent === null ? 0 : fb.offsetHeight) + "px");
  }

  // porta il calendario al giorno corrente (o al primo giorno futuro)
  function scrollCalendarToToday() {
    var groups = document.querySelectorAll("#calendar-list .daygroup[data-date]");
    if (!groups.length) return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var target = null;
    for (var i = 0; i < groups.length; i++) {
      var ds = groups[i].getAttribute("data-date");
      if (!ds) continue;
      if (new Date(ds + "T00:00:00").getTime() >= today.getTime()) { target = groups[i]; break; }
    }
    if (!target) target = groups[groups.length - 1]; // torneo concluso -> ultima giornata
    var header = document.querySelector(".site-header");
    var fb = document.querySelector(".filterbar");
    var offset = (header ? header.offsetHeight : 0) + (fb ? fb.offsetHeight : 0) + 18;
    var y = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y < 0 ? 0 : y, behavior: "auto" });
  }
  // scroll al giorno corrente, ricalcolato dopo il caricamento dei font
  // (altrimenti il reflow sposta la posizione e lo scroll atterra storto)
  function jumpCalendarToday() {
    requestAnimationFrame(function () {
      scrollCalendarToToday();
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scrollCalendarToToday);
      }
    });
  }

  // la Home atterra direttamente sul titolo "La mia squadra" (sotto l'header),
  // cosi' il link "Come arrivare" sopra resta nascosto dietro l'header
  function scrollHomeToMyTeam() {
    var sec = $("#myteam"); if (!sec) return;
    var anchor = sec.querySelector(".section__head") || sec;
    var header = document.querySelector(".site-header");
    var offset = (header ? header.offsetHeight : 0) + 12;
    var y = anchor.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y < 0 ? 0 : y, behavior: "auto" });
  }
  function jumpHomeToMyTeam() {
    requestAnimationFrame(function () {
      scrollHomeToMyTeam();
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scrollHomeToMyTeam);
      }
    });
  }
  function route() { showView(currentView()); }

  /* ---- Boot ------------------------------------------------------------ */
  function boot() {
    if (!T || !T.groups) {
      document.getElementById("main").innerHTML =
        '<p class="empty-note" style="margin-top:3rem">Dati del torneo non disponibili.</p>';
      return;
    }
    renderHome();
    buildFilters();
    buildMyTeam();
    applyTeamParam();
    renderCalendar();
    buildStandingsToggle();
    renderBracket();
    window.addEventListener("hashchange", route);
    window.addEventListener("resize", updateStickyOffsets);
    window.addEventListener("resize", function () { if (currentView() === "tabellone") { drawBracketConnectors(); setupBracketScroll(); } });
    // tiene --filterbar-h e --header-h sempre allineati all'altezza reale
    // (cambi di wrapping, breakpoint, caricamento font, mostra/nascondi vista)
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { updateStickyOffsets(); });
      [".site-header", ".filterbar"].forEach(function (sel) {
        var elm = document.querySelector(sel);
        if (elm) ro.observe(elm);
      });
    }
    route();                 // posiziona l'indicatore nav (prima di is-live: niente slide al caricamento)
    updateStickyOffsets();
    requestAnimationFrame(function () {
      document.querySelectorAll(".nav__indicator, .bottomnav__indicator").forEach(function (el2) { el2.classList.add("is-live"); });
    });
    window.addEventListener("resize", updateNavIndicators);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateNavIndicators);
    if (currentView() === "calendario") jumpCalendarToday();
    else if (currentView() === "home") jumpHomeToMyTeam();
    showView._ready = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
