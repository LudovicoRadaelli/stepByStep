/* HTML Hint 
        <button id="hintAAAAAAAAAA-button" onclick="showHint(`AAAAAAAAAA`)">Soluzione</button>
        <div id="hintAAAAAAAAAA" class="hint gray" style="display: none;">     
            <b class="gray">Soluzione</b> 
        </div>

        <br> 
        
        <button id="hintAAAAAAAAAA-button" onclick="showHint(`AAAAAAAAAA`)">Svolgimento</button>
        <div id="hintAAAAAAAAAA" class="hint gray" style="display: none;">     
            <b class="gray">Svolgimento</b> 
        </div>
*/

/* HTML slide

    <div id="slide-containerAAAAAAAAAA" class="slide-container AAAAAAAAAA grayBorder">
        <div class="slideAAAAAAAAAA">
            
        </div>
    </div>
    <div style="display: flex; flex-direction:row; justify-content: space-evenly; align-items: center;">
        <button id="previousSlide-buttonAAAAAAAAAA" onclick="previousSlide(`AAAAAAAAAA`)">Indietro</button>
        <button onclick="toggleFullscreen('AAAAAAAAAA')">⛶</button>
        <button id="nextSlide-buttonAAAAAAAAAA" onclick="nextSlide(`AAAAAAAAAA`)">Avanti</button>
    </div> 

*/


function showHint(i) {

    //creo un array con tutti gli elementi button della pagina
    const listaButton = document.querySelectorAll(`button`);

    //per ogni elemento button dell'array
    //CORRETTO: prima si ciclava su `.slide-container`, quindi nessun hint veniva mai richiuso
    listaButton.forEach(elm => {
        //se id="hint**********-button"         
        if (/^hint.{10}-button$/.test(elm.id)) {
            //allora rendo visibile il button
            elm.style.display = "block";

            //ed invisibile l'hint relativo
            let hintID = elm.id.match(/^hint(.*)-button$/)[1]; //estraggo l'id del div da quello del button            
            const hintDiv = document.getElementById(`hint${hintID}`);
            if (hintDiv) hintDiv.style.display = "none";
        }
    });

    //rendo non visibile il button che è stato premuto
    document.getElementById(`hint${i}-button`).style.display = "none";
    //rendo visibile l'hint relativo
    document.getElementById(`hint${i}`).style.display = "block";
    document.location.href = `#hint${i}`
}

//in questa var inserisco la targa della raccolta di slide che sto scorrendo
let currentSlide;

//creo un array di oggetti che abbiano come attributi "element" l'elemento slide-container
//e come attributo "targa" il codice che li identifica e come attributo "slideIndex" l'indice 
//attuale della raccolta

let slideContainerList = [];
document.querySelectorAll(`.slide-container`).forEach(elm => {
    //ricavo la targa dalla classe; se la classe non ha la forma attesa uso l'id come riserva,
    //così un singolo contenitore malformato non blocca l'inizializzazione di tutti gli altri
    const m = elm.className.match(/^slide-container (.{10}) grayBorder$/);
    let targa = m ? m[1] : (elm.id.startsWith("slide-container") ? elm.id.slice("slide-container".length) : null);
    if (!targa) {
        console.warn("slide-container ignorato: targa non riconoscibile", elm);
        return;
    }
    slideContainerList.push({
        element: elm,
        targa: targa,
        slideIndex: 0
    })
});


//inizializzo tutte le raccolte di slide presenti
slideContainerList.forEach(elm => {
    inizialize(elm.targa)
});


//aggiungo la possibilità di scorrere le slide tramite frecce
document.addEventListener("keydown", (event) => {
    if (currentSlide !== 0) {
        if (event.key === "ArrowRight" && document.getElementById(`nextSlide-button${currentSlide}`).disabled === false) {
            nextSlide(currentSlide);
        } else if (event.key === "ArrowLeft" && document.getElementById(`previousSlide-button${currentSlide}`).disabled === false) {
            previousSlide(currentSlide);
        }
    }
})


//funzione per passare alla slide successiva
function nextSlide(n) {

    ///Copio nella variabile obj l'oggetto che contiene l'elemento slide-container, la sua targa 
    //e slideIndex. IMPORTANTE: ogni modifica apportata ad obj viene effettuata anche sull'oggetto
    //originale
    let obj = slideContainerList.find(ob => ob.targa === n);
    if (!obj) return;

    //una volta spinto il button registro qual è la targa associata alla raccolta di slide 
    //che sto scorrendo
    currentSlide = obj.targa;

    //ogni volta che il pulsante viene premuto scrollo in modo da centrare le slide
    document.location.href = `#slide-container${obj.targa}`

    //Creo un array con tutte le slide contraddistinte dalla targa n
    let slide = document.getElementsByClassName(`slide${obj.targa}`)

    //nascondo tutte le slide
    for (let i = 0; i < slide.length; i++) {
        slide[i].style.display = "none";
    }

    //aggiorno l'indice
    obj.slideIndex++;

    //se dopo essere stato aggiornato l'indice corrente è diverso da 0
    if (obj.slideIndex !== 0) {
        //abilito il pulsante previous 
        document.getElementById(`previousSlide-button${obj.targa}`).disabled = false;
    }

    //se ci sono ancora slide da mostrare 
    if (obj.slideIndex < slide.length) {
        //rendo visibile la successiva
        slide[obj.slideIndex].style.display = "block";
    }

    //se le slide da mostrare sono finite. 
    if (obj.slideIndex === slide.length - 1) {
        //rendo nuovamente visibile l'ultima slide (altimenti sparisce)    
        slide[slide.length - 1].style.display = "block";
        //e scrollo la vista al riquadro conclusiovo
        document.getElementById(`nextSlide-button${obj.targa}`).disabled = true;
    }

}

//funzione per passare alla slide precedente
function previousSlide(n) {

    ///Copio nella variabile obj l'oggetto che contiene l'elemento slide-container, la sua targa 
    //e slideIndex. IMPORTANTE: ogni modifica apportata ad obj viene effettuata anche sull'oggetto
    //originale
    let obj = slideContainerList.find(ob => ob.targa === n);
    if (!obj) return;

    //una volta spinto il button registro qual è la targa associata alla raccolta di slide 
    //che sto scorrendo
    currentSlide = obj.targa;

    //ogni volta che il pulsante viene premuto scrollo in modo da centrare le slide
    document.location.href = `#slide-container${obj.targa}`

    //Creo un array con tutte le slide contraddistinte dalla targa n
    let slide = document.getElementsByClassName(`slide${obj.targa}`)

    //nascondo tutte le slide
    for (let i = 0; i < slide.length; i++) {
        slide[i].style.display = "none";
    }

    //aggiorno l'indice
    obj.slideIndex--;
    if (obj.slideIndex < 0) obj.slideIndex = 0;

    //visualizzo la precedente. 
    slide[obj.slideIndex].style.display = "block";

    //se è la prima slide 
    if (obj.slideIndex === 0) {
        //disattivo il tasto previous
        document.getElementById(`previousSlide-button${obj.targa}`).disabled = true;
    }

    //nel caso in cui il pulsante next sia disabilitato 
    if (document.getElementById(`nextSlide-button${obj.targa}`).disabled === true) {
        //lo riattivo
        document.getElementById(`nextSlide-button${obj.targa}`).disabled = false;
    }
}


function inizialize(n) {

    ///Copio nella variabile obj l'oggetto che contiene l'elemento slide-container, la sua targa 
    //e slideIndex. IMPORTANTE: ogni modifica apportata ad obj viene effettuata anche sull'oggetto
    //originale
    let obj = slideContainerList.find(ob => ob.targa === n);
    if (!obj) return;
    

    //imposto a 0 l'indice corrente della raccolta di slide 
    //contraddistinte dalla targa n 
    obj.slideIndex = 0;

    //Creo un array con tutte le slide contraddistinte dalla targa n
    let slide = document.getElementsByClassName(`slide${obj.targa}`)
    if (!slide.length) return;

    //rendo non visibili le slide della raccolta
    for (let i = 0; i < slide.length; i++) {
        slide[i].style.display = "none"
    }

    //rendo visibile la prima slide
    slide[0].style.display = "block"

    //pulsante next abilitato
    const next = document.getElementById(`nextSlide-button${obj.targa}`);
    if (next) next.disabled = false;

    //pulsante previous disabled
    const prev = document.getElementById(`previousSlide-button${obj.targa}`);
    if (prev) prev.disabled = true;

}

//Da qua in poi inizia il codice elaborato con l'aiuto di chatGPT.


// === FULLSCREEN ===
function toggleFullscreen(n) {
    const el = document.getElementById(`slide-container${n}`);
    if (!el) return;
    if (!document.fullscreenElement) {
        // alcuni browser ignorano navigationUI, ma non fa male
        el.requestFullscreen?.({ navigationUI: "hide" }) || el.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
}

// Esci dal fullscreen con ESC e aggiorna il focus dei tasti
document.addEventListener("fullscreenchange", () => {
    // opzionale: potresti voler rifocalizzare i bottoni
});

// === SWIPE / DRAG ===
// Attiva swipe per una singola raccolta (targa = n)
function enableSwipe(n) {
    const el = document.getElementById(`slide-container${n}`);
    if (!el) return;

    let startX = 0, startY = 0, isTouch = false;
    let mDown = false, mStartX = 0, mStartY = 0;

    const THRESHOLD = 50;   // pixel orizzontali minimi per considerare lo swipe
    const RESTRAINT = 100;  // quanto si può deviare in verticale

    // --- Touch ---
    el.addEventListener("touchstart", (e) => {
        const t = e.changedTouches[0];
        startX = t.clientX; startY = t.clientY;
        isTouch = true;
    }, { passive: true });

    el.addEventListener("touchend", (e) => {
        if (!isTouch) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;

        if (Math.abs(dx) > THRESHOLD && Math.abs(dy) < RESTRAINT) {
            if (dx < 0 && !document.getElementById(`nextSlide-button${n}`).disabled) {
                nextSlide(n);
            } else if (dx > 0 && !document.getElementById(`previousSlide-button${n}`).disabled) {
                previousSlide(n);
            }
        }
        isTouch = false;
    }, { passive: true });

    // --- Mouse drag (desktop) ---
    el.addEventListener("mousedown", (e) => {
        mDown = true;
        mStartX = e.clientX; mStartY = e.clientY;
    });
    window.addEventListener("mouseup", (e) => {
        if (!mDown) return;
        const dx = e.clientX - mStartX;
        const dy = e.clientY - mStartY;
        if (Math.abs(dx) > THRESHOLD && Math.abs(dy) < RESTRAINT) {
            if (dx < 0 && !document.getElementById(`nextSlide-button${n}`).disabled) {
                nextSlide(n);
            } else if (dx > 0 && !document.getElementById(`previousSlide-button${n}`).disabled) {
                previousSlide(n);
            }
        }
        mDown = false;
    });
}

// === INTEGRAZIONE CON IL TUO CODICE ESISTENTE ===
// Dopo aver popolato slideContainerList ed aver chiamato inizialize(...),
// attiva lo swipe su ogni contenitore trovato.
(function attachSwipeToAll() {
    try {
        slideContainerList.forEach(ob => {
            // attacca swipe una sola volta per raccolta
            enableSwipe(ob.targa);
        });
    } catch (e) {
        // se lo script viene caricato prima che slideContainerList sia pieno, riprova a DOM ready
        document.addEventListener('DOMContentLoaded', () => {
            (slideContainerList || []).forEach(ob => enableSwipe(ob.targa));
        });
    }
})();