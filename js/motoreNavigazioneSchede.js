(function () {
  "use strict";

  // --- Stili minimi delle frecce (sovrascrivibili in style.css) ---
  const style = document.createElement("style");
  style.textContent = `
    .nav-arrow {
      cursor: pointer;
      user-select: none;
      display: inline-block;
      margin: 0 0.4em;
      transition: opacity 0.2s, transform 0.1s;
    }
    .nav-arrow:hover { transform: scale(1.2); }
    .nav-arrow.nav-loading { opacity: 0.4; cursor: progress; }
    .nav-arrow.nav-disabled { opacity: 0.2; cursor: default; pointer-events: none; }
  `;
  document.head.appendChild(style);

  // Estrae il numero dal nome del file: ".../3funzioni/7.html" -> 7
  function numeroCorrente() {
    const path = window.location.pathname;
    const file = path.substring(path.lastIndexOf("/") + 1); // "7.html"
    const nome = file.replace(/\.html?$/i, "");             // "7"
    const n = parseInt(nome, 10);
    return Number.isInteger(n) ? n : null;
  }

  // Richiesta HEAD silenziosa: true se 200-299, false se 404 o errore di rete
  async function esisteFile(url) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const n = numeroCorrente();
    const prev = document.getElementById("nav-prev");
    const next = document.getElementById("nav-next");
    const numSpan = document.getElementById("scheda-num");

    if (n === null) return; // nome file non numerico: non fa nulla

    // Titolo "Scheda n"
    if (numSpan) numSpan.textContent = n;
    document.title = "Scheda " + n;

    // --- INDIETRO: se siamo alla scheda 1, disabilitato ---
    if (prev) {
      if (n <= 1) {
        prev.classList.add("nav-disabled");
      } else {
        prev.addEventListener("click", function () {
          window.location.href = (n - 1) + ".html";
        });
      }
    }

    // --- AVANTI: controllo predittivo sul file successivo ---
    if (next) {
      const urlSucc = (n + 1) + ".html";
      next.classList.add("nav-loading"); // sta "sbirciando" in background

      esisteFile(urlSucc).then(function (esiste) {
        next.classList.remove("nav-loading");
        if (esiste) {
          // Stato 200 -> il pulsante reindirizza al click
          next.addEventListener("click", function () {
            window.location.href = urlSucc;
          });
        } else {
          // Stato 404 -> ultima scheda disponibile: blocca e ingrigisce
          next.classList.add("nav-disabled");
        }
      });
    }
  });
})();

(function () {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    #topic-nav {
      display: flex;
      overflow-x: auto;
      white-space: nowrap;
      position: relative;
      font-size: 0.95em;
      margin: 0.2em 0 0.7em;
      /* Sfumatura verso i bordi: opaco al centro, trasparente ai lati */
      -webkit-mask-image: linear-gradient(to right,
        transparent 0%, #000 30%, #000 70%, transparent 100%);
      mask-image: linear-gradient(to right,
        transparent 0%, #000 30%, #000 70%, transparent 100%);
      /* Nasconde la scrollbar (resta scorribile con trackpad/touch/drag) */
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    #topic-nav::-webkit-scrollbar { display: none; }

    #topic-nav .spacer { flex: 0 0 50%; }

    #topic-nav a,
    #topic-nav .current {
      flex: 0 0 auto;
      padding: 0 1.1em;
      color: inherit;
      text-decoration: none;
    }
    #topic-nav .current { font-weight: bold; }   /* identifica "sei qui" */
  `;
  document.head.appendChild(style);

  function cartellaCorrente() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : null;
  }

  function centra(nav) {
    const cur = nav.querySelector(".current");
    if (!cur) return;
    const navRect = nav.getBoundingClientRect();
    const curRect = cur.getBoundingClientRect();
    const delta = (curRect.left + curRect.width / 2) -
                  (navRect.left + navRect.width / 2);
    nav.scrollLeft += delta;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!Array.isArray(window.ARGOMENTI)) return;

    const corrente = cartellaCorrente();
    const nav = document.createElement("nav");
    nav.id = "topic-nav";

    // Spaziatore iniziale: permette di centrare anche il primo argomento
    const sx = document.createElement("span");
    sx.className = "spacer";
    nav.appendChild(sx);

    window.ARGOMENTI.forEach(function (arg) {
      if (arg.cartella === corrente) {
        const cur = document.createElement("span");
        cur.className = "current";
        cur.textContent = arg.titolo;
        nav.appendChild(cur);
      } else {
        const a = document.createElement("a");
        a.href = "../" + arg.cartella + "/1.html";
        a.textContent = arg.titolo;
        nav.appendChild(a);
      }
    });

    // Spaziatore finale: permette di centrare anche l'ultimo argomento
    const dx = document.createElement("span");
    dx.className = "spacer";
    nav.appendChild(dx);

    const h1 = document.querySelector("h1");
    if (h1) {
      nav.style.color = getComputedStyle(h1).color; // eredita il rosso del tema
      h1.parentNode.insertBefore(nav, h1);
    } else {
      document.body.insertBefore(nav, document.body.firstChild);
    }

    centra(nav);
    window.addEventListener("resize", function () { centra(nav); });
  });
})();