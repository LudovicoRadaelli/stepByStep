
    //<div id="stampa"></div>

    function generaStringaCasuale(lunghezza) {

      const lettere = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let risultato = '';
      for (let i = 0; i < lunghezza; i++) {
        const indiceCasuale = Math.floor(Math.random() * lettere.length);
        risultato += lettere.charAt(indiceCasuale);
      }
      return risultato;
    }

    // Genera la stringa e la stampa nel div con id "stampa"
    //document.getElementById('stampa').textContent = generaStringaCasuale(10);
  