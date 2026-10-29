# Twin

A private, mobile-first PWA with **English as its default language** and Italian selectable in the interface. One static build; no application server, remote database, user accounts or paid AI API. AI and embeddings run on the user’s device. **Built with Llama.**

[Detailed Italian technical documentation](README.it.md) · [Customer guide](CUSTOMER-GUIDE.md) · [Device test checklist](TEST-CHECKLIST.md)

## Try it on Windows

Requires Node.js 22.12+ and npm. Extract the project, open the `twin` folder containing `package.json`, enter `cmd` in the File Explorer address bar and run:

```sh
npm ci --ignore-scripts
npm run preview
```

Open the localhost URL printed in the terminal, normally `http://localhost:4173`, in Chrome or Edge. Keep the terminal open. A compiled `dist/` is included in the delivered archive. Opening `index.html` directly or using ordinary HTTP on a LAN address does not provide the secure context required by the app.

Create your vault, record a fictional entry, then use **Settings → Prepare Twin on this device**. After downloads complete, ask Twin a question. Test locking, password entry, encrypted backup and an offline reload. The demo permits 3 notes and 3 total AI requests; a full unlock and at least 7 recorded days are needed to test the 12-month scenarios.

## Development and checks

```sh
npm ci --ignore-scripts
npm run dev
npm run build
npm test
npm run preview
```

Use `dev` for source changes; the service worker runs only in the production build served by `preview` or a static HTTPS host. `.npmrc` skips native ONNX/CUDA install scripts, which the browser build does not need. `package-lock.json` pins dependencies. The `sharp` override updates an unused native dependency.

## Publish on GitHub Pages

**Commercial use:** technical compatibility does not establish permission to use the hosting service. GitHub limits Pages use for online business and commercial SaaS. Review [GitHub’s Pages terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#pages) before hosting paid Twin there. The same `dist/` works on another static HTTPS host. See `LEGAL-PRIVACY.md` for the release considerations.

1. Create a repository, for example `twin`, and place this project’s contents at its root. Include `.github`, `.npmrc` and `.gitignore`. **Never upload the separate seller private-key kit.**
2. Use the `main` branch. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main` or run “Deploy Twin to GitHub Pages”. The workflow installs dependencies, builds, tests and publishes `dist/`.
4. Enable HTTPS where available. Open the resulting URL and run the real-device checklist before selling.

The build uses relative paths for project subdirectories such as `/twin/`. Manifest, icons, workers and service worker registration do not require a 404 fallback. `dist/.nojekyll` is included. Alternatively, configure Pages to publish the contents of `dist/` from a branch. Free-plan, bandwidth and repository restrictions still apply. Shopify, domains and payment fees are separate from local AI and static hosting.

## Features

- Password onboarding, name, three goals and monthly budget.
- Daily journal: free text, explicit expenses, mood 1–5, sleep hours and local-only dictation when supported. Multiple entries on one day sum expenses and average mood/sleep.
- Encrypted memories and normalized 384-dimensional MiniLM embeddings. Semantic retrieval supplies up to five relevant memories to each question. Entries saved before model setup remain encrypted and visibly await indexing.
- Ask Twin: grounded in supplied goals, budget, calculated statistics and retrieved memories. The UI shows the supplied memory and goal snapshots.
- Patterns: recorded-day means, mood series, weekday spending and Pearson sleep/spending correlation, requiring at least seven variable daily samples. Missing days are unknown, not zero. No causal claim or significance test.
- Two futures: cumulative spending over 12 months under a user-selected uniform reduction. Visible formula and accessible table. At least seven recorded days are required. No income, interest, inflation or recognized expense category is invented.
- Weekly letters: one per latest completed Sunday period, when the full app opens/loads AI and entries exist for that week. Demo generation is manual and consumes an AI request. A closed app cannot run a scheduled Sunday job.
- Encrypted export/restore, password changes, deletion, manual/automatic locking, light/dark/system themes and EN/IT controls.

## Local models and offline behavior

| Purpose | Engine/model |
| --- | --- |
| Main generation | WebLLM `Llama-3.2-1B-Instruct-q4f16_1-MLC`, WebGPU with shader-f16 |
| CPU fallback | Transformers.js `onnx-community/Qwen2.5-0.5B-Instruct`, q4, CPU/WASM |
| Embeddings | Transformers.js `Xenova/all-MiniLM-L6-v2`, q8, CPU/WASM |

WebLLM requires WebGPU; the CPU fallback uses a different engine. Inference runs in a Web Worker with one WASM thread, requiring no COOP/COEP headers. The initial Llama download is around 1 GB, not an exact size; Qwen’s q4 file is around 786 MB, plus embeddings and runtime files. Keep at least 2 GB free. Weights are downloaded separately and are not included in the project. Progress is per current file/phase, not aggregate bytes across every download.

The service worker precaches interface files, workers, icons, legal pages and local WASM. WebLLM caches in IndexedDB and Transformers.js in Cache Storage. “App available offline” describes the interface, not proof that all models are cached. New app versions activate after older tabs close. Browser eviction, private browsing and memory pressure may remove cached models or the journal; persistence requests are not guarantees. Verify a complete offline restart on each real device.

Small models may be slow, inaccurate or unable to handle context. MiniLM is primarily English-oriented and truncates long inputs; Italian retrieval may be less accurate. Twin learns through retrieved memory and statistics, not weight fine-tuning. The supplied system prompt is preserved in `src/prompts.js`; the active language explicitly instructs the model to answer in English or Italian. A saved language selection is retained; fresh installs default to English regardless of browser language.

Dictation requires browser-enforced `processLocally=true`; there is no remote speech fallback. Install a local language pack through the browser if necessary.

## Encryption and storage

AES-256-GCM encrypts the complete vault with a fresh 96-bit IV per write and authenticated context `Twin/v1`. PBKDF2-SHA-256 derives a non-exportable key using a random 128-bit salt and 600,000 iterations. Profile, notes, embeddings, chats, letters, demo counters and license are encrypted. Only language/theme/loading preferences are stored outside the vault.

IndexedDB writes are atomic and revision-checked to prevent silent overwrites by another tab. Decrypted content and key references stay in memory only while unlocked. Locking terminates the AI worker. Automatic locking follows five minutes in the background or ten idle foreground minutes; OS timer suspension may delay it. JavaScript cannot guarantee forensic memory erasure. Compromised devices, extensions, keyboards or code can access unlocked content.

Exports include persistent data, not model weights or the password. Restore validates and decrypts before replacing local data. Password changes use a new salt/IV; old backups still need their old password. Plaintext vault limit: 24 MiB. Import limit: 50 MB. Current semantic search, pattern explanations and future narratives are temporary views. Chats retain copies of supplied goals and memories; deleting a note does not remove its existing chat citations. Use full deletion to remove those too.

Deletion removes the local journal, license and preferences and attempts to remove AI caches on the origin. Other tabs can block cleanup. Exported backups must be deleted separately. There is no password or cloud recovery. Hosting/model servers see ordinary public asset download metadata, including IP addresses; this app does not send them diary contents or questions.

## Ed25519 unlock codes

The project already includes a dedicated public key. The separate seller kit contains the matching private key. Keep it outside the project and never publish it or deliver it to customers.

```sh
node scripts/license.mjs issue --key ../twin-seller-keys/twin-private.pem --order ORDER-1001 --out code-1001.txt
```

Adapt the path to your extracted kit. The code has no expiry and includes product, version, random ID, issue date and optional order reference. It contains no email or password. The utility does not check payment: the seller must verify the order. `--out` refuses to overwrite an existing file.

To replace the key pair **before issuing any customer codes**:

```sh
node scripts/license.mjs keygen --out ../new-private-keys
npm run build
npm test
```

This updates `src/license-public.js`. Do not replace the key after issuing codes: the previous codes would stop verifying against the new public key.

The demo has 3 created notes and 3 successful total AI generations, including explanations, stories and letters. Deleting a note does not restore its quota. A static offline app cannot provide tamperproof DRM, single-device activation, revocation or anti-sharing: resetting storage, restoring old backups, modifying JavaScript or sharing a valid code can bypass commercial limits. The client contains no private signing key.

## Shopify delivery and release

Twin is a downloadable/local web product, not an embedded Shopify app or Shopify App Store submission. No Shopify tokens are required. The zero-backend workflow is: seller verifies payment → issues code locally → delivers the app link and code. Automatic order fulfillment is not implemented and would require a separate trusted delivery system. Do not put the private key in Liquid, client JavaScript, public Actions logs or downloadable products.

Before sale, complete seller details, final price/taxes, requirements, delivery times, license terms, support, updates, privacy notices and consumer rights. English legal pages are linked from the default interface; Italian versions remain available. `LEGAL-PRIVACY.md` records matters requiring review; these pages are not legal certification.

`VERIFICATION.md` records completed checks and limitations. `TEST-CHECKLIST.md` covers iPhone, Android and desktop tests that must still be run on actual compatible devices. Browser end-to-end encryption, model inference and offline restarts were not verified in the HTTP-only build preview.

## Project layout

Application modules live in `src/`; PWA files, icons and legal pages in `public/`; the license utility and service worker template in `scripts/`; Node tests in `tests/`; deployment in `.github/workflows/pages.yml`. The Italian technical README provides a full module-by-module map.

Third-party licenses are in `public/licenses/`. No automatic open-source license is granted for the application’s own code; the seller must choose their distribution terms while respecting component licenses.
