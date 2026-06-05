/* =========================================================================
 * 后端接口封装（后台端，经典脚本，挂到 window.API）
 * 与大屏共享 sessionStorage 令牌（twin_token），同源访问。
 * ========================================================================= */
window.API = {
  base: '',
  token: sessionStorage.getItem('twin_token') || '',

  setToken(t) { this.token = t; sessionStorage.setItem('twin_token', t); },
  clear() {
    this.token = '';
    sessionStorage.removeItem('twin_token');
    sessionStorage.removeItem('twin_auth');
  },

  async _fetch(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
    const res = await fetch(this.base + path, Object.assign({}, opts, { headers: headers }));
    if (res.status === 401) { this.clear(); throw new Error('unauthorized'); }
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || ('HTTP ' + res.status));
    }
    return res.status === 204 ? null : res.json();
  },

  get(p) { return this._fetch(p); },
  post(p, b) { return this._fetch(p, { method: 'POST', body: JSON.stringify(b || {}) }); },
  patch(p, b) { return this._fetch(p, { method: 'PATCH', body: JSON.stringify(b || {}) }); },
  del(p) { return this._fetch(p, { method: 'DELETE' }); },

  async login(username, password) {
    const r = await this._fetch('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ username: username, password: password }),
    });
    this.setToken(r.token);
    return r;
  },
};
