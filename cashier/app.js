// JIVOO Cashier PWA app
(() => {
  const { $, esc, fmt, num, dstr, uid, nowISO, api, DB, store } = JV;
  const { toast, modal, confirm, promptDlg } = UI;
  const app = $('#app');
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const METHODS = ['cash', 'qris', 'debit', 'transfer', 'deposit', 'compliment'];
  const MLABEL = { cash: 'TUNAI', qris: 'QRIS', debit: 'DEBIT', transfer: 'TRANSFER', deposit: 'DEPOSIT', compliment: 'COMPLIMENT' };
  let cart = [], customer = null, manualDisc = 0, couponCode = '', shift = store.get('jv_shift', null);

  const today = () => new Date().toISOString().slice(0, 10);
  const getShift = () => shift;
  function syncBadge() {
    const off = !navigator.onLine, pend = DB.dirty.size;
    return `<span class="syncbadge ${off ? 'off' : pend ? 'pend' : ''}" id="syncbadge">${off ? '● Offline' : pend ? `● ${pend} pending` : '● Synced'}</span>`;
  }
  async function markSynced() { // tandai transaksi lokal sudah terkirim
    const ok = await DB.flush(); if (!ok) return;
    const tx = await DB.load('transactions');
    if (tx.some(t => !t.synced)) { tx.forEach(t => t.synced = true); await DB.save('transactions', tx); }
    return ok;
  }
  window.addEventListener('online', async () => { toast('Online — menyinkronkan transaksi...', 'success'); await markSynced(); updateBadge(); });
  window.addEventListener('offline', () => { toast('Offline — transaksi tetap tersimpan lokal', 'warn'); updateBadge(); });
  function updateBadge() { const b = $('#syncbadge'); if (!b) return; const off = !navigator.onLine, pend = DB.dirty.size;
    b.className = 'syncbadge ' + (off ? 'off' : pend ? 'pend' : ''); b.textContent = off ? '● Offline' : pend ? `● ${pend} pending` : '● Synced'; }
  document.addEventListener('jv:synced', updateBadge);

  // ================= LOGIN =================
  function loginPage() {
    app.innerHTML = `<div class="login-wrap"><div class="login-card">
      <img src="/assets/logo.png" onerror="this.style.display='none'" alt="JIVOO">
      <h2>JIVOO Kasir</h2><p>Masuk untuk memulai shift</p>
      <div class="seg"><button id="tabU" class="on">Username</button><button id="tabP">PIN</button></div>
      <div id="lform"></div>
      <div class="hint">Demo: <b>kasir1 / kasir123</b> atau PIN <b>1234</b></div></div></div>`;
    const lf = $('#lform');
    const formU = () => { lf.innerHTML = `<form id="f">
      <label class="flab">Username / Email</label><input class="inp" name="username" required autocomplete="username">
      <label class="flab">Password</label><input class="inp" type="password" name="password" required autocomplete="current-password">
      <button class="btn primary lg">Masuk</button></form>`;
      $('#f').onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target);
        try { await doLogin({ username: fd.get('username').trim(), password: fd.get('password') }); } catch (err) { toast(err.message, 'error'); } }; };
    const formP = () => { let pin = '';
      lf.innerHTML = `<div class="pinval" id="pv">${'<i></i>'.repeat(6)}</div><div class="pin" id="pad">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button data-n="${n}">${n}</button>`).join('')}
        <button class="clr" data-n="C">C</button><button data-n="0">0</button><button class="ok" data-n="OK">✓</button></div>`;
      const draw = () => $$('#pv i').forEach((el, i) => el.classList.toggle('f', i < pin.length));
      $$('#pad button').forEach(b => b.onclick = async () => { const n = b.dataset.n;
        if (n === 'C') pin = ''; else if (n === 'OK') { if (pin.length < 4) return toast('PIN minimal 4 digit', 'error');
          try { await doLogin({ pin }); } catch (err) { toast(err.message, 'error'); pin = ''; } }
        else if (pin.length < 6) pin += n; draw(); }); };
    $('#tabU').onclick = () => { $('#tabU').classList.add('on'); $('#tabP').classList.remove('on'); formU(); };
    $('#tabP').onclick = () => { $('#tabP').classList.add('on'); $('#tabU').classList.remove('on'); formP(); };
    formU();
  }
  async function doLogin(creds) {
    const u = await Auth.login('client', creds);
    if (!Auth.canModule('cashier')) { Auth.logout(); throw new Error('Akun ini tidak punya akses kasir'); }
    await DB.pull().catch(() => {});
    toast('Selamat datang, ' + u.name, 'success');
    shift = store.get('jv_shift', null);
    if (shift && shift.user_id === u.id) posPage(); else openShiftPage();
  }

  // ================= OPEN SHIFT =================
  async function openShiftPage() {
    const s = await settings();
    const outlets = s.outlets || [{ id: 'OUTLET_1', name: 'Outlet Pusat' }];
    app.innerHTML = `<div class="login-wrap"><div class="login-card">
      <img src="/assets/logo.png" onerror="this.style.display='none'" alt="">
      <h2>Buka Kasir</h2><p>${esc(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
      <form id="f">
      <label class="flab">Outlet</label><select class="inp" name="outlet">${outlets.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select>
      <label class="flab">Shift</label><select class="inp" name="shift"><option value="1">Shift 1</option><option value="2">Shift 2</option><option value="3">Shift 3</option></select>
      <label class="flab">Modal Awal (Rp)</label><input class="inp" type="number" name="modal" value="0" min="0">
      <button class="btn primary lg">Buka & Mulai Jualan</button>
      <button type="button" class="btn ghost lg" id="back">← Ganti Akun</button></form></div></div>`;
    $('#back').onclick = () => Auth.logout();
    $('#f').onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target);
      shift = { id: uid('SHIFT'), user_id: Auth.user().id, cashier_name: Auth.user().name,
        outlet_id: fd.get('outlet'), outlet_name: outlets.find(o => o.id === fd.get('outlet'))?.name || '',
        shift_no: fd.get('shift'), opening_cash: num(fd.get('modal')), opened_at: nowISO(), closed_at: null, device: navigator.userAgent.slice(0, 60) };
      const ses = await DB.load('cashier_sessions'); ses.push(shift); await DB.save('cashier_sessions', ses);
      await audit('OPEN_CASHIER', 'CASHIER', { shift: shift.id });
      store.set('jv_shift', shift); toast('Kasir dibuka. Semangat!', 'success'); posPage(); };
  }

  async function audit(action, module, metadata = {}) {
    const logs = await DB.load('audit_logs'); const u = Auth.user() || {};
    logs.push({ id: uid('LOG'), client_id: u.client_id, user_id: u.id, action, module, metadata, timestamp: nowISO() });
    await DB.save('audit_logs', logs.slice(-5000));
  }
  async function settings() { const s = await DB.load('settings'); const o = {};
    s.forEach(x => o[x.key] = x.value); if (o.tax_rate === undefined) o.tax_rate = 0.11; return o; }

  // ================= POS =================
  let curCat = 'all', curSearch = '', showFav = false;
  async function posPage() {
    const u = Auth.user();
    app.innerHTML = `
      <div class="top"><div class="brand"><img src="/assets/logo.png" onerror="this.style.display='none'" alt=""><span>JIVOO Kasir</span></div>
        <div class="shift">${esc(shift.outlet_name)} · Shift ${esc(shift.shift_no)} · ${esc(u.name)}</div>
        ${syncBadge()}
        <div class="menu">
          <button class="btn" id="mPos">POS</button><button class="btn" id="mHist">Riwayat</button>
          <button class="btn" id="mAtt">Absensi</button><button class="btn" id="mClose">Tutup Kasir</button>
          <button class="btn ghost" id="mOut">Keluar</button></div></div>
      <div class="pos">
        <div class="pane"><div class="searchbar"><input class="inp" id="q" placeholder="Cari produk / SKU...">
          <button class="btn ${showFav ? 'primary' : ''}" id="fav" title="Favorite">★</button></div>
          <div class="cats" id="cats"></div><div class="pgrid" id="grid"></div></div>
        <div class="pane cart"><h3>Pesanan <button class="btn xs ghost" id="clear">Kosongkan</button></h3>
          <div class="custsel"><select class="inp" id="cust"><option value="">Pelanggan: Umum</option></select><button class="btn" id="addCust">+</button></div>
          <div class="citems" id="items"></div>
          <div class="cfoot" id="foot"></div>
          <button class="btn primary lg bigpay" id="pay" disabled>Bayar</button></div>
      </div>`;
    $('#mPos').onclick = posPage; $('#mHist').onclick = historyPage; $('#mAtt').onclick = attendancePage;
    $('#mClose').onclick = closeShiftPage;
    $('#mOut').onclick = async () => { if (await confirm('Keluar? Pastikan kasir sudah ditutup.')) Auth.logout(); };
    $('#q').oninput = debounce2(() => { curSearch = $('#q').value.trim().toLowerCase(); renderGrid(); }, 200);
    $('#fav').onclick = () => { showFav = !showFav; $('#fav').classList.toggle('primary', showFav); renderGrid(); };
    $('#clear').onclick = () => { cart = []; customer = null; manualDisc = 0; couponCode = ''; $('#cust').value = ''; renderCart(); };
    $('#addCust').onclick = quickAddCustomer;
    $('#pay').onclick = paymentModal;
    await renderCats(); await renderCust(); renderGrid(); renderCart();
  }
  const debounce2 = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  async function renderCats() {
    const cats = (await DB.load('categories')).filter(c => c.status === 'active');
    $('#cats').innerHTML = `<button class="pill ${curCat === 'all' ? 'on' : ''}" data-c="all">Semua</button>` +
      cats.map(c => `<button class="pill ${curCat === c.name ? 'on' : ''}" data-c="${esc(c.name)}">${esc(c.name)}</button>`).join('');
    $$('#cats .pill').forEach(p => p.onclick = () => { curCat = p.dataset.c; renderCats(); renderGrid(); });
  }
  async function renderCust() {
    const custs = (await DB.load('customers')).filter(c => c.status === 'active');
    $('#cust').innerHTML = `<option value="">Pelanggan: Umum</option>` + custs.map(c =>
      `<option value="${c.id}">${esc(c.name)}${c.member ? ' ⭐' : ''}</option>`).join('');
    $('#cust').onchange = () => { customer = custs.find(c => c.id === $('#cust').value) || null; renderCart(); };
  }
  async function quickAddCustomer() {
    const b = document.createElement('div');
    b.innerHTML = `<label class="flab">Nama</label><input class="inp" id="n"><label class="flab">No. HP</label><input class="inp" id="p">`;
    modal({ title: 'Tambah Pelanggan Cepat', body: b, actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', onClick: async () => {
      const name = $('#n', b).value.trim(); if (!name) return toast('Nama wajib', 'error'), false;
      const cur = await DB.load('customers');
      const c = { id: uid('CUS'), name, phone: $('#p', b).value, email: '', address: '', member: false, special_price: 0, points: 0, total_spent: 0, last_visit: null, status: 'active' };
      cur.push(c); await DB.save('customers', cur); await renderCust(); $('#cust').value = c.id; customer = c; renderCart();
    } }] });
  }
  async function renderGrid() {
    const products = (await DB.load('products')).filter(p => p.status === 'active');
    let list = products;
    if (curCat !== 'all') list = list.filter(p => p.category === curCat);
    if (showFav) list = list.filter(p => p.favorite);
    if (curSearch) list = list.filter(p => (p.name + ' ' + (p.sku || '')).toLowerCase().includes(curSearch));
    $('#grid').innerHTML = list.map(p => `<button class="pcard ${low(p) ? 'low' : ''}" data-id="${p.id}">
      <div class="ph">${p.image ? `<img src="${esc(p.image)}" onerror="this.remove()" alt="">` : '🍽️'}${p.favorite ? '<span class="fav">★</span>' : ''}</div>
      <div class="pb"><div class="pn">${esc(p.name)}</div><div class="pp">${fmt(p.price)}</div><div class="stk">stok ${p.stock} ${esc(p.unit || '')}</div></div></button>`).join('')
      || '<div class="cempty" style="grid-column:1/-1">Produk tidak ditemukan</div>';
    $$('#grid .pcard').forEach(c => c.onclick = () => addToCart(c.dataset.id));
  }
  const low = p => num(p.stock) <= num(p.min_stock);
  function addToCart(pid) {
    const line = cart.find(l => l.product_id === pid && !l.extras?.length);
    if (line) line.qty++;
    else { const p = (DB.cache.products || []).find(x => x.id === pid); if (!p) return;
      cart.push({ product_id: p.id, sku: p.sku, name: p.name, price: num(p.price), cost: num(p.cost), qty: 1, extras: [], note: '' }); }
    renderCart();
  }
  function computeTotals() {
    let subtotal = 0;
    cart.forEach(l => { subtotal += l.price * l.qty + (l.extras || []).reduce((a, e) => a + e.price * l.qty, 0); });
    let promoDisc = 0, promoLabel = '';
    const promos = (DB.cache.promotions || []).filter(p => p.status === 'active' &&
      (!p.start || p.start <= today()) && (!p.end || p.end >= today()));
    promos.forEach(p => {
      if (p.type === 'basic') { const d = subtotal * num(p.value) / 100; if (d > promoDisc) { promoDisc = d; promoLabel = p.name; } }
      if (p.type === 'total_purchase' && subtotal >= num(p.min_total)) { const d = subtotal * num(p.value) / 100; if (d > promoDisc) { promoDisc = d; promoLabel = p.name; } }
      if (p.type === 'product_qty') { cart.forEach(l => { if (l.qty >= num(p.min_qty) && (!p.product_sku || p.product_sku === l.sku)) {
        const d = (l.price * l.qty) * num(p.value) / 100; if (d > promoDisc) { promoDisc = d; promoLabel = p.name; } } }); }
      if (p.type === 'coupon' && couponCode && p.coupon_code?.toLowerCase() === couponCode.toLowerCase()) {
        const d = subtotal * num(p.value) / 100; if (d > promoDisc) { promoDisc = d; promoLabel = p.name; } }
    });
    let memberDisc = 0;
    if (customer?.member && num(customer.special_price) > 0) memberDisc = subtotal * num(customer.special_price) / 100;
    const discount = Math.min(subtotal, manualDisc + promoDisc + memberDisc);
    const dpp = subtotal - discount;
    const tax = dpp * taxRate;
    return { subtotal, discount, promoDisc, promoLabel, memberDisc, tax, total: Math.round(dpp + tax) };
  }
  let taxRate = 0;
  async function renderCart() {
    taxRate = num((await settings()).tax_rate);
    const T = computeTotals();
    $('#items').innerHTML = cart.length ? cart.map((l, i) => `<div class="ci">
      <div class="nm"><b>${esc(l.name)}</b><small>${fmt(l.price)}${l.extras?.length ? ' · ' + l.extras.map(e => esc(e.name)).join(', ') : ''}${l.note ? ' · 📝 ' + esc(l.note) : ''}</small>
      <small style="display:block"><a href="javascript:void(0)" data-note="${i}">+ note</a> ${(DB.cache.products || []).find(p => p.id === l.product_id)?.extras?.length ? `<a href="javascript:void(0)" data-ex="${i}">+ extra</a>` : ''}</small></div>
      <div class="qty"><button data-d="${i}">−</button><span>${l.qty}</span><button data-u="${i}">+</button></div>
      <div class="pr">${fmt(l.price * l.qty + (l.extras || []).reduce((a, e) => a + e.price * l.qty, 0))}</div>
      <button class="rm" data-x="${i}">×</button></div>`).join('') : '<div class="cempty">Keranjang kosong<br>tap produk untuk menambah</div>';
    $$('#items [data-d]').forEach(b => b.onclick = () => { const l = cart[num(b.dataset.d)]; l.qty--; if (l.qty <= 0) cart.splice(num(b.dataset.d), 1); renderCart(); });
    $$('#items [data-u]').forEach(b => b.onclick = () => { cart[num(b.dataset.u)].qty++; renderCart(); });
    $$('#items [data-x]').forEach(b => b.onclick = () => { cart.splice(num(b.dataset.x), 1); renderCart(); });
    $$('#items [data-note]').forEach(a => a.onclick = async () => { const i = num(a.dataset.note); const n = await promptDlg('Note untuk ' + cart[i].name + ':', cart[i].note || ''); if (n !== null) { cart[i].note = n; renderCart(); } });
    $$('#items [data-ex]').forEach(a => a.onclick = () => { const i = num(a.dataset.ex); const p = (DB.cache.products || []).find(x => x.id === cart[i].product_id);
      const b = document.createElement('div'); b.innerHTML = (p.extras || []).map((e, j) => `<label class="badge gray" style="display:block;margin:6px 0;padding:10px"><input type="checkbox" data-j="${j}" ${cart[i].extras?.find(x => x.name === e.name) ? 'checked' : ''}> ${esc(e.name)} +${fmt(e.price)}</label>`).join('');
      modal({ title: 'Extra: ' + p.name, body: b, actions: [{ label: 'OK', cls: 'primary', onClick: () => {
        cart[i].extras = $$('input:checked', b).map(inp => p.extras[num(inp.dataset.j)]); renderCart(); } }] }); });
    $('#foot').innerHTML = `
      <div class="trow"><span>Subtotal</span><span>${fmt(T.subtotal)}</span></div>
      ${T.discount ? `<div class="trow"><span>Diskon${T.promoLabel ? ' (' + esc(T.promoLabel) + ')' : ''}${T.memberDisc ? ' +member' : ''}</span><span class="neg">−${fmt(T.discount)}</span></div>` : ''}
      <div class="trow"><span>Diskon Manual</span><button class="btn xs" id="dm">Atur</button></div>
      <div class="trow"><span>Kupon</span><button class="btn xs" id="cp">${couponCode ? esc(couponCode) : 'Masukkan'}</button></div>
      <div class="trow"><span>Pajak (${(taxRate * 100).toFixed(0)}%)</span><span>${fmt(T.tax)}</span></div>
      <div class="trow tt"><span>TOTAL</span><span>${fmt(T.total)}</span></div>`;
    $('#dm').onclick = async () => { const v = await promptDlg('Diskon manual (Rp):', manualDisc || 0); if (v !== null) { manualDisc = Math.min(num(v), T.subtotal); renderCart(); } };
    $('#cp').onclick = async () => { const v = await promptDlg('Kode kupon:', couponCode); if (v !== null) { couponCode = v.trim(); renderCart(); } };
    $('#pay').disabled = !cart.length;
    $('#pay').textContent = cart.length ? 'Bayar ' + fmt(T.total) : 'Bayar';
  }

  // ================= PAYMENT =================
  function paymentModal() {
    const T = computeTotals();
    let payments = [], method = 'cash';
    const b = document.createElement('div');
    b.innerHTML = `<div style="text-align:center;margin-bottom:6px"><div style="font-size:12px;color:var(--mut)">Total Tagihan</div>
      <div style="font-size:30px;font-weight:900">${fmt(T.total)}</div></div>
      <div class="paym" id="pm">${METHODS.map(m => `<button data-m="${m}" class="${m === 'cash' ? 'on' : ''}">${MLABEL[m]}</button>`).join('')}</div>
      <div id="cashbox"><label class="flab">Uang Diterima (Rp)</label><input class="inp" type="number" id="recv" inputmode="numeric" placeholder="${T.total}">
      <div class="pill-row" style="margin-top:8px">${[T.total, 50000, 100000].map(v => `<button class="pill" data-v="${v}">${v === T.total ? 'UANG PAS' : fmt(v)}</button>`).join('')}</div></div>
      <div id="npbox" style="display:none"><label class="flab">Nominal (${MLABEL.qris})</label><input class="inp" type="number" id="amt" value="${T.total}"></div>
      <div class="paylist" id="plist"></div>
      <div id="remwrap" style="text-align:center;font-size:13px;color:var(--mut)">Sisa: <b id="rem">${fmt(T.total)}</b></div>
      <div class="chg" id="chg" style="display:none">Kembalian: <span id="chgv">${fmt(0)}</span></div>`;
    const remaining = () => T.total - payments.reduce((a, p) => a + num(p.amount), 0);
    function renderPay() {
      const rem = remaining();
      $('#rem', b).textContent = fmt(Math.max(0, rem));
      $('#plist', b).innerHTML = payments.map((p, i) => `<div class="pi"><span>${MLABEL[p.method]} <a href="javascript:void(0)" data-rm="${i}" style="color:var(--red)">×</a></span><span>${fmt(p.amount)}</span></div>`).join('');
      $$('#plist [data-rm]', b).forEach(x => x.onclick = () => { payments.splice(num(x.dataset.rm), 1); renderPay(); });
      const recv = num($('#recv', b)?.value);
      const chg = recv - Math.min(rem, recv || rem);
      const showChg = method === 'cash' && recv > 0 && rem <= 0;
      $('#chg', b).style.display = showChg ? 'block' : 'none';
      if (showChg) $('#chgv', b).textContent = fmt(Math.max(0, recv - T.total + payments.filter(p => p.method !== 'cash').reduce((a, p) => a + num(p.amount), 0) - (payments.find(p => p.method === 'cash')?.amount || 0)));
      void chg;
      $('#paybtn', b.parentElement)?.toggleAttribute('disabled', rem > 0 && !(method === 'cash' && recv >= rem));
    }
    $$('#pm button', b).forEach(btn => btn.onclick = () => { method = btn.dataset.m;
      $$('#pm button', b).forEach(x => x.classList.toggle('on', x === btn));
      $('#cashbox', b).style.display = method === 'cash' ? 'block' : 'none';
      $('#npbox', b).style.display = method === 'cash' ? 'none' : 'block';
      if (method !== 'cash') $('#amt', b).value = Math.max(0, remaining());
      renderPay(); });
    $('#recv', b).oninput = renderPay;
    $$('#cashbox .pill', b).forEach(p => p.onclick = () => { $('#recv', b).value = p.dataset.v; renderPay(); });
    modal({ title: 'Pembayaran', body: b, actions: [
      { label: 'Tambah Pembayaran (Split)', cls: 'ghost', onClick: () => {
        let amount = method === 'cash' ? num($('#recv', b).value) : num($('#amt', b).value);
        const rem = remaining(); if (rem <= 0) { toast('Tagihan sudah lunas', 'info'); return false; }
        if (method === 'cash' && !amount) amount = rem;
        amount = Math.min(amount, rem); if (amount <= 0) return toast('Nominal tidak valid', 'error'), false;
        payments.push({ method, amount }); if (method === 'cash') $('#recv', b).value = ''; if (method !== 'cash') $('#amt', b).value = Math.max(0, remaining());
        renderPay(); return false; } },
      { label: 'Selesaikan Transaksi', cls: 'primary ok', onClick: async () => {
        let amount = method === 'cash' ? num($('#recv', b).value) : num($('#amt', b).value);
        if (remaining() > 0) { if (amount <= 0) return toast('Isi nominal pembayaran', 'error'), false;
          payments.push({ method, amount: Math.min(amount, remaining()) }); }
        await finishTransaction(T, payments); } }] });
    renderPay();
    setTimeout(() => $('#recv', b)?.focus(), 250);
  }

  async function finishTransaction(T, payments) {
    const u = Auth.user();
    const paidTotal = payments.reduce((a, p) => a + num(p.amount), 0);
    const cashPaid = payments.filter(p => p.method === 'cash').reduce((a, p) => a + num(p.amount), 0);
    const cashNeeded = Math.min(cashPaid, T.total - payments.filter(p => p.method !== 'cash').reduce((a, p) => a + num(p.amount), 0));
    const tx = { id: 'TX-' + Date.now().toString(36).toUpperCase(), sync_id: uid('SYNC'), client_id: u.client_id,
      outlet_id: shift.outlet_id, shift_id: shift.id, cashier_id: u.id, cashier_name: u.name,
      customer_id: customer?.id || null, customer_name: customer?.name || 'Umum',
      items: cart.map(l => ({ ...l })), subtotal: Math.round(T.subtotal), discount: Math.round(T.discount - T.promoDisc),
      manual_discount: Math.round(manualDisc), promotion: Math.round(T.promoDisc), promo_label: T.promoLabel,
      member_discount: Math.round(T.memberDisc), tax: Math.round(T.tax), total: T.total,
      payments, method: payments.map(p => p.method).join('+'), paid: paidTotal,
      change: Math.max(0, cashPaid - Math.max(0, cashNeeded)), status: 'paid', synced: false,
      created_at: nowISO(), updated_at: nowISO(), device: navigator.userAgent.slice(0, 40) };
    // simpan transaksi (local-first, otomatis masuk antrian sync)
    await DB.add('transactions', [tx]);
    // kurangi stok + catat inventory log
    const prows = await DB.load('products'); const logs = await DB.load('inventory');
    tx.items.forEach(l => { const p = prows.find(x => x.id === l.product_id); if (!p) return;
      const before = num(p.stock); p.stock = Math.max(0, before - l.qty);
      logs.push({ id: uid('INV'), product_id: p.id, product_name: p.name, type: 'sale', qty: -l.qty, before, after: p.stock, note: tx.id, created_at: nowISO() }); });
    await DB.save('products', prows); await DB.save('inventory', logs);
    // poin member
    if (customer?.id) { const cs = await DB.load('customers'); const c = cs.find(x => x.id === customer.id);
      if (c) { c.points = num(c.points) + Math.floor(T.total / 10000); c.total_spent = num(c.total_spent) + T.total; c.last_visit = nowISO(); await DB.save('customers', cs); } }
    await audit('TRANSACTION', 'CASHIER', { id: tx.id, total: T.total });
    markSynced();
    cart = []; customer = null; manualDisc = 0; couponCode = '';
    successPage(tx);
  }

  // ================= SUCCESS + RECEIPT =================
  function receiptHTML(tx, s, width) {
    const p = s.profile || {};
    return `<div class="rct ${width}">
      <div class="c">${p.brand ? `<b style="font-size:15px">${esc(p.brand)}</b>` : `<b style="font-size:15px">JIVOO</b>`}
      <br>${esc(p.name || '')}<br>${esc(p.address || '')}<br>${esc(p.phone || '')}</div><hr>
      <table><tr><td>No</td><td class="r">${esc(tx.id)}</td></tr>
      <tr><td>Tgl</td><td class="r">${dstr(tx.created_at)}</td></tr>
      <tr><td>Kasir</td><td class="r">${esc(tx.cashier_name)}</td></tr>
      <tr><td>Pelanggan</td><td class="r">${esc(tx.customer_name || 'Umum')}</td></tr></table><hr>
      <table>${tx.items.map(l => `<tr><td colspan="2">${esc(l.name)}${l.extras?.length ? '<br><small>&nbsp;&nbsp;+' + l.extras.map(e => esc(e.name)).join(', ') + '</small>' : ''}${l.note ? '<br><small>&nbsp;&nbsp;*' + esc(l.note) + '</small>' : ''}</td></tr>
        <tr><td>&nbsp;&nbsp;${l.qty} x ${fmt(l.price)}</td><td class="r"><b>${fmt(l.qty * l.price + (l.extras || []).reduce((a, e) => a + e.price * l.qty, 0))}</b></td></tr>`).join('')}</table><hr>
      <table>
      <tr><td>Subtotal</td><td class="r">${fmt(tx.subtotal)}</td></tr>
      ${tx.discount ? `<tr><td>Diskon</td><td class="r">-${fmt(tx.discount)}</td></tr>` : ''}
      ${tx.promotion ? `<tr><td>Promo${tx.promo_label ? ' (' + esc(tx.promo_label) + ')' : ''}</td><td class="r">-${fmt(tx.promotion)}</td></tr>` : ''}
      ${tx.member_discount ? `<tr><td>Disc. Member</td><td class="r">-${fmt(tx.member_discount)}</td></tr>` : ''}
      <tr><td>Pajak</td><td class="r">${fmt(tx.tax)}</td></tr>
      <tr><td class="tot">TOTAL</td><td class="r tot">${fmt(tx.total)}</td></tr></table><hr>
      <table>${tx.payments.map(p => `<tr><td>${MLABEL[p.method]}</td><td class="r">${fmt(p.amount)}</td></tr>`).join('')}
      ${tx.change ? `<tr><td>Kembalian</td><td class="r">${fmt(tx.change)}</td></tr>` : ''}</table><hr>
      <div class="c">${esc(s.receipt_footer || 'Terima Kasih - Sampai Jumpa Kembali')}<br>*** JIVOO ***</div></div>`;
  }
  async function successPage(tx) {
    const s = await settings();
    app.innerHTML = `<div class="done">
      <div class="check">✓</div><h2>Transaksi Berhasil</h2>
      <div class="amt">${fmt(tx.total)}</div>
      <div class="meta">${esc(tx.id)} · ${dstr(tx.created_at)} · ${esc(tx.customer_name || 'Umum')}${!tx.synced ? ' · <span class="badge amber">menunggu sync</span>' : ''}</div>
      <div class="acts">
        <button class="btn primary lg" id="print" style="width:auto">🖨️ Cetak Struk</button>
        <button class="btn lg" id="share" style="width:auto">Bagikan Struk</button>
        <button class="btn ghost lg" id="new" style="width:auto">Transaksi Baru</button></div>
      <div style="width:100%;max-width:380px"><div class="seg2"><button class="on" data-w="rc58">58mm</button><button data-w="rc80">80mm</button></div>
      <div class="preview" id="pv">${receiptHTML(tx, s, 'rc58')}</div></div></div>`;
    let width = 'rc58';
    $$('.seg2 button').forEach(b2 => b2.onclick = () => { $$('.seg2 button').forEach(x => x.classList.toggle('on', x === b2)); width = b2.dataset.w; $('#pv').innerHTML = receiptHTML(tx, s, width); });
    $('#print').onclick = () => doPrint(tx, s, width);
    $('#share').onclick = async () => { const txt = `Struk ${tx.id} - Total ${fmt(tx.total)} - Terima kasih!`;
      if (navigator.share) { try { await navigator.share({ title: 'Struk JIVOO', text: txt }); } catch {} }
      else { await navigator.clipboard?.writeText(txt).catch(() => {}); toast('Struk disalin ke clipboard', 'success'); } };
    $('#new').onclick = () => posPage();
  }
  function doPrint(tx, s, width) {
    const pa = $('#print-area'); pa.className = width; pa.innerHTML = receiptHTML(tx, s, width);
    setTimeout(() => { window.print(); audit('PRINT_RECEIPT', 'CASHIER', { id: tx.id }); }, 120);
  }

  // ================= HISTORY =================
  async function historyPage() {
    const all = (await DB.load('transactions')).slice().reverse();
    app.innerHTML = `<div class="top"><div class="brand"><img src="/assets/logo.png" onerror="this.style.display='none'" alt=""><span>JIVOO Kasir</span></div>
      ${syncBadge()}<div class="menu"><button class="btn" id="back">← Kembali ke POS</button></div></div>
      <div class="page"><div class="tsearch" style="display:flex;gap:8px;margin-bottom:10px"><input class="inp" id="q" placeholder="Cari no. transaksi / pelanggan..." style="max-width:320px">
      <select class="inp" id="fm" style="max-width:150px"><option value="">Semua Metode</option>${METHODS.map(m => `<option value="${m}">${MLABEL[m]}</option>`).join('')}</select></div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>No</th><th>Waktu</th><th>Pelanggan</th><th>Kasir</th><th>Metode</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
    $('#back').onclick = posPage;
    const draw = () => {
      const q = $('#q').value.toLowerCase(), fm = $('#fm').value;
      const list = all.filter(t => (!q || (t.id + ' ' + (t.customer_name || '')).toLowerCase().includes(q)) && (!fm || (t.payments || []).some(p => p.method === fm)));
      $('#rows').innerHTML = list.slice(0, 80).map(t => `<tr><td><b>${esc(t.id)}</b></td><td>${dstr(t.created_at)}</td><td>${esc(t.customer_name || 'Umum')}</td>
        <td>${esc(t.cashier_name)}</td><td>${esc((t.payments || []).map(p => MLABEL[p.method]).join(' + '))}</td>
        <td class="num"><b>${fmt(t.total)}</b></td><td>${t.synced === false ? '<span class="badge amber">PENDING</span>' : '<span class="badge green">SYNCED</span>'}</td>
        <td><button class="btn xs" data-id="${t.id}">Detail / Reprint</button></td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--mut);padding:26px">Belum ada transaksi</td></tr>';
      $$('#rows [data-id]').forEach(b => b.onclick = () => detailTx(all.find(t => t.id === b.dataset.id)));
    };
    $('#q').oninput = debounce2(draw, 200); $('#fm').onchange = draw; draw();
  }
  async function detailTx(t) {
    if (!t) return; const s = await settings();
    const b = document.createElement('div');
    b.innerHTML = `<div style="text-align:center;margin-bottom:10px"><b style="font-size:16px">${esc(t.id)}</b><br><span style="color:var(--mut);font-size:12px">${dstr(t.created_at)} · ${esc(t.cashier_name)}</span></div>
      <div style="max-width:340px;margin:0 auto" id="rp">${receiptHTML(t, s, 'rc58')}</div>`;
    modal({ title: 'Detail Transaksi', body: b, wide: true, actions: [
      { label: 'Reprint (58mm)', cls: 'ghost', onClick: () => doPrint(t, s, 'rc58') },
      { label: 'Reprint (80mm)', cls: 'ghost', onClick: () => doPrint(t, s, 'rc80') },
      { label: 'Tutup' }] });
  }

  // ================= ATTENDANCE =================
  async function attendancePage() {
    const u = Auth.user();
    const rows = (await DB.load('attendance')).filter(a => a.user_id === u.id).slice().reverse();
    const todayRow = rows.find(a => a.date === today() && !a.check_out);
    app.innerHTML = `<div class="top"><div class="brand"><img src="/assets/logo.png" onerror="this.style.display='none'" alt=""><span>JIVOO Kasir</span></div>
      ${syncBadge()}<div class="menu"><button class="btn" id="back">← Kembali</button></div></div>
      <div class="page"><div class="card" style="max-width:460px;margin:0 auto;text-align:center">
      <h3 style="text-align:left">Absensi</h3>
      <p style="color:var(--mut);font-size:13px;margin:6px 0 14px">Hari ini: ${esc(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
      ${todayRow ? `<span class="badge green">MASUK ${dstr(todayRow.check_in).slice(11)}</span><br><button class="btn danger lg" id="co" style="margin-top:14px">Absen Keluar</button>`
                 : `<span class="badge gray">BELUM ABSEN</span><br><button class="btn ok lg" id="ci" style="margin-top:14px">Absen Masuk (PIN)</button>`}
      </div>
      <div class="card" style="max-width:640px;margin:16px auto 0"><h3 style="text-align:left">Riwayat Absensi</h3>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Jam Kerja</th></tr></thead><tbody>
      ${rows.slice(0, 15).map(a => `<tr><td>${dshort(a.date)}</td><td>${a.check_in ? dstr(a.check_in).slice(11) : '-'}</td><td>${a.check_out ? dstr(a.check_out).slice(11) : '-'}</td>
        <td>${a.check_out ? ((new Date(a.check_out) - new Date(a.check_in)) / 3600000).toFixed(1) + ' jam' : '-'}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--mut);padding:20px">Belum ada riwayat</td></tr>'}</tbody></table></div></div></div>`;
    $('#back').onclick = posPage;
    const pinConfirm = async () => { const p = await promptDlg('Masukkan PIN Anda:'); if (p === null) return false;
      const h = await JV.hash(p); const us = await DB.load('users'); return us.find(x => x.id === u.id)?.pin_hash === h; };
    $('#ci') && ($('#ci').onclick = async () => { if (!(await pinConfirm())) return toast('PIN salah', 'error');
      const at = await DB.load('attendance');
      at.push({ id: uid('ATT'), user_id: u.id, user_name: u.name, date: today(), check_in: nowISO(), check_out: null });
      await DB.save('attendance', at); toast('Absen masuk tercatat', 'success'); attendancePage(); });
    $('#co') && ($('#co').onclick = async () => { if (!(await pinConfirm())) return toast('PIN salah', 'error');
      const at = await DB.load('attendance'); const r = at.find(a => a.user_id === u.id && a.date === today() && !a.check_out);
      if (r) { r.check_out = nowISO(); await DB.save('attendance', at); toast('Absen keluar tercatat', 'success'); } attendancePage(); });
  }

  // ================= CLOSE SHIFT =================
  async function closeShiftPage() {
    const [tx, ses] = await Promise.all([DB.load('transactions'), DB.load('cashier_sessions')]);
    const shiftTx = tx.filter(t => t.shift_id === shift.id);
    const cashIn = shiftTx.reduce((a, t) => a + (t.payments || []).filter(p => p.method === 'cash').reduce((x, p) => x + num(p.amount), 0), 0);
    const cashChange = shiftTx.reduce((a, t) => a + num(t.change), 0);
    const cashSales = cashIn - cashChange;
    const nonCash = shiftTx.reduce((a, t) => a + (t.payments || []).filter(p => p.method !== 'cash').reduce((x, p) => x + num(p.amount), 0), 0);
    const expected = num(shift.opening_cash) + cashSales;
    app.innerHTML = `<div class="top"><div class="brand"><img src="/assets/logo.png" onerror="this.style.display='none'" alt=""><span>JIVOO Kasir</span></div>
      <div class="menu"><button class="btn" id="back">← Kembali</button></div></div>
      <div class="page"><div class="card" style="max-width:520px;margin:0 auto">
      <h3>Tutup Kasir — Shift ${esc(shift.shift_no)}</h3>
      <div style="color:var(--mut);font-size:12.5px;margin-bottom:12px">Buka: ${dstr(shift.opened_at)} · Modal: ${fmt(shift.opening_cash)}</div>
      <div class="trow" style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px"><span>Penjualan Tunai</span><b>${fmt(cashSales)}</b></div>
      <div class="trow" style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px"><span>Penjualan Non-Tunai</span><b>${fmt(nonCash)}</b></div>
      <div class="trow" style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px"><span>Jumlah Transaksi</span><b>${shiftTx.length}</b></div>
      <div style="border-top:2px solid var(--line);margin:10px 0"></div>
      <div class="trow" style="display:flex;justify-content:space-between;padding:6px 0;font-size:15px"><span>Expected Cash</span><b>${fmt(expected)}</b></div>
      <label class="flab">Actual Cash di Laci (Rp)</label><input class="inp" type="number" id="actual" inputmode="numeric" placeholder="${expected}">
      <div id="diffwrap" style="display:none;margin-top:10px;text-align:center;font-weight:800;font-size:16px" class="chg"></div>
      <button class="btn danger lg" id="do" style="margin-top:14px">Tutup Kasir & Print Laporan</button></div></div>`;
    $('#back').onclick = posPage;
    $('#actual').oninput = () => { const a = num($('#actual').value);
      if ($('#actual').value === '') return $('#diffwrap').style.display = 'none';
      const d = a - expected; $('#diffwrap').style.display = 'block';
      $('#diffwrap').innerHTML = `Selisih: ${d < 0 ? '<span style="color:var(--red)">−' + fmt(Math.abs(d)) + ' (kurang)</span>' : d > 0 ? '<span style="color:var(--blue)">+' + fmt(d) + ' (lebih)</span>' : '<span style="color:var(--green)">PAS ✓</span>'}`;
      $('#diffwrap').style.background = d === 0 ? '#f0fdf4' : '#fef2f2'; };
    $('#do').onclick = async () => {
      const actual = num($('#actual').value);
      if ($('#actual').value === '') return toast('Isi actual cash', 'error');
      const diff = actual - expected;
      const ses2 = await DB.load('cashier_sessions'); const srec = ses2.find(x => x.id === shift.id);
      if (srec) { srec.closed_at = nowISO(); srec.closing_cash = actual; srec.expected_cash = expected; srec.difference = diff;
        srec.cash_sales = cashSales; srec.non_cash_sales = nonCash; srec.tx_count = shiftTx.length; await DB.save('cashier_sessions', ses2); }
      await audit('CLOSE_CASHIER', 'CASHIER', { shift: shift.id, diff });
      store.del('jv_shift');
      const s = await settings();
      printHTML(`<h2 style="font-size:16px">LAPORAN TUTUP KASIR</h2>
        <p style="font-size:11px;color:#555">${esc(s.profile?.brand || 'JIVOO')} · ${esc(shift.outlet_name)} · Shift ${esc(shift.shift_no)}<br>${dstr(nowISO())} · Kasir: ${esc(Auth.user().name)}</p>
        <table><tr><td>Modal Awal</td><td class="num">${fmt(shift.opening_cash)}</td></tr>
        <tr><td>Penjualan Tunai</td><td class="num">${fmt(cashSales)}</td></tr>
        <tr><td>Penjualan Non-Tunai</td><td class="num">${fmt(nonCash)}</td></tr>
        <tr><td>Jumlah Transaksi</td><td class="num">${shiftTx.length}</td></tr>
        <tr><td><b>Expected Cash</b></td><td class="num"><b>${fmt(expected)}</b></td></tr>
        <tr><td><b>Actual Cash</b></td><td class="num"><b>${fmt(actual)}</b></td></tr>
        <tr><td><b>Selisih</b></td><td class="num"><b>${fmt(diff)}</b></td></tr></table>
        <p style="text-align:center;font-size:11px;margin-top:10px">*** JIVOO ***</p>`);
      toast('Kasir ditutup', 'success'); shift = null; openShiftPage();
    };
  }

  // ================= BOOT =================
  if (Auth.isLogged() && Auth.scope() === 'client') {
    const u = Auth.user(); JV.DB.init(u.client_id);
    if (Auth.canModule('cashier')) { shift = store.get('jv_shift', null); shift ? posPage() : openShiftPage(); }
    else { app.innerHTML = '<div class="login-wrap"><div class="login-card"><h2>Akses Ditolak</h2><p style="margin:10px 0">Akun ini tidak memiliki module kasir.</p><button class="btn primary lg" onclick="Auth.logout()">Keluar</button></div></div>'; }
  } else loginPage();
})();