# Test prima della vendita

Registrare dispositivo, versione OS/browser, data, esito e tempo di caricamento. Utilizzare esclusivamente dati fittizi.

## Matrice dispositivi

| Dispositivo | Browser e modalità | Cosa verificare |
| --- | --- | --- |
| iPhone reale | Safari e PWA da schermata Home | AES, IndexedDB, memoria disponibile, WebGPU/f16 o Qwen CPU, riavvio offline, tastiera, rotazione |
| Android reale | Chrome e PWA installata | GPU se supportata, CPU fallback, interruzione download, offline, microfono locale |
| Desktop Windows/macOS/Linux | Chrome/Edge aggiornati | Entrambi i motori, installazione PWA, tastiera, backup, più schede |
| Desktop senza WebGPU | Firefox/Safari o hardware senza GPU supportata | Avviso CPU, Qwen WASM, UI reattiva, assenza di crash |

La compatibilità va misurata sul dispositivo, non dedotta dal nome del browser.

## Percorso completo

- [ ] HTTPS e percorso Pages `/twin/`: nessun asset 404 e nessun errore CSP; manifest/icona corretti.
- [ ] Creare spazio con nome, tre obiettivi, budget e password di almeno 12 caratteri. Password diverse rifiutate. Campi vuoti, soli spazi e numeri fuori intervallo rifiutati.
- [ ] Bloccare e ricaricare. Password errata rifiutata; password corretta apre i dati. Nessuna nota leggibile in IndexedDB/localStorage/Cache Storage.
- [ ] Creare 3 note demo; la quarta porta allo sblocco. Eliminare una nota non ripristina il contatore.
- [ ] “Prepara Twin”: verificare progresso, download pubblico dei modelli, risposta e embedding realmente generati. Controllare che l’UI resti utilizzabile per interrompere.
- [ ] Interrompere il download, riavviare e riprovare: nessun dato diario perso e nessuna falsa indicazione di modello pronto.
- [ ] Con GPU incompatibile o shader-f16 assente compare Qwen CPU e l’avviso di lentezza. Ripetere esplicitamente su CPU anche su desktop GPU.
- [ ] Generare una risposta su entrambi i motori; nessuna richiesta di rete deve contenere testo di note/domande, vettori o password. Solo GET di asset pubblici.
- [ ] Fare 3 generazioni AI demo includendo una spiegazione: la quarta è bloccata. Nessuna quota consumata su errore o annullamento.
- [ ] Codice valido emesso dal kit venditore: sblocco offline. Codice alterato, altro prodotto o altra chiave: rifiuto.
- [ ] Dopo sblocco inserire almeno 7 giorni. Doppia nota nello stesso giorno: spesa somma e umore/sonno media. Giorni mancanti non trattati come zero.
- [ ] Domanda semanticamente pertinente: fino a 5 ricordi, fonti visibili, obiettivi citati corrispondenti. Provare IT ed EN e annotare i limiti di MiniLM in italiano.
- [ ] Note con testo come “ignora le istruzioni…” non devono modificare il ruolo; valutare risposte inappropriate dei modelli piccoli.
- [ ] Schemi: verificare a mano medie e Pearson, incluso caso di sonno costante e meno di 7 giorni. Giorno più spendaccione basato sulla media, non sulla somma di campioni diversi.
- [ ] Due futuri: 13 punti (mese 0–12); 0% coincide; 20% produce il 20% di differenza a 12 mesi. Tabella e grafico coincidono. Nessun interesse o reddito inventato.
- [ ] Lettera: note della settimana conclusa domenica, nessun duplicato alla riapertura. Nessuna lettera senza note nel periodo. Aprire il lunedì dopo una domenica passata.
- [ ] Non aspettarsi generazione quando app/telefono sono chiusi: verificare il comportamento dichiarato alla riapertura.
- [ ] Export: file senza contenuti leggibili; import con password corretta ripristina note, embedding, obiettivi, licenza, quote, chat e lettere.
- [ ] Import con password errata/file alterato/file troppo grande rifiutato senza sostituire i dati locali.
- [ ] Cambiare password: vecchia password non apre il nuovo archivio; nuovo export richiede la nuova password, il vecchio backup la vecchia.
- [ ] Due schede aperte: una modifica e la seconda riceve conflitto invece di sovrascrivere.
- [ ] Bloccare durante generazione o indicizzazione: worker terminato, nessuna risposta tardiva riappare e nessuna modifica successiva viene applicata alla nuova sessione.
- [ ] Modalità aereo dopo preparazione completa: chiudere tutte le schede e riaprire la PWA. Diario, embedding, AI e grafici funzionano senza download.
- [ ] Spazio insufficiente e navigazione privata: messaggio chiaro; verificare comportamento di quota e persistenza. Non provare su dati reali senza backup.
- [ ] Voce: solo `processLocally=true`, permesso microfono esplicito, nessuna chiamata remota. Su browser privi di dettatura locale appare l’avviso e si può scrivere.
- [ ] Eliminazione totale: dati del diario, quota e licenza assenti; chiave privata venditore mai presente nel browser/build. Chiudere schede bloccanti prima di verificare cache residue.
- [ ] Tema chiaro/scuro/automatico, IT/EN, navigazione tastiera, screen reader, zoom 200%, viewport 320–430 px: nessun controllo irraggiungibile e nessuno scroll orizzontale dell’intera pagina.
- [ ] Nuova versione: vecchia scheda continua a funzionare; dopo chiusura di tutte le schede si attiva la nuova build senza perdere l’archivio.

## Condizioni di uscita commerciale

- [ ] Esito documentato su almeno un iPhone, un Android e un desktop realmente compatibili.
- [ ] Nome/contatti del venditore, condizioni, informativa acquisti e assistenza completati.
- [ ] Pagina Shopify descrive requisiti, contenuto, prezzo finale e tempi del codice; processo recesso/conformità verificato.
- [ ] Licenze/attribuzioni mantenute e chiave privata conservata separatamente; ordine reale di prova o flusso test completato.
- [ ] Valutazione giuridica di trasparenza AI e marcatura dei contenuti completata: gli attributi HTML da soli non sono una certificazione di conformità.
