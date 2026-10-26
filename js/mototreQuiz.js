/* ============================================================
   Quiz — file unico (stile + motore)
   ------------------------------------------------------------
   Basta includere QUESTO file: lo stile viene iniettato da solo.

     <script src="../../js/quiz.js" defer></script>

   Trasforma la marcatura .quiz scritta nella scheda in un
   widget interattivo:
     - una domanda per volta;
     - si può cliccare finché non si trova la risposta corretta;
     - risposta sbagliata  -> feedback (default "Non è corretta, riprova");
     - risposta corretta    -> feedback (default "Corretto!", personalizzabile)
                               e compare il pulsante "Avanti";
     - alla fine: schermata di rinforzo positivo con "Rifai il quiz";
       se le domande sono più di una, vengono mostrate anche la
       percentuale di risposte corrette al primo tentativo e la
       lista delle domande sbagliate.
       Con una sola domanda il quiz termina mostrando il feedback,
       senza pulsante "Concludi" né schermata finale.

   Marcatura da usare nelle schede:

     <div class="quiz"
          data-messaggio-finale="Testo finale facoltativo"
          data-titolo-finale="Intestazione finale facoltativa"
          data-feedback-errore="Testo facoltativo per le risposte sbagliate"
          data-no-shuffle>                     <!-- opzioni in ordine fisso -->

       <div class="quiz-domanda">
         <div class="quiz-testo">Testo della domanda, anche con \(math\)</div>
         <ul class="quiz-opzioni">
           <li>Risposta sbagliata</li>
           <li data-giusta data-feedback="Bravo!">Risposta giusta</li>
           <li>Altra risposta sbagliata</li>
         </ul>
       </div>

       <!-- ...altri blocchi .quiz-domanda... -->
     </div>

   Attributi:
     data-giusta     -> segna l'opzione corretta (obbligatorio su una <li>).
     data-feedback   -> messaggio personalizzato quando quell'opzione è scelta
                        (sull'opzione giusta è il "Corretto!" personalizzato).

   Per cambiare i colori: modifica le variabili CSS nel blocco .quiz
   qui sotto, oppure sovrascrivile nel tuo foglio di stile.
   ============================================================ */

(function () {
  "use strict";

  /* -------------------- STILE (iniettato) -------------------- */
  var CSS = `
.quiz {
  --quiz-accento:        #2f855a;
  --quiz-accento-scuro:  #276749;
  --quiz-accento-tenue:  #e7f3ec;
  --quiz-errore:         #c0392b;
  --quiz-errore-tenue:   #fbeae8;
  --quiz-inchiostro:     #1f2933;
  --quiz-muto:           #6b7280;
  --quiz-bordo:          #e2e5ea;
  --quiz-sfondo:         #ffffff;
  --quiz-sfondo-opz:     #f8fafb;
  --quiz-raggio:         14px;

  max-width: 640px;
  margin: 1.75rem 0;
  color: var(--quiz-inchiostro);
  background: var(--quiz-sfondo);
  border: 1px solid var(--quiz-bordo);
  border-radius: var(--quiz-raggio);
  box-shadow: 0 6px 24px rgba(31, 41, 51, 0.06);
  overflow: hidden;
  line-height: 1.5;
}
.quiz:not(.quiz-attivo) .quiz-domanda { display: none; }

.quiz-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.9rem 1.25rem 0.75rem;
}
.quiz-contatore {
  font-size: 0.85rem; color: var(--quiz-muto);
  white-space: nowrap; font-variant-numeric: tabular-nums;
}
.quiz-barra {
  height: 4px; margin: 0 1.25rem;
  background: var(--quiz-bordo); border-radius: 999px; overflow: hidden;
}
.quiz-barra-riempimento {
  height: 100%; width: 0;
  background: var(--quiz-accento); border-radius: 999px;
  transition: width 0.35s ease;
}

.quiz-corpo { padding: 1.1rem 1.25rem 1.35rem; }
.quiz-testo { margin: 0 0 1rem; font-size: 1.08rem; }

.quiz-opzioni {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.6rem;
}
.quiz-opzione {
  display: flex; align-items: center; gap: 0.7rem;
  width: 100%; text-align: left; font: inherit; color: inherit;
  padding: 0.75rem 0.95rem;
  background: var(--quiz-sfondo-opz);
  border: 1.5px solid var(--quiz-bordo); border-radius: 10px;
  cursor: pointer;
  transition: border-color .15s, background .15s, transform .05s;
}
.quiz-opzione:hover:not(:disabled) { border-color: var(--quiz-accento); background: #fff; }
.quiz-opzione:focus-visible { outline: 3px solid rgba(47,133,90,.35); outline-offset: 2px; }
.quiz-opzione:active:not(:disabled) { transform: translateY(1px); }
.quiz-opzione:disabled { cursor: default; }

.quiz-segno {
  flex: 0 0 auto; width: 1.6rem; height: 1.6rem;
  display: grid; place-items: center;
  border: 1.5px solid var(--quiz-bordo); border-radius: 50%;
  font-size: .8rem; font-weight: 700; color: var(--quiz-muto);
  transition: all .15s;
}
.quiz-opz-testo { flex: 1 1 auto; }

.quiz-opzione.sbagliata {
  border-color: var(--quiz-errore); background: var(--quiz-errore-tenue);
  color: var(--quiz-errore); opacity: .85;
}
.quiz-opzione.sbagliata .quiz-segno { border-color: var(--quiz-errore); color: var(--quiz-errore); }
.quiz-opzione.sbagliata .quiz-opz-testo { text-decoration: line-through; }

.quiz-opzione.corretta {
  border-color: var(--quiz-accento); background: var(--quiz-accento-tenue);
  color: var(--quiz-accento-scuro); font-weight: 600;
}
.quiz-opzione.corretta .quiz-segno {
  border-color: var(--quiz-accento); background: var(--quiz-accento); color: #fff;
}

.quiz-feedback {
  margin-top: 1rem; padding: .7rem .9rem; border-radius: 10px;
  font-size: .95rem; display: none;
}
.quiz-feedback.mostra { display: block; }
.quiz-feedback.ko { background: var(--quiz-errore-tenue); color: var(--quiz-errore); }
.quiz-feedback.ok { background: var(--quiz-accento-tenue); color: var(--quiz-accento-scuro); }

.quiz-azioni { display: flex; justify-content: flex-end; margin-top: 1rem; }
.quiz-avanti {
  font: inherit; font-weight: 600; color: #fff;
  background: var(--quiz-accento); border: none; border-radius: 10px;
  padding: .6rem 1.25rem; cursor: pointer;
  display: inline-flex; align-items: center; gap: .4rem;
  transition: background .15s, transform .05s;
}
.quiz-avanti:hover { background: var(--quiz-accento-scuro); }
.quiz-avanti:active { transform: translateY(1px); }
.quiz-avanti:focus-visible { outline: 3px solid rgba(47,133,90,.35); outline-offset: 2px; }

.quiz-fine { text-align: center; padding: 2.25rem 1.5rem 2.5rem; }
.quiz-spunta { width: 68px; height: 68px; margin: 0 auto 1rem; display: block; }
.quiz-spunta circle { fill: var(--quiz-accento-tenue); }
.quiz-spunta path {
  fill: none; stroke: var(--quiz-accento);
  stroke-width: 6; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 48; stroke-dashoffset: 48;
  animation: quiz-traccia .5s .15s ease forwards;
}
@keyframes quiz-traccia { to { stroke-dashoffset: 0; } }

.quiz-fine-titolo { margin: 0 0 .35rem; font-size: 1.35rem; font-weight: 700; }
.quiz-fine-testo { margin: 0 auto 1.4rem; max-width: 40ch; color: var(--quiz-muto); }

.quiz-stat {
  margin: 0 auto 1.4rem; max-width: 42ch;
  background: var(--quiz-sfondo-opz);
  border: 1px solid var(--quiz-bordo); border-radius: 10px;
  padding: .8rem 1rem; font-size: .95rem;
}
.quiz-stat-perc { font-weight: 700; color: var(--quiz-accento-scuro); }
.quiz-stat-errate { margin: .45rem 0 0; color: var(--quiz-muto); }
.quiz-stat-errate b { color: var(--quiz-inchiostro); font-weight: 600; }

.quiz-ricomincia {
  font: inherit; font-weight: 600; color: var(--quiz-accento-scuro);
  background: #fff; border: 1.5px solid var(--quiz-accento); border-radius: 10px;
  padding: .6rem 1.25rem; cursor: pointer; transition: background .15s;
}
.quiz-ricomincia:hover { background: var(--quiz-accento-tenue); }
.quiz-ricomincia:focus-visible { outline: 3px solid rgba(47,133,90,.35); outline-offset: 2px; }

.quiz-corpo, .quiz-fine { animation: quiz-entra .25s ease; }
@keyframes quiz-entra {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .quiz *, .quiz *::before, .quiz *::after {
    animation-duration: .001ms !important;
    transition-duration: .001ms !important;
  }
  .quiz-spunta path { stroke-dashoffset: 0; }
}
`;

  /* Inietta lo stile una sola volta, il prima possibile. */
  (function iniettaStile() {
    if (document.getElementById("quiz-stile")) return;
    var s = document.createElement("style");
    s.id = "quiz-stile";
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  })();

  /* -------------------- MOTORE -------------------- */
  var DEFAULT_ERRORE      = "Non è corretta, riprova";
  var DEFAULT_CORRETTO    = "Corretto!";
  var DEFAULT_FINE_TITOLO = "Quiz completato!";
  var DEFAULT_FINE_TESTO  = "Hai risposto correttamente a tutte le domande. Ottimo lavoro!";
  var LETTERE = "ABCDEFGHIJKL".split("");

  /* Compila le formule MathJax su un elemento.
     Se MathJax non è ancora pronto (viene caricato in async), attende
     e riprova: così anche le risposte "complesse" ricostruite dal widget
     vengono compilate correttamente, senza dipendere dalla tempistica. */
  function typeset(el) {
    if (!el) return;
    var mj = window.MathJax;

    if (mj && mj.typesetPromise) {
      mj.typesetPromise([el]).catch(function () {});
      return;
    }
    if (mj && mj.startup && mj.startup.promise) {
      mj.startup.promise
        .then(function () { return MathJax.typesetPromise([el]); })
        .catch(function () {});
      return;
    }

    /* MathJax non ancora caricato: attende la sua comparsa. */
    var tentativi = 0;
    var timer = setInterval(function () {
      var m = window.MathJax;
      if (m && m.typesetPromise) {
        clearInterval(timer);
        m.typesetPromise([el]).catch(function () {});
      } else if (m && m.startup && m.startup.promise) {
        clearInterval(timer);
        m.startup.promise
          .then(function () { return MathJax.typesetPromise([el]); })
          .catch(function () {});
      } else if (++tentativi > 150) {   /* ~15s poi rinuncia */
        clearInterval(timer);
      }
    }, 100);
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function Quiz(root) {
    this.root       = root;
    this.erroreMsg  = root.dataset.feedbackErrore || DEFAULT_ERRORE;
    this.fineTitolo = root.dataset.titoloFinale   || DEFAULT_FINE_TITOLO;
    this.fineTesto  = root.dataset.messaggioFinale || DEFAULT_FINE_TESTO;
    this.mescola    = !root.hasAttribute("data-no-shuffle");

    this.domande = this.leggiDomande();
    if (!this.domande.length) return;

    this.multipla = this.domande.length > 1;   /* header e barra solo se multipla */
    this.domandeErrate = {};   /* indici (0-based) con almeno un errore */
    this.indice = 0;
    this.costruisci();
    this.mostraDomanda(0);
  }

  Quiz.prototype.leggiDomande = function () {
    var domande = [];
    var blocchi = this.root.querySelectorAll(".quiz-domanda");

    for (var b = 0; b < blocchi.length; b++) {
      var blocco  = blocchi[b];
      var testoEl = blocco.querySelector(".quiz-testo");
      var opzEls  = blocco.querySelectorAll(".quiz-opzioni > li, .quiz-opzioni > .quiz-opzione");

      var opzioni = [];
      for (var o = 0; o < opzEls.length; o++) {
        opzioni.push({
          html:     opzEls[o].innerHTML,
          giusta:   opzEls[o].hasAttribute("data-giusta"),
          feedback: opzEls[o].getAttribute("data-feedback") || ""
        });
      }
      domande.push({ testo: testoEl ? testoEl.innerHTML : "", opzioni: opzioni });
    }
    return domande;
  };

  Quiz.prototype.costruisci = function () {
    this.root.innerHTML = "";
    this.root.classList.add("quiz-attivo");

    if (this.multipla) {
      var header = document.createElement("div");
      header.className = "quiz-header";

      this.contatoreEl = document.createElement("span");
      this.contatoreEl.className = "quiz-contatore";
      header.appendChild(this.contatoreEl);
      this.root.appendChild(header);

      var barra = document.createElement("div");
      barra.className = "quiz-barra";
      this.barraEl = document.createElement("div");
      this.barraEl.className = "quiz-barra-riempimento";
      barra.appendChild(this.barraEl);
      this.root.appendChild(barra);
    } else {
      /* Domanda unica: niente contatore, niente barra. */
      this.contatoreEl = null;
      this.barraEl = null;
    }

    this.corpoWrap = document.createElement("div");
    this.root.appendChild(this.corpoWrap);
  };

  Quiz.prototype.mostraDomanda = function (i) {
    var self = this;
    this.indice = i;
    var d = this.domande[i];
    var ultima = (i === this.domande.length - 1);

    if (this.contatoreEl) {
      this.contatoreEl.textContent = "Domanda " + (i + 1) + " di " + this.domande.length;
    }
    this.aggiornaBarra(i / this.domande.length);

    var corpo = document.createElement("div");
    corpo.className = "quiz-corpo";

    var testo = document.createElement("div");
    testo.className = "quiz-testo";
    testo.innerHTML = d.testo;
    corpo.appendChild(testo);

    var lista = document.createElement("ul");
    lista.className = "quiz-opzioni";

    var ordine = d.opzioni.map(function (_, idx) { return idx; });
    if (this.mescola) shuffle(ordine);

    ordine.forEach(function (idx, pos) {
      var opz = d.opzioni[idx];
      var li  = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-opzione";
      btn.innerHTML =
        '<span class="quiz-segno" aria-hidden="true">' + (LETTERE[pos] || "•") + "</span>" +
        '<span class="quiz-opz-testo">' + opz.html + "</span>";
      btn.addEventListener("click", function () { self.rispondi(btn, opz); });
      li.appendChild(btn);
      lista.appendChild(li);
    });
    corpo.appendChild(lista);

    var fb = document.createElement("div");
    fb.className = "quiz-feedback";
    fb.setAttribute("role", "status");
    fb.setAttribute("aria-live", "polite");
    corpo.appendChild(fb);
    this.feedbackEl = fb;

    if (this.domande.length > 1) {
      var azioni = document.createElement("div");
      azioni.className = "quiz-azioni";
      var avanti = document.createElement("button");
      avanti.type = "button";
      avanti.className = "quiz-avanti";
      avanti.innerHTML = ultima
        ? 'Concludi <span aria-hidden="true">&#10003;</span>'
        : 'Avanti <span aria-hidden="true">&rarr;</span>';
      avanti.style.display = "none";
      avanti.addEventListener("click", function () {
        if (ultima) self.mostraFine();
        else        self.mostraDomanda(i + 1);
      });
      azioni.appendChild(avanti);
      corpo.appendChild(azioni);
      this.avantiEl = avanti;
    } else {
      /* Quiz con una sola domanda: nessun pulsante, nessuna schermata finale. */
      this.avantiEl = null;
    }

    this.corpoWrap.innerHTML = "";
    this.corpoWrap.appendChild(corpo);
    typeset(corpo);
  };

  Quiz.prototype.rispondi = function (btn, opz) {
    if (btn.disabled) return;

    if (opz.giusta) {
      btn.classList.add("corretta");
      var tutte = this.corpoWrap.querySelectorAll(".quiz-opzione");
      for (var k = 0; k < tutte.length; k++) tutte[k].disabled = true;

      this.mostraFeedback(opz.feedback || DEFAULT_CORRETTO, "ok");
      this.aggiornaBarra((this.indice + 1) / this.domande.length);
      if (this.avantiEl) {
        this.avantiEl.style.display = "inline-flex";
        this.avantiEl.focus();
      }
    } else {
      this.domandeErrate[this.indice] = true;   /* registra l'errore */
      btn.classList.add("sbagliata");
      btn.disabled = true;
      this.mostraFeedback(opz.feedback || this.erroreMsg, "ko");
    }
  };

  Quiz.prototype.mostraFeedback = function (html, tipo) {
    var fb = this.feedbackEl;
    fb.className = "quiz-feedback mostra " + tipo;
    fb.innerHTML = html;
    typeset(fb);
  };

  Quiz.prototype.aggiornaBarra = function (frazione) {
    if (!this.barraEl) return;
    var f = Math.max(0, Math.min(1, frazione));
    this.barraEl.style.width = (f * 100) + "%";
  };

  Quiz.prototype.mostraFine = function () {
    var self = this;
    this.aggiornaBarra(1);
    this.contatoreEl.textContent = "Completato";

    var totale = this.domande.length;

    /* Statistiche: solo se le domande sono più di una. */
    var statHtml = "";
    if (totale > 1) {
      var errate = [];
      for (var idx = 0; idx < totale; idx++) {
        if (this.domandeErrate[idx]) errate.push(idx + 1);
      }
      var corrette = totale - errate.length;
      var perc = Math.round((corrette / totale) * 100);

      statHtml = '<div class="quiz-stat">' +
        '<div class="quiz-stat-perc">Risposte corrette al primo tentativo: ' +
        perc + '% (' + corrette + ' su ' + totale + ')</div>';
      if (errate.length) {
        var nomi = errate.map(function (n) { return "Domanda " + n; }).join(", ");
        statHtml += '<p class="quiz-stat-errate">Da rivedere: <b>' + nomi + '</b></p>';
      }
      statHtml += '</div>';
    }

    var fine = document.createElement("div");
    fine.className = "quiz-fine";
    fine.innerHTML =
      '<svg class="quiz-spunta" viewBox="0 0 80 80" aria-hidden="true">' +
        '<circle cx="40" cy="40" r="40"></circle>' +
        '<path d="M24 41 l11 11 l21 -24"></path>' +
      '</svg>' +
      '<p class="quiz-fine-titolo">' + this.fineTitolo + '</p>' +
      '<p class="quiz-fine-testo">'  + this.fineTesto  + '</p>' +
      statHtml;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-ricomincia";
    btn.textContent = "Rifai il quiz";
    btn.addEventListener("click", function () {
      self.domandeErrate = {};     /* azzera il punteggio */
      self.mostraDomanda(0);
    });
    fine.appendChild(btn);

    this.corpoWrap.innerHTML = "";
    this.corpoWrap.appendChild(fine);
    typeset(fine);
    btn.focus();
  };

  function init() {
    var elenco = document.querySelectorAll(".quiz");
    for (var i = 0; i < elenco.length; i++) {
      var el = elenco[i];
      if (el.dataset.quizPronto) continue;
      el.dataset.quizPronto = "1";
      new Quiz(el);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.Quiz = Quiz;
})();