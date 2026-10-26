
    //leggo il file nel local storage e lo riconverto in array di oggetti
    let displayJSON = localStorage.getItem(`displayList`);
    let display = JSON.parse(displayJSON);

    //scasiono l'array display e rendo non visibili i div che hanno attributo display 0 
    // oppure non contengono alcun testo
    display.forEach(elm => {
      if (elm.display === 0 || document.getElementById(elm.id).innerHTML === ``) {
        document.getElementById(`container-${elm.id}`).style.display = "none";
      }
    });



    function copia(id) {

      const file = "index.html";

      //prendo questo file
      fetch(file)
        .then(response => {
          if (!response.ok) throw new Error(`Errore caricamento ${file}`);
          //e do come output il suo testo
          return response.text();
        })
        //estraggo l'innerHTML dell'esercizio e lo copio negli appunti
        .then(html => navigator.clipboard.writeText(extractBody(html)))


      function extractBody(htmlText) {
        const parser = new DOMParser();
        //converto la stringa che ricevo in input in un file html
        const doc = parser.parseFromString(htmlText, "text/html");

        //restituisco l'innerHTML del div che ha come id il parametro della funzione copia
        return doc.getElementById(id).innerHTML
      }

      //Vecchia funzionalità copia, la tengo per sicurezza      
      //let testo = document.getElementById(id).innerHTML;
      //navigator.clipboard.writeText(testo);
    }

    function elimina(id) {

      //modifico l'array di oggetti rendendoli non visibili
      display.forEach(elm => {
        if (elm.id === id) {
          elm.display = 0
        }
      })

      //nascondo i div
      document.getElementById(`container-${id}`).style.display = "none";

      //aggiorno il json per poi depositarlo nel local storage
      displayJSON = JSON.stringify(display);
      localStorage.clear();
      localStorage.setItem(`displayList`, displayJSON);

    }

    function ripristina() {

      //modifico l'array di oggetti ripristinando la visibilità di tutti i div 
      //che contengono testo
      display.forEach(elm => {
        elm.display = 1
        if (document.getElementById(elm.id).innerHTML === ``) {
          document.getElementById(`container-${elm.id}`).style.display = "none";
        } else {
          document.getElementById(`container-${elm.id}`).style.display = "block";
        }
      })

      //creo il json per aggiornare lo storage
      displayJSON = JSON.stringify(display);
      localStorage.clear();
      localStorage.setItem(`displayList`, displayJSON);
    }

    //questo è l'array di oggetti che contengono gli id dei div ed il loro stato di visibilità
    //usalo per riinizializzare il local storage nel caso di malfunzionamento 

    //[{id: `apEPWrdtPQ`, display: 1},{id: `ByKpNGRjLi`, display: 1},{id: `ljdgFOrBus`, display: 1},{id: `ubWJbERvEF`, display: 1},{id: `FUDgQDNxZx`, display: 1},{id: `ImwpQqkLdl`, display: 1},{id: `pyFcRDIJuU`, display: 1},{id: `vOdHcoJJSe`, display: 1},{id: `zvTiDYAeSi`, display: 1},{id: `VihyKSMhZP`, display: 1},{id: `nwYCLXuSFl`, display: 1},{id: `NCrUlZtSCS`, display: 1},{id: `InkgDTFCGv`, display: 1},{id: `HKQPwancpo`, display: 1},{id: `NJVJtPlpqU`, display: 1},{id: `CfWZSnebgs`, display: 1},{id: `DKVGBGJgev`, display: 1},{id: `qvorhQMXzu`, display: 1},{id: `WjQIuIOGlv`, display: 1},{id: `BAPpzhWfNa`, display: 1},{id: `FiEgPppIEI`, display: 1},{id: `sfyqnoejWL`, display: 1},{id: `lvyLcHTAsg`, display: 1},{id: `MVcygTLwzd`, display: 1},{id: `GJBIARVnlB`, display: 1},{id: `lkNUQnkUkn`, display: 1},{id: `hUsgZrvqlB`, display: 1},{id: `nlJQzfPZGv`, display: 1},{id: `WGgqbsoKlP`, display: 1},{id: `iDXQJmwWaD`, display: 1},{id: `iCNzpPDtRS`, display: 1},{id: `LiCEzSauGq`, display: 1},{id: `bxcKmahjMC`, display: 1},{id: `ooHaoXrFFc`, display: 1},{id: `WIycZDxvpS`, display: 1},{id: `hGfUMHeZhO`, display: 1},{id: `DXqqBHWnYR`, display: 1},{id: `ZzVVPquSzo`, display: 1},{id: `ysTGvkOaJF`, display: 1},{id: `fjNxjyvAmo`, display: 1},{id: `usHSHFTEKS`, display: 1},{id: `ghIEnhJdch`, display: 1},{id: `DXkYYbwzSU`, display: 1},{id: `AuwEqpUTIv`, display: 1},{id: `PyzyXhImjk`, display: 1},{id: `uPkzdMlLDQ`, display: 1},{id: `wHvglySUoz`, display: 1},{id: `vvUrAkXGJB`, display: 1},{id: `WDKNBrEciV`, display: 1},{id: `OaNcbocLHT`, display: 1},{id: `hciJOWdAgS`, display: 1},{id: `pYcNSjoihU`, display: 1},{id: `AhIcSCIMFY`, display: 1},{id: `ReAVJnoYzp`, display: 1},{id: `mWpMkjQkwy`, display: 1},{id: `fovSLTWWob`, display: 1},{id: `bKKnnUwUVZ`, display: 1},{id: `YWtvFByGHf`, display: 1},{id: `QKJEsLxHjo`, display: 1},{id: `wGhzjyAIlb`, display: 1},{id: `FBdpHoRrkg`, display: 1},{id: `VdGgVZnBic`, display: 1},{id: `diyOeCplnc`, display: 1},{id: `pWNNXdUwYK`, display: 1},{id: `kxLMakzCpD`, display: 1},{id: `FsadFDQqjO`, display: 1},{id: `oFwDJnREvP`, display: 1},{id: `YntCKOsYAr`, display: 1},{id: `ezEjuPYTmv`, display: 1},{id: `qVzeKiJCAy`, display: 1},{id: `eCPTuGjXYK`, display: 1}, {id: "ksyQzzvOQn", display: 1},{id: `yUIZOlHoYi`, display: 1},{id: `GWaLPrxFhT`, display: 1},{id: `onkGSHuYkX`, display: 1},{id: `HGdlWWsTlK`, display: 1},{id: `uJXCavKlQP`, display: 1},{id: `yEeShfIaHl`, display: 1},{id: `oYLlviukUq`, display: 1},{id: `JeCtVszOqB`, display: 1},{id: `tiJaVYvraP`, display: 1},{id: `isZlcVkSRR`, display: 1},{id: `cjNIPmGTPF`, display: 1},{id: `NbHLWuaLER`, display: 1},{id: `obemEydYEP`, display: 1},{id: `ZnYUGQQHZd`, display: 1},{id: `YbpCzGKzOZ`, display: 1},{id: `cSoaEizpCr`, display: 1},{id: `qhmRGrKwUt`, display: 1},{id: `QlBaQUlMXm`, display: 1},{id: `wYjLMsDvEf`, display: 1},{id: `hhoWcCdLCy`, display: 1},{id: `dcdnEizGus`, display: 1},{id: `iyVEpnSZKQ`, display: 1},{id: `bFHhXYAYUr`, display: 1},{id: `nfEKHloRrC`, display: 1},{id: `GwUYvGoTZE`, display: 1},{id: `uwoNsuwSmw`, display: 1},{id: `qHlgoUvCLa`, display: 1},{id: `DkBMsTVAfj`, display: 1},{id: `GtpwLmHLhy`, display: 1},{id: `SfeTCIEcIz`, display: 1}]

    //COMANDO PER INIZIALIZZARE
    //localStorage.setItem("displayList", '[{"id":"apEPWrdtPQ","display":1},{"id":"ByKpNGRjLi","display":1},{"id":"ljdgFOrBus","display":1},{"id":"ubWJbERvEF","display":1},{"id":"FUDgQDNxZx","display":1},{"id":"ImwpQqkLdl","display":1},{"id":"pyFcRDIJuU","display":1},{"id":"vOdHcoJJSe","display":1},{"id":"zvTiDYAeSi","display":1},{"id":"VihyKSMhZP","display":1},{"id":"nwYCLXuSFl","display":1},{"id":"NCrUlZtSCS","display":1},{"id":"InkgDTFCGv","display":1},{"id":"HKQPwancpo","display":1},{"id":"NJVJtPlpqU","display":1},{"id":"CfWZSnebgs","display":1},{"id":"DKVGBGJgev","display":1},{"id":"qvorhQMXzu","display":1},{"id":"WjQIuIOGlv","display":1},{"id":"BAPpzhWfNa","display":1},{"id":"FiEgPppIEI","display":1},{"id":"sfyqnoejWL","display":1},{"id":"lvyLcHTAsg","display":1},{"id":"MVcygTLwzd","display":1},{"id":"GJBIARVnlB","display":1},{"id":"lkNUQnkUkn","display":1},{"id":"hUsgZrvqlB","display":1},{"id":"nlJQzfPZGv","display":1},{"id":"WGgqbsoKlP","display":1},{"id":"iDXQJmwWaD","display":1},{"id":"iCNzpPDtRS","display":1},{"id":"LiCEzSauGq","display":1},{"id":"bxcKmahjMC","display":1},{"id":"ooHaoXrFFc","display":1},{"id":"WIycZDxvpS","display":1},{"id":"hGfUMHeZhO","display":1},{"id":"DXqqBHWnYR","display":1},{"id":"ZzVVPquSzo","display":1},{"id":"ysTGvkOaJF","display":1},{"id":"fjNxjyvAmo","display":1},{"id":"usHSHFTEKS","display":1},{"id":"ghIEnhJdch","display":1},{"id":"DXkYYbwzSU","display":1},{"id":"AuwEqpUTIv","display":1},{"id":"PyzyXhImjk","display":1},{"id":"uPkzdMlLDQ","display":1},{"id":"wHvglySUoz","display":1},{"id":"vvUrAkXGJB","display":1},{"id":"WDKNBrEciV","display":1},{"id":"OaNcbocLHT","display":1},{"id":"hciJOWdAgS","display":1},{"id":"pYcNSjoihU","display":1},{"id":"AhIcSCIMFY","display":1},{"id":"ReAVJnoYzp","display":1},{"id":"mWpMkjQkwy","display":1},{"id":"fovSLTWWob","display":1},{"id":"bKKnnUwUVZ","display":1},{"id":"YWtvFByGHf","display":1},{"id":"QKJEsLxHjo","display":1},{"id":"wGhzjyAIlb","display":1},{"id":"FBdpHoRrkg","display":1},{"id":"VdGgVZnBic","display":1},{"id":"diyOeCplnc","display":1},{"id":"pWNNXdUwYK","display":1},{"id":"kxLMakzCpD","display":1},{"id":"FsadFDQqjO","display":1},{"id":"oFwDJnREvP","display":1},{"id":"YntCKOsYAr","display":1},{"id":"ezEjuPYTmv","display":1},{"id":"qVzeKiJCAy","display":1},{"id":"eCPTuGjXYK","display":1},{"id":"ksyQzzvOQn","display":1},{"id":"yUIZOlHoYi","display":1},{"id":"GWaLPrxFhT","display":1},{"id":"onkGSHuYkX","display":1},{"id":"HGdlWWsTlK","display":1},{"id":"uJXCavKlQP","display":1},{"id":"yEeShfIaHl","display":1},{"id":"oYLlviukUq","display":1},{"id":"JeCtVszOqB","display":1},{"id":"tiJaVYvraP","display":1},{"id":"isZlcVkSRR","display":1},{"id":"cjNIPmGTPF","display":1},{"id":"NbHLWuaLER","display":1},{"id":"obemEydYEP","display":1},{"id":"ZnYUGQQHZd","display":1},{"id":"YbpCzGKzOZ","display":1},{"id":"cSoaEizpCr","display":1},{"id":"qhmRGrKwUt","display":1},{"id":"QlBaQUlMXm","display":1},{"id":"wYjLMsDvEf","display":1},{"id":"hhoWcCdLCy","display":1},{"id":"dcdnEizGus","display":1},{"id":"iyVEpnSZKQ","display":1},{"id":"bFHhXYAYUr","display":1},{"id":"nfEKHloRrC","display":1},{"id":"GwUYvGoTZE","display":1},{"id":"uwoNsuwSmw","display":1},{"id":"qHlgoUvCLa","display":1},{"id":"DkBMsTVAfj","display":1},{"id":"GtpwLmHLhy","display":1},{"id":"SfeTCIEcIz","display":1}]')
  