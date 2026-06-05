/* =========================================================================
 * 后端接口封装（大屏端）
 * 同源访问（由 Flask 托管），自动携带 Bearer 令牌，401 时清理会话。
 * ========================================================================= */

export const API = {
  base: '',
  demo: false,                 // 演示模式：true 时不访问后端，所有请求直接抛错以触发前端本地兜底
  token: sessionStorage.getItem('twin_token') || '',

  setToken(t) { this.token = t; sessionStorage.setItem('twin_token', t); },
  clear() {
    this.token = '';
    sessionStorage.removeItem('twin_token');
    sessionStorage.removeItem('twin_auth');
  },

  async _fetch(path, opts = {}) {
    if (this.demo) throw new Error('demo-offline');   // 演示模式：跳过后端，由调用方回退本地模拟
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
    const res = await fetch(this.base + path, Object.assign({}, opts, { headers }));
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
      method: 'POST', body: JSON.stringify({ username, password }),
    });
    this.setToken(r.token);
    return r;
  },
};
