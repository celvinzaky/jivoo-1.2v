// JIVOO Auth - session, RBAC guards
window.Auth = (() => {
  const { store, api } = JV;
  async function login(scope, creds) {
    const r = await api('/api/login', { method: 'POST', body: { scope, ...creds } });
    store.set('jv_token', r.token); store.set('jv_user', r.user); store.set('jv_scope', scope);
    JV.DB.init(r.user.client_id || 'admin');
    return r.user;
  }
  async function logout() { try { await api('/api/logout', { method: 'POST' }); } catch {} store.del('jv_token'); store.del('jv_user'); store.del('jv_scope'); location.hash = '#/login'; location.reload(); }
  const user = () => store.get('jv_user');
  const scope = () => store.get('jv_scope');
  const isLogged = () => !!store.get('jv_token');
  function canModule(m) { const u = user(); if (!u) return false; if (u.role === 'SUPER_ADMIN') return true; return u.modules === 'ALL' || (u.modules || []).includes(m); }
  function canPerm(p) { const u = user(); if (!u) return false; if (u.role === 'SUPER_ADMIN' || u.modules === 'ALL') return true; return (u.permissions || []).includes(p); }
  const isRole = (...r) => r.includes(user()?.role);
  function guard(modules = []) {
    if (!isLogged()) { location.hash = '#/login'; return false; }
    if (modules.length && !modules.some(canModule)) { location.hash = '#/403'; return false; }
    return true;
  }
  return { login, logout, user, scope, isLogged, canModule, canPerm, isRole, guard };
})();