/* =====================================================================
   StepByStep - nucleo comune
   - Frazioni (classe Q)
   - Lettura dell'esercizio digitato dallo studente (tokenizer + parser)
   - Disegno in LaTeX con colori (rosso / blu / transparent) nello
     stile delle schede: \color{red}{} ... \color{gray}{}
   Tutti i file del motore usano l'oggetto globale SBS, così la pagina
   funziona anche aperta con doppio clic (file://), senza server.
   ===================================================================== */
(function (global) {
    'use strict';
    const SBS = global.SBS = global.SBS || {};

    /* ---------------- Errori comprensibili per lo studente ---------------- */
    class SBSError extends Error {
        constructor(msg) { super(msg); this.name = 'SBSError'; }
    }
    SBS.SBSError = SBSError;

    /* ---------------- Identificativi univoci ---------------- */
    let _id = 0;
    const nid = () => ++_id;
    SBS.nid = nid;

    /* ---------------- Frazioni ---------------- */
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
    function lcm(a, b) { return a / gcd(a, b) * b; }
    SBS.gcd = gcd; SBS.lcm = lcm;

    const LIMITE = 1e12;
    class Q {
        constructor(n, d = 1) {
            if (d === 0) throw new SBSError('Nel calcolo compare una divisione per zero.');
            if (!Number.isFinite(n) || !Number.isFinite(d)) throw new SBSError('Numero non valido.');
            if (d < 0) { n = -n; d = -d; }
            const g = gcd(n, d) || 1;
            this.n = n / g; this.d = d / g;
            if (Math.abs(this.n) > LIMITE || this.d > LIMITE) throw new SBSError('I numeri diventano troppo grandi per questo esercizio.');
        }
        static of(x) { return x instanceof Q ? x : new Q(x, 1); }
        add(o) { o = Q.of(o); return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
        sub(o) { o = Q.of(o); return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
        mul(o) { o = Q.of(o); return new Q(this.n * o.n, this.d * o.d); }
        div(o) { o = Q.of(o); if (o.n === 0) throw new SBSError('Nel calcolo compare una divisione per zero.'); return new Q(this.n * o.d, this.d * o.n); }
        neg() { return new Q(-this.n, this.d); }
        abs() { return new Q(Math.abs(this.n), this.d); }
        pow(e) {
            if (e < 0) return new Q(1).div(this.pow(-e));
            let r = new Q(1);
            for (let i = 0; i < e; i++) r = r.mul(this);
            return r;
        }
        isZero() { return this.n === 0; }
        isOne() { return this.n === 1 && this.d === 1; }
        isInt() { return this.d === 1; }
        sign() { return Math.sign(this.n); }
        eq(o) { o = Q.of(o); return this.n === o.n && this.d === o.d; }
        val() { return this.n / this.d; }
        /* LaTeX del valore assoluto */
        texAbs() { const n = Math.abs(this.n); return this.d === 1 ? String(n) : `\\dfrac{${n}}{${this.d}}`; }
        tex() { return (this.n < 0 ? '-' : '') + this.texAbs(); }
        toString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }
    }
    SBS.Q = Q;

    /* =====================================================================
       TOKENIZER
       ===================================================================== */
    const NOMI = [
        ['frac', 'frac', 'frac'], ['root', 'root', 'root'], ['radice', 'fn', 'sqrt'], ['sqrt', 'fn', 'sqrt'], ['sen', 'fn', 'sin'], ['sin', 'fn', 'sin'],
        ['cos', 'fn', 'cos'], ['tan', 'fn', 'tan'], ['log', 'fn', 'ln'], ['tg', 'fn', 'tan'],
        ['ln', 'fn', 'ln'], ['pi', 'const', 'pi']
    ];

    function normalizza(src) {
        return String(src)
            .replace(/[−–—]/g, '-')
            .replace(/[×·∙⋅*]/g, '*')
            .replace(/÷/g, ':')
            .replace(/√/g, 'sqrt')
            .replace(/²/g, '^2').replace(/³/g, '^3')
            .replace(/π/g, 'pi')
            .replace(/\\cdot/g, '*')
            .replace(/\\left|\\right/g, '');
    }

    function tokenize(src) {
        const s = normalizza(src);
        const toks = [];
        let i = 0;
        while (i < s.length) {
            const ch = s[i];
            if (/\s/.test(ch)) { i++; continue; }
            if (/\d/.test(ch) || ((ch === '.' || ch === ',') && /\d/.test(s[i + 1] || ''))) {
                const m = s.slice(i).match(/^(\d*)(?:[.,](\d+))?/);
                const intPart = m[1] || '0', dec = m[2] || '';
                const n = parseInt(intPart + dec, 10), d = Math.pow(10, dec.length);
                toks.push({ type: 'num', v: new Q(n, d), pos: i });
                i += m[0].length;
                continue;
            }
            if (/[a-zA-Z]/.test(ch)) {
                let j = i;
                while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
                const word = s.slice(i, j);
                let k = 0;
                while (k < word.length) {
                    const rest = word.slice(k).toLowerCase();
                    const hit = NOMI.find(([nome]) => rest.startsWith(nome));
                    if (hit) {
                        toks.push({ type: hit[1], v: hit[2], pos: i + k });
                        k += hit[0].length;
                    } else {
                        const c = word[k];
                        if (c === 'e') toks.push({ type: 'const', v: 'e', pos: i + k });
                        else toks.push({ type: 'var', v: c, pos: i + k });
                        k++;
                    }
                }
                i = j;
                continue;
            }
            // relazioni: = < > <= >= (anche ≤ ≥)
            if (ch === '<' || ch === '>') {
                if (s[i + 1] === '=') { toks.push({ type: 'op', v: ch + '=', pos: i }); i += 2; continue; }
                toks.push({ type: 'op', v: ch, pos: i }); i++; continue;
            }
            if (ch === '≤') { toks.push({ type: 'op', v: '<=', pos: i }); i++; continue; }
            if (ch === '≥') { toks.push({ type: 'op', v: '>=', pos: i }); i++; continue; }
            if ('+-*/:^()[]{}='.includes(ch)) { toks.push({ type: 'op', v: ch, pos: i }); i++; continue; }
            if (ch === "'") { toks.push({ type: 'op', v: "'", pos: i }); i++; continue; }
            throw new SBSError(`Non riconosco il simbolo «${ch}».`);
        }
        return toks;
    }
    SBS.tokenize = tokenize;

    /* =====================================================================
       PARSER  ->  albero (AST)
       nodi:  num{v:Q}  var{n}  const{n}  add{a:[...]}  neg{a}
              mul{f:[{op,n}]}  (op: '' prima, 'impl' implicito, '·', '/', ':')
              pow{b,e}  grp{k:'('|'['|'{', a}  fn{n, a}
       ===================================================================== */
    const CHIUSA = { '(': ')', '[': ']', '{': '}' };

    function mk(o) { o.id = nid(); return o; }
    /* relazioni tra i due membri: LaTeX, testo, verso opposto */
    const REL = {
        '=': { tex: '=', txt: '=', inv: '=' },
        '<': { tex: '\\lt', txt: '<', inv: '>' },
        '>': { tex: '\\gt', txt: '>', inv: '<' },
        '<=': { tex: '\\leq', txt: '≤', inv: '>=' },
        '>=': { tex: '\\geq', txt: '≥', inv: '<=' }
    };
    SBS.REL = REL;
    SBS.mk = mk;

    function parse(src) {
        const toks = tokenize(src);
        let p = 0;
        const peek = () => toks[p];
        const isOp = (v) => toks[p] && toks[p].type === 'op' && toks[p].v === v;
        const next = () => toks[p++];

        function startsAtom(t) {
            if (!t) return false;
            if (t.type === 'num' || t.type === 'var' || t.type === 'const' || t.type === 'fn' || t.type === 'frac' || t.type === 'root') return true;
            return t.type === 'op' && (t.v === '(' || t.v === '[' || t.v === '{');
        }

        function parseExpr() {
            const first = parseTerm();
            const list = [first];
            while (isOp('+') || isOp('-')) {
                const op = next().v;
                const t = parseTerm();
                list.push(op === '-' ? mk({ t: 'neg', a: t }) : t);
            }
            return list.length === 1 ? first : mk({ t: 'add', a: list });
        }

        function parseTerm() {
            if (isOp('-')) { next(); return mk({ t: 'neg', a: parseTerm() }); }
            if (isOp('+')) { next(); return parseTerm(); }
            const f = [];
            // una frazione scritta con l'editor (frac) si "apre" nel prodotto
            const pushF = (op, n) => {
                if (n.t === 'mul' && n.frac) n.f.forEach((x, i) => f.push({ op: i === 0 ? op : x.op, n: x.n }));
                else f.push({ op, n });
            };
            pushF('', parsePower());
            for (;;) {
                if (isOp('*')) { next(); pushF('·', parseSigned()); }
                else if (isOp('/')) { next(); f.push({ op: '/', n: parseSigned() }); }
                else if (isOp(':')) {
                    // a scuola "6x^2 : 3x" significa dividere per tutto il monomio 3x
                    next();
                    let d = parseSigned();
                    const extra = [];
                    while (peek() && (peek().type === 'var')) extra.push({ op: 'impl', n: parsePower() });
                    if (extra.length) d = mk({ t: 'grp', k: '(', a: mk({ t: 'mul', f: [{ op: '', n: d }, ...extra] }), implicit: true });
                    f.push({ op: ':', n: d });
                }
                else if (startsAtom(peek())) { pushF('impl', parsePower()); }
                else break;
            }
            return f.length === 1 ? f[0].n : mk({ t: 'mul', f });
        }

        function parseSigned() {
            if (isOp('-')) { next(); return mk({ t: 'neg', a: parseSigned() }); }
            if (isOp('+')) { next(); return parseSigned(); }
            return parsePower();
        }

        function parsePower() {
            const base = parseAtom();
            if (isOp('^')) {
                next();
                const e = parseSignedPower();
                return mk({ t: 'pow', b: base, e });
            }
            return base;
        }
        function parseSignedPower() {
            if (isOp('-')) { next(); return mk({ t: 'neg', a: parseSignedPower() }); }
            if (isOp('+')) { next(); return parseSignedPower(); }
            return parsePower();
        }

        function parseAtom() {
            const t = peek();
            if (!t) throw new SBSError("L'esercizio sembra incompleto: manca qualcosa alla fine.");
            if (t.type === 'num') { next(); return mk({ t: 'num', v: t.v }); }
            if (t.type === 'var') { next(); return mk({ t: 'var', n: t.v }); }
            if (t.type === 'const') { next(); return mk({ t: 'const', n: t.v }); }
            if (t.type === 'root') {
                // root(indice)(radicando): radice n-esima
                next();
                const a = parseAtom(), b = parseAtom();
                const un = (g) => (g.t === 'grp' && g.k === '(' ? g.a : g);
                const ix = un(a);
                if (ix.t !== 'num' || !ix.v.isInt() || ix.v.n < 2) throw new SBSError("L'indice della radice deve essere un numero naturale maggiore di 1.");
                const n = mk({ t: 'fn', n: 'sqrt', a: un(b) });
                if (ix.v.n !== 2) n.idx = ix.v.n;
                return n;
            }
            if (t.type === 'frac') {
                // frac(numeratore)(denominatore), prodotto dall'editor
                next();
                const a = parseAtom(), b = parseAtom();
                const un = (g) => (g.t === 'grp' && g.k === '(' ? g.a : g);
                const wrap = (n) => (n.t === 'add' || n.t === 'neg' ? mk({ t: 'grp', k: '(', a: n }) : n);
                let N = un(a);
                const D = wrap(un(b));
                if (N.t === 'mul' && !N.frac && !N.f.some(x => x.op === '/' || x.op === ':')) {
                    return mk({ t: 'mul', frac: true, f: [...N.f, { op: '/', n: D }] });
                }
                return mk({ t: 'mul', frac: true, f: [{ op: '', n: wrap(N) }, { op: '/', n: D }] });
            }
            if (t.type === 'fn') {
                next();
                let esp = null;
                if (isOp('^')) { next(); esp = parseAtom(); }
                const arg = parseAtom();
                const a = arg.t === 'grp' && arg.k === '(' ? arg.a : arg;
                const f = mk({ t: 'fn', n: t.v, a });
                return esp ? mk({ t: 'pow', b: f, e: esp }) : f;
            }
            if (t.type === 'op' && CHIUSA[t.v]) {
                next();
                if (isOp(CHIUSA[t.v])) throw new SBSError('C\'è una parentesi vuota.');
                const inner = parseExpr();
                if (!isOp(CHIUSA[t.v])) throw new SBSError(`Manca la parentesi di chiusura «${CHIUSA[t.v]}».`);
                next();
                return mk({ t: 'grp', k: t.v, a: inner });
            }
            if (t.type === 'op' && (t.v === ')' || t.v === ']' || t.v === '}')) throw new SBSError(`C'è una parentesi «${t.v}» di troppo.`);
            if (t.type === 'op' && REL[t.v]) throw new SBSError(`Manca un membro prima o dopo il segno «${REL[t.v].txt}».`);
            throw new SBSError(`Il simbolo «${t.v}» è nel posto sbagliato.`);
        }

        if (!toks.length) throw new SBSError('Scrivi un esercizio.');
        const lhs = parseExpr();
        let rhs = null, rel = null;
        if (peek() && peek().type === 'op' && REL[peek().v]) {
            rel = next().v;
            if (!peek()) throw new SBSError(`Manca il secondo membro dopo «${REL[rel].txt}».`);
            rhs = parseExpr();
        }
        if (isOp("'")) next();
        if (p < toks.length) {
            const t = toks[p];
            if (t.type === 'op' && REL[t.v]) throw new SBSError('Il segno «=» (o di disuguaglianza) può comparire una sola volta.');
            if (t.type === 'op' && (t.v === ')' || t.v === ']' || t.v === '}')) throw new SBSError(`C'è una parentesi «${t.v}» di troppo.`);
            throw new SBSError(`Non capisco cosa significa «${t.v}» in quella posizione.`);
        }
        return { lhs, rhs, rel };
    }
    SBS.parse = parse;

    /* Lettere usate come incognita */
    function variabili(node, set = new Set()) {
        if (!node) return set;
        switch (node.t) {
            case 'var': set.add(node.n); break;
            case 'add': node.a.forEach(c => variabili(c, set)); break;
            case 'neg': case 'grp': case 'fn': variabili(node.a, set); break;
            case 'mul': node.f.forEach(c => variabili(c.n, set)); break;
            case 'pow': variabili(node.b, set); variabili(node.e, set); break;
        }
        return set;
    }
    SBS.variabili = variabili;

    /* Valore numerico (serve per i controlli automatici) */
    function valuta(node, x) {
        switch (node.t) {
            case 'num': return node.v.val();
            case 'var': return x;
            case 'const': return node.n === 'e' ? Math.E : Math.PI;
            case 'add': return node.a.reduce((s, c) => s + valuta(c, x), 0);
            case 'neg': return -valuta(node.a, x);
            case 'grp': return valuta(node.a, x);
            case 'mul': {
                let r = 1;
                for (const { op, n } of node.f) {
                    const v = valuta(n, x);
                    r = (op === '/' || op === ':') ? r / v : r * v;
                }
                return r;
            }
            case 'pow': return Math.pow(valuta(node.b, x), valuta(node.e, x));
            case 'fn': {
                const a = valuta(node.a, x);
                if (node.n === 'sqrt' && node.idx) return a < 0 && node.idx % 2 ? -Math.pow(-a, 1 / node.idx) : Math.pow(a, 1 / node.idx);
                return { sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, sqrt: Math.sqrt }[node.n](a);
            }
        }
        throw new Error('nodo sconosciuto ' + node.t);
    }
    SBS.valuta = valuta;

    /* =====================================================================
       DISEGNO LaTeX CON COLORI
       Un disegno è un albero di "pezzi":
         stringa                     -> testo LaTeX
         {span:id, items:[...]}      -> pezzo colorabile tramite il suo id
         {g:[str, items, str, ...], id?, stroke?}
                                     -> gruppo con graffe (\dfrac{..}{..},
                                        \cancel{..}, ^{..}): dentro le graffe
                                        il colore torna quello di partenza
       emit() trasforma l'albero in LaTeX scrivendo \color{...}{} solo
       quando il colore cambia, esattamente come nelle schede.
       ===================================================================== */
    function emit(items, colors, base, rootWant, leafFn) {
        colors = colors || new Map();
        let out = '';
        let cur = base;
        let li = 0;   // indice delle "foglie" (testi e gruppi), vedi leafInfo
        const sw = (c) => { if (c !== cur) { out += `\\color{${c}}{}`; cur = c; } };

        function walk(list, want) {
            for (const it of list) {
                if (it == null) continue;
                if (typeof it === 'string') {
                    if (it.trim() !== '') {
                        const lc = leafFn ? leafFn(li++) : undefined;
                        sw(lc !== undefined ? lc : want);
                    }
                    out += it;
                } else if (it.span !== undefined) {
                    const w = colors.has(it.span) ? colors.get(it.span) : want;
                    walk(it.items, w);
                } else if (it.g) {
                    let gw = want, cw = want;
                    if (it.stroke) { gw = it.stroke; }
                    else if (it.sid !== undefined) { if (colors.has(it.sid)) gw = colors.get(it.sid); }
                    else if (it.id !== undefined && colors.has(it.id)) { gw = colors.get(it.id); cw = gw; }
                    const lc = leafFn ? leafFn(li++) : undefined;
                    if (lc !== undefined && !it.stroke) gw = lc;
                    sw(gw);
                    const atStart = cur;
                    for (const part of it.g) {
                        if (typeof part === 'string') out += part;
                        else { cur = atStart; walk(part, cw); cur = atStart; }
                    }
                    cur = atStart;
                }
            }
        }
        walk(items, rootWant || base);
        return out;
    }
    /* per ogni foglia (nello stesso ordine di emit): gli id degli span/gruppi che la contengono */
    function leafInfo(items) {
        const res = [];
        function walk(list, chain) {
            for (const it of list) {
                if (it == null) continue;
                if (typeof it === 'string') { if (it.trim() !== '') res.push(chain); }
                else if (it.span !== undefined) walk(it.items, [...chain, it.span]);
                else if (it.g) {
                    const own = [it.id, it.sid].filter(x => x !== undefined);
                    res.push([...chain, ...own]);
                    for (const part of it.g) if (typeof part !== 'string') walk(part, [...chain, ...own]);
                }
            }
        }
        walk(items, []);
        return res;
    }
    SBS.leafInfo = leafInfo;
    SBS.emit = emit;

    /* ha una frazione al suo interno? (serve per scegliere \left( \right)) */
    function hasFrac(items) {
        for (const it of items) {
            if (it == null) continue;
            if (typeof it === 'string') { if (it.includes('dfrac') || it.includes('sqrt')) return true; }
            else if (it.span !== undefined) { if (hasFrac(it.items)) return true; }
            else if (it.g) {
                if (it.g.some(p => typeof p === 'string' && (p.includes('dfrac') || p.includes('sqrt')))) return true;
                if (it.g.some(p => Array.isArray(p) && hasFrac(p))) return true;
            }
        }
        return false;
    }
    SBS.hasFrac = hasFrac;

    const BR = { '(': ['(', ')'], '[': ['[', ']'], '{': ['\\{', '\\}'] };
    function brackets(kind, inner) {
        const [o, c] = BR[kind] || BR['('];
        // parentesi sempre proporzionate al contenuto, come \left( ... \right) in LaTeX
        // \left ... \right è un gruppo: dentro, i cambi di colore restano confinati
        // le graffe esterne evitano lo spazio extra che MathJax mette intorno a \left...\right
        return [{ g: ['{\\left' + o + '{', inner, '}\\right' + c + '}'] }];
    }
    SBS.brackets = brackets;

    /* ---------------- disegno di un AST generico ---------------- */
    // le funzioni si scrivono come nelle schede: sin, cos, tan, ln (in corsivo)
    const FN_TEX = { sin: 'sin', cos: 'cos', tan: 'tan', ln: 'ln' };

    function isNumLike(n) { return n.t === 'num' || (n.t === 'pow' && n.b.t === 'num'); }

    function renderAst(node, prec = 0) {
        const S = (items) => ({ span: node.id, items });
        switch (node.t) {
            case 'num': {
                const s = node.v.tex();
                if (node.v.sign() < 0 && prec > 1) return S(['(', s, ')']);
                return S([s]);
            }
            case 'var': return S([node.n]);
            case 'const': return S([node.n === 'e' ? 'e' : '\\pi']);
            case 'grp': {
                const inner = [renderAst(node.a, 0)];
                return S(brackets(node.k, inner));
            }
            case 'add': {
                const items = [];
                node.a.forEach((c, i) => {
                    if (c.t === 'neg') {
                        items.push({ span: c.id, items: [i === 0 ? '-' : ' - ', renderAst(c.a, 2)] });
                    } else if (c.t === 'num' && c.v.sign() < 0 && i > 0) {
                        items.push({ span: c.id, items: [' - ', c.v.texAbs()] });
                    } else {
                        // il segno "+" appartiene al termine che lo segue
                        items.push(i === 0 ? renderAst(c, 1) : { span: c.id, items: [' + ', renderAst(c, 1)] });
                    }
                });
                const wrap = prec > 1;
                return S(wrap ? brackets('(', items) : items);
            }
            case 'neg': {
                const inner = renderAst(node.a, 3);
                const items = ['-', inner];
                return S(prec > 1 ? brackets('(', items) : items);
            }
            case 'mul': return S(renderMul(node, prec));
            case 'pow': {
                const ee = stripGrp(node.e);
                // negli esponenti le frazioni restano piccole: \frac invece di \dfrac
                const piccole = (items) => items.map(it => {
                    if (typeof it === 'string') return it.replace(/\\dfrac/g, '\\frac');
                    if (it && it.span !== undefined) return { ...it, items: piccole(it.items) };
                    if (it && it.g) return { ...it, g: it.g.map(p => (typeof p === 'string' ? p.replace(/\\dfrac/g, '\\frac') : piccole(p))) };
                    return it;
                });
                const e = (ee.t === 'num' && !ee.v.isInt())
                    ? { g: ['^{', [{ span: ee.id, items: [`${ee.v.sign() < 0 ? '-' : ''}\\frac{${Math.abs(ee.v.n)}}{${ee.v.d}}`] }], '}'] }
                    : { g: ['^{', piccole([renderAst(ee, 0)]), '}'] };
                if (node.b.t === 'fn' && node.b.n !== 'sqrt') {
                    const f = node.b;
                    const arg = [renderAst(f.a, 0)];
                    return S([{ span: f.id, items: [FN_TEX[f.n]] }, e, { span: f.id, items: brackets('(', arg) }]);
                }
                const b = node.b;
                const needs = b.t === 'add' || b.t === 'neg' || b.t === 'mul' || b.t === 'pow' ||
                    (b.t === 'num' && (b.v.sign() < 0 || !b.v.isInt()));
                const bi = renderAst(b, needs ? 0 : 5);
                return S(needs ? [...brackets('(', [bi]), e] : [bi, e]);
            }
            case 'fn': {
                if (node.n === 'sqrt') return S([{ g: [node.idx ? `\\sqrt[${node.idx}]{` : '\\sqrt{', [renderAst(node.a, 0)], '}'] }]);
                return S([FN_TEX[node.n], ...brackets('(', [renderAst(node.a, 0)])]);
            }
        }
        throw new Error('nodo ' + node.t);
    }

    function renderMul(node, prec) {
        // raggruppo i fattori: ogni '/' trasforma ciò che precede in numeratore
        let cur = [];
        for (const f of node.f) {
            if (f.op === '/') {
                const num = cur;
                cur = [{ op: '', n: null, frac: { num, den: f } }];
            } else cur.push(f);
        }
        const items = [];
        cur.forEach((f, i) => {
            let sep = '';
            if (i > 0) {
                if (f.op === ':') sep = ' : ';
                else if (f.op === '·') sep = ' \\cdot ';
                else {
                    const prev = cur[i - 1];
                    const nn = f.n;
                    if (nn && (nn.t === 'num' || (nn.t === 'pow' && nn.b.t === 'num'))) sep = ' \\cdot ';
                    else if (prev.frac) sep = (nn && (nn.t === 'var' || nn.t === 'grp' || nn.t === 'fn' || (nn.t === 'pow' && nn.b.t !== 'num'))) ? '' : ' \\cdot ';
                    else if (prev.n && prev.n.t === 'grp' && nn && nn.t === 'grp') sep = '';
                    else if (prev.n && prev.n.t === 'fn' && nn && nn.t !== 'grp') sep = ' \\cdot ';
                    else sep = '\\,';
                    if (prev.n && isNumLike(prev.n) && nn && (nn.t === 'var' || nn.t === 'grp' || nn.t === 'fn' || nn.t === 'const' || (nn.t === 'pow' && nn.b.t !== 'num'))) sep = '';
                    const paren = nn && (nn.t === 'grp' || nn.t === 'add' || (nn.t === 'pow' && (nn.b.t === 'add' || nn.b.t === 'grp')));
                    if (prev.n && (prev.n.t === 'var' || isNumLike(prev.n) || (prev.n.t === 'pow' && prev.n.b.t === 'var')) && paren) sep = '';
                }
            }
            if (f.frac) {
                const nf = f.frac.num;
                const numItems = !nf.length ? ['1'] : (nf.length === 1 ? [renderAst(stripGrp(nf[0].n), 0)] : renderMul({ f: nf }, 0));
                const den = f.frac.den;
                items.push({ g: ['\\dfrac{', numItems, '}{', [{ span: den.n.id, items: [renderAst(stripGrp(den.n), 0)] }], '}'] });
            } else {
                const n = f.n;
                const child = renderAst(n, 3);
                if (sep) items.push({ span: n.id, items: [sep, child] });
                else items.push(child);
            }
        });
        if (prec > 3) return brackets('(', items);
        return items;
    }
    function stripGrp(n) { return n.t === 'grp' && n.k === '(' ? n.a : n; }

    SBS.renderAst = renderAst;
    SBS.astTex = (node, colors, base = 'black') => emit([renderAst(node)], colors, base);
})(typeof window !== 'undefined' ? window : globalThis);
