# Twin 2.0 - physical-device release checks

Use fictional data. Record device, OS/browser, date, free storage, timings and outcome. Automatic tests and a Linux WASM run do not replace Safari/microphone/offline tests.

- [ ] HTTPS `/apps/twin/`, no missing assets or CSP errors; 320-430 px, zoom, rotation, keyboard and screen reader controls remain usable.
- [ ] iPhone Safari and Home Screen app: choose one consistent storage instance. Activate with a valid issued code, create profile, close/reopen: no password/code prompt; invalid code rejected. Confirm phone screen lock is the privacy boundary.
- [ ] Upgrade a fictional 1.x diary: export original, wrong old password preserves data, correct old password converts once, code retained, subsequent opens automatic. A legacy backup still requires its own password.
- [ ] Save text-only, audio-only and text-plus-audio entries. Recording permission allow/deny, supported codec, stop, cancel, 3-minute auto-stop, 4 MiB limit, background stop and microphone indicator release.
- [ ] Preview is not saved until Save this memory; close/reload loses only unsaved drafts. Saved playback works after reopening; edit transcript and delete note/audio together.
- [ ] First transcription downloads public Whisper files; interrupted setup resumes. English, Italian and auto language, quiet/noisy clips, silence and 3-minute clip. Review text before saving. No audio or transcript in outgoing requests.
- [ ] Main AI stops before speech worker, speech worker stops on success/cancel/error. Repeat transcription/Ask Twin on actual iPhone; measure stability and time.
- [ ] Lightweight SmolLM2 startup, note indexing, answer with up to 3 references. Test full Qwen only if RAM permits; desktop GPU separately. Existing model files retained, interrupted public downloads resume.
- [ ] No outgoing request contains journal, question, audio, activation or backup. Only public asset/model downloads are expected from the app.
- [ ] Multiple entries/day: expenses sum, mood/sleep average. Seven distinct dates enable scenarios; missing days unknown. Correlation requires variable samples. Scenario numbers match formula/table at 0%, 20% and 80% reduction.
- [ ] Source snapshots and goal snapshots visible; no invented source details accepted as facts. Voice-only untranscribed content is not interpreted. Letters only use textual notes in latest Sunday period, no duplicate period or work while closed.
- [ ] Export includes all saved audio; restore in spare browser with the exact code recovers text, settings data, chats, letters and recordings. Wrong code, modified ciphertext, malformed audio metadata or missing attachment preserve the destination.
- [ ] Two tabs: stale writer receives conflict. Refresh safely; ensure draft not assumed saved. Quota failure rolls back audio and note together. Test near 20 MiB audio limit with fictional data.
- [ ] Missing local key gives recover-from-backup error; entering a code must not overwrite existing encrypted journal.
- [ ] Complete offline restart after app/main/speech setup: saved journal, playback, Ask Twin and transcription all work without network. Main eight-file check does not count optional speech files. Badge describes shell only.
- [ ] Apply Update Twin while old tab exists, reopen and verify data/activation/model preservation. Low storage/private mode errors are clear; do not clear real data to test.
- [ ] Full erasure removes local key, activation, journal, recovery copy and audio; other tabs/cache cleanup handled. External backups remain separate.
- [ ] Test at least iPhone Safari/PWA, Android Chrome/PWA and desktop Chrome/Edge before claiming those devices compatible. Verify final seller contacts, order delivery and commercial terms before Shopify publication.
