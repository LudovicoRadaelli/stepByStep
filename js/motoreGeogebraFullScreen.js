/*
 * geogebraFullscreen.js
 * -------------------------------------------------------------
 * Aggiunge un pulsante "schermo intero" a ogni widget GeoGebra
 * inserito in un div .geogebra-container.
 *
 * - Inietta da solo il CSS necessario (nessuna modifica a style.css).
 * - Crea da solo bottone e messaggio (nessuna modifica all'HTML).
 * - Il pulsante sta SOTTO il widget nella vista normale, e passa in
 *   un angolo solo quando si e' a schermo intero (dove c'e' spazio).
 * - In fullscreen prova a bloccare l'orientamento in orizzontale
 *   (funziona su Android); dove non e' supportato (iOS/Safari)
 *   mostra l'invito a ruotare il dispositivo.
 * - Al cambio di stato fullscreen fa ricalcolare le dimensioni al
 *   widget emettendo un evento "resize", che scaleContainerClass
 *   intercetta per riscalare l'applet.
 *
 * Uso: includere in fondo alla pagina, dopo l'iniezione degli applet:
 *   <script src="../../js/geogebraFullscreen.js" defer></script>
 * -------------------------------------------------------------
 */
(function () {
  "use strict";

  /* ----- 1. Iniezione dello stile ----- */
  // Nota: le regole :fullscreen e :-webkit-full-screen vanno tenute
  // SEPARATE. Se un browser non conosce un selettore all'interno di un
  // gruppo separato da virgole, scarta l'intera regola: raggruppandole
  // perderemmo lo stile anche dove sarebbe supportato.
  var css = [
    ".geogebra-container { position: relative; }",

    // bottone: nel flusso normale, centrato SOTTO il widget
    ".ggb-fs-btn {",
    "  position: absolute; bottom: 4px; right: 4px; z-index: 2147483647;",
    "  padding: 6px 10px; font: inherit; font-size: 0.85rem;",
    "  line-height: 1; cursor: pointer;",
    "  border: 1px solid rgba(0,0,0,0.2); border-radius: 6px;",
    "  background: rgba(255,255,255,0.9); color: #222;",
    "}",
    ".ggb-fs-btn:hover { background: #fff; }",

    ".ggb-rotate-hint {",
    "  display: none; position: absolute; inset: 0; z-index: 2147483647;",
    "  align-items: center; justify-content: center;",
    "  text-align: center; padding: 1rem;",
    "  background: #fff; font-size: 1.3rem;",
    "}",

    ".geogebra-container:fullscreen {",
    "  max-width: none; width: 100%; height: 100%;",
    "  display: flex; align-items: center; justify-content: center; background: #fff;",
    "}",
    ".geogebra-container:-webkit-full-screen {",
    "  max-width: none; width: 100%; height: 100%;",
    "  display: flex; align-items: center; justify-content: center; background: #fff;",
    "}",

    // il messaggio compare solo se siamo a schermo intero E in verticale
    "@media (orientation: portrait) {",
    "  .geogebra-container:fullscreen .ggb-rotate-hint { display: flex; }",
    "  .geogebra-container:-webkit-full-screen .ggb-rotate-hint { display: flex; }",
    "}"
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ----- 2. Helper fullscreen (con prefissi webkit per Safari) ----- */
  function requestFs(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    return Promise.reject(new Error("Fullscreen non supportato"));
  }
  function exitFs() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  }
  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  /* ----- 3. Logica di apertura/chiusura ----- */
  function toggleFullscreen(container) {
    if (fsElement()) {
      exitFs();
      return;
    }
    Promise.resolve(requestFs(container))
      .then(function () {
        // blocco in orizzontale: funziona su Android, ignorato su iOS
        if (screen.orientation && screen.orientation.lock) {
          return screen.orientation.lock("landscape").catch(function () {
            /* non supportato: subentra il messaggio "ruota il dispositivo" */
          });
        }
      })
      .catch(function (e) {
        console.warn("Schermo intero non disponibile:", e);
      });
  }

  /* ----- 4. Reazione al cambio di stato ----- */
  function onFsChange() {
    // scaleContainerClass ascolta il resize della finestra: cosi'
    // l'applet si riadatta alle nuove dimensioni (dentro e fuori dal fullscreen)
    window.dispatchEvent(new Event("resize"));

    var fs = fsElement();
    var buttons = document.querySelectorAll(".ggb-fs-btn");
    for (var i = 0; i < buttons.length; i++) {
      var inFs = fs && fs.contains(buttons[i]);
      buttons[i].textContent = inFs ? "\u2715" : "\u26F6";
    }
  }
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  /* ----- 5. Aggancio dei controlli a ogni contenitore ----- */
  function enhance(container) {
    if (container.dataset.ggbFsReady) return; // evita doppioni
    container.dataset.ggbFsReady = "1";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ggb-fs-btn";
    btn.textContent = "\u26F6";
    btn.addEventListener("click", function () { toggleFullscreen(container); });

    var hint = document.createElement("div");
    hint.className = "ggb-rotate-hint";
    hint.textContent = "\u21BB Ruota il dispositivo in orizzontale";

    container.appendChild(btn);
    container.appendChild(hint);
  }

  function init() {
    var containers = document.querySelectorAll(".geogebra-container");
    for (var i = 0; i < containers.length; i++) enhance(containers[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();