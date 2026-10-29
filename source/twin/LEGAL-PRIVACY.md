# Prima della vendita: privacy, licenze e condizioni

Verifica documentale del 29 ottobre 2026. Questo file distingue ciò che è già implementato da ciò che dipende dal venditore e da una valutazione giuridica del servizio concreto. Non attesta una certificazione di conformità.

## Attenzione all’hosting GitHub Pages

La build è **tecnicamente compatibile** con GitHub Pages. Tuttavia i termini di GitHub vietano di usare Pages come hosting gratuito per attività online, siti ecommerce o siti principalmente rivolti a transazioni commerciali o SaaS commerciale. Vendere su Shopify non dimostra automaticamente che l’app ospitata su Pages sia ammessa. Twin è software locale, non un servizio AI remoto, ma la sua qualificazione rispetto ai termini del provider va chiarita prima di usarlo come servizio commerciale. Richiedere chiarimento a GitHub o scegliere un hosting statico le cui condizioni ammettano esplicitamente l’uso previsto. Il medesimo `dist/` funziona su un normale hosting statico HTTPS.

Fonte: [GitHub Terms — Pages](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#pages).

## Privacy: cosa è implementato

- Il diario e gli embedding non vengono inviati al venditore, a Shopify o a un’API AI.
- L’archivio è cifrato a riposo; la chiave viene derivata dalla password e non è recuperabile.
- Nessuna pubblicità, analytics applicativa, caricamento font remoto o cookie applicativo.
- Dettatura limitata al riconoscimento locale obbligatorio.
- Esportazione, importazione, cambio password e cancellazione sono disponibili nell’app.
- Informazioni tecniche accessibili da onboarding e footer, in IT/EN.

Questo riduce la raccolta, **non significa che il GDPR non si applichi**. Per esempio, acquisti, assistenza, fatturazione e log tecnici comportano trattamenti separati. I ruoli privacy dipendono da chi determina finalità e mezzi, non soltanto da dove risiedono i dati. L’uso locale personale da parte del cliente e il trattamento commerciale del venditore vanno analizzati separatamente.

Il venditore deve completare identità e contatto privacy; individuare trattamenti, basi giuridiche, tempi di conservazione, destinatari e trasferimenti; verificare i rapporti con Shopify, hosting e fornitori; chiarire diritti e canali di esercizio. Note su umore e sonno possono rivelare informazioni sulla salute: non raccoglierle per assistenza e valutare le regole sulle categorie particolari qualora il modello di servizio comporti un trattamento attribuibile al venditore. Prima di rivolgersi a minori occorre valutare specificamente pubblico, età, tutele e base giuridica.

Le richieste iniziali a hosting e repository dei modelli espongono IP e metadati HTTP. La frase corretta per la vendita è “note e domande elaborate sul dispositivo”, non “nessuna connessione o dato tecnico lascia mai il dispositivo”.

Fonti: [EDPB — titolare e responsabile](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en), [linee guida EDPB 07/2020](https://www.edpb.europa.eu/documents/guideline/guidelines-072020-on-the-concepts-of-controller-and-processor-in-the-gdpr_en).

## Storage e consenso

IndexedDB e cache non diventano automaticamente esenti dalle regole perché non sono cookie. Le finalità e la necessità tecnica contano. Il progetto usa memoria per rendere la funzione locale richiesta dall’utente e non include strumenti pubblicitari; l’informativa lo descrive. Un banner di consenso non va aggiunto per riflesso né omesso se in futuro entrano analytics, pixel o strumenti non necessari. Gli strumenti del negozio Shopify vanno verificati separatamente.

Fonte: [Garante — linee guida cookie e altri strumenti di tracciamento](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876).

## Trasparenza AI e promesse al cliente

L’app dichiara che Twin è AI locale, non una persona. Risposte e lettere hanno un’etichetta visibile e attributi HTML `data-ai-generated`/`data-generator`; nei record di chat e lettere è presente `aiGenerated: true`. Queste misure documentano l’origine nell’interfaccia e nei dati. **Non sono una prova che tutti i requisiti di marcatura e rilevabilità dell’articolo 50 siano soddisfatti**: una marcatura HTML eliminabile non va pubblicizzata come soluzione certificata o interoperabile. Va valutata l’applicabilità e l’adeguatezza della soluzione tecnica prima dell’immissione sul mercato.

La Commissione indica il 2 agosto 2026 come data di applicazione dell’articolo 50. Non presentare Twin come psicologo, medico, consulente finanziario, decisore per lavoro/credito o sistema che “sa cosa è meglio” con certezza. Il tono in prima persona plurale è uno stile conversazionale; non dimostra coscienza o identità dell’utente. Non vengono dedotte emozioni biometriche: umore e sonno sono inseriti dall’utente.

Fonti: [Commissione — FAQ articolo 50](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act), [testo articolo 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50).

## Licenze dei modelli

Llama 3.2 usa una licenza personalizzata che consente usi commerciali alle proprie condizioni. Sono inclusi attribuzione “Built with Llama”, notice, testo della licenza e Acceptable Use Policy. Il modello scelto è **testuale 1B**: non confondere le restrizioni relative ai modelli multimodali con questo modello. Rispettare gli usi consentiti, i diritti sui dati e le limitazioni professionali; il solo system prompt non garantisce che un modello piccolo non generi mai contenuti vietati.

Qwen2.5-0.5B-Instruct e Xenova/all-MiniLM-L6-v2 indicano Apache-2.0. Le dipendenze hanno proprie licenze; `public/licenses/THIRD-PARTY.txt` raccoglie gli avvisi disponibili dei pacchetti installati. Se cambiano modelli, pesi o dipendenze, ripetere la verifica e aggiornare le attribuzioni.

Fonti: [licenza Meta](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE), [Acceptable Use Policy](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/USE_POLICY.md), [Qwen](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct), [MiniLM](https://huggingface.co/Xenova/all-MiniLM-L6-v2).

## Vendita digitale e recesso

Il negozio deve fornire prima dell’acquisto: venditore effettivo e contatti, caratteristiche del contenuto, prezzo finale e imposte, requisiti tecnici, interoperabilità, modalità/tempi di consegna del codice, supporto, aggiornamenti e durata/dispositivi della licenza. “29 € una tantum” non definisce da solo la durata di supporto o gli aggiornamenti dovuti.

Per il consumatore UE non basta scrivere “prodotto digitale, nessun rimborso”. L’eccezione al recesso per contenuto digitale richiede le condizioni applicabili, fra cui consenso espresso preventivo all’avvio, riconoscimento della perdita del diritto e conferma contrattuale prevista. Restano i diritti inderogabili di conformità e i rimedi; non usare clausole che li escludano genericamente. Questo progetto non modifica checkout o condizioni Shopify e non registra tali consensi d’acquisto.

Fonti: [Your Europe — diritti dei consumatori](https://europa.eu/youreurope/citizens/consumers/shopping/shopping-consumer-rights/index_en.htm), [direttiva 2011/83/UE consolidata](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02011L0083-20260927).

## Da completare prima di commercializzare

1. Dati e condizioni del venditore nelle pagine dell’app e nel negozio, coerenti con il soggetto che incassa/fattura.
2. Ammissibilità dell’hosting commerciale, pubblico destinatario, valutazione privacy e trasparenza AI.
3. Prove reali dei modelli e dell’offline su dispositivi dichiarati compatibili.
4. Processo di consegna codici, supporto, aggiornamenti, recesso e gestione delle segnalazioni.
5. Verifica del nome “Twin” rispetto a marchi/prodotti esistenti e condizioni scelte per il proprio codice.

Il pacchetto è un prodotto software implementato e compilabile; non è una dichiarazione che sia già legalmente pronto alla vendita in ogni paese.
