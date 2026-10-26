/* =====================================================================
   StepByStep - derivate
   Stile delle schede 6 e 7:
   - a sinistra (f(x))' con in rosso la parte che stiamo derivando
   - a destra il risultato già "impaginato" ma trasparente: viene
     scritto un pezzo alla volta (in rosso il pezzo appena scritto)
   - sotto, in grigio, la spiegazione del passaggio
   - alla fine si sistemano i calcoli (se il risultato è un polinomio,
     o il numeratore lo è, si usano le stesse regole delle espressioni)
   ===================================================================== */
(function (global) {
    'use strict';
    const SBS = global.SBS;
    const { Q, SBSError, nid, emit, renderAst, variabili } = SBS;

    const isConst = (n) => variabili(n).size === 0;
    const srcOf = (n) => n.src || [n.id];

    function derivaFunzione(F) {
        const vars = variabili(F);
        if (vars.size > 1) throw new SBSError('Usa una sola lettera come variabile.');
        const v = [...vars][0] || 'x';

        const events = [];       // {note, src:[id...]}
        let prefix = '';
        function ev(note, src) {
            const full = prefix ? `${prefix} ${note}` : note;
            prefix = '';
            events.push({ note: full, src: src || [] });
            return events.length - 1;
        }
        const R = (o, k) => { o.id = nid(); o.rv = k; return o; };
        function copy(n, k) {
            const c = { ...n, id: nid(), rv: k };
            delete c.src;
            switch (n.t) {
                case 'add': c.a = n.a.map(x => copy(x, k)); break;
                case 'neg': case 'grp': case 'fn': c.a = copy(n.a, k); break;
                case 'mul': c.f = n.f.map(f => ({ op: f.op, n: copy(f.n, k) })); break;
                case 'pow': c.b = copy(n.b, k); c.e = copy(n.e, k); break;
            }
            return c;
        }
        const num = (q, k) => R({ t: 'num', v: Q.of(q) }, k);
        const X = (k) => R({ t: 'var', n: v }, k);
        const strip = (n) => (n.t === 'grp' ? strip(n.a) : n);
        const tx = (n) => SBS.astTex(n, null, 'black');

        /* c·x^n ? */
        function monoOf(n) {
            n = strip(n);
            switch (n.t) {
                case 'num': return { c: n.v, e: new Q(0) };
                case 'var': return { c: new Q(1), e: new Q(1) };
                case 'neg': { const m = monoOf(n.a); return m && { c: m.c.neg(), e: m.e }; }
                case 'pow': {
                    const b = strip(n.b), e = expQ(n.e);
                    if (b.t === 'var' && e) return { c: new Q(1), e };
                    return null;
                }
                case 'mul': {
                    let c = new Q(1), e = new Q(0);
                    for (const f of n.f) {
                        const m = monoOf(f.n);
                        if (!m) return null;
                        if (f.op === '/' || f.op === ':') {
                            if (!m.e.isZero() || m.c.isZero()) return null;
                            c = c.div(m.c);
                        } else { c = c.mul(m.c); e = e.add(m.e); }
                    }
                    return { c, e };
                }
            }
            return null;
        }
        function expQ(e) {
            e = strip(e);
            if (e.t === 'num') return e.v;
            if (e.t === 'neg') { const q = expQ(e.a); return q && q.neg(); }
            if (e.t === 'mul' && e.f.length === 2 && e.f[1].op === '/') {
                const a = expQ(e.f[0].n), b = expQ(e.f[1].n);
                return a && b && !b.isZero() ? a.div(b) : null;
            }
            return null;
        }
        /* costruisce c·x^e come albero */
        function monoAst(c, e, k) {
            let body;
            if (e.isZero()) return num(c, k);
            const xp = e.isOne() ? X(k) : R({ t: 'pow', b: X(k), e: num(e, k) }, k);
            const ca = c.abs();
            if (ca.isOne()) body = xp;
            else body = R({ t: 'mul', f: [{ op: '', n: num(ca, k) }, { op: 'impl', n: xp }] }, k);
            return c.sign() < 0 ? R({ t: 'neg', a: body }, k) : body;
        }
        const potTex = (e) => e.isOne() ? v : `${v}^{${e.tex()}}`;

        /* ---------------- regole ---------------- */
        function d(n) {
            const s = strip(n);
            if (isConst(s)) {
                ev('La derivata di una costante è \\(0\\).', srcOf(n));
                return null;
            }
            const pf = powerForm(s);
            if (pf) {
                const kk = ev(`${notaRiscrittura(v, pf, tx(s))} Poi regola della potenza: l'esponente scende davanti e diminuisce di 1.`, srcOf(n));
                return monoAst(pf.c.mul(pf.e), pf.e.sub(1), kk);
            }
            const m = monoOf(s);
            if (m) return dMono(n, m);
            switch (s.t) {
                case 'add': return dAdd(s, n);
                case 'neg': {
                    const k = events.length;
                    const inner = d(s.a);
                    if (!inner) return null;
                    return R({ t: 'neg', a: inner }, k);
                }
                case 'mul': return dMul(s, n);
                case 'pow': return dPow(s, n);
                case 'fn': return dFn(s, n);
                case 'var': return dMono(n, { c: new Q(1), e: new Q(1) });
            }
            throw new SBSError('Questa funzione non so ancora derivarla.');
        }

        function dMono(n, m) {
            if (m.e.isZero()) { ev('La derivata di una costante è \\(0\\).', srcOf(n)); return null; }
            let note;
            if (m.e.isOne() && m.c.isOne()) note = `La derivata di \\(${v}\\) è \\(1\\).`;
            else if (m.e.isOne()) note = `La derivata di \\(${m.c.tex()}${v}\\) è il suo coefficiente.`;
            else note = `Regola della potenza: \\((${v}^n)' = n\\,${v}^{n-1}\\). L'esponente scende davanti e diminuisce di 1.`;
            const k = ev(note, srcOf(n));
            return monoAst(m.c.mul(m.e), m.e.sub(1), k);
        }

        function dAdd(s, n) {
            ev('La derivata di una somma è la somma delle derivate: deriviamo un termine alla volta.', srcOf(n));
            const kids = [];
            for (const c of s.a) {
                const r = d(c);
                if (r) kids.push(r);
            }
            if (!kids.length) return null;
            if (kids.length === 1) return kids[0];
            return R({ t: 'add', a: kids }, kids[0].rv);
        }

        function dMul(s, n) {
            const cst = [], rest = [];
            s.f.forEach(f => (isConst(f.n) ? cst : rest).push(f));
            // c / g(x): regola del rapporto con numeratore costante
            const di = s.f.findIndex(f => (f.op === '/' || f.op === ':') && !isConst(f.n));
            if (di > 0) {
                const numF = s.f.slice(0, di), den = s.f[di], after = s.f.slice(di + 1);
                const quot = { t: 'mul', f: [...numF.map((f, i) => ({ op: i ? f.op : '', n: f.n })), { op: '/', n: den.n }], src: [...numF, den].map(f => f.n.id), id: -1 };
                if (after.length) {
                    if (after.every(f => isConst(f.n))) {
                        // (f/g)·c : porto fuori la costante
                    } else return leibniz(quot, virtMul(after), n);
                } else return quotient(virtMul(numF), den.n, n);
            }
            if (cst.length && rest.length) {
                const k = ev('Portiamo la costante moltiplicativa fuori dal segno di derivazione.', cst.map(f => f.n.id));
                let cAst;
                const cf = cst.map((f, i) => ({ op: i === 0 && f.op !== '/' && f.op !== ':' ? '' : f.op, n: copy(f.n, k) }));
                if (cf[0].op === '/' || cf[0].op === ':') cf.unshift({ op: '', n: num(1, k) });
                cAst = cf.length === 1 ? cf[0].n : R({ t: 'mul', f: cf }, k);
                const restNode = virtMul(rest);
                const D = d(restNode);
                if (!D) return null;
                return R({ t: 'mul', f: [{ op: '', n: cAst }, { op: '·', n: D }] }, k);
            }
            // quoziente
            const qi = rest.findIndex((f, i) => i > 0 && (f.op === '/' || f.op === ':'));
            if (qi > 0) {
                const numF = rest.slice(0, qi), den = rest[qi], after = rest.slice(qi + 1);
                const quot = { t: 'mul', f: [...numF.map((f, i) => ({ op: i ? f.op : '', n: f.n })), { op: '/', n: den.n }], src: [...numF, den].map(f => f.n.id), id: -1 };
                if (after.length) return leibniz(quot, virtMul(after), n);
                return quotient(virtMul(numF), den.n, n);
            }
            if (rest.length === 1) return d(rest[0].n);
            return leibniz(rest[0].n, virtMul(rest.slice(1)), n);
        }
        function virtMul(list) {
            if (list.length === 1 && list[0].op !== '/' && list[0].op !== ':') return list[0].n;
            const f = list.map((x, i) => ({ op: i === 0 ? '' : x.op, n: x.n }));
            if (list[0].op === '/' || list[0].op === ':') f.unshift({ op: '', n: { t: 'num', v: new Q(1), id: -1 } });
            return { t: 'mul', f, src: list.map(x => x.n.id), id: -1 };
        }

        function leibniz(f, g, n) {
            const k = ev("Usiamo la regola di Leibniz (derivata del prodotto): \\((f\\cdot g)' = f'\\,g + f\\,g'\\).", srcOf(n));
            prefix = 'Deriviamo il primo fattore.';
            const df = d(f);
            const kg = ev('Copiamo il secondo fattore così com\'è.', srcOf(g));
            const g1 = copy(g, kg);
            const kf = ev('Copiamo il primo fattore così com\'è.', srcOf(f));
            const f1 = copy(f, kf);
            prefix = 'Deriviamo il secondo fattore.';
            const dg = d(g);
            const t1 = df ? R({ t: 'mul', f: [{ op: '', n: df }, { op: '·', n: g1 }] }, k) : null;
            const t2 = dg ? R({ t: 'mul', f: [{ op: '', n: f1 }, { op: '·', n: dg }] }, k) : null;
            if (t1 && t2) return R({ t: 'add', a: [t1, t2] }, k);
            return t1 || t2;
        }

        function quotient(f, g, n) {
            const k = ev("Usiamo la regola della derivata del rapporto: \\(\\left(\\dfrac{f}{g}\\right)' = \\dfrac{f'\\,g - f\\,g'}{g^2}\\).", srcOf(n));
            prefix = 'Deriviamo il numeratore.';
            const df = d(f);
            const kg = ev('Moltiplichiamo per il denominatore così com\'è.', srcOf(g));
            const g1 = copy(g, kg);
            const kf = ev('Copiamo il numeratore così com\'è.', srcOf(f));
            const f1 = copy(f, kf);
            prefix = 'Deriviamo il denominatore.';
            const dg = d(g);
            const kd = ev('Al denominatore del risultato scriviamo il quadrato del denominatore della frazione.', srcOf(g));
            const den = R({ t: 'pow', b: copy(g, kd), e: num(2, kd) }, kd);
            const t1 = df ? R({ t: 'mul', f: [{ op: '', n: df }, { op: '·', n: g1 }] }, k) : null;
            const t2 = dg ? R({ t: 'neg', a: R({ t: 'mul', f: [{ op: '', n: f1 }, { op: '·', n: dg }] }, k) }, k) : null;
            let numer;
            if (t1 && t2) numer = R({ t: 'add', a: [t1, t2] }, k);
            else numer = t1 || t2;
            return R({ t: 'mul', f: [{ op: '', n: numer }, { op: '/', n: den }] }, k);
        }

        /* funzione composta: f(u)' = f'(u)·u' */
        function chain(outerNote, buildOuter, u, n) {
            const ux = strip(u).t === 'var';
            const k = ev(ux ? outerNote : `${outerNote} L'argomento non è solo \\(${v}\\): è una funzione composta, quindi deriviamo la funzione esterna lasciando invariato l'argomento...`, srcOf(n));
            const outer = buildOuter(k);
            if (ux) return outer;
            prefix = `...e moltiplichiamo per la derivata dell'argomento \\(${tx(strip(u))}\\).`;
            const du = d(u);
            if (!du) return null;
            return R({ t: 'mul', f: [{ op: '', n: outer }, { op: '·', n: du }] }, k);
        }

        function dPow(s, n) {
            const b = strip(s.b);
            if (b.t === 'const' && b.n === 'e') {
                return chain(`La derivata di \\(e^{${v}}\\) è \\(e^{${v}}\\) stessa.`,
                    (k) => copy(s, k), s.e, n);
            }
            if (isConst(s.b)) {
                return chain(`Derivata dell'esponenziale: \\((a^{${v}})' = a^{${v}}ln(a)\\).`,
                    (k) => R({ t: 'mul', f: [{ op: '', n: copy(s, k) }, { op: '·', n: R({ t: 'fn', n: 'ln', a: copy(b, k) }, k) }] }, k),
                    s.e, n);
            }
            if (!isConst(s.e)) throw new SBSError('Le funzioni con la variabile sia nella base sia nell\'esponente non sono gestite.');
            const e = expQ(s.e);
            if (!e) throw new SBSError('Esponente non riconosciuto: scrivi un numero (anche frazionario).');
            const ne = e.sub(1);
            return chain(`Deriviamo la potenza: l'esponente \\(${e.tex()}\\) scende davanti e diminuisce di 1.`,
                (k) => {
                    const base = copy(s.b, k);
                    const p = ne.isZero() ? null : (ne.isOne() ? base : R({ t: 'pow', b: base, e: num(ne, k) }, k));
                    if (!p) return num(e, k);
                    if (e.isOne()) return p;
                    return R({ t: 'mul', f: [{ op: '', n: num(e, k) }, { op: 'impl', n: p }] }, k);
                }, s.b, n);
        }

        function dFn(s, n) {
            const u = s.a;
            const U = (k) => copy(u, k);
            const ut = tx(strip(u));
            if (s.n === 'sqrt' && s.idx) {
                // radice n-esima di una funzione: la scriviamo come potenza con esponente 1/n
                prefix = `Scriviamo la radice come potenza: \\(\\sqrt[${s.idx}]{${ut}} = \\left(${ut}\\right)^{\\frac{1}{${s.idx}}}\\).`;
                return dPow({ t: 'pow', b: u, e: { t: 'num', v: new Q(1, s.idx), id: -1 }, id: -1, src: srcOf(n) }, n);
            }
            switch (s.n) {
                case 'sin': return chain(`La derivata di \\(sin\\) è \\(cos\\).`, (k) => R({ t: 'fn', n: 'cos', a: U(k) }, k), u, n);
                case 'cos': return chain(`La derivata di \\(cos\\) è \\(-sin\\).`, (k) => R({ t: 'neg', a: R({ t: 'fn', n: 'sin', a: U(k) }, k) }, k), u, n);
                case 'tan': return chain(`La derivata di \\(tan\\) è \\(\\dfrac{1}{cos^2}\\).`,
                    (k) => R({ t: 'mul', f: [{ op: '', n: num(1, k) }, { op: '/', n: R({ t: 'pow', b: R({ t: 'fn', n: 'cos', a: U(k) }, k), e: num(2, k) }, k) }] }, k), u, n);
                case 'ln': return chain(`La derivata di \\(ln(${ut})\\) è \\(\\dfrac{1}{${ut}}\\).`,
                    (k) => R({ t: 'mul', f: [{ op: '', n: num(1, k) }, { op: '/', n: U(k) }] }, k), u, n);
                case 'sqrt': return chain(`La derivata di \\(\\sqrt{${ut}}\\) è \\(\\dfrac{1}{2\\sqrt{${ut}}}\\).`,
                    (k) => R({ t: 'mul', f: [{ op: '', n: num(1, k) }, { op: '/', n: R({ t: 'mul', f: [{ op: '', n: num(2, k) }, { op: 'impl', n: R({ t: 'fn', n: 'sqrt', a: U(k) }, k) }] }, k) }] }, k), u, n);
            }
            throw new SBSError('Funzione non gestita.');
        }

        /* ---------------- calcolo e slide ---------------- */
        const D = d(F);
        const Rres = D || num(0, 0);
        const left = (colors) => [ '\\left(', { g: ['{', [renderAst(F)], '}'] }, "\\right)' = " ];
        const leftPlain = emit(left(), null, 'black') ;

        function line(k, srcIds) {
            const colors = new Map();
            (srcIds || []).forEach(id => colors.set(id, 'red'));
            walk(Rres, (node) => {
                if (node.rv === undefined) return;
                colors.set(node.id, node.rv > k ? 'transparent' : (node.rv === k ? 'red' : 'black'));
            });
            return emit([...left(), renderAst(Rres)], colors, 'black');
        }
        function walk(n, fn) {
            fn(n);
            switch (n.t) {
                case 'add': n.a.forEach(c => walk(c, fn)); break;
                case 'neg': case 'grp': case 'fn': walk(n.a, fn); break;
                case 'mul': n.f.forEach(f => walk(f.n, fn)); break;
                case 'pow': walk(n.b, fn); walk(n.e, fn); break;
            }
        }
        const revealedAt = new Set();
        walk(Rres, (node) => { if (node.rv !== undefined) revealedAt.add(node.rv); });

        const slides = [];
        const push = (rows, note) => {
            const last = slides[slides.length - 1];
            if (last && last.rows.join('|') === rows.join('|') && last.note === note) return;
            slides.push({ rows, note });
        };
        push([line(-1)], '');
        events.forEach((e, k) => {
            push([line(k - 1)], e.note);
            if (e.src.length) push([line(k - 1, e.src)], e.note);
            if (revealedAt.has(k)) push([line(k)], e.note);
        });
        const fineNote = 'Abbiamo finito di applicare le regole di derivazione.';
        push([line(events.length)], fineNote);

        return { D: Rres, slides, leftPlain, v, F };
    }

    /* ---------------- sistemazione dei calcoli ---------------- */
    // appiattisce i prodotti e mette tra parentesi ciò che serve, per passarlo al motore delle espressioni
    function prep(n) {
        const P = (o) => { o.id = nid(); return o; };
        switch (n.t) {
            case 'add': return P({ t: 'add', a: n.a.map(prep) });
            case 'neg': return P({ t: 'neg', a: prep(n.a) });
            case 'grp': return P({ t: 'grp', k: n.k, a: prep(n.a) });
            case 'pow': {
                const b = prep(n.b);
                const needs = b.t === 'add' || b.t === 'neg' || b.t === 'mul';
                return P({ t: 'pow', b: needs ? P({ t: 'grp', k: '(', a: b }) : b, e: prep(n.e) });
            }
            case 'mul': {
                const f = [];
                n.f.forEach((x, i) => {
                    const c = prep(x.n);
                    const op = i === 0 ? '' : x.op;
                    if (c.t === 'mul' && (op === '' || op === '·' || op === 'impl') && !c.f.some(y => y.op === '/' || y.op === ':')) {
                        c.f.forEach((y, j) => f.push({ op: j === 0 ? (op || '') : y.op, n: y.n }));
                    } else if ((c.t === 'add' || (c.t === 'neg' && i > 0)) && op !== '/') {
                        f.push({ op: op === '' && i === 0 ? '' : '·', n: P({ t: 'grp', k: '(', a: c }) });
                    } else f.push({ op, n: c });
                });
                if (f.length && f[0].op !== '') f[0] = { ...f[0], op: '' };
                return P({ t: 'mul', f });
            }
            default: return { ...n, id: nid() };
        }
    }

    /* ---------------- semplificazione generica (funzioni non polinomiali) ---------------- */
    function tidy(n) {
        const P = (o) => { o.id = nid(); return o; };
        const num = (q) => P({ t: 'num', v: Q.of(q) });
        const key = (x) => SBS.astTex(x, null, 'black');
        switch (n.t) {
            case 'num': case 'var': case 'const': return { ...n, id: nid() };
            case 'grp': return tidy(n.a);
            case 'fn': { const f = P({ t: 'fn', n: n.n, a: tidy(n.a) }); if (n.idx) f.idx = n.idx; return f; }
            case 'neg': {
                const a = tidy(n.a);
                if (a.t === 'num') return num(a.v.neg());
                if (a.t === 'neg') return a.a;
                return P({ t: 'neg', a });
            }
            case 'add': {
                const kids = [];
                const push = (x) => {
                    if (x.t === 'add') x.a.forEach(push);
                    else if (!(x.t === 'num' && x.v.isZero())) kids.push(x);
                };
                n.a.forEach(c => push(tidy(c)));
                if (!kids.length) return num(0);
                if (kids.length === 1) return kids[0];
                return P({ t: 'add', a: kids });
            }
            case 'pow': {
                let b = tidy(n.b); const e = tidy(n.e);
                if (e.t === 'num' && e.v.sign() < 0) {
                    // esponente negativo: diventa una frazione
                    return tidy(P({ t: 'mul', f: [{ op: '', n: num(1) }, { op: '/', n: P({ t: 'pow', b, e: num(e.v.neg()) }) }] }));
                }
                if (e.t === 'num') {
                    if (e.v.isOne()) return b;
                    if (e.v.isZero()) return num(1);
                    if (b.t === 'pow' && b.e.t === 'num') return P({ t: 'pow', b: b.b, e: num(b.e.v.mul(e.v)) });
                    if (b.t === 'num' && e.v.isInt() && e.v.n > 0) return num(b.v.pow(e.v.n));
                }
                return P({ t: 'pow', b, e });
            }
            case 'mul': {
                let coef = new Q(1), xexp = new Q(0), xname = null;
                const numF = [], denF = [];
                const add = (x, inv) => {
                    if (x.t === 'num') { coef = inv ? coef.div(x.v) : coef.mul(x.v); }
                    else if (x.t === 'neg') { coef = coef.neg(); add(x.a, inv); }
                    else if (x.t === 'mul') x.f.forEach(y => add(y.n, inv !== (y.op === '/' || y.op === ':')));
                    else if (x.t === 'var') { xname = x.n; xexp = inv ? xexp.sub(1) : xexp.add(1); }
                    else if (x.t === 'pow' && x.b.t === 'var' && x.e.t === 'num') { xname = x.b.n; xexp = inv ? xexp.sub(x.e.v) : xexp.add(x.e.v); }
                    else if (x.t === 'pow' && x.e.t === 'num' && x.e.v.sign() < 0) (inv ? numF : denF).push(x.e.v.eq(-1) ? x.b : P({ t: 'pow', b: x.b, e: num(x.e.v.neg()) }));
                    else (inv ? denF : numF).push(x);
                };
                n.f.forEach(f => add(tidy(f.n), f.op === '/' || f.op === ':'));
                if (coef.isZero()) return num(0);
                const group = (list) => {
                    const out = [], idx = new Map();
                    for (const x of list) {
                        const base = x.t === 'pow' && x.e.t === 'num' ? x.b : x;
                        const ex = x.t === 'pow' && x.e.t === 'num' ? x.e.v : new Q(1);
                        const k = key(base);
                        if (idx.has(k)) out[idx.get(k)].e = out[idx.get(k)].e.add(ex);
                        else { idx.set(k, out.length); out.push({ b: base, e: ex }); }
                    }
                    return out;
                };
                const build = (list) => list.filter(({ e }) => e.sign() > 0).map(({ b, e }) => e.isOne() ? b : P({ t: 'pow', b, e: num(e) }));
                const X = (e) => { const v = P({ t: 'var', n: xname }); return e.isOne() ? v : P({ t: 'pow', b: v, e: num(e) }); };
                const nl = [], dl = [];
                const ca = coef.abs();
                if (xexp.sign() > 0) nl.push(X(xexp));
                if (xexp.sign() < 0) dl.push(X(xexp.neg()));
                // semplifico i fattori uguali tra numeratore e denominatore
                const gn = group(numF), gd = group(denF);
                for (const a of gn) for (const b of gd) {
                    if (key(a.b) !== key(b.b)) continue;
                    const m = a.e.sub(b.e).sign() < 0 ? a.e : b.e;
                    a.e = a.e.sub(m); b.e = b.e.sub(m);
                }
                nl.push(...build(gn)); dl.push(...build(gd));
                if (dl.length) {
                    if (ca.n !== 1 || !nl.length) nl.unshift(num(ca.n));
                    if (ca.d !== 1) dl.unshift(num(ca.d));
                } else if (!ca.isOne() || !nl.length) nl.unshift(num(ca));
                const f = nl.map((x, i) => ({ op: i ? 'impl' : '', n: x }));
                let res;
                if (dl.length) {
                    const den = dl.length === 1 ? dl[0] : P({ t: 'mul', f: dl.map((x, i) => ({ op: i ? 'impl' : '', n: x })) });
                    res = P({ t: 'mul', f: [...f, { op: '/', n: den }] });
                } else res = f.length === 1 ? f[0].n : P({ t: 'mul', f });
                return coef.sign() < 0 ? P({ t: 'neg', a: res }) : res;
            }
        }
        return n;
    }

    /* x^(m/n) -> radice n-esima di x^m (dopo la semplificazione) */
    function rootify(n) {
        const P = (o) => { o.id = nid(); return o; };
        switch (n.t) {
            case 'add': return P({ t: 'add', a: n.a.map(rootify) });
            case 'neg': case 'grp': { const c = P({ t: n.t, k: n.k, a: rootify(n.a) }); return c; }
            case 'fn': { const f = P({ t: 'fn', n: n.n, a: rootify(n.a) }); if (n.idx) f.idx = n.idx; return f; }
            case 'mul': return P({ t: 'mul', f: n.f.map(f => ({ op: f.op, n: rootify(f.n) })) });
            case 'pow': {
                const b = rootify(n.b);
                if (n.e.t === 'num' && !n.e.v.isInt() && n.e.v.sign() > 0) {
                    const m = n.e.v.n, k = n.e.v.d;
                    const r = P({ t: 'fn', n: 'sqrt', a: m === 1 ? b : P({ t: 'pow', b, e: P({ t: 'num', v: new Q(m) }) }) });
                    if (k !== 2) r.idx = k;
                    return r;
                }
                return P({ t: 'pow', b, e: rootify(n.e) });
            }
        }
        return n;
    }
    const tidyR = (n) => rootify(tidy(n));

    const stripG = (n) => (n.t === 'grp' ? stripG(n.a) : n);
    function expQm(e) {
        e = stripG(e);
        if (e.t === 'num') return e.v;
        if (e.t === 'neg') { const q = expQm(e.a); return q && q.neg(); }
        if (e.t === 'mul' && e.f.length === 2 && e.f[1].op === '/') {
            const a = expQm(e.f[0].n), b = expQm(e.f[1].n);
            return a && b && !b.isZero() ? a.div(b) : null;
        }
        return null;
    }
    /* c · x^e scritto con radici o con la x al denominatore? -> {c, e, radice, frazione} */
    function powerForm(node) {
        let c = new Q(1), e = new Q(0), radice = false, frazione = false, ok = true;
        const espX = (x) => {
            x = stripG(x);
            if (x.t === 'var') return new Q(1);
            if (x.t === 'pow' && stripG(x.b).t === 'var') return expQm(x.e);
            return null;
        };
        const walk = (x, inv) => {
            if (!ok) return;
            x = stripG(x);
            switch (x.t) {
                case 'num': c = inv ? c.div(x.v) : c.mul(x.v); return;
                case 'neg': c = c.neg(); walk(x.a, inv); return;
                case 'var': case 'pow': {
                    const q = espX(x);
                    if (!q) { ok = false; return; }
                    e = inv ? e.sub(q) : e.add(q);
                    if (inv) frazione = true;
                    if (!q.isInt()) radice = true;
                    return;
                }
                case 'fn': {
                    if (x.n !== 'sqrt') { ok = false; return; }
                    const q = espX(x.a);
                    if (!q) { ok = false; return; }
                    const r = q.div(x.idx || 2);
                    e = inv ? e.sub(r) : e.add(r);
                    radice = true;
                    if (inv) frazione = true;
                    return;
                }
                case 'mul': x.f.forEach(f => walk(f.n, inv !== (f.op === '/' || f.op === ':'))); return;
            }
            ok = false;
        };
        walk(node, false);
        if (!ok || e.isZero() || c.isZero()) return null;
        if (!radice && !frazione && e.isInt() && e.sign() > 0) return null;   // monomio "normale"
        return { c, e, radice: radice || !e.isInt(), frazione: frazione || e.sign() < 0 };
    }
    /* testi LaTeX per le potenze */
    const expTex = (q) => (q.isInt() ? `${q.n}` : `${q.n < 0 ? '-' : ''}\\frac{${Math.abs(q.n)}}{${q.d}}`);
    const xPow = (v, q) => (q.isOne() ? v : `${v}^{${expTex(q)}}`);
    const coefT = (q) => (q.isOne() ? '' : q.eq(-1) ? '-' : q.tex());
    const radT = (v, q) => { const m = q.n, k = q.d; const rad = m === 1 ? v : `${v}^{${m}}`; return k === 2 ? `\\sqrt{${rad}}` : `\\sqrt[${k}]{${rad}}`; };
    function potenzaTex(v, pf) { return `${coefT(pf.c)}${xPow(v, pf.e)}`; }
    function notaRiscrittura(v, pf, testo) {
        const cosa = pf.radice && pf.frazione ? 'la radice al denominatore' : pf.radice ? 'la radice' : 'la frazione';
        const come = pf.e.isInt() ? 'esponente negativo' : (pf.e.sign() < 0 ? 'esponente frazionario negativo' : 'esponente frazionario');
        return `Scriviamo ${cosa} come potenza con ${come}: \\(${testo} = ${potenzaTex(v, pf)}\\).`;
    }

    /* derivata di una sola potenza "nascosta" (radice o frazione): catena di uguaglianze come sul quaderno */
    function derivaPotenza(F, pf) {
        const v = [...variabili(F)][0] || 'x';
        const L0 = `\\left(${SBS.astTex(F, null, 'black')}\\right)'`;
        const { c, e } = pf;
        const k = c.mul(e), p = e.sub(1);
        const rows = [];   // {tex, note, aux:[]}
        rows.push({ tex: `\\left(${potenzaTex(v, pf)}\\right)'`, note: notaRiscrittura(v, pf, SBS.astTex(F, null, 'black')) });
        const regola = `Regola della potenza: \\((${v}^n)' = n\\,${v}^{n-1}\\): l'esponente scende davanti e diminuisce di 1.`;
        const fuori = c.isOne() ? '' : `${coefT(c)}\\cdot `;
        const wrap = (t) => (c.isOne() ? t : `\\left(${t}\\right)`);
        if (e.isInt()) {
            rows.push({ tex: `${fuori}${wrap(`${coefT(e)}${xPow(v, p)}`)}`, note: regola });
        } else {
            rows.push({ tex: `${fuori}${wrap(`${e.tex()}\\,${v}^{${expTex(e)} - 1}`)}`, note: regola });
            rows.push({
                tex: `${fuori}${wrap(`${e.tex()}\\,${xPow(v, p)}`)}`, note: 'Calcoliamo il nuovo esponente.',
                aux: [`${expTex(e)} - 1 = ${expTex(e)} - \\frac{${e.d}}{${e.d}} = ${expTex(p)}`]
            });
        }
        if (!c.isOne()) rows.push({ tex: `${coefT(k)}${xPow(v, p)}`, note: 'Moltiplichiamo i numeri.' });
        // si torna alla forma con frazioni e radici
        if (p.sign() < 0) {
            const q = p.neg();
            if (!k.isInt() || !q.isInt()) {
                rows.push({ tex: `${k.tex()}\\,\\dfrac{1}{${xPow(v, q)}}`, note: `Un esponente negativo diventa una frazione: \\(${v}^{-n} = \\dfrac{1}{${v}^n}\\).` });
                if (!q.isInt()) rows.push({ tex: `${k.tex()}\\,\\dfrac{1}{${radT(v, q)}}`, note: `Un esponente frazionario diventa una radice: \\(${v}^{\\frac{m}{n}} = \\sqrt[n]{${v}^m}\\).` });
            }
        } else if (!p.isInt()) {
            rows.push({ tex: `${coefT(k)}${radT(v, p)}`, note: `Un esponente frazionario diventa una radice: \\(${v}^{\\frac{m}{n}} = \\sqrt[n]{${v}^m}\\).` });
        }
        // risultato finale semplificato
        const PN0 = (o) => { o.id = nid(); return o; };
        const xp = p.isOne() ? PN0({ t: 'var', n: v }) : PN0({ t: 'pow', b: PN0({ t: 'var', n: v }), e: PN0({ t: 'num', v: p }) });
        const D = p.isZero() ? PN0({ t: 'num', v: k }) : PN0({ t: 'mul', f: [{ op: '', n: PN0({ t: 'num', v: k }) }, { op: 'impl', n: xp }] });
        const fin = tidyR(D);
        const finTex = SBS.astTex(fin, null, 'black');
        if (finTex !== rows[rows.length - 1].tex) {
            rows.push({ tex: finTex, note: p.sign() < 0 ? (k.isInt() && p.isInt() ? `Un esponente negativo diventa una frazione: \\(${v}^{-n} = \\dfrac{1}{${v}^n}\\).` : 'Moltiplichiamo le frazioni.') : 'Scriviamo il risultato.' });
        }
        // slide: un'unica catena di uguaglianze, la riga nuova in rosso
        const blocco = (n, rosso) => {
            const righe = rows.slice(0, n).map((r, i) => (i === 0 ? `${L0} &= ` : '&= ') + (rosso && i === n - 1 ? `\\color{red}{}${r.tex}` : r.tex));
            if (!n) righe.push(`${L0} &= \\;?`);
            return `\\begin{aligned}${righe.join('\\\\[4pt]')}\\end{aligned}`;
        };
        const slides = [{ rows: [blocco(0)], note: '' }];
        rows.forEach((r, i) => {
            slides.push({ rows: [blocco(i + 1, true)], note: r.note });
            (r.aux || []).forEach(a => slides.push({ rows: [blocco(i + 1, true), SBS.AUX + a], note: r.note }));
        });
        slides.push({ rows: [blocco(rows.length, false)], note: '' });
        const finalFull = `${L0} = ${finTex}`;
        return {
            tipo: 'derivata', consegna: 'Calcolare la derivata della funzione',
            startTex: SBS.astTex(F, null, 'black'), slides, v,
            valFinal: (x) => SBS.valuta(fin, x),
            risultato: { kind: 'der', tex: finalFull, html: `La derivata è \\(${finalFull}\\).` }
        };
    }

    function hasPolyPow(n) {
        switch (n.t) {
            case 'pow': return (n.b.t === 'add' || (n.b.t === 'grp' && n.b.a.t === 'add')) || hasPolyPow(n.b);
            case 'add': return n.a.some(hasPolyPow);
            case 'neg': case 'grp': case 'fn': return hasPolyPow(n.a);
            case 'mul': return n.f.some(f => hasPolyPow(f.n));
        }
        return false;
    }

    /* ---------------- raccoglimento a fattor comune ---------------- */
    const PN = (o) => { o.id = nid(); return o; };
    const numN = (q) => PN({ t: 'num', v: Q.of(q) });
    const keyOf = (x) => SBS.astTex(x, null, 'black');
    function fresh(n) {
        const c = { ...n, id: nid() };
        switch (n.t) {
            case 'add': c.a = n.a.map(fresh); break;
            case 'neg': case 'grp': case 'fn': c.a = fresh(n.a); break;
            case 'mul': c.f = n.f.map(f => ({ op: f.op, n: fresh(f.n) })); break;
            case 'pow': c.b = fresh(n.b); c.e = fresh(n.e); break;
        }
        return c;
    }
    /* scompone un termine in: coefficiente, potenza di x, altri fattori (num/den) */
    function decompose(node) {
        const d = { coef: new Q(1), xexp: new Q(0), xname: null, num: [], den: [] };
        const addF = (list, b, e) => {
            const k = keyOf(b);
            const f = list.find(x => x.key === k);
            if (f) f.e = f.e.add(e); else list.push({ b, e, key: k });
        };
        const walk = (x, inv) => {
            if (x.t === 'num') d.coef = inv ? d.coef.div(x.v) : d.coef.mul(x.v);
            else if (x.t === 'neg') { d.coef = d.coef.neg(); walk(x.a, inv); }
            else if (x.t === 'grp') walk(x.a, inv);
            else if (x.t === 'mul') x.f.forEach(y => walk(y.n, inv !== (y.op === '/' || y.op === ':')));
            else if (x.t === 'var') { d.xname = x.n; d.xexp = inv ? d.xexp.sub(1) : d.xexp.add(1); }
            else if (x.t === 'pow' && x.b.t === 'var' && x.e.t === 'num') { d.xname = x.b.n; d.xexp = inv ? d.xexp.sub(x.e.v) : d.xexp.add(x.e.v); }
            else if (x.t === 'pow' && x.e.t === 'num' && x.e.v.sign() > 0) addF(inv ? d.den : d.num, x.b, x.e.v);
            else addF(inv ? d.den : d.num, x, new Q(1));
        };
        walk(node, false);
        return d;
    }
    function buildProd(coefAbs, xname, xexp, facs) {
        const list = [];
        if (!coefAbs.isOne()) list.push(numN(coefAbs));
        if (xexp.sign() > 0) {
            const v = PN({ t: 'var', n: xname });
            list.push(xexp.isOne() ? v : PN({ t: 'pow', b: v, e: numN(xexp) }));
        }
        facs.forEach(({ b, e }) => { if (e.sign() > 0) list.push(e.isOne() ? fresh(b) : PN({ t: 'pow', b: fresh(b), e: numN(e) })); });
        if (!list.length) return numN(coefAbs);
        if (list.length === 1) return list[0];
        return PN({ t: 'mul', f: list.map((n, i) => ({ op: i ? 'impl' : '', n })) });
    }
    function factorAdd(add, soloSeNonNumerico) {
        const terms = add.a.map(c => decompose(c));
        if (terms.some(t => t.den.length || t.xexp.sign() < 0)) return null;
        const xname = (terms.find(t => t.xname) || {}).xname || 'x';
        const allInt = terms.every(t => t.coef.isInt());
        let g = allInt ? terms.reduce((acc, t) => SBS.gcd(acc, t.coef.n), 0) : 1;
        if (!g) g = 1;
        let xmin = terms.reduce((m, t) => (m === null || t.xexp.sub(m).sign() < 0) ? t.xexp : m, null);
        if (!xmin || xmin.sign() < 0) xmin = new Q(0);
        const common = [];
        for (const f of terms[0].num) {
            let e = f.e;
            const ok = terms.every(t => { const h = t.num.find(x => x.key === f.key); if (!h) return false; if (h.e.sub(e).sign() < 0) e = h.e; return true; });
            if (ok) common.push({ b: f.b, e, key: f.key });
        }
        if (g === 1 && xmin.isZero() && !common.length) return null;
        if (soloSeNonNumerico && xmin.isZero() && !common.length) return null;
        const G = new Q(g);
        const C = () => buildProd(G, xname, xmin, common);
        const rests = terms.map(t => {
            const c = t.coef.div(G);
            const facs = t.num.map(f => { const cm = common.find(x => x.key === f.key); return { b: f.b, e: cm ? f.e.sub(cm.e) : f.e }; });
            return { neg: c.sign() < 0, node: buildProd(c.abs(), xname, t.xexp.sub(xmin), facs) };
        });
        const blue = [];
        const spread = PN({
            t: 'add', a: rests.map(r => {
                const cc = C(); blue.push(cc.id);
                const m = PN({ t: 'mul', f: [{ op: '', n: cc }, { op: '·', n: fresh(r.node) }] });
                return r.neg ? PN({ t: 'neg', a: m }) : m;
            })
        });
        const inner = PN({ t: 'add', a: rests.map(r => r.neg ? PN({ t: 'neg', a: r.node }) : r.node) });
        const Cf = C(); blue.push(Cf.id);
        const factored = PN({ t: 'mul', f: [{ op: '', n: Cf }, { op: 'impl', n: PN({ t: 'grp', k: '(', a: inner }) }] });
        return { C: C(), spread, factored, blue };
    }

    function sideToAst(side, v) {
        const terms = side.map(t => {
            const body = buildProd(t.c, v, new Q(t.d), []);
            return t.s < 0 ? PN({ t: 'neg', a: body }) : body;
        });
        if (!terms.length) return numN(0);
        return terms.length === 1 ? terms[0] : PN({ t: 'add', a: terms });
    }

    function deriva(F) {
        const pf0 = powerForm(F);
        if (pf0) return derivaPotenza(F, pf0);
        const res = derivaFunzione(F);
        const slides = res.slides.slice();
        const pre = res.leftPlain;
        const conv = SBS.algebra.convertibile;
        const nota = 'Ora che abbiamo applicato le regole di derivazione sistemiamo i calcoli.';
        let E = res.D;                       // risultato corrente (albero)
        const texOf = (n, colors) => SBS.astTex(n, colors || null, 'black');

        const pushAlg = (alg, firstNote) => {
            alg.slides.forEach((s, i) => {
                const last = slides[slides.length - 1];
                if (last && last.rows.join('|') === s.rows.join('|')) return;
                slides.push({ rows: s.rows, note: i === 0 ? firstNote : (s.note || '') });
            });
        };
        const tidyStep = (T, note) => {
            const tex = texOf(T);
            if (tex === texOf(E)) return false;
            slides.push({ rows: [`${pre}\\color{red}{}${tex}`], note });
            slides.push({ rows: [`${pre}${tex}`], note });
            E = T;
            return true;
        };

        const P = prep(res.D);
        const isQuot = (x) => x.t === 'mul' && x.f.length === 2 && x.f[1].op === '/';
        let done = false;
        if (!hasPolyPow(res.D) && conv(P)) {
            const alg = SBS.algebra.espressione(P, { pre, post: '' }, 'black');
            if (alg.slides.length > 1) {
                pushAlg(alg, nota);
                E = sideToAst(alg.finalLine.L, alg.v);
            }
            done = true;
        } else if (isQuot(P) && !hasPolyPow(P.f[0].n) && conv(P.f[0].n.t === 'grp' ? P.f[0].n.a : P.f[0].n)) {
            const den = tidyR(res.D.f[1].n);
            const denTex = texOf(den);
            const N = P.f[0].n.t === 'grp' ? P.f[0].n.a : P.f[0].n;
            const alg = SBS.algebra.espressione(N, { pre: pre + '\\dfrac{', post: `}{${denTex}}` }, 'black');
            if (alg.slides.length > 1) {
                pushAlg(alg, nota + ' Il denominatore lo lasciamo così com\'è.');
                E = PN({ t: 'mul', f: [{ op: '', n: sideToAst(alg.finalLine.L, alg.v) }, { op: '/', n: den }] });
                done = true;
                const fl = alg.finalLine;
                if (fl.L.length === 1) tidyStep(tidyR(E), 'Semplifichiamo la frazione.');
            }
        }
        if (!done) {
            const potenze = /\^\{-|\\frac/.test(texOf(res.D));
            tidyStep(tidyR(res.D), nota + (potenze
                ? ' Riscriviamo le potenze con esponente negativo come frazioni e quelle con esponente frazionario come radici; mettiamo i numeri davanti.'
                : ' Mettiamo i numeri davanti, togliamo i fattori uguali a 1 e scriviamo come potenze i fattori ripetuti.'));
        }

        /* raccoglimento a fattor comune (e semplificazione con il denominatore) */
        {
            const quot = isQuot(E);
            let N = quot ? E.f[0].n : E;
            if (N.t === 'grp') N = N.a;
            if (N.t === 'add') {
                const fc = factorAdd(N, false);
                if (fc) {
                    const D = quot ? E.f[1].n : null;
                    const wrap = (num) => quot ? PN({ t: 'mul', f: [{ op: '', n: num }, { op: '/', n: D }] }) : num;
                    const blue = new Map(fc.blue.map(id => [id, 'red']));
                    const n1 = `Raccogliamo a fattor comune \\(${texOf(fc.C)}\\): lo scriviamo come fattore in ogni termine...`;
                    const n2 = `...e lo portiamo fuori dalla parentesi.`;
                    slides.push({ rows: [`${pre}${texOf(E)}`], note: n1 });
                    slides.push({ rows: [`${pre}${texOf(wrap(fc.spread), blue)}`], note: n1 });
                    slides.push({ rows: [`${pre}${texOf(wrap(fc.factored), blue)}`], note: n2 });
                    E = wrap(fc.factored);
                    slides.push({ rows: [`${pre}${texOf(E)}`], note: n2 });
                    if (quot) {
                        const T = tidyR(E);
                        if (texOf(T) !== texOf(E)) {
                            const n3 = 'Semplifichiamo i fattori comuni tra numeratore e denominatore.';
                            slides.push({ rows: [`${pre}${texOf(E, new Map([[fc.blue[fc.blue.length - 1], 'red'], [D.id, 'red']]))}`], note: n3 });
                            slides.push({ rows: [`${pre}\\color{red}{}${texOf(T)}`], note: n3 });
                            E = T;
                        }
                    }
                }
            }
        }

        const finalTex = texOf(E);
        const fin = E;
        const lastRows = slides[slides.length - 1].rows;
        if (lastRows.length > 1 || /\\color\{(?!black)/.test(lastRows[0]) || lastRows[0] !== `${pre}${finalTex}`) slides.push({ rows: [`${pre}${finalTex}`], note: '' });
        const finalFull = `${pre}${finalTex}`;
        return {
            tipo: 'derivata',
            consegna: 'Calcolare la derivata della funzione',
            startTex: `${SBS.astTex(F, null, 'black')}`,
            slides,
            v: res.v,
            valFinal: (x) => SBS.valuta(fin, x),
            risultato: { kind: 'der', tex: finalFull, html: `La derivata è \\(${finalFull}\\).` }
        };
    }

    SBS.derivate = { deriva };
})(typeof window !== 'undefined' ? window : globalThis);
