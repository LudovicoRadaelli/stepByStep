/* =========================================================================
 * flashcardWidget.js
 * -------------------------------------------------------------------------
 * Widget di ripasso a flashcard per le schede di matematica.
 *
 * USO NELLA SCHEDA
 *   <div class="fcq" data-mazzo="mazzi/funzioni.json"></div>
 *   <script src="../../js/flashcardWidget.js"></script>
 *
 * - "data-mazzo" e' il percorso del file JSON del mazzo (relativo alla pagina).
 *   Cambiando questo attributo si possono usare mazzi diversi, anche piu' di
 *   uno nella stessa scheda.
 *
 * FORMATO DEL MAZZO (JSON)
 *   {
 *     "titolo": "Funzioni",
 *     "carte": [
 *       { "domanda": "testo o LaTeX \\(...\\)", "risposta": "testo o LaTeX" },
 *       ...
 *     ]
 *   }
 *   Sono accettate anche le chiavi in inglese (title/cards, front/back) e un
 *   array "puro" di carte. Il contenuto puo' contenere HTML e formule MathJax
 *   scritte con \\( \\) e \\[ \\] (come nel resto del sito).
 *
 * COMPORTAMENTO
 * - Il mazzo viene mescolato con l'algoritmo di Fisher-Yates prima di iniziare.
 * - Una carta sbagliata viene rimescolata tra quelle ancora da svolgere.
 * - Contatore in alto a sinistra:  [rosso = da ripetere] [blu = ancora da ripassare]
 * - Al termine compare una schermata di rinforzo positivo.
 *
 * Lo stile CSS viene iniettato da questo file: non serve caricare un .css.
 * ========================================================================= */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 1. STILE (iniettato una sola volta)                                 *
   * ------------------------------------------------------------------ */
  var STYLE_ID = "fcq-style";
  if (!document.getElementById(STYLE_ID)) {
    var css = `
.fcq{
  --fcq-ink:#1f2637;          /* testo principale            */
  --fcq-muted:#6b7385;        /* testo secondario            */
  --fcq-line:#e4e7ee;         /* linee sottili               */
  --fcq-card:#ffffff;         /* fondo della carta           */
  --fcq-panel:#f5f6fa;        /* fondo del widget            */
  --fcq-blu:#4285F4;          /* carte ancora da ripassare   */
  --fcq-rosso:#DB4437;        /* carte da ripetere           */
  --fcq-verde:#0F9D58;        /* risposta corretta           */
  --fcq-accent:#3a3f73;       /* accento (indaco)            */

  box-sizing:border-box;
  max-width:640px;
  margin:1.2rem auto;
  padding:1rem 1rem 1.15rem;
  background:var(--fcq-panel);
  border:1px solid var(--fcq-line);
  border-radius:16px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color:var(--fcq-ink);
  -webkit-font-smoothing:antialiased;
}
.fcq *{box-sizing:border-box;}

/* --- barra superiore: titolo a sinistra, contatore a destra --- */
.fcq-top{
  display:flex;align-items:baseline;justify-content:space-between;
  gap:.75rem;margin-bottom:.9rem;
}
.fcq-title{
  font-size:.82rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  color:var(--fcq-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.fcq-count{
  flex:0 0 auto;margin-left:auto;
  font-weight:800;font-size:.95rem;font-variant-numeric:tabular-nums;line-height:1;
  letter-spacing:.01em;white-space:nowrap;
}
.fcq-num.rosso{color:var(--fcq-rosso);}
.fcq-num.blu{color:var(--fcq-blu);margin-left:.5rem;}
.fcq-num[data-zero="1"]{opacity:.35;}

/* --- carta con flip in 3D --- */
/* Le due facce sono figlie dirette della carta e posizionate in assoluto:
   cosi' il contesto 3D non viene "appiattito" e backface-visibility puo'
   nascondere il retro (niente testo specchiato). L'altezza della carta viene
   calcolata via JS in base alla faccia piu' alta (funzione _sizeCard). */
.fcq-stage{perspective:1400px;}
.fcq-card{
  position:relative;width:100%;min-height:180px;cursor:pointer;
  transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.7,.2,1);
  outline:none;
}
.fcq-card.flip{transform:rotateY(180deg);}
.fcq-card:focus-visible{outline:none;}
.fcq-card:focus-visible .fcq-face{box-shadow:0 0 0 3px rgba(58,63,115,.35),0 10px 24px rgba(31,38,55,.10);}
.fcq-face{
  position:absolute;top:0;left:0;right:0;
  -webkit-backface-visibility:hidden;backface-visibility:hidden;
  display:flex;flex-direction:column;justify-content:center;
  min-height:180px;padding:1.5rem 1.4rem;
  background:var(--fcq-card);border:1px solid var(--fcq-line);border-radius:14px;
  box-shadow:0 10px 24px rgba(31,38,55,.08);
}
.fcq-back{transform:rotateY(180deg);}
.fcq-tag{
  font-size:.7rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase;
  margin-bottom:.7rem;
}
.fcq-front .fcq-tag{color:var(--fcq-accent);}
.fcq-back  .fcq-tag{color:var(--fcq-verde);}
.fcq-content{font-size:1.18rem;line-height:1.55;text-align:center;}
.fcq-content p:first-child{margin-top:0;}
.fcq-content p:last-child{margin-bottom:0;}

/* --- suggerimento sotto la carta --- */
.fcq-hint{
  text-align:center;font-size:.82rem;color:var(--fcq-muted);
  margin:.7rem 0 .1rem;min-height:1.1rem;
}
.fcq-hint kbd{
  font:inherit;font-size:.75rem;background:#fff;border:1px solid var(--fcq-line);
  border-bottom-width:2px;border-radius:5px;padding:.02rem .35rem;color:var(--fcq-ink);
}

/* --- comandi --- */
.fcq-actions{display:flex;gap:.6rem;margin-top:.85rem;}
.fcq-btn{
  flex:1;appearance:none;border:none;cursor:pointer;
  padding:.8rem 1rem;border-radius:11px;font-size:1rem;font-weight:700;
  color:#fff;transition:transform .06s ease,filter .12s ease;
}
.fcq-btn:hover{filter:brightness(1.05);}
.fcq-btn:active{transform:translateY(1px);}
.fcq-btn:focus-visible{outline:3px solid rgba(58,63,115,.4);outline-offset:2px;}
.fcq-btn.flip{background:var(--fcq-accent);}
.fcq-btn.no{background:var(--fcq-rosso);}
.fcq-btn.yes{background:var(--fcq-verde);}
.fcq-actions[data-mode="answer"] .fcq-btn.flip{display:none;}
.fcq-actions[data-mode="question"] .fcq-btn.no,
.fcq-actions[data-mode="question"] .fcq-btn.yes{display:none;}

/* --- schermata finale --- */
.fcq-done{
  text-align:center;padding:1.9rem 1.2rem;background:var(--fcq-card);
  border:1px solid var(--fcq-line);border-radius:14px;
  box-shadow:0 10px 24px rgba(31,38,55,.08);
  animation:fcq-pop .4s cubic-bezier(.2,.9,.3,1.2) both;
}
.fcq-seal{
  width:76px;height:76px;margin:0 auto .9rem;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:var(--fcq-verde);color:#fff;
  box-shadow:0 8px 20px rgba(46,158,107,.35);
}
.fcq-seal svg{width:40px;height:40px;}
.fcq-seal svg path{
  stroke-dasharray:40;stroke-dashoffset:40;animation:fcq-check .5s .18s ease forwards;
}
.fcq-done h3{margin:.2rem 0 .3rem;font-size:1.45rem;color:var(--fcq-ink);}
.fcq-done p{margin:.15rem 0;color:var(--fcq-muted);font-size:1rem;}
.fcq-done .fcq-stats{font-weight:700;color:var(--fcq-ink);margin-top:.55rem;}
.fcq-restart{
  margin-top:1.15rem;appearance:none;border:1px solid var(--fcq-accent);cursor:pointer;
  background:transparent;color:var(--fcq-accent);font-weight:700;font-size:.98rem;
  padding:.65rem 1.4rem;border-radius:10px;transition:background .12s,color .12s;
}
.fcq-restart:hover{background:var(--fcq-accent);color:#fff;}
.fcq-restart:focus-visible{outline:3px solid rgba(58,63,115,.4);outline-offset:2px;}

/* --- stato di caricamento / errore --- */
.fcq-msg{padding:1.4rem;text-align:center;color:var(--fcq-muted);font-size:.98rem;}
.fcq-msg.err{color:var(--fcq-rosso);}

@keyframes fcq-pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
@keyframes fcq-check{to{stroke-dashoffset:0}}

@media (max-width:480px){
  .fcq{padding:.85rem;}
  .fcq-content{font-size:1.06rem;}
  .fcq-face{padding:1.2rem 1rem;min-height:150px;}
}
@media (prefers-reduced-motion:reduce){
  .fcq-card{transition:none;}
  .fcq-done,.fcq-seal svg path{animation:none;stroke-dashoffset:0;}
}
`;
    var styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = css;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  /* ------------------------------------------------------------------ *
   * 2. UTILITY                                                          *
   * ------------------------------------------------------------------ */

  // Mescola l'array "in place" con l'algoritmo di Fisher-Yates.
  function fisherYates(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  // Compone le formule MathJax dentro l'elemento indicato (se MathJax c'e').
  function typeset(el) {
    if (window.MathJax && MathJax.typesetPromise) {
      if (MathJax.typesetClear) { try { MathJax.typesetClear([el]); } catch (e) {} }
      return MathJax.typesetPromise([el]).catch(function () {});
    }
    // MathJax potrebbe non essere ancora pronto: riprovo per qualche secondo.
    return new Promise(function (resolve) {
      var n = 0;
      var iv = setInterval(function () {
        n++;
        if (window.MathJax && MathJax.typesetPromise) {
          clearInterval(iv);
          MathJax.typesetPromise([el]).catch(function () {}).then(resolve);
        } else if (n > 60) {
          clearInterval(iv);
          resolve();
        }
      }, 100);
    });
  }

  // Legge una carta accettando piu' nomi di chiave (italiano/inglese).
  function readCard(c) {
    if (typeof c === "string") return { front: c, back: "" };
    return {
      front: c.domanda != null ? c.domanda : (c.front != null ? c.front : (c.q != null ? c.q : "")),
      back:  c.risposta != null ? c.risposta : (c.back != null ? c.back : (c.a != null ? c.a : ""))
    };
  }

  /* ------------------------------------------------------------------ *
   * 3. WIDGET                                                           *
   * ------------------------------------------------------------------ */
  function Flashcards(mount, url) {
    this.mount = mount;
    this.url = url;
    this.cards = [];      // carte originali (per il "ricomincia")
    this.queue = [];      // [{ card, status:'fresh'|'wrong' }, ...]
    this.fresh = 0;       // contatore blu
    this.wrong = 0;       // contatore rosso
    this.total = 0;       // numero di carte del mazzo
    this.wrongTotal = 0;  // errori totali della sessione (per la schermata finale)
    this.flipped = false;
    this.title = "";
    this._load();
  }

  Flashcards.prototype._load = function () {
    var self = this;
    this.mount.classList.add("fcq");
    this.mount.innerHTML = '<div class="fcq-msg">Carico il mazzo…</div>';

    fetch(this.url, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var rawCards = Array.isArray(data)
          ? data
          : (data.carte || data.cards || data.flashcards || []);
        self.title = data && !Array.isArray(data) ? (data.titolo || data.title || "") : "";

        self.cards = rawCards.map(readCard).filter(function (c) {
          return String(c.front).trim() !== "";
        });

        if (self.cards.length === 0) throw new Error("Il mazzo non contiene carte.");
        self._buildUI();
        self._start();
      })
      .catch(function (err) {
        self.mount.innerHTML =
          '<div class="fcq-msg err">Non riesco a caricare il mazzo «' +
          escapeHtml(self.url) + '».<br>' + escapeHtml(err.message) + "</div>";
      });
  };

  Flashcards.prototype._buildUI = function () {
    this.mount.innerHTML =
      '<div class="fcq-top">' +
        '<div class="fcq-title">' + escapeHtml(this.title) + '</div>' +
        '<div class="fcq-count" aria-label="Carte da ripetere e carte ancora da ripassare">' +
          '<span class="fcq-num rosso" data-role="wrong" title="Carte da ripetere">0</span>' +
          '<span class="fcq-num blu"   data-role="fresh" title="Carte ancora da ripassare">0</span>' +
        '</div>' +
      '</div>' +
      '<div class="fcq-view"></div>';

    this.elWrong = this.mount.querySelector('[data-role="wrong"]');
    this.elFresh = this.mount.querySelector('[data-role="fresh"]');
    this.elView  = this.mount.querySelector(".fcq-view");

    // se la larghezza cambia il testo va a capo diversamente: ricalcolo l'altezza
    var self = this;
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(function () { if (self.elCard) self._sizeCard(); });
      this._ro.observe(this.mount);
    } else if (window.addEventListener) {
      window.addEventListener("resize", function () { if (self.elCard) self._sizeCard(); });
    }
  };

  // Prepara / rimescola il mazzo e mostra la prima carta.
  Flashcards.prototype._start = function () {
    var pool = this.cards.map(function (card) {
      return { card: card, status: "fresh" };
    });
    fisherYates(pool);
    this.queue = pool;
    this.total = pool.length;
    this.fresh = pool.length;
    this.wrong = 0;
    this.wrongTotal = 0;
    this._updateCount();
    this._renderCard();
  };

  Flashcards.prototype._updateCount = function () {
    this.elWrong.textContent = this.wrong;
    this.elFresh.textContent = this.fresh;
    this.elWrong.setAttribute("data-zero", this.wrong === 0 ? "1" : "0");
    this.elFresh.setAttribute("data-zero", this.fresh === 0 ? "1" : "0");
  };

  Flashcards.prototype._renderCard = function () {
    var self = this;
    if (this.queue.length === 0) { this._renderDone(); return; }

    var item = this.queue[0];
    this.flipped = false;

    this.elView.innerHTML =
      '<div class="fcq-stage">' +
        '<div class="fcq-card" tabindex="0" role="button" aria-label="Carta: clicca per vedere la soluzione">' +
          '<div class="fcq-face fcq-front">' +
            '<div class="fcq-tag">Domanda</div>' +
            '<div class="fcq-content">' + item.card.front + '</div>' +
          '</div>' +
          '<div class="fcq-face fcq-back">' +
            '<div class="fcq-tag">Soluzione</div>' +
            '<div class="fcq-content">' + (item.card.back || "&nbsp;") + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="fcq-hint">Tocca la carta per vedere la soluzione</div>' +
      '<div class="fcq-actions" data-mode="question">' +
        '<button type="button" class="fcq-btn flip">Mostra soluzione</button>' +
        '<button type="button" class="fcq-btn no">Da ripetere</button>' +
        '<button type="button" class="fcq-btn yes">La sapevo</button>' +
      '</div>';

    this.elCard    = this.elView.querySelector(".fcq-card");
    this.elActions = this.elView.querySelector(".fcq-actions");
    this.elHint    = this.elView.querySelector(".fcq-hint");

    this.elCard.addEventListener("click", function () { self._flip(); });
    this.elView.querySelector(".fcq-btn.flip").addEventListener("click", function (e) {
      e.stopPropagation(); self._flip();
    });
    this.elView.querySelector(".fcq-btn.no").addEventListener("click", function (e) {
      e.stopPropagation(); self._answer(false);
    });
    this.elView.querySelector(".fcq-btn.yes").addEventListener("click", function (e) {
      e.stopPropagation(); self._answer(true);
    });

    // dimensiona subito (contenuto grezzo) e di nuovo dopo la composizione MathJax,
    // perche' le formule cambiano l'altezza delle facce
    this._sizeCard();
    typeset(this.elView).then(function () { self._sizeCard(); });

    // porta il focus sulla carta per la navigazione da tastiera
    try { this.elCard.focus({ preventScroll: true }); } catch (e) { this.elCard.focus(); }
  };

  // Adatta l'altezza della carta alla faccia piu' alta e allinea le due facce,
  // in modo che il contenuto resti centrato su entrambi i lati.
  Flashcards.prototype._sizeCard = function () {
    if (!this.elCard) return;
    var faces = this.elCard.querySelectorAll(".fcq-face");
    var i, h = 0;
    for (i = 0; i < faces.length; i++) faces[i].style.minHeight = "";   // torna al min di CSS
    for (i = 0; i < faces.length; i++) h = Math.max(h, faces[i].offsetHeight);
    for (i = 0; i < faces.length; i++) faces[i].style.minHeight = h + "px";
    this.elCard.style.height = h + "px";
  };

  Flashcards.prototype._flip = function () {
    if (this.flipped) return;
    this.flipped = true;
    this.elCard.classList.add("flip");
    this.elActions.setAttribute("data-mode", "answer");
    this.elHint.innerHTML = "";   // niente indicazioni: bastano i pulsanti
  };

  Flashcards.prototype._answer = function (correct) {
    if (!this.flipped) return;              // si giudica solo dopo aver visto la soluzione
    var item = this.queue.shift();

    if (correct) {
      if (item.status === "fresh") this.fresh--; else this.wrong--;
      // carta superata: non rientra in coda
    } else {
      this.wrongTotal++;
      if (item.status === "fresh") { this.fresh--; this.wrong++; item.status = "wrong"; }
      // rimescola la carta tra quelle ancora da svolgere (mai in testa se ce ne sono altre)
      var idx = this.queue.length === 0 ? 0 : 1 + Math.floor(Math.random() * this.queue.length);
      this.queue.splice(idx, 0, item);
    }

    this._updateCount();
    this._renderCard();
  };

  Flashcards.prototype._renderDone = function () {
    var self = this;
    this.elCard = null;   // non c'e' piu' una carta da ridimensionare
    var praise = this.wrongTotal === 0
      ? "Percorso netto, senza errori. Bravissimo/a!"
      : "Hai ripassato tutto il mazzo: gli errori sono il modo migliore per imparare.";

    this.elView.innerHTML =
      '<div class="fcq-done">' +
        '<div class="fcq-seal">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
               'stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>' +
        '</div>' +
        '<h3>Mazzo completato!</h3>' +
        '<p>' + praise + '</p>' +
        '<p class="fcq-stats">' + this.total + (this.total === 1 ? " carta" : " carte") +
          ' ripassate · ' + this.wrongTotal +
          (this.wrongTotal === 1 ? " errore" : " errori") + '</p>' +
        '<button type="button" class="fcq-restart">Ricomincia il mazzo</button>' +
      '</div>';

    this.elHint = null;
    this.elView.querySelector(".fcq-restart").addEventListener("click", function () {
      self._start();
    });
  };

  // Tastiera: Spazio = gira; 1 = da ripetere; 2 = la sapevo.
  Flashcards.prototype.handleKey = function (e) {
    if (!this.elActions) return;
    if (e.key === " " || e.key === "Enter") {
      if (!this.flipped) { e.preventDefault(); this._flip(); }
    } else if (this.flipped && (e.key === "1")) {
      e.preventDefault(); this._answer(false);
    } else if (this.flipped && (e.key === "2")) {
      e.preventDefault(); this._answer(true);
    }
  };

  /* ------------------------------------------------------------------ *
   * 4. HELPER + AVVIO                                                   *
   * ------------------------------------------------------------------ */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function initAll() {
    var mounts = document.querySelectorAll(".fcq[data-mazzo]:not([data-fcq-ready])");
    for (var i = 0; i < mounts.length; i++) {
      var m = mounts[i];
      m.setAttribute("data-fcq-ready", "1");
      var inst = new Flashcards(m, m.getAttribute("data-mazzo"));
      // instrada la tastiera all'istanza il cui widget ha il focus
      (function (mountEl, instance) {
        mountEl.addEventListener("keydown", function (e) { instance.handleKey(e); });
      })(m, inst);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  // esposto per eventuali inizializzazioni manuali (es. contenuti caricati dopo)
  window.FlashcardWidget = { init: initAll };
})();