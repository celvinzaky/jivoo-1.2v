// JIVOO Server - zero dependency Node.js server
// Serves static apps + JSON API + multi-tenant JSON file storage
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const PORT = process.env.PORT || 3000;

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const uid = p => p + '_' + crypto.randomBytes(5).toString('hex');
const now = () => new Date().toISOString();

const COLS = ['company','users','roles','products','categories','customers','transactions',
  'inventory','suppliers','purchase_orders','promotions','attendance','finance',
  'invoices','cashier_sessions','audit_logs','settings'];

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json' };

// ---------- helpers ----------
const jread = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } };
const jwrite = (f, obj) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(obj, null, 2)); };
const clientDir = id => path.join(DATA, 'clients', id);
const colFile = (id, col) => path.join(clientDir(id), col + '.json');
const readCol = (id, col) => jread(colFile(id, col), []);
const writeCol = (id, col, rows) => jwrite(colFile(id, col), rows);
const sysFile = () => path.join(DATA, 'system', 'system.json');
const readSys = () => jread(sysFile(), null);
const writeSys = s => jwrite(sysFile(), s);
const send = (res, code, obj) => { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); res.end(b); };
const bodyOf = req => new Promise(r => { let d=''; req.on('data', c => d += c); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });

// audit helper
function audit(clientId, userId, action, module, metadata = {}) {
  const logs = clientId ? readCol(clientId, 'audit_logs') : [];
  if (clientId) { logs.push({ id: uid('LOG'), client_id: clientId, user_id: userId, action, module, metadata, timestamp: now() });
    writeCol(clientId, 'audit_logs', logs.slice(-5000)); return; }
  const sys = readSys(); sys.logs = sys.logs || [];
  sys.logs.push({ id: uid('LOG'), user_id: userId, action, module, metadata, timestamp: now() });
  sys.logs = sys.logs.slice(-5000); writeSys(sys);
}

// ---------- tokens ----------
const tokens = new Map(); // token -> ctx
const newToken = ctx => { const t = uid('TKN') + crypto.randomBytes(16).toString('hex'); tokens.set(t, { ...ctx, created: now() }); return t; };
const ctxOf = req => { const h = req.headers.authorization || ''; const t = h.replace('Bearer ', ''); return tokens.get(t) || null; };

// ---------- seed ----------
function createClient(c) {
  const id = uid('CLIENT');
  const company = { id, name: c.company, brand: c.brand || c.company, owner_name: c.owner,
    email: c.email, phone: c.phone || '', outlets: c.outlets || 1, package: c.package || 'basic',
    status: c.status || 'active', created_at: now(), updated_at: now() };
  jwrite(path.join(clientDir(id), 'company.json'), company);
  const roles = [
    { id:'ROLE_OWNER', name:'CLIENT_OWNER', label:'Owner', permissions:['view','create','update','delete','export','approve','void','manage_settings'], modules:'ALL', is_default:true },
    { id:'ROLE_ADMIN', name:'CLIENT_ADMIN', label:'Admin', permissions:['view','create','update','delete','export','approve'], modules:'ALL', is_default:true },
    { id:'ROLE_MANAGER', name:'MANAGER', label:'Manager', permissions:['view','create','update','export','approve'], modules:['dashboard','reports','analytics','products','categories','inventory','suppliers','purchase_orders','customers','promotions','invoices','finance','accounts','employees','attendance'], is_default:true },
    { id:'ROLE_CASHIER', name:'CASHIER', label:'Kasir', permissions:['view','create'], modules:['cashier','customers'], is_default:true },
    { id:'ROLE_INV', name:'INVENTORY_STAFF', label:'Staff Inventory', permissions:['view','create','update'], modules:['products','categories','inventory','suppliers','purchase_orders'], is_default:true },
    { id:'ROLE_FIN', name:'FINANCE_STAFF', label:'Staff Keuangan', permissions:['view','create','update','export'], modules:['finance','accounts','reports','invoices'], is_default:true }
  ];
  writeCol(id, 'roles', roles);
  const owner = { id: uid('USER'), client_id: id, outlet_id: null, name: c.owner, username: c.username,
    email: c.email, password_hash: sha(c.password), pin_hash: '', role_id: 'ROLE_OWNER',
    permissions: [], modules: [], status: 'active', last_login: null, created_at: now(), updated_at: now() };
  writeCol(id, 'users', c.demo ? [owner, { id: uid('USER'), client_id: id, outlet_id: 'OUTLET_1', name: 'Kasir Demo', username: 'kasir1',
    email: '', password_hash: sha('kasir123'), pin_hash: sha('1234'), role_id: 'ROLE_CASHIER', permissions: [], modules: [],
    status: 'active', last_login: null, created_at: now(), updated_at: now() }] : [owner]);
  writeCol(id, 'categories', c.demo ? [
    { id: uid('CAT'), client_id: id, name: 'Makanan', type: 'food', status: 'active', created_at: now(), updated_at: now() },
    { id: uid('CAT'), client_id: id, name: 'Minuman', type: 'drink', status: 'active', created_at: now(), updated_at: now() }
  ] : []);
  writeCol(id, 'products', c.demo ? [
    { id: uid('PRD'), client_id: id, name: 'Nasi Goreng', category_id: 'cat_food', category: 'Makanan', unit: 'porsi', sku: 'NSG-001',
      barcode: '', price: 25000, cost: 12000, stock: 50, min_stock: 10, image: '', favorite: true, extras: [], bundle_items: [],
      status: 'active', created_at: now(), updated_at: now() },
    { id: uid('PRD'), client_id: id, name: 'Ayam Geprek', category_id: 'cat_food', category: 'Makanan', unit: 'porsi', sku: 'AYG-002',
      barcode: '', price: 22000, cost: 10000, stock: 40, min_stock: 10, image: '', favorite: true, extras: [], bundle_items: [],
      status: 'active', created_at: now(), updated_at: now() },
    { id: uid('PRD'), client_id: id, name: 'Es Teh Manis', category_id: 'cat_drink', category: 'Minuman', unit: 'cup', sku: 'EST-003',
      barcode: '', price: 8000, cost: 2000, stock: 100, min_stock: 20, image: '', favorite: true, extras: [], bundle_items: [],
      status: 'active', created_at: now(), updated_at: now() },
    { id: uid('PRD'), client_id: id, name: 'Kopi Susu', category_id: 'cat_drink', category: 'Minuman', unit: 'cup', sku: 'KPS-004',
      barcode: '', price: 18000, cost: 6000, stock: 60, min_stock: 15, image: '', favorite: false, extras: [], bundle_items: [],
      status: 'active', created_at: now(), updated_at: now() },
    { id: uid('PRD'), client_id: id, name: 'Paket Hemat', category_id: 'cat_food', category: 'Makanan', unit: 'paket', sku: 'PKT-005',
      barcode: '', price: 39000, cost: 22000, stock: 999, min_stock: 0, image: '', favorite: true,
      extras: [], bundle_items: [{ product_id: 'NSG-001', qty: 1 }, { product_id: 'EST-003', qty: 1 }], status: 'active', created_at: now(), updated_at: now() }
  ] : []);
  writeCol(id, 'customers', c.demo ? [
    { id: uid('CUS'), client_id: id, name: 'Budi Santoso', phone: '081234567801', email: '', address: '', member: true, special_price: 0.05,
      points: 120, total_spent: 450000, last_visit: now(), status: 'active', created_at: now(), updated_at: now() },
    { id: uid('CUS'), client_id: id, name: 'Siti Aminah', phone: '081234567802', email: '', address: '', member: false, special_price: 0,
      points: 40, total_spent: 120000, last_visit: now(), status: 'active', created_at: now(), updated_at: now() }
  ] : []);
  writeCol(id, 'settings', [{ id: uid('SET'), client_id: id, key: 'outlets', value: [{ id: 'OUTLET_1', name: 'Outlet Pusat', address: '' }] },
    { id: uid('SET'), client_id: id, key: 'tax_rate', value: 0.11 },
    { id: uid('SET'), client_id: id, key: 'receipt_footer', value: 'Terima Kasih - Sampai Jumpa Kembali' }]);
  ['inventory','suppliers','purchase_orders','promotions','attendance','finance','invoices','transactions','cashier_sessions','audit_logs']
    .forEach(col => writeCol(id, col, []));
  audit(id, owner.id, 'CLIENT_CREATED', 'SYSTEM', { company: c.company });
  return company;
}

function seed() {
  if (readSys()) return;
  const sys = { admin: { username: 'admin', password_hash: sha('jivooadmin123'), name: 'Super Admin' },
    logs: [], created_at: now() };
  writeSys(sys);
  createClient({ company: 'Demo Resto', brand: 'DemoResto', owner: 'Owner Demo', email: 'demo@jivoo.id',
    username: 'demo', password: 'jivoo123', phone: '', outlets: 1, status: 'active', demo: true });
  console.log('[JIVOO] Seed selesai. Admin: admin / jivooadmin123 | Client: demo / jivoo123 | Kasir: kasir1 / pin 1234');
}

// ---------- api ----------
async function handleApi(req, res, url, q) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const route = parts.slice(1);
  const method = req.method;
  const b = ['POST','PUT','PATCH'].includes(method) ? await bodyOf(req) : {};

  // login
  if (method === 'POST' && route[0] === 'login') {
    if (b.scope === 'admin') {
      const sys = readSys();
      if (b.username === sys.admin.username && sha(b.password) === sys.admin.password_hash) {
        const t = newToken({ scope: 'admin', user_id: 'ADMIN', name: sys.admin.name });
        sys.logs.push({ id: uid('LOG'), user_id: 'ADMIN', action: 'LOGIN', module: 'ADMIN', metadata: {}, timestamp: now() }); writeSys(sys);
        return send(res, 200, { token: t, user: { id: 'ADMIN', name: sys.admin.name, role: 'SUPER_ADMIN' } });
      }
      return send(res, 401, { error: 'Username atau password salah' });
    }
    if (b.scope === 'client') {
      const dirs = fs.existsSync(path.join(DATA, 'clients')) ? fs.readdirSync(path.join(DATA, 'clients')) : [];
      for (const dir of dirs) {
        const company = jread(path.join(DATA, 'clients', dir, 'company.json'), null);
        if (!company) continue;
        const users = readCol(dir, 'users');
                const u = users.find(x =>
          (b.pin && !b.username && x.pin_hash && sha(b.pin) === x.pin_hash) ||
          ((x.username === b.username || x.email === b.username) &&
           ((b.pin && x.pin_hash && sha(b.pin) === x.pin_hash) ||
            (b.password && sha(b.password) === x.password_hash))));
        if (!u) continue;
        if (company.status !== 'active') return send(res, 403, { error: 'Akun perusahaan dinonaktifkan. Hubungi administrator.' });
        if (u.status !== 'active') return send(res, 403, { error: 'User dinonaktifkan.' });
        const role = readCol(dir, 'roles').find(r => r.id === u.role_id) || {};
        u.last_login = now(); writeCol(dir, 'users', users);
        audit(dir, u.id, 'LOGIN', 'AUTH');
        const t = newToken({ scope: 'client', client_id: dir, user_id: u.id, role: role.name || '' });
        return send(res, 200, { token: t, user: { id: u.id, client_id: dir, name: u.name, username: u.username,
          outlet_id: u.outlet_id, role: role.name || '', role_label: role.label || '',
          permissions: [...(role.permissions || []), ...(u.permissions || [])],
          modules: role.modules === 'ALL' ? 'ALL' : [...(role.modules || []), ...(u.modules || [])] } });
      }
      return send(res, 401, { error: 'Username, password, atau PIN salah' });
    }
    return send(res, 400, { error: 'Scope tidak dikenal' });
  }

  const ctx = ctxOf(req);
  if (!ctx) return send(res, 401, { error: 'Sesi berakhir, silakan login ulang' });

  // ---- ADMIN ----
  if (route[0] === 'admin') {
    if (ctx.scope !== 'admin') return send(res, 403, { error: 'Akses khusus admin' });
    if (method === 'GET' && route[1] === 'overview') {
      const dirs = fs.existsSync(path.join(DATA, 'clients')) ? fs.readdirSync(path.join(DATA, 'clients')) : [];
      const clients = dirs.map(dir => {
        const company = jread(path.join(DATA, 'clients', dir, 'company.json'), {});
        const tx = readCol(dir, 'transactions');
        const users = readCol(dir, 'users');
        return { id: dir, ...company, user_count: users.length, tx_count: tx.length,
          tx_total: tx.reduce((a, t) => a + (t.total || 0), 0), last_activity: tx.length ? tx[tx.length - 1].created_at : company.created_at };
      });
      const sys = readSys();
      return send(res, 200, { clients, total_client: clients.length,
        active: clients.filter(c => c.status === 'active').length,
        inactive: clients.filter(c => c.status !== 'active').length,
        total_user: clients.reduce((a, c) => a + c.user_count, 0),
        total_tx: clients.reduce((a, c) => a + c.tx_count, 0),
        logs: (sys.logs || []).slice(-100).reverse() });
    }
    if (method === 'POST' && route[1] === 'clients') {
      if (!b.company || !b.owner || !b.username || !b.password) return send(res, 400, { error: 'Field wajib: perusahaan, owner, username, password' });
      const company = createClient(b);
      audit(null, 'ADMIN', 'CREATE_CLIENT', 'ADMIN', { company: b.company });
      return send(res, 200, { company });
    }
    if (route[1] === 'clients' && route[2]) {
      const id = route[2];
      if (!fs.existsSync(clientDir(id))) return send(res, 404, { error: 'Client tidak ditemukan' });
      if (method === 'GET' && route[3] === 'backup') {
        const data = {}; COLS.forEach(c => data[c] = readCol(id, c));
        const company = jread(path.join(clientDir(id), 'company.json'), {});
        audit(null, 'ADMIN', 'EXPORT_CLIENT', 'ADMIN', { client_id: id });
        return send(res, 200, { exported_at: now(), company, data });
      }
      if (method === 'GET') {
        const company = jread(path.join(clientDir(id), 'company.json'), {});
        const users = readCol(id, 'users'); const tx = readCol(id, 'transactions');
        const logs = readCol(id, 'audit_logs').slice(-100).reverse();
        return send(res, 200, { company, users: users.map(u => ({ ...u, password_hash: undefined, pin_hash: undefined })),
          tx_count: tx.length, tx_total: tx.reduce((a, t) => a + (t.total || 0), 0), logs });
      }
      if (method === 'PATCH') {
        const f = path.join(clientDir(id), 'company.json');
        const company = jread(f, {});
        if (b.status) company.status = b.status;
        company.updated_at = now(); jwrite(f, company);
        audit(null, 'ADMIN', b.status === 'active' ? 'ACTIVATE_CLIENT' : 'DEACTIVATE_CLIENT', 'ADMIN', { client_id: id });
        return send(res, 200, { company });
      }
    }
    return send(res, 404, { error: 'Endpoint tidak ditemukan' });
  }

  // ---- CLIENT DATA ----
  if (route[0] === 'data' && route[1]) {
    if (ctx.scope !== 'client') return send(res, 403, { error: 'Akses khusus client' });
    const col = route[1];
    if (!COLS.includes(col)) return send(res, 400, { error: 'Koleksi tidak dikenal' });
    const id = ctx.client_id;
    if (method === 'GET') return send(res, 200, { rows: readCol(id, col), server_time: now() });
    if (method === 'PUT') {
      if (!Array.isArray(b.rows)) return send(res, 400, { error: 'rows harus array' });
      b.rows.forEach(r => { r.client_id = id; r.updated_at = now(); if (!r.created_at) r.created_at = now(); });
      writeCol(id, col, b.rows);
      audit(id, ctx.user_id, 'SYNC_' + col.toUpperCase(), col.toUpperCase(), { count: b.rows.length });
      return send(res, 200, { ok: true, count: b.rows.length });
    }
  }

  if (method === 'POST' && route[0] === 'logout') {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    tokens.delete(t); return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'Endpoint tidak ditemukan' });
}

// ---------- static ----------
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/admin/index.html';
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not Found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

// ---------- boot ----------
fs.mkdirSync(path.join(DATA, 'system'), { recursive: true });
seed();
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) { console.error(e); send(res, 500, { error: 'Server error: ' + e.message }); }
}).listen(PORT, () => console.log(`[JIVOO] running → http://localhost:${PORT}  (admin /client /cashier)`));