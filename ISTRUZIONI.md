# Giorgio Stats — Istruzioni (v1.1.0)

App per le statistiche partita di Giorgio. Funziona offline, si installa come app vera (compare nell'elenco app del telefono), salva tutto localmente.

**Novità v1.1.0**: schermata Live ridisegnata per stare interamente nello schermo senza scroll (anche con barra di navigazione Android visibile); nuova icona con la G; credit in scheda Note.

---

## 1. Aggiornare il sito GitHub (se hai già pubblicato la v1.0)

1. Apri il repository `giorgio-stats` su github.com.
2. **Add file → Upload files** → trascina **TUTTI** i file del nuovo pacchetto (compresa la cartella `icons`): i file esistenti vengono sovrascritti automaticamente.
3. **Commit changes**.
4. Attendi 1–2 minuti: GitHub Pages ripubblica da solo. L'indirizzo non cambia.

Nota tecnica: la riga `VERSION = 'giorgio-stats-v1.1.0'` in `sw.js` è già stata incrementata — è ciò che fa scaricare la versione nuova ai telefoni. Per ogni aggiornamento futuro va cambiato quel numero.

## 2. Eliminare i duplicati sul telefono

Prima di installare la versione corretta, rimuovi tutte le copie precedenti:

1. Cerca "Giorgio" nella schermata Home e nell'elenco app: **tieni premuta** ogni icona → **Rimuovi** (se è una scorciatoia) o **Disinstalla** (se è un'app installata).
2. Per sicurezza: Impostazioni Android → App → cerca "Giorgio" → se presente, **Disinstalla**.

## 3. Installare la versione corretta (app nell'elenco app)

1. Apri `https://TUO-USERNAME.github.io/giorgio-stats/` con **Chrome**.
2. Ricarica la pagina una volta (trascina verso il basso) per essere certo di avere la v1.1.0: nella scheda **Note**, in fondo, deve comparire "Creata da Stefano Amirante con Claude".
3. Menu ⋮ → **Aggiungi alla schermata Home** → nella finestra scegli **Installa** (non "Crea scorciatoia").
4. Con **Installa**, Android crea un'app vera e propria: la trovi **nell'elenco di tutte le app** con l'icona della palla con la G, apribile a schermo intero e funzionante offline. "Crea scorciatoia" mette invece solo un collegamento in Home: è quello che genera i duplicati.

### iPhone / iPad
Safari → Condividi □↑ → **Aggiungi a schermata Home** (su iOS le web app restano in Home: il sistema non prevede l'elenco app).

---

## 4. Come funziona il salvataggio

- **Salvataggio continuo**: ogni tocco viene scritto subito nella memoria del telefono. Crash, chiusura o spegnimento: alla riapertura ritrovi tutto.
- **Azzeramento**: solo con il pulsante **Reset partita** (scheda Note), previa conferma. Non tocca l'archivio.
- **Archivio**: a fine partita, scheda Note → **Salva partita in archivio**. Risalvare la stessa partita la **aggiorna senza duplicarla**. La scheda Archivio mostra medie stagionali (anche per categoria), bilancio V-P-S ed elenco partite con dettaglio ed eliminazione.

## 5. Backup su OneDrive

- **Salvare**: scheda Note → **Backup (condividi su OneDrive)** → scegli OneDrive nel menu di condivisione. File: `giorgio-stats-backup-AAAA-MM-GG.json` (partita in corso + archivio).
- **Ripristinare**: scheda Note → **Importa backup** → seleziona il file da OneDrive. Le partite vengono unite senza duplicati; in caso di conflitto vince la più recente.
- Consiglio: backup dopo ogni partita salvata.

## 6. Cosa calcola l'app

- **Punti**: automatici — TL ×1, 2P ×2, 3P ×3 (solo segnati).
- **Tentati**: automatici — **+ verde** = segnato (conta anche come tentato), **+ rosso** = sbagliato (solo tentato).
- **Valutazione** (formula di Lega):
  `VAL = Punti − TL sbagliati − 2P sbagliati − 3P sbagliati + Recuperate − Perse + Rimb.Off + Rimb.Dif + Assist − Falli commessi + Falli subiti + Stoppate date − Stoppate subite`
- **Risultato**: parziali di ogni tempo (NOI/AVV) digitati a fine tempo; progressivi, totale ed esito calcolati.

## 7. Test eseguiti prima della consegna

11 test unitari sulla logica + 20 test d'interfaccia simulata (clic, auto-calcoli, salvataggio continuo, recupero crash, dato corrotto, reset, archivio, import backup), più controlli su sintassi, manifest, coerenza id e asset offline. Rieseguibili con Node.js: `node test/core.test.js` e, dopo `npm install jsdom`, `node test/dom.test.js`.
