/* =====================================================================
   StepByStep - editor matematico
   Si scrive direttamente nella formula formattata (come sul quaderno):
   frazioni, potenze e radici hanno le loro caselle, il cursore si sposta
   con le frecce. Il testo viene poi tradotto nella sintassi del motore.
   ===================================================================== */
(function (global) {
    'use strict';
    const SBS = global.SBS;

    const FUNZ = ['sin', 'cos', 'tan', 'ln'];
    const STRUTTURE = { frac: ['num', 'den'], pow: ['exp'], sqrt: ['arg'], root: ['idx', 'arg'] };
    const isStruct = (n) => n && STRUTTURE[n.t];
    const subRows = (n) => (STRUTTURE[n.t] || []).map(k => n[k]);

    class Editor {
        constructor(el, opts = {}) {
            this.el = el;
            this.opts = opts;
            this.root = [];
            this.cur = { row: this.root, i: 0 };
            this.rowIds = new Map();
            this.nextRowId = 1;
            this.render();
            el.addEventListener('keydown', (e) => this.onKey(e));
            el.addEventListener('click', (e) => this.onClick(e));
        }

        /* ---------------- struttura ---------------- */
        parentOf(row) {
            // restituisce {node, key, row: rigaContenitore, idx} per una sotto-riga
            const find = (r) => {
                for (let i = 0; i < r.length; i++) {
                    const n = r[i];
                    if (!isStruct(n)) continue;
                    for (const k of STRUTTURE[n.t]) {
                        if (n[k] === row) return { node: n, key: k, row: r, idx: i };
                        const f = find(n[k]);
                        if (f) return f;
                    }
                }
                return null;
            };
            return find(this.root);
        }
        rowId(row) {
            if (!this.rowIds.has(row)) this.rowIds.set(row, this.nextRowId++);
            return this.rowIds.get(row);
        }
        isEmpty() { return this.root.length === 0; }

        /* ---------------- modifiche ---------------- */
        changed() { this.render(); if (this.opts.onChange) this.opts.onChange(); }

        insert(nodes, cursorInto) {
            const { row, i } = this.cur;
            row.splice(i, 0, ...nodes);
            this.cur = { row, i: i + nodes.length };
            if (cursorInto) this.cur = cursorInto;
            this.checkFunctionName();
            this.changed();
        }
        char(v) {
            const { row, i } = this.cur;
            // "<" seguito da "=" diventa "≤" (e così ">=")
            if (v === '=' && row[i - 1] && row[i - 1].t === 'c' && (row[i - 1].v === '<' || row[i - 1].v === '>')) {
                row[i - 1] = { t: 'c', v: row[i - 1].v === '<' ? '≤' : '≥' };
                return this.changed();
            }
            const nx = row[i], pv = row[i - 1];
            // ")" alla fine di un denominatore/esponente/radice: esco dalla casella
            if (v === ')' && i === row.length && this.parentOf(row) && !row.some(n => n.t === 'c' && n.v === '(')) {
                const p = this.parentOf(row);
                this.cur = { row: p.row, i: p.idx + 1 };
                return this.char(')');
            }
            // ")" quando c'è già una ")" subito dopo: la scavalco
            if (v === ')' && nx && nx.t === 'c' && nx.v === ')') { this.cur = { row, i: i + 1 }; return this.render(); }
            // "(" subito dopo sin( ... messo in automatico: non la raddoppio
            if (v === '(' && pv && pv.t === 'c' && pv.v === '(' && row[i - 2] && row[i - 2].t === 'fn' && nx && nx.t === 'c' && nx.v === ')') return;
            this.insert([{ t: 'c', v }]);
        }
        fn(name) {
            const n = { t: 'fn', v: name };
            const open = { t: 'c', v: '(' }, close = { t: 'c', v: ')' };
            const { row, i } = this.cur;
            row.splice(i, 0, n, open, close);
            this.cur = { row, i: i + 2 };
            this.changed();
        }
        frac() {
            const { row, i } = this.cur;
            // il "pezzo" appena scritto diventa il numeratore
            let j = i;
            if (j > 0 && row[j - 1].t === 'c' && row[j - 1].v === ')') {
                let depth = 0;
                for (j = i - 1; j >= 0; j--) {
                    const n = row[j];
                    if (n.t === 'c' && n.v === ')') depth++;
                    if (n.t === 'c' && n.v === '(') { depth--; if (depth === 0) break; }
                }
                if (j < 0) j = i;
                else if (j > 0 && row[j - 1].t === 'fn') j--;
            } else {
                while (j > 0) {
                    const n = row[j - 1];
                    if (n.t === 'pow' || n.t === 'sqrt' || n.t === 'root' || n.t === 'fn' || (n.t === 'c' && /[0-9a-zA-Z.,]/.test(n.v))) j--;
                    else break;
                }
            }
            const num = row.splice(j, i - j);
            if (num.length === 3 && num[0].t === 'c' && num[0].v === '(' && num[2].t === 'c' && num[2].v === ')') num.splice(2, 1), num.splice(0, 1);
            if (num.length > 1 && num[0].t === 'c' && num[0].v === '(' && num[num.length - 1].t === 'c' && num[num.length - 1].v === ')' && matched(num)) { num.pop(); num.shift(); }
            const f = { t: 'frac', num, den: [] };
            row.splice(j, 0, f);
            this.cur = num.length ? { row: f.den, i: 0 } : { row: f.num, i: 0 };
            this.changed();
        }
        pow(content) {
            const p = { t: 'pow', exp: content ? content.split('').map(v => ({ t: 'c', v })) : [] };
            const { row, i } = this.cur;
            row.splice(i, 0, p);
            this.cur = content ? { row, i: i + 1 } : { row: p.exp, i: 0 };
            this.changed();
        }
        sqrt() {
            const s = { t: 'sqrt', arg: [] };
            const { row, i } = this.cur;
            row.splice(i, 0, s);
            this.cur = { row: s.arg, i: 0 };
            this.changed();
        }
        nroot() {
            const r = { t: 'root', idx: [], arg: [] };
            const { row, i } = this.cur;
            row.splice(i, 0, r);
            this.cur = { row: r.idx, i: 0 };
            this.changed();
        }
        expE() {
            const { row, i } = this.cur;
            const p = { t: 'pow', exp: [] };
            row.splice(i, 0, { t: 'c', v: 'e' }, p);
            this.cur = { row: p.exp, i: 0 };
            this.changed();
        }
        clear() { this.root.length = 0; this.cur = { row: this.root, i: 0 }; this.changed(); }

        left() {
            const { row, i } = this.cur;
            if (i > 0) {
                const n = row[i - 1];
                if (isStruct(n)) { const rs = subRows(n); const r = rs[rs.length - 1]; this.cur = { row: r, i: r.length }; }
                else this.cur = { row, i: i - 1 };
            } else {
                const p = this.parentOf(row);
                if (!p) return this.render();
                const ks = STRUTTURE[p.node.t], ki = ks.indexOf(p.key);
                if (ki > 0) { const r = p.node[ks[ki - 1]]; this.cur = { row: r, i: r.length }; }
                else this.cur = { row: p.row, i: p.idx };
            }
            this.render();
        }
        right() {
            const { row, i } = this.cur;
            if (i < row.length) {
                const n = row[i];
                if (isStruct(n)) this.cur = { row: subRows(n)[0], i: 0 };
                else this.cur = { row, i: i + 1 };
            } else {
                const p = this.parentOf(row);
                if (!p) return this.render();
                const ks = STRUTTURE[p.node.t], ki = ks.indexOf(p.key);
                if (ki < ks.length - 1) this.cur = { row: p.node[ks[ki + 1]], i: 0 };
                else this.cur = { row: p.row, i: p.idx + 1 };
            }
            this.render();
        }
        backspace() {
            const { row, i } = this.cur;
            if (i > 0) {
                const n = row[i - 1];
                if (isStruct(n)) {
                    if (subRows(n).every(r => r.length === 0)) { row.splice(i - 1, 1); this.cur = { row, i: i - 1 }; }
                    else { const rs = subRows(n); const r = rs[rs.length - 1]; this.cur = { row: r, i: r.length }; return this.render(); }
                } else {
                    row.splice(i - 1, 1);
                    this.cur = { row, i: i - 1 };
                    // cancellando "(" subito dopo una funzione tolgo anche la funzione
                    if (n.t === 'c' && n.v === '(' && i - 2 >= 0 && row[i - 2].t === 'fn') {
                        row.splice(i - 2, 1); this.cur = { row, i: i - 2 };
                        if (row[this.cur.i] && row[this.cur.i].t === 'c' && row[this.cur.i].v === ')') row.splice(this.cur.i, 1);
                    }
                }
            } else {
                const p = this.parentOf(row);
                if (!p) return;
                // tolgo la struttura e ne tengo il contenuto
                const content = p.node.t === 'frac' ? [...p.node.num, ...p.node.den] : (p.node.t === 'root' ? p.node.arg : subRows(p.node)[0]);
                const keepBefore = p.node.t === 'frac' && p.key === 'den' ? p.node.num.length : 0;
                p.row.splice(p.idx, 1, ...content);
                this.cur = { row: p.row, i: p.idx + keepBefore };
            }
            this.changed();
        }

        /* "sin" scritto lettera per lettera diventa una funzione */
        checkFunctionName() {
            const { row, i } = this.cur;
            for (const name of [...FUNZ, 'sen', 'tg', 'log', 'sqrt']) {
                const L = name.length;
                if (i < L) continue;
                const seq = row.slice(i - L, i);
                if (seq.every((n, k) => n.t === 'c' && n.v === name[k])) {
                    row.splice(i - L, L);
                    this.cur = { row, i: i - L };
                    if (name === 'sqrt') { const s = { t: 'sqrt', arg: [] }; row.splice(i - L, 0, s); this.cur = { row: s.arg, i: 0 }; return; }
                    const real = { sen: 'sin', tg: 'tan', log: 'ln' }[name] || name;
                    row.splice(i - L, 0, { t: 'fn', v: real }, { t: 'c', v: '(' }, { t: 'c', v: ')' });
                    this.cur = { row, i: i - L + 2 };
                    return;
                }
            }
        }

        /* ---------------- tastiera fisica ---------------- */
        onKey(e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const k = e.key;
            let ok = true;
            if (k === 'ArrowLeft') this.left();
            else if (k === 'ArrowRight') this.right();
            else if (k === 'Backspace') this.backspace();
            else if (k === 'Enter') { if (this.opts.onEnter) this.opts.onEnter(); }
            else if (k === '/') this.frac();
            else if (k === '^') this.pow();
            else if (k === '*') this.char('·');
            else if (k === '²') this.pow('2');
            else if (k.length === 1 && /[0-9a-zA-Z+\-=:()[\]{}.,<>≤≥]/.test(k)) this.char(k);
            else ok = false;
            if (ok) e.preventDefault();
        }
        onClick(e) {
            this.el.focus();
            const t = e.target.closest('[class*="sbsr"]');
            let row = null;
            if (t) {
                const m = String(t.getAttribute('class')).match(/sbsr(\d+)/);
                if (m) for (const [r, id] of this.rowIds) if (id === +m[1]) row = r;
            }
            if (!row) row = this.root;
            this.cur = { row, i: row.length };
            this.render();
            if (this.opts.onFocus) this.opts.onFocus();
        }

        /* ---------------- disegno ---------------- */
        texRow(row, isRoot) {
            let out = '';
            const caretHere = (k) => this.cur.row === row && this.cur.i === k;
            const CARET = '\\class{sbs-caret}{\\color{#4285F4}{|}}';
            // parentesi accoppiate: \left( ... \right) per adattarle al contenuto
            const coppie = new Map(), pila = [];
            const AP = { '(': ')', '[': ']', '{': '}' };
            row.forEach((n, k) => {
                if (n.t !== 'c') return;
                if (AP[n.v]) pila.push(k);
                else if (')]}'.includes(n.v) && pila.length && AP[row[pila[pila.length - 1]].v] === n.v) { const a = pila.pop(); coppie.set(a, 'L'); coppie.set(k, 'R'); }
                else if (')]}'.includes(n.v)) pila.length = 0;
            });
            const BRT = { '(': '(', ')': ')', '[': '[', ']': ']', '{': '\\{', '}': '\\}' };
            row.forEach((n, k) => {
                if (caretHere(k)) out += CARET;
                if (coppie.get(k) === 'L') out += '{\\left' + BRT[n.v];
                else if (coppie.get(k) === 'R') out += '\\right' + BRT[n.v] + '}';
                else out += this.texNode(n);
            });
            if (caretHere(row.length)) out += CARET;
            if (!row.length) {
                out = (this.cur.row === row ? CARET : '') + (isRoot ? '' : '\\class{sbs-box}{\\color{#b8c2cc}{\\square}}');
            }
            return isRoot ? out : `\\class{sbsr${this.rowId(row)}}{${out}}`;
        }
        texNode(n) {
            switch (n.t) {
                case 'c': {
                    const map = { '·': '\\cdot ', ':': ':', '*': '\\cdot ', '{': '\\{', '}': '\\}', '-': '-', ',': '{,}', '<': '\\lt ', '>': '\\gt ', '≤': '\\leq ', '≥': '\\geq ' };
                    return map[n.v] !== undefined ? map[n.v] : n.v;
                }
                case 'fn': return n.v;
                case 'frac': return `\\${this._inEsp ? '' : 'd'}frac{${this.texRow(n.num)}}{${this.texRow(n.den)}}`;
                case 'pow': {   // negli esponenti le frazioni restano piccole
                    this._inEsp = (this._inEsp || 0) + 1;
                    const t = `^{${this.texRow(n.exp)}}`;
                    this._inEsp--;
                    return t;
                }
                case 'sqrt': return `\\sqrt{${this.texRow(n.arg)}}`;
                case 'root': return `\\sqrt[${this.texRow(n.idx)}]{${this.texRow(n.arg)}}`;
            }
            return '';
        }
        latex() { return this.texRow(this.root, true); }
        render() {
            let tex = this.latex();
            // una potenza all'inizio di una riga ha bisogno di una base
            tex = tex.replace(/(^|\{|\})\^\{/g, '$1{}^{');
            const vuoto = this.root.length === 0;
            const pre = this.opts.prefix || '';
            this.el.innerHTML = `\\(\\displaystyle ${pre}${tex}${vuoto ? '\\class{sbs-placeholder}{\\color{#b8c2cc}{\\;\\text{' + (this.opts.placeholder || '') + '}}}' : ''}\\)`;
            if (global.MathJax && MathJax.typesetPromise) {
                MathJax.typesetClear && MathJax.typesetClear([this.el]);
                MathJax.typesetPromise([this.el]).catch(() => {});
            }
        }

        /* ---------------- conversione ---------------- */
        text() { return rowText(this.root); }
        setFromText(src) {
            const { lhs, rhs, rel } = SBS.parse(src);
            const row = astToRow(lhs);
            if (rhs) row.push({ t: 'c', v: REL_CH[rel] }, ...astToRow(rhs));
            this.root.length = 0;
            this.root.push(...row);
            this.cur = { row: this.root, i: this.root.length };
            this.changed();
        }
    }

    const REL_CH = { '=': '=', '<': '<', '>': '>', '<=': '≤', '>=': '≥' };
    function matched(nodes) {
        // le parentesi esterne racchiudono tutto?
        let d = 0;
        for (let k = 0; k < nodes.length; k++) {
            const n = nodes[k];
            if (n.t === 'c' && n.v === '(') d++;
            if (n.t === 'c' && n.v === ')') { d--; if (d === 0 && k < nodes.length - 1) return false; }
        }
        return d === 0;
    }

    /* editor -> testo per il motore */
    function rowText(row) {
        let s = '';
        for (const n of row) {
            switch (n.t) {
                case 'c': s += n.v === '·' ? '*' : n.v === '≤' ? '<=' : n.v === '≥' ? '>=' : n.v; break;
                case 'fn': s += n.v; break;
                case 'frac': s += `frac(${rowText(n.num) || ' '})(${rowText(n.den) || ' '})`; break;
                case 'pow': s += `^(${rowText(n.exp) || ' '})`; break;
                case 'sqrt': s += `sqrt(${rowText(n.arg) || ' '})`; break;
                case 'root': s += `root(${rowText(n.idx) || ' '})(${rowText(n.arg) || ' '})`; break;
            }
        }
        return s;
    }

    /* albero del motore -> editor (per esempi ed esercizi casuali) */
    const chars = (str) => str.split('').map(v => ({ t: 'c', v }));
    function numRow(q) {
        if (q.isInt()) return chars(String(q.n));
        const r = [{ t: 'frac', num: chars(String(Math.abs(q.n))), den: chars(String(q.d)) }];
        return q.n < 0 ? [{ t: 'c', v: '-' }, ...r] : r;
    }
    function strip(n) { return n.t === 'grp' && n.k === '(' ? n.a : n; }
    function astToRow(n, prec = 0) {
        const paren = (r) => [{ t: 'c', v: '(' }, ...r, { t: 'c', v: ')' }];
        switch (n.t) {
            case 'num': {
                const r = numRow(n.v);
                return n.v.sign() < 0 && prec > 1 ? paren(r) : r;
            }
            case 'var': return [{ t: 'c', v: n.n }];
            case 'const': return [{ t: 'c', v: n.n === 'e' ? 'e' : 'π' }];
            case 'grp': {
                const [o, c] = { '(': ['(', ')'], '[': ['[', ']'], '{': ['{', '}'] }[n.k];
                return [{ t: 'c', v: o }, ...astToRow(n.a), { t: 'c', v: c }];
            }
            case 'add': {
                const r = [];
                n.a.forEach((c, i) => {
                    if (c.t === 'neg') r.push({ t: 'c', v: '-' }, ...astToRow(c.a, 2));
                    else { if (i) r.push({ t: 'c', v: '+' }); r.push(...astToRow(c, 1)); }
                });
                return prec > 1 ? paren(r) : r;
            }
            case 'neg': {
                const r = [{ t: 'c', v: '-' }, ...astToRow(n.a, 2)];
                return prec > 1 ? paren(r) : r;
            }
            case 'mul': {
                let groups = [];
                for (const f of n.f) {
                    if (f.op === '/') {
                        const num = groups; groups = [{ op: '', frac: { num, den: f.n } }];
                    } else groups.push(f);
                }
                const r = [];
                groups.forEach((g, i) => {
                    if (g.frac) {
                        const numR = g.frac.num.length === 1 ? astToRow(strip(g.frac.num[0].n)) : mulRow(g.frac.num);
                        r.push({ t: 'frac', num: numR, den: astToRow(strip(g.frac.den)) });
                        return;
                    }
                    if (i > 0) {
                        if (g.op === '·') r.push({ t: 'c', v: '·' });
                        else if (g.op === ':') r.push({ t: 'c', v: ':' });
                        else {
                            const last = r[r.length - 1];
                            const first = astToRow(g.n, 3)[0];
                            if (last && first && last.t === 'c' && /[0-9]/.test(last.v) && first.t === 'c' && /[0-9]/.test(first.v)) r.push({ t: 'c', v: '·' });
                        }
                    }
                    r.push(...astToRow(g.n, 3));
                });
                return prec > 3 ? paren(r) : r;
            }
            case 'pow': {
                const e = astToRow(strip(n.e));
                if (n.b.t === 'fn' && n.b.n !== 'sqrt') return [{ t: 'fn', v: n.b.n }, { t: 'pow', exp: e }, ...paren(astToRow(n.b.a))];
                const b = n.b;
                const needs = b.t === 'add' || b.t === 'neg' || b.t === 'mul' || (b.t === 'num' && (b.v.sign() < 0 || !b.v.isInt()));
                return [...(needs ? paren(astToRow(b)) : astToRow(b, 5)), { t: 'pow', exp: e }];
            }
            case 'fn': {
                if (n.n === 'sqrt' && n.idx) return [{ t: 'root', idx: chars(String(n.idx)), arg: astToRow(n.a) }];
                if (n.n === 'sqrt') return [{ t: 'sqrt', arg: astToRow(n.a) }];
                return [{ t: 'fn', v: n.n }, ...paren(astToRow(n.a))];
            }
        }
        return [];
    }
    function mulRow(fs) { return astToRow({ t: 'mul', f: fs.map((f, i) => ({ op: i ? f.op : '', n: f.n })) }); }

    SBS.Editor = Editor;
    SBS.editorText = (src) => { const { lhs, rhs, rel } = SBS.parse(src); let r = astToRow(lhs); if (rhs) r = [...r, { t: 'c', v: REL_CH[rel] }, ...astToRow(rhs)]; return rowText(r); };
})(typeof window !== 'undefined' ? window : globalThis);
