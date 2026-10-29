# Twin 2.0 - note tecniche

Questa versione sostituisce l’accesso giornaliero con password con un unico codice di attivazione, ricordato nel browser, e aggiunge note vocali registrate e trascritte sul dispositivo. La documentazione tecnica completa e aggiornata è in [README.md](README.md).

## Accesso e dati precedenti

Il codice viene verificato offline con Ed25519. Una chiave AES-256-GCM casuale e non esportabile resta in IndexedDB insieme all’attivazione: Twin si riapre automaticamente. Non è un blocco separato dal dispositivo; chi usa il browser sbloccato può leggere il diario. Non rimangono blocchi automatici per inattività. Dopo cinque minuti in background si arrestano soltanto i motori AI; il microfono si ferma appena l’app viene nascosta.

Un diario 1.x richiede la vecchia password una sola volta per la conversione, conservando il vecchio archivio cifrato come recupero locale. I vecchi backup richiedono ancora la loro password. I nuovi backup includono audio e testi e usano il codice di attivazione come segreto: conservarlo separatamente dal file. Il ripristino sostituisce tutti i dati locali ed emette una nuova chiave locale.

## Note vocali

Registrazione con MediaRecorder, previa autorizzazione: massimo 3 minuti e 4 MiB per clip, 20 MiB complessivi cifrati. MP4 su Safari quando supportato, WebM/Opus su altri browser. Dopo l’arresto occorre premere Salva questo ricordo; la bozza non è ancora persistita. Si può salvare solo l’audio. La trascrizione opzionale scarica Whisper tiny multilingue q8 (circa 41 MB più file di supporto), elabora sul dispositivo e permette di correggere il testo prima del salvataggio. L’AI testuale non interpreta l’audio non trascritto.

L’AI principale viene fermata prima della trascrizione per limitare la memoria. Il motore vocale viene chiuso al termine. Audio cifrati e testo sono scritti insieme; cancellare il ricordo cancella anche il relativo audio. I modelli pubblici sono separati dal backup.

## Sviluppo e distribuzione

Node 22.12+. Eseguire `npm ci --ignore-scripts`, `npm run build`, `npm test`; `npm run preview` serve la build su localhost. L’app richiede HTTPS o localhost. Il repository superiore pubblica source/twin in apps/twin tramite il workflow publish-twin.yml.

Non pubblicare chiavi private o codici cliente. Mantenere la chiave pubblica esistente per la validità dei codici già emessi. Per ogni ordine verificato emettere un codice diverso con scripts/license.mjs. L’app statica non implementa pagamento, attivazione monodispositivo o revoca server.

Consultare [guida cliente](CUSTOMER-GUIDE.it.md), [verifiche](VERIFICATION.md) e [test su dispositivo](TEST-CHECKLIST.md). Nessun test automatico sostituisce una prova completa su iPhone fisico; la compatibilità e i tempi dipendono da browser, spazio e RAM disponibili. La pubblicazione Shopify e la consegna automatica sono attività separate.
