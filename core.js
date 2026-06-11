'use strict';
/* core.js — logica pura, senza DOM. Testabile in Node. */
const GS = (() => {

  const COUNTER_KEYS = ['min', 'ro', 'rd', 'ast', 'pr', 'pp', 'fs', 'fc', 'sd', 'ss'];
  const SHOT_KEYS = ['t2', 't3', 'tl'];

  function uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function blankState(todayISO) {
    return {
      id: uuid(),
      meta: { data: todayISO || '', avversario: '', categoria: '', maglia: '' },
      counters: { min: 0, ro: 0, rd: 0, ast: 0, pr: 0, pp: 0, fs: 0, fc: 0, sd: 0, ss: 0 },
      shots: { t2: { s: 0, m: 0 }, t3: { s: 0, m: 0 }, tl: { s: 0, m: 0 } },
      quarters: { noi: ['', '', '', ''], avv: ['', '', '', ''] },
      note: '',
      updatedAt: 0
    };
  }

  /* Converte input testuale in intero >= 0 ('' o non numerico -> 0) */
  function num(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /* Punti auto-calcolati: TL x1, 2P x2, 3P x3 (solo segnati) */
  function points(shots) {
    return shots.tl.s + 2 * shots.t2.s + 3 * shots.t3.s;
  }

  function attempts(t) { return t.s + t.m; }

  function pctStr(s, m) {
    const a = s + m;
    return a > 0 ? Math.round((s / a) * 100) + '%' : '—';
  }

  /* Valutazione di Lega:
     VAL = P − TL− − T2− − T3− + PR − PP + RO + RD + AS − FF + FS + SD − SS */
  function valutazione(st) {
    const c = st.counters, sh = st.shots;
    return points(sh)
      - sh.tl.m - sh.t2.m - sh.t3.m
      + c.pr - c.pp
      + c.ro + c.rd
      + c.ast
      - c.fc + c.fs
      + c.sd - c.ss;
  }

  function quarterTotals(q) {
    return {
      noi: q.noi.reduce((a, v) => a + num(v), 0),
      avv: q.avv.reduce((a, v) => a + num(v), 0)
    };
  }

  /* Progressivi: somma cumulata dei parziali per ciascun tempo */
  function progressivi(q) {
    const out = [];
    let n = 0, a = 0;
    for (let i = 0; i < 4; i++) {
      n += num(q.noi[i]);
      a += num(q.avv[i]);
      out.push({ noi: n, avv: a });
    }
    return out;
  }

  function quartersEntered(q) {
    if (!q || !Array.isArray(q.noi) || !Array.isArray(q.avv)) return false;
    return q.noi.some(v => String(v == null ? '' : v).trim() !== '')
        || q.avv.some(v => String(v == null ? '' : v).trim() !== '');
  }

  /* 'V' vittoria, 'S' sconfitta, 'P' pareggio, null se risultato non inserito */
  function esito(q) {
    if (!quartersEntered(q)) return null;
    const t = quarterTotals(q);
    if (t.noi > t.avv) return 'V';
    if (t.noi < t.avv) return 'S';
    return 'P';
  }

  /* Fusione archivio per import backup: dedup per id, vince il savedAt piu recente */
  function mergeArchive(current, incoming) {
    const map = new Map((current || []).map(g => [g.id, g]));
    let added = 0, updated = 0;
    for (const g of (incoming || [])) {
      if (!g || !g.id) continue;
      const ex = map.get(g.id);
      if (!ex) { map.set(g.id, g); added++; }
      else if ((g.savedAt || 0) > (ex.savedAt || 0)) { map.set(g.id, g); updated++; }
    }
    const list = [...map.values()].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    return { list, added, updated };
  }

  /* Aggregati stagionali su un elenco di partite archiviate */
  function seasonStats(games) {
    const z = {
      n: 0, pt: 0, rim: 0, ast: 0, pr: 0, pp: 0, val: 0,
      t2s: 0, t2m: 0, t3s: 0, t3m: 0, tls: 0, tlm: 0,
      v: 0, s: 0, p: 0, conRis: 0
    };
    for (const g of (games || [])) {
      if (!g || !g.shots || !g.counters) continue;
      z.n++;
      z.pt += points(g.shots);
      z.rim += g.counters.ro + g.counters.rd;
      z.ast += g.counters.ast;
      z.pr += g.counters.pr;
      z.pp += g.counters.pp;
      z.val += valutazione(g);
      z.t2s += g.shots.t2.s; z.t2m += g.shots.t2.m;
      z.t3s += g.shots.t3.s; z.t3m += g.shots.t3.m;
      z.tls += g.shots.tl.s; z.tlm += g.shots.tl.m;
      const e = esito(g.quarters || { noi: [], avv: [] });
      if (e) {
        z.conRis++;
        if (e === 'V') z.v++;
        else if (e === 'S') z.s++;
        else z.p++;
      }
    }
    return z;
  }

  function media(tot, n) { return n > 0 ? (tot / n).toFixed(1) : '—'; }

  return {
    COUNTER_KEYS, SHOT_KEYS, uuid, blankState, num,
    points, attempts, pctStr, valutazione,
    quarterTotals, progressivi, quartersEntered, esito,
    mergeArchive, seasonStats, media
  };
})();

if (typeof globalThis !== 'undefined') { globalThis.GS = GS; }
if (typeof module !== 'undefined' && module.exports) { module.exports = GS; }
