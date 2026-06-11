# Giorgio Stats — Istruzioni di installazione e uso

App per le statistiche partita di Giorgio. Funziona offline, si installa come app nativa, salva tutto sul telefono.

---

## 1. Pubblicazione su GitHub (una volta sola)

1. Crea un account su **github.com** (se non lo hai già).
2. In alto a destra: **+** → **New repository**.
   - Repository name: `giorgio-stats`
   - Visibilità: **Public** (necessario per GitHub Pages gratuito)
   - **Create repository**
3. Nella pagina del repository: **uploading an existing file** (oppure **Add file → Upload files**).
4. Trascina **tutti i file e la cartella `icons`** di questo pacchetto:
   - `index.html`, `styles.css`, `core.js`, `app.js`, `sw.js`, `manifest.webmanifest`
   - la cartella `icons/` con le 4 icone
   - (la cartella `test/` è facoltativa: serve solo a rieseguire i test, non viene caricata dall'app)
5. **Commit changes**.
6. Vai su **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: **main** — cartella **/ (root)** → **Save**
7. Dopo 1–2 minuti l'app è online all'indirizzo:
   `https://TUO-USERNAME.github.io/giorgio-stats/`

---

## 2. Installazione sul telefono

### Samsung S25 Ultra (e qualsiasi Android recente)
1. Apri l'indirizzo qui sopra con **Chrome** o **Samsung Internet**.
2. Chrome: menu ⋮ → **Installa app** (o banner automatico "Aggiungi a schermata Home").
   Samsung Internet: menu ≡ → **Aggiungi pagina a** → **Schermata Home** → **Installa**.
3. L'icona (palla arancione) compare in Home: si apre a schermo intero, senza barra del browser, e funziona anche **senza connessione**.

### iPhone / iPad (iOS 16+)
1. Apri l'indirizzo con **Safari**.
2. Pulsante **Condividi** □↑ → **Aggiungi a schermata Home** → **Aggiungi**.

---

## 3. Come funziona il salvataggio

- **Salvataggio continuo**: ogni tocco viene scritto subito nella memoria del telefono. Se l'app si chiude, il telefono si spegne o l'app va in crash, alla riapertura ritrovi tutto.
- **Azzeramento**: avviene **solo** con il pulsante **Reset partita** (scheda Note), previa conferma. Il reset azzera la partita in corso e **non tocca l'archivio**.
- **Archivio**: a fine partita, scheda Note → **Salva partita in archivio**. Se la risalvi (es. dopo aver completato i parziali), la voce viene **aggiornata, non duplicata**. La scheda Archivio mostra le medie stagionali (anche per categoria) e l'elenco partite; toccando una partita si apre il dettaglio, da cui si può eliminare.

---

## 4. Backup su OneDrive

- **Salvare il backup**: scheda Note → **Backup (condividi su OneDrive)** → nel menu di condivisione Android scegli **OneDrive** e la cartella di destinazione. Viene salvato un file `giorgio-stats-backup-AAAA-MM-GG.json` con partita in corso + intero archivio.
- **Ripristinare**: scheda Note → **Importa backup** → seleziona il file JSON da OneDrive (app File). Le partite vengono **unite** all'archivio esistente senza duplicati; in caso di conflitto vince la versione più recente. La partita in corso non viene toccata.
- Consiglio: fai il backup dopo ogni partita salvata.

---

## 5. Aggiornare l'app in futuro

1. Sostituisci i file modificati nel repository GitHub (Upload files → sovrascrivi).
2. **Importante**: in `sw.js`, cambia il numero nella riga
   `const VERSION = 'giorgio-stats-v1.0.0';` (es. `v1.0.1`).
   È questo che dice ai telefoni di scaricare la versione nuova.
3. Alla prima apertura con connessione l'app si aggiorna da sola. I dati salvati sul telefono **non vengono toccati** dagli aggiornamenti.

---

## 6. Cosa calcola l'app

- **Punti**: automatici — TL ×1, 2P ×2, 3P ×3 (solo segnati). Nessun inserimento manuale.
- **Tentati**: automatici — pulsante verde **+** = segnato (conta anche come tentato), pulsante rosso **+** = sbagliato (solo tentato). Percentuali calcolate da segnati/(segnati+sbagliati).
- **Valutazione** (formula di Lega):
  `VAL = Punti − TL sbagliati − 2P sbagliati − 3P sbagliati + Recuperate − Perse + Rimb.Off + Rimb.Dif + Assist − Falli commessi + Falli subiti + Stoppate date − Stoppate subite`
- **Risultato**: inserisci i **parziali** di ogni tempo a fine tempo (NOI / AVV); l'app calcola progressivi, totale ed esito (V/P/S).

---

## 7. Test eseguiti prima della consegna

- 11 test unitari sulla logica (formula VAL verificata a mano, percentuali, parziali/progressivi, fusione archivi, medie stagionali).
- 20 test d'interfaccia simulata (clic, auto-calcoli, salvataggio continuo, recupero dopo crash, dato corrotto, reset, archivio, import backup).
- Controlli di coerenza id HTML↔JS, azioni gestite, asset del service worker, sintassi e manifest.

Per rieseguirli (facoltativo, serve Node.js): `node test/core.test.js` e, dopo `npm install jsdom`, `node test/dom.test.js`.
