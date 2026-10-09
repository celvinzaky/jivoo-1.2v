// JIVOO Core - helpers, storage, API client, sync engine (Vanilla JS ES6+)
window.JV = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const nowISO = () => new Date().toISOString();
  const pad = n => String(n).padStart(2, '0');
  const dstr = iso => { if (!iso) return '-'; const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dshort = iso => { if (!iso) return '-'; const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; };
  const fmt = n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const num = v => Number(v) || 0;
  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  async function hash(pw) {
    if (crypto?.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('jivoo:' + pw));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
    let h = 0; const s = 'jivoo:' + pw; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return 'fallback_' + Math.abs(h);
  }

  const store = {
    get(k, fb = null) { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch { return fb; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    del(k) { localStorage.removeItem(k); }
  };

  async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = store.get('jv_token'); if (t) headers.Authorization = 'Bearer ' + t;
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || ('HTTP ' + res.status)); e.status = res.status; throw e; }
    return data;
  }

  function download(name, content, mime = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i+1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i+1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c; }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }
  const toCSV = rows => { if (!rows.length) return ''; const ks = Object.keys(rows[0]);
    return [ks.join(','), ...rows.map(r => ks.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'); };

  // ------- Data Service Layer (local-first + server sync) -------
  const COLS = ['company','users','roles','products','categories','customers','transactions','inventory',
    'suppliers','purchase_orders','promotions','attendance','finance','invoices','cashier_sessions','audit_logs','settings'];
  const DB = {
    cid: null, dirty: new Set(), cache: {},
    key(c) { return 'jv_' + this.cid + '_' + c; },
    init(cid) { this.cid = cid; this.cache = {}; this.dirty = new Set(store.get('jv_dirty_' + cid, [])); },
    async pull() {
      if (!navigator.onLine) return;
      for (const c of COLS) { try { const r = await api('/api/data/' + c); this.cache[c] = r.rows; store.set(this.key(c), r.rows); } catch { /* keep local */ } }
      this.dirty.clear(); store.set('jv_dirty_' + this.cid, []);
    },
    async load(c) {
      if (this.cache[c]) return this.cache[c];
      const local = store.get(this.key(c), []);
      if (navigator.onLine) { try { const r = await api('/api/data/' + c); this.cache[c] = r.rows; store.set(this.key(c), r.rows); return r.rows; } catch { /* offline */ } }
      this.cache[c] = local; return local;
    },
    async save(c, rows) { rows.forEach(r => { r.updated_at = nowISO(); if (!r.created_at) r.created_at = nowISO(); if (this.cid && !r.client_id) r.client_id = this.cid; });
      this.cache[c] = rows; store.set(this.key(c), rows); this.dirty.add(c); store.set('jv_dirty_' + this.cid, [...this.dirty]);
      return this.flush(); },
    async add(c, rows) { const cur = await this.load(c); const map = new Map(cur.map(r => [r.sync_id || r.id, r]));
      rows.forEach(r => map.set(r.sync_id || r.id, r)); return this.save(c, [...map.values()]); },
    async flush() {
      if (!navigator.onLine) return false;
      let ok = true;
      for (const c of [...this.dirty]) { try { await api('/api/data/' + c, { method: 'PUT', body: { rows: this.cache[c] || store.get(this.key(c), []) } }); this.dirty.delete(c); }
        catch { ok = false; } }
      store.set('jv_dirty_' + this.cid, [...this.dirty]); return ok;
    }
  };

  window.addEventListener('online', () => { DB.flush().then(ok => { if (ok) document.dispatchEvent(new CustomEvent('jv:synced')); }); });
  window.addEventListener('offline', () => document.dispatchEvent(new CustomEvent('jv:offline')));

  return { $, $$, esc, uid, nowISO, dstr, dshort, fmt, num, debounce, hash, store, api, download, parseCSV, toCSV, DB, COLS };
})();