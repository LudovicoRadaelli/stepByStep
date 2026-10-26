/* =====================================================================
   StepByStep - equazioni di primo grado ed espressioni / polinomi
   Ogni passaggio produce una o più slide nello stile delle schede:
   - in rosso ciò su cui si sta lavorando
   - la riga nuova viene scritta sotto un termine alla volta
     (i termini non ancora scritti sono \color{transparent})
   - poi la riga vecchia sparisce e quella nuova sale
   ===================================================================== */
(function (global) {
    'use strict';
    const SBS = global.SBS;
    const { Q, SBSError, nid, emit, brackets, lcm, gcd } = SBS;

    /* =====================================================================
       MODELLO
       monomio:  {k:'m', id, s:±1, c:Q>0, d:grado}
       prodotto: {k:'p', id, hid, s, c, d, f:[fattori], fd:bool}
                 (s c x^d è la "testa" davanti alle parentesi; fd = la
                  frazione va scritta come \dfrac{...(...)}{den})
       fattore:  {id, side:[termini], e:esponente, k:'('|'['|'{'|'·'|'^'}
       riga:     {L:[termini], R:[termini]|null, den?:{q, idL, idR}}
       ===================================================================== */
    const mono = (s, c, d) => ({ k: 'm', id: nid(), s, c, d });
    /* le righe che iniziano con AUX sono calcoli ausiliari (vanno a capo, staccate) */
    const AUX = SBS.AUX = '%AUX%';

    function cloneTerm(t) {
        if (t.k === 'm') return { ...t };
        return { ...t, f: t.f.map(cloneFactor) };
    }
    function cloneFactor(F) { return { ...F, side: F.side.map(cloneTerm) }; }
    function cloneLine(l) {
        return { L: l.L.map(cloneTerm), R: l.R ? l.R.map(cloneTerm) : null, den: l.den ? { ...l.den } : undefined };
    }
    /* copia con id nuovi (serve per (a+b)^2 = (a+b)(a+b)) */
    function freshTerm(t) {
        if (t.k === 'm') return { ...t, id: nid() };
        return { ...t, id: nid(), hid: nid(), f: t.f.map(F => ({ ...F, id: nid(), side: F.side.map(freshTerm) })) };
    }

    /* trova un termine (anche dentro le parentesi) */
    function locate(line, id) {
        const sides = [line.L, line.R].filter(Boolean);
        function inSide(side) {
            for (let i = 0; i < side.length; i++) {
                const t = side[i];
                if (t.id === id) return { side, idx: i, term: t };
                if (t.k === 'p') for (const F of t.f) { const r = inSide(F.side); if (r) return r; }
            }
            return null;
        }
        for (const s of sides) { const r = inSide(s); if (r) return r; }
        throw new Error('termine non trovato ' + id);
    }

    const isMonoFactor = (F) => F.side.length === 1 && F.side[0].k === 'm';

    /* =====================================================================
       DALL'ALBERO DEL PARSER AL MODELLO
       ===================================================================== */
    function conv(ast, ctx) {
        const out = [];
        termsOf(ast, 1, ctx, out);
        return out;
    }
    function termsOf(node, s, ctx, out) {
        if (node.t === 'add') node.a.forEach(c => termsOf(c, s, ctx, out));
        else if (node.t === 'neg') termsOf(node.a, -s, ctx, out);
        else {
            const t = termOf(node, s, ctx);
            if (t) out.push(t);
        }
    }

    function asMono(n, ctx) {
        switch (n.t) {
            case 'num': return { s: n.v.sign() < 0 ? -1 : 1, c: n.v.abs(), d: 0 };
            case 'var': useVar(n.n, ctx); return { s: 1, c: new Q(1), d: 1 };
            case 'pow':
                if (n.b.t === 'var') {
                    useVar(n.b.n, ctx);
                    const e = intExp(n.e);
                    return { s: 1, c: new Q(1), d: e };
                }
                return null;
            case 'neg': {
                const m = asMono(n.a, ctx);
                return m ? { ...m, s: -m.s } : null;
            }
            case 'const': throw new SBSError(n.n === 'e' ? 'Il numero e si usa solo nelle derivate.' : 'Il numero π non è gestito in questo tipo di esercizio.');
            case 'fn': throw new SBSError('Le funzioni (sin, cos, ln, √...) si usano solo nelle derivate.');
        }
        return null;
    }
    function useVar(v, ctx) {
        if (!ctx.v) ctx.v = v;
        else if (ctx.v !== v) throw new SBSError(`Usa una sola lettera come incognita (ho trovato sia «${ctx.v}» che «${v}»).`);
    }
    function intExp(e) {
        let s = 1;
        while (e.t === 'neg') { s = -s; e = e.a; }
        if (e.t === 'grp') return intExp(e.a) * s;
        if (e.t !== 'num' || !e.v.isInt() || s * e.v.n < 0) throw new SBSError('Gli esponenti devono essere numeri naturali (0, 1, 2, 3, ...).');
        const v = s * e.v.n;
        if (v > 12) throw new SBSError('Esponente troppo grande per uno svolgimento passo passo.');
        return v;
    }

    function termOf(node, s, ctx) {
        const list = node.t === 'mul' ? node.f : [{ op: '', n: node }];
        const t = { k: 'p', id: nid(), hid: nid(), s, c: new Q(1), d: 0, f: [], fd: false };
        let headOpen = true;
        for (const { op, n } of list) {
            if (op === '/') {
                const m = asMono(stripG(n), ctx);
                if (!m || m.d !== 0) throw new SBSError("Ci sono frazioni con l'incognita al denominatore: le equazioni fratte non sono ancora gestite.");
                if (m.c.isZero()) throw new SBSError('Nel testo compare una divisione per zero.');
                t.c = t.c.div(m.c); t.s *= m.s;
                if (t.f.length) t.fd = true;
                continue;
            }
            const m = asMono(n, ctx);
            if (m && (op === '' || op === 'impl') && headOpen) {
                t.c = t.c.mul(m.c); t.d += m.d; t.s *= m.s;
                continue;
            }
            headOpen = false;
            t.f.push(factorOf(n, op === ':' ? -1 : 1, ctx));
        }
        if (t.c.isZero()) { t.c = new Q(0); }
        return normalize(t);
    }
    function stripG(n) { return n.t === 'grp' ? stripG(n.a) : n; }

    function factorOf(n, e, ctx) {
        if (n.t === 'grp') return { id: nid(), side: conv(n.a, ctx), e, k: n.k };
        if (n.t === 'pow' && n.b.t === 'grp') {
            if (e < 0) throw new SBSError('Divisione per una potenza: non ancora gestita.');
            return { id: nid(), side: conv(n.b.a, ctx), e: intExp(n.e), k: n.b.k };
        }
        if (n.t === 'pow' && n.b.t === 'num') {
            const m = asMono(n.b, ctx);
            return { id: nid(), side: [mono(m.s, m.c, 0)], e: intExp(n.e) * (e < 0 ? -1 : 1), k: m.s < 0 || !m.c.isInt() ? '(' : '^' };
        }
        const m = asMono(n, ctx);
        if (!m) throw new SBSError('Questa scrittura non è ancora gestita: prova a usare le parentesi.');
        return { id: nid(), side: [mono(m.s, m.c, m.d)], e, k: m.s < 0 ? '(' : '·' };
    }

    /* testa banale (+1) seguita da un fattore monomio: lo assorbo */
    function normalize(t) {
        if (t.k !== 'p') return t;
        while (t.f.length && t.c.isOne() && t.d === 0 && t.s === 1 && isMonoFactor(t.f[0]) && t.f[0].e === 1 && !t.fd) {
            const m = t.f[0].side[0];
            t.c = m.c; t.d = m.d; t.s = m.s;
            t.f = t.f.slice(1);
        }
        if (!t.f.length) {
            if (t.c.isZero()) return null;
            return { k: 'm', id: t.id, s: t.s, c: t.c, d: t.d };
        }
        return t;
    }

    /* =====================================================================
       DISEGNO
       ===================================================================== */
    function varTex(d, v) { return d === 0 ? '' : (d === 1 ? v : `${v}^{${d}}`); }
    function coefTex(c, d, v) {
        if (c.isOne() && d > 0) return varTex(d, v);
        return c.texAbs() + varTex(d, v);
    }
    function monoTex(m, v, first = true) {
        const sign = m.s < 0 ? (first ? '-' : ' - ') : (first ? '' : ' + ');
        return sign + coefTex(m.c, m.d, v);
    }

    function renderSide(side, ctx) {
        if (!side.length) return ['0'];
        return side.map((t, i) => renderTerm(t, i === 0, ctx));
    }

    function renderTerm(t, first, ctx) {
        const v = ctx.v;
        let node;
        const sign = t.s < 0 ? (first ? '-' : ' - ') : (first ? '' : ' + ');
        if (t.k === 'm') {
            node = { span: t.id, items: [sign + coefTex(t.c, t.d, v)] };
        } else {
            const trivial = t.c.isOne() && t.d === 0;
            if (t.fd) {
                const numHead = (t.c.n === 1 && t.d === 0) ? '' : coefTex(new Q(t.c.n), t.d, v);
                const onlyParen = !numHead && t.f.length === 1 && t.f[0].e === 1 && '([{'.includes(t.f[0].k);
                const fItems = t.f.map((F, i) => renderFactor(F, i === 0 && !numHead, ctx, onlyParen));
                node = {
                    span: t.id, items: [
                        { span: t.hid, items: [sign] },
                        { g: ['\\dfrac{', [{ span: t.hid, items: numHead ? [numHead] : [] }, ...fItems], '}{', [{ span: t.hid, items: [String(t.c.d)] }], '}'], sid: t.hid }
                    ]
                };
            } else {
                const head = sign + (trivial ? '' : coefTex(t.c, t.d, v));
                const fItems = t.f.map((F, i) => renderFactor(F, i === 0 && trivial, ctx, false));
                node = { span: t.id, items: [{ span: t.hid, items: [head] }, ...fItems] };
            }
        }
        if (ctx.cancel && ctx.cancel.has(t.id)) return { g: ['\\cancel{', [node], '}'], stroke: 'red' };
        return node;
    }

    function renderFactor(F, firstNoHead, ctx, noBrackets) {
        const inner = renderSide(F.side, ctx);
        const div = F.e === -1;
        const expG = F.e > 1 || F.e === 0 ? { g: ['^{', [String(F.e)], '}'] } : '';
        let items;
        if (F.k === '·') {
            const pre = div ? ' : ' : (firstNoHead ? '' : ' \\cdot ');
            items = [pre, ...inner, expG];
        } else if (F.k === '^') {
            const pre = div ? ' : ' : (firstNoHead ? '' : ' \\cdot ');
            items = [pre, ...inner, expG];
        } else {
            const pre = div ? ' : ' : '';
            items = noBrackets ? [...inner] : [pre, ...brackets(F.k, inner), expG];
        }
        return { span: F.id, items };
    }

    function renderLine(line, ctx, colors, opts = {}) {
        const c2 = { ...ctx, cancel: opts.cancel };
        let L = renderSide(line.L, c2);
        let R = line.R ? renderSide(line.R, c2) : null;
        if (line.den) {
            const dn = (id) => {
                const it = { span: id, items: [line.den.q.texAbs()] };
                return opts.cancel && opts.cancel.has(id) ? { g: ['\\cancel{', [it], '}'], stroke: 'red' } : it;
            };
            L = [{ g: ['\\dfrac{', L, '}{', [dn(line.den.idL)], '}'], id: line.den.gL }];
            if (R) R = [{ g: ['\\dfrac{', R, '}{', [dn(line.den.idR)], '}'], id: line.den.gR }];
        }
        const items = R ? [...L, ` ${SBS.REL[ctx.rel || '='].tex} `, ...R] : L;
        if (opts.itemsOnly) return items;
        const tex = emit(items, colors, ctx.base, opts.rootWant, opts.leafFn);
        return (ctx.frame ? ctx.frame.pre : '') + tex + (ctx.frame ? ctx.frame.post : '');
    }

    /* =====================================================================
       COSTRUZIONE DELLE SLIDE
       ===================================================================== */
    class Slides {
        constructor(ctx) { this.ctx = ctx; this.list = []; }
        T(line, colors, opts) { return renderLine(line, this.ctx, colors, opts); }
        push(rows, note) {
            const last = this.list[this.list.length - 1];
            if (last && last.rows.join('|') === rows.join('|')) return;
            this.list.push({ rows, note: note || '' });
        }
        plain(line, note) {
            this.push([this.T(line)], note);
        }
        /* evidenzio in rosso, poi sostituisco nella stessa riga */
        inPlace(oldL, newL, src, dst, note, sideRows = []) {
            const c1 = red(src), c2 = red(dst);
            this.push([this.T(oldL, c1)], note);
            sideRows.forEach(r => this.push([this.T(oldL, c1), AUX + r], note));
            this.push([this.T(newL, c2)], note);
        }
        /* Nuova riga scritta sotto, da sinistra verso destra:
           1) si ricopia la parte che precede il calcolo,
           2) si svolge il calcolo un termine alla volta,
           3) si ricopia la parte che segue.
           opts.frame = pezzi di struttura nuovi (es. le parentesi del risultato),
           visibili insieme al calcolo. */
        twoRow(oldL, newL, groups, note, allAtOnce = false, opts = {}) {
            const base = this.ctx.base;
            if (allAtOnce) {
                const c1 = new Map(), c2 = new Map();
                groups.forEach(g => { g.src.forEach(id => c1.set(id, g.color || 'red')); g.dst.forEach(id => c2.set(id, g.color || 'red')); });
                this.push([this.T(oldL, c1)], note);
                this.push([this.T(oldL, c1), this.T(newL, c2)], note);
                this.push([this.T(oldL, null, { rootWant: 'transparent' }), this.T(newL)], note);
                this.push([this.T(newL)], note);
                return;
            }
            const frame = new Set(opts.frame || []);
            const restoNota = 'Ricopiamo la parte che non cambia.';
            // classifico ogni pezzo della riga nuova: calcolo (gruppo k), struttura, oppure da ricopiare
            const dstOf = new Map();
            groups.forEach((g, k) => g.dst.forEach(id => dstOf.set(id, k)));
            const info = SBS.leafInfo(renderLine(newL, this.ctx, null, { itemsOnly: true }));
            const cls = info.map(chain => {
                let k = -1, f = false;
                for (const id of chain) { if (dstOf.has(id)) k = dstOf.get(id); if (frame.has(id)) f = true; }
                return k >= 0 ? 'calc' : (f ? 'frame' : 'resto');
            });
            const first = cls.findIndex(c => c !== 'resto');
            let last = -1; cls.forEach((c, j) => { if (c !== 'resto') last = j; });
            const pos = cls.map((c, j) => c !== 'resto' ? 'calc' : (first < 0 || j < first ? 'prima' : (j > last ? 'dopo' : 'mezzo')));
            const hasPrima = pos.includes('prima'), hasDopo = pos.includes('dopo');
            // fase: 0 = solo "prima", 1 = anche struttura/mezzo, 2 = tutto
            const leaf = (fase) => (j) => {
                const p = pos[j];
                if (p === 'prima') return base;
                if (p === 'mezzo') return fase >= 1 ? base : undefined;
                if (p === 'dopo') return fase >= 2 ? base : undefined;
                return undefined;
            };
            const colorsAt = (j, cur, fase) => {
                const m = new Map();
                frame.forEach(id => m.set(id, fase >= 1 ? base : 'transparent'));
                groups.forEach((g, k) => g.dst.forEach(id => m.set(id, k < j ? base : (k === j && cur ? 'red' : 'transparent'))));
                return m;
            };
            const nuovo = (j, cur, fase) => this.T(newL, colorsAt(j, cur, fase), { rootWant: 'transparent', leafFn: leaf(fase) });
            if (hasPrima) this.push([this.T(oldL), nuovo(-1, false, 0)], restoNota);
            groups.forEach((g, j) => {
                const c1 = red(g.src);
                const n = g.note || note;
                const hid = nuovo(j, false, 1);
                this.push([this.T(oldL, c1), hid], n);
                (g.side || []).forEach(r => this.push([this.T(oldL, c1), hid, AUX + r], n));
                this.push([this.T(oldL), nuovo(j, true, 1)], n);
            });
            if (hasDopo) this.push([this.T(oldL), this.T(newL)], restoNota);
            else this.push([this.T(oldL), this.T(newL)], note);
            this.push([this.T(oldL, null, { rootWant: 'transparent' }), this.T(newL)], note);
            this.push([this.T(newL)], note);
        }
    }
    function red(ids) { return new Map((ids || []).map(id => [id, 'red'])); }

    /* ---------------- calcoli "a parte" (terza riga) ---------------- */
    function fracTexSigned(m, v, wrapNeg) {
        const t = `\\dfrac{${m.c.n}}{${m.c.d}}${varTex(m.d, v)}`;
        if (m.s < 0) return wrapNeg ? `\\Big(-${t}\\Big)` : `-${t}`;
        return t;
    }
    function mulMono(a, b, v) {
        const m = mono(a.s * b.s, a.c.mul(b.c), a.d + b.d);
        let rows = null;
        const frac = !a.c.isInt() || !b.c.isInt();
        if (frac && !a.c.isOne() && !b.c.isOne()) {
            const A = fracTexSigned(a, v, false), B = fracTexSigned(b, v, true);
            const r1 = `${A} \\cdot ${B} =`;
            const g1 = gcd(a.c.n, b.c.d), g2 = gcd(b.c.n, a.c.d);
            rows = [r1];
            let last = r1;
            if (g1 > 1 || g2 > 1) {
                const num = (n, g) => g > 1 ? `\\overset{${n / g}}{\\cancel{${n}}}` : `${n}`;
                const den = (d, g) => g > 1 ? `\\underset{${d / g}}{\\cancel{${d}}}` : `${d}`;
                const fa = `\\dfrac{${num(a.c.n, g1)}}{${den(a.c.d, g2)}}${varTex(a.d, v)}`;
                let fb = `\\dfrac{${num(b.c.n, g2)}}{${den(b.c.d, g1)}}${varTex(b.d, v)}`;
                const sa = a.s < 0 ? '-' : '';
                if (b.s < 0) fb = `\\Big(-${fb}\\Big)`;
                last = `${sa}${fa} \\cdot ${fb} =`;
                rows.push(last);
            }
            rows.push(`${last} ${monoTex(m, v)}`);
        }
        return { m, rows };
    }

    function sumRows(group, v) {
        if (group.every(t => t.c.isInt())) return [];
        const coefSeq = group.map((t, i) => (t.s < 0 ? (i ? ' - ' : '-') : (i ? ' + ' : '')) + t.c.texAbs()).join('');
        const m = group.reduce((acc, t) => lcm(acc, t.c.d), 1);
        const nums = group.map((t, i) => {
            const n = t.c.n * (m / t.c.d);
            return (t.s < 0 ? (i ? ' - ' : '-') : (i ? ' + ' : '')) + n;
        }).join('');
        const tot = group.reduce((acc, t) => acc.add(t.c.mul(t.s)), new Q(0));
        const pre = group[0].d > 0 ? `\\left(${coefSeq}\\right)${varTex(group[0].d, v)}` : coefSeq;
        const r1 = `${pre} =`;
        const r2 = `${r1} \\dfrac{${nums}}{${m}}${varTex(group[0].d, v)} =`;
        const res = tot.isZero() ? '0' : monoTex(mono(tot.sign(), tot.abs(), group[0].d), v);
        return [r1, r2, `${r2} ${res}`];
    }

    /* =====================================================================
       PASSAGGI
       ===================================================================== */
    function hasLike(side) {
        const seen = new Set();
        for (const t of side) {
            if (t.k !== 'm') continue;
            if (seen.has(t.d)) return true;
            seen.add(t.d);
        }
        return false;
    }

    function nextWork(side) {
        for (const t of side) {
            if (t.k !== 'p') continue;
            for (const F of t.f) { const w = nextWork(F.side); if (w) return w; }
            for (const F of t.f) if (F.side.length > 1 && hasLike(F.side)) return { type: 'sumInside', term: t, F };
            return { type: 'expand', term: t };
        }
        return null;
    }

    /* somma del primo gruppo di termini simili di un lato */
    function sumFirstGroup(line, sideOf, S, note) {
        const nl = cloneLine(line);
        const side = sideOf(nl);
        const byDeg = new Map();
        side.forEach(t => { if (t.k === 'm') { if (!byDeg.has(t.d)) byDeg.set(t.d, []); byDeg.get(t.d).push(t); } });
        const group = [...byDeg.values()].find(g => g.length > 1);
        if (!group) return null;
        const tot = group.reduce((acc, t) => acc.add(t.c.mul(t.s)), new Q(0));
        const firstIdx = side.indexOf(group[0]);
        const ids = new Set(group.map(t => t.id));
        const rest = side.filter(t => !ids.has(t.id));
        let dst = [];
        if (!tot.isZero()) {
            const nm = mono(tot.sign(), tot.abs(), group[0].d);
            rest.splice(Math.min(firstIdx, rest.length), 0, nm);
            dst = [nm.id];
        }
        side.length = 0; rest.forEach(t => side.push(t));
        const d = group[0].d;
        const n = note || (d === 0 ? 'Sommiamo i numeri.' : `Sommiamo i termini simili (quelli con \\(${varTex(d, S.ctx.v)}\\)).`);
        S.inPlace(line, nl, [...ids], dst, n, sumRows(group, S.ctx.v));
        return nl;
    }

    function doWork(line, w, S) {
        const ctx = S.ctx, v = ctx.v;
        if (w.type === 'sumInside') {
            return sumFirstGroup(line, (nl) => {
                const { term } = locate(nl, w.term.id);
                return term.f.find(F => F.id === w.F.id).side;
            }, S, 'Prima di tutto sommiamo i termini simili dentro la parentesi.');
        }
        const nl = cloneLine(line);
        const loc = locate(nl, w.term.id);
        const t = loc.term;

        // 1) un fattore vale zero
        const zf = t.f.find(F => F.side.length === 0);
        if (zf) {
            loc.side.splice(loc.idx, 1);
            S.inPlace(line, nl, [t.id], [], 'Un prodotto con un fattore uguale a zero vale zero: il termine sparisce.');
            return nl;
        }

        // 2) potenze
        const pi = t.f.findIndex(F => F.e > 1 || F.e === 0);
        if (pi >= 0) {
            const F = t.f[pi];
            if (F.e === 0) {
                const nf = { id: nid(), side: [mono(1, new Q(1), 0)], e: 1, k: '·' };
                t.f.splice(pi, 1, nf);
                const nt = normalizeIn(loc, t);
                S.inPlace(line, nl, [F.id], [nt.newId(nf)], 'Ogni numero (diverso da zero) elevato alla 0 vale 1.');
                return nl;
            }
            if (isMonoFactor(F)) {
                const m = F.side[0];
                const s = (m.s < 0 && F.e % 2 === 1) ? -1 : 1;
                const nm = mono(s, m.c.pow(F.e), m.d * F.e);
                const nf = { id: nid(), side: [nm], e: 1, k: s < 0 || !nm.c.isInt() ? '(' : '·' };
                t.f.splice(pi, 1, nf);
                const nt = normalizeIn(loc, t);
                const note = m.d > 0
                    ? 'Calcoliamo la potenza: eleviamo il coefficiente e moltiplichiamo gli esponenti della lettera.'
                    : (m.s < 0 ? `Calcoliamo la potenza: la base è negativa e l'esponente è ${F.e % 2 ? 'dispari, quindi il risultato è negativo' : 'pari, quindi il risultato è positivo'}.` : 'Calcoliamo la potenza.');
                S.inPlace(line, nl, [F.id], [nt.newId(nf)], note);
                return nl;
            }
            if (F.e > 4) throw new SBSError('Potenze di polinomi con esponente maggiore di 4 non sono gestite.');
            const copies = [];
            for (let i = 0; i < F.e; i++) copies.push({ id: nid(), side: F.side.map(freshTerm), e: 1, k: F.k });
            t.f.splice(pi, 1, ...copies);
            S.inPlace(line, nl, [F.id], copies.map(c => c.id),
                `Scriviamo la potenza come prodotto: la parentesi va moltiplicata per se stessa ${F.e} volte.`);
            return nl;
        }

        // 3) divisioni
        const di = t.f.findIndex(F => F.e === -1);
        if (di >= 0) {
            const F = t.f[di];
            if (!isMonoFactor(F)) throw new SBSError('Divisione per un polinomio: non è un esercizio di questo tipo.');
            const m = F.side[0];
            if (m.c.isZero()) throw new SBSError('Nel calcolo compare una divisione per zero.');
            if (di === 0) {
                if (t.d < m.d) throw new SBSError('La divisione darebbe la x al denominatore: non è un polinomio.');
                const oldHid = t.hid;
                t.c = t.c.div(m.c); t.d -= m.d; t.s *= m.s; t.hid = nid();
                t.f.splice(0, 1);
                const nt = normalizeIn(loc, t);
                S.inPlace(line, nl, [oldHid, F.id], [nt.headId()], 'Eseguiamo la divisione.');
                return nl;
            }
            const P = t.f[di - 1];
            if (!isMonoFactor(P) || P.e !== 1) throw new SBSError('Per dividere un polinomio per un numero scrivilo come frazione, ad esempio (4x+2)/2.');
            const a = P.side[0];
            if (a.d < m.d) throw new SBSError('La divisione darebbe la x al denominatore: non è un polinomio.');
            const r = mono(a.s * m.s, a.c.div(m.c), a.d - m.d);
            const nf = { id: nid(), side: [r], e: 1, k: r.s < 0 || !r.c.isInt() ? '(' : '·' };
            t.f.splice(di - 1, 2, nf);
            const nt = normalizeIn(loc, t);
            S.inPlace(line, nl, [P.id, F.id], [nt.newId(nf)], 'Eseguiamo la divisione.');
            return nl;
        }

        // 4) primo fattore monomio: lo moltiplico per la testa
        if (isMonoFactor(t.f[0])) {
            const F = t.f[0];
            const head = { s: t.s, c: t.c, d: t.d };
            const { m, rows } = mulMono(head, F.side[0], v);
            const oldHid = t.hid;
            t.s = m.s; t.c = m.c; t.d = m.d; t.hid = nid();
            t.f.splice(0, 1);
            const nt = normalizeIn(loc, t);
            S.inPlace(line, nl, [oldHid, F.id], [nt.headId()], 'Moltiplichiamo: prima i segni, poi i numeri, poi le lettere (sommando gli esponenti).', rows || []);
            return nl;
        }

        // 5) due parentesi: ogni termine della prima per ogni termine della seconda
        if (t.f.length >= 2) {
            const [A, B] = t.f;
            const groups = [];
            const side = [];
            for (const a of A.side) for (const b of B.side) {
                const { m, rows } = mulMono(a, b, v);
                side.push(m);
                groups.push({ src: [a.id, b.id], dst: [m.id], side: rows || [] });
            }
            const P = { id: nid(), side, e: 1, k: '(' };
            t.f.splice(0, 2, P);
            S.twoRow(line, nl, groups, 'Moltiplichiamo ogni termine della prima parentesi per ogni termine della seconda.', false, { frame: [t.hid, P.id] });
            return nl;
        }

        // 6) una sola parentesi: tolgo le parentesi distribuendo la testa
        const F = t.f[0];
        const headTrivial = t.c.isOne() && t.d === 0;
        const newTerms = [], groups = [];
        for (const u of F.side) {
            const { m, rows } = mulMono({ s: t.s, c: t.c, d: t.d }, u, v);
            newTerms.push(m);
            groups.push({ src: headTrivial ? [t.hid, u.id] : [t.hid, u.id], dst: [m.id], side: rows || [] });
        }
        loc.side.splice(loc.idx, 1, ...newTerms);
        if (headTrivial && t.s > 0) {
            S.twoRow(line, nl, [{ src: [t.id], dst: newTerms.map(m => m.id) }],
                'Davanti alla parentesi c\'è il segno +: togliamo le parentesi lasciando i segni invariati.');
        } else if (headTrivial) {
            S.twoRow(line, nl, groups, 'Davanti alla parentesi c\'è il segno −: togliamo le parentesi cambiando il segno di ogni termine.');
        } else {
            const ht = monoTex(mono(t.s, t.c, t.d), v);
            S.twoRow(line, nl, groups, `Moltiplichiamo \\(${ht}\\) per ogni termine della parentesi.`);
        }
        return nl;
    }

    /* dopo una modifica il prodotto può ridursi a un monomio */
    function normalizeIn(loc, t) {
        const res = normalize(t);
        if (res === null) { loc.side.splice(loc.idx, 1); return { newId: () => null, headId: () => null }; }
        loc.side[loc.idx] = res;
        if (res.k === 'm') return { newId: () => res.id, headId: () => res.id };
        return {
            newId: (nf) => res.f.includes(nf) ? nf.id : res.hid,
            headId: () => res.hid
        };
    }

    /* ---------------- fasi ---------------- */
    function expandAll(line, S) {
        let guard = 0;
        for (;;) {
            const w = nextWork(line.L) || (line.R && nextWork(line.R));
            if (!w) break;
            line = doWork(line, w, S);
            if (++guard > 300) throw new SBSError("L'esercizio è troppo lungo da svolgere passo passo.");
        }
        return line;
    }

    function sumAll(line, S) {
        let changed = false;
        for (const key of ['L', 'R']) {
            if (!line[key]) continue;
            for (;;) {
                const nl = sumFirstGroup(line, l => l[key], S);
                if (!nl) break;
                line = nl; changed = true;
            }
        }
        return { line, changed };
    }

    function cancelEqual(line, S) {
        const used = new Set(), pairs = [];
        for (const a of line.L) {
            if (a.k !== 'm') continue;
            const b = line.R.find(b => b.k === 'm' && !used.has(b.id) && b.s === a.s && b.d === a.d && b.c.eq(a.c));
            if (b) { used.add(b.id); pairs.push(a.id, b.id); }
        }
        if (!pairs.length) return line;
        const ids = new Set(pairs);
        const note = 'Eliminiamo i termini uguali che compaiono in entrambi i membri.';
        S.push([S.T(line, null, { cancel: ids })], note);
        const nl = cloneLine(line);
        nl.L = nl.L.filter(t => !ids.has(t.id));
        nl.R = nl.R.filter(t => !ids.has(t.id));
        S.plain(nl, note);
        return nl;
    }

    function mcm(line, S) {
        const all = [...line.L, ...line.R];
        if (all.every(t => t.c.isInt())) return line;
        const m = all.reduce((acc, t) => lcm(acc, t.c.d), 1);
        const fr = all.filter(t => !t.c.isInt()).map(t => t.id);
        const n0 = `Ci sono delle frazioni. Calcoliamo il m.c.m. dei denominatori: \\(\\text{m.c.m.} = ${m}\\).`;
        S.push([S.T(line, red(fr))], n0);
        const nl = { L: [], R: [], den: { q: new Q(m), idL: nid(), idR: nid(), gL: nid(), gR: nid() } };
        const groups = [];
        for (const key of ['L', 'R']) {
            for (const t of line[key]) {
                const nt = mono(t.s, t.c.mul(m), t.d);
                nl[key].push(nt);
                const k = m / t.c.d;
                const row = t.c.isInt()
                    ? `${m} \\cdot ${t.c.n} = ${nt.c.n}`
                    : `${m} : ${t.c.d} = ${k} \\qquad ${k} \\cdot ${t.c.n} = ${nt.c.n}`;
                groups.push({ src: [t.id], dst: [nt.id], side: [row] });
            }
        }
        S.twoRow(line, nl, groups, `Riduciamo allo stesso denominatore ${m}: dividiamo ${m} per ogni denominatore e moltiplichiamo il risultato per il numeratore.`, false, { frame: [nl.den.gL, nl.den.gR] });
        const n2 = `Moltiplichiamo entrambi i membri per ${m}: i denominatori si eliminano.` + (S.ctx.rel && S.ctx.rel !== '=' ? ` Poiché ${m} è positivo, il verso della disuguaglianza non cambia.` : '');
        S.push([S.T(nl, null, { cancel: new Set([nl.den.idL, nl.den.idR]) })], n2);
        const nd = cloneLine(nl); delete nd.den;
        S.plain(nd, n2);
        return nd;
    }

    function transport(line, S) {
        const movR = line.R.filter(t => t.d > 0);
        const movL = line.L.filter(t => t.d === 0);
        if (!movR.length && !movL.length) return line;
        const nl = { L: [], R: [] };
        const groups = [];
        line.L.filter(t => t.d > 0).forEach(t => nl.L.push({ ...t }));
        movR.forEach(t => { const n = mono(-t.s, t.c, t.d); nl.L.push(n); groups.push({ src: [t.id], dst: [n.id], color: 'red' }); });
        line.R.filter(t => t.d === 0).forEach(t => nl.R.push({ ...t }));
        movL.forEach(t => { const n = mono(-t.s, t.c, t.d); nl.R.push(n); groups.push({ src: [t.id], dst: [n.id], color: 'blue' }); });
        S.twoRow(line, nl, groups, `Portiamo i termini con la \\(${S.ctx.v}\\) al primo membro (in rosso) e i numeri al secondo membro (in blu): passando dall'altra parte ${S.ctx.rel && S.ctx.rel !== '=' ? 'della disuguaglianza' : "dell'uguale"} cambiano segno.`, true);
        return nl;
    }

    /* vero/falso di "u rel w" tra numeri */
    function relVera(u, rel, w) {
        const d = u - w;
        return { '=': d === 0, '<': d < 0, '>': d > 0, '<=': d <= 0, '>=': d >= 0 }[rel];
    }
    const RT = (rel) => SBS.REL[rel].tex;

    function finish(line, S) {
        const v = S.ctx.v;
        const rel = S.ctx.rel || '=';
        const dis = rel !== '=';
        const L = line.L, R = line.R;
        const a = L.length ? L[0].c.mul(L[0].s) : new Q(0);
        const b = R.length ? R[0].c.mul(R[0].s) : new Q(0);
        if (a.isZero()) {
            const vera = relVera(0, rel, b.val());
            if (dis) {
                S.plain(line, vera ? `La disuguaglianza \\(0 ${RT(rel)} ${b.tex()}\\) è sempre vera: qualunque valore di \\(${v}\\) la soddisfa.` : `La disuguaglianza \\(0 ${RT(rel)} ${b.tex()}\\) è falsa: nessun valore di \\(${v}\\) la soddisfa.`);
                return vera ? { kind: 'sempre', text: `La disequazione è verificata per ogni \\(${v} \\in \\mathbb{R}\\).` } : { kind: 'mai', text: 'La disequazione non ammette soluzioni.' };
            }
            if (b.isZero()) {
                S.plain(line, 'Otteniamo un\'uguaglianza sempre vera: qualunque valore di x la soddisfa.');
                return { kind: 'indeterminata', text: "L'equazione è <b>indeterminata</b>: ogni numero reale è soluzione." };
            }
            S.plain(line, 'Otteniamo un\'uguaglianza falsa: nessun valore di x la soddisfa.');
            return { kind: 'impossibile', text: "L'equazione è <b>impossibile</b>: non ha soluzioni." };
        }
        const sol = b.div(a);
        const neg = a.sign() < 0;
        const rel2 = dis && neg ? SBS.REL[rel].inv : rel;
        const solTex = `${v} ${RT(rel2)} ${sol.tex()}`;
        const esito = () => dis
            ? { kind: 'diseq1', tex: solTex, sol, rel: rel2, text: `La disequazione è risolta per \\(${solTex}\\).` }
            : { kind: 'sol', tex: solTex, sol };
        if (a.isOne()) return esito();
        if (a.eq(-1) && !dis) {
            const n = 'Cambiamo segno a entrambi i membri (moltiplichiamo per \\(-1\\)).';
            S.push([`\\color{red}{}-${v}\\color{${S.ctx.base}}{} = \\color{red}{}${b.tex()}`], n);
            S.push([`${v} = \\color{red}{}${sol.tex()}`], n);
            S.push([solTex], n);
            return esito();
        }
        let n = `Dividiamo entrambi i membri per il coefficiente della \\(${v}\\), cioè per \\(${a.tex()}\\).`;
        if (dis && neg) n += ` <b class="red">Attenzione:</b> \\(${a.tex()}\\) è un numero negativo, quindi il verso della disuguaglianza si inverte: \\(${RT(rel)}\\) diventa \\(${RT(rel2)}\\).`;
        else if (dis) n += ` Poiché \\(${a.tex()}\\) è positivo, il verso della disuguaglianza non cambia.`;
        const aT = a.tex();
        const R2 = dis && neg ? `\\color{red}{}${RT(rel2)}\\color{${S.ctx.base}}{}` : RT(rel2);
        if (dis && neg) S.push([`\\dfrac{${aT}${v}}{${aT}} \\color{red}{}${RT(rel)}\\color{${S.ctx.base}}{} \\dfrac{${b.tex()}}{${aT}}`, `\\dfrac{${aT}${v}}{\\color{red}{}${aT}} ${R2} \\dfrac{${b.tex()}}{\\color{red}{}${aT}}`], n);
        S.push([`\\dfrac{${aT}${v}}{\\color{red}{}${aT}} ${R2} \\dfrac{${b.tex()}}{\\color{red}{}${aT}}`], n);
        const giaSemplice = a.isInt() && b.isInt() && a.n > 0 && sol.n === b.n && sol.d === a.n;
        if (a.isInt() && b.isInt() && !giaSemplice) {
            S.push([`${v} ${R2} \\dfrac{${b.n}}{${a.n}}`], n);
            S.push([`${v} ${RT(rel2)} \\color{red}{}${sol.tex()}`], 'Semplifichiamo il risultato.');
        } else {
            S.push([`${v} ${RT(rel2)} \\color{red}{}${sol.tex()}`], n);
        }
        S.push([solTex], n);
        return esito();
    }

    function orderPoly(line, S) {
        const side = line.L;
        const sorted = [...side].sort((a, b) => b.d - a.d);
        if (sorted.every((t, i) => t === side[i])) return line;
        const nl = { L: sorted.map(t => ({ ...t })), R: line.R ? line.R.map(t => ({ ...t })) : null };
        S.push([S.T(nl, red(sorted.map(t => t.id)))], `Ordiniamo il polinomio secondo le potenze decrescenti di \\(${S.ctx.v}\\).`);
        S.plain(nl, `Ordiniamo il polinomio secondo le potenze decrescenti di \\(${S.ctx.v}\\).`);
        return nl;
    }

    /* =====================================================================
       PUNTI DI INGRESSO
       ===================================================================== */
    /* grado effettivo (dopo aver portato tutto da una parte) */
    function gradoNetto(line) {
        const m = new Map();
        line.L.forEach(t => m.set(t.d, (m.get(t.d) || new Q(0)).add(t.c.mul(t.s))));
        line.R.forEach(t => m.set(t.d, (m.get(t.d) || new Q(0)).sub(t.c.mul(t.s))));
        let g = 0;
        for (const [d, c] of m) if (!c.isZero() && d > g) g = d;
        return g;
    }

    function tuttoAlPrimo(line, S) {
        if (!line.R.length) return line;
        const nl = { L: line.L.map(t => ({ ...t })), R: [] };
        const groups = [];
        line.R.forEach(t => { const n = mono(-t.s, t.c, t.d); nl.L.push(n); groups.push({ src: [t.id], dst: [n.id], color: 'red' }); });
        const dis = S.ctx.rel && S.ctx.rel !== '=';
        S.twoRow(line, nl, groups, `Portiamo tutti i termini al primo membro: passando dall'altra parte ${dis ? 'della disuguaglianza' : "dell'uguale"} cambiano segno. Al secondo membro resta \\(0\\).`, true);
        return nl;
    }

    function risolvi(lhs, rhs, rel, opts) {
        rel = rel || '=';
        const dis = rel !== '=';
        const ctx = { v: null, base: (opts && opts.base) || 'gray', rel };
        let line = { L: conv(lhs, ctx), R: conv(rhs, ctx) };
        ctx.v = ctx.v || 'x';
        const S = new Slides(ctx);
        const startTex = S.T(line);
        S.plain(line, '');
        line = expandAll(line, S);
        S.plain(line, '');
        line = cancelEqual(line, S);
        line = mcm(line, S);
        const grado = gradoNetto(line);
        if (grado > 2) throw new SBSError(`Dopo i calcoli ${dis ? 'la disequazione' : "l'equazione"} è di grado ${grado}: questa app risolve solo il primo e il secondo grado.`);
        const nome = dis ? 'la disequazione' : "l'equazione";
        let res;
        if (grado === 2) {
            line = tuttoAlPrimo(line, S);
            line = sumAll(line, S).line;
            line = orderPoly(line, S);
            S.plain(line, '');
            res = dis ? disequazione2(line, S) : equazione2(line, S);
        } else {
            line = transport(line, S);
            line = sumAll(line, S).line;
            S.plain(line, '');
            res = finish(line, S);
        }
        let text;
        if (res.kind === 'sol') text = `L'equazione ha soluzione \\(${res.tex}\\).`;
        else text = res.text;
        return {
            tipo: dis ? 'disequazione' : 'equazione', grado: grado === 2 ? 2 : 1,
            consegna: dis ? 'Risolvere la disequazione' : "Risolvere l'equazione",
            startTex, slides: S.list, risultato: { ...res, html: text }, v: ctx.v
        };
    }
    function equazione(lhs, rhs) { return risolvi(lhs, rhs, '='); }

    /* =====================================================================
       SECONDO GRADO
       ===================================================================== */
    function coeff2(line) {
        const get = (d) => line.L.filter(t => t.d === d).reduce((acc, t) => acc.add(t.c.mul(t.s)), new Q(0));
        return { a: get(2), b: get(1), c: get(0) };
    }
    const par = (q) => (q.sign() < 0 ? `\\left(${q.tex()}\\right)` : q.tex());
    function isqrt(n) { const r = Math.round(Math.sqrt(n)); return r * r === n ? r : null; }

    /* radice: {N, s, K, M, D} vale (N + s·K·√M) / D  (M senza fattori quadrati, D > 0) */
    function radTex(r) {
        if (r.K === 0 || r.M === 1) return new Q(r.N + r.s * r.K * (r.M === 1 ? 1 : 0), r.D).tex();
        const k = r.K === 1 ? '' : String(r.K);
        const rad = `${k}\\sqrt{${r.M}}`;
        let num;
        if (r.N === 0) num = (r.s < 0 ? '-' : '') + rad;
        else num = `${r.N} ${r.s < 0 ? '-' : '+'} ${rad}`;
        if (r.D === 1) return num;
        if (r.N === 0 && r.s < 0) return `-\\dfrac{${rad}}{${r.D}}`;
        return `\\dfrac{${num}}{${r.D}}`;
    }
    const radVal = (r) => (r.N + r.s * r.K * Math.sqrt(r.M)) / r.D;

    /* scomposizione del numero sotto radice, come sul quaderno */
    function scomponiRadice(N) {
        const rows = [];
        const exps = [];                  // [[p, e], ...] nell'ordine in cui compaiono
        let rest = N;
        const fattTex = () => {
            const f = exps.map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`));
            if (rest > 1) f.push(String(rest));
            return f.join(' \\cdot ');
        };
        let p = 2;
        while (rest > 1) {
            if (p * p > rest && rest > 1) {
                // rest è primo
                const ex = exps.find(x => x[0] === rest);
                if (ex) ex[1]++; else exps.push([rest, 1]);
                const pr = rest; rest = 1;
                if (exps.length > 1 || exps[0][1] > 1) rows.push({ tex: `\\sqrt{${fattTex()}}`, note: `${pr} è un numero primo.` });
                break;
            }
            if (rest % p === 0) {
                const prima = rest;
                rest /= p;
                const ex = exps.find(x => x[0] === p);
                if (ex) ex[1]++; else exps.push([p, 1]);
                rows.push({ tex: `\\sqrt{${fattTex()}}`, note: `Scomponiamo in fattori primi: dividiamo ${prima} per ${p}.` });
            } else p++;
        }
        // separo le potenze pari
        let K = 1, M = 1;
        const pari = [], resto = [];
        exps.sort((x, y) => x[0] - y[0]).forEach(([q, e]) => {
            const ep = e - (e % 2);
            if (ep > 0) { pari.push([q, ep]); K *= Math.pow(q, ep / 2); }
            if (e % 2) { resto.push(q); M *= q; }
        });
        const potT = ([q, e]) => (e === 1 ? `${q}` : `${q}^{${e}}`);
        if (pari.length) {
            const sep = [...pari.map(potT), ...resto.map(String)].join(' \\cdot ');
            if (`\\sqrt{${sep}}` !== rows[rows.length - 1].tex) rows.push({ tex: `\\sqrt{${sep}}`, note: 'Separiamo i fattori con esponente pari.' });
            const fuori = pari.map(([q, e]) => potT([q, e / 2])).join(' \\cdot ');
            const dentro = resto.join(' \\cdot ');
            rows.push({ tex: dentro ? `${fuori}\\sqrt{${dentro}}` : fuori, note: 'I fattori con esponente pari escono dalla radice con l\'esponente dimezzato.' });
            const fuoriVal = pari.map(([q, e]) => String(Math.pow(q, e / 2))).join(' \\cdot ');
            if (fuoriVal !== fuori || resto.length > 1) rows.push({ tex: dentro ? `${fuoriVal}\\sqrt{${M}}` : fuoriVal, note: 'Calcoliamo.' });
            if (pari.length > 1 && M > 1) rows.push({ tex: `${K}\\sqrt{${M}}`, note: 'Calcoliamo.' });
            else if (pari.length > 1) rows.push({ tex: `${K}`, note: 'Calcoliamo.' });
        } else {
            rows.push({ tex: `\\sqrt{${N}}`, note: `Nella scomposizione di ${N} non ci sono fattori con esponente pari: la radice non si può semplificare.` });
        }
        // tolgo righe ripetute
        const out = [];
        rows.forEach(r => { if (!out.length || out[out.length - 1].tex !== r.tex) out.push(r); });
        return { rows: out, K, M };
    }

    /* Formula risolutiva nello stile della scheda "equazioniSecondoGrado/1":
       riga 1 = equazione (con i coefficienti sottintesi scritti), riga 2 = formula che si trasforma.
       Ogni lettera: lettera in rosso -> coefficiente in rosso nell'equazione -> valore in rosso nella formula. */
    function formula(line, S, intro) {
        const v = S.ctx.v;
        const { a, b, c } = coeff2(line);
        const A = a.n, B = b.n, C = c.n;               // dopo il m.c.m. sono interi
        const RED = (t) => `\\color{red}{}${t}\\color{${S.ctx.base}}{}`;
        const DOT = '\\,\\cdot\\,';
        // ---------- riga dell'equazione ----------
        const mostraB = { implicito: Math.abs(B) === 1, manca: B === 0 };
        const mostraC = { manca: C === 0 };
        let scritti = { a: false, b: false, c: false };   // coefficienti sottintesi già scritti
        const eqTex = (hl) => {
            const coefA = (scritti.a || Math.abs(A) !== 1) ? `${A}` : (A < 0 ? '-' : '');
            let t = (hl === 'a' ? RED(coefA) : coefA) + `${v}^2`;
            if (B !== 0 || scritti.b) {
                const sb = `${B < 0 ? '-' : '+'} ${(scritti.b || Math.abs(B) !== 1) ? Math.abs(B) : ''}`;
                t += ' ' + (hl === 'b' ? RED(sb) : sb) + v;
            }
            if (C !== 0 || scritti.c) {
                const sc = `${C < 0 ? '-' : '+'} ${Math.abs(C)}`;
                t += ' ' + (hl === 'c' ? RED(sc) : sc);
            }
            return `${t} = 0`;
        };
        // ---------- riga della formula ----------
        const st = { mb: '-b', b: 'b', a1: 'a', c: 'c', a2: 'a' };
        const fTex = (o = {}) => {
            const g = (k) => (o.hl === k ? RED(st[k]) : st[k]);
            const num = o.num || `${g('mb')} \\pm \\sqrt{${o.rad || `${g('b')}^2 - 4${DOT}${g('a1')}${DOT}${g('c')}`}}`;
            const den = o.den || `2${DOT}${g('a2')}`;
            return `${v} = \\dfrac{${num}}{${den}}`;
        };
        const push = (rows, note) => S.push(rows, note || '');
        push([eqTex()], intro);
        // coefficienti sottintesi
        if (Math.abs(A) === 1) {
            const n = `Il coefficiente della \\(${v}^2\\) è sottinteso, è \\(${A}\\).`;
            push([eqTex()], n); scritti.a = true; push([eqTex()], n);
        }
        if (mostraB.implicito) {
            const n = `Il coefficiente della \\(${v}\\) è sottinteso, è \\(${B}\\).`;
            push([eqTex()], n); scritti.b = true; push([eqTex()], n);
        }
        if (mostraB.manca) { const n = `Manca il termine con la \\(${v}\\): il suo coefficiente è \\(0\\).`; push([eqTex()], n); scritti.b = true; push([eqTex()], n); }
        if (mostraC.manca) { const n = `Manca il termine noto: vale \\(0\\).`; push([eqTex()], n); scritti.c = true; push([eqTex()], n); }
        push([eqTex(), fTex()], 'Usiamo la formula di risoluzione delle equazioni di secondo grado.');
        // ---------- sostituzione, una lettera alla volta ----------
        const par = (n) => (n < 0 ? `\\left(${n}\\right)` : `${n}`);
        const val = {
            mb: B > 0 ? `-${B}` : B < 0 ? `-\\left(${B}\\right)` : `-0`,
            b: par(B), a1: par(A), c: par(C), a2: par(A)
        };
        const coeffDi = { mb: 'b', b: 'b', a1: 'a', c: 'c', a2: 'a' };
        for (const k of ['mb', 'b', 'a1', 'c', 'a2']) {
            push([eqTex(), fTex({ hl: k })]);
            push([eqTex(coeffDi[k]), fTex()]);
            st[k] = val[k];
            push([eqTex(), fTex({ hl: k })]);
        }
        // ---------- calcoli ----------
        let mb = val.mb;                       // numeratore: primo termine
        let b2 = `${par(B)}^2`;                // b^2
        let prod = `- 4${DOT}${par(A)}`;      // parte del prodotto su cui si lavora
        let prodResto = `${DOT}${par(C)}`;     // parte che resta (grigia)
        let den = `2${DOT}${par(A)}`;
        const F = (o = {}) => {
            const pick = (k, t) => (o.hl === k ? RED(t) : t);
            const num = `${pick('mb', mb)} \\pm \\sqrt{${o.radAll ? RED(o.radAll) : `${pick('b2', b2)} ${pick('prod', prod)}${prodResto}`}}`;
            return `${v} = \\dfrac{${num}}{${pick('den', den)}}`;
        };
        const passo = (k, nuovo) => { push([eqTex(), F({ hl: k })]); if (k === 'mb') mb = nuovo; if (k === 'b2') b2 = nuovo; if (k === 'prod') prod = nuovo; if (k === 'den') den = nuovo; push([eqTex(), F({ hl: k })]); };
        if (B < 0) passo('mb', `${-B}`);
        if (B === 0) passo('mb', '');
        passo('b2', `${B * B}`);
        const signed = (n) => (n < 0 ? `- ${-n}` : `+ ${n}`);
        const p1 = -4 * A;
        passo('prod', signed(p1));
        prod = `${signed(p1)}${DOT}${par(C)}`; prodResto = '';
        const p2 = p1 * C;
        passo('prod', signed(p2));
        const D = B * B + p2;
        // somma sotto radice
        push([eqTex(), F({ radAll: `${b2} ${prod}` })]);
        const radState = (t) => `${mb} \\pm \\sqrt{${t}}`;
        let numTex = radState(RED(`${D}`));
        push([eqTex(), `${v} = \\dfrac{${numTex}}{${den}}`]);
        numTex = radState(`${D}`);
        passo2den();
        function passo2den() {
            push([eqTex(), `${v} = \\dfrac{${numTex}}{${RED(den)}}`]);
            den = `${2 * A}`;
            push([eqTex(), `${v} = \\dfrac{${numTex}}{${RED(den)}}`]);
        }
        const N0 = -B, D0 = 2 * A;
        const mbT = N0 === 0 ? '' : `${N0}`;
        const frac = (num, d) => `${v} = \\dfrac{${num}}{${d}}`;
        const testo = (t) => HTML + `<div class="gray sbs-testo-slide">${t}</div>`;
        // ---------- discriminante negativo ----------
        if (D < 0) {
            push([eqTex(), frac(`${mbT} \\pm ${RED(`\\sqrt{${D}}`)}`, D0)], 'Il numero sotto radice è negativo: la radice non esiste.');
            push([eqTex(), frac(`${mbT} \\pm \\sqrt{${D}}`, D0), testo("L'equazione non ha soluzioni reali.")]);
            return { a, b, c, roots: [] };
        }
        // ---------- discriminante nullo ----------
        if (D === 0) {
            push([eqTex(), frac(`${mbT} \\pm ${RED('\\sqrt{0}')}`, D0)]);
            push([eqTex(), frac(`${mbT} \\pm ${RED('0')}`, D0)]);
            push([eqTex(), RED(frac(N0, D0))]);
            const q = new Q(N0, D0);
            push([eqTex(), `${v} = ${RED(q.tex())}`]);
            push([eqTex(), `${v} = ${q.tex()}`, testo("L'equazione ha due soluzioni coincidenti:"), `${v} = ${q.tex()}`]);
            return { a, b, c, roots: [{ N: q.n, s: 1, K: 0, M: 1, D: q.d }] };
        }
        const sq = isqrt(D);
        // ---------- quadrato perfetto ----------
        if (sq !== null) {
            push([eqTex(), frac(`${mbT} \\pm ${RED(`\\sqrt{${D}}`)}`, D0)]);
            push([eqTex(), frac(`${mbT} \\pm ${RED(`${sq}`)}`, D0)]);
            const xp = new Q(N0 + sq, D0), xm = new Q(N0 - sq, D0);
            const split = `${v} = \\dfrac{${mbT} + ${sq}}{${D0}} \\qquad \\text{oppure} \\qquad ${v} = \\dfrac{${mbT} - ${sq}}{${D0}}`;
            push([eqTex(), frac(`${mbT} \\pm ${sq}`, D0), testo("Separiamo le due soluzioni."), RED(split)]);
            const fin = `${v} = ${xp.tex()} \\qquad \\text{oppure} \\qquad ${v} = ${xm.tex()}`;
            push([eqTex(), frac(`${mbT} \\pm ${sq}`, D0), testo("L'equazione è risolta per"), RED(fin)]);
            push([eqTex(), frac(`${mbT} \\pm ${sq}`, D0), testo("L'equazione è risolta per"), fin]);
            const ord = [xm, xp].sort((p, q) => p.val() - q.val());
            return { a, b, c, roots: ord.map(q => ({ N: q.n, s: 1, K: 0, M: 1, D: q.d })) };
        }
        // ---------- radice da semplificare: scomposizione dentro la radice ----------
        const nScomp = 'Scomponiamo il numero sotto radice.';
        const sc = scomponiRadice(D);
        const dentro = (r) => r.tex.startsWith('\\sqrt') ? r.tex : null;
        let last = `\\sqrt{${D}}`;
        push([eqTex(), frac(`${mbT} \\pm \\sqrt{${D}}`, D0)], nScomp);
        const passiRad = sc.rows.filter(r => dentro(r));
        passiRad.forEach(r => { last = r.tex; push([eqTex(), frac(`${mbT} \\pm ${last}`, D0)], nScomp); });
        // fattori con esponente pari fuori dalla radice
        let K = sc.K, M = sc.M;
        if (K > 1) {
            const nFuori = 'Portiamo fuori i termini con esponente pari.';
            // fattori pari e dispari della scomposizione finale
            const pari = [], resto = [];
            (function () {
                let r = D; const ex = [];
                for (let p = 2; r > 1; p++) { let e = 0; while (r % p === 0) { r /= p; e++; } if (e) ex.push([p, e]); }
                ex.forEach(([p, e]) => { if (e >= 2) pari.push([p, e - (e % 2)]); if (e % 2) resto.push(p); });
            })();
            const pt = ([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`);
            const parteDentro = (rosso) => [...pari.map(x => (rosso ? RED(pt(x)) : pt(x))), ...resto.map(String)].join(' \\cdot ');
            push([eqTex(), frac(`${mbT} \\pm \\sqrt{${parteDentro(false)}}`, D0)], nFuori);
            push([eqTex(), frac(`${mbT} \\pm \\sqrt{${parteDentro(true)}}`, D0)], nFuori);
            const fuori = pari.map(([p, e]) => `${p}^{${e / 2}}`).join(' \\cdot ');
            const rad = resto.length ? `\\,\\sqrt{${resto.join(' \\cdot ')}}` : '';
            push([eqTex(), frac(`${mbT} \\pm ${RED(fuori)}${rad}`, D0)], nFuori);
            const radM = M > 1 ? `\\,\\sqrt{${M}}` : '';
            push([eqTex(), frac(`${mbT} \\pm ${K}${radM}`, D0)], 'Semplifichiamo.');
        }
        const kT = (k) => `${k}${M > 1 ? `\\,\\sqrt{${M}}` : ''}`;
        let N = N0, Dd = D0;
        // denominatore negativo: cambio segno sopra e sotto
        if (Dd < 0) {
            N = -N; Dd = -Dd;
            push([eqTex(), frac(`${N === 0 ? '' : N} \\pm ${kT(K)}`, Dd)], 'Cambiamo segno al numeratore e al denominatore.');
        }
        const g = [Math.abs(N), K, Dd].reduce((x, y) => SBS.gcd(x, y));
        if (g > 1) {
            const cn = (n, s) => `\\overset{${n / g}}{\\cancel{${n}}}`;
            const numC = `${N === 0 ? '' : (N < 0 ? '-' : '') + cn(Math.abs(N))} \\pm ${cn(K)}${M > 1 ? `\\,\\sqrt{${M}}` : ''}`;
            push([eqTex(), frac(`${N === 0 ? '' : N} \\pm ${kT(K)}`, Dd)], 'Semplifichiamo.');
            push([eqTex(), frac(numC, `\\underset{${Dd / g}}{\\cancel{${Dd}}}`)], 'Semplifichiamo.');
            N /= g; K /= g; Dd /= g;
            push([eqTex(), frac(`${N === 0 ? '' : N} \\pm ${kT(K)}`, Dd)]);
        }
        const pmTex = `${N === 0 ? '' : N} \\pm ${K === 1 ? '' : K}${M > 1 ? `\\,\\sqrt{${M}}` : ''}`;
        const finale = Dd === 1 ? `${v} = ${pmTex}` : frac(pmTex, Dd);
        if (Dd === 1 || K === 1) push([eqTex(), finale]);
        const r1 = { N, s: -1, K, M, D: Dd }, r2 = { N, s: 1, K, M, D: Dd };
        const fin = `${v} = ${radTex(r2)} \\qquad \\text{oppure} \\qquad ${v} = ${radTex(r1)}`;
        push([eqTex(), finale, testo("L'equazione è risolta per"), RED(fin)]);
        push([eqTex(), finale, testo("L'equazione è risolta per"), fin]);
        return { a, b, c, roots: [r1, r2], pm: Dd === 1 ? pmTex : `\\dfrac{${pmTex}}{${Dd}}` };
    }

    function equazione2(line, S) {
        const v = S.ctx.v;
        const f = formula(line, S, "È un'equazione di secondo grado.");
        if (!f.roots.length) return { kind: 'nessuna', text: "L'equazione non ha soluzioni reali.", roots: [], esatte: [] };
        if (f.roots.length === 1) return { kind: 'coincidenti', text: `L'equazione ha due soluzioni coincidenti: \\(${v} = ${radTex(f.roots[0])}\\).`, roots: f.roots.map(radVal), esatte: f.roots };
        if (f.pm) return { kind: 'sol2', esatte: f.roots, text: `L'equazione ha soluzioni \\(${v} = ${f.pm}\\), cioè \\(${v} = ${radTex(f.roots[1])}\\) oppure \\(${v} = ${radTex(f.roots[0])}\\).`, roots: f.roots.map(radVal) };
        return { kind: 'sol2', esatte: f.roots, text: `L'equazione ha soluzioni \\(${v} = ${radTex(f.roots[0])}\\) oppure \\(${v} = ${radTex(f.roots[1])}\\).`, roots: f.roots.map(radVal) };
    }

    /* ---------------- metodo della parabola ---------------- */
    const AZZURRO = '#4285F4';
    function parabola(opts) {
        // opts: {up, roots:[tex...] (0,1,2), segni:bool, parab:bool, scelti:[bool per intervallo], punti:[bool per radice]}
        const W = 300, H = 210, Y = 115;
        const n = opts.roots.length;
        const xs = n === 2 ? [100, 200] : n === 1 ? [150] : [];
        let svg = `<svg viewBox="0 0 ${W} ${H}" class="sbs-parabola-svg" role="img" aria-label="Parabola">`;
        // evidenziazione degli intervalli scelti
        if (opts.scelti) {
            const bordi = [12, ...xs, 282];
            opts.scelti.forEach((ok, i) => {
                if (!ok) return;
                const x0 = bordi[i] + (i > 0 ? 6 : 0), x1 = bordi[i + 1] - (i < bordi.length - 2 ? 6 : 0);
                svg += `<rect x="${x0}" y="${Y - 14}" width="${Math.max(0, x1 - x0)}" height="28" rx="6" fill="#0F9D58" fill-opacity="0.16"/>`;
            });
        }
        // asse x
        svg += `<line x1="8" y1="${Y}" x2="${W - 10}" y2="${Y}" stroke="#222" stroke-width="1.6"/>`;
        svg += `<path d="M${W - 10} ${Y} l-8 -4 v8 z" fill="#222"/>`;
        svg += `<text x="${W - 14}" y="${Y + 18}" font-size="15" font-style="italic" font-family="Times New Roman, serif" fill="#222">x</text>`;
        // parabola (sempre uguale in ampiezza)
        if (opts.parab) {
            const s = opts.up ? 1 : -1;
            let yv, k;
            if (n === 2) { yv = Y + s * 62; k = 62 / (50 * 50); }
            else if (n === 1) { yv = Y; k = 62 / (50 * 50); }
            else { yv = Y - s * 30; k = 62 / (50 * 50); }
            const pts = [];
            for (let x = 20; x <= 280; x += 4) {
                const y = yv - s * k * (x - 150) * (x - 150);
                if (y < 4 || y > H - 4) continue;
                pts.push(`${x},${y.toFixed(1)}`);
            }
            svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        // segni
        if (opts.segni) {
            const sa = opts.up ? 1 : -1;
            const segniInt = n === 2 ? [sa, -sa, sa] : n === 1 ? [sa, sa] : [sa];
            const bordi = [14, ...xs, 274];
            segniInt.forEach((sg, i) => {
                const x0 = bordi[i] + (i > 0 ? 14 : 0), x1 = bordi[i + 1] - (i < bordi.length - 2 ? 14 : 0);
                for (let x = x0; x <= x1 - 8; x += 15) {
                    svg += sg > 0
                        ? `<text x="${x}" y="${Y + 6}" font-size="20" font-weight="700" fill="#DB4437" font-family="Arial, sans-serif">+</text>`
                        : `<text x="${x}" y="${Y + 6}" font-size="22" font-weight="700" fill="${AZZURRO}" font-family="Arial, sans-serif">−</text>`;
                }
            });
            xs.forEach(x => {
                svg += `<circle cx="${x}" cy="${Y}" r="9" fill="white" stroke="#222" stroke-width="1.4"/>`;
                svg += `<text x="${x}" y="${Y + 5}" font-size="14" font-weight="700" text-anchor="middle" fill="black" font-family="Arial, sans-serif">0</text>`;
            });
        } else {
            xs.forEach(x => { svg += `<circle cx="${x}" cy="${Y}" r="3.5" fill="#222"/>`; });
        }
        svg += '</svg>';
        // etichette delle soluzioni (MathJax) sotto l'asse
        // etichette lontane dalla curva: fuori dalle radici, dalla parte dell'asse dove la parabola non passa
        const sotto = opts.up;
        const lab = opts.roots.map((t, i) => {
            const lato = n === 2 ? (i === 0 ? 'sx' : 'dx') : 'c';
            const tx = lato === 'sx' ? 'translateX(-100%)' : lato === 'dx' ? 'translateX(0)' : 'translateX(-50%)';
            const dx = lato === 'sx' ? -6 : lato === 'dx' ? 6 : 0;
            const off = n === 1 ? 14 : 10;
            const pos = sotto ? `top:${((Y + off) / H * 100).toFixed(2)}%` : `bottom:${((H - Y + off) / H * 100).toFixed(2)}%`;
            return `<div class="sbs-par-lab" style="left:${((xs[i] + dx) / W * 100).toFixed(2)}%; ${pos}; transform:${tx}">\\(${t}\\)</div>`;
        }).join('');
        return HTML + `<div class="sbs-parabola">${svg}${lab}</div>`;
    }
    const HTML = SBS.HTMLROW = '%HTML%';

    function disequazione2(line, S) {
        const v = S.ctx.v, rel = S.ctx.rel;
        const lineTex = S.T(line);
        const polyLine = { L: line.L, R: null };
        const poly = renderLine(polyLine, { ...S.ctx, rel: '=' });
        const assoc = `${poly} = 0`;
        S.push([lineTex], `È una disequazione di secondo grado: usiamo il metodo della parabola. Per prima cosa risolviamo l'equazione associata \\(${assoc}\\).`);
        const sub = new Slides({ ...S.ctx, rel: '=' });
        const f = formula({ L: line.L, R: [] }, sub, "Risolviamo l'equazione associata.");
        sub.list.forEach(sl => S.push(sl.rows, sl.note));
        const up = f.a.sign() > 0;
        const rootsT = f.roots.map(radTex);
        const vals = f.roots.map(radVal);
        const n = f.roots.length;
        const gr = (o) => parabola({ up, roots: rootsT, ...o });
        S.push([lineTex, gr({})], n === 2 ? 'Disponiamo le due soluzioni sull\'asse delle \\(x\\): sono i punti in cui la parabola incontra l\'asse.'
            : n === 1 ? 'Disponiamo la soluzione sull\'asse delle \\(x\\): la parabola tocca l\'asse in un solo punto.'
                : 'L\'equazione associata non ha soluzioni: la parabola non incontra l\'asse delle \\(x\\).');
        S.push([lineTex, gr({ parab: true })], `Il coefficiente \\(a = ${f.a.tex()}\\) è ${up ? 'positivo: la parabola ha la concavità verso l\'alto' : 'negativo: la parabola ha la concavità verso il basso'}.`);
        S.push([lineTex, gr({ parab: true, segni: true })], 'Dove la parabola sta sopra l\'asse il polinomio è positivo (<b class="red">+</b>), dove sta sotto è negativo (<b style="color:' + AZZURRO + '">−</b>); nelle soluzioni dell\'equazione associata vale \\(0\\).');
        // scelta degli intervalli
        const sa = up ? 1 : -1;
        const segniInt = n === 2 ? [sa, -sa, sa] : n === 1 ? [sa, sa] : [sa];
        const vuole = { '>': [1], '>=': [1], '<': [-1], '<=': [-1] }[rel];
        const conZero = rel === '>=' || rel === '<=';
        const scelti = segniInt.map(sg => vuole.includes(sg));
        const cosa = { '>': 'positivo', '<': 'negativo', '>=': 'positivo o nullo', '<=': 'negativo o nullo' }[rel];
        // testo della soluzione
        const lt = conZero ? '\\leq' : '\\lt', gt = conZero ? '\\geq' : '\\gt';
        let solTex = null, html;
        if (n === 2) {
            const [r1, r2] = rootsT;
            if (scelti[0] && scelti[2]) solTex = `${v} ${lt} ${r1} \\quad\\text{oppure}\\quad ${v} ${gt} ${r2}`;
            else solTex = `${r1} ${lt} ${v} ${lt} ${r2}`;
            html = `La disequazione è risolta per \\(${solTex}\\).`;
        } else if (n === 1) {
            const r = rootsT[0];
            if (scelti[0] && conZero) html = `La disequazione è verificata per ogni \\(${v} \\in \\mathbb{R}\\).`;
            else if (scelti[0]) { solTex = `${v} \\neq ${r}`; html = `La disequazione è verificata per ogni \\(${v} \\neq ${r}\\).`; }
            else if (conZero) { solTex = `${v} = ${r}`; html = `La disequazione è verificata solo per \\(${v} = ${r}\\).`; }
            else html = 'La disequazione non ammette soluzioni.';
        } else {
            html = scelti[0] ? `La disequazione è verificata per ogni \\(${v} \\in \\mathbb{R}\\).` : 'La disequazione non ammette soluzioni.';
        }
        const nota = `Cerchiamo dove il polinomio è ${cosa}, cioè dove \\(${poly} ${RT(rel)} 0\\).`;
        const finale = solTex ? `\\color{red}{}${solTex}` : null;
        S.push([lineTex, gr({ parab: true, segni: true, scelti }), ...(finale ? [finale] : [])], nota + (finale ? '' : ' ' + html.replace('La disequazione', 'Quindi la disequazione')));
        S.push([lineTex, gr({ parab: true, segni: true, scelti }), ...(solTex ? [solTex] : [])], '');
        return { kind: 'diseq2', text: html, roots: vals, esatte: f.roots, rel, up, scelti, conZero };
    }

    function espressione(ast, frame, base) {
        const ctx = { v: null, base: base || 'gray', frame };
        let line = { L: conv(ast, ctx), R: null };
        ctx.v = ctx.v || 'x';
        const S = new Slides(ctx);
        const startTex = S.T(line);
        S.plain(line, '');
        line = expandAll(line, S);
        S.plain(line, '');
        line = sumAll(line, S).line;
        line = orderPoly(line, S);
        S.plain(line, '');
        const ctx0 = { ...ctx, frame: null };
        const finalTex = renderLine(line, ctx0);
        const numeric = line.L.every(t => t.d === 0);
        return {
            tipo: 'espressione',
            consegna: numeric ? "Calcolare il valore dell'espressione" : "Semplificare l'espressione",
            startTex, slides: S.list, v: ctx.v, finalLine: line,
            risultato: { kind: 'expr', tex: finalTex, html: `Il risultato è \\(${finalTex}\\).` }
        };
    }

    /* il risultato è un polinomio? (serve alle derivate) */
    function convertibile(ast) {
        try { conv(ast, { v: null }); return true; } catch (e) { return false; }
    }

    /* valore numerico di una riga (per i controlli automatici) */
    function valSide(side, x) {
        return side.reduce((acc, t) => {
            let v = t.s * t.c.val() * Math.pow(x, t.d);
            if (t.k === 'p') for (const F of t.f) v *= Math.pow(valSide(F.side, x), F.e);
            return acc + v;
        }, 0);
    }

    SBS.algebra = { radTex, equazione, risolvi, espressione, convertibile, valSide, conv, renderLine, scomponiRadice };
})(typeof window !== 'undefined' ? window : globalThis);
