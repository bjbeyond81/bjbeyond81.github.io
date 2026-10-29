# Controlli eseguiti

Data: 29 ottobre 2026. Ambiente: Linux, Node 24.22.1, npm 11.9.0. Build Vite 8.3.5.

- `npm run build`: superato, output statico in `dist/`.
- `npm test`: **16 test superati, 0 falliti**.
- `npm audit`: **0 vulnerabilità segnalate** nell’albero fissato al momento della verifica. Non equivale a un audit di sicurezza del prodotto o a garanzia sulle vulnerabilità future.
- Coppia Ed25519 effettiva del venditore: codice generato dall’utility Node e verificato con la chiave pubblica inclusa nell’app. Chiave privata assente dal progetto pubblico e dalla build.
- Controlli automatici: cifratura/decifratura, password errata, manomissione, validazione backup e dati, quote demo, aggregazione giornaliera, giorni mancanti, Pearson, scenari, RAG, settimana locale, firme/codici alterati, prompt, comportamento del service worker con rete assente, isolamento delle cache per percorso, icone e manifest, transazioni IndexedDB e conflitti fra schede.
- Test IndexedDB eseguiti con `fake-indexeddb`; test del service worker eseguiti in VM con API Cache simulate. Questi test verificano la logica, non la persistenza di un browser reale.
- Anteprima desktop aperta e layout di onboarding ispezionato visivamente. L’URL fornito dall’ambiente è HTTP su `terminal.local`: non è un secure context. L’app segnala correttamente la necessità di HTTPS/localhost. Non sono state disabilitate queste protezioni per simulare il funzionamento.

## Non verificato su hardware reale

Non sono stati completati nell’anteprima HTTP: onboarding cifrato end-to-end nel browser, caricamento dei pesi, inferenza WebGPU/CPU, prestazioni e memoria, persistenza dei modelli dopo riavvio offline, installazione PWA e dettatura locale. Nessun iPhone o Android fisico è stato testato in questa sessione.

Usare `TEST-CHECKLIST.md` su HTTPS/localhost e sui dispositivi reali prima di dichiarare compatibilità e iniziare la vendita. Le pagine legali sono una base tecnica da completare, non una certificazione normativa.

## English default update

English is now the fresh-install default regardless of browser language. Saved language selections are retained. The HTML title/description, PWA manifest, customer guide, primary README and complete primary legal pages are in English. Italian remains selectable, with separate Italian legal pages. The updated build and all 16 existing tests passed; static checks confirm English defaults and precached legal language variants.

## iPhone compatibility update - 1.0.1

The original deployed version was exercised on a desktop browser with fictional data: vault creation, encrypted entry saving, local model loading, indexing and a grounded Qwen response succeeded. This is not an iPhone hardware test. The compatibility update uses Transformers.js 4.3.2, CPU-only non-Asyncify ONNX WASM, Qwen q8, sequential shell caching, a timed GPU probe and explicit model loading after unlock on iOS. Three additional device-selection/timeout checks bring the automatic suite to 19 tests. Real Safari/iPhone model inference remains unverified until tested on the affected device.

## Resumable model download update — 1.0.4

Model setup now streams missing public files to OPFS in a worker, before initializing ONNX sessions. The recovery page can finish the download without opening the vault or starting AI. HTTP Range requests resume partial files, persisted byte counts are shown, and only completed files with matching recorded sizes are visible to inference. Existing Cache Storage and legacy OPFS models remain readable. The app update does not clear the vault or models.

Local production build and 45 automatic tests passed, including real temporary-file tests for interrupted downloads, range resumption, changed remote versions, servers ignoring Range, incomplete responses, multi-range streaming and quota failures. The public Qwen endpoint returned HTTP 206 for a byte-range request and reported a total size of 512,096,557 bytes. No physical iPhone was tested; completion and inference on the affected Safari installation still require device verification.
