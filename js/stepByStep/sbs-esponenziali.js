/* =====================================================================
   StepByStep - equazioni esponenziali (passaggio agli esponenti)
   Impostazione della scheda esercizi/esponenziali/1.html:
   - ogni base viene scritta come potenza della base comune (in rosso)
   - (B^k)^E -> B^{k·(E)} (k rosso, E blu) -> esponente calcolato
   - radice: \sqrt[m]{B^k} -> B^{k/m} (k rosso, m blu)
   - 1 -> B^0
   - prodotto: B^{E1}·B^{E2} -> B^{E1 + E2} (rosso, blu)
   - quoziente: B^{S} / B^{F} -> B^{S - F}
   - B^{L} = B^{R} -> L = R, poi si risolve come equazione algebrica
   Base grigia (come nelle schede 2 e 3); le disequazioni avvisano se la base è tra 0 e 1.
   Sostituzione y = B^x (scheda 3.html) quando un membro è una somma.
   ===================================================================== */
(function (global) {
    'use strict';
    const SBS = global.SBS;
    const { Q, SBSError, variabili } = SBS;

    const strip = (n) => (n.t === 'grp' ? strip(n.a) : n);

    /* ---------------- numeri: scomposizione in fattori primi ---------------- */
    function fattori(n) {
        const m = new Map();
        for (let p = 2; p * p <= n; p++) while (n % p === 0) { m.set(p, (m.get(p) || 0) + 1); n /= p; }
        if (n > 1) m.set(n, (m.get(n) || 0) + 1);
        return m;
    }
    function vettore(q) {   // esponenti dei primi di una frazione positiva
        const v = new Map();
        fattori(q.n).forEach((e, p) => v.set(p, e));
        fattori(q.d).forEach((e, p) => v.set(p, (v.get(p) || 0) - e));
        return v;
    }
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }

    /* base comune B e, per ogni numero, l'esponente k con numero = B^k */
    function baseComune(numeri, preferite) {
        const vs = numeri.map(vettore);
        const primi = new Set(); vs.forEach(v => v.forEach((e, p) => primi.add(p)));
        const P = [...primi];
        if (!P.length) return null;
        const ref = vs.find(v => v.size);
        let g = 0; P.forEach(p => { g = gcd(g, ref.get(p) || 0); });
        let w = new Map(P.map(p => [p, (ref.get(p) || 0) / g]));
        // ogni vettore deve essere multiplo intero di w
        const ks = [];
        for (const v of vs) {
            let k = null, ok = true;
            for (const p of P) {
                const a = v.get(p) || 0, b = w.get(p);
                if (b === 0) { if (a !== 0) ok = false; continue; }
                const r = a / b;
                if (k === null) k = r; else if (Math.abs(k - r) > 1e-12) ok = false;
            }
            if (!ok || k === null || !Number.isInteger(k)) {
                if (v.size === 0) { ks.push(0); continue; }
                return null;
            }
            ks.push(k);
        }
        let B = new Q(1);
        w.forEach((e, p) => { B = e > 0 ? B.mul(Math.pow(p, e)) : B.div(Math.pow(p, -e)); });
        // preferisco una base che compare già nel testo con la x all'esponente; altrimenti B > 1
        const pref = preferite.find(q => q.eq(B) || q.eq(new Q(B.d, B.n)));
        let flip = B.val() < 1;
        if (pref) flip = !pref.eq(B);
        if (flip) { B = new Q(B.d, B.n); return { B, ks: ks.map(k => -k) }; }
        return { B, ks };
    }

    /* ---------------- polinomi negli esponenti ---------------- */
    function poly(n, v) {           // Map grado -> Q
        n = strip(n);
        const P = (m) => m;
        switch (n.t) {
            case 'num': return new Map([[0, n.v]]);
            case 'var': return new Map([[1, new Q(1)]]);
            case 'neg': { const a = poly(n.a, v); a.forEach((c, d) => a.set(d, c.neg())); return a; }
            case 'add': { const r = new Map(); n.a.forEach(t => poly(t, v).forEach((c, d) => r.set(d, (r.get(d) || new Q(0)).add(c)))); return r; }
            case 'mul': {
                let r = new Map([[0, new Q(1)]]);
                for (const f of n.f) {
                    const b = poly(f.n, v);
                    if (f.op === '/' || f.op === ':') {
                        if (b.size !== 1 || !b.has(0)) throw new SBSError('Negli esponenti la x non può stare al denominatore.');
                        const c = b.get(0); r.forEach((x, d) => r.set(d, x.div(c)));
                    } else {
                        const m = new Map();
                        r.forEach((x, d1) => b.forEach((y, d2) => m.set(d1 + d2, (m.get(d1 + d2) || new Q(0)).add(x.mul(y)))));
                        r = m;
                    }
                }
                return P(r);
            }
            case 'pow': {
                const e = strip(n.e);
                if (e.t !== 'num' || !e.v.isInt() || e.v.n < 0) throw new SBSError('Negli esponenti usa solo potenze naturali della x.');
                let r = new Map([[0, new Q(1)]]);
                const b = poly(n.b, v);
                for (let i = 0; i < e.v.n; i++) {
                    const m = new Map();
                    r.forEach((x, d1) => b.forEach((y, d2) => m.set(d1 + d2, (m.get(d1 + d2) || new Q(0)).add(x.mul(y)))));
                    r = m;
                }
                return r;
            }
        }
        throw new SBSError('Negli esponenti scrivi un polinomio nella x.');
    }
    /* polinomio -> testo per il motore */
    function polySrc(p, v) {
        const ds = [...p.keys()].filter(d => !p.get(d).isZero()).sort((a, b) => b - a);
        if (!ds.length) return '0';
        return ds.map((d, i) => {
            const c = p.get(d);
            const s = c.sign() < 0 ? (i ? ' - ' : '-') : (i ? ' + ' : '');
            const a = c.abs();
            const num = a.isInt() ? String(a.n) : `${a.n}/${a.d}`;
            const xs = d === 0 ? '' : (d === 1 ? v : `${v}^${d}`);
            return s + (d > 0 && a.isOne() ? xs : num + xs);
        }).join('');
    }
    /* nodo numerico: numero, -numero, frazione di numeri */
    function numero(n) {
        n = strip(n);
        if (n.t === 'num') return n.v;
        if (n.t === 'neg') { const a = numero(n.a); return a ? a.neg() : null; }
        if (n.t === 'mul') {
            let r = new Q(1);
            for (const f of n.f) {
                const q = numero(f.n); if (!q) return null;
                if (f.op === '/' || f.op === ':') { if (q.isZero()) return null; r = r.div(q); } else r = r.mul(q);
            }
            return r;
        }
        return null;
    }
    const tex = (src) => { const p = SBS.parse(src); return SBS.astTex(p.lhs, null, 'black'); };
    const termini = (src) => { const p = SBS.parse(src); const a = strip(p.lhs); return a.t === 'add' ? a.a.length : 1; };

    /* =====================================================================
       ESPONENTI: coppie {src (testo per il motore), tex (come si scrive)}
       ===================================================================== */
    const texE = (src) => { const p = SBS.parse(src); return SBS.astTex(p.lhs, null, 'black').replace(/\\dfrac/g, '\\frac'); };
    const E = (src) => ({ src, tex: texE(src) });
    const EQ = (src, tex) => ({ src, tex });
    const multi = (e) => termini(e.src) > 1;
    const paren = (e) => (multi(e) ? `\\left(${e.tex}\\right)` : e.tex);
    const costante = (e) => { try { const p = poly(SBS.parse(e.src).lhs); return [...p.keys()].every(d => d === 0 || p.get(d).isZero()) ? (p.get(0) || new Q(0)) : null; } catch (er) { return null; } };
    const R = (t) => `\\color{red}{}${t}\\color{gray}{}`;
    const BL = (t) => `\\color{blue}{}${t}\\color{gray}{}`;

    /* =====================================================================
       ALBERO DEI MEMBRI
       num   {t:'num', q}
       pw    {t:'pw', base, e}          potenza con esponente e (coppia src/tex)
       root  {t:'root', m, a}
       grp   {t:'grp', num:[], den:[]}  prodotti e quozienti
       B     {t:'B', e}                 potenza della base comune (e = null: B^1)
       ===================================================================== */
    function build(n) {
        n = strip(n);
        const q = numero(n);
        if (q) {
            if (q.sign() <= 0) throw new SBSError('Compare un numero negativo o nullo: una potenza con base positiva è sempre positiva, quindi è impossibile.');
            return { t: 'num', q };
        }
        switch (n.t) {
            case 'neg': throw new SBSError('Un membro è negativo: una potenza con base positiva è sempre positiva, quindi è impossibile.');
            case 'mul': {
                const g = { t: 'grp', num: [], den: [] };
                const walk = (m, inv) => {
                    m = strip(m);
                    if (m.t === 'mul' && !numero(m)) { m.f.forEach(f => walk(f.n, inv !== (f.op === '/' || f.op === ':'))); return; }
                    (inv ? g.den : g.num).push(build(m));
                };
                walk(n, false);
                return g;
            }
            case 'pow': {
                if (strip(n.b).t === 'var') throw new SBSError('La x deve stare solo negli esponenti.');
                const e = strip(n.e);
                if (variabili(e).size > 1) throw new SBSError('Usa una sola lettera come incognita.');
                const base = build(n.b);
                return { t: 'pw', base, e: E(polySrcMaybe(e)) };
            }
            case 'fn':
                if (n.n === 'sqrt') return { t: 'root', m: n.idx || 2, a: build(n.a) };
                break;
            case 'var': throw new SBSError('La x deve stare solo negli esponenti.');
            case 'add': throw new SBSError('Una somma dentro una potenza o una radice non è gestita.');
        }
        throw new SBSError('Scrivi i membri come prodotti, quozienti, potenze e radici di numeri, con la x negli esponenti.');
    }
    /* esponente: testo come scritto (non sviluppato) */
    function polySrcMaybe(e) {
        poly(e);   // controlla che sia un polinomio
        return SBS.astToSrc ? SBS.astToSrc(e) : polySrc(poly(e), 'x');
    }

    function numeriDi(n, out = []) {
        if (!n) return out;
        if (n.t === 'num') out.push(n.q);
        if (n.t === 'pw') numeriDi(n.base, out);
        if (n.t === 'root') numeriDi(n.a, out);
        if (n.t === 'grp') [...n.num, ...n.den].forEach(c => numeriDi(c, out));
        return out;
    }
    function basiConX(n, out = []) {
        if (!n) return out;
        if (n.t === 'pw' && /x/.test(n.e.src) && n.base.t === 'num') out.push(n.base.q);
        if (n.t === 'pw') basiConX(n.base, out);
        if (n.t === 'root') basiConX(n.a, out);
        if (n.t === 'grp') [...n.num, ...n.den].forEach(c => basiConX(c, out));
        return out;
    }

    /* ---------------- passaggio agli esponenti ---------------- */
    function passaggio(lhs, rhs, rel) {
        const sides = [build(lhs), build(rhs)];
        const tutti = [...numeriDi(sides[0]), ...numeriDi(sides[1])];
        const numeri = tutti.filter(q => !q.isOne());
        const conX = [...basiConX(sides[0]), ...basiConX(sides[1])];
        if (!conX.length) throw new SBSError('La x non compare in nessun esponente: non è un\'equazione esponenziale.');
        const bc = numeri.length ? baseComune(numeri, conX) : null;
        if (!bc) throw new SBSError('Le basi non si possono scrivere come potenze di uno stesso numero: servirebbero i logaritmi.');
        const B = bc.B;
        const kOf = (q) => bc.ks[numeri.findIndex(x => x.eq(q))];
        const BT = B.isInt() ? `${B.n}` : `\\left(${B.tex()}\\right)`;
        const dis = rel !== '=';

        // ---- disegno ----
        function tex(n) {
            if (n.ovr) return n.ovr;
            let t;
            switch (n.t) {
                case 'num': t = n.q.isInt() ? `${n.q.n}` : n.q.tex(); break;
                case 'B': t = n.e ? `${BT}^{${n.e.tex}}` : BT; break;
                case 'pw': {
                    const bt = tex(n.base);
                    const semplice = (n.base.t === 'num' && n.base.q.isInt() && !n.base.ovr) || (n.base.t === 'B' && !n.base.e && !n.base.ovr);
                    t = `${semplice ? bt : `\\left(${bt}\\right)`}^{${n.e.tex}}`; break;
                }
                case 'root': t = (n.m === 2 && !n.idxVisibile) ? `\\sqrt{${tex(n.a)}}` : `\\sqrt[${n.m}]{${tex(n.a)}}`; break;
                case 'grp': {
                    const nu = n.num.length ? n.num.map(tex).join(' \\cdot ') : '1';
                    t = n.den.length ? `\\dfrac{${nu}}{${n.den.map(tex).join(' \\cdot ')}}` : nu;
                    break;
                }
            }
            return n.hl ? `\\color{${n.hl}}{}${t}\\color{gray}{}` : t;
        }
        const slides = [];
        const relT = SBS.REL[rel].tex;
        const push = (note) => {
            const row = `${tex(sides[0])} ${relT} ${tex(sides[1])}`;
            const last = slides[slides.length - 1];
            if (last && last.rows[0] === row) { if (note && !last.note) last.note = note; return; }
            slides.push({ rows: [row], note: note || '' });
        };
        const become = (n, o) => { Object.keys(n).forEach(k => delete n[k]); Object.assign(n, o); };
        push('');

        // ---- fase A: ogni numero come potenza di B ----
        let nota = `Scriviamo tutte le basi come potenze di \\(${B.tex()}\\).`;
        const usaNota = () => { const n = nota; nota = ''; return n; };
        function foglie(n) {
            if (n.t === 'num') {
                if (n.q.isOne()) return;
                if (n.q.eq(B)) { become(n, { t: 'B', e: null }); return; }
                const k = kOf(n.q);
                n.hl = 'red'; push(usaNota());
                n.ovr = R(`${BT}^{${k}}`); push();
                become(n, { t: 'B', e: E(`${k}`) }); push();
                return;
            }
            if (n.t === 'pw' && n.base.t === 'num') {
                const q = n.base.q;
                if (q.isOne()) { become(n, { t: 'num', q: new Q(1) }); return; }
                if (q.eq(B)) { become(n, { t: 'B', e: n.e }); return; }
                const k = kOf(q);
                n.base.hl = 'red'; push(usaNota());
                n.base.hl = null; n.base.ovr = R(`\\left(${BT}^{${k}}\\right)`); push();
                n.ovr = `\\left(${BT}^{${R(k)}}\\right)^{${BL(n.e.tex)}}`; push();
                n.ovr = `${BT}^{${R(k)}\\cdot${BL(paren(n.e))}}`; push();
                const sv = polySrc(poly(SBS.parse(`${k}*(${n.e.src})`).lhs), 'x');
                become(n, { t: 'B', e: E(sv) }); push();
                return;
            }
            if (n.t === 'pw') foglie(n.base);
            if (n.t === 'root') foglie(n.a);
            if (n.t === 'grp') [...n.num, ...n.den].forEach(foglie);
        }
        sides.forEach(foglie);

        // ---- fase B: dal livello più interno al più esterno ----
        const espDi = (n) => (n.e ? n.e : EQ('1', '1'));
        function combina(g) {
            // tolgo gli 1 nei prodotti
            g.num = g.num.filter(c => !(c.t === 'num' && c.q.isOne()) || g.num.length === 1 && !g.den.length);
            g.den = g.den.filter(c => !(c.t === 'num' && c.q.isOne()));
            const unisci = (lista) => {
                while (lista.length > 1) {
                    const [a, b] = lista;
                    if (!a.e) { a.ovr = `${BT}^{${BL('1')}}`; push(); a.e = EQ('1', '1'); a.ovr = null; }
                    if (!b.e) { b.ovr = `${BT}^{${BL('1')}}`; push(); b.e = EQ('1', '1'); b.ovr = null; }
                    a.ovr = `${BT}^{${R(a.e.tex)}}`; b.ovr = `${BT}^{${BL(b.e.tex)}}`; push();
                    const bt = b.e.tex.startsWith('-') ? `\\left(${b.e.tex}\\right)` : b.e.tex;
                    const bs = b.e.src.trim().startsWith('-') ? `(${b.e.src})` : b.e.src;
                    const nuovo = { t: 'B', e: EQ(`${a.e.src} + ${bs}`, `${a.e.tex} + ${bt}`) };
                    nuovo.ovr = `${BT}^{${R(a.e.tex)} + ${BL(bt)}}`;
                    lista.splice(0, 2, nuovo); push();
                    nuovo.ovr = null;
                }
            };
            unisci(g.num); unisci(g.den);
            if (g.den.length) {
                const d = g.den[0];
                const soloDen = !g.num.length || (g.num.length === 1 && g.num[0].t === 'num');
                if (!d.e) { if (soloDen) { d.ovr = `${BT}^{${BL('1')}}`; push(); d.ovr = null; } d.e = EQ('1', '1'); }
                const F = d.e;
                if (soloDen) {
                    d.ovr = `${BT}^{${BL(F.tex)}}`; push();
                    const negT = multi(F) || F.tex.startsWith('-') ? `-\\left(${F.tex}\\right)` : `-${F.tex}`;
                    const nuovo = { t: 'B', e: EQ(`-(${F.src})`, negT), ovr: `${BT}^{${BL(negT)}}` };
                    become(g, { t: 'grp', num: [nuovo], den: [] }); push(); nuovo.ovr = null;
                } else {
                    const n0 = g.num[0];
                    if (!n0.e) { n0.e = EQ('1', '1'); }
                    n0.ovr = `${BT}^{${R(n0.e.tex)}}`; d.ovr = `${BT}^{${BL(F.tex)}}`; push();
                    const meno = multi(F) || F.tex.startsWith('-') ? `\\left(${F.tex}\\right)` : F.tex;
                    const fs = multi(F) || F.src.trim().startsWith('-') ? `(${F.src})` : F.src;
                    const nuovo = { t: 'B', e: EQ(`${n0.e.src} - ${fs}`, `${n0.e.tex} - ${meno}`), ovr: `${BT}^{${R(n0.e.tex)} - ${BL(meno)}}` };
                    become(g, { t: 'grp', num: [nuovo], den: [] }); push(); nuovo.ovr = null;
                }
            }
            if (g.num.length === 1) { const only = g.num[0]; become(g, only); }
        }
        function applica(n) {
            if (n.t === 'pw') {
                const base = n.base;     // forma B
                if (base.t !== 'B') return;
                if (!base.e) { become(n, { t: 'B', e: n.e }); push(); return; }
                const S = base.e;
                n.ovr = `\\left(${BT}^{${R(S.tex)}}\\right)^{${BL(n.e.tex)}}`; push();
                const prodT = `${paren(S)}\\cdot ${multi(n.e) ? `\\left(${n.e.tex}\\right)` : n.e.tex}`;
                n.ovr = `${BT}^{${R(paren(S))}\\cdot ${BL(multi(n.e) ? `\\left(${n.e.tex}\\right)` : n.e.tex)}}`; push();
                const es = multi(n.e) || n.e.src.trim().startsWith('-') ? `(${n.e.src})` : n.e.src;
                const ss = multi(S) ? `(${S.src})` : S.src;
                const ce = costante(n.e);
                let src = `${ss}·${es}`;
                if (ce && !ce.isInt()) src = `${ce.abs().n === 1 ? '' : ce.abs().n}${ce.abs().n === 1 && !multi(S) ? `(${S.src})` : `(${S.src})`}/${ce.d}`, src = ce.sign() < 0 ? `-${src}` : src;
                become(n, { t: 'B', e: EQ(src, prodT) }); push();
                return;
            }
            if (n.t === 'root') {
                const a = n.a; if (a.t !== 'B') return;
                const S = espDi(a);
                n.ovr = `\\sqrt[${BL(n.m)}]{${BT}^{${R(S.tex)}}}`; push();
                n.ovr = `${BT}^{\\frac{${R(S.tex)}}{${BL(n.m)}}}`; push();
                const c = costante(S);
                if (c) {
                    const q = c.div(n.m);
                    become(n, { t: 'B', e: E(q.isInt() ? `${q.n}` : `${q.n}/${q.d}`) }); push();
                    if (q.isOne()) { become(n, { t: 'B', e: null }); push(); }
                } else {
                    become(n, { t: 'B', e: EQ(`${multi(S) ? `(${S.src})` : S.src}/${n.m}`, `\\frac{${S.tex}}{${n.m}}`) }); push();
                }
            }
        }
        // profondità
        const livelli = [];
        (function vis(n, d) {
            if (n.t === 'grp') { if (d > 0) (livelli[d] = livelli[d] || []).push(n); [...n.num, ...n.den].forEach(c => vis(c, d + 1)); }
            if (n.t === 'pw') { (livelli[d] = livelli[d] || []).push(n); vis(n.base, d + 1); }
            if (n.t === 'root') { (livelli[d] = livelli[d] || []).push(n); vis(n.a, d + 1); }
        })(sides[0], 0);
        const liv0 = livelli.length;
        (function vis(n, d) {
            if (n.t === 'grp') { if (d > 0) (livelli[d] = livelli[d] || []).push(n); [...n.num, ...n.den].forEach(c => vis(c, d + 1)); }
            if (n.t === 'pw') { (livelli[d] = livelli[d] || []).push(n); vis(n.base, d + 1); }
            if (n.t === 'root') { (livelli[d] = livelli[d] || []).push(n); vis(n.a, d + 1); }
        })(sides[1], 0);
        for (let d = livelli.length - 1; d >= 0; d--) {
            (livelli[d] || []).forEach(n => {
                if (n.t === 'grp') { combina(n); if (n.t === 'grp' && n.num.length === 1 && !n.den.length) become(n, n.num[0]); }
                else applica(n);
            });
        }
        // un membro uguale a 1 diventa B^0
        sides.forEach(s => {
            const uno = (s.t === 'num' && s.q.isOne()) || (s.t === 'grp' && s.num.length === 1 && !s.den.length && s.num[0].t === 'num' && s.num[0].q.isOne());
            if (uno) {
                s.hl = 'red'; push();
                become(s, { t: 'B', e: EQ('0', '0'), ovr: R(`${BT}^0`) }); push(); s.ovr = null;
            }
        });
        // livello dei membri
        sides.forEach(s => { if (s.t === 'grp') combina(s); });
        sides.forEach(s => { if (s.t === 'grp' && s.num.length === 1 && !s.den.length) become(s, s.num[0]); });
        if (sides.some(s => s.t !== 'B')) throw new SBSError('Non riesco a scrivere i due membri come una sola potenza della stessa base.');
        push();

        // ---- passaggio agli esponenti ----
        const EL = espDi(sides[0]), ER = espDi(sides[1]);
        sides[0].ovr = `${BT}^{${R(EL.tex)}}`; sides[1].ovr = `${BT}^{${R(ER.tex)}}`;
        let rel2 = rel, notaPass = 'Le basi sono uguali: uguagliamo gli esponenti.';
        if (dis) {
            if (B.val() < 1) {
                rel2 = SBS.REL[rel].inv;
                notaPass = `Passiamo agli esponenti. <b class="red">Attenzione:</b> la base \\(${B.tex()}\\) è compresa tra \\(0\\) e \\(1\\), quindi il verso della disuguaglianza si inverte: \\(${relT}\\) diventa \\(${SBS.REL[rel2].tex}\\).`;
            } else notaPass = `Passiamo agli esponenti. La base \\(${B.tex()}\\) è maggiore di \\(1\\), quindi il verso della disuguaglianza resta lo stesso.`;
        }
        push(notaPass);
        const relCol = rel2 !== rel ? R(SBS.REL[rel2].tex) : SBS.REL[rel2].tex;
        slides.push({ rows: [`${R(`{${EL.tex}}`)} ${relCol} ${R(`{${ER.tex}}`)}`], note: notaPass });

        const p = SBS.parse(`${EL.src} ${rel2} ${ER.src}`);
        const r = SBS.algebra.risolvi(p.lhs, p.rhs, rel2, { base: 'gray' });
        r.slides.forEach((sl, i) => { if (i === 0) return; slides.push({ rows: sl.rows, note: dis ? sl.note : '' }); });
        slides.forEach(sl => { if (sl.note) sl.note = sl.note.replace(/\\dfrac/g, '\\frac'); });
        return { slides, risultato: r.risultato, B, EL, ER, rel2 };
    }

    /* =====================================================================
       SOSTITUZIONE: a·B^{2x} + b·B^{x} + c = 0  ->  y = B^x
       ===================================================================== */
    function termineSost(n, s) {
        n = strip(n);
        if (n.t === 'neg') return termineSost(n.a, -s);
        const q = numero(n);
        if (q) return { coef: q.mul(s), b: null };
        let coef = new Q(s), pw = null;
        const fs = n.t === 'mul' ? n.f : [{ op: '', n }];
        for (const f of fs) {
            const m = strip(f.n);
            const qq = numero(m);
            if (qq) { coef = (f.op === '/' || f.op === ':') ? coef.div(qq) : coef.mul(qq); continue; }
            if (m.t === 'pow' && numero(m.b) && !pw && f.op !== '/' && f.op !== ':') { pw = m; continue; }
            throw new SBSError('Nella sostituzione ogni termine deve essere un numero oppure un numero per una potenza.');
        }
        if (!pw) return { coef, b: null };
        const pe = poly(strip(pw.e));
        if ([...pe.keys()].some(d => d > 1 && !pe.get(d).isZero())) throw new SBSError('Gli esponenti devono essere di primo grado nella x.');
        const m = pe.get(1) || new Q(0), h = pe.get(0) || new Q(0);
        if (!m.isInt() || !h.isInt()) throw new SBSError('Gli esponenti devono avere coefficienti interi.');
        return { coef, b: numero(pw.b), m: m.n, h: h.n, eSrc: SBS.astToSrc ? SBS.astToSrc(strip(pw.e)) : polySrc(pe, 'x') };
    }

    function sostituzione(lhs, rhs, rel) {
        const lato = (n) => { n = strip(n); const out = []; (n.t === 'add' ? n.a : [n]).forEach(c => out.push(termineSost(c, 1))); return out; };
        let L = lato(lhs), Rr = lato(rhs);
        const exp = [...L, ...Rr].filter(t => t.b);
        if (!exp.length) throw new SBSError('La x non compare in nessun esponente.');
        const numeri = exp.map(t => t.b).filter(q => !q.isOne());
        const bc = baseComune(numeri, exp.filter(t => Math.abs(t.m) === 1).map(t => t.b));
        if (!bc) throw new SBSError('Le basi non si possono scrivere come potenze di uno stesso numero: servirebbero i logaritmi.');
        const kOf = (q) => bc.ks[numeri.findIndex(x => x.eq(q))];
        exp.forEach(t => { t.k = kOf(t.b); t.n = t.k * t.m; });
        // la variabile ausiliaria è la potenza "più piccola": 4^{2x} e 4^x -> y = 4^x (non 2^x)
        let B = bc.B;
        const ns = exp.map(t => t.n);
        if (ns.every(n => n > 0)) {
            const g = Math.min(...ns);
            if (g > 1 && ns.every(n => n % g === 0) && exp.every(t => t.k % g === 0)) {
                B = B.pow(g);
                exp.forEach(t => { t.k /= g; t.n /= g; });
            }
        }
        if (exp.some(t => t.n !== 1 && t.n !== 2)) throw new SBSError('Con la sostituzione y = potenza della base si devono ottenere solo y e y²: questo caso non è gestito.');
        const BT = B.isInt() ? `${B.n}` : `\\left(${B.tex()}\\right)`;
        const bT = (q) => (q.isInt() ? `${q.n}` : `\\left(${q.tex()}\\right)`);
        const v = 'x', yv = 'y';
        const mxT = (m) => (m === 1 ? v : m === -1 ? `-${v}` : `${m}${v}`);

        // stato di ogni termine: tex del corpo (senza segno)
        const coefT = (c, conPunto) => (c.abs().isOne() ? '' : `${c.abs().tex()}${conPunto ? ' \\cdot ' : ''}`);
        [...L, ...Rr].forEach(t => {
            t.sign = t.coef.sign() < 0 ? -1 : 1;
            t.body = t.b ? `${coefT(t.coef, true)}${bT(t.b)}^{${texE(t.eSrc)}}` : t.coef.abs().tex();
        });
        const sideT = (arr) => (arr.length ? arr.map((t, i) => {
            const sg = t.sign < 0 ? (i ? ' - ' : '-') : (i ? ' + ' : '');
            return t.hl ? R(`${sg}${t.body}`) : `${sg}${t.body}`;
        }).join('') : '0');
        const slides = [];
        const push = (note, extra) => {
            const row = `${sideT(L)} ${SBS.REL[rel].tex} ${sideT(Rr)}`;
            slides.push({ rows: [row, ...(extra || [])], note: note || '' });
        };
        push();

        // a) potenze con esponente mx + h: si spezzano
        for (const t of [...L, ...Rr]) {
            if (!t.b || t.h === 0) continue;
            const c0 = t.coef.abs();
            const cp = coefT(c0, true);
            const hT = t.h < 0 ? `- ${-t.h}` : `+ ${t.h}`;
            t.body = `${cp}${bT(t.b)}^{${R(mxT(t.m))} ${hT.replace(/^([+-]) (\d+)/, (_, s, d) => `${s} ${BL(d)}`)}}`; push();
            t.body = `${cp}${bT(t.b)}^{${R(mxT(t.m))}} \\cdot ${bT(t.b)}^{${BL(t.h)}}`; push();
            t.body = `${cp}${bT(t.b)}^{${mxT(t.m)}} \\cdot ${R(`${bT(t.b)}^{${t.h}}`)}`; push();
            const val = t.b.pow(t.h);
            t.body = `${cp}${bT(t.b)}^{${mxT(t.m)}} \\cdot ${R(val.tex())}`; push();
            const nc = c0.mul(val);
            if (!c0.isOne()) { t.body = `${R(`${c0.tex()} \\cdot ${val.tex()}`)} \\cdot ${bT(t.b)}^{${mxT(t.m)}}`; push(); }
            t.coef = nc.mul(t.sign); t.h = 0;
            t.body = `${coefT(nc, true)}${bT(t.b)}^{${mxT(t.m)}}`; push();
        }
        // b) tutto al primo membro
        if (Rr.length && !(Rr.length === 1 && !Rr[0].b && Rr[0].coef.isZero())) {
            Rr.forEach(t => { t.hl = true; }); push();
            Rr.forEach(t => { t.hl = false; L.push({ ...t, sign: -t.sign, coef: t.coef.neg(), hl: true }); });
            Rr = []; push(); push();
            L.forEach(t => { t.hl = false; });
        }
        // c) basi diverse da B e potenze con esponente 2x
        for (const t of L) {
            if (!t.b) continue;
            const cp = coefT(t.coef.abs(), true);
            if (!t.b.eq(B)) {
                t.body = `${cp}${R(bT(t.b))}^{${mxT(t.m)}}`; push();
                t.body = `${cp}${R(`\\left(${BT}^{${t.k}}\\right)`)}^{${mxT(t.m)}}`; push();
                t.body = `${cp}\\left(${BT}^{${R(t.k)}}\\right)^{${BL(mxT(t.m))}}`; push();
                if (t.n === 2) {
                    t.body = `${cp}\\left(${BT}^{${BL(v)}}\\right)^{${R(2)}}`; push(); push();
                    t.body = `${cp}\\left(${BT}^{${v}}\\right)^{2}`;
                } else t.body = `${cp}${BT}^{${v}}`;
                push();
            } else if (t.m === 2) {
                t.body = `${cp}${BT}^{${R(`2${v}`)}}`; push();
                t.body = `${cp}\\left(${BT}^{${v}}\\right)^{${R(2)}}`; push();
                t.body = `${cp}\\left(${BT}^{${v}}\\right)^{2}`; push();
            }
        }
        // d) variabile ausiliaria
        const nAux = (y, bx) => `Consideriamo la variabile ausiliaria \\(${y} = ${bx}\\)`;
        const bxT = `${BT}^{${v}}`;
        push(nAux(yv, bxT));
        const save = L.map(t => t.body);
        L.forEach(t => { if (t.b) t.body = t.n === 2 ? `${coefT(t.coef.abs(), true)}\\left(${R(bxT)}\\right)^{2}` : `${coefT(t.coef.abs(), true)}${R(bxT)}`; });
        push(nAux(yv, bxT));
        push(nAux(yv, R(bxT)));
        push(nAux(R(yv), bxT));
        L.forEach(t => { if (t.b) t.body = t.n === 2 ? `${coefT(t.coef.abs(), true)}\\left(${R(yv)}\\right)^{2}` : `${coefT(t.coef.abs(), true)}${R(yv)}`; });
        push(nAux(yv, bxT));
        // equazione in y
        const ySrc = L.map((t, i) => {
            const c = t.coef;
            const sg = c.sign() < 0 ? (i ? ' - ' : '-') : (i ? ' + ' : '');
            const a = c.abs();
            const cs = a.isInt() ? `${a.n}` : `${a.n}/${a.d}`;
            if (!t.b) return sg + cs;
            const yy = t.n === 2 ? `${yv}^2` : yv;
            return sg + (a.isOne() ? yy : cs + yy);
        }).join('') || '0';
        const yLine = SBS.parse(`${ySrc} ${rel} 0`);
        const yTex = `${SBS.astTex(yLine.lhs, null, 'gray')} ${SBS.REL[rel].tex} 0`;
        slides.push({ rows: [yTex], note: nAux(yv, bxT) });
        const grado = L.some(t => t.b && t.n === 2) ? 2 : 1;
        const ry = SBS.algebra.risolvi(yLine.lhs, yLine.rhs, rel, { base: 'gray' });
        slides.push({ rows: [ry.slides[0] ? ry.slides[0].rows[0] : yTex], note: `Risolviamo questa ${rel === '=' ? 'equazione' : 'disequazione'} ${grado === 2 ? 'di secondo grado' : 'di primo grado'} nell'incognita \\(${yv}\\).` });
        ry.slides.forEach((sl, i) => { if (i === 0) return; slides.push({ rows: sl.rows, note: sl.note }); });
        if (rel !== '=') return fineDisequazione(ry.risultato, { slides, B, BT, bxT, v, yv });
        // soluzioni in y (esatte)
        const Ry = ry.risultato;
        let ys = [];
        if (Ry.kind === 'sol') ys = [{ q: Ry.sol, val: Ry.sol.val(), tex: Ry.sol.tex() }];
        else if (Ry.esatte) ys = Ry.esatte.map(r => ({ q: (r.K === 0 || r.M === 1) ? new Q(r.N + r.s * r.K, r.D) : null, val: (r.N + r.s * r.K * Math.sqrt(r.M)) / r.D, tex: SBS.algebra.radTex(r) }));
        ys.sort((a, b) => b.val - a.val);   // prima la soluzione con il +
        if (!ys.length) {
            slides.push({ rows: [`${yTex}`], note: `L'equazione in \\(${yv}\\) non ha soluzioni, quindi neanche l'equazione esponenziale.` });
            return { slides, risultato: { kind: 'nessuna', html: "L'equazione non ammette soluzioni.", text: "L'equazione non ammette soluzioni.", roots: [] }, B };
        }
        const OPP = ' \\quad \\text{oppure} \\quad ';
        const rowY = (fy) => ys.map(s => `${fy(s)} = ${s.tex}`).join(OPP);
        const nRic = (y, bx) => `Ora ricordiamo che \\(${y} = ${bx}\\).`;
        slides.push({ rows: [rowY(() => yv)], note: '' });
        slides.push({ rows: [rowY(() => R(yv))], note: nRic(yv, bxT) });
        slides.push({ rows: [rowY(() => R(yv))], note: nRic(R(yv), bxT) });
        slides.push({ rows: [rowY(() => R(yv))], note: nRic(yv, R(bxT)) });
        slides.push({ rows: [rowY(() => R(bxT))], note: '' });
        // ciascuna equazione B^x = valore
        const parti = ys.map(s => ({ ...s, t: `${bxT} = ${s.tex}`, stato: 'aperta' }));
        const riga = () => parti.map(p => p.t).join(OPP);
        slides.push({ rows: [riga()], note: '' });
        const sol = [];
        parti.forEach(p => {
            const val = p.q;
            if (!val) { if (p.val > 0) p.log = true; return; }
            if (val.sign() <= 0) return;
            const vec = vettore(val);
            const bv = vettore(B);
            let jq = null, ok = true;
            const pr = new Set([...vec.keys(), ...bv.keys()]);
            pr.forEach(pp => { const a = vec.get(pp) || 0, b = bv.get(pp) || 0; if (b === 0) { if (a) ok = false; return; } const r = new Q(a, b); if (jq === null) jq = r; else if (!jq.eq(r)) ok = false; });
            if (val.isOne()) { jq = new Q(0); ok = true; }
            if (!ok || jq === null) { p.log = true; return; }
            const intero = jq.isInt(), j = intero ? jq.n : null;
            const jt = intero ? `${j}` : (jq.sign() < 0 ? `-\\frac{${-jq.n}}{${jq.d}}` : `\\frac{${jq.n}}{${jq.d}}`);
            if (intero && j < 0 && val.n === 1) {
                p.t = `${bxT} = \\dfrac{1}{${BT}^{${R(-j)}}}`; slides.push({ rows: [riga()], note: '' });
            } else if (!(intero && j === 1 && val.eq(B))) {
                p.t = `${bxT} = ${R(`${BT}^{${jt}}`)}`; slides.push({ rows: [riga()], note: '' });
            } else { p.t = `${bxT} = ${BT}^{${R(1)}}`; slides.push({ rows: [riga()], note: '' }); }
            p.t = `${bxT} = ${BT}^{${R(`{${jt}}`)}}`; slides.push({ rows: [riga()], note: '' });
            p.t = `${BT}^{${R(v)}} = ${BT}^{${R(`{${jt}}`)}}`; slides.push({ rows: [riga()], note: '' });
            const jd = jq.tex();
            p.t = `${R(v)} = ${R(`{${jd}}`)}`; slides.push({ rows: [riga()], note: '' });
            p.t = `${v} = ${jd}`; p.x = jq.val(); p.xt = p.t; sol.push(p.x);
        });
        slides.push({ rows: [riga()], note: '' });
        const imposs = parti.filter(p => p.x === undefined && !p.log);
        const logs = parti.filter(p => p.log);
        imposs.forEach(p => {
            slides.push({ rows: [riga()], note: `Guardiamo l'equazione \\(${p.t}\\). Non ammette alcuna soluzione, perché \\(${bxT}\\) è un numero positivo comunque scegliamo l'esponente \\(${v}\\): non può dare come risultato \\(${p.tex}\\), che ${p.val !== undefined && p.val === 0 || (p.q && p.q.isZero()) ? 'è zero' : 'è un numero negativo'}.` });
            p.t = `\\underset{\\text{impossibile}}{\\underbrace{${p.t}}}`;
            slides.push({ rows: [riga()], note: '' });
        });
        logs.forEach(p => {
            const arg = /^\\dfrac/.test(p.tex) ? p.tex : `\\left(${p.tex}\\right)`;
            slides.push({ rows: [riga()], note: `Nell'equazione \\(${p.t}\\) il numero \\(${p.tex}\\) non è una potenza di \\(${B.tex()}\\): l'esponente \\(x\\) che lo dà è, per definizione, il logaritmo in base \\(${B.tex()}\\) di quel numero.` });
            p.t = `${R(v)} = ${R(`\\log_{${B.tex()}} ${arg}`)}`;
            slides.push({ rows: [riga()], note: '' });
            p.t = `${v} = \\log_{${B.tex()}} ${arg}`; p.xt = p.t;
            p.x = Math.log(p.val) / Math.log(B.val());
        });
        slides.forEach(sl => { if (sl.note) sl.note = sl.note.replace(/\\dfrac/g, '\\frac'); });
        const valide = parti.filter(p => p.xt);
        const finali = valide.map(p => p.xt);
        if (finali.length && finali.join(OPP) !== riga()) slides.push({ rows: [finali.join(OPP)], note: '' });
        let html;
        if (!finali.length) html = "L'equazione non ammette soluzioni.";
        else html = `L'equazione ha ${finali.length > 1 ? 'soluzioni' : 'soluzione'} \\(${finali.join(' \\quad \\text{oppure} \\quad ')}\\).`;
        return { slides, B, risultato: { kind: finali.length ? 'sost' : 'nessuna', html, text: html, roots: valide.map(p => p.x) } };
    }

    /* =====================================================================
       DISEQUAZIONI PER SOSTITUZIONE: dalle soluzioni in y alle soluzioni in x
       ===================================================================== */
    const RT = (r) => SBS.REL[r].tex;
    const INV = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '=': '=' };
    const yNum = (r) => ({   // radice esatta {N,s,K,M,D} -> valore
        q: (r.K === 0 || r.M === 1) ? new Q(r.N + r.s * r.K, r.D) : null,
        val: (r.N + r.s * r.K * Math.sqrt(r.M)) / r.D,
        tex: SBS.algebra.radTex(r)
    });
    const qNum = (q) => ({ q, val: q.val(), tex: q.tex() });
    /* esponente j (frazione) con val = B^j, oppure null */
    function esponenteDi(val, B) {
        if (!val.q || val.q.sign() <= 0) return null;
        if (val.q.isOne()) return new Q(0);
        const vec = vettore(val.q), bv = vettore(B);
        let jq = null, ok = true;
        new Set([...vec.keys(), ...bv.keys()]).forEach(pp => {
            const a = vec.get(pp) || 0, b = bv.get(pp) || 0;
            if (b === 0) { if (a) ok = false; return; }
            const r = new Q(a, b); if (jq === null) jq = r; else if (!jq.eq(r)) ok = false;
        });
        return ok ? jq : null;
    }
    const jTex = (jq) => (jq.isInt() ? `${jq.n}` : (jq.sign() < 0 ? `-\\frac{${-jq.n}}{${jq.d}}` : `\\frac{${jq.n}}{${jq.d}}`));

    function fineDisequazione(Ry, C) {
        const { slides, B, BT, bxT, v, yv } = C;
        const R = (t) => `\\color{red}{}${t}\\color{gray}{}`;
        const OPP = ' \\quad \\text{oppure} \\quad ';
        const Bt = B.tex();
        const piccola = B.val() < 1;
        // 1) soluzioni in y come lista di alternative
        //    {rel, a}  (y rel a)   oppure   {lo, hi, lr, hr}  (lo lr y hr hi)   oppure {tutti} / {nessuno}
        let alt = [];
        if (Ry.kind === 'sempre') alt = [{ tutti: true }];
        else if (Ry.kind === 'mai') alt = [];
        else if (Ry.kind === 'diseq1') alt = [{ rel: Ry.rel, a: qNum(Ry.sol) }];
        else if (Ry.kind === 'diseq2') {
            const rs = (Ry.esatte || []).map(yNum).sort((a, b) => a.val - b.val), sc = Ry.scelti, z = Ry.conZero;
            const lt = z ? '<=' : '<', gt = z ? '>=' : '>';
            if (rs.length === 2) {
                if (sc[0] && sc[2]) alt = [{ rel: lt, a: rs[0] }, { rel: gt, a: rs[1] }];
                else if (sc[1]) alt = [{ lo: rs[0], hi: rs[1], lr: lt, hr: lt }];
            } else if (rs.length === 1) {
                if (sc[0] && z) alt = [{ tutti: true }];
                else if (sc[0]) alt = [{ rel: '<', a: rs[0] }, { rel: '>', a: rs[0] }];
                else if (z) alt = [{ rel: '=', a: rs[0] }];
            } else if (sc[0]) alt = [{ tutti: true }];
        }
        const fineR = (testo) => `La disequazione ${testo}.`;
        if (!alt.length) {
            slides.push({ rows: [slides[slides.length - 1].rows[0]], note: `La disequazione in \\(${yv}\\) non ha soluzioni, quindi neanche quella esponenziale.` });
            return { slides, B, risultato: { kind: 'mai', html: 'La disequazione non ammette soluzioni.', text: 'La disequazione non ammette soluzioni.', test: () => false } };
        }
        if (alt.some(a => a.tutti)) {
            slides.push({ rows: [slides[slides.length - 1].rows[0]], note: `La disequazione in \\(${yv}\\) è verificata per ogni valore di \\(${yv}\\), quindi quella esponenziale è verificata per ogni \\(${v} \\in \\mathbb{R}\\).` });
            const h = `La disequazione è verificata per ogni \\(${v} \\in \\mathbb{R}\\).`;
            return { slides, B, risultato: { kind: 'sempre', html: h, text: h, test: () => true } };
        }
        // 2) riga con le soluzioni in y e ritorno all'esponenziale
        const altT = (a, y) => (a.lo ? `${a.lo.tex} ${RT(a.lr)} ${y} ${RT(a.hr)} ${a.hi.tex}` : `${y} ${RT(a.rel)} ${a.a.tex}`);
        const rigaY = (y) => alt.map(a => altT(a, y)).join(OPP);
        const nRic = (y, bx) => `Ora ricordiamo che \\(${y} = ${bx}\\).`;
        slides.push({ rows: [rigaY(yv)], note: '' });
        slides.push({ rows: [rigaY(R(yv))], note: nRic(yv, bxT) });
        slides.push({ rows: [rigaY(R(yv))], note: nRic(R(yv), bxT) });
        slides.push({ rows: [rigaY(R(yv))], note: nRic(yv, R(bxT)) });
        slides.push({ rows: [rigaY(R(bxT))], note: '' });
        const parti = alt.map(a => ({ a, t: altT(a, bxT) }));
        const riga = () => parti.map(p => p.t).join(OPP);
        const pushR = (note) => slides.push({ rows: [riga()], note: note || '' });
        pushR();
        const notaVerso = piccola
            ? `Passiamo agli esponenti. <b class="red">Attenzione:</b> la base \\(${Bt}\\) è compresa tra \\(0\\) e \\(1\\), quindi il verso della disuguaglianza si inverte.`
            : `Passiamo agli esponenti. La base \\(${Bt}\\) è maggiore di \\(1\\), quindi il verso della disuguaglianza resta lo stesso.`;
        const rv = (r) => (piccola ? INV[r] : r);
        const potT = (jq) => `${BT}^{${jTex(jq)}}`;
        // un estremo positivo come potenza della base (passaggi in rosso)
        const comePotenza = (p, prima, dopo, x, jq) => {
            // prima/dopo: funzioni che danno il testo con l'estremo scritto in un modo dato
            if (jq.isInt() && jq.n < 0 && x.q.n === 1) { p.t = prima(`\\dfrac{1}{${BT}^{${R(-jq.n)}}}`); pushR(); }
            else if (!(jq.isInt() && jq.n === 1)) { p.t = prima(R(potT(jq))); pushR(); }
            else { p.t = prima(`${BT}^{${R(1)}}`); pushR(); }
            p.t = prima(`${BT}^{${R(`{${jTex(jq)}}`)}}`); pushR();
            dopo();
        };
        // insieme delle x: {tutti} {vuoto} {rel, x:{tex,val}} {lo, hi, lr, hr}
        const insiemi = [];
        const logT = (x) => `\\log_{${Bt}} ${/^\\dfrac/.test(x.tex) || /^\d+$/.test(x.tex) ? x.tex : `\\left(${x.tex}\\right)`}`;
        const valX = (x) => {   // x tale che B^x = valore
            const jq = esponenteDi(x, B);
            return jq ? { jq, tex: jq.tex(), val: jq.val() } : { tex: logT(x), val: Math.log(x.val) / Math.log(B.val()) };
        };
        const singolo = (p, rel, x) => {   // B^x rel x
            if (x.val < 0 || (x.val === 0)) {
                const positivi = rel === '>' || rel === '>=';
                pushR(`Guardiamo \\(${p.t}\\). Poiché \\(${bxT}\\) è un numero positivo per ogni \\(${v}\\), ${positivi ? `la disuguaglianza è verificata per ogni \\(${v} \\in \\mathbb{R}\\)` : (x.val === 0 && rel === '=' ? `non può valere \\(0\\): è impossibile` : `non può essere ${rel === '=' ? 'uguale a' : 'minore di'} \\(${x.tex}\\): è impossibile`)}.`);
                p.t = positivi ? `\\underset{\\forall ${v} \\in \\mathbb{R}}{\\underbrace{${p.t}}}` : `\\underset{\\text{impossibile}}{\\underbrace{${p.t}}}`;
                pushR();
                insiemi.push(positivi ? { tutti: true } : { vuoto: true });
                return;
            }
            const X = valX(x);
            const r2 = rel === '=' ? '=' : rv(rel);
            if (X.jq) {
                comePotenza(p, (e) => `${bxT} ${RT(rel)} ${e}`, () => {}, x, X.jq);
                p.t = `${BT}^{${R(v)}} ${RT(rel)} ${BT}^{${R(`{${jTex(X.jq)}}`)}}`; pushR(rel === '=' ? '' : notaVerso);
                p.t = `${R(v)} ${r2 !== rel ? R(RT(r2)) : RT(r2)} ${R(`{${X.tex}}`)}`; pushR(rel === '=' ? '' : notaVerso);
            } else {
                pushR(`Il numero \\(${x.tex}\\) non è una potenza di \\(${Bt}\\): l'esponente che lo dà è, per definizione, il logaritmo in base \\(${Bt}\\).`);
                p.t = `${R(v)} ${r2 !== rel ? R(RT(r2)) : RT(r2)} ${R(X.tex)}`; pushR(rel === '=' ? '' : notaVerso);
            }
            p.t = `${v} ${RT(r2)} ${X.tex}`;
            insiemi.push({ rel: r2, x: X });
        };
        parti.forEach(p => {
            const a = p.a;
            if (!a.lo) { singolo(p, a.rel, a.a); return; }
            if (a.hi.val <= 0) {
                pushR(`Guardiamo \\(${p.t}\\). Poiché \\(${bxT}\\) è un numero positivo per ogni \\(${v}\\), non può essere minore di \\(${a.hi.tex}\\): è impossibile.`);
                p.t = `\\underset{\\text{impossibile}}{\\underbrace{${p.t}}}`; pushR();
                insiemi.push({ vuoto: true }); return;
            }
            if (a.lo.val <= 0) {
                p.t = `${R(`${a.lo.tex} ${RT(a.lr)}`)} ${bxT} ${RT(a.hr)} ${a.hi.tex}`;
                pushR(`Poiché \\(${bxT}\\) è positivo per ogni \\(${v}\\), la disuguaglianza \\(${a.lo.tex} ${RT(a.lr)} ${bxT}\\) è sempre verificata: resta solo \\(${bxT} ${RT(a.hr)} ${a.hi.tex}\\).`);
                p.t = `${bxT} ${RT(a.hr)} ${a.hi.tex}`; pushR();
                singolo(p, a.hr, a.hi); return;
            }
            const X1 = valX(a.lo), X2 = valX(a.hi);
            const testo = (sx, dx) => `${sx} ${RT(a.lr)} ${bxT} ${RT(a.hr)} ${dx}`;
            let sxT = a.lo.tex, dxT = a.hi.tex;
            const passi = (X, x, set) => {
                if (!X.jq) return;
                if (X.jq.isInt() && X.jq.n < 0 && x.q.n === 1) { set(`\\dfrac{1}{${BT}^{${R(-X.jq.n)}}}`); p.t = testo(sxT, dxT); pushR(); }
                else if (!(X.jq.isInt() && X.jq.n === 1)) { set(R(potT(X.jq))); p.t = testo(sxT, dxT); pushR(); }
                set(`${BT}^{${jTex(X.jq)}}`); p.t = testo(sxT, dxT); pushR();
            };
            passi(X1, a.lo, (t) => { sxT = t; });
            passi(X2, a.hi, (t) => { dxT = t; });
            if (X1.jq && X2.jq) {
                p.t = `${BT}^{${R(`{${jTex(X1.jq)}}`)}} ${RT(a.lr)} ${BT}^{${R(v)}} ${RT(a.hr)} ${BT}^{${R(`{${jTex(X2.jq)}}`)}}`; pushR(notaVerso);
            } else pushR(`I numeri che non sono potenze di \\(${Bt}\\) si scrivono con i logaritmi in base \\(${Bt}\\).`);
            let lo = { x: X1, r: a.lr }, hi = { x: X2, r: a.hr };
            if (piccola) {
                p.t = `${R(`{${X1.tex}}`)} ${R(RT(INV[a.lr]))} ${R(v)} ${R(RT(INV[a.hr]))} ${R(`{${X2.tex}}`)}`; pushR(notaVerso);
                p.t = `${X2.tex} ${RT(a.hr)} ${v} ${RT(a.lr)} ${X1.tex}`; pushR('Riscriviamo la doppia disuguaglianza partendo dal numero più piccolo.');
                lo = { x: X2, r: a.hr }; hi = { x: X1, r: a.lr };
            } else {
                p.t = `${R(`{${X1.tex}}`)} ${RT(a.lr)} ${R(v)} ${RT(a.hr)} ${R(`{${X2.tex}}`)}`; pushR(notaVerso);
            }
            p.t = `${lo.x.tex} ${RT(lo.r)} ${v} ${RT(hi.r)} ${hi.x.tex}`;
            insiemi.push({ lo: lo.x, hi: hi.x, lr: lo.r, hr: hi.r });
        });
        if (slides[slides.length - 1].rows[0] !== riga()) pushR();
        // 3) risultato
        const ok = (rel, d) => ({ '<': d < -1e-12, '<=': d <= 1e-12, '>': d > 1e-12, '>=': d >= -1e-12, '=': Math.abs(d) <= 1e-12 }[rel]);
        const test = (x) => insiemi.some(I => I.tutti || (I.rel && ok(I.rel, x - I.x.val)) || (I.lo && ok(I.lr, I.lo.val - x) && ok(I.hr, x - I.hi.val)));
        const chiave = (I) => (I.rel ? I.x.val + (I.rel[0] === '>' ? 1e-9 : 0) : I.lo.val);
        const ordinati = insiemi.filter(I => !I.vuoto).sort((a, b) => chiave(a) - chiave(b));
        // x < a oppure x > a  ->  x ≠ a
        if (ordinati.length === 2 && ordinati[0].rel === '<' && ordinati[1].rel === '>' && Math.abs(ordinati[0].x.val - ordinati[1].x.val) < 1e-12) ordinati.splice(0, 2, { rel: '\\neq', x: ordinati[0].x, neq: true });
        const testi = ordinati.map(I => (I.tutti ? null : I.neq ? `${v} \\neq ${I.x.tex}` : I.rel ? `${v} ${RT(I.rel)} ${I.x.tex}` : `${I.lo.tex} ${RT(I.lr)} ${v} ${RT(I.hr)} ${I.hi.tex}`));
        let html, kind = 'diseqSost';
        if (insiemi.some(I => I.tutti)) { html = fineR(`è verificata per ogni \\(${v} \\in \\mathbb{R}\\)`); kind = 'sempre'; }
        else if (!testi.length) { html = 'La disequazione non ammette soluzioni.'; kind = 'mai'; }
        else {
            html = fineR(`è risolta per \\(${testi.join(' \\quad\\text{oppure}\\quad ')}\\)`);
            const fin = testi.join(OPP);
            if (fin !== riga()) slides.push({ rows: [fin], note: '' });
        }
        slides.forEach(sl => { if (sl.note) sl.note = sl.note.replace(/\\dfrac/g, '\\frac'); });
        return { slides, B, risultato: { kind, html, text: html, test } };
    }

    /* un membro è una potenza (positiva), l'altro un numero negativo o nullo */
    function segnoCostante(lhs, rhs, rel, lato) {
        const R = (t) => `\\color{red}{}${t}\\color{gray}{}`;
        const tL = SBS.astTex(lhs, null, 'gray'), tR = SBS.astTex(rhs, null, 'gray');
        const pot = lato === 'sx' ? tR : tL, c = lato === 'sx' ? tL : tR;
        const r = lato === 'sx' ? INV[rel] : rel;     // potenza r c
        const riga = `${tL} ${SBS.REL[rel].tex} ${tR}`;
        const sempre = r === '>' || r === '>=';
        const zero = numero(lato === 'sx' ? lhs : rhs).isZero();
        const evid = lato === 'sx' ? `${tL} ${SBS.REL[rel].tex} ${R(tR)}` : `${R(tL)} ${SBS.REL[rel].tex} ${tR}`;
        const cosa = r === '=' ? (zero ? 'non può valere \\(0\\)' : `non può essere uguale a \\(${c}\\), che è un numero negativo`)
            : sempre ? `è sempre ${r === '>' ? 'maggiore' : 'maggiore o uguale'} di \\(${c}\\)` : `non può essere ${r === '<' ? 'minore' : 'minore o uguale'} di \\(${c}\\)`;
        const nota = `Una potenza con base positiva è un numero positivo per ogni valore di \\(x\\): \\(${pot}\\) ${cosa}.`;
        const slides = [{ rows: [riga], note: '' }, { rows: [evid], note: nota }];
        let html, kind, test;
        if (sempre && r !== '=') {
            slides.push({ rows: [`\\underset{\\forall x \\in \\mathbb{R}}{\\underbrace{${riga}}}`], note: '' });
            html = `La disequazione è verificata per ogni \\(x \\in \\mathbb{R}\\).`; kind = 'sempre'; test = () => true;
        } else {
            slides.push({ rows: [`\\underset{\\text{impossibile}}{\\underbrace{${riga}}}`], note: '' });
            html = r === '=' ? "L'equazione non ammette soluzioni." : 'La disequazione non ammette soluzioni.'; kind = r === '=' ? 'nessuna' : 'mai'; test = () => false;
        }
        return { slides, B: null, risultato: { kind, html, text: html, test, roots: [] } };
    }

    /* ---------------- punto di ingresso ---------------- */
    function risolvi(lhs, rhs, rel) {
        rel = rel || '=';
        const somma = (n) => strip(n).t === 'add';
        const cL = numero(lhs), cR = numero(rhs);
        let r;
        const positivo = (n) => { try { build(n); return true; } catch (e) { return false; } };
        if ((cR && cR.sign() <= 0 && !cL && positivo(lhs)) || (cL && cL.sign() <= 0 && !cR && positivo(rhs))) r = segnoCostante(lhs, rhs, rel, cL ? 'sx' : 'dx');
        else r = (somma(lhs) || somma(rhs)) ? sostituzione(lhs, rhs, rel) : passaggio(lhs, rhs, rel);
        const p0 = r.slides[0] ? r.slides[0].rows[0] : '';
        return {
            tipo: 'esponenziale', consegna: rel === '=' ? "Risolvere l'equazione" : 'Risolvere la disequazione',
            startTex: p0, slides: r.slides, v: 'x', base: r.B, risultato: r.risultato
        };
    }

    SBS.esponenziali = { risolvi };
})(typeof window !== 'undefined' ? window : globalThis);
