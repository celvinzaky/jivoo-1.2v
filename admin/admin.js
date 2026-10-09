// JIVOO Admin app
(() => {
  const { $, esc, fmt, dstr, dshort, uid, nowISO, api, DB } = JV;
  const { toast, modal, confirm, formModal, table, statCard, chart, printHTML } = UI;
  const app = $('#app');

  const Icons = {
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    clients: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>'
  };

  function shell(content, active) {
    const u = Auth.user() || {};
    app.innerHTML = `<div class="shell">
      <aside class="side" id="side">
        <div class="brand"><img src="/assets/logo.png" onerror="this.style.display='none'" alt=""><b>JIVOO</b></div>
        <button class="navi ${active==='dash'?'on':''}" data-go="#/dashboard">${Icons.dash} Dashboard</button>
        <button class="navi ${active==='clients'?'on':''}" data-go="#/clients">${Icons.clients} Client Management</button>
        <div style="flex:1"></div>
        <button class="navi" id="btnLogout">${Icons.out} Keluar</button>
      </aside>
      <main class="main">
        <div class="topbar"><div style="display:flex;align-items:center;gap:12px"><button class="menu-toggle" id="mt">☰</button><div><h1 id="pgtitle"></h1><div class="sub">JIVOO Platform Administration</div></div></div>
        <div class="userchip"><span class="avatar">${esc((u.name||'A')[0])}</span>${esc(u.name||'')} <span class="badge blue">SUPER ADMIN</span></div></div>
        ${content}
      </main></div>`;
    $$('.navi[data-go]').forEach(b => b.onclick = () => location.hash = b.dataset.go);
    $('#btnLogout').onclick = async () => { if (await UI.confirm('Keluar dari panel admin?')) Auth.logout(); };
    $('#mt').onclick = () => $('#side').classList.toggle('open');
  }
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const setTitle = t => { const e = $('#pgtitle'); if (e) e.textContent = t; };
  const statusBadge = s => s === 'active' ? '<span class="badge green">AKTIF</span>' : s === 'suspended' ? '<span class="badge amber">SUSPENDED</span>' : '<span class="badge red">NONAKTIF</span>';

  // ---------- LOGIN ----------
  function loginPage() {
    app.innerHTML = `<div class="login-wrap"><div class="login-card">
      <img src="/assets/logo.png" onerror="this.style.display='none'" alt="JIVOO">
      <h2>JIVOO Admin</h2><p>Panel Super Administrator</p>
      <form id="f">
        <label class="flab">Username / Email</label><input class="inp" name="username" required autocomplete="username">
        <label class="flab">Kata Sandi</label><input class="inp" type="password" name="password" required autocomplete="current-password">
        <button class="btn primary">Masuk</button>
      </form>
      <div class="hint">Demo: <b>admin</b> / <b>jivooadmin123</b></div></div></div>`;
    $('#f').onsubmit = async e => { e.preventDefault();
      const fd = new FormData(e.target);
      try { await Auth.login('admin', { username: fd.get('username').trim(), password: fd.get('password') });
        toast('Selamat datang, Admin', 'success'); location.hash = '#/dashboard'; route();
      } catch (err) { toast(err.message, 'error'); } };
  }

  // ---------- DASHBOARD ----------
  async function dashboard() {
    shell('', 'dash'); setTitle('Dashboard');
    $('.main').insertAdjacentHTML('beforeend', `<div id="dv"><p style="color:var(--mut)">Memuat data...</p></div>`);
    let d; try { d = await api('/api/admin/overview'); } catch (e) { $('#dv').innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
    const growth = d.clients.map(c => ({ l: dshort(c.created_at), v: 1 }));
    const byDay = {}; d.clients.forEach(c => { const k = dshort(c.created_at); byDay[k] = (byDay[k] || 0) + 1; });
    const gLabels = Object.keys(byDay).slice(-14), gData = gLabels.map(k => byDay[k]);
    const txByClient = d.clients.map(c => ({ l: c.brand || c.name, v: c.tx_count }));
    $('#dv').innerHTML = `
      <div class="grid c4">
        ${statCard('Total Client', d.total_client, `${d.active} aktif · ${d.inactive} nonaktif`)}
        ${statCard('Total User', d.total_user, 'seluruh client')}
        ${statCard('Total Transaksi', d.total_tx.toLocaleString('id-ID'), 'platform-wide')}
        ${statCard('Client Aktif', d.active, 'status aktif saat ini')}
      </div>
      <div class="grid c2" style="margin-top:14px">
        <div class="card"><h3>Pertumbuhan Client (per tanggal daftar)</h3><canvas class="chart" id="ch1"></canvas></div>
        <div class="card"><h3>Aktivitas Transaksi per Client</h3><canvas class="chart" id="ch2"></canvas></div>
      </div>
      <div class="grid c2" style="margin-top:14px">
        <div class="card"><h3>Client Terbaru</h3><div id="recent"></div></div>
        <div class="card"><h3>Log Aktivitas Platform</h3><ul class="loglist" id="logs"></ul></div>
      </div>`;
    if (gLabels.length) chart($('#ch1'), { labels: gLabels, data: gData, type: 'line', color: '#2563eb' });
    else $('#ch1').replaceWith('<p class="empty" style="color:var(--mut);padding:20px">Belum ada client</p>');
    const top = [...txByClient].sort((a, b) => b.v - a.v).slice(0, 8);
    top.length ? chart($('#ch2'), { labels: top.map(t => t.l), data: top.map(t => t.v), horizontal: true, color: '#06b6d4' })
               : $('#ch2').replaceWith('<p style="color:var(--mut);padding:20px">Belum ada transaksi</p>');
    $('#recent').innerHTML = [...d.clients].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
      .map(c => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px">
        <span><b>${esc(c.brand || c.name)}</b> <span style="color:var(--mut)">· ${esc(c.owner_name || '')}</span></span>${statusBadge(c.status)}</div>`).join('') || '<p style="color:var(--mut)">Belum ada client</p>';
    $('#logs').innerHTML = d.logs.slice(0, 12).map(l => `<li><span class="t">${dstr(l.timestamp)}</span><span><b>${esc(l.action)}</b> <span style="color:var(--mut)">${esc(l.module)}</span></span></li>`).join('') || '<li style="color:var(--mut)">Belum ada aktivitas</li>';
  }

  // ---------- CLIENTS ----------
  async function clientsPage() {
    shell('', 'clients'); setTitle('Client Management');
    $('.main').insertAdjacentHTML('beforeend', `<div class="toolbar">
      <button class="btn primary" id="add">+ Buat Client Baru</button>
      <button class="btn" id="ref">Refresh</button><span class="spacer"></span>
      <span style="color:var(--mut);font-size:12.5px" id="cnt"></span></div><div id="list"></div>`);
    async function load() {
      const d = await api('/api/admin/overview'); $('#cnt').textContent = `${d.total_client} client · ${d.active} aktif`;
      const el = table({
        cols: [
          { k: 'name', label: 'Perusahaan / Brand', fmt: (v, r) => `<b>${esc(r.brand || v)}</b><br><span style="color:var(--mut);font-size:12px">${esc(v)}</span>` },
          { k: 'owner_name', label: 'Owner' },
          { k: 'email', label: 'Email' },
          { k: 'user_count', label: 'User', cls: 'num' },
          { k: 'tx_count', label: 'Transaksi', cls: 'num' },
          { k: 'tx_total', label: 'Total Penjualan', fmt: v => fmt(v), cls: 'num' },
          { k: 'last_activity', label: 'Aktivitas Terakhir', fmt: v => `<span style="color:var(--mut);font-size:12px">${dstr(v)}</span>` },
          { k: 'status', label: 'Status', fmt: v => statusBadge(v) }
        ],
        rows: d.clients, search: ['name', 'brand', 'owner_name', 'email'],
        actions: r => [
          { label: 'Detail', onClick: () => location.hash = '#/clients/' + r.id },
          { label: 'Backup', onClick: () => backup(r) },
          r.status === 'active'
            ? { label: 'Nonaktifkan', cls: 'danger', onClick: () => setStatus(r, 'inactive') }
            : { label: 'Aktifkan', cls: 'primary', onClick: () => setStatus(r, 'active') }
        ],
        onRow: r => location.hash = '#/clients/' + r.id
      });
      const list = $('#list'); list.innerHTML = ''; list.appendChild(el);
    }
    async function setStatus(r, status) {
      const msg = status === 'active' ? `Aktifkan kembali client "${r.brand || r.name}"?` : `Nonaktifkan client "${r.brand || r.name}"? Seluruh user tidak bisa login. Data TIDAK akan dihapus.`;
      if (!await UI.confirm(msg)) return;
      try { await api('/api/admin/clients/' + r.id, { method: 'PATCH', body: { status } });
        toast('Status client diperbarui', 'success'); load(); } catch (e) { toast(e.message, 'error'); }
    }
    async function backup(r) {
      try { toast('Menyiapkan backup...'); const b = await api('/api/admin/clients/' + r.id + '/backup');
        JV.download(`JIVOO_backup_${(r.brand || r.name).replace(/\W+/g, '_')}.json`, JSON.stringify(b, null, 2));
        toast('Backup diunduh (seluruh data client)', 'success'); } catch (e) { toast(e.message, 'error'); }
    }
    $('#add').onclick = () => formModal('Buat Client Baru (otomatis membuat file JSON data client)', [
      { k: 'company', label: 'Nama Perusahaan', required: true },
      { k: 'brand', label: 'Nama Brand' },
      { k: 'owner', label: 'Nama Owner', required: true },
      { k: 'email', label: 'Email', type: 'email', required: true },
      { k: 'username', label: 'Username Owner', required: true },
      { k: 'password', label: 'Password Owner', type: 'password', required: true },
      { k: 'phone', label: 'No. Telepon (opsional)' },
      { k: 'outlets', label: 'Jumlah Outlet', type: 'number', def: 1 },
      { k: 'package', label: 'Package', type: 'select', opts: [{ v: 'basic', l: 'Basic' }, { v: 'pro', l: 'Pro' }, { v: 'enterprise', l: 'Enterprise' }] }
    ], {}, async o => {
      try { const r = await api('/api/admin/clients', { method: 'POST', body: o });
        toast(`Client "${r.company.name}" dibuat + file JSON otomatis dibuat`, 'success'); load();
      } catch (e) { toast(e.message, 'error'); }
    });
    $('#ref').onclick = load;
    load().catch(e => { $('#list').innerHTML = `<div class="card">${esc(e.message)}</div>`; });
  }

  // ---------- CLIENT DETAIL ----------
  async function clientDetail(id) {
    shell('', 'clients'); setTitle('Detail Client');
    let d; try { d = await api('/api/admin/clients/' + id); } catch (e) { app.innerHTML = `<div class="login-wrap"><div class="login-card"><h2>${esc(e.message)}</h2><br><a href="#/clients">← Kembali</a></div></div>`; return; }
    const c = d.company;
    $('.main').insertAdjacentHTML('beforeend', `
      <div class="card detail-head">
        <div class="logo-lg">${esc((c.brand || c.name || '?')[0].toUpperCase())}</div>
        <div style="flex:1;min-width:200px"><h3 style="margin:0">${esc(c.brand || c.name)} <span style="font-weight:400;color:var(--mut);font-size:13px">${esc(c.name)}</span></h3>
          <div style="color:var(--mut);font-size:12.5px;margin-top:4px">Owner: ${esc(c.owner_name)} · ${esc(c.email)} · ${esc(c.phone || '-')} · Package: ${esc(c.package || '-')} · Daftar: ${dstr(c.created_at)}</div></div>
        ${statusBadge(c.status)}
        <button class="btn" id="bk">Download Backup</button>
        <button class="btn ${c.status === 'active' ? 'danger' : 'primary'}" id="st">${c.status === 'active' ? 'Nonaktifkan Client' : 'Aktifkan Client'}</button>
        <a class="btn ghost" href="#/clients">← Kembali</a>
      </div>
      <div class="grid c3" style="margin-top:14px">
        ${statCard('Total User', d.users.length)}${statCard('Total Transaksi', d.tx_count.toLocaleString('id-ID'))}${statCard('Total Penjualan', fmt(d.tx_total))}
      </div>
      <div class="grid c2" style="margin-top:14px">
        <div class="card"><h3>User Client</h3><div id="users"></div></div>
        <div class="card"><h3>Aktivitas Terakhir (Audit Log)</h3><ul class="loglist" id="logs"></ul></div>
      </div>`);
    $('#users').appendChild(table({ cols: [
      { k: 'name', label: 'Nama' }, { k: 'username', label: 'Username' }, { k: 'role_id', label: 'Role' },
      { k: 'last_login', label: 'Login Terakhir', fmt: v => `<span style="color:var(--mut);font-size:12px">${dstr(v)}</span>` },
      { k: 'status', label: 'Status', fmt: v => v === 'active' ? '<span class="badge green">AKTIF</span>' : '<span class="badge red">NONAKTIF</span>' }
    ], rows: d.users, search: ['name', 'username'] }));
    $('#logs').innerHTML = d.logs.slice(0, 20).map(l => `<li><span class="t">${dstr(l.timestamp)}</span><span><b>${esc(l.action)}</b> <span style="color:var(--mut)">${esc(l.module)} · ${esc((d.users.find(u => u.id === l.user_id) || {}).name || l.user_id || '')}</span></span></li>`).join('') || '<li style="color:var(--mut)">Belum ada log</li>';
    $('#bk').onclick = async () => { try { const b = await api(`/api/admin/clients/${id}/backup`);
      JV.download(`JIVOO_backup_${(c.brand || c.name).replace(/\W+/g, '_')}.json`, JSON.stringify(b, null, 2)); toast('Backup diunduh', 'success'); } catch (e) { toast(e.message, 'error'); } };
    $('#st').onclick = async () => { const st = c.status === 'active' ? 'inactive' : 'active';
      if (!await UI.confirm(st === 'inactive' ? 'Nonaktifkan client? Semua user tidak bisa login. Data tidak dihapus.' : 'Aktifkan client kembali?')) return;
      try { await api('/api/admin/clients/' + id, { method: 'PATCH', body: { status: st } }); toast('Status diperbarui', 'success'); clientDetail(id); } catch (e) { toast(e.message, 'error'); } };
  }

  // ---------- ROUTER ----------
  function route() {
    const h = location.hash || '#/dashboard';
    if (!Auth.isLogged()) return loginPage();
    if (h === '#/login') return loginPage();
    if (h === '#/dashboard') return Auth.guard() && dashboard();
    if (h === '#/clients') return Auth.guard() && clientsPage();
    if (h.startsWith('#/clients/')) return Auth.guard() && clientDetail(h.split('/')[2]);
    location.hash = '#/dashboard';
  }
  window.addEventListener('hashchange', route);
  route();
})();968