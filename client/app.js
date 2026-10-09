// JIVOO Back Office app
(() => {
  const { $, esc, fmt, num, dstr, dshort, uid, nowISO, api, DB, parseCSV, download, debounce } = JV;
  const { toast, modal, confirm, promptDlg, formModal, table, statCard, chart, printHTML, exportCSV } = UI;
  const app = $('#app');
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const Icons = {
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    rep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/></svg>',
    ana: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M8 17V9m5 8V5m5 12v-6"/></svg>',
    prd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/></svg>',
    inv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    cus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    promo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41L11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.83zM7 7h.01"/></svg>',
    fin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5M6 12h.01M18 12h.01"/></svg>',
    usr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>'
  };

  // ---------- helpers ----------
  const badge = (v, map) => { const m = map[v] || map.default; return `<span class="badge ${m[1]}">${m[0]}</span>`; };
  const PES = {
    paid: ['LUNAS', 'green'], unpaid: ['BELUM LUNAS', 'red'], partial: ['SEBAGIAN', 'amber'],
    active: ['AKTIF', 'green'], inactive: ['NONAKTIF', 'red'],
    pending_sync: ['PENDING SYNC', 'amber'], synced: ['SYNCED', 'green']
  };
  async function audit(action, module, metadata = {}) {
    const logs = await DB.load('audit_logs');
    logs.push({ id: uid('LOG'), client_id: Auth.user()?.client_id, user_id: Auth.user()?.id, action, module, metadata, timestamp: nowISO() });
    await DB.save('audit_logs', logs.slice(-5000));
  }
  async function getSettings() {
    const s = await DB.load('settings'); const o = {};
    s.forEach(x => o[x.key] = x.value);
    if (!o.profile) o.profile = { name: Auth.user()?.client_id || '', brand: '', address: '', phone: '' };
    if (o.tax_rate === undefined) o.tax_rate = 0.11;
    return o;
  }
  async function setSetting(key, value) {
    const s = await DB.load('settings'); const i = s.findIndex(x => x.key === key);
    if (i >= 0) s[i].value = value; else s.push({ id: uid('SET'), client_id: Auth.user()?.client_id, key, value });
    await DB.save('settings', s);
  }
  const lowStock = p => num(p.stock) <= num(p.min_stock);

  // ---------- shell ----------
  function syncBadge() {
    const off = !navigator.onLine, pend = DB.dirty.size;
    return `<span class="syncbadge ${off ? 'off' : pend ? 'pend' : ''}" id="syncbadge">${off ? '● Offline' : pend ? `● ${pend} pending sync` : '● Synced'}</span>`;
  }
  function shell(content, active, title) {
    const u = Auth.user() || {};
    const nav = [
      ['', 'Menu Utama'],
      ['dashboard', Icons.dash, 'Dashboard', ['dashboard']],
      ['reports', Icons.rep, 'Laporan', ['reports']],
      ['analytics', Icons.ana, 'Analisa', ['analytics']],
      ['', 'Operasional'],
      ['products', Icons.prd, 'Produk', ['products']],
      ['inventory', Icons.inv, 'Inventory', ['inventory', 'suppliers', 'purchase_orders']],
      ['customers', Icons.cus, 'Pelanggan', ['customers']],
      ['promotions', Icons.promo, 'Promo', ['promotions']],
      ['invoices', Icons.fin, 'Invoice & PO', ['invoices', 'commissions']],
      ['', 'Keuangan'],
      ['finance', Icons.fin, 'Keuangan', ['finance']],
      ['', 'Sistem'],
      ['users', Icons.usr, 'User & Role', ['users', 'roles']],
      ['settings', Icons.set, 'Pengaturan', ['settings']],
      ['audit', Icons.log, 'Audit Log', ['settings']]
    ];
    app.innerHTML = `<div class="shell">
      <aside class="side" id="side">
        <div class="brand"><img src="/assets/logo.png" onerror="this.style.display='none'" alt=""><b>JIVOO</b></div>
        ${nav.map(n => n.length === 2 ? `<div class="navsec">${n[1]}</div>` :
          Auth.canModule(n[3][0]) || n[3].some(m => Auth.canModule(m)) ? `<button class="navi ${active === n[0] ? 'on' : ''}" data-go="#/${n[0]}">${n[1]} ${n[2]}</button>` : '').join('')}
        <div style="flex:1"></div>
        <button class="navi" id="btnLogout">${Icons.out} Keluar</button>
      </aside>
      <main class="main">
        <div class="topbar"><div style="display:flex;align-items:center;gap:12px"><button class="menu-toggle" id="mt">☰</button><h1>${esc(title)}</h1></div>
        <div style="display:flex;gap:10px;align-items:center">${syncBadge()}<div class="userchip"><span class="avatar">${esc((u.name || 'U')[0])}</span>${esc(u.name || '')} <span class="badge blue">${esc(u.role_label || u.role || '')}</span></div></div></div>
        ${content}
      </main></div>`;
    $$('.navi[data-go]').forEach(b => b.onclick = () => location.hash = b.dataset.go);
    $('#btnLogout').onclick = async () => { if (await UI.confirm('Keluar dari aplikasi?')) Auth.logout(); };
    $('#mt').onclick = () => $('#side').classList.toggle('open');
    $('#syncbadge')?.addEventListener('click', async () => { const ok = await DB.flush(); toast(ok ? 'Sinkronisasi selesai' : 'Masih offline / gagal sinkron', ok ? 'success' : 'warn'); route(); });
  }
  document.addEventListener('jv:synced', () => { const b = $('#syncbadge'); if (b) { b.className = 'syncbadge'; b.textContent = '● Synced'; } });
  document.addEventListener('jv:offline', () => { const b = $('#syncbadge'); if (b) { b.className = 'syncbadge off'; b.textContent = '● Offline'; } });

  // ---------- LOGIN ----------
  function loginPage() {
    app.innerHTML = `<div class="login-wrap"><div class="login-card">
      <img src="/assets/logo.png" onerror="this.style.display='none'" alt="JIVOO">
      <h2>JIVOO Back Office</h2><p>Masuk ke dashboard bisnis Anda</p>
      <form id="f">
        <label class="flab">Username / Email</label><input class="inp" name="username" required autocomplete="username">
        <label class="flab">Kata Sandi</label><input class="inp" type="password" name="password" required autocomplete="current-password">
        <button class="btn primary">Masuk</button>
      </form>
      <div class="hint">Demo client: <b>demo / jivoo123</b> (owner)</div></div></div>`;
    $('#f').onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target);
      try { await Auth.login('client', { username: fd.get('username').trim(), password: fd.get('password') });
        await DB.pull().catch(() => {}); toast('Selamat datang', 'success'); location.hash = '#/dashboard'; route();
      } catch (err) { toast(err.message, 'error'); } };
  }

  // ---------- generic CRUD ----------
  function crudPage({ col, title, active, fields, columns, search, beforeSave, rowActions, canCreate = true, empty, onInit }) {
    return async () => {
      if (!Auth.guard()) return;
      shell(`<div class="toolbar">${canCreate && Auth.canPerm('create') ? '<button class="btn primary" id="add">+ Tambah</button>' : ''}<button class="btn" id="ref">Refresh</button><span class="spacer"></span></div><div id="list"></div>`, active, title);
      async function load() {
        const rows = (await DB.load(col)).filter(r => r.status !== 'deleted');
        const el = table({ cols: columns, rows, search: search || [], actions: rowActions ? r => rowActions(r, load) : null, empty });
        const list = $('#list'); list.innerHTML = ''; list.appendChild(el); onInit && onInit(rows);
      }
      $('#add').onclick = () => formModal('Tambah ' + title, fields, {}, async o => {
        try { if (beforeSave) o = await beforeSave(o, null) || o; const rows = await DB.load(col);
          rows.push({ id: uid(col.slice(0, 3).toUpperCase()), ...o, status: o.status || 'active', created_at: nowISO() });
          await DB.save(col, rows); audit('CREATE_' + col.toUpperCase(), col.toUpperCase()); toast('Data tersimpan', 'success'); load();
        } catch (e) { toast(e.message, 'error'); }
      });
      $('#ref').onclick = load;
      await load();
    };
  }
  function editAction(col, title, fields, load, beforeSave) {
    return { label: 'Edit', onClick: async r => formModal('Edit ' + title, fields, r, async o => {
      try { if (beforeSave) o = await beforeSave(o, r) || o; const rows = await DB.load(col);
        const i = rows.findIndex(x => x.id === r.id); rows[i] = { ...rows[i], ...o }; await DB.save(col, rows);
        audit('UPDATE_' + col.toUpperCase(), col.toUpperCase(), { id: r.id }); toast('Data diperbarui', 'success'); load();
      } catch (e) { toast(e.message, 'error'); } }) };
  }
  function toggleStatusAction(col, load) {
    return { label: 'Nonaktifkan', cls: 'danger', onClick: async r => {
      if (!await UI.confirm(`Nonaktifkan "${r.name || r.id}"? Data tidak dihapus permanen.`)) return;
      const rows = await DB.load(col); const i = rows.findIndex(x => x.id === r.id);
      rows[i].status = rows[i].status === 'active' ? 'inactive' : 'active'; await DB.save(col, rows);
      audit('TOGGLE_STATUS', col.toUpperCase(), { id: r.id, status: rows[i].status }); toast('Status diperbarui', 'success'); load();
    } };
  }

  // ---------- DASHBOARD ----------
  async function dashboard() {
    shell('<div id="dv"><p style="color:var(--mut)">Memuat...</p></div>', 'dashboard', 'Dashboard');
    const [tx, products, customers, invLogs, invoices] = await Promise.all([DB.load('transactions'), DB.load('products'), DB.load('customers'), DB.load('inventory'), DB.load('invoices')]);
    const today = new Date().toDateString();
    const txToday = tx.filter(t => new Date(t.created_at).toDateString() === today);
    const revToday = txToday.reduce((a, t) => a + num(t.total), 0);
    const grossToday = txToday.reduce((a, t) => a + num(t.subtotal) - num(t.discount) - num(t.promotion), 0);
    const profitToday = txToday.reduce((a, t) => a + (t.items || []).reduce((x, i) => x + (num(i.price) - num(i.cost || 0)) * num(i.qty), 0) - num(t.promotion), 0);
    const low = products.filter(p => p.status === 'active' && lowStock(p));
    const pending = tx.filter(t => t.status === 'pending_sync').length;
    const hutang = invLogs; // placeholder var avoid lint
    void hutang;
    const unpaidPO = (await DB.load('purchase_orders')).filter(p => p.status !== 'paid').reduce((a, p) => a + num(p.total) - num(p.paid), 0);
    const piutang = invoices.filter(i => i.status !== 'paid').reduce((a, i) => a + num(i.total) - num(i.paid), 0);
    // trend 14 hari
    const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d; });
    const trend = days.map(d => tx.filter(t => new Date(t.created_at).toDateString() === d.toDateString()).reduce((a, t) => a + num(t.total), 0));
    $('#dv').innerHTML = `
      <div class="grid c4">
        ${statCard('Penjualan Hari Ini', fmt(revToday), txToday.length + ' transaksi')}
        ${statCard('Laba Kotor Hari Ini', fmt(profitToday), 'setelah promo')}
        ${statCard('Penjualan Bersih Hari Ini', fmt(grossToday), 'sebelum pajak')}
        ${statCard('Pending Sync', pending, 'transaksi menunggu sinkron')}
      </div>
      <div class="grid c4" style="margin-top:14px">
        ${statCard('Produk', products.filter(p => p.status === 'active').length, low.length ? `<span class="low">${low.length} stok menipis</span>` : 'stok aman')}
        ${statCard('Pelanggan', customers.length, 'terdaftar')}
        ${statCard('Hutang Supplier', fmt(unpaidPO), 'faktur belum lunas')}
        ${statCard('Piutang Pelanggan', fmt(piutang), 'invoice belum lunas')}
      </div>
      <div class="grid c2" style="margin-top:14px">
        <div class="card"><h3>Tren Penjualan 14 Hari</h3>${trend.some(v => v) ? '<canvas class="chart" id="ch1"></canvas>' : '<p style="color:var(--mut);padding:16px">Belum ada transaksi. Buat transaksi lewat PWA Kasir.</p>'}</div>
        <div class="card"><h3>Stok Menipis</h3>${low.length ? table({ cols: [
          { k: 'name', label: 'Produk' }, { k: 'sku', label: 'SKU' },
          { k: 'stock', label: 'Stok', cls: 'num', fmt: (v, r) => `<span class="${lowStock(r) ? 'low' : ''}">${v}</span>` },
          { k: 'min_stock', label: 'Min', cls: 'num' }], rows: low, pageSize: 6 }).outerHTML : '<p style="color:var(--mut);padding:16px">Semua stok aman.</p>'}</div>
      </div>`;
    if (trend.some(v => v)) chart($('#ch1'), { labels: days.map(d => dshort(d.toISOString())), data: trend, type: 'line', color: '#2563eb' });
  }

  // ---------- PRODUCTS ----------
  async function productFields() {
    const cats = await DB.load('categories');
    const catOpts = [{ v: '', l: '— Tanpa kategori —' }, ...cats.filter(c => c.status === 'active').map(c => ({ v: c.name, l: c.name }))];
    return [
      { k: 'name', label: 'Nama Produk', required: true },
      { k: 'sku', label: 'SKU / Kode Produk' },
      { k: 'category', label: 'Kategori', type: 'select', opts: catOpts },
      { k: 'unit', label: 'Satuan (pcs/cup/karton/dll)', def: 'pcs' },
      { k: 'price', label: 'Harga Jual', type: 'number', required: true },
      { k: 'cost', label: 'Harga Modal', type: 'number', def: 0 },
      { k: 'stock', label: 'Stok', type: 'number', def: 0 },
      { k: 'min_stock', label: 'Stok Minimum', type: 'number', def: 0 },
      { k: 'image', label: 'URL Foto (opsional)' },
      { k: 'favorite', label: 'Tampilkan di Favorite kasir', type: 'checkbox' },
      { k: 'extras', label: 'Produk Extra (format: Nama:Harga, pisahkan koma)', type: 'textarea', ph: 'Extra Keju:3000, Extra Telur:5000' },
      { k: 'bundle_items', label: 'Produk Paket (format: SKU:Qty, pisahkan koma)', type: 'textarea', ph: 'NSG-001:1, EST-003:1' },
      { k: 'status', label: 'Status', type: 'select', opts: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] }
    ];
  }
  const serializeExtras = o => { o.extras = String(o.extras || '').split(',').map(s => s.trim()).filter(Boolean).map(s => { const [n, p] = s.split(':'); return { name: n.trim(), price: num(p) }; });
    o.bundle_items = String(o.bundle_items || '').split(',').map(s => s.trim()).filter(Boolean).map(s => { const [sku, q] = s.split(':'); return { sku: sku.trim(), qty: num(q) || 1 }; }); return o; };
  const fmtExtras = e => (e || []).map(x => `${esc(x.name)} +${fmt(x.price)}`).join(', ');
  async function productsPage() {
    const fields = await productFields();
    const columns = [
      { k: 'name', label: 'Produk', fmt: (v, r) => `${r.image ? `<img src="${esc(r.image)}" style="width:34px;height:34px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:8px" onerror="this.remove()">` : ''}<b>${esc(v)}</b>${r.bundle_items?.length ? ' <span class="badge cyan">PAKET</span>' : ''}` },
      { k: 'sku', label: 'SKU' }, { k: 'category', label: 'Kategori' }, { k: 'unit', label: 'Satuan' },
      { k: 'price', label: 'Harga', fmt: v => fmt(v), cls: 'num' },
      { k: 'stock', label: 'Stok', cls: 'num', fmt: (v, r) => `<span class="${lowStock(r) ? 'low' : ''}">${v}</span>` },
      { k: 'favorite', label: 'Fav', fmt: v => v ? '★' : '' },
      { k: 'status', label: 'Status', fmt: v => badge(v, PES) }
    ];
    const page = crudPage({ col: 'products', title: 'Produk', active: 'products', fields, columns, search: ['name', 'sku', 'category'], beforeSave: async o => serializeExtras(o), empty: 'Belum ada produk' });
    // wrap toolbar with import button
    await page();
    if (Auth.canPerm('create')) {
      $('.main .toolbar').insertAdjacentHTML('afterbegin', '<button class="btn" id="csv">Import CSV</button><button class="btn" id="tpl">Template CSV</button>');
      $('#tpl').onclick = () => download('template_produk.csv', 'name,sku,category,unit,price,cost,stock,min_stock\nContoh Produk,SKU-001,Makanan,pcs,15000,7000,50,10', 'text/csv');
      $('#csv').onclick = () => {
        const b = document.createElement('div');
        b.innerHTML = `<p style="font-size:12.5px;color:var(--mut);margin-bottom:8px">Paste isi CSV (header: name,sku,category,unit,price,cost,stock,min_stock) atau pilih file:</p>
          <input type="file" id="fcsv" accept=".csv" class="inp" style="margin-bottom:8px"><textarea class="inp" id="tcsv" rows="6" placeholder="name,sku,category,unit,price,cost,stock,min_stock"></textarea>`;
        modal({ title: 'Import Produk (Bulk)', body: b, actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Import', cls: 'primary', onClick: async () => {
          let text = $('#tcsv', b).value;
          const f = $('#fcsv', b).files[0];
          if (f) text = await f.text(); if (!text.trim()) return toast('CSV kosong', 'error'), false;
          const rows = parseCSV(text); const head = rows.shift().map(h => h.trim().toLowerCase());
          const items = rows.map(r => { const o = {}; head.forEach((h, i) => o[h] = r[i]); return o; }).filter(o => o.name);
          if (!items.length) return toast('Tidak ada baris valid', 'error'), false;
          const cur = await DB.load('products');
          items.forEach(o => cur.push({ id: uid('PRD'), name: o.name, sku: o.sku || '', category: o.category || '', unit: o.unit || 'pcs',
            price: num(o.price), cost: num(o.cost), stock: num(o.stock), min_stock: num(o.min_stock), image: '', favorite: false, extras: [], bundle_items: [], status: 'active' }));
          await DB.save('products', cur); audit('BULK_IMPORT_PRODUCT', 'PRODUCT', { count: items.length });
          toast(items.length + ' produk diimport', 'success'); route();
        } }] });
      };
    }
  }

  // ---------- CATEGORIES ----------
  const categoriesPage = crudPage({
    col: 'categories', title: 'Kategori', active: 'products', empty: 'Belum ada kategori',
    fields: [
      { k: 'name', label: 'Nama Kategori', required: true },
      { k: 'type', label: 'Tipe', type: 'select', opts: [{ v: 'food', l: 'Makanan' }, { v: 'drink', l: 'Minuman' }, { v: 'other', l: 'Lainnya' }] },
      { k: 'status', label: 'Status', type: 'select', opts: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] }],
    columns: [
      { k: 'name', label: 'Nama' }, { k: 'type', label: 'Tipe' },
      { k: 'created_at', label: 'Dibuat', fmt: v => dshort(v) }, { k: 'status', label: 'Status', fmt: v => badge(v, PES) }],
    search: ['name'],
    rowActions: (r, load) => [editAction('categories', 'Kategori', [
      { k: 'name', label: 'Nama Kategori', required: true },
      { k: 'type', label: 'Tipe', type: 'select', opts: [{ v: 'food', l: 'Makanan' }, { v: 'drink', l: 'Minuman' }, { v: 'other', l: 'Lainnya' }] },
      { k: 'status', label: 'Status', type: 'select', opts: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] }], load).onClick(r), toggleStatusAction('categories', load)]
  });

  // ---------- CUSTOMERS ----------
  async function customersPage() {
    const fields = [
      { k: 'name', label: 'Nama Pelanggan', required: true },
      { k: 'phone', label: 'No. HP', required: true },
      { k: 'email', label: 'Email' }, { k: 'address', label: 'Alamat', type: 'textarea' },
      { k: 'member', label: 'Member (harga spesial)', type: 'checkbox' },
      { k: 'special_price', label: 'Diskon Khusus Member (%)', type: 'number', def: 0 },
      { k: 'status', label: 'Status', type: 'select', opts: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] }];
    const columns = [
      { k: 'name', label: 'Nama' }, { k: 'phone', label: 'HP' },
      { k: 'member', label: 'Member', fmt: v => v ? '<span class="badge blue">MEMBER</span>' : '<span class="badge gray">-</span>' },
      { k: 'special_price', label: 'Disc. Khusus', fmt: v => v ? v + '%' : '-', cls: 'num' },
      { k: 'points', label: 'Poin', cls: 'num' },
      { k: 'total_spent', label: 'Total Belanja', fmt: v => fmt(v), cls: 'num' },
      { k: 'last_visit', label: 'Kunjungan Terakhir', fmt: v => dstr(v) },
      { k: 'status', label: 'Status', fmt: v => badge(v, PES) }];
    await crudPage({ col: 'customers', title: 'Pelanggan', active: 'customers', fields, columns, search: ['name', 'phone'], empty: 'Belum ada pelanggan',
      rowActions: (r, load) => [editAction('customers', 'Pelanggan', fields, load).onClick(r), toggleStatusAction('customers', load)] })();
    if (Auth.canPerm('create')) {
      $('.main .toolbar').insertAdjacentHTML('afterbegin', '<button class="btn" id="ccsv">Import CSV</button>');
      $('#ccsv').onclick = () => {
        const b = document.createElement('div');
        b.innerHTML = `<input type="file" id="f" accept=".csv" class="inp" style="margin-bottom:8px"><textarea class="inp" id="t" rows="5" placeholder="name,phone,email,address,member,special_price"></textarea>`;
        modal({ title: 'Import Pelanggan (Bulk)', body: b, actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Import', cls: 'primary', onClick: async () => {
          let text = $('#t', b).value; const f = $('#f', b).files[0]; if (f) text = await f.text();
          const rows = parseCSV(text); const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
          const items = rows.map(r => { const o = {}; head.forEach((h, i) => o[h] = r[i]); return o; }).filter(o => o.name);
          if (!items.length) return toast('Tidak ada baris valid', 'error'), false;
          const cur = await DB.load('customers');
          items.forEach(o => cur.push({ id: uid('CUS'), name: o.name, phone: o.phone || '', email: o.email || '', address: o.address || '',
            member: String(o.member).toLowerCase() === 'true' || String(o.member) === '1', special_price: num(o.special_price), points: 0, total_spent: 0, last_visit: null, status: 'active' }));
          await DB.save('customers', cur); audit('BULK_IMPORT_CUSTOMER', 'CUSTOMER', { count: items.length });
          toast(items.length + ' pelanggan diimport', 'success'); route();
        } }] });
      };
    }
  }

  // ---------- INVENTORY ----------
  async function inventoryPage(tab = 'stok') {
    shell(`<div class="tabs" id="tabs">
      <button data-t="stok" class="${tab === 'stok' ? 'on' : ''}">Daftar Stok</button>
      <button data-t="opname" class="${tab === 'opname' ? 'on' : ''}">Stok Opname</button>
      <button data-t="waste" class="${tab === 'waste' ? 'on' : ''}">Stok Terbuang</button>
      <button data-t="sup" class="${tab === 'sup' ? 'on' : ''}">Supplier</button>
      <button data-t="po" class="${tab === 'po' ? 'on' : ''}">Faktur Pembelian / PO</button>
      <button data-t="log" class="${tab === 'log' ? 'on' : ''}">Riwayat Stok</button>
    </div><div id="body"></div>`, 'inventory', 'Inventory');
    $$('#tabs button').forEach(b => b.onclick = () => inventoryPage(b.dataset.t));
    const body = $('#body');

    if (tab === 'stok') {
      const products = (await DB.load('products')).filter(p => p.status === 'active');
      body.innerHTML = `<div class="toolbar"><span style="color:var(--mut);font-size:12.5px">Kelola stok awal, stok masuk/keluar manual</span><span class="spacer"></span></div><div id="list"></div>`;
      $('#list').appendChild(table({ cols: [
        { k: 'name', label: 'Produk' }, { k: 'sku', label: 'SKU' }, { k: 'unit', label: 'Satuan' },
        { k: 'stock', label: 'Stok', cls: 'num', fmt: (v, r) => `<span class="${lowStock(r) ? 'low' : ''}">${v}</span>` },
        { k: 'min_stock', label: 'Min', cls: 'num' }],
        rows: products, search: ['name', 'sku'],
        actions: r => [{ label: 'Masuk', onClick: () => adjustStock(r, 'in') }, { label: 'Keluar', onClick: () => adjustStock(r, 'out') }] }));
    }
    if (tab === 'opname') {
      const products = (await DB.load('products')).filter(p => p.status === 'active');
      body.innerHTML = `<div class="card" style="max-width:520px"><h3>Stok Opname — sesuaikan stok sistem dengan stok aktual</h3>
        <label class="flab">Produk</label><select class="inp" id="p">${products.map(p => `<option value="${p.id}">${esc(p.name)} (sistem: ${p.stock} ${esc(p.unit)})</option>`).join('')}</select>
        <label class="flab">Stok Aktual (hasil hitung fisik)</label><input class="inp" type="number" id="a" min="0">
        <label class="flab">Catatan Selisih</label><input class="inp" id="n" placeholder="misal: rusak 1 pcs">
        <button class="btn primary" id="go" style="margin-top:14px">Simpan Opname</button></div>`;
      $('#go').onclick = async () => {
        const p = products.find(x => x.id === $('#p').value); if (!p) return;
        const actual = num($('#a').value); const diff = actual - num(p.stock);
        if (diff === 0) return toast('Tidak ada selisih', 'info');
        if (!await UI.confirm(`Selisih ${diff} ${p.unit}. Simpan penyesuaian?`)) return;
        const rows = await DB.load('products'); rows.find(x => x.id === p.id).stock = actual; await DB.save('products', rows);
        const logs = await DB.load('inventory');
        logs.push({ id: uid('INV'), product_id: p.id, product_name: p.name, type: 'opname', qty: diff, before: p.stock, after: actual, note: $('#n').value || ('Selisih opname ' + diff), created_at: nowISO() });
        await DB.save('inventory', logs); audit('STOCK_OPNAME', 'INVENTORY', { product: p.name, diff });
        toast('Opname tersimpan', 'success'); inventoryPage('opname');
      };
    }
    if (tab === 'waste') {
      const products = (await DB.load('products')).filter(p => p.status === 'active');
      body.innerHTML = `<div class="card" style="max-width:520px"><h3>Stok Terbuang — produk expired / tidak layak jual</h3>
        <label class="flab">Produk</label><select class="inp" id="p">${products.map(p => `<option value="${p.id}">${esc(p.name)} (stok: ${p.stock})</option>`).join('')}</select>
        <label class="flab">Jumlah</label><input class="inp" type="number" id="q" min="1" value="1">
        <label class="flab">Kategori</label><select class="inp" id="r"><option value="expired">Expired</option><option value="damaged">Rusak</option><option value="lost">Hilang</option><option value="not_sellable">Tidak Layak Jual</option></select>
        <label class="flab">Catatan</label><input class="inp" id="n">
        <button class="btn danger" id="go" style="margin-top:14px">Buang Stok</button></div>`;
      $('#go').onclick = async () => {
        const p = products.find(x => x.id === $('#p').value); const q = num($('#q').value);
        if (!p || q <= 0) return toast('Jumlah tidak valid', 'error');
        if (q > num(p.stock)) return toast('Melebihi stok tersedia', 'error');
        const rows = await DB.load('products'); rows.find(x => x.id === p.id).stock = num(p.stock) - q; await DB.save('products', rows);
        const logs = await DB.load('inventory');
        logs.push({ id: uid('INV'), product_id: p.id, product_name: p.name, type: 'waste', qty: -q, before: p.stock, after: num(p.stock) - q,
          note: `Terbuang (${$('#r').value}): ${$('#n').value || '-'}`, created_at: nowISO() });
        await DB.save('inventory', logs); audit('STOCK_WASTE', 'INVENTORY', { product: p.name, qty: q });
        toast('Stok terbuang dicatat', 'success'); inventoryPage('waste');
      };
    }
    if (tab === 'sup') {
      const fields = [
        { k: 'name', label: 'Nama Supplier', required: true }, { k: 'phone', label: 'No. HP' },
        { k: 'email', label: 'Email' }, { k: 'address', label: 'Alamat', type: 'textarea' },
        { k: 'status', label: 'Status', type: 'select', opts: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] }];
      const load = async () => {
        const rows = (await DB.load('suppliers')).filter(r => r.status !== 'deleted');
        const b = $('#body'); b.innerHTML = `<div class="toolbar">${Auth.canPerm('create') ? '<button class="btn primary" id="add">+ Tambah Supplier</button>' : ''}</div><div id="list"></div>`;
        $('#add') && ($('#add').onclick = () => formModal('Tambah Supplier', fields, {}, async o => {
          const cur = await DB.load('suppliers'); cur.push({ id: uid('SUP'), ...o, status: o.status || 'active', created_at: nowISO() });
          await DB.save('suppliers', cur); toast('Supplier tersimpan', 'success'); load(); }));
        $('#list').appendChild(table({ cols: [
          { k: 'name', label: 'Supplier' }, { k: 'phone', label: 'HP' }, { k: 'email', label: 'Email' }, { k: 'address', label: 'Alamat' },
          { k: 'status', label: 'Status', fmt: v => badge(v, PES) }], rows, search: ['name', 'phone'], actions: r => [editAction('suppliers', 'Supplier', fields, load).onClick(r), toggleStatusAction('suppliers', load)] }));
      };
      await load(); return;
    }
    if (tab === 'po') {
      const pos = await DB.load('purchase_orders');
      const suppliers = (await DB.load('suppliers')).filter(s => s.status === 'active');
      body.innerHTML = `<div class="toolbar">${Auth.canPerm('create') ? '<button class="btn primary" id="add">+ Faktur Pembelian / PO</button>' : ''}<span class="spacer"></span>
        <span style="color:var(--mut);font-size:12.5px">Total hutang: <b class="${pos.filter(p => p.status !== 'paid').length ? 'low' : ''}">${fmt(pos.filter(p => p.status !== 'paid').reduce((a, p) => a + num(p.total) - num(p.paid), 0))}</b></span></div><div id="list"></div>`;
      $('#add') && ($('#add').onclick = () => poForm(suppliers));
      $('#list').appendChild(table({ cols: [
        { k: 'number', label: 'No. Faktur/PO' },
        { k: 'supplier_name', label: 'Supplier' },
        { k: 'total', label: 'Total', fmt: v => fmt(v), cls: 'num' },
        { k: 'paid', label: 'Dibayar', fmt: v => fmt(v), cls: 'num' },
        { k: 'status', label: 'Status Bayar', fmt: v => badge(v, PES) },
        { k: 'created_at', label: 'Tanggal', fmt: v => dshort(v) }],
        rows: pos, search: ['number', 'supplier_name'],
        actions: r => [{ label: 'Bayar', onClick: () => payPO(r) }, { label: 'Detail', onClick: () => detailPO(r) }] }));
      async function poForm(sups) {
        const products = (await DB.load('products')).filter(p => p.status === 'active');
        const b = document.createElement('div');
        b.innerHTML = `<div class="kv" style="margin-bottom:10px">
          <div><label class="flab">Supplier</label><select class="inp" id="s">${sups.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
          <div><label class="flab">No. Faktur / PO</label><input class="inp" id="no" value="PO-${Date.now().toString().slice(-6)}"></div></div>
          <label class="flab">Item Pembelian (tambah baris, isi produk + qty + harga beli)</label><div id="lines"></div>
          <button class="btn sm" id="al">+ Baris</button>
          <div style="text-align:right;font-weight:800;margin-top:10px">Total: <span id="tt">${fmt(0)}</span></div>
          <label class="flab">Status Pembayaran</label><select class="inp" id="st"><option value="unpaid">Belum Lunas</option><option value="paid">Lunas</option><option value="partial">Sebagian (DP)</option></select>
          <label class="flab">Jumlah Dibayar</label><input class="inp" type="number" id="pd" value="0">`;
        let lines = [];
        const renderLines = () => {
          $('#lines', b).innerHTML = lines.map((l, i) => `<div class="le">
            <select class="inp" data-i="${i}" data-f="pid">${products.map(p => `<option value="${p.id}" ${p.id === l.pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
            <input class="inp" style="max-width:80px" type="number" data-i="${i}" data-f="qty" value="${l.qty}" min="1" placeholder="Qty">
            <input class="inp" style="max-width:130px" type="number" data-i="${i}" data-f="cost" value="${l.cost}" min="0" placeholder="Harga beli">
            <button class="btn xs danger" data-i="${i}" data-f="del">×</button></div>`).join('');
          $$('[data-f]', b).forEach(el => el.onchange = el.onclick = () => {
            const i = num(el.dataset.i), f = el.dataset.f;
            if (f === 'del') lines.splice(i, 1); else lines[i][f] = el.value;
            $('#tt', b).textContent = fmt(lines.reduce((a, l) => a + num(l.qty) * num(l.cost), 0)); if (f === 'del') renderLines();
          });
        };
        $('#al', b).onclick = () => { lines.push({ pid: products[0]?.id, qty: 1, cost: 0 }); renderLines(); };
        $('#al', b).click();
        modal({ title: 'Faktur Pembelian / PO ke Supplier', body: b, wide: true, actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan & Tambah Stok', cls: 'primary', onClick: async () => {
          lines = lines.filter(l => l.pid && num(l.qty) > 0);
          if (!lines.length) return toast('Isi minimal 1 item', 'error'), false;
          const sup = sups.find(s => s.id === $('#s', b).value);
          const total = lines.reduce((a, l) => a + num(l.qty) * num(l.cost), 0);
          const paid = Math.min(num($('#pd', b).value), total);
          const pos2 = await DB.load('purchase_orders');
          pos2.push({ id: uid('PO'), number: $('#no', b).value, supplier_id: sup?.id, supplier_name: sup?.name || '-',
            items: lines.map(l => { const p = products.find(x => x.id === l.pid); return { product_id: l.pid, name: p?.name, qty: num(l.qty), cost: num(l.cost) }; }),
            total, paid, status: $('#st', b).value, created_at: nowISO() });
          await DB.save('purchase_orders', pos2);
          const prows = await DB.load('products'); const logs = await DB.load('inventory');
          lines.forEach(l => { const p = prows.find(x => x.id === l.pid); if (!p) return;
            const before = num(p.stock); p.stock = before + num(l.qty); p.cost = num(l.cost) || p.cost;
            logs.push({ id: uid('INV'), product_id: p.id, product_name: p.name, type: 'in', qty: num(l.qty), before, after: p.stock, note: 'Faktur pembelian ' + $('#no', b).value, created_at: nowISO() }); });
          await DB.save('products', prows); await DB.save('inventory', logs);
          audit('PURCHASE_INVOICE', 'INVENTORY', { number: $('#no', b).value, total });
          toast('Faktur tersimpan, stok ditambahkan', 'success'); inventoryPage('po');
        } }] });
      }
      async function payPO(r) {
        const sisa = num(r.total) - num(r.paid); if (sisa <= 0) return toast('Sudah lunas', 'info');
        const amt = await promptDlg(`Sisa ${fmt(sisa)}. Masukkan jumlah pembayaran:`, sisa); if (amt === null) return;
        const pos2 = await DB.load('purchase_orders'); const p = pos2.find(x => x.id === r.id);
        p.paid = num(p.paid) + num(amt); p.status = p.paid >= num(p.total) ? 'paid' : 'partial';
        await DB.save('purchase_orders', pos2); audit('PAY_PO', 'FINANCE', { id: r.id, amount: amt });
        toast('Pembayaran dicatat', 'success'); inventoryPage('po');
      }
      function detailPO(r) {
        modal({ title: 'Detail ' + r.number, body: `<div class="kv"><div><b>Supplier</b><br>${esc(r.supplier_name)}</div><div><b>Tanggal</b><br>${dstr(r.created_at)}</div>
          <div><b>Total</b><br>${fmt(r.total)}</div><div><b>Status</b><br>${badge(r.status, PES)}</div></div>
          <table class="tbl" style="margin-top:12px"><thead><tr><th>Produk</th><th class="num">Qty</th><th class="num">Harga</th><th class="num">Subtotal</th></tr></thead>
          <tbody>${(r.items || []).map(i => `<tr><td>${esc(i.name)}</td><td class="num">${i.qty}</td><td class="num">${fmt(i.cost)}</td><td class="num">${fmt(i.qty * i.cost)}</td></tr>`).join('')}</tbody></table>`,
          actions: [{ label: 'Tutup' }] });
      }
    }
    if (tab === 'log') {
      const logs = (await DB.load('inventory')).slice().reverse();
      body.innerHTML = '<div id="list"></div>';
      $('#list').appendChild(table({ cols: [
        { k: 'created_at', label: 'Waktu', fmt: v => dstr(v) },
        { k: 'product_name', label: 'Produk' },
        { k: 'type', label: 'Jenis', fmt: v => badge(v, { in: ['MASUK', 'green'], out: ['KELUAR', 'amber'], sale: ['TERJUAL', 'blue'], opname: ['OPNAME', 'cyan'], waste: ['TERBUANG', 'red'], default: [v, 'gray'] }) },
        { k: 'qty', label: 'Qty', cls: 'num', fmt: v => (v > 0 ? '+' : '') + v },
        { k: 'before', label: 'Awal', cls: 'num' }, { k: 'after', label: 'Akhir', cls: 'num' },
        { k: 'note', label: 'Keterangan' }], rows: logs, search: ['product_name', 'note'], pageSize: 15 }));
    }
  }
  async function adjustStock(p, type) {
    const q = await promptDlg(`${type === 'in' ? 'Stok masuk' : 'Stok keluar'} untuk "${p.name}" (stok saat ini: ${p.stock}):`, 1);
    if (q === null || num(q) <= 0) return;
    const rows = await DB.load('products'); const i = rows.findIndex(x => x.id === p.id);
    rows[i].stock = Math.max(0, num(rows[i].stock) + (type === 'in' ? 1 : -1) * num(q));
    await DB.save('products', rows);
    const logs = await DB.load('inventory');
    logs.push({ id: uid('INV'), product_id: p.id, product_name: p.name, type, qty: (type === 'in' ? 1 : -1) * num(q),
      before: p.stock, after: rows[i].stock, note: 'Penyesuaian manual', created_at: nowISO() });
    await DB.save('inventory', logs); audit('STOCK_ADJUST', 'INVENTORY', { product: p.name, type, qty: q });
    toast('Stok diperbarui', 'success'); inventoryPage('stok');
  }

  // ---------- PROMOTIONS ----------
  const PROMO_TYPES = { basic: 'Basic Promo (tanpa syarat)', total_purchase: 'Per Total Pembelian', product_qty: 'Per Produk (min. qty)', coupon: 'Kupon', points: 'Poin Reward' };
  const promotionsPage = crudPage({
    col: 'promotions', title: 'Promo', active: 'promotions', empty: 'Belum ada promo',
    fields: [
      { k: 'name', label: 'Nama Promo', required: true },
      { k: 'type', label: 'Tipe Promo', type: 'select', opts: Object.entries(PROMO_TYPES).map(([v, l]) => ({ v, l })) },
      { k: 'value', label: 'Nilai Diskon (%)', type: 'number', required: true },
      { k: 'min_total', label: 'Min. Total Pembelian (Rp)', type: 'number', def: 0 },
      { k: 'min_qty', label: 'Min. Qty Produk', type: 'number', def: 0 },
      { k: 'product_sku', label: 'SKU Produk (untuk promo per produk)' },
      { k: 'coupon_code', label: 'Kode Kupon' },
      { k: 'start', label: 'Mulai', type: 'date' }, { k: 'end', label: 'Selesai', type: 'date' },
      { k: 'status', label: 'Status', type: 'select', opts: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] }],
    columns: [
      { k: 'name', label: 'Nama' },
      { k: 'type', label: 'Tipe', fmt: v => PROMO_TYPES[v] || v },
      { k: 'value', label: 'Diskon', fmt: v => v + '%', cls: 'num' },
      { k: 'coupon_code', label: 'Kupon' },
      { k: 'start', label: 'Mulai', fmt: v => v || '-' }, { k: 'end', label: 'Selesai', fmt: v => v || '-' },
      { k: 'status', label: 'Status', fmt: v => badge(v, PES) }],
    search: ['name', 'coupon_code'],
    rowActions: (r, load) => [editAction('promotions', 'Promo', [
      { k: 'name', label: 'Nama Promo', required: true },
      { k: 'type', label: 'Tipe Promo', type: 'select', opts: Object.entries(PROMO_TYPES).map(([v, l]) => ({ v, l })) },
      { k: 'value', label: 'Nilai Diskon (%)', type: 'number', required: true },
      { k: 'min_total', label: 'Min. Total Pembelian (Rp)', type: 'number' },
      { k: 'min_qty', label: 'Min. Qty Produk', type: 'number' },
      { k: 'product_sku', label: 'SKU Produk' }, { k: 'coupon_code', label: 'Kode Kupon' },
      { k: 'start', label: 'Mulai', type: 'date' }, { k: 'end', label: 'Selesai', type: 'date' },
      { k: 'status', label: 'Status', type: 'select', opts: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] }], load).onClick(r), toggleStatusAction('promotions', load)]
  });

  // ---------- INVOICES (customer PO + DP + piutang) ----------
  async function invoicesPage() {
    shell(`<div class="toolbar">${Auth.canPerm('create') ? '<button class="btn primary" id="add">+ Buat Invoice / Customer PO</button>' : ''}<span class="spacer"></span>
      <span style="color:var(--mut);font-size:12.5px">Piutang: <b class="low" id="piu"></b></span></div><div id="list"></div>`, 'invoices', 'Invoice & Customer PO');
    async function load() {
      const rows = (await DB.load('invoices')).slice().reverse();
      $('#piu').textContent = fmt(rows.filter(i => i.status !== 'paid').reduce((a, i) => a + num(i.total) - num(i.paid), 0));
      const el = table({ cols: [
        { k: 'number', label: 'No. Invoice' }, { k: 'customer_name', label: 'Pelanggan' },
        { k: 'total', label: 'Total', fmt: v => fmt(v), cls: 'num' },
        { k: 'dp', label: 'DP', fmt: v => fmt(v), cls: 'num' },
        { k: 'paid', label: 'Dibayar', fmt: v => fmt(v), cls: 'num' },
        { k: 'status', label: 'Status', fmt: v => badge(v, PES) },
        { k: 'due_date', label: 'Jatuh Tempo', fmt: v => v || '-' },
        { k: 'created_at', label: 'Dibuat', fmt: v => dshort(v) }],
        rows, search: ['number', 'customer_name'],
        actions: r => [{ label: 'Terima Bayar', onClick: () => payInv(r) }, { label: 'Detail', onClick: () => detailInv(r) }] });
      const list = $('#list'); list.innerHTML = ''; list.appendChild(el);
    }
    $('#add').onclick = async () => {
      const customers = (await DB.load('customers')).filter(c => c.status === 'active');
      const products = (await DB.load('products')).filter(p => p.status === 'active');
      const b = document.createElement('div');
      b.innerHTML = `<div class="kv" style="margin-bottom:8px">
        <div><label class="flab">Pelanggan</label><select class="inp" id="c"><option value="">— Umum —</option>${customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div><label class="flab">Jatuh Tempo</label><input class="inp" type="date" id="due"></div></div>
        <div id="lines"></div><button class="btn sm" id="al">+ Baris Item</button>
        <div style="text-align:right;font-weight:800;margin:10px 0">Total: <span id="tt">${fmt(0)}</span></div>
        <label class="flab">Down Payment (DP)</label><input class="inp" type="number" id="dp" value="0">`;
      let lines = [];
      const renderLines = () => {
        $('#lines', b).innerHTML = lines.map((l, i) => `<div class="le">
          <select class="inp" data-i="${i}" data-f="pid">${products.map(p => `<option value="${p.id}" ${p.id === l.pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
          <input class="inp" style="max-width:70px" type="number" data-i="${i}" data-f="qty" value="${l.qty}" min="1">
          <input class="inp" style="max-width:120px" type="number" data-i="${i}" data-f="price" value="${l.price}" min="0" placeholder="Harga">
          <button class="btn xs danger" data-i="${i}" data-f="del">×</button></div>`).join('');
        $$('[data-f]', b).forEach(el => el.onchange = el.onclick = () => {
          const i = num(el.dataset.i), f = el.dataset.f;
          if (f === 'del') { lines.splice(i, 1); renderLines(); }
          else { lines[i][f] = el.value; $('#tt', b).textContent = fmt(lines.reduce((a, l) => a + num(l.qty) * num(l.price), 0)); }
        });
      };
      $('#al', b).onclick = () => { lines.push({ pid: products[0]?.id, qty: 1, price: products[0]?.price || 0 }); renderLines(); };
      $('#al', b).click();
      modal({ title: 'Buat Invoice / Customer PO', body: b, wide: true, actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan Invoice', cls: 'primary', onClick: async () => {
        lines = lines.filter(l => l.pid && num(l.qty) > 0); if (!lines.length) return toast('Isi minimal 1 item', 'error'), false;
        const c = customers.find(x => x.id === $('#c', b).value);
        const total = lines.reduce((a, l) => a + num(l.qty) * num(l.price), 0);
        const dp = Math.min(num($('#dp', b).value), total);
        const rows = await DB.load('invoices');
        rows.push({ id: uid('INV2'), number: 'INV-' + Date.now().toString().slice(-6), customer_id: c?.id || null, customer_name: c?.name || 'Umum',
          items: lines.map(l => { const p = products.find(x => x.id === l.pid); return { product_id: l.pid, name: p?.name, qty: num(l.qty), price: num(l.price) }; }),
          total, dp, paid: dp, due_date: $('#due', b).value || null,
          status: dp >= total ? 'paid' : dp > 0 ? 'partial' : 'unpaid', created_at: nowISO() });
        await DB.save('invoices', rows); audit('CREATE_INVOICE', 'INVOICE', { total });
        toast('Invoice tersimpan', 'success'); load();
      } }] });
    };
    async function payInv(r) {
      const sisa = num(r.total) - num(r.paid); if (sisa <= 0) return toast('Sudah lunas', 'info');
      const amt = await promptDlg(`Sisa tagihan ${fmt(sisa)}. Terima pembayaran:`, sisa); if (amt === null) return;
      const rows = await DB.load('invoices'); const inv = rows.find(x => x.id === r.id);
      inv.paid = num(inv.paid) + num(amt); inv.status = inv.paid >= num(inv.total) ? 'paid' : 'partial';
      await DB.save('invoices', rows); audit('PAY_INVOICE', 'FINANCE', { id: r.id, amount: amt });
      toast('Pembayaran diterima', 'success'); load();
    }
    function detailInv(r) {
      modal({ title: 'Detail ' + r.number, wide: true, body: `<div class="kv"><div><b>Pelanggan</b><br>${esc(r.customer_name)}</div>
        <div><b>Status</b><br>${badge(r.status, PES)}</div><div><b>Total</b><br>${fmt(r.total)}</div><div><b>Dibayar</b><br>${fmt(r.paid)}</div></div>
        <table class="tbl" style="margin-top:12px"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Harga</th><th class="num">Subtotal</th></tr></thead>
        <tbody>${(r.items || []).map(i => `<tr><td>${esc(i.name)}</td><td class="num">${i.qty}</td><td class="num">${fmt(i.price)}</td><td class="num">${fmt(i.qty * i.price)}</td></tr>`).join('')}</tbody></table>`,
        actions: [{ label: 'Tutup' }] });
    }
    await load();
  }

  // ---------- FINANCE ----------
  async function financePage(tab = 'kas') {
    shell(`<div class="tabs" id="tabs">
      <button data-t="kas" class="${tab === 'kas' ? 'on' : ''}">Saldo Kas & Buku Kas</button>
      <button data-t="rek" class="${tab === 'rek' ? 'on' : ''}">Rekonsiliasi Penerimaan</button>
      <button data-t="akun" class="${tab === 'akun' ? 'on' : ''}">Daftar Akun</button>
      <button data-t="jurnal" class="${tab === 'jurnal' ? 'on' : ''}">Jurnal Umum</button>
      <button data-t="lap" class="${tab === 'lap' ? 'on' : ''}">Aset · Liabilitas · Equitas</button>
    </div><div id="body"></div>`, 'finance', 'Keuangan');
    $$('#tabs button').forEach(b => b.onclick = () => financePage(b.dataset.t));
    const body = $('#body');

    if (tab === 'kas') {
      const [tx, journals, pos, invs] = await Promise.all([DB.load('transactions'), DB.load('finance'), DB.load('purchase_orders'), DB.load('invoices')]);
      const cashIn = tx.filter(t => (t.payments || []).some(p => p.method === 'cash')).reduce((a, t) => a + (t.payments || []).filter(p => p.method === 'cash').reduce((x, p) => x + num(p.amount), 0), 0);
      const cashOut = pos.filter(p => p.status !== 'unpaid').reduce((a, p) => a + num(p.paid), 0);
      const invCash = invs.filter(i => i.status !== 'unpaid').reduce((a, i) => a + num(i.paid), 0);
      const manual = journals.filter(j => (j.account_name || '').toLowerCase().includes('kas'));
      const manualNet = manual.reduce((a, j) => a + num(j.debit) - num(j.credit), 0);
      const saldo = cashIn + invCash - cashOut + manualNet;
      const mutasi = [
        ...tx.flatMap(t => (t.payments || []).filter(p => p.method === 'cash').map(p => ({ at: t.created_at, desc: 'Penjualan ' + t.id, in: num(p.amount), out: 0 }))),
        ...pos.filter(p => p.status !== 'unpaid').map(p => ({ at: p.created_at, desc: 'Bayar supplier ' + p.number, in: 0, out: num(p.paid) })),
        ...invs.filter(i => i.status !== 'unpaid').map(i => ({ at: i.created_at, desc: 'Pelunasan ' + i.number, in: num(i.paid), out: 0 })),
        ...manual.map(j => ({ at: j.date || j.created_at, desc: 'Jurnal: ' + j.description, in: num(j.debit), out: num(j.credit) }))
      ].sort((a, b) => new Date(b.at) - new Date(a.at));
      body.innerHTML = `<div class="grid c3">${statCard('Saldo Kas', fmt(saldo))}${statCard('Kas Masuk (penjualan)', fmt(cashIn + invCash))}${statCard('Kas Keluar (supplier)', fmt(cashOut))}</div>
        <div class="card" style="margin-top:14px"><h3>Buku Kas</h3><div id="list"></div></div>`;
      $('#list').appendChild(table({ cols: [
        { k: 'at', label: 'Tanggal', fmt: v => dstr(v) }, { k: 'desc', label: 'Keterangan' },
        { k: 'in', label: 'Masuk', fmt: v => v ? fmt(v) : '-', cls: 'num' },
        { k: 'out', label: 'Keluar', fmt: v => v ? fmt(v) : '-', cls: 'num' }], rows: mutasi, search: ['desc'], pageSize: 12 }));
    }
    if (tab === 'rek') {
      const tx = await DB.load('transactions');
      const methods = {};
      tx.forEach(t => (t.payments || []).forEach(p => { methods[p.method] = methods[p.method] || { method: p.method, count: 0, total: 0 };
        methods[p.method].count++; methods[p.method].total += num(p.amount); }));
      const rows = Object.values(methods);
      const nonCash = rows.filter(r => r.method !== 'cash').reduce((a, r) => a + r.total, 0);
      body.innerHTML = `<div class="grid c3">${statCard('Total Penerimaan Non-Tunai', fmt(nonCash))}${statCard('Penerimaan Tunai', fmt(rows.find(r => r.method === 'cash')?.total || 0))}${statCard('Total Transaksi', tx.length)}</div>
        <div class="card" style="margin-top:14px"><h3>Rekonsiliasi Penerimaan per Metode (QRIS / Debit / Transfer)</h3><div id="list"></div></div>`;
      $('#list').appendChild(table({ cols: [
        { k: 'method', label: 'Metode', fmt: v => v.toUpperCase() },
        { k: 'count', label: 'Jml Transaksi', cls: 'num' },
        { k: 'total', label: 'Total', fmt: v => fmt(v), cls: 'num' }], rows }));
    }
    if (tab === 'akun') {
      const fields = [
        { k: 'code', label: 'Kode Akun', required: true },
        { k: 'name', label: 'Nama Akun', required: true },
        { k: 'type', label: 'Tipe', type: 'select', opts: [{ v: 'asset', l: 'Aset' }, { v: 'liability', l: 'Liabilitas' }, { v: 'equity', l: 'Equitas' }, { v: 'revenue', l: 'Pendapatan' }, { v: 'expense', l: 'Beban' }] }];
      const load = async () => {
        const rows = await DB.load('finance').then(() => []); // placeholder no-op keep order
        void rows;
        const accs = await DB.load('accounts').catch(() => []);
        void accs;
        // accounts stored inside 'accounts' collection — but COLS has no 'accounts'; use finance collection for both journal & accounts? Simplify: accounts embedded in settings? -> keep in 'finance' split by kind
        body.innerHTML = `<div class="toolbar">${Auth.canPerm('create') ? '<button class="btn primary" id="add">+ Tambah Akun</button>' : ''}</div><div id="list"></div>`;
        const fin = await DB.load('finance'); const acc = fin.filter(x => x.kind === 'account'); const jur = fin.filter(x => x.kind === 'journal');
        $('#add') && ($('#add').onclick = () => formModal('Tambah Akun', fields, {}, async o => {
          fin.push({ id: uid('ACC'), kind: 'account', ...o }); await DB.save('finance', fin);
          audit('CREATE_ACCOUNT', 'FINANCE', o); toast('Akun tersimpan', 'success'); load(); }));
        const bal = t => jur.filter(j => j.account_id === t.id).reduce((a, j) => a + num(j.debit) - num(j.credit), 0);
        $('#list').appendChild(table({ cols: [
          { k: 'code', label: 'Kode' }, { k: 'name', label: 'Nama Akun' },
          { k: 'type', label: 'Tipe', fmt: v => ({ asset: 'ASET', liability: 'LIABILITAS', equity: 'EQUITAS', revenue: 'PENDAPATAN', expense: 'BEBAN' }[v] || v) },
          { k: 'id', label: 'Saldo', fmt: (v, r) => fmt(bal(r)), cls: 'num' }],
          rows: acc, search: ['name', 'code'],
          actions: r => [editAction('finance', 'Akun', fields, async () => load()).onClick({ ...r, _load: load })] }));
        // patch editAction to use custom loader
      };
      await load(); return;
    }
    if (tab === 'jurnal') {
      const fin = await DB.load('finance'); const accs = fin.filter(x => x.kind === 'account');
      if (!accs.length) { body.innerHTML = '<div class="emptybox">Buat akun terlebih dahulu di menu Daftar Akun.</div>'; return; }
      const fields = [
        { k: 'date', label: 'Tanggal', type: 'date', required: true },
        { k: 'account_id', label: 'Akun', type: 'select', opts: accs.map(a => ({ v: a.id, l: a.code + ' - ' + a.name })) },
        { k: 'debit', label: 'Debit (Rp)', type: 'number', def: 0 },
        { k: 'credit', label: 'Kredit (Rp)', type: 'number', def: 0 },
        { k: 'description', label: 'Keterangan', type: 'textarea' }];
      body.innerHTML = `<div class="toolbar">${Auth.canPerm('create') ? '<button class="btn primary" id="add">+ Jurnal Umum</button>' : ''}</div><div id="list"></div>`;
      const load = async () => {
        const f2 = await DB.load('finance'); const jur = f2.filter(x => x.kind === 'journal').slice().reverse();
        const list = $('#list'); list.innerHTML = '';
        list.appendChild(table({ cols: [
          { k: 'date', label: 'Tanggal', fmt: v => dshort(v) },
          { k: 'account_id', label: 'Akun', fmt: v => { const a = accs.find(x => x.id === v); return a ? a.code + ' - ' + a.name : v; } },
          { k: 'debit', label: 'Debit', fmt: v => v ? fmt(v) : '-', cls: 'num' },
          { k: 'credit', label: 'Kredit', fmt: v => v ? fmt(v) : '-', cls: 'num' },
          { k: 'description', label: 'Keterangan' }], rows: jur, search: ['description'], pageSize: 14 }));
      };
      $('#add').onclick = () => formModal('Jurnal Umum', fields, { date: new Date().toISOString().slice(0, 10) }, async o => {
        if (!num(o.debit) && !num(o.credit)) return toast('Isi debit atau kredit', 'error');
        const f2 = await DB.load('finance'); const acc = f2.find(x => x.id === o.account_id);
        f2.push({ id: uid('JUR'), kind: 'journal', ...o, account_name: acc?.name || '', created_at: nowISO() });
        await DB.save('finance', f2); audit('JOURNAL', 'FINANCE', o); toast('Jurnal tersimpan', 'success'); load();
      });
      await load(); return;
    }
    if (tab === 'lap') {
      const fin = await DB.load('finance'); const accs = fin.filter(x => x.kind === 'account'); const jur = fin.filter(x => x.kind === 'journal');
      const bal = a => jur.filter(j => j.account_id === a.id).reduce((x, j) => x + num(j.debit) - num(j.credit), 0);
      const groups = { asset: 'ASET', liability: 'LIABILITAS', equity: 'EQUITAS' };
      let html = '';
      Object.entries(groups).forEach(([k, label]) => {
        const rows = accs.filter(a => a.type === k);
        html += `<div class="card" style="margin-bottom:14px"><h3>${label}</h3>` + (rows.length ? table({ cols: [
          { k: 'code', label: 'Kode' }, { k: 'name', label: 'Akun' },
          { k: 'id', label: 'Saldo', fmt: (v, r) => fmt(bal(r)), cls: 'num' }], rows }).outerHTML : '<p style="color:var(--mut)">Belum ada akun</p>') + '</div>';
      });
      body.innerHTML = html;
    }
  }

  // ---------- REPORTS ----------
  const REPORTS = {
    ringkasan: { label: 'Ringkasan Penjualan' },
    detail: { label: 'Detail Penjualan' },
    bayar: { label: 'Laporan Jenis Bayar' },
    produk: { label: 'Laporan Produk' },
    pajak: { label: 'Laporan Pajak' },
    kasir: { label: 'Laporan Kasir' },
    pelanggan: { label: 'Laporan Pelanggan' },
    karyawan: { label: 'Laporan Karyawan' }
  };
  async function reportsPage(type = 'ringkasan') {
    shell(`<div class="pill-row" id="pills">${Object.entries(REPORTS).map(([k, v]) => `<button class="pill ${k === type ? 'on' : ''}" data-k="${k}">${v.label}</button>`).join('')}</div>
      <div class="toolbar"><label style="font-size:12.5px;color:var(--mut)">Dari</label><input class="inp" type="date" id="f" style="max-width:150px">
      <label style="font-size:12.5px;color:var(--mut)">Sampai</label><input class="inp" type="date" id="t" style="max-width:150px">
      <button class="btn primary" id="run">Terapkan Filter</button><span class="spacer"></span>
      <button class="btn" id="csv">Export CSV</button><button class="btn" id="json">Export JSON</button><button class="btn" id="print">Print / PDF</button></div>
      <div id="result"></div>`, 'reports', 'Laporan');
    $$('#pills .pill').forEach(p => p.onclick = () => reportsPage(p.dataset.k));
    const today = new Date(); const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
    $('#f').value = weekAgo.toISOString().slice(0, 10); $('#t').value = today.toISOString().slice(0, 10);
    let lastRows = [], lastCols = [], lastTitle = REPORTS[type].label;
    async function run() {
      const [tx, products, users, attendance, customers, sessions] = await Promise.all([
        DB.load('transactions'), DB.load('products'), DB.load('users'), DB.load('attendance'), DB.load('customers'), DB.load('cashier_sessions')]);
      const from = $('#f').value, to = $('#t').value;
      const inRange = t => { const d = (t.created_at || '').slice(0, 10); return (!from || d >= from) && (!to || d <= to); };
      const R = tx.filter(t => t.status !== 'void' && inRange(t));
      const res = $('#result'); lastTitle = REPORTS[type].label + ` (${from || '…'} s/d ${to || '…'})`;
      const head = h => `<div class="card"><h3>${esc(h)}</h3><div id="repbody"></div></div>`;
      res.innerHTML = head(lastTitle);
      const rb = $('#repbody');
      const finish = (cols, rows, totals) => { lastCols = cols; lastRows = rows;
        if (totals) rows = [...rows, { _t: 1, ...totals }];
        rb.appendChild(table({ cols, rows: rows.map(r => r._t ? { ...r, _isTotal: 1 } : r), search: cols.map(c => c.k), pageSize: 13 })); };
      void customers; void sessions;

      if (type === 'ringkasan') {
        const pendapatan = R.reduce((a, t) => a + num(t.subtotal), 0);
        const biayaPromo = R.reduce((a, t) => a + num(t.promotion), 0);
        const penjualan = R.reduce((a, t) => a + num(t.subtotal) - num(t.discount), 0);
        const bersih = R.reduce((a, t) => a + num(t.subtotal) - num(t.discount) - num(t.promotion), 0);
        const laba = R.reduce((a, t) => a + (t.items || []).reduce((x, i) => x + (num(i.price) - num(i.cost || 0)) * num(i.qty), 0) - num(t.promotion), 0);
        const pajak = R.reduce((a, t) => a + num(t.tax), 0);
        rb.innerHTML = `<div class="grid c3">
          ${statCard('Total Pendapatan', fmt(pendapatan))}${statCard('Biaya Promosi', fmt(biayaPromo))}${statCard('Total Penjualan', fmt(penjualan))}
          ${statCard('Penjualan Bersih', fmt(bersih))}${statCard('Total Laba Kotor', fmt(laba))}${statCard('Total Pajak', fmt(pajak))}</div>`;
        lastCols = []; lastRows = [{ 'Total Pendapatan': pendapatan, 'Biaya Promosi': biayaPromo, 'Total Penjualan': penjualan, 'Penjualan Bersih': bersih, 'Laba Kotor': laba, 'Pajak': pajak }];
      }
      if (type === 'detail') {
        const avail = [['id', 'No. Transaksi'], ['created_at', 'Tanggal'], ['cashier_name', 'Kasir'], ['customer_name', 'Pelanggan'],
          ['items', 'Item'], ['subtotal', 'Subtotal'], ['discount', 'Diskon'], ['promotion', 'Promo'], ['tax', 'Pajak'], ['total', 'Total'], ['method', 'Metode']];
        rb.insertAdjacentHTML('beforeend', `<div class="chkgrid" id="cols">${avail.map(([k, l], i) => `<label><input type="checkbox" value="${k}" ${i < 7 ? 'checked' : ''}> ${l}</label>`).join('')}</div><div id="tblwrap" style="margin-top:10px"></div>`);
        const render = () => {
          const ks = $$('#cols input:checked').map(i => i.value);
          const cols = avail.filter(([k]) => ks.includes(k)).map(([k, l]) => ({ k, label: l,
            fmt: k === 'created_at' ? v => dstr(v) : ['subtotal', 'discount', 'promotion', 'tax', 'total'].includes(k) ? v => fmt(v) : k === 'items' ? v => (v || []).length + ' item' : undefined }));
          $('#tblwrap').innerHTML = '';
          $('#tblwrap').appendChild(table({ cols, rows: R, search: ['id', 'cashier_name', 'customer_name'], pageSize: 12 }));
          lastCols = cols; lastRows = R.map(t => ({ id: t.id, created_at: t.created_at, cashier_name: t.cashier_name, customer_name: t.customer_name, subtotal: t.subtotal, discount: t.discount, promotion: t.promotion, tax: t.tax, total: t.total, method: (t.payments || []).map(p => p.method).join('+') }));
        };
        $$('#cols input').forEach(i => i.onchange = render); render();
      }
      if (type === 'bayar') {
        const m = {}; R.forEach(t => (t.payments || []).forEach(p => { m[p.method] = m[p.method] || { 'Metode': p.method.toUpperCase(), 'Jml Transaksi': 0, 'Total': 0 }; m[p.method]['Jml Transaksi']++; m[p.method]['Total'] += num(p.amount); }));
        finish([{ k: 'Metode', label: 'Metode' }, { k: 'Jml Transaksi', label: 'Jml Transaksi', cls: 'num' }, { k: 'Total', label: 'Total', fmt: v => fmt(v), cls: 'num' }],
          Object.values(m), { Metode: 'TOTAL', 'Jml Transaksi': Object.values(m).reduce((a, r) => a + r['Jml Transaksi'], 0), Total: Object.values(m).reduce((a, r) => a + r.Total, 0) });
      }
      if (type === 'produk') {
        const agg = {};
        R.forEach(t => (t.items || []).forEach(i => { agg[i.product_id] = agg[i.product_id] || { Produk: i.name, SKU: i.sku || '-', 'Qty Terjual': 0, Pendapatan: 0 }; agg[i.product_id]['Qty Terjual'] += num(i.qty); agg[i.product_id].Pendapatan += num(i.qty) * num(i.price); }));
        const rows = Object.values(agg).sort((a, b) => b['Qty Terjual'] - a['Qty Terjual']);
        rows.forEach((r, i) => r.Rank = i === 0 && r['Qty Terjual'] > 0 ? '🏆 Best Seller' : i < 3 && r['Qty Terjual'] > 0 ? 'Top ' + (i + 1) : '');
        finish([{ k: 'Rank', label: '' }, { k: 'Produk', label: 'Produk' }, { k: 'SKU', label: 'SKU' },
          { k: 'Qty Terjual', label: 'Qty', cls: 'num' }, { k: 'Pendapatan', label: 'Pendapatan', fmt: v => fmt(v), cls: 'num' }], rows, null);
        if (rows.length) rb.insertAdjacentHTML('beforeend', `<button class="btn sm" id="mkpromo" style="margin-top:10px">+ Buat Promo dari Best Seller</button>`),
          $('#mkpromo').onclick = () => location.hash = '#/promotions';
        void products;
      }
      if (type === 'pajak') {
        const rows = R.filter(t => num(t.tax) > 0).map(t => ({ 'No': t.id, 'Tanggal': dshort(t.created_at), 'DPP': num(t.subtotal) - num(t.discount) - num(t.promotion), 'PPN': num(t.tax) }));
        finish([{ k: 'No', label: 'No. Transaksi' }, { k: 'Tanggal', label: 'Tanggal' }, { k: 'DPP', label: 'DPP', fmt: v => fmt(v), cls: 'num' }, { k: 'PPN', label: 'PPN', fmt: v => fmt(v), cls: 'num' }],
          rows, rows.length ? { No: 'TOTAL', Tanggal: '', DPP: rows.reduce((a, r) => a + r.DPP, 0), PPN: rows.reduce((a, r) => a + r.PPN, 0) } : null);
      }
      if (type === 'kasir') {
        const agg = {}; R.forEach(t => { agg[t.cashier_id] = agg[t.cashier_id] || { Kasir: t.cashier_name, 'Jml Transaksi': 0, 'Total Penjualan': 0 }; agg[t.cashier_id]['Jml Transaksi']++; agg[t.cashier_id]['Total Penjualan'] += num(t.total); });
        const shifts = {};
        const ses = await DB.load('cashier_sessions'); void ses;
        finish([{ k: 'Kasir', label: 'Kasir' }, { k: 'Jml Transaksi', label: 'Jml Transaksi', cls: 'num' }, { k: 'Total Penjualan', label: 'Total Penjualan', fmt: v => fmt(v), cls: 'num' }],
          Object.values(agg), null);
        void shifts; void users;
      }
      if (type === 'pelanggan') {
        const agg = {};
        R.forEach(t => { const key = t.customer_id || 'umum'; agg[key] = agg[key] || { Pelanggan: t.customer_name || 'Umum', 'Jml Kunjungan': 0, 'Total Belanja': 0, 'Kunjungan Terakhir': t.created_at };
          agg[key]['Jml Kunjungan']++; agg[key]['Total Belanja'] += num(t.total); if (t.created_at > agg[key]['Kunjungan Terakhir']) agg[key]['Kunjungan Terakhir'] = t.created_at; });
        const rows = Object.values(agg);
        finish([{ k: 'Pelanggan', label: 'Pelanggan' }, { k: 'Jml Kunjungan', label: 'Kunjungan', cls: 'num' },
          { k: 'Total Belanja', label: 'Total Belanja', fmt: v => fmt(v), cls: 'num' },
          { k: 'Kunjungan Terakhir', label: 'Kunjungan Terakhir', fmt: v => dstr(v) }], rows, null);
      }
      if (type === 'karyawan') {
        const rows = attendance.filter(a => inRange({ created_at: a.date })).map(a => {
          const u = users.find(x => x.id === a.user_id);
          const jam = a.check_out ? ((new Date(a.check_out) - new Date(a.check_in)) / 3600000).toFixed(1) : '-';
          return { Nama: u?.name || a.user_name || a.user_id, Tanggal: dshort(a.date), 'Absen Masuk': a.check_in ? dstr(a.check_in).slice(11) : '-',
            'Absen Keluar': a.check_out ? dstr(a.check_out).slice(11) : '-', 'Jam Kerja': jam }; });
        finish([{ k: 'Nama', label: 'Nama' }, { k: 'Tanggal', label: 'Tanggal' }, { k: 'Absen Masuk', label: 'Masuk' }, { k: 'Absen Keluar', label: 'Keluar' }, { k: 'Jam Kerja', label: 'Jam Kerja', cls: 'num' }], rows, null);
      }
    }
    $('#run').onclick = run;
    $('#csv').onclick = () => lastRows.length ? exportCSV(lastRows, 'jivoo_' + type) : toast('Jalankan laporan dulu', 'warn');
    $('#json').onclick = () => lastRows.length ? (download('jivoo_' + type + '.json', JSON.stringify(lastRows, null, 2)), toast('JSON diunduh')) : toast('Jalankan laporan dulu', 'warn');
    $('#print').onclick = () => {
      if (!lastRows.length) return toast('Jalankan laporan dulu', 'warn');
      const cols = lastCols.length ? lastCols : Object.keys(lastRows[0]).map(k => ({ k, label: k }));
      printHTML(`<h2 style="font-size:15px">${esc(lastTitle)}</h2><p style="font-size:11px;color:#555">Dicetak: ${dstr(nowISO())} — JIVOO</p>
        <table><thead><tr>${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${lastRows.map(r => `<tr>${cols.map(c => `<td class="${typeof r[c.k] === 'number' ? 'num' : ''}">${typeof r[c.k] === 'number' ? fmt(r[c.k]) : esc(r[c.k] ?? '-')}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      audit('PRINT_REPORT', 'REPORTS', { type });
    };
    await run();
  }

  // ---------- ANALYTICS ----------
  async function analyticsPage() {
    shell('<div id="dv"></div>', 'analytics', 'Analisa');
    const [tx, products] = await Promise.all([DB.load('transactions'), DB.load('products')]);
    const R = tx.filter(t => t.status !== 'void');
    const hours = [...Array(24)].map((_, i) => i);
    const hourCount = hours.map(h => R.filter(t => new Date(t.created_at).getHours() === h).reduce((a, t) => a + num(t.total), 0));
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dayCount = days.map((_, d) => R.filter(t => new Date(t.created_at).getDay() === d).reduce((a, t) => a + num(t.total), 0));
    const agg = {};
    R.forEach(t => (t.items || []).forEach(i => { agg[i.product_id] = agg[i.product_id] || { name: i.name, qty: 0, rev: 0 }; agg[i.product_id].qty += num(i.qty); agg[i.product_id].rev += num(i.qty) * num(i.price); }));
    const sorted = Object.values(agg).sort((a, b) => b.qty - a.qty);
    const top = sorted.slice(0, 8); const slow = products.filter(p => p.status === 'active' && !agg[p.id]).slice(0, 8);
    $('#dv').innerHTML = `
      <div class="grid c2">
        <div class="card"><h3>Jam Paling Ramai</h3><canvas class="chart" id="c1"></canvas></div>
        <div class="card"><h3>Hari Paling Ramai</h3><canvas class="chart" id="c2"></canvas></div>
      </div>
      <div class="grid c2" style="margin-top:14px">
        <div class="card"><h3>Produk Terlaris (qty)</h3>${top.length ? '<canvas class="chart" id="c3"></canvas>' : '<p style="color:var(--mut)">Belum ada data penjualan</p>'}</div>
        <div class="card"><h3>Produk Paling Jarang Terjual</h3>${slow.length ? table({ cols: [
          { k: 'name', label: 'Produk' }, { k: 'category', label: 'Kategori' }, { k: 'stock', label: 'Stok', cls: 'num' }], rows: slow, pageSize: 8 }).outerHTML : '<p style="color:var(--mut)">Semua produk pernah terjual 👍</p>'}</div>
      </div>
      <div class="card" style="margin-top:14px"><h3>Kepuasan Pelanggan (estimasi dari transaksi member & repeat order)</h3>
        <div class="grid c3">${(() => { const cust = {}; R.forEach(t => { if (!t.customer_id) return; cust[t.customer_id] = (cust[t.customer_id] || 0) + 1; });
          const repeat = Object.values(cust).filter(c => c > 1).length; const total = Object.keys(cust).length || 1;
          const rate = Math.min(98, Math.round(70 + (repeat / total) * 28));
          return statCard('Rating Kepuasan', rate + '%', 'estimasi repeat-order') + statCard('Pelanggan Repeat Order', repeat, 'dari ' + total + ' pelanggan') + statCard('Rata-rata Transaksi', fmt(R.length ? R.reduce((a, t) => a + num(t.total), 0) / R.length : 0));
        })()}</div></div>`;
    chart($('#c1'), { labels: hours, data: hourCount, color: '#2563eb' });
    chart($('#c2'), { labels: days, data: dayCount, color: '#06b6d4' });
    if (top.length) chart($('#c3'), { labels: top.map(t => t.name), data: top.map(t => t.qty), horizontal: true, color: '#2563eb' });
  }

  // ---------- USERS & ROLES ----------
  const MODULES_LIST = ['dashboard', 'reports', 'analytics', 'products', 'categories', 'inventory', 'suppliers', 'purchase_orders', 'customers', 'promotions', 'commissions', 'invoices', 'finance', 'accounts', 'employees', 'attendance', 'cashier', 'users', 'roles', 'settings'];
  const PERMS_LIST = ['view', 'create', 'update', 'delete', 'export', 'approve', 'void', 'manage_settings'];
  async function usersPage() {
    shell(`<div class="toolbar">${Auth.canPerm('create') ? '<button class="btn primary" id="add">+ Tambah User</button>' : ''}
      <button class="btn" id="rolebtn">Kelola Role</button></div><div id="list"></div>`, 'users', 'User & Role');
    $('#rolebtn').onclick = rolesPage;
    const roles = await DB.load('roles');
    async function load() {
      const rows = (await DB.load('users')).map(u => ({ ...u, role_label: (roles.find(r => r.id === u.role_id) || {}).label || u.role_id }));
      const list = $('#list'); list.innerHTML = '';
      list.appendChild(table({ cols: [
        { k: 'name', label: 'Nama' }, { k: 'username', label: 'Username' }, { k: 'role_label', label: 'Role' },
        { k: 'last_login', label: 'Login Terakhir', fmt: v => dstr(v) },
        { k: 'status', label: 'Status', fmt: v => badge(v, PES) }],
        rows, search: ['name', 'username'],
        actions: r => [
          { label: 'Edit', onClick: () => userForm(r, load) },
          { label: 'Reset Password', onClick: async () => { const p = await promptDlg('Password baru untuk ' + r.username + ':'); if (!p) return;
            const us = await DB.load('users'); us.find(x => x.id === r.id).password_hash = await JV.hash(p); await DB.save('users', us); toast('Password direset', 'success'); } },
          { label: r.status === 'active' ? 'Nonaktifkan' : 'Aktifkan', cls: 'danger', onClick: async () => {
            if (!await UI.confirm('Ubah status user?')) return;
            const us = await DB.load('users'); const u = us.find(x => x.id === r.id); u.status = u.status === 'active' ? 'inactive' : 'active';
            await DB.save('users', us); audit('TOGGLE_USER', 'USER', { id: r.id }); toast('Status diperbarui', 'success'); load(); } }] }));
    }
    async function userForm(u, reload) {
      const isNew = !u;
      const settings = await getSettings();
      const outlets = settings.outlets || [{ id: 'OUTLET_1', name: 'Outlet Pusat' }];
      const body = document.createElement('div'); body.className = 'frm';
      const roleOpts = roles.map(r => ({ v: r.id, l: r.label + ' (' + r.name + ')' }));
      body.innerHTML = `
        <label class="flab">Nama</label><input class="inp" id="n" value="${esc(u?.name || '')}">
        <label class="flab">Username</label><input class="inp" id="un" value="${esc(u?.username || '')}">
        <label class="flab">Email</label><input class="inp" id="em" value="${esc(u?.email || '')}">
        ${isNew ? '<label class="flab">Password</label><input class="inp" type="password" id="pw">' : ''}
        <label class="flab">PIN Kasir (4-6 digit, opsional)</label><input class="inp" id="pin" maxlength="6" value="">
        <label class="flab">Role</label><select class="inp" id="ro">${roleOpts.map(o => `<option value="${o.v}" ${u?.role_id === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>
        <label class="flab">Outlet</label><select class="inp" id="ou">${outlets.map(o => `<option value="${o.id}" ${u?.outlet_id === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>
        <label class="flab">Module Access khusus (kosongkan = ikut role)</label><div class="chkgrid" id="md">${MODULES_LIST.map(m => `<label><input type="checkbox" value="${m}" ${u?.modules?.includes(m) ? 'checked' : ''}> ${m}</label>`).join('')}</div>
        <label class="chk" style="margin-top:12px"><input type="checkbox" id="st" ${u?.status !== 'inactive' ? 'checked' : ''}> Aktif</label>`;
      modal({ title: isNew ? 'Tambah User' : 'Edit User', body, actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', onClick: async () => {
        const name = $('#n', body).value.trim(), un = $('#un', body).value.trim();
        if (!name || !un) return toast('Nama & username wajib', 'error'), false;
        const us = await DB.load('users');
        if (isNew && us.some(x => x.username === un)) return toast('Username sudah dipakai', 'error'), false;
        const mods = $$('#md input:checked', body).map(i => i.value);
        const pin = $('#pin', body).value.trim();
        if (isNew) { if (!$('#pw', body).value) return toast('Password wajib', 'error'), false;
          us.push({ id: uid('USER'), client_id: Auth.user().client_id, name, username: un, email: $('#em', body).value,
            password_hash: await JV.hash($('#pw', body).value), pin_hash: pin ? await JV.hash(pin) : '', role_id: $('#ro', body).value,
            outlet_id: $('#ou', body).value, permissions: [], modules: mods, status: $('#st', body).checked ? 'active' : 'inactive', last_login: null }); }
        else { const x = us.find(y => y.id === u.id); Object.assign(x, { name, username: un, email: $('#em', body).value, role_id: $('#ro', body).value,
            outlet_id: $('#ou', body).value, modules: mods, status: $('#st', body).checked ? 'active' : 'inactive' });
          if (pin) x.pin_hash = await JV.hash(pin); }
        await DB.save('users', us); audit(isNew ? 'CREATE_USER' : 'UPDATE_USER', 'USER', { username: un });
        toast('User tersimpan', 'success'); reload();
      } }] });
    }
    $('#add').onclick = () => userForm(null, load);
    await load();
  }
  async function rolesPage() {
    const roles = await DB.load('roles');
    const b = document.createElement('div');
    b.innerHTML = roles.map(r => `<div class="card" style="margin-bottom:10px;box-shadow:none"><b>${esc(r.label)}</b> <span class="badge gray">${esc(r.name)}</span>
      <div style="font-size:12px;color:var(--mut);margin-top:6px">Permission: ${(r.permissions || []).join(', ') || '-'}</div>
      <div style="font-size:12px;color:var(--mut)">Module: ${r.modules === 'ALL' ? 'SEMUA' : (r.modules || []).join(', ') || '-'}</div></div>`).join('');
    modal({ title: 'Role & Permission (default system)', body: b, wide: true, actions: [{ label: 'Tutup' }] });
  }

  // ---------- SETTINGS ----------
  async function settingsPage() {
    const s = await getSettings();
    shell(`<div class="grid c2"><div class="card"><h3>Profil Bisnis</h3>
      <label class="flab">Nama Bisnis</label><input class="inp" id="pname" value="${esc(s.profile.name || '')}">
      <label class="flab">Brand</label><input class="inp" id="pbrand" value="${esc(s.profile.brand || '')}">
      <label class="flab">Alamat (tampil di struk)</label><textarea class="inp" id="paddr">${esc(s.profile.address || '')}</textarea>
      <label class="flab">Telepon</label><input class="inp" id="pphone" value="${esc(s.profile.phone || '')}">
      <button class="btn primary" id="savep" style="margin-top:14px">Simpan Profil</button></div>
      <div class="card"><h3>Transaksi & Struk</h3>
      <label class="flab">Pajak (PPN) default</label><input class="inp" type="number" step="0.01" id="tax" value="${s.tax_rate}">
      <label class="flab">Footer Struk</label><input class="inp" id="foot" value="${esc(s.receipt_footer || '')}">
      <label class="flab">Outlet (satu per baris: Nama|Alamat)</label><textarea class="inp" id="outlets" rows="4">${(s.outlets || []).map(o => esc(o.name) + '|' + esc(o.address || '')).join('\n')}</textarea>
      <button class="btn primary" id="savet" style="margin-top:14px">Simpan Pengaturan</button>
      <button class="btn" id="flush" style="margin-top:10px">Sinkron Sekarang</button></div></div>`, 'settings', 'Pengaturan');
    $('#savep').onclick = async () => { await setSetting('profile', { name: $('#pname').value, brand: $('#pbrand').value, address: $('#paddr').value, phone: $('#pphone').value });
      toast('Profil tersimpan', 'success'); };
    $('#savet').onclick = async () => {
      await setSetting('tax_rate', num($('#tax').value)); await setSetting('receipt_footer', $('#foot').value);
      await setSetting('outlets', $('#outlets').value.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => { const [n, a] = l.split('|'); return { id: 'OUTLET_' + (i + 1), name: n.trim(), address: (a || '').trim() }; }));
      toast('Pengaturan tersimpan', 'success'); };
    $('#flush').onclick = async () => { const ok = await DB.flush(); toast(ok ? 'Tersinkron dengan server' : 'Gagal / offline', ok ? 'success' : 'error'); };
  }

  // ---------- AUDIT ----------
  async function auditPage() {
    shell('<div id="list"></div>', 'audit', 'Audit Log');
    const logs = (await DB.load('audit_logs')).slice().reverse();
    $('#list').appendChild(table({ cols: [
      { k: 'timestamp', label: 'Waktu', fmt: v => dstr(v) },
      { k: 'action', label: 'Aksi' }, { k: 'module', label: 'Module' },
      { k: 'user_id', label: 'User' }, { k: 'metadata', label: 'Detail', fmt: v => esc(JSON.stringify(v)) }],
      rows: logs, search: ['action', 'module'], pageSize: 18 }));
  }

  // ---------- 403 ----------
  const forbidden = () => shell('<div class="emptybox"><h2>403 — Access Denied</h2><p>Anda tidak memiliki akses ke module ini.</p></div>', '', '403');

  // ---------- ROUTER ----------
  const routes = {
    dashboard, products: productsPage, categories: categoriesPage, inventory: () => inventoryPage('stok'),
    customers: customersPage, promotions: promotionsPage, invoices: invoicesPage, finance: () => financePage('kas'),
    reports: () => reportsPage('ringkasan'), analytics: analyticsPage, users: usersPage, settings: settingsPage,
    audit: auditPage, 403: forbidden
  };
  const MODULE_GUARD = { dashboard: 'dashboard', products: 'products', categories: 'products', inventory: 'inventory',
    customers: 'customers', promotions: 'promotions', invoices: 'invoices', finance: 'finance',
    reports: 'reports', analytics: 'analytics', users: 'users', settings: 'settings', audit: 'settings' };
  function route() {
    const h = (location.hash || '#/dashboard').replace('#/', '') || 'dashboard';
    if (!Auth.isLogged()) return loginPage();
    const [page, arg] = h.split('/');
    if (page === 'login') return loginPage();
    if (!routes[page]) { location.hash = '#/dashboard'; return; }
    const need = MODULE_GUARD[page];
    if (need && !Auth.canModule(need) && !(Auth.user().modules === 'ALL')) return Auth.guard() && forbidden();
    Auth.guard() && routes[page](arg);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('online', () => toast('Kembali online — data disinkronkan', 'success'));
  window.addEventListener('offline', () => toast('Mode offline — perubahan disimpan lokal', 'warn'));
  route();
})();