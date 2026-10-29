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

## Session lock update — 1.0.5

Reproduced a foreground session defect with a simulated 11-minute AI startup: the first idle check after completion locked the vault immediately because it still counted time before the operation. The same occurred after a long failed startup. Both regression tests failed before the fix and passed after resetting the idle clock when the operation ends. A screen wake lock, when supported, now covers generation as well as startup and is released on success or failure. The 10-minute idle lock and 5-minute background lock remain enabled; background expiry is also checked when returning to a browser that suspended timers.

The unlock page now explains an automatic idle/background lock. Per-tab diagnostics contain only the AI action name, start time and counter; no password, key, question or diary content is stored. A reopened page can report that the previous AI task was interrupted without claiming its cause. These diagnostics cannot identify a physical-device memory failure, and do not restore an unlocked session after a page reload.

Production build and all 55 automatic tests passed. No physical iPhone was tested. The screenshot confirms Twin’s unlock screen, but does not prove that this timer defect caused that specific occurrence.

## Local AI memory update — 1.0.5

iPhone/iPad now default to HuggingFaceTB/SmolLM2-360M-Instruct q8 (364,564,671-byte model), with compact prompts, at most three retrieved memories per question and repetition controls. CPU sessions disable memory arena/pattern optimizations and use basic graph optimization. Full Qwen remains explicitly selectable in Settings. Existing Qwen model files, MiniLM embeddings, journal data and license keys are preserved. The recovery page checks and downloads the selected model. The smaller model has limited reasoning ability and is primarily English-oriented.

Measured the actual built worker with ONNX Runtime WebAssembly in an isolated Node VM, disk-backed public model responses and fictional prompts. This was not Safari or a physical iPhone. The original Qwen startup reached about 2,341 MB host process RSS. With reduced-memory session options, Qwen startup reached about 2,204 MB and generation reached about 2,388 MB. SmolLM2 360M q8 startup reached about 1,504 MB and generation about 1,262 MB. These figures are process RSS from this test environment, not an iPhone memory limit or a guarantee of device compatibility. The 135M candidate was rejected after it invented numerical details in a sample answer. The 360M q4 candidate used more memory (about 2,033 MB at startup), so q8 was selected.

The selected model completed real local generation, but these checks do not establish broad answer quality. No notes, passwords or user content were transmitted for testing. Model identity and file sizes were checked against Hugging Face; its model card specifies Apache-2.0. Attribution and terms/privacy descriptions are updated. Production build and 55 automatic tests passed. Physical-device verification remains required.

## Code-only access and voice - 2.0.0

Supersedes the 1.x password/demo/automatic-authentication-lock descriptions above. A valid signed code is required before profile creation and retained alongside a non-extractable local CryptoKey. Boot automatically decrypts on the same browser; there is no daily journal password. A v1 vault migrates atomically after one old-password decryption, retaining its original encrypted envelope. New backup encryption uses the exact activation code; exported recordings are included. Physical unlocked-device access is intentionally sufficient to read the journal.

MediaRecorder recording, local playback, optional Whisper tiny multilingual q8 transcription, reviewed text editing and atomic encrypted audio persistence are implemented. Recording stops on background; main/speech AI workers run separately to reduce memory. Limits: 180 seconds, 4 MiB per recording, 20 MiB total encrypted attachments. The optional speech model is separate from the main eight-file readiness check.

Production build and 70 automated tests passed during implementation, including real Web Crypto, structured-cloned non-extractable keys in fake IndexedDB, migration, restore with new device keys, wrong codes, note/audio authentication binding, rollback on quota/conflict, missing-key protection, microphone lifecycle and jsdom app forms from activation through saved transcript. A final build/test result is recorded in the release commit. jsdom does not test actual rendering, codecs or microphone hardware.

The actual production speech-worker bundle ran ONNX Runtime WebAssembly in an isolated Node VM with public model files and the public Transformers.js JFK example (11 seconds). It produced the expected recognizable transcription in about 3.24 seconds with about 338 MB peak host-process RSS in this environment. This is not a Safari benchmark, iPhone memory guarantee or a broad speech-accuracy evaluation; no user's audio was used. Public model weights measured 40,852,675 bytes plus tokenizer/config support files.

Remaining: physical iPhone/Android microphone permission, recording/decoding, long-clip inference, storage persistence, installed-PWA isolation and complete offline restart. No Shopify product has been published by this change. Customer guide contains no private or shared activation code.
