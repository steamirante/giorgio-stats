'use strict';
/* app.js — interfaccia, salvataggio continuo, archivio, backup */
(function () {

  const LIVE_KEY = 'gs_live_v2';
  const ARCH_KEY = 'gs_archive_v1';
  const $ = id => document.getElementById(id);

  const COUNTER_DEFS = [
    { key: 'ro',  label: 'Rimb. offensivi', cls: 'green' },
    { key: 'rd',  label: 'Rimb. difensivi', cls: 'green' },
    { key: 'ast', label: 'Assist',          cls: 'blue'  },
    { key: 'pr',  label: 'Palle recuperate',cls: 'green' },
    { key: 'pp',  label: 'Palle perse',     cls: 'red'   },
    { key: 'fs',  label: 'Falli subiti',    cls: 'orange'},
    { key: 'fc',  label: 'Falli commessi',  cls: 'red'   },
    { key: 'sd',  label: 'Stoppate date',   cls: 'orange'},
    { key: 'ss',  label: 'Stoppate subite', cls: 'red'   },
    { key: 'min', label: 'Minuti giocati',  cls: ''      }
  ];
  const SHOT_DEFS = [
    { key: 't2', label: '2 punti' },
    { key: 't3', label: '3 punti' },
    { key: 'tl', label: 'Tiri liberi' }
  ];

  let state = GS.blankState(todayISO());
  let archive = [];
  let lastSummaryText = '';

  /* ---------------- utilita ---------------- */

  function todayISO() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function fmtDate(iso) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) {
      const parts = iso.split('-');
      const dt = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      return dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return iso || '—';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function vibra() {
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* no-op */ } }
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------------- persistenza ---------------- */

  function saveLive() {
    state.updatedAt = Date.now();
    try { localStorage.setItem(LIVE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }
  function saveArchive() {
    try { localStorage.setItem(ARCH_KEY, JSON.stringify(archive)); } catch (e) { /* quota */ }
  }

  /* Riporta qualsiasi oggetto salvato a uno schema completo e coerente */
  function normalize(s) {
    const b = GS.blankState('');
    if (!s || typeof s !== 'object') return b;
    const out = {
      id: s.id || b.id,
      meta: Object.assign({}, b.meta, s.meta || {}),
      counters: Object.assign({}, b.counters, s.counters || {}),
      shots: {
        t2: Object.assign({}, b.shots.t2, (s.shots && s.shots.t2) || {}),
        t3: Object.assign({}, b.shots.t3, (s.shots && s.shots.t3) || {}),
        tl: Object.assign({}, b.shots.tl, (s.shots && s.shots.tl) || {})
      },
      quarters: {
        noi: Array.isArray(s.quarters && s.quarters.noi) ? s.quarters.noi.slice(0, 4) : [],
        avv: Array.isArray(s.quarters && s.quarters.avv) ? s.quarters.avv.slice(0, 4) : []
      },
      note: typeof s.note === 'string' ? s.note : '',
      updatedAt: s.updatedAt || 0
    };
    while (out.quarters.noi.length < 4) out.quarters.noi.push('');
    while (out.quarters.avv.length < 4) out.quarters.avv.push('');
    GS.COUNTER_KEYS.forEach(k => { out.counters[k] = GS.num(out.counters[k]); });
    GS.SHOT_KEYS.forEach(k => {
      out.shots[k].s = GS.num(out.shots[k].s);
      out.shots[k].m = GS.num(out.shots[k].m);
    });
    if (s.savedAt) out.savedAt = s.savedAt;
    return out;
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(LIVE_KEY);
      if (raw) state = normalize(JSON.parse(raw));
    } catch (e) { /* dato corrotto: si riparte da zero, archivio intatto */ }
    try {
      const raw = localStorage.getItem(ARCH_KEY);
      if (raw) {
        const a = JSON.parse(raw);
        if (Array.isArray(a)) archive = a.map(normalize);
      }
    } catch (e) { /* idem */ }
  }

  /* ---------------- costruzione UI dinamica ---------------- */

  function buildCounters() {
    const grid = $('counters-grid');
    grid.innerHTML = COUNTER_DEFS.map(d => (
      '<div class="counter-card">' +
        '<div class="counter-name">' + d.label + '</div>' +
        '<div class="counter-controls">' +
          '<button type="button" class="btn-counter minus" data-action="cdec" data-key="' + d.key + '" aria-label="Diminuisci ' + d.label + '">−</button>' +
          '<div class="counter-value ' + d.cls + '" id="val-' + d.key + '">0</div>' +
          '<button type="button" class="btn-counter plus" data-action="cinc" data-key="' + d.key + '" aria-label="Aumenta ' + d.label + '">+</button>' +
        '</div>' +
      '</div>'
    )).join('');
  }

  function buildShots() {
    const grid = $('shots-grid');
    grid.innerHTML = SHOT_DEFS.map(d => (
      '<div class="shot-card">' +
        '<div class="shot-title">' + d.label + '</div>' +
        '<div class="shot-stat" id="disp-' + d.key + '">0/0 · —</div>' +
        '<div class="shot-row">' +
          '<button type="button" class="btn-mini minus" data-action="sdec" data-key="' + d.key + '" data-kind="s" aria-label="Togli segnato ' + d.label + '">−</button>' +
          '<div class="shot-val seg" id="val-' + d.key + '-s">0</div>' +
          '<button type="button" class="btn-mini plus-seg" data-action="sinc" data-key="' + d.key + '" data-kind="s" aria-label="Segnato ' + d.label + '">+</button>' +
        '</div>' +
        '<div class="shot-cap">segnati</div>' +
        '<div class="shot-row">' +
          '<button type="button" class="btn-mini minus" data-action="sdec" data-key="' + d.key + '" data-kind="m" aria-label="Togli sbagliato ' + d.label + '">−</button>' +
          '<div class="shot-val sba" id="val-' + d.key + '-m">0</div>' +
          '<button type="button" class="btn-mini plus-sba" data-action="sinc" data-key="' + d.key + '" data-kind="m" aria-label="Sbagliato ' + d.label + '">+</button>' +
        '</div>' +
        '<div class="shot-cap">sbagliati</div>' +
      '</div>'
    )).join('');
  }

  /* ---------------- rendering ---------------- */

  function renderScoreboard() {
    const pt = GS.points(state.shots);
    const val = GS.valutazione(state);
    $('sb-pt').textContent = pt;
    const sv = $('sb-val');
    sv.textContent = val;
    sv.classList.toggle('neg', val < 0);
  }

  function renderCounters() {
    GS.COUNTER_KEYS.forEach(k => { $('val-' + k).textContent = state.counters[k]; });
  }

  function renderShots() {
    GS.SHOT_KEYS.forEach(k => {
      const t = state.shots[k];
      $('val-' + k + '-s').textContent = t.s;
      $('val-' + k + '-m').textContent = t.m;
      $('disp-' + k).textContent = t.s + '/' + GS.attempts(t) + ' · ' + GS.pctStr(t.s, t.m);
    });
  }

  function renderQuarters() {
    ['noi', 'avv'].forEach(team => {
      for (let i = 0; i < 4; i++) {
        const el = $('q-' + team + '-' + i);
        if (el.value !== String(state.quarters[team][i])) el.value = state.quarters[team][i];
      }
    });
    const tot = GS.quarterTotals(state.quarters);
    $('tot-noi').textContent = tot.noi;
    $('tot-avv').textContent = tot.avv;
    const prog = GS.progressivi(state.quarters);
    for (let i = 0; i < 4; i++) {
      $('prog-' + i).textContent = prog[i].noi + '-' + prog[i].avv;
    }
    $('final-score').textContent = tot.noi + ' — ' + tot.avv;
    const e = GS.esito(state.quarters);
    const badge = $('final-esito');
    badge.textContent = e === 'V' ? 'VITTORIA' : e === 'S' ? 'SCONFITTA' : e === 'P' ? 'PAREGGIO' : '';
    badge.className = 'final-badge' + (e === 'V' ? ' win' : e === 'S' ? ' loss' : e === 'P' ? ' draw' : '');
  }

  function renderMeta() {
    $('f-data').value = state.meta.data;
    $('f-avv').value = state.meta.avversario;
    $('f-cat').value = state.meta.categoria;
    $('f-maglia').value = state.meta.maglia;
    $('f-note').value = state.note;
  }

  function renderArchive() {
    const z = GS.seasonStats(archive);
    const medieEl = $('arch-medie');
    if (z.n === 0) {
      medieEl.innerHTML = '<div class="empty">Nessuna partita in archivio. Salva la prima dalla scheda Note.</div>';
    } else {
      const p2 = GS.pctStr(z.t2s, z.t2m), p3 = GS.pctStr(z.t3s, z.t3m), ptl = GS.pctStr(z.tls, z.tlm);
      const record = z.conRis > 0 ? (z.v + 'V ' + z.p + 'P ' + z.s + 'S') : '—';
      let html =
        '<div class="medie-head"><span>' + z.n + ' partite</span><span>Bilancio: ' + record + '</span></div>' +
        '<div class="medie-grid">' +
          medieCell('PT', GS.media(z.pt, z.n)) +
          medieCell('RIM', GS.media(z.rim, z.n)) +
          medieCell('AST', GS.media(z.ast, z.n)) +
          medieCell('VAL', GS.media(z.val, z.n)) +
          medieCell('PR', GS.media(z.pr, z.n)) +
          medieCell('PP', GS.media(z.pp, z.n)) +
        '</div>' +
        '<div class="medie-foot">2P ' + p2 + ' · 3P ' + p3 + ' · TL ' + ptl + '</div>';
      /* dettaglio per categoria */
      const byCat = {};
      archive.forEach(g => {
        const c = (g.meta.categoria || '').trim() || 'Senza categoria';
        (byCat[c] = byCat[c] || []).push(g);
      });
      const cats = Object.keys(byCat);
      if (cats.length > 1) {
        html += '<div class="medie-cats">' + cats.map(c => {
          const s = GS.seasonStats(byCat[c]);
          return '<div class="medie-cat-row"><span class="cat-name">' + esc(c) + '</span>' +
                 '<span>' + s.n + ' part. · ' + GS.media(s.pt, s.n) + ' pt · VAL ' + GS.media(s.val, s.n) + '</span></div>';
        }).join('') + '</div>';
      }
      medieEl.innerHTML = html;
    }

    const list = $('arch-list');
    if (archive.length === 0) { list.innerHTML = ''; return; }
    list.innerHTML = archive.map(g => {
      const tot = GS.quarterTotals(g.quarters);
      const e = GS.esito(g.quarters);
      const ris = e ? (tot.noi + '–' + tot.avv) : '—';
      const eCls = e === 'V' ? 'win' : e === 'S' ? 'loss' : e === 'P' ? 'draw' : '';
      return '<button type="button" class="arch-item" data-action="arch-open" data-id="' + esc(g.id) + '">' +
        '<div class="arch-l1"><span class="arch-avv">' + esc(g.meta.avversario || 'Avversario —') + '</span>' +
        '<span class="arch-ris ' + eCls + '">' + ris + '</span></div>' +
        '<div class="arch-l2"><span>' + esc(fmtDate(g.meta.data)) + (g.meta.categoria ? ' · ' + esc(g.meta.categoria) : '') + '</span>' +
        '<span>PT ' + GS.points(g.shots) + ' · VAL ' + GS.valutazione(g) + '</span></div>' +
      '</button>';
    }).join('');
  }

  function medieCell(label, val) {
    return '<div class="medie-cell"><div class="medie-val">' + val + '</div><div class="medie-lab">' + label + '</div></div>';
  }

  function renderAll() {
    renderMeta();
    renderCounters();
    renderShots();
    renderQuarters();
    renderScoreboard();
    renderArchive();
  }

  /* ---------------- mutazioni ---------------- */

  function mutateCounter(key, d) {
    const v = state.counters[key] + d;
    if (v < 0) return;
    state.counters[key] = v;
    $('val-' + key).textContent = v;
    renderScoreboard();
    saveLive();
    if (d > 0) vibra();
  }

  function mutateShot(key, kind, d) {
    const v = state.shots[key][kind] + d;
    if (v < 0) return;
    state.shots[key][kind] = v;
    renderShots();
    renderScoreboard();
    saveLive();
    if (d > 0) vibra();
  }

  /* ---------------- riepilogo ---------------- */

  function summaryLines(st) {
    const pt = GS.points(st.shots);
    const val = GS.valutazione(st);
    const c = st.counters, sh = st.shots;
    const tot = GS.quarterTotals(st.quarters);
    const prog = GS.progressivi(st.quarters);
    const hasRis = GS.quartersEntered(st.quarters);
    const e = GS.esito(st.quarters);
    const eTxt = e === 'V' ? 'V' : e === 'S' ? 'S' : e === 'P' ? 'P' : '';
    const parziali = [0, 1, 2, 3].map(i => GS.num(st.quarters.noi[i]) + '-' + GS.num(st.quarters.avv[i])).join(' | ');
    const progressivi = prog.map(p => p.noi + '-' + p.avv).join(' | ');

    const lines = [
      ['Data', fmtDate(st.meta.data)],
      ['Avversario', st.meta.avversario || '—'],
      ['Categoria', (st.meta.categoria || '—') + (st.meta.maglia ? ' · #' + st.meta.maglia : '')],
      ['Minuti', c.min + ' min'],
      ['—', '']
    ];
    if (hasRis) {
      lines.push(['Risultato', tot.noi + '–' + tot.avv + (eTxt ? ' (' + eTxt + ')' : '')]);
      lines.push(['Parziali', parziali]);
      lines.push(['Progressivi', progressivi]);
      lines.push(['—', '']);
    }
    lines.push(
      ['Punti', pt],
      ['Valutazione', val],
      ['Rimbalzi', (c.ro + c.rd) + ' (O:' + c.ro + ' / D:' + c.rd + ')'],
      ['Assist', c.ast],
      ['Palle recuperate', c.pr],
      ['Palle perse', c.pp],
      ['Falli subiti', c.fs],
      ['Falli commessi', c.fc],
      ['Stoppate date', c.sd],
      ['Stoppate subite', c.ss],
      ['—', ''],
      ['2P', sh.t2.s + '/' + GS.attempts(sh.t2) + ' (' + GS.pctStr(sh.t2.s, sh.t2.m) + ')'],
      ['3P', sh.t3.s + '/' + GS.attempts(sh.t3) + ' (' + GS.pctStr(sh.t3.s, sh.t3.m) + ')'],
      ['TL', sh.tl.s + '/' + GS.attempts(sh.tl) + ' (' + GS.pctStr(sh.tl.s, sh.tl.m) + ')']
    );
    return lines;
  }

  function summaryText(st) {
    let txt = 'GIORGIO — STATS PARTITA\n';
    summaryLines(st).forEach(([k, v]) => {
      txt += (k === '—') ? '\n' : (k + ': ' + v + '\n');
    });
    if (st.note) txt += '\nNote: ' + st.note + '\n';
    return txt;
  }

  function openSummary(st, opts) {
    opts = opts || {};
    $('modal-title').textContent = st.meta.avversario ? 'vs ' + st.meta.avversario : 'Riepilogo';
    let html = '';
    summaryLines(st).forEach(([k, v]) => {
      if (k === '—') { html += '<div class="modal-sep"></div>'; return; }
      html += '<div class="modal-line"><span class="modal-key">' + esc(k) + '</span><span class="modal-val">' + esc(v) + '</span></div>';
    });
    if (st.note) html += '<div class="modal-note">' + esc(st.note) + '</div>';
    $('modal-content').innerHTML = html;
    lastSummaryText = summaryText(st);
    $('copy-feedback').textContent = '';
    const actions = $('modal-actions');
    actions.innerHTML =
      '<button type="button" class="modal-copy" data-action="copy">Copia testo</button>' +
      (opts.archivedId
        ? '<button type="button" class="modal-del" data-action="arch-del" data-id="' + esc(opts.archivedId) + '">Elimina dall\'archivio</button>'
        : '') +
      '<button type="button" class="modal-close" data-action="close-modal">Chiudi</button>';
    $('modal').classList.add('open');
  }

  function closeModal() { $('modal').classList.remove('open'); }

  function copySummary() {
    const done = () => { $('copy-feedback').textContent = 'Copiato negli appunti'; };
    const fail = () => { $('copy-feedback').textContent = 'Copia non riuscita: seleziona e copia manualmente'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastSummaryText).then(done).catch(fail);
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = lastSummaryText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (e) { fail(); }
    }
  }

  /* ---------------- archivio ---------------- */

  function saveGame() {
    const snap = normalize(JSON.parse(JSON.stringify(state)));
    snap.savedAt = Date.now();
    const i = archive.findIndex(g => g.id === snap.id);
    if (i >= 0) { archive[i] = snap; toast('Partita aggiornata in archivio'); }
    else { archive.unshift(snap); toast('Partita salvata in archivio'); }
    archive.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    saveArchive();
    renderArchive();
  }

  function openArchived(id) {
    const g = archive.find(x => x.id === id);
    if (!g) return;
    openSummary(g, { archivedId: id });
  }

  function delArchived(id) {
    const g = archive.find(x => x.id === id);
    if (!g) return;
    if (!confirm('Eliminare definitivamente questa partita dall\'archivio?')) return;
    archive = archive.filter(x => x.id !== id);
    saveArchive();
    renderArchive();
    closeModal();
    toast('Partita eliminata');
  }

  /* ---------------- backup / import ---------------- */

  async function doBackup() {
    const payload = {
      app: 'giorgio-stats',
      version: 2,
      exportedAt: new Date().toISOString(),
      live: state,
      archive: archive
    };
    const json = JSON.stringify(payload, null, 2);
    const name = 'giorgio-stats-backup-' + todayISO() + '.json';
    const blob = new Blob([json], { type: 'application/json' });
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Backup Giorgio Stats' });
        toast('Backup condiviso');
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return; /* utente ha annullato */
    }
    /* fallback: download diretto */
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Backup scaricato: caricalo su OneDrive');
  }

  function doImport(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!payload || payload.app !== 'giorgio-stats' || !Array.isArray(payload.archive)) {
          toast('File non valido: non è un backup di questa app');
          return;
        }
        const res = GS.mergeArchive(archive, payload.archive.map(normalize));
        archive = res.list;
        saveArchive();
        renderArchive();
        toast('Backup importato: ' + res.added + ' nuove, ' + res.updated + ' aggiornate');
      } catch (e) {
        toast('File non leggibile');
      }
    };
    reader.onerror = () => toast('Errore di lettura del file');
    reader.readAsText(file);
  }

  /* ---------------- reset ---------------- */

  function doReset() {
    if (!confirm('Azzerare tutti i dati della partita in corso?\nL\'archivio delle partite salvate NON viene toccato.')) return;
    state = GS.blankState(todayISO());
    saveLive();
    renderAll();
    toast('Partita azzerata');
  }

  /* ---------------- schede ---------------- */

  function showTab(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
    document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  }

  /* ---------------- eventi ---------------- */

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset;
    switch (a.action) {
      case 'tab': showTab(a.tab); break;
      case 'cinc': mutateCounter(a.key, +1); break;
      case 'cdec': mutateCounter(a.key, -1); break;
      case 'sinc': mutateShot(a.key, a.kind, +1); break;
      case 'sdec': mutateShot(a.key, a.kind, -1); break;
      case 'riepilogo': openSummary(state); break;
      case 'salva': saveGame(); break;
      case 'backup': doBackup(); break;
      case 'import': $('file-import').click(); break;
      case 'reset': doReset(); break;
      case 'copy': copySummary(); break;
      case 'close-modal': closeModal(); break;
      case 'arch-open': openArchived(a.id); break;
      case 'arch-del': delArchived(a.id); break;
    }
  });

  function onFieldInput(e) {
    const el = e.target;
    if (el.dataset.field) {
      if (el.dataset.field === 'note') state.note = el.value;
      else state.meta[el.dataset.field] = el.value;
      saveLive();
    } else if (el.dataset.team) {
      const clean = el.value.replace(/[^\d]/g, '').slice(0, 3);
      if (clean !== el.value) el.value = clean;
      state.quarters[el.dataset.team][+el.dataset.i] = clean;
      renderQuarters();
      saveLive();
    }
  }
  document.addEventListener('input', onFieldInput);
  document.addEventListener('change', onFieldInput);

  $('file-import').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) doImport(f);
    e.target.value = '';
  });

  /* salvataggio di sicurezza quando l'app va in background */
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveLive(); });
  window.addEventListener('pagehide', saveLive);

  /* ---------------- avvio ---------------- */

  buildCounters();
  buildShots();
  loadAll();
  renderAll();
  showTab('live');
  saveLive();

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => { /* non bloccante */ });
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* offline-first non disponibile */ });
    });
  }
})();
