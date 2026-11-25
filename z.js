/* Ten & Done – Besucherzähler ohne Cookies (Andreas 25.11.2026). Speichert bei Besuchern nichts auf dem Gerät.
   Meldet an unser eigenes Programm auf dem Webspace von NRW to go (https://nrwtogo.de/tdz.php, gleicher Betreiber):
   Seitenaufruf mit Herkunftsseite, sichtbare Zeit auf der Seite, Tipp auf einen Store-Knopf.
   Gesendet wird nur location.pathname – nie Suchteil oder Hash (auf /l/ steht die Einkaufsliste im Hash).
   Ausnahme nur auf Wunsch (eigene Aufrufe nicht zählen): tenanddone.app/?nicht-zaehlen setzt im Browser den Merker
   „td-nicht-zaehlen“ (localStorage, kein Cookie), danach sendet dieses Gerät nichts mehr. Rückgängig: ?wieder-zaehlen.
   Einbau: <script src="/z.js" defer></script> vor </body> jeder Seite. Lokal (Vorschau, Datei) zählt es nichts.
   Quelle des Empfängers: tool/cockpit/zaehler/server/tdz.php */
(function () {
  "use strict";
  var ZIEL = "https://nrwtogo.de/tdz.php", d = document, nav = navigator;
  if (nav.webdriver || /bot|crawl|spider|headless|lighthouse/i.test(nav.userAgent || "")) return;
  if (!/^(www\.)?tenanddone\.app$/.test(location.hostname)) return;
  try {
    var q = location.search, MERK = "td-nicht-zaehlen", neu = "";
    if (/[?&]nicht-zaehlen(=|&|$)/.test(q)) { localStorage.setItem(MERK, "1"); neu = "Dieses Gerät wird ab jetzt nicht mehr gezählt."; }
    if (/[?&]wieder-zaehlen(=|&|$)/.test(q)) { localStorage.removeItem(MERK); neu = "Dieses Gerät wird wieder gezählt."; }
    if (neu) {
      try { history.replaceState(history.state, "", location.pathname + location.hash); } catch (e) {}
      setTimeout(function () { alert("Ten & Done: " + neu); }, 300);
    }
    if (localStorage.getItem(MERK) === "1") return;
  } catch (e) {}

  function senden(o) {
    o.p = location.pathname;   // nur der Pfad
    o.l = (d.documentElement.lang || "").slice(0, 5);
    var text = JSON.stringify(o);
    try {
      if (nav.sendBeacon && nav.sendBeacon(ZIEL, new Blob([text], {type: "text/plain"}))) return;
    } catch (e) {}
    try { fetch(ZIEL, {method: "POST", body: text, keepalive: true, mode: "cors", credentials: "omit", headers: {"Content-Type": "text/plain"}}); } catch (e) {}
  }

  senden({t: "v", r: d.referrer || "", g: (window.innerWidth || 1024) < 768 ? "m" : "d"});

  // sichtbare Zeit: zählt nur, solange die Seite im Vordergrund ist
  var summe = 0, seit = d.visibilityState === "visible" ? Date.now() : 0;
  function anhalten() { if (seit) { summe += Date.now() - seit; seit = 0; } }
  function melden() { var s = Math.round(summe / 1000); summe = 0; if (s >= 1) senden({t: "d", s: s}); }
  d.addEventListener("visibilitychange", function () {
    if (d.visibilityState === "hidden") { anhalten(); melden(); } else { seit = Date.now(); }
  });
  window.addEventListener("pagehide", function () { anhalten(); melden(); });

  // Tipp auf einen Store-Knopf (Google Play, App Store, TestFlight), je Art einmal je Seitenaufruf
  var gemeldet = {};
  d.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.hostname || "", art = h === "play.google.com" ? "play" : h === "apps.apple.com" ? "apple" : h === "testflight.apple.com" ? "testflight" : "";
    if (!art || gemeldet[art]) return;
    gemeldet[art] = 1;
    senden({t: "s", o: art});
  }, true);
})();
