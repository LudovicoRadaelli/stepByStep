/* =========================================================================
   motoreQuizVideo.js
   Quiz a scelta multipla sui video YouTube.
   - mette in pausa il video ai secondi indicati e mostra la domanda;
   - il contenuto si scala per entrare nello spazio disponibile;
   - se il video è a SCHERMO INTERO quando scatta un quiz, esce
     automaticamente dal fullscreen per mostrare la domanda e, al clic su
     "Continua", ci rientra da solo riprendendo la riproduzione.

   USO:
   1) Includi una volta per pagina:
        <script src="../../js/motoreQuizVideo.js" defer></script>
   2) Per ogni video:
        <div class="video-quiz">
          //#METTI QUI L'IFRAME#
          <script type="application/json" class="quiz-data">
          [
            {"t": 45, 
            "q": "Domanda?", 
            "options": 
            [
            "A",
            "B",
            "C"
            ], 
            "correct": 1}
          ]
          </script>
        </div>
   Formule LaTeX in q e options: \\(...\\) / \\[...\\] (doppia barra nel JSON).
   Il CSS viene iniettato automaticamente.
   ========================================================================= */
(function () {

  var allVq = [];

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    injectStyles();

    var containers = Array.prototype.slice.call(document.querySelectorAll('.video-quiz'));
    if (!containers.length) return;

    containers.forEach(function (c, i) {
      var iframe = c.querySelector('iframe');
      if (!iframe) return;
      if (!iframe.id) iframe.id = 'vq-frame-' + i;
      try {
        var u = new URL(iframe.src);
        u.searchParams.set('enablejsapi', '1');
        u.searchParams.set('playsinline', '1');
        if (location.protocol === 'http:' || location.protocol === 'https:') {
          u.searchParams.set('origin', location.origin);
        }
        if (iframe.src !== u.toString()) iframe.src = u.toString();
      } catch (e) {}
      buildOverlay(c);
    });

    // Riadatta i quiz aperti su resize e su cambio fullscreen
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(refitOpen, 120);
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () { setTimeout(refitOpen, 60); });
    });

    if (window.YT && window.YT.Player) {
      boot(containers);
    } else {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) prev(); boot(containers); };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        var t = document.createElement('script');
        t.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(t);
      }
    }
  }

  function boot(containers) { containers.forEach(setupPlayer); }
  function refitOpen() { allVq.forEach(function (vq) { if (vq.overlay.classList.contains('vq-active')) fitCard(vq); }); }

  /* ---------- Fullscreen (con prefissi Safari) ---------- */
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function requestFs(el) { var f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) try { f.call(el); } catch (e) {} }
  function exitFs() { var f = document.exitFullscreen || document.webkitExitFullscreen; if (f) try { f.call(document); } catch (e) {} }

  /* ---------- Overlay e quiz ---------- */
  function buildOverlay(c) {
    var o = document.createElement('div');
    o.className = 'vq-overlay';
    o.innerHTML = '<div class="vq-card"><div class="vq-q"></div><div class="vq-options"></div>' +
      '<p class="vq-feedback"></p><button class="vq-continue" type="button">Continua &#9654;</button></div>';
    c.appendChild(o);
    c._vq = {
      container: c,
      overlay: o,
      card: o.querySelector('.vq-card'),
      q:    o.querySelector('.vq-q'),
      opts: o.querySelector('.vq-options'),
      fb:   o.querySelector('.vq-feedback'),
      cont: o.querySelector('.vq-continue'),
      quizzes: readQuizzes(c),
      shown: {},
      fsToRestore: null
    };
    allVq.push(c._vq);
  }

  function readQuizzes(c) {
    var s = c.querySelector('script.quiz-data');
    if (!s) return [];
    try { return JSON.parse(s.textContent).sort(function (a, b) { return a.t - b.t; }); }
    catch (e) { console.error('[quiz] JSON non valido:', e); return []; }
  }

  function setupPlayer(c) {
    var iframe = c.querySelector('iframe');
    if (!iframe || !c._vq.quizzes.length) return;
    c._vq.player = new YT.Player(iframe.id, { events: { onReady: function () { watch(c); } } });
  }

  function watch(c) {
    var p = c._vq.player;
    setInterval(function () {
      if (c._vq.overlay.classList.contains('vq-active')) return;
      if (p.getPlayerState() !== 1) return;                 // 1 = in riproduzione
      var now = p.getCurrentTime();
      for (var i = 0; i < c._vq.quizzes.length; i++) {
        if (!c._vq.shown[i] && now >= c._vq.quizzes[i].t) {
          c._vq.shown[i] = true; p.pauseVideo(); ask(c, c._vq.quizzes[i]); break;
        }
      }
    }, 300);
  }

  function ask(c, quiz) {
    var vq = c._vq, p = vq.player;

    // Se il video è a schermo intero, esci per mostrare il quiz (e memorizza
    // l'elemento, per rientrarci al "Continua")
    var fe = fsElement();
    vq.fsToRestore = (fe && vq.container.contains(fe)) ? fe : null;
    if (vq.fsToRestore) exitFs();

    vq.card.style.transform = '';
    vq.q.innerHTML = quiz.q; vq.fb.innerHTML = ''; vq.cont.classList.remove('vq-show'); vq.opts.innerHTML = '';

    quiz.options.forEach(function (label, idx) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'vq-opt'; b.innerHTML = label;
      b.addEventListener('click', function () {
        if (idx === quiz.correct) {
          b.classList.add('vq-correct'); vq.fb.innerHTML = quiz.explain || 'Corretto!';
          Array.prototype.forEach.call(vq.opts.children, function (x) { x.disabled = true; });
          vq.cont.classList.add('vq-show'); vq.cont.focus();
        } else { b.classList.add('vq-wrong'); b.disabled = true; vq.fb.innerHTML = 'Non è corretta, riprova.'; }
        typesetThenFit(vq);
      });
      vq.opts.appendChild(b);
    });

    vq.cont.onclick = function () {
      vq.overlay.classList.remove('vq-active');
      // Il clic è un gesto valido: possiamo rientrare a schermo intero
      if (vq.fsToRestore) { requestFs(vq.fsToRestore); vq.fsToRestore = null; }
      p.playVideo();
    };

    vq.overlay.classList.add('vq-active');
    typesetThenFit(vq);
  }

  function typesetThenFit(vq) {
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([vq.overlay]).then(function () { fitCard(vq); }).catch(function () { fitCard(vq); });
    } else {
      fitCard(vq);
    }
  }

  function fitCard(vq) {
    var card = vq.card, ov = vq.overlay;
    card.style.transform = '';
    var availH = ov.clientHeight * 0.92;
    var availW = ov.clientWidth * 0.96;
    var scale = Math.min(availH / card.offsetHeight, availW / card.offsetWidth, 1);
    card.style.transformOrigin = 'center center';
    card.style.transform = scale < 1 ? 'scale(' + scale.toFixed(3) + ')' : '';
  }

  /* ---------- CSS ---------- */
  function injectStyles() {
    if (document.getElementById('vq-styles')) return;
    var css =
      '.video-quiz{position:relative;aspect-ratio:16/9;margin:1.5rem 0;background:#000;border-radius:12px;overflow:hidden;}' +
      '.video-quiz iframe{width:100%;height:100%;display:block;border:0;}' +
      '.vq-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;' +
        'background:rgba(17,24,39,.94);backdrop-filter:blur(3px);padding:clamp(.6rem,3%,1.4rem);box-sizing:border-box;z-index:5;}' +
      '.vq-overlay.vq-active{display:flex;}' +
      '.vq-card{width:100%;max-width:560px;color:#f8fafc;text-align:center;' +
        'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}' +
      '.vq-q{font-size:clamp(1rem,2.2vw,1.3rem);font-weight:600;line-height:1.35;margin:0 0 .8rem;}' +
      '.vq-options{display:grid;gap:.45rem;}' +
      '.vq-opt{font:inherit;font-size:1rem;color:#f8fafc;background:rgba(255,255,255,.08);' +
        'border:1px solid rgba(255,255,255,.2);padding:.55rem .9rem;border-radius:10px;cursor:pointer;text-align:left;' +
        'transition:background .15s,border-color .15s,transform .05s;}' +
      '.vq-opt:hover:not(:disabled){background:rgba(255,255,255,.18);}' +
      '.vq-opt:active:not(:disabled){transform:scale(.99);}' +
      '.vq-opt:focus-visible{outline:2px solid #93c5fd;outline-offset:2px;}' +
      '.vq-opt.vq-correct{background:#15803d;border-color:#15803d;}' +
      '.vq-opt.vq-wrong{background:#b91c1c;border-color:#b91c1c;}' +
      '.vq-opt:disabled{cursor:default;opacity:.9;}' +
      '.vq-feedback{min-height:1.2em;margin:.7rem 0 .2rem;font-size:.95rem;color:#cbd5e1;' +
        'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}' +
      '.vq-continue{display:none;margin-top:.2rem;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
        'font-weight:600;font-size:1rem;color:#fff;background:#2563eb;border:0;padding:.55rem 1.4rem;border-radius:10px;cursor:pointer;}' +
      '.vq-continue:hover{background:#1d4ed8;}' +
      '.vq-continue.vq-show{display:inline-block;}' +
      '@media (prefers-reduced-motion:reduce){.vq-opt{transition:none;}}';
    var st = document.createElement('style');
    st.id = 'vq-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

})();