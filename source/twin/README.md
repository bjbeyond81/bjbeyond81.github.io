# Twin 2.0

A local journal and reflection PWA. English is the default interface; Italian is selectable. This version uses one signed activation code, remembers access on the chosen browser and supports encrypted voice notes with optional on-device transcription. No application server, customer account, cloud journal or paid AI API is used. Built with Llama.

## Develop and verify

Node.js 22.12+ is required.

```sh
npm ci --ignore-scripts
npm run dev
npm run build
npm test
npm run preview
```

Use HTTPS or localhost. Opening HTML files directly or using ordinary HTTP on a LAN does not meet the secure-context requirements. The production service worker is enabled in the built preview and HTTPS deployment. Dependencies are pinned; browser inference does not need native ONNX/CUDA install scripts. Tests using built assets require `npm run build` first.

The parent repository publishes `source/twin` through `.github/workflows/publish-twin.yml`: build, tests, copy `dist/` to `apps/twin`, then GitHub Pages. Do not commit generated model weights, the seller private key, owner/customer activation codes or private test data. Check hosting terms and complete seller information before commercial distribution; see LEGAL-PRIVACY.md.

## Access and migration

A new customer pastes a valid `TWIN1.…` code before creating a profile. Ed25519 verification is offline. Activation and a random, non-extractable AES-256-GCM CryptoKey are saved together in IndexedDB. The next visit automatically opens the journal using that stored key. No journal password or inactivity authentication lock remains. After five background minutes, AI workers are stopped to release memory; recording stops when the app is hidden.

This is device-convenience access: someone able to use the unlocked browser can read the journal. Encryption with a co-located key is not a separate screen lock. Use the device screen lock and a personal browser profile. Activation is per browser storage, not an account or cross-device sync.

A v1 password-encrypted journal is detected and preserved. Its old password is required once to decrypt and atomically convert the data; an existing valid code is retained, otherwise a code is required. The original encrypted envelope is kept locally as a recovery copy until full erasure. Old exported backups still require their old password. The code cannot replace the cryptographic secret of a v1 backup.

New backups use `twin-code-backup-v2`: PBKDF2-SHA256, 600,000 iterations, a random salt and AES-256-GCM, with the normalized activation code as the secret. They include profile, text, embeddings, chats, letters and all saved voice audio. Restore validates/decrypts before atomically replacing data and re-encrypts with a new local device key. Keep code and backup separately; anyone with both can restore the journal. Backups exclude public models and unsaved drafts.

## Features

- Profile with name, three goals and a monthly EUR spending budget.
- Entries with text, date, explicit expenses, mood 1-5 and sleep hours. Multiple entries on one day sum spending and average mood/sleep. Missing days are unknown.
- Voice recording, preview and saved playback; optional local transcription and reviewed text editing.
- Semantic memory using 384-dimensional MiniLM embeddings; up to three retrieved entries in lightweight mode, five in other modes. Untranscribed audio is not interpreted by the text AI.
- Ask Twin, with visible supplied memories and goal snapshots. Small models can invent facts and sources.
- Descriptive patterns and sleep/spending correlation with at least seven variable daily samples. Correlation does not establish a cause.
- Two cumulative-spending scenarios after at least seven recorded dates. Formula: recorded-day mean × 365.2425 / 12 × months, with a uniform percentage reduction for the second line. No forecast, income, interest or inflation is inferred.
- Weekly letters for the latest Sunday period, generated when AI preparation runs or the user requests one. Only up to five recent textual entries from that week are supplied; a closed app cannot schedule work.
- Encrypted backup/restore, permanent local deletion, language and appearance settings.

## Voice notes

MediaRecorder captures audio only after microphone permission. Safari-compatible MP4/AAC is preferred when supported; other browsers may use WebM/Opus. Limits are 180 seconds, 4 MiB per clip and 20 MiB total encrypted recording storage. Stopping creates an in-memory draft. The user must press **Save this memory** to persist it. Audio-only notes are allowed; their numeric fields still contribute to patterns.

Transcription uses multilingual `Xenova/whisper-tiny` q8 on CPU/WASM. First use downloads about 41 MB of weights plus tokenizer/config files. Recordings never go to a remote recognition API. Audio is decoded to mono 16 kHz and processed in overlapping 20-second chunks. Main text AI is terminated before speech processing; the speech worker is terminated after completion/cancellation. Review and save the transcript. Untranscribed voice-only entries have no semantic embedding and are excluded from letter text.

Speech files reuse resumable OPFS downloads and remain separate from the eight-file main-model readiness count. The speech model is requested only on first transcription; simply recording does not download it. Recording drafts and decrypted playback URLs remain temporary; saved audio blobs are AES-GCM encrypted with note/audio identifiers bound as authenticated data. Deleting a note removes its recording in the same transaction.

## Models and offline use

| Purpose | Model / engine | Main weight download |
| --- | --- | --- |
| iPhone/iPad default | SmolLM2 360M q8, WASM | about 365 MB |
| Full CPU | Qwen2.5 0.5B q8, WASM | about 512 MB |
| Compatible GPU | Llama 3.2 1B, WebLLM, shader-f16 | about 1 GB total model |
| Semantic memory | all-MiniLM-L6-v2 q8 | about 24 MB |
| Optional transcription | Whisper tiny multilingual q8, WASM | about 41 MB plus support files |

Download sizes are not RAM requirements. Keep at least 1 GB free for lightweight mode and more for full models, retained downloads, updates and backups. iPhone selection uses compact prompts and simpler, primarily English-oriented answers. Full mode may exceed a phone's available memory. MiniLM is primarily English-oriented; Italian retrieval may be weaker. Twin learns through retrieval and calculated statistics, not training model weights.

The service worker caches interface files, workers, legal pages and local WASM. Models use OPFS, Cache Storage or engine IndexedDB. Files already present are reused; partial model files can resume when supported by the server. **Check app & AI files** can update the app and finish the main AI download without opening the journal. The speech model is prepared from its transcription control. Saved models still need loading into RAM each session.

Use a normal personal browser, not private mode. Storage can be evicted; persistence requests do not guarantee retention. Test a complete offline restart with a saved note and saved voice transcription model on each intended device. An “App available offline” badge only describes interface caching.

## Storage and limits

IndexedDB schema 2 has `vault`, `meta` and `audio` stores. Writes check revisions and commit journal, attachments and device metadata atomically. Conflicting tabs receive an error instead of silently overwriting. The old database name is retained to support upgrades. The journal plaintext limit is 24 MiB, each note text is at most 6,000 characters, and an import file is limited to 120 MB. Audio backups grow through base64/encryption. Model downloads are not part of these journal quotas.

Theme, language and AI-mode preferences are outside the encrypted vault. The activation code and non-exportable CryptoKey are stored in local IndexedDB metadata to allow automatic opening; the seller signing key never enters the browser. JavaScript cannot guarantee forensic memory erasure. Extensions, compromised code or an unlocked device can access content. There is no cloud recovery. Clearing site data without a backup loses the journal even if a code can be reissued.

Deletion removes journal, activation, local key, legacy recovery and audio, then attempts model-cache cleanup. Other tabs can block cleanup; exported files must be deleted separately. Chat citations are snapshots: deleting a note does not remove old quoted text from existing chats. Full erasure removes those too.

## Seller codes and Shopify delivery

Keep the existing `src/license-public.js`; replacing it invalidates issued codes. The separate seller kit holds its matching private key. Issue a distinct code after verifying each order:

```sh
node scripts/license.mjs issue --key ../twin-seller-keys/twin-private.pem --order ORDER-1001 --out code-1001.txt
```

This local utility does not check payments. Codes have no expiry and no email/password. Because codes also protect backups, do not publish a universal owner/customer code in the public PDF, app or Shopify product description. A static offline verifier cannot enforce device counts, revocation or robust anti-sharing.

Shopify delivery is separate: supply the app URL, customer guide and that buyer's code. Automatic fulfillment, Shopify changes and publication are not implemented by this release. Complete actual commercial terms and seller contacts separately; this source does not certify a store's readiness for sale.

See CUSTOMER-GUIDE.md for usage, VERIFICATION.md for completed tests and TEST-CHECKLIST.md for physical-device checks. Third-party notices are generated during build; model licenses remain in `public/licenses/`.
