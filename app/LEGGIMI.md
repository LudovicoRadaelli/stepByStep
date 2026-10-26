# StepByStep – app per gli studenti

Apri `app/index.html` (doppio clic, oppure dal sito). Nella home lo studente sceglie l'argomento
(equazioni, disequazioni, equazioni esponenziali, espressioni, derivate), scrive l'esercizio direttamente nella formula con il tastierino
(oppure preme «Esercizio casuale») e sotto trova i pulsanti **Soluzione** e **Svolgimento**. Lo svolgimento usa lo stesso stile delle schede in `esercizi/`:
formule in grigio, la parte su cui si lavora in rosso e la riga nuova scritta un
termine alla volta.

## Cosa sa svolgere
- **Equazioni di 1° grado**: prodotti tra parentesi, potenze di binomi, frazioni (m.c.m. ed eliminazione
  dei denominatori), termini uguali nei due membri, trasporto, somma dei simili, divisione finale.
  Riconosce anche le equazioni impossibili e indeterminate. Se restano termini di 2° grado lo segnala.
- **Equazioni di 2° grado**: se dopo i calcoli resta la \(x^2\), si porta tutto al primo membro e si usa la
  formula risolutiva con l'impostazione di `esercizi/equazioniSecondoGrado/1.html`: equazione in alto (con i
  coefficienti sottintesi scritti), formula sotto; ogni lettera viene evidenziata, poi il coefficiente
  nell'equazione, poi il valore sostituito; i calcoli, la scomposizione sotto radice, i fattori con
  esponente pari portati fuori e la semplificazione con il denominatore avvengono nella stessa riga.
- **Disequazioni di 1° grado**: come le equazioni; quando si divide per un coefficiente negativo l'app
  avvisa (in rosso) che il verso della disuguaglianza si inverte.
- **Disequazioni di 2° grado**: metodo della parabola. Si risolve l'equazione associata, si mettono le
  soluzioni sull'asse, si disegna una parabola schematica (concavità secondo il segno di \(a\)), si
  segnano + (rosso), − (azzurro) e 0 (nero) e si evidenziano in verde gli intervalli che risolvono.
- **Equazioni esponenziali** (passaggio agli esponenti), con l'impostazione di `esercizi/esponenziali/1.html`:
  ogni base viene scritta come potenza della base comune, \((2^2)^{10x-6} \to 2^{2\cdot(10x-6)} \to 2^{20x-12}\),
  le radici diventano esponenti frazionari, l'1 diventa \(2^0\), si sommano/sottraggono gli esponenti di
  prodotti e quozienti, si uguagliano gli esponenti e si risolve l'equazione che ne risulta (anche di 2° grado).
  Se le basi non si possono ricondurre alla stessa base (servirebbero i logaritmi) l'app lo segnala.
  - **Potenze e radici annidate** (scheda `esponenziali/2.html`): si lavora dal livello più interno verso
    l'esterno; \((3^{S})^{E} \to 3^{(S)\cdot E}\) senza sviluppare, \(\sqrt[\color{blue}2]{3^{S}} \to 3^{\frac{S}{2}}\).
  - **Disequazioni esponenziali** (stessa tastiera, con <, >, ≤, ≥): se la base è compresa tra 0 e 1 l'app
    avvisa in rosso che, passando agli esponenti, il verso si inverte.
  - **Equazioni per sostituzione** (scheda `esponenziali/3.html`), scelte in automatico quando un membro è una
    somma: \(3^{x+3} \to 3^x\cdot 3^3 \to 27\cdot 3^x\), tutto al primo membro, \(9^x \to (3^x)^2\),
    variabile ausiliaria \(y = 3^x\), equazione in \(y\) (di 1° o 2° grado), ritorno a \(3^x\); i valori
    negativi danno equazioni impossibili (con la spiegazione), quelli che non sono potenze della base
    si scrivono con il logaritmo (\(x = \log_4 \ldots\)).
  - **Disequazioni per sostituzione**: stessa impostazione; la disequazione in \(y\) si risolve (anche con la
    parabola), si torna a \(b^x\) e si passa agli esponenti. \(b^x > (\text{numero} \le 0)\) è verificata per ogni
    \(x\), \(b^x < (\text{numero} \le 0)\) è impossibile; in \(\ldots < b^x < \ldots\) primo e terzo membro diventano
    potenze di \(b\) e poi si passa agli esponenti (se \(0 < b < 1\) i versi si invertono, con l'avviso).
    Lo stesso vale per i casi semplici come \(2^x > -4\) o \(2^x = 0\).
- **Colori di evidenziazione**: in ordine di priorità #DB4437 (rosso), #4285F4 (blu), #0F9D58 (verde),
  #F4B400 (giallo). Si cambiano in `sbs-ui.js` (costante `PALETTE`).
- Gli esponenti frazionari si scrivono con \(\frac{}{}\) piccolo, così restano più piccoli della base.
- **Espressioni e polinomi**: le stesse regole, più il calcolo dei numeri, le potenze, le divisioni tra
  monomi e i calcoli tra frazioni "a parte" (terza riga, come nella scheda 2).
- **Derivate**: somma, costante moltiplicativa, potenza, prodotto (Leibniz), rapporto, funzione composta,
  sin, cos, tan, ln, √, radici n-esime, eˣ, aˣ. Radici e frazioni con la x al denominatore vengono prima
  riscritte come potenze (esponente frazionario o negativo), si applica la regola della potenza e poi si
  torna a radici e frazioni. Alla fine sistema i calcoli e raccoglie a fattor comune.

## Link diretti
- a un argomento: `app/index.html#equazioni`, `#disequazioni`, `#esponenziali`, `#espressioni`, `#derivate`
- a un esercizio già svolto: `app/index.html?es=3(x-1)=2x+5`, e per le derivate aggiungi `&tipo=der`.
Comodo da mettere in una scheda o da mandare agli studenti.

## File
- `js/stepByStep/sbs-core.js`: lettura del testo, frazioni, disegno LaTeX con i colori
- `js/stepByStep/sbs-algebra.js`: equazioni, disequazioni (anche di 2° grado, con la parabola) ed espressioni
- `js/stepByStep/sbs-esponenziali.js`: equazioni esponenziali
- `js/stepByStep/sbs-derivate.js`: derivate
- `js/stepByStep/sbs-editor.js`: campo-formula (si scrive direttamente nella formula formattata)
- `js/stepByStep/sbs-random.js`: esercizi casuali (modelli modificabili all'inizio del file)
- `js/stepByStep/sbs-ui.js`: home, argomenti, tastierino, pulsanti, slide
- `css/stepByStepApp.css`: stili della pagina (`style.css` non è stato modificato)

Le frasi di spiegazione che compaiono sotto le formule sono scritte in chiaro nei file `sbs-algebra.js` e
`sbs-derivate.js` (cerca il testo tra apici) e si possono cambiare liberamente.
Argomenti e tasti del tastierino sono all'inizio di `sbs-ui.js`.
