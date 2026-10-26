/* =====================================================================
   StepByStep - pagina dello studente
   Home con gli argomenti; per ogni argomento: campo-formula con
   tastierino, pulsanti Soluzione / Svolgimento subito sotto, slide nello
   stile delle schede.
   ===================================================================== */
(function () {
    'use strict';
    const SBS = window.SBS;
    const $ = (id) => document.getElementById(id);

    /* ---------------- argomenti disponibili ---------------- */
    const ARGOMENTI = {
        equazioni: {
            titolo: 'Equazioni',
            descr: 'Di primo grado (trasporto) e di secondo grado (formula risolutiva).',
            consegna: 'Scrivi un\'equazione di primo o di secondo grado (con il segno =).',
            vetrina: '3(x - 1) = 2x + 5',
            prefisso: '',
            esempi: ['6x - 3 = 2x + 9', '3 + (4x - 2)(-3x + 4) = 2x - (6x + 1)(2x + 4) - 3(x - 1)',
                '5/4(8/5x - 2) - 1/2(2x - 2/3) = 0', '(x + 1)/2 - x/3 = 1']
        },
        disequazioni: {
            titolo: 'Disequazioni',
            descr: 'Di primo grado e di secondo grado con il metodo della parabola.',
            consegna: 'Scrivi una disequazione di primo o di secondo grado (con <, >, ≤ oppure ≥).',
            vetrina: '3x^2 + 2x - 5 < 0',
            prefisso: '',
            esempi: []
        },
        esponenziali: {
            titolo: 'Equazioni e disequazioni esponenziali',
            descr: 'Passaggio agli esponenti e sostituzione, per equazioni e disequazioni.',
            consegna: 'Scrivi un\'equazione o una disequazione esponenziale: la x deve stare negli esponenti.',
            vetrina: '1 = frac(2^(9x - 7)·4^(10x - 6))(root(3)(8))',
            prefisso: '',
            esempi: []
        },
        espressioni: {
            titolo: 'Espressioni e polinomi',
            descr: 'Calcoli con numeri, monomi e polinomi, prodotti notevoli.',
            consegna: 'Scrivi un\'espressione da calcolare o semplificare (senza il segno =).',
            vetrina: '(3x - 2)(3x + 2) - (3x - 1)^2',
            prefisso: '',
            esempi: ['(3x - 2)(3x + 2) - (3x - 1)^2', '2x(x - 1) - x(x + 3)', '3 - 2(4 - 7) + 2^3', '1/2x + 1/3x - 1/4']
        },
        derivate: {
            titolo: 'Derivate',
            descr: 'Somma, prodotto, rapporto, funzioni composte; poi si semplifica.',
            consegna: 'Scrivi la funzione da derivare.',
            vetrina: '3x^2/(2x + 1)',
            prefisso: 'f(x) = ',
            esempi: ['2sin(x)cos(x)', 'sin(x)/x^2', '3x^2/(2x + 1)', 'ln(x^2 + 1)', 'root(3)(x^2)', '5/x^2']
        }
    };

    /* ---------------- tastierino ---------------- */
    const BOX = '<span class="k-box"></span>';
    const K = {
        x: { l: '<i>x</i>', a: (e) => e.char('x') },
        x2: { l: '<i>x</i><sup>2</sup>', a: (e) => { e.char('x'); e.pow('2'); } },
        pow: { l: `${BOX}<sup>${BOX}</sup>`, a: (e) => e.pow(), t: 'Potenza' },
        frac: { l: `<span class="k-frac">${BOX}<span class="k-bar"></span>${BOX}</span>`, a: (e) => e.frac(), t: 'Frazione' },
        sqrt: { l: `√${BOX}`, a: (e) => e.sqrt(), t: 'Radice quadrata' },
        nroot: { l: `<sup>n</sup>√${BOX}`, a: (e) => e.nroot(), t: 'Radice n-esima' },
        expE: { l: `<i>e</i><sup>${BOX}</sup>`, a: (e) => e.expE() },
        e: { l: '<i>e</i>', a: (e) => e.char('e') },
        sin: { l: 'sin', a: (e) => e.fn('sin') }, cos: { l: 'cos', a: (e) => e.fn('cos') },
        tan: { l: 'tan', a: (e) => e.fn('tan') }, ln: { l: 'ln', a: (e) => e.fn('ln') },
        per: { l: '×', a: (e) => e.char('·'), c: 'op' }, div: { l: ':', a: (e) => e.char(':') },
        meno: { l: '−', a: (e) => e.char('-'), c: 'op' }, piu: { l: '+', a: (e) => e.char('+'), c: 'op' },
        uguale: { l: '=', a: (e) => e.char('=') },
        minore: { l: '&lt;', a: (e) => e.char('<'), c: 'op' }, maggiore: { l: '&gt;', a: (e) => e.char('>'), c: 'op' },
        minUg: { l: '≤', a: (e) => e.char('≤'), c: 'op' }, magUg: { l: '≥', a: (e) => e.char('≥'), c: 'op' }, virgola: { l: ',', a: (e) => e.char(',') },
        sx: { l: '‹', a: (e) => e.left(), c: 'nav', t: 'Sinistra' }, dx: { l: '›', a: (e) => e.right(), c: 'nav', t: 'Destra' },
        canc: { l: '⌫', a: (e) => e.backspace(), c: 'nav wide2', t: 'Cancella' },
        vai: { l: 'Svolgimento ↵', a: () => mostra('svo'), c: 'vai wide5' },
        vuoto: { l: '', a: () => {}, c: 'vuoto' }
    };
    for (const d of '0123456789') K[d] = { l: d, a: (e) => e.char(d), c: 'num' };
    for (const [k, v] of [['ap', '('], ['ch', ')'], ['qa', '['], ['qc', ']'], ['ga', '{'], ['gc', '}']]) K[k] = { l: v, a: (e) => e.char(v) };

    /* ---------------- colori di evidenziazione ----------------
       Il motore scrive red / blue / green / yellow (in ordine di priorità);
       qui diventano i colori della palette. */
    const PALETTE = { red: '#DB4437', blue: '#4285F4', green: '#0F9D58', yellow: '#F4B400' };
    function palette(s) {
        return s
            .replace(/\\color\{(red|blue|green|yellow)\}/g, (_, c) => `\\color{${PALETTE[c]}}`)
            .replace(/class="(red|blue|green|yellow)"/g, (_, c) => `style="color:${PALETTE[c]}"`);
    }
    SBS.palette = palette;

    const LAYOUT = {
        esponenziali: [
            ['x', 'pow', 'frac', '7', '8', '9', 'per'],
            ['ap', 'ch', 'nroot', '4', '5', '6', 'meno'],
            ['sqrt', 'uguale', 'minore', '1', '2', '3', 'piu'],
            ['minUg', 'magUg', 'maggiore', '0', 'sx', 'dx', 'div'],
            ['canc', 'vai']
        ],
        disequazioni: [
            ['x', 'x2', 'pow', '7', '8', '9', 'frac'],
            ['ap', 'ch', 'div', '4', '5', '6', 'per'],
            ['qa', 'qc', 'minore', '1', '2', '3', 'meno'],
            ['minUg', 'magUg', 'maggiore', '0', 'sx', 'dx', 'piu'],
            ['canc', 'vai']
        ],
        equazioni: [
            ['x', 'x2', 'pow', '7', '8', '9', 'frac'],
            ['ap', 'ch', 'div', '4', '5', '6', 'per'],
            ['qa', 'qc', 'uguale', '1', '2', '3', 'meno'],
            ['ga', 'gc', 'virgola', '0', 'sx', 'dx', 'piu'],
            ['canc', 'vai']
        ],
        espressioni: [
            ['x', 'x2', 'pow', '7', '8', '9', 'frac'],
            ['ap', 'ch', 'div', '4', '5', '6', 'per'],
            ['qa', 'qc', 'virgola', '1', '2', '3', 'meno'],
            ['ga', 'gc', 'vuoto', '0', 'sx', 'dx', 'piu'],
            ['canc', 'vai']
        ],
        derivate: [
            ['x', 'x2', 'pow', '7', '8', '9', 'frac'],
            ['sqrt', 'expE', 'ln', '4', '5', '6', 'per'],
            ['sin', 'cos', 'tan', '1', '2', '3', 'meno'],
            ['ap', 'ch', 'nroot', '0', 'sx', 'dx', 'piu'],
            ['canc', 'vai']
        ]
    };

    let argomento = null;
    let editor = null;
    let calcolato = null;        // {testo, r} ultimo svolgimento
    let slideState = null;

    /* ---------------- MathJax ---------------- */
    function mathJaxPronto() {
        return new Promise((res) => {
            let tent = 0;
            const chk = () => {
                if (window.MathJax && MathJax.startup && MathJax.startup.promise && MathJax.typesetPromise) res(MathJax.startup.promise);
                else if (++tent < 400) setTimeout(chk, 50);
                else res(null);
            };
            chk();
        });
    }
    function typeset(el) {
        return mathJaxPronto().then(() => {
            if (!window.MathJax || !MathJax.typesetPromise) return;
            MathJax.typesetClear && MathJax.typesetClear([el]);
            return MathJax.typesetPromise([el]);
        }).catch(err => console.warn(err));
    }

    /* ---------------- home ---------------- */
    function costruisciHome() {
        const box = $('sbs-argomenti');
        box.innerHTML = '';
        for (const [k, a] of Object.entries(ARGOMENTI)) {
            const el = document.createElement('a');
            el.href = '#' + k;
            el.className = 'sbs-arg';
            let tex = '';
            try {
                const p = SBS.parse(a.vetrina);
                tex = SBS.astTex(p.lhs, null, 'black') + (p.rhs ? ` ${SBS.REL[p.rel].tex} ` + SBS.astTex(p.rhs, null, 'black') : '');
                if (k === 'derivate') tex = `\\left(${tex}\\right)'`;
            } catch (e) { }
            el.innerHTML = `<span class="sbs-arg-titolo">${a.titolo}</span>
                <span class="sbs-arg-descr gray">${a.descr}</span>
                <span class="sbs-arg-formula">\\(${tex}\\)</span>`;
            box.appendChild(el);
        }
        typeset(box);
    }

    /* ---------------- navigazione ---------------- */
    function vista() {
        const h = (location.hash || '').replace('#', '');
        if (ARGOMENTI[h]) apriArgomento(h);
        else {
            argomento = null;
            $('sbs-home').hidden = false;
            $('sbs-argomento').hidden = true;
            tastiera(false);
            document.title = 'StepByStep';
        }
    }

    function apriArgomento(k, testo) {
        const a = ARGOMENTI[k];
        const cambiato = argomento !== k;
        argomento = k;
        $('sbs-home').hidden = true;
        $('sbs-argomento').hidden = false;
        $('sbs-titolo').textContent = a.titolo;
        $('sbs-consegna').textContent = a.consegna;
        document.title = `${a.titolo} · StepByStep`;
        if (cambiato) {
            editor.opts.prefix = a.prefisso ? '{\\color{gray}' + a.prefisso + '}\\;' : '';
            editor.clear();
            costruisciTasti();
            nascondiRisultati();
            window.scrollTo(0, 0);
        }
        if (testo) carica(testo);
    }

    function costruisciTasti() {
        const box = $('sbs-tasti');
        box.innerHTML = '';
        LAYOUT[argomento].forEach(riga => riga.forEach(nome => {
            const k = K[nome];
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sbs-k ' + (k.c || '');
            b.innerHTML = `<span class="k-lab">${k.l}</span>`;
            if (k.t) b.title = k.t;
            if (nome === 'vuoto') b.disabled = true;
            // pointerdown: non tolgo il "fuoco" al campo
            b.addEventListener('pointerdown', (ev) => ev.preventDefault());
            b.addEventListener('click', () => { k.a(editor); if (nome !== 'vai') editor.el.focus({ preventScroll: true }); });
            box.appendChild(b);
        }));
    }

    function costruisciEsempi() {
        const box = $('sbs-esempi');
        box.innerHTML = '';
        ARGOMENTI[argomento].esempi.forEach(s => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sbs-chip';
            const p = SBS.parse(s);
            let tex = SBS.astTex(p.lhs, null, 'black') + (p.rhs ? ' = ' + SBS.astTex(p.rhs, null, 'black') : '');
            b.innerHTML = `\\(${tex}\\)`;
            b.addEventListener('click', () => { carica(s); mostra('svo'); });
            box.appendChild(b);
        });
        typeset(box);
    }

    function carica(testo) {
        try { editor.setFromText(testo); }
        catch (e) { $('sbs-errore').textContent = 'Non riesco a leggere questo esercizio.'; }
    }

    /* ---------------- tastierino on/off ---------------- */
    function tastiera(on) {
        $('sbs-tastiera').hidden = !on;
        document.body.classList.toggle('sbs-con-tastiera', on);
    }

    /* ---------------- calcolo ---------------- */
    function nascondiRisultati() {
        $('sbs-out-sol').hidden = true;
        $('sbs-out-svo').hidden = true;
        $('sbs-btn-sol').classList.remove('sbs-attivo');
        $('sbs-btn-svo').classList.remove('sbs-attivo');
        $('sbs-errore').textContent = '';
    }

    function calcola() {
        const testo = editor.text().trim();
        if (calcolato && calcolato.testo === testo) return calcolato.r;
        if (!testo) throw new SBS.SBSError('Scrivi prima un esercizio (oppure premi «Esercizio casuale»).');
        const { lhs, rhs, rel } = SBS.parse(testo);
        let r;
        if (argomento === 'equazioni') {
            if (!rhs) throw new SBS.SBSError('Manca il segno «=»: un\'equazione ha due membri. Per semplificare un\'espressione scegli l\'argomento «Espressioni e polinomi».');
            if (rel !== '=') throw new SBS.SBSError('C\'è un segno di disuguaglianza: per risolverla scegli l\'argomento «Disequazioni».');
            r = SBS.algebra.risolvi(lhs, rhs, '=');
        } else if (argomento === 'esponenziali') {
            if (!rhs) throw new SBS.SBSError('Manca il segno «=» (oppure <, >, ≤, ≥): scrivi un\'equazione o una disequazione esponenziale con due membri.');
            r = SBS.esponenziali.risolvi(lhs, rhs, rel);
        } else if (argomento === 'disequazioni') {
            if (!rhs || rel === '=') throw new SBS.SBSError('Manca un segno di disuguaglianza (<, >, ≤, ≥). Per le equazioni scegli l\'argomento «Equazioni».');
            r = SBS.algebra.risolvi(lhs, rhs, rel);
        } else if (argomento === 'espressioni') {
            if (rhs) throw new SBS.SBSError('C\'è il segno «=»: per risolvere un\'equazione scegli l\'argomento «Equazioni di primo grado».');
            r = SBS.algebra.espressione(lhs);
        } else {
            if (rhs) throw new SBS.SBSError('Scrivi solo la funzione, senza il segno «=».');
            r = SBS.derivate.deriva(lhs);
        }
        calcolato = { testo, r };
        return r;
    }

    function mostra(cosa) {
        let r;
        $('sbs-errore').textContent = '';
        try { r = calcola(); }
        catch (e) {
            nascondiRisultati();
            $('sbs-errore').textContent = e.name === 'SBSError' ? e.message : 'Non riesco a svolgere questo esercizio: controlla di averlo scritto bene.';
            if (e.name !== 'SBSError') console.error(e);
            return;
        }
        tastiera(false);
        const sol = cosa === 'sol';
        $('sbs-btn-sol').classList.toggle('sbs-attivo', sol);
        $('sbs-btn-svo').classList.toggle('sbs-attivo', !sol);
        $('sbs-out-sol').hidden = !sol;
        $('sbs-out-svo').hidden = sol;
        if (sol) {
            $('sbs-sol').innerHTML = palette(r.risultato.html);
            typeset($('sbs-sol'));
        } else costruisciSlide(r);
        const box = sol ? $('sbs-out-sol') : $('sbs-out-svo');
        setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }

    /* ---------------- slide ---------------- */
    let slideCostruite = null;
    function costruisciSlide(r) {
        if (slideCostruite === r) return;
        slideCostruite = r;
        const cont = $('sbs-slides');
        cont.classList.toggle('sbs-black', r.tipo === 'derivata');
        cont.innerHTML = '';
        r.slides.forEach((s, i) => {
            const d = document.createElement('div');
            d.className = 'sbs-slide';
            d.style.display = i === 0 ? 'block' : 'none';
            let html = '';
            s.rows.forEach(t => {
                if (t.startsWith(SBS.HTMLROW)) html += t.slice(SBS.HTMLROW.length);
                else if (t.startsWith(SBS.AUX)) html += `<div class="sbs-aux">\\[${t.slice(SBS.AUX.length)}\\]</div>`;
                else html += `\\[${t}\\]`;
            });
            d.innerHTML = palette(html + `<div class="gray sbs-nota">${s.note ? s.note : '\\(\\,\\)'}</div>`);
            cont.appendChild(d);
        });
        slideState = { i: 0, n: r.slides.length };
        aggiorna();
        typeset(cont).then(adatta);
    }

    function vai(dir) {
        if (!slideState || $('sbs-out-svo').hidden) return;
        const j = slideState.i + dir;
        if (j < 0 || j >= slideState.n) return;
        slideState.i = j;
        aggiorna();
    }
    function aggiorna() {
        const sl = document.querySelectorAll('#sbs-slides .sbs-slide');
        sl.forEach((s, k) => { s.style.display = k === slideState.i ? 'block' : 'none'; });
        $('sbs-prev').disabled = slideState.i === 0;
        $('sbs-next').disabled = slideState.i === slideState.n - 1;
        $('sbs-contatore').textContent = `${slideState.i + 1} / ${slideState.n}`;
    }
    function schermoIntero() {
        const el = $('sbs-slides');
        if (!document.fullscreenElement) {
            const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
            if (p && p.catch) p.catch(() => {});
        } else if (document.exitFullscreen) document.exitFullscreen();
    }
    function abilitaSwipe(el) {
        let sx = 0, sy = 0, on = false;
        el.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; on = true; }, { passive: true });
        el.addEventListener('touchend', (e) => {
            if (!on) return; on = false;
            const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
            if (Math.abs(dx) > 50 && Math.abs(dy) < 100) vai(dx < 0 ? 1 : -1);
        }, { passive: true });
        el.addEventListener('click', (e) => {
            if (!document.fullscreenElement) return;
            vai(e.clientX > window.innerWidth / 2 ? 1 : -1);
        });
    }

    /* rimpicciolisce le formule troppo larghe (stessa scala per tutte le slide) */
    function adatta() {
        const cont = $('sbs-slides');
        if (!cont || $('sbs-out-svo').hidden) return;
        const cs = getComputedStyle(cont);
        const disponibile = cont.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 8;
        if (disponibile <= 0) return;
        const slides = [...cont.querySelectorAll('.sbs-slide')];
        const mjx = cont.querySelectorAll('mjx-container[display="true"]');
        mjx.forEach(m => { m.style.fontSize = ''; });
        let max = 0;
        slides.forEach(s => {
            const prima = s.style.display;
            s.style.display = 'block';
            s.querySelectorAll('mjx-container[display="true"]').forEach(m => {
                const inner = m.firstElementChild;
                max = Math.max(max, inner ? inner.getBoundingClientRect().width : m.scrollWidth);
            });
            s.style.display = prima;
        });
        if (max <= disponibile) return;
        const scala = Math.max(0.55, disponibile / max);
        mjx.forEach(m => { m.style.fontSize = (scala * 100).toFixed(1) + '%'; });
    }

    /* ---------------- avvio ---------------- */
    function avvio() {
        editor = new SBS.Editor($('sbs-editor'), {
            placeholder: 'tocca qui e scrivi',
            onChange: () => { calcolato = null; nascondiRisultati(); },
            onEnter: () => mostra('svo'),
            onFocus: () => tastiera(true)
        });
        $('sbs-editor').addEventListener('focus', () => tastiera(true));
        $('sbs-chiudi-tastiera').addEventListener('click', () => tastiera(false));
        $('sbs-cancella').addEventListener('click', () => { editor.clear(); editor.el.focus(); });
        $('sbs-casuale').addEventListener('click', () => {
            carica(SBS.casuale.genera(argomento));
            tastiera(false);
        });
        $('sbs-btn-sol').addEventListener('click', () => mostra('sol'));
        $('sbs-btn-svo').addEventListener('click', () => mostra('svo'));
        $('sbs-prev').addEventListener('click', () => vai(-1));
        $('sbs-next').addEventListener('click', () => vai(1));
        $('sbs-fs').addEventListener('click', schermoIntero);
        abilitaSwipe($('sbs-slides'));
        document.addEventListener('keydown', (e) => {
            if (document.activeElement === editor.el) return;
            if (e.key === 'ArrowRight') vai(1);
            else if (e.key === 'ArrowLeft') vai(-1);
        });
        document.addEventListener('fullscreenchange', () => setTimeout(adatta, 150));
        window.addEventListener('resize', () => { clearTimeout(adatta._t); adatta._t = setTimeout(adatta, 200); });
        window.addEventListener('hashchange', vista);
        costruisciHome();
        mathJaxPronto().then(() => editor.render());

        // link diretti: ?es=...&tipo=der (oppure #argomento)
        let es = null, tipo = null;
        try { const q = new URLSearchParams(location.search); es = q.get('es'); tipo = q.get('tipo'); } catch (e) { }
        if (es) {
            const k = tipo === 'der' ? 'derivate' : tipo === 'esp' ? 'esponenziali' : (/[<>≤≥]/.test(es) ? 'disequazioni' : es.includes('=') ? 'equazioni' : 'espressioni');
            try { history.replaceState(null, '', '#' + k); } catch (e) { }
            apriArgomento(k, es);
            mostra('svo');
        } else vista();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvio);
    else avvio();
})();
