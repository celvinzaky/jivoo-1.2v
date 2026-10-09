// JIVOO UI - toast, modal, table, charts, print, csv
window.UI = (() => {
  const { $, esc, fmt, toCSV, download } = JV;

  function toast(msg, type = 'info', ms = 2600) {
    let wrap = $('.jv-toasts'); if (!wrap) { wrap = document.createElement('div'); wrap.className = 'jv-toasts'; document.body.appendChild(wrap); }
    const t = document.createElement('div'); t.className = 'jv-toast ' + type; t.textContent = msg;
    wrap.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
  }

  function modal({ title, body, actions = [], wide = false, onClose } = {}) {
    const ov = document.createElement('div'); ov.className = 'jv-modal-ov';
    ov.innerHTML = `<div class="jv-modal ${wide ? 'wide' : ''}"><div class="jv-modal-h"><b>${esc(title)}</b><button class="jv-x" aria-label="tutup">&times;</button></div><div class="jv-modal-b"></div><div class="jv-modal-f"></div></div>`;
    const bEl = $('.jv-modal-b', ov), fEl = $('.jv-modal-f', ov);
    if (typeof body === 'string') bEl.innerHTML = body; else if (body) bEl.appendChild(body);
    const close = () => { ov.remove(); onClose && onClose(); };
    $('.jv-x', ov).onclick = close;
    ov.addEventListener('mousedown', e => { if (e.target === ov && !wide) close(); });
    actions.forEach(a => { const btn = document.createElement('button'); btn.className = 'btn ' + (a.cls || ''); btn.textContent = a.label;
      btn.onclick = () => { const r = a.onClick && a.onClick(bEl, close); if (r !== false) close(); }; fEl.appendChild(btn); });
    if (!actions.length) fEl.remove();
    document.body.appendChild(ov); return { close, el: ov, body: bEl };
  }

  const confirm = msg => new Promise(res => modal({ title: 'Konfirmasi', body: `<p>${esc(msg)}</p>`,
    actions: [{ label: 'Batal', cls: 'ghost', onClick: () => res(false) }, { label: 'Ya, Lanjutkan', cls: 'danger', onClick: () => res(true) }] }));
  const promptDlg = (msg, def = '') => new Promise(res => modal({ title: 'Input', body: `<p>${esc(msg)}</p><input class="inp" id="pval" value="${esc(def)}">`,
    actions: [{ label: 'Batal', cls: 'ghost', onClick: () => res(null) }, { label: 'OK', onClick: b => res($('#pval', b).value || null) }] }));

  function field(f, val) {
    const v = val ?? f.def ?? '';
    if (f.type === 'select') return `<select class="inp" data-k="${f.k}">${(typeof f.opts === 'function' ? f.opts() : f.opts || []).map(o =>
      `<option value="${esc(o.v)}" ${String(o.v) === String(v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
    if (f.type === 'textarea') return `<textarea class="inp" data-k="${f.k}" rows="3">${esc(v)}</textarea>`;
    if (f.type === 'checkbox') return `<label class="chk"><input type="checkbox" data-k="${f.k}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
    return `<input class="inp" type="${f.type || 'text'}" data-k="${f.k}" value="${esc(v)}" ${f.required ? 'required' : ''} placeholder="${esc(f.ph || '')}">`;
  }
  function readForm(body, fields) { const o = {}; fields.forEach(f => { const el = body.querySelector(`[data-k="${f.k}"]`); if (!el) return;
    o[f.k] = f.type === 'checkbox' ? el.checked : (f.type === 'number' ? Number(el.value) : el.value); }); return o; }

  function formModal(title, fields, initial = {}, onSave) {
    const body = document.createElement('div'); body.className = 'frm';
    fields.forEach(f => { if (f.type === 'checkbox') { body.insertAdjacentHTML('beforeend', field(f, initial[f.k])); return; }
      body.insertAdjacentHTML('beforeend', `<label class="flab">${esc(f.label)}${f.required ? ' <i>*</i>' : ''}</label>${field(f, initial[f.k])}`); });
    return modal({ title, body, actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary',
      onClick: b => { const o = readForm(b, fields); for (const f of fields) if (f.required && !o[f.k]) { toast(f.label + ' wajib diisi', 'error'); return false; } onSave(o); } }] });
  }

  function table({ cols, rows, search = [], pageSize = 12, actions, onRow, empty = 'Tidak ada data' }) {
    const wrap = document.createElement('div'); wrap.className = 'twrap';
    let state = { q: '', page: 1, sort: null, dir: 1 };
    function view() {
      let r = rows;
      if (state.q && search.length) { const q = state.q.toLowerCase(); r = r.filter(x => search.some(k => String(x[k] ?? '').toLowerCase().includes(q))); }
      if (state.sort) r = [...r].sort((a, b) => { const x = a[state.sort], y = b[state.sort]; return (x > y ? 1 : x < y ? -1 : 0) * state.dir; });
      const pages = Math.max(1, Math.ceil(r.length / pageSize));
      if (state.page > pages) state.page = pages;
      const slice = r.slice((state.page - 1) * pageSize, state.page * pageSize);
      wrap.innerHTML = `${search.length ? `<div class="tsearch"><input class="inp" placeholder="Cari..." value="${esc(state.q)}"><span class="tcount">${r.length} data</span></div>` : `<div class="tsearch"><span class="tcount">${r.length} data</span></div>`}
        <div class="tscroll"><table class="tbl"><thead><tr>${cols.map(c => `<th data-k="${c.k}" class="${state.sort === c.k ? 'sort' + (state.dir > 0 ? ' asc' : ' desc') : ''}">${esc(c.label)}</th>`).join('')}${actions ? '<th></th>' : ''}</tr></thead>
        <tbody>${slice.length ? slice.map((row, i) => `<tr data-i="${i}">${cols.map(c => `<td class="${c.cls || ''}">${c.fmt ? c.fmt(row[c.k], row) : esc(row[c.k] ?? '-')}</td>`).join('')}${actions ? `<td class="rowact"></td>` : ''}</tr>`).join('') : `<tr><td colspan="${cols.length + (actions ? 1 : 0)}" class="empty">${esc(empty)}</td></tr>`}</tbody></table></div>
        ${pages > 1 ? `<div class="tpager"><button class="btn ghost sm" ${state.page <= 1 ? 'disabled' : ''} data-p="prev">‹</button><span>${state.page}/${pages}</span><button class="btn ghost sm" ${state.page >= pages ? 'disabled' : ''} data-p="next">›</button></div>` : ''}`;
      const si = $('.tsearch input', wrap); if (si) si.oninput = JV.debounce(() => { state.q = si.value; state.page = 1; view(); }, 250);
      $$('th[data-k]', wrap).forEach(th => th.onclick = () => { const k = th.dataset.k; if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = 1; } view(); });
      $$('.tpager button', wrap).forEach(b => b.onclick = () => { state.page += b.dataset.p === 'next' ? 1 : -1; view(); });
      $$('tbody tr', wrap).forEach((tr, i) => { const row = slice[Number(tr.dataset.i)]; if (!row) return;
        if (actions) { const td = $('.rowact', tr); actions(row).forEach(a => { const b = document.createElement('button'); b.className = 'btn xs ' + (a.cls || 'ghost'); b.textContent = a.label;
          b.onclick = e => { e.stopPropagation(); a.onClick(row); }; td.appendChild(b); }); }
        if (onRow) tr.onclick = () => onRow(row); });
    }
    view();
    wrap.refresh = newRows => { rows = newRows; state.page = 1; view(); };
    return wrap;
  }
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function statCard(label, value, sub = '') { return `<div class="card stat"><div class="slabel">${esc(label)}</div><div class="svalue">${value}</div>${sub ? `<div class="ssub">${esc(sub)}</div>` : ''}</div>`; }

  function chart(canvas, { labels, data, color = '#2563eb', type = 'bar', horizontal = false }) {
    const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth || 600, H = canvas.clientHeight || 220;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const x = canvas.getContext('2d'); x.scale(dpr, dpr); x.clearRect(0, 0, W, H);
    const max = Math.max(1, ...data); const padL = 34, padB = 22, padT = 8, iw = W - padL - 6, ih = H - padB - padT;
    x.strokeStyle = '#e5e7eb'; x.fillStyle = '#94a3b8'; x.font = '10px sans-serif';
    for (let i = 0; i <= 4; i++) { const y = padT + ih - (ih * i / 4); x.beginPath(); x.moveTo(padL, y); x.lineTo(W - 4, y); x.stroke();
      x.fillText(shortNum(max * i / 4), 2, y + 3); }
    if (type === 'line') { x.strokeStyle = color; x.lineWidth = 2; x.beginPath();
      data.forEach((v, i) => { const px = padL + (iw * (i / Math.max(1, data.length - 1))), py = padT + ih - (v / max) * ih; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
      data.forEach((v, i) => { const px = padL + (iw * (i / Math.max(1, data.length - 1))), py = padT + ih - (v / max) * ih;
        x.fillStyle = color; x.beginPath(); x.arc(px, py, 2.5, 0, 7); x.fill(); }); }
    else if (horizontal) { const bh = ih / data.length;
      data.forEach((v, i) => { const y = padT + bh * i + bh * 0.18; x.fillStyle = color;
        x.fillRect(padL, y, Math.max(1, (v / max) * iw * 0.92), bh * 0.6);
        x.fillStyle = '#64748b'; x.fillText(String(labels[i]).slice(0, 14), padL, y + bh * 0.6 + 9); }); return; }
    else { const bw = iw / data.length;
      data.forEach((v, i) => { const h = (v / max) * ih; x.fillStyle = color;
        x.fillRect(padL + bw * i + bw * 0.18, padT + ih - h, bw * 0.64, Math.max(1, h));
        x.fillStyle = '#64748b'; x.save(); x.translate(padL + bw * i + bw / 2 + 3, H - 4); x.rotate(-0.5); x.fillText(String(labels[i]).slice(0, 6), 0, 0); x.restore(); }); }
  }
  const shortNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : Math.round(n);

  function printHTML(inner, extraCss = '') {
    const w = window.open('', '_blank', 'width=420,height=640');
    w.document.write(`<!DOCTYPE html><html><head><title>JIVOO Print</title><style>
      body{font-family:Arial,sans-serif;color:#000;margin:0;padding:12px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{padding:4px 6px;text-align:left;border-bottom:1px solid #ddd}th{background:#f1f5f9}
      .num{text-align:right}.ttotal{font-size:15px;font-weight:bold}.center{text-align:center}
      @media print{@page{margin:8mm}}
      ${extraCss}</style></head><body>${inner}<script>setTimeout(()=>{print();close()},300)<\/script></body></html>`);
    w.document.close();
  }
  const exportCSV = (rows, name) => { if (!rows.length) return toast('Tidak ada data untuk diexport', 'error'); download(name + '.csv', toCSV(rows), 'text/csv'); toast('CSV berhasil diunduh'); };

  return { toast, modal, confirm, promptDlg, formModal, field, readForm, table, statCard, chart, printHTML, exportCSV, download, esc, fmt };
})();