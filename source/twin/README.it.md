# Twin

PWA privata, mobile first, italiano/inglese. Un unico sito statico; nessun server applicativo, database remoto, account utente o API AI a pagamento. AI ed embedding vengono eseguiti sul dispositivo. **Built with Llama.**

## Avvio rapido

Richiede Node 22.12+ e npm.

```sh
npm ci --ignore-scripts
npm run dev
```

Apri il **localhost del tuo computer** indicato da Vite. HTTPS è necessario su un dominio; aprire `index.html` da Finder o usare HTTP su un indirizzo LAN non basta per Web Crypto, WebGPU e service worker. Il server di sviluppo non attiva il service worker.

```sh
npm run build
npm test
npm run preview
```

`dist/` contiene il sito statico completo, già compilato anche nel pacchetto consegnato. In produzione il service worker memorizza interfaccia, worker, JavaScript, icone, informative e runtime WASM. I pesi AI vengono scaricati al primo utilizzo e conservati separatamente dalle librerie di inferenza.

`.npmrc` disabilita gli install script: il progetto usa ONNX nel browser e non deve scaricare ONNX/CUDA per Node. L’override di `sharp` corregge dipendenze native non usate dal bundle browser. `package-lock.json` fissa l’albero installato.

## Pubblicazione su GitHub Pages

**Uso commerciale:** la compatibilità tecnica non implica autorizzazione del provider. GitHub limita l’uso di Pages per attività commerciali e SaaS. Prima di usarlo per Twin a pagamento verifica i [termini Pages](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#pages); dettagli in `LEGAL-PRIVACY.md`. La stessa build funziona su altri hosting statici HTTPS.

1. Crea un repository GitHub, per esempio `twin`, e carica **i contenuti di questa cartella** nella radice del repository. Non caricare il pacchetto separato con la chiave privata del venditore. Conserva anche i file `.github`, `.gitignore` e `.npmrc`.
2. Usa il branch `main`. In **Settings → Pages → Build and deployment → Source** scegli **GitHub Actions**.
3. Esegui il workflow “Deploy Twin to GitHub Pages” o fai un push su `main`.
4. Il workflow installa le dipendenze, compila, esegue i test e pubblica `dist`. Attiva **Enforce HTTPS** quando disponibile.
5. Apri l’URL restituito da GitHub; crea il diario, prepara i modelli, attendi che tutto termini, chiudi e riapri in modalità aereo. Usa `TEST-CHECKLIST.md` prima di vendere.

`base: './'`, manifest, icone, worker e registrazione del service worker funzionano sia sulla root sia su un percorso come `/twin/`. Non serve un router né un fallback 404. `dist/.nojekyll` è incluso. Le visite alle pagine legali sono navigazioni ordinarie; usa il collegamento di ritorno a Twin.

Alternativa senza Actions: pubblica **solo il contenuto di `dist/`** con un branch/folder configurato in Pages. Non pubblicare il sorgente come se fosse la build. Il piano gratuito di GitHub Pages può richiedere un repository pubblico; limiti e condizioni del servizio restano applicabili. Shopify, il dominio personalizzato e le commissioni di pagamento sono separati dall’hosting e dall’AI locali.

## Funzioni implementate

- Onboarding: password con conferma (minimo 12 caratteri), nome, tre obiettivi e budget mensile.
- Diario: data, nota libera, spese **esplicitamente inserite**, umore 1–5, ore di sonno. Nessuna estrazione automatica delle spese dal testo. Più note nello stesso giorno: spese sommate, umore/sonno mediati.
- Embedding MiniLM normalizzati a 384 dimensioni e ricerca RAG per similarità coseno, fino a 5 ricordi. Se si scrive prima del download, la nota è subito cifrata e segnalata come “indicizzazione in attesa”; “Prepara Twin” completa gli embedding.
- “Chiedi a Twin”: obiettivi, budget, statistiche e ricordi pertinenti; mostra i ricordi forniti e gli obiettivi usati al momento della domanda. Non chiama servizi AI remoti.
- Schemi: serie dell’umore, medie dei giorni annotati, spesa per giorno della settimana, Pearson sonno/spesa con almeno 7 giorni e varianza non nulla. Nessuna affermazione di causalità o significatività statistica.
- Due futuri: 12 mesi, scenari di spesa cumulativa con riduzione percentuale scelta dall’utente. Formula e tabella accessibile visibili. Servono almeno 7 giorni annotati. Non sono una previsione, un rendimento o una categoria di spesa riconosciuta automaticamente.
- Lettera settimanale: la domenica più recente identifica il periodo lunedì–domenica. Generazione locale all’apertura/caricamento AI per la licenza completa, solo se vi sono note in quel periodo; una sola lettera per settimana. In demo è manuale e usa una richiesta AI. **L’app chiusa non può eseguire un lavoro domenicale sul dispositivo**; non sono presenti cron cloud, email o notifiche push.
- Privacy: export JSON cifrato, ripristino con password del backup, cambio password, cancellazione locale, blocco manuale e automatico.
- Chiaro/scuro/automatico, IT/EN, tastiera, etichette accessibili, tabelle alternative ai grafici, icone PNG/SVG locali.

## AI esclusivamente locale

| Scopo | Motore e modello |
| --- | --- |
| Generazione principale | WebLLM `Llama-3.2-1B-Instruct-q4f16_1-MLC`, WebGPU con shader-f16 |
| Fallback senza WebGPU/f16 | Transformers.js `onnx-community/Qwen2.5-0.5B-Instruct`, quantizzazione q4, CPU/WASM |
| Embedding | Transformers.js `Xenova/all-MiniLM-L6-v2`, q8, CPU/WASM |

WebLLM **richiede WebGPU**: il fallback CPU usa un motore diverso, pur mantenendo il modello Qwen richiesto. Le inferenze sono in un Web Worker, con WASM a un thread: non sono necessari COOP/COEP o SharedArrayBuffer, non configurabili normalmente su Pages.

Il download Llama è nell’ordine di 1 GB; non è una misura esatta e non coincide con la VRAM (il catalogo riporta circa 879 MB per il modello). Il file Qwen q4 è circa 786 MB; embedding e runtime si aggiungono. Sono consigliati almeno 2 GB liberi. L’app non include i pesi nel repository. I runtime WASM sono inclusi nella build, senza CDN a runtime. La barra di download riporta il progresso del file/fase corrente, **non una percentuale aggregata in byte di tutti i download**.

I modelli piccoli possono essere lenti, produrre risposte errate o rifiutare il contesto. MiniLM è principalmente orientato all’inglese e tronca testi oltre la propria lunghezza massima; l’italiano e le note lunghe possono avere recupero meno preciso. Nessun fine-tuning viene svolto: Twin “impara” attraverso memoria RAG e statistiche, non modificando i pesi. Il system prompt richiesto si trova in `src/prompts.js`.

Il supporto effettivo dipende da browser, GPU, memoria e sistema operativo. Non promettere compatibilità universale su iPhone o prestazioni da chatbot cloud. Il pulsante CPU consente di rinunciare alla GPU se il caricamento fallisce. Non ci sono completamenti fittizi: se i modelli non partono, l’app segnala l’errore e il diario continua a funzionare.

## Offline e aggiornamenti

- Primo avvio: servono download dell’app e preparazione esplicita dei modelli in Impostazioni. Il messaggio “App disponibile offline” riguarda **l’interfaccia**, non certifica che tutti i modelli siano già in cache.
- Il service worker viene generato dalla lista completa degli asset e da un hash di contenuto. Le cache dell’interfaccia sono isolate per percorso di deployment. Un aggiornamento aspetta la chiusura di tutte le schede precedenti.
- WebLLM usa IndexedDB; Transformers.js usa Cache Storage. Un download interrotto non viene dichiarato pronto. `navigator.storage.persist()` è una richiesta, non una garanzia.
- Il browser può eliminare cache e diario. Navigazione privata, pressione di memoria, politiche iOS e reinstallazione possono limitare la persistenza. **Verifica un riavvio offline reale sul dispositivo.**
- La dettatura Web Speech è abilitata solo con `processLocally = true` supportato; nessun fallback vocale cloud. I pacchetti linguistici locali vanno installati nelle impostazioni del browser quando necessari.

## Cifratura e dati

L’intero archivio è cifrato con AES-256-GCM, IV casuale a 96 bit per ogni salvataggio, tag di autenticazione e AAD `Twin/v1`. La chiave, non esportabile, è derivata con PBKDF2-SHA-256, salt casuale a 128 bit e 600.000 iterazioni. Chiave e dati decifrati vivono in memoria solo mentre l’app è sbloccata. IndexedDB contiene soltanto l’envelope cifrato e una revisione tecnica. Anche embedding, contatori demo, obiettivi e licenza sono cifrati.

Ogni aggiornamento è atomico in IndexedDB, con confronto della revisione: una seconda scheda non può sovrascrivere silenziosamente modifiche più recenti. La ricerca attiva, le spiegazioni degli schemi e il racconto corrente dei futuri sono viste temporanee; note, conversazioni e lettere sono persistenti ed esportate. Le conversazioni conservano copie dei ricordi e degli obiettivi allora forniti: eliminare una nota non elimina automaticamente le sue citazioni dalle conversazioni già salvate. Per eliminare anche quelle usa “Cancella tutti i dati”.

Il backup include tutti i dati persistenti ma non i pesi dei modelli, il service worker o la password. Il ripristino valida l’envelope, decifra e valida i dati **prima** di sostituire il diario. Il cambio password ricifra con un nuovo salt e un nuovo IV; i vecchi export restano apribili con la vecchia password. Archivio in chiaro massimo: 24 MiB; import massimo: 50 MB, per limitare consumo di memoria e file malformati.

Il blocco manuale termina il worker e rimuove i riferimenti ai contenuti. Il blocco automatico scatta dopo 5 minuti in sottofondo o 10 minuti di inattività in primo piano; timer sospesi dal sistema possono ritardarlo. JavaScript non consente azzeramento forense garantito della memoria. Un dispositivo compromesso, estensioni, tastiera, XSS o aggiornamenti malevoli possono accedere ai contenuti sbloccati. La Content Security Policy restringe script e connessioni, ma non sostituisce una revisione di sicurezza.

La cancellazione rimuove diario e preferenze e tenta di eliminare le cache AI `webllm*`, `tvmjs*` e `transformers-cache` dell’origine. Altre schede possono bloccare alcune eliminazioni: il messaggio invita a chiuderle e cancellare i dati del sito. Le cache AI possono essere condivise con altre installazioni Twin sulla stessa origine. I backup esterni non sono cancellati dall’app. Nessun recupero password o cloud è presente.

## Sblocco commerciale Ed25519

**Il pacchetto pubblico contiene già una chiave pubblica dedicata.** Il kit venditore separato contiene la chiave privata corrispondente: non va mai pubblicato, caricato su GitHub/Shopify come prodotto o inviato ai clienti.

Per emettere un codice personale senza scadenza:

```sh
node scripts/license.mjs issue --key ../twin-seller-keys/twin-private.pem --order ORDINE-1001 --out codice-1001.txt
```

Adatta il percorso alla posizione in cui hai estratto il kit. `--out` non sovrascrive un file esistente. Il codice contiene ID casuale, data di emissione, prodotto, versione e riferimento ordine opzionale; non contiene email o password. La verifica firma `TWIN1.<payload-base64url>` con Web Crypto Ed25519; solo la chiave pubblica viene inclusa nel bundle.

Se vuoi **sostituire** le chiavi prima della prima vendita:

```sh
node scripts/license.mjs keygen --out ../nuove-chiavi-private
npm run build
npm test
```

Il comando crea una chiave privata fuori dal progetto e aggiorna `src/license-public.js`. **Non rigenerare la chiave dopo aver consegnato codici**: i codici precedenti non saranno validi con la nuova build. La chiave privata non è recuperabile dal sito.

Senza codice: massimo 3 note create e 3 generazioni AI riuscite, incluse lettere, racconti e spiegazioni. Cancellare una nota non ripristina la quota. **In un’app totalmente statica il limite è commerciale, non un DRM inviolabile**: azzerare i dati, ripristinare un vecchio backup, modificare il JavaScript o condividere un codice permette di aggirarlo. Non sono possibili verifica dell’acquisto, revoca, attivazione singola o anti-condivisione affidabili senza un servizio online. Non è presente alcuna “chiave segreta” nel client.

## Vendita su Shopify

Questa è una PWA vendibile come **prodotto digitale**, non un’app embedded Shopify né una pubblicazione nell’App Store Shopify. Non servono token Admin, webhook o credenziali Shopify nell’app.

Il flusso a costo infrastrutturale nullo per Twin è: acquisto verificato dal venditore → emissione locale del codice con lo script → consegna al cliente del link Pages e del codice. Configura nel negozio il prodotto digitale da 29 €, i requisiti, il contenuto consegnato, tempi di consegna del codice, imposte, assistenza e condizioni. Il pagamento **non genera automaticamente** un codice con questo progetto: l’automazione di evasione richiederebbe un sistema fidato separato o un servizio di consegna codici. Non mettere la chiave privata in Liquid, JavaScript, GitHub Actions pubblico o file scaricabili.

`CUSTOMER-GUIDE.md` è la guida da consegnare al cliente. `LEGAL-PRIVACY.md` riassume gli aspetti da completare. Le pagine privacy e condizioni sono disponibili nell’app anche prima dello sblocco, ma i dati commerciali del venditore vanno completati prima della vendita.

## Struttura

```text
src/app.js           interfaccia e flussi
src/style.css        design responsive e temi
src/ai-worker.js     inferenza locale ed embedding
src/ai.js            serializzazione e cancellazione del worker
src/crypto.js        PBKDF2 e AES-GCM
src/repository.js    transazioni IndexedDB e revisione
src/store.js         archivio isolato per percorso
src/domain.js        statistiche, RAG e scenari
src/prompts.js       prompt richiesto e contesto
src/license.js       verifica offline Ed25519
src/license-public.js chiave pubblica del venditore
public/             manifest, icone, pagine legali e licenze
scripts/license.mjs  utility Node del venditore
scripts/sw-template.js service worker generato alla build
tests/               test Node
.github/workflows/pages.yml deploy automatico
```

## Verifiche e limiti di consegna

Consulta `VERIFICATION.md` per i controlli effettivamente eseguiti. `TEST-CHECKLIST.md` è la lista dei test da eseguire su iPhone, Android e desktop: non è una dichiarazione che siano già stati eseguiti su quei dispositivi.

Non sono inclusi: server, cloud AI, notifiche a orario con app chiusa, sincronizzazione multi-dispositivo, verifica automatica ordini Shopify, promessa di consulenza professionale, certificazione legale o di sicurezza.

Licenze e fonti: `public/licenses/` e `LEGAL-PRIVACY.md`. Il codice applicativo non viene offerto con una licenza open source automatica: il venditore deve definire le condizioni di distribuzione che preferisce, rispettando le licenze dei componenti.
