/* =====================================================================
   StepByStep - esercizi casuali
   Ogni generatore restituisce il testo di un esercizio; viene scartato e
   rigenerato se lo svolgimento non è "da scuola" (soluzione con numeri
   troppo grandi, equazione impossibile, ecc.).
   ===================================================================== */
(function (global) {
    'use strict';
    const SBS = global.SBS;

    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const nz = (a, b) => { let v = 0; while (v === 0) v = ri(a, b); return v; };
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    /* "+ 3", "- 3" */
    const sg = (n) => (n < 0 ? ` - ${-n}` : ` + ${n}`);
    /* coefficiente davanti alla x: 1x -> x, -1x -> -x */
    const cx = (a, v = 'x') => (a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`);
    const sgx = (a, v = 'x') => (a === 0 ? '' : a < 0 ? ` - ${cx(-a, v)}` : ` + ${cx(a, v)}`);
    const bin = (a, b) => `${cx(a)}${sg(b)}`;           // ax + b
    const pw = (n, e) => (n < 0 ? `(${n})^${e}` : `${n}^${e}`);

    const EQUAZIONI = [
        () => `${bin(nz(-9, 9), nz(-9, 9))} = ${bin(nz(-9, 9), nz(-9, 9))}`,
        () => `${nz(2, 6)}(${bin(1, nz(-7, 7))})${sgx(nz(-5, 5))} = ${bin(nz(-6, 6), nz(-9, 9))}`,
        () => `${nz(2, 5)}(${bin(nz(1, 4), nz(-6, 6))}) - ${nz(2, 5)}(${bin(1, nz(-6, 6))}) = ${bin(nz(-5, 5), nz(-9, 9))}`,
        () => `(${bin(1, nz(-6, 6))})(${bin(1, nz(-6, 6))}) = (${bin(1, nz(-6, 6))})(${bin(1, nz(-6, 6))})`,
        () => `(${bin(nz(1, 3), nz(-5, 5))})^2 - ${pick(['', '(x' + sg(nz(-4, 4)) + ')'])}${'(' + bin(nz(1, 3), nz(-5, 5)) + ')'}${pick(['^2', '(x' + sg(nz(-4, 4)) + ')'])} = ${nz(-20, 20)}`,
        () => `(${bin(1, nz(-6, 6))})/${pick([2, 3, 4])} - (${bin(1, nz(-6, 6))})/${pick([3, 5, 6])} = ${nz(-4, 4)}`,
        () => `x/${pick([2, 3, 4])}${sg(nz(-5, 5))} = x/${pick([5, 6, 8])}${sg(nz(-5, 5))}`,
        () => `${pick(['', '-'])}${nz(2, 4)}[${bin(1, nz(-5, 5))} - ${nz(2, 4)}(${bin(1, nz(-5, 5))})] = ${bin(nz(-5, 5), nz(-9, 9))}`
    ];

    /* equazioni di secondo grado con soluzioni "belle" (razionali) oppure con radice da semplificare */
    const QUADRATICHE = [
        () => { const p = nz(-6, 6), q = nz(-6, 6), a = pick([1, 1, 2, 3]); return `${cx(a, 'x^2')}${sgx(-a * (p + q))}${sg(a * p * q)} = 0`; },
        () => { const p = nz(-5, 5), q = nz(-5, 5); return `(${bin(1, p)})(${bin(nz(1, 3), q)}) = ${bin(nz(-4, 4), nz(-9, 9))}`; },
        () => `${cx(pick([1, 2, 3, -1, -2]), 'x^2')}${sgx(nz(-8, 8))}${sg(nz(-9, 9))} = 0`,
        () => `x(${bin(nz(1, 3), nz(-6, 6))}) = ${bin(nz(-6, 6), nz(-9, 9))}`
    ];
    const DISEQUAZIONI = [
        () => `${bin(nz(-9, 9), nz(-9, 9))} ${pick(['<', '>', '<=', '>='])} ${bin(nz(-9, 9), nz(-9, 9))}`,
        () => `${nz(2, 5)}(${bin(1, nz(-6, 6))}) - ${nz(2, 5)}x ${pick(['<', '>', '<=', '>='])} ${bin(nz(-6, 6), nz(-9, 9))}`,
        () => `(${bin(1, nz(-6, 6))})/${pick([2, 3, 4])} - x/${pick([3, 5, 6])} ${pick(['<', '>', '<=', '>='])} ${nz(-4, 4)}`,
        () => { const p = nz(-6, 6), q = nz(-6, 6), a = pick([1, 2, -1, -2, 3]); return `${cx(a, 'x^2')}${sgx(-a * (p + q))}${sg(a * p * q)} ${pick(['<', '>', '<=', '>='])} 0`; },
        () => `${cx(pick([1, 2, -1, 3]), 'x^2')}${sgx(nz(-8, 8))}${sg(nz(-9, 9))} ${pick(['<', '>', '<=', '>='])} 0`,
        () => `(${bin(nz(1, 4), nz(-5, 5))})(${bin(nz(1, 3), nz(-5, 5))}) ${pick(['<', '>', '<=', '>='])} ${bin(nz(-5, 5), nz(-9, 9))}`,
        () => `x(${bin(nz(-3, 3), nz(-6, 6))}) ${pick(['<', '>', '<=', '>='])} ${bin(nz(-6, 6), nz(-9, 9))}`
    ];

    /* esponenziali: basi potenze di 2, 3 o 5; la soluzione deve venire "bella" */
    const ESPONENZIALI = (() => {
        const basi = [2, 3, 5];
        const potenza = (B, k) => Math.pow(B, k);
        const lin = () => `${cx(nz(-4, 4))}${sg(nz(-6, 6))}`;
        const numDi = (B, k) => (k >= 0 ? `${potenza(B, k)}` : `1/${potenza(B, -k)}`);
        return [
            () => { const B = pick(basi), k = ri(1, 3); return `${potenza(B, k)}^(${lin()}) = ${numDi(B, ri(-3, 4))}`; },
            () => { const B = pick(basi); return `${potenza(B, ri(1, 2))}^(${lin()}) = ${potenza(B, ri(1, 3))}^(${lin()})`; },
            () => { const B = pick([2, 3]); return `${B}^(${lin()})·${potenza(B, 2)}^(${lin()}) = ${pick(['1', numDi(B, ri(-2, 4))])}`; },
            () => { const B = 2; return `1 = frac(${B}^(${lin()})·${potenza(B, 2)}^(${lin()}))(root(3)(${potenza(B, 3)}))`; },
            () => { const B = pick(basi), n = ri(2, 3); return `${potenza(B, ri(1, 2))}^(${lin()}) = root(${n})(${potenza(B, ri(1, 3))})`; },
            () => { const B = pick(basi); return `frac(${B}^(${lin()}))(${potenza(B, ri(1, 2))}) = ${potenza(B, ri(1, 3))}^x`; },
            () => { const B = pick([2, 3]); return `${B}^(x^2${sgx(nz(-5, 5))}) = ${numDi(B, ri(-6, 6))}`; },
            // potenze e radici annidate (scheda 2.html)
            () => { const B = pick([2, 3]), n = ri(2, 3); return `(${B}^(${lin()})·${B}^(${lin()}))^(1/${n}) = sqrt(frac(${B}^(${lin()}))(${potenza(B, ri(1, 2))}))`; },
            () => { const B = pick([2, 3]); return `root(${ri(2, 3)})(${potenza(B, ri(1, 2))}^(${lin()})) = (${B}^(${lin()}))^${ri(2, 3)}`; },
            // disequazioni per passaggio agli esponenti
            () => { const B = pick(basi), k = ri(1, 2); return `${potenza(B, k)}^(${lin()}) ${pick(['<', '>', '<=', '>='])} ${numDi(B, ri(-3, 4))}`; },
            () => { const B = pick([2, 3]); return `(1/${B})^(${lin()}) ${pick(['<', '>', '<=', '>='])} ${numDi(B, ri(-3, 3))}`; },
            () => { const B = pick([2, 3]); return `(1/${B})^(x^2${sgx(nz(-4, 4))}) ${pick(['<', '>', '<=', '>='])} ${numDi(B, ri(-4, 2))}`; },
            () => { const B = pick(basi); return `${potenza(B, ri(1, 2))}^(${lin()}) ${pick(['<', '>', '<=', '>='])} ${potenza(B, ri(1, 3))}^(${lin()})`; },
            // sostituzione y = B^x (scheda 3.html)
            () => {
                const B = pick([2, 3, 4]), y1 = potenza(B, ri(0, B === 4 ? 1 : 2)), y2 = pick([potenza(B, ri(0, B === 4 ? 1 : 2)), -ri(1, 9)]);
                if (y1 === y2) return '';
                const a = pick([1, 1, 2, 3]), b = -a * (y1 + y2), c = a * y1 * y2;
                const quad = pick([`${potenza(B, 2)}^x`, `${B}^(2x)`]);
                return Math.random() < 0.5
                    ? `${a === 1 ? '' : a + '·'}${quad}${b ? (b > 0 ? ' + ' : ' - ') + (Math.abs(b) === 1 ? '' : Math.abs(b) + '·') + `${B}^x` : ''} ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = 0`
                    : `${a === 1 ? '' : a + '·'}${quad}${b ? (b > 0 ? ' + ' : ' - ') + (Math.abs(b) === 1 ? '' : Math.abs(b) + '·') + `${B}^x` : ''} = ${-c}`;
            },
            // disequazioni per sostituzione
            () => {
                const B = pick([2, 3]), y1 = potenza(B, ri(0, 2)), y2 = pick([potenza(B, ri(0, 2)), -ri(1, 6)]);
                if (y1 === y2) return '';
                const b = -(y1 + y2), c = y1 * y2;
                const quad = pick([`${potenza(B, 2)}^x`, `${B}^(2x)`]);
                return `${quad}${b ? (b > 0 ? ' + ' : ' - ') + (Math.abs(b) === 1 ? '' : Math.abs(b) + '·') + `${B}^x` : ''} ${c >= 0 ? '+' : '-'} ${Math.abs(c)} ${pick(['<', '>', '<=', '>='])} 0`;
            },
            () => { const B = pick([2, 3]), h = ri(1, 2), j = ri(0, 2); return `${B}^(x+${h}) + ${B}^x ${pick(['<', '>', '<=', '>='])} ${(Math.pow(B, h) + 1) * Math.pow(B, j)}`; },
            () => { const B = pick([2, 3, 5]), h = ri(1, 2), j = ri(0, 2); return `${B}^(x+${h}) + ${B}^x = ${(Math.pow(B, h) + 1) * Math.pow(B, j)}`; },
            () => { const B = pick([2, 3]), y1 = potenza(B, ri(0, 2)), y2 = -ri(1, 6); const s1 = y1 + y2, c = y1 * y2; return `${B}^(2x+1) ${-B * s1 >= 0 ? '+' : '-'} ${Math.abs(B * s1)}·${B}^x = ${-B * c}`; }
        ];
    })();

    const ESPRESSIONI = [
        () => `(${bin(nz(1, 4), nz(-6, 6))})(${bin(nz(1, 4), nz(-6, 6))}) - ${nz(2, 5)}x(${bin(1, nz(-5, 5))})`,
        () => `(${bin(nz(1, 3), nz(-5, 5))})^2 - (${bin(nz(1, 3), nz(-5, 5))})(${bin(nz(1, 3), nz(-5, 5))})`,
        () => { const a = nz(1, 6); return `(x + ${a})(x - ${a}) - (${bin(1, nz(-5, 5))})^2`; },
        () => `${nz(2, 5)}(${bin(nz(1, 4), nz(-6, 6))}) - (${bin(nz(1, 3), nz(-6, 6))})(x${sg(nz(-4, 4))})${sgx(nz(-6, 6))}`,
        () => `(${bin(1, nz(-3, 3))})^3`,
        () => `${nz(-9, 9)} - ${nz(2, 5)}(${nz(-9, 9)}${sg(nz(-9, 9))}) + ${pw(nz(-4, 4), 2)}`,
        () => { const d = nz(2, 4); return `[${nz(-9, 9)} - (${nz(-9, 9)}${sg(nz(-9, 9))})]${sg(nz(-6, 6))} · ${d}^2`; },
        () => `1/${pick([2, 3, 4])}(${bin(pick([2, 4, 6]), nz(-6, 6))}) - 1/${pick([3, 5, 6])}(${bin(pick([3, 6, 9]), nz(-6, 6))})`
    ];

    const POLI = () => {
        const n = ri(2, 4);
        let s = cx(nz(-5, 5), n === 1 ? 'x' : `x^${n}`);
        for (let k = n - 1; k >= 0; k--) {
            if (Math.random() < 0.3) continue;
            const c = nz(-9, 9);
            s += k === 0 ? sg(c) : sgx(c, k === 1 ? 'x' : `x^${k}`);
        }
        return s;
    };
    const FUN = ['sin(x)', 'cos(x)', 'e^x', 'ln(x)'];
    const DERIVATE = [
        POLI,
        () => `${pick(['x', 'x^2', 'x^3', `${nz(2, 5)}x^2`])}${pick(FUN)}`,
        () => `(${bin(nz(1, 5), nz(-6, 6))})/(${bin(nz(1, 4), nz(-6, 6))})`,
        () => `${pick(['x^2', `${nz(2, 5)}x^2`, `x^2${sg(nz(-5, 5))}`])}/(${bin(1, nz(-5, 5))})`,
        () => `${pick(['sin(x)', 'cos(x)', 'e^x', 'ln(x)'])}/${pick(['x', 'x^2'])}`,
        () => `${pick(['sin', 'cos'])}(${pick([`${nz(2, 5)}x`, `x^2`, `${nz(2, 4)}x^2${sg(nz(-5, 5))}`])})`,
        () => `e^(${pick([`${nz(-5, 5)}x`, `x^2`, `${nz(2, 3)}x^2${sgx(nz(-4, 4))}`])})`,
        () => `ln(${pick([`x^2${sg(nz(1, 9))}`, `${nz(2, 5)}x${sg(nz(-5, 5))}`])})`,
        () => `(${pick([`x^2${sg(nz(-5, 5))}`, bin(nz(2, 5), nz(-5, 5))])})^${ri(2, 4)}`,
        () => `sqrt(${pick([`x^2${sg(nz(1, 9))}`, bin(nz(2, 5), nz(1, 9))])})`,
        () => { const n = ri(2, 5); let m = ri(1, n + 2); if (m % n === 0) m = 1; return m === 1 ? `root(${n})(x)` : `root(${n})(x^${m})`; },
        () => `${nz(-9, 9)}/x^${ri(1, 4)}`,
        () => `${cx(nz(-4, 4), 'x^' + ri(2, 3))}${sg(nz(1, 9))}/x${pick(['', '^2'])}`,
        () => `${pick(['', nz(2, 6)])}/sqrt(x)`
    ];

    function accettabile(tipo, src) {
        const p = SBS.parse(src);
        if (tipo === 'equazioni' || tipo === 'disequazioni') {
            const r = SBS.algebra.risolvi(p.lhs, p.rhs, p.rel);
            const k = r.risultato.kind;
            if (r.slides.length > 110) return false;
            if (k === 'sol' || k === 'diseq1') { const q = r.risultato.sol; return q.d <= 12 && Math.abs(q.n) <= 60; }
            if (k === 'sol2' || k === 'diseq2' || k === 'coincidenti') return !/sqrt\{\d{4,}/.test(r.risultato.html) && !/\d{3,}/.test(r.risultato.html.replace(/sqrt\{\d+\}/g, ''));
            return k === 'nessuna' ? Math.random() < 0.3 : false;
        }
        if (tipo === 'esponenziali') {
            const r = SBS.esponenziali.risolvi(p.lhs, p.rhs, p.rel);
            const R = r.risultato, k = R.kind;
            if (r.slides.length > 110) return false;
            if (k === 'sol' || k === 'diseq1') { const q = R.sol; return q.d <= 12 && Math.abs(q.n) <= 40; }
            if (k === 'sol2' || k === 'coincidenti' || k === 'diseq2') return !/sqrt/.test(R.html);
            if (k === 'sost' || k === 'diseqSost') return !/log/.test(R.html);
            return false;
        }
        if (tipo === 'espressioni') {
            const r = SBS.algebra.espressione(p.lhs);
            return r.slides.length <= 80 && r.finalLine.L.length > 0 && r.finalLine.L.every(t => Math.abs(t.c.n) <= 200);
        }
        const r = SBS.derivate.deriva(p.lhs);
        return r.slides.length <= 80;
    }

    function genera(tipo) {
        const lista = tipo === 'esponenziali' ? ESPONENZIALI : tipo === 'equazioni' ? (Math.random() < 0.5 ? EQUAZIONI : QUADRATICHE) : tipo === 'disequazioni' ? DISEQUAZIONI : tipo === 'espressioni' ? ESPRESSIONI : DERIVATE;
        for (let k = 0; k < 60; k++) {
            const src = pick(lista)();
            try { if (accettabile(tipo, src)) return src; } catch (e) { /* riprovo */ }
        }
        if (tipo === 'esponenziali') return '1 = frac(2^(9x - 7)·4^(10x - 6))(root(3)(8))';
        return tipo === 'derivate' ? '3x^2/(2x + 1)' : tipo === 'equazioni' ? '6x - 3 = 2x + 9' : tipo === 'disequazioni' ? '3x^2 + 2x - 5 < 0' : '(3x - 2)(3x + 2) - (3x - 1)^2';
    }

    SBS.casuale = { genera };
})(typeof window !== 'undefined' ? window : globalThis);
