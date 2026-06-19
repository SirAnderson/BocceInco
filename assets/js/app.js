/* =========================================================================
   Zibello Arena Bocce — rendering dei dati del torneo (vanilla JS)
   I dati arrivano da data/tournament.js (window.TOURNAMENT).
   ========================================================================= */
(function () {
  "use strict";

  var T = window.TOURNAMENT;
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
    var played = T.matches.filter(function (m) { return m.played; });
    var upcoming = T.matches.filter(function (m) { return !m.played && m.when && m.when.iso; }).sort(byIso);
    var lastResults = played.slice().sort(byIso).reverse();

    // stats
    var stats = [
      [T.meta.totalTeams, "Squadre"],
      [T.meta.totalGroups, "Gironi"],
      [T.meta.playedMatches, "Giocate"],
      [Math.max(0, T.meta.groupMatches - T.meta.playedMatches), "Da giocare"]
    ];
    var sw = $("#hero-stats"); sw.innerHTML = "";
    stats.forEach(function (s) {
      var c = el("div", "stat");
      c.innerHTML = '<div class="stat__num">' + s[0] + '</div><div class="stat__label">' + s[1] + "</div>";
      sw.appendChild(c);
    });

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
        '<div class="standing__head" style="padding:var(--sp-3)">' + chipHTML(g.letter, true) + "</div>" +
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
    var teams = [];
    T.groups.forEach(function (g) { g.teams.forEach(function (t) { teams.push(t); }); });
    teams.sort(function (a, b) { return a.localeCompare(b, "it"); });
    teams.forEach(function (t) {
      var o = el("option"); o.value = t; o.textContent = t; sel.appendChild(o);
    });
    sel.addEventListener("change", function () { filterState.team = sel.value; renderCalendar(); });
    // todo toggle
    var todo = $("#filter-todo");
    todo.addEventListener("click", function () {
      filterState.todo = !filterState.todo;
      todo.setAttribute("aria-pressed", String(filterState.todo));
      renderCalendar();
    });
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
    renderCalendar();
  }
  function matchPassesFilter(m) {
    if (filterState.todo && m.played) return false;
    if (filterState.gir !== "ALL") { if (m.group !== filterState.gir) return false; }
    if (filterState.team !== "ALL") {
      if (m.team1 !== filterState.team && m.team2 !== filterState.team) return false;
    }
    return true;
  }
  function renderCalendar() {
    var list = $("#calendar-list");
    list.innerHTML = "";
    var ms = T.matches.filter(function (m) { return m.when && m.when.iso; })
                      .filter(matchPassesFilter).sort(byIso);
    $("#cal-count").textContent = ms.length + (ms.length === 1 ? " partita" : " partite");
    if (!ms.length) {
      list.appendChild(el("div", "empty-note", "Nessuna partita con questi filtri."));
      return;
    }
    var curKey = null, group = null;
    ms.forEach(function (m) {
      var k = dayKey(m);
      if (k !== curKey) {
        curKey = k;
        group = el("div", "daygroup");
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
          '<th class="c-num" scope="col" title="Vinte / Giocate">V/G</th>' +
          '<th class="c-num" scope="col" title="Differenza punti">Diff</th>' +
        "</tr></thead>";
      var tb = el("tbody");
      rows.forEach(function (r, i) {
        var tr = el("tr");
        if (anyPlayed && i < 2) tr.className = "is-qualified";
        tr.innerHTML =
          '<td class="c-pos"><span class="pos-badge">' + r.pos + "</span></td>" +
          '<td class="team">' + esc(r.team) + "</td>" +
          '<td class="c-num">' + r.won + "/" + r.played + "</td>" +
          '<td class="c-num ' + (r.diff >= 0 ? "diff--pos" : "diff--neg") + '">' + signed(r.diff) + "</td>";
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      card.appendChild(table);
      grid.appendChild(card);
    });
  }

  /* ---- TABELLONE ------------------------------------------------------- */
  function renderBracket() {
    var box = $("#bracket");
    box.innerHTML = "";
    var phases = [
      ["ottavi", "Ottavi"],
      ["quarti", "Quarti"],
      ["semifinali", "Semifinali"],
      ["finale", "Finali"]
    ];
    phases.forEach(function (p) {
      var key = p[0];
      var ms = T.matches.filter(function (m) {
        return key === "finale" ? (m.phase === "finale" || m.phase === "finale3") : m.phase === key;
      });
      if (!ms.length) return;
      var col = el("div", "round");
      col.appendChild(el("div", "round__title", p[1]));
      ms.forEach(function (m, i) {
        var isFinal = m.phase === "finale";
        var tie = el("div", "tie" + (isFinal ? " tie--final" : ""));
        var label = m.phase === "finale" ? "1° / 2° posto"
                  : m.phase === "finale3" ? "3° / 4° posto"
                  : (KO_SHORT[m.phaseLabel] || p[1]) + " " + (i + 1);
        tie.appendChild(slot(m.team1, label));
        tie.appendChild(slot(m.team2, ""));
        col.appendChild(tie);
      });
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
    document.querySelectorAll(".nav__link").forEach(function (a) {
      var is = a.getAttribute("href") === "#" + name;
      if (is) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    // scroll to top of main on view change (not on first load)
    if (showView._ready) window.scrollTo({ top: 0, behavior: "auto" });
    document.title = (name === "home" ? "Zibello Arena Bocce 2026" :
      cap(name) + " · Zibello Arena Bocce 2026");
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
    renderCalendar();
    renderStandings();
    renderBracket();
    window.addEventListener("hashchange", route);
    route();
    showView._ready = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
