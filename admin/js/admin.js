/* =========================================================================
 * 化工脱硫设备数字孪生 - 设备物联管理后台
 * 全部数据来自后端 REST 接口（SQLite 落库），登录走真实鉴权。
 * 模块：运行概览 / 设备管理 / 产品管理 / 设备联动 / 运维告警 / 运行报表
 * 图标统一使用内联 SVG（替代 emoji）。
 * ========================================================================= */

/* ===================== 内联 SVG 图标 ===================== */
const ICONS = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  device: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  product: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
  linkage: '<path d="M9.5 13.5a4 4 0 005.7 0l2.3-2.3a4 4 0 00-5.7-5.7l-1.1 1.1"/><path d="M14.5 10.5a4 4 0 00-5.7 0l-2.3 2.3a4 4 0 005.7 5.7l1.1-1.1"/>',
  ops: '<path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z"/><path d="M10 21a2 2 0 004 0"/>',
  report: '<line x1="3" y1="21" x2="21" y2="21"/><rect x="5" y="11" width="3" height="8" rx="0.5"/><rect x="10.5" y="5" width="3" height="14" rx="0.5"/><rect x="16" y="14" width="3" height="5" rx="0.5"/>',

  controller: '<rect x="5" y="3" width="14" height="18" rx="1"/><line x1="9" y1="7" x2="15" y2="7"/><circle cx="12" cy="14" r="2.5"/>',
  pump: '<circle cx="11" cy="12" r="6"/><path d="M17 12h4M11 18v3M7 21h8M11 9v3l2.5 1.5"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-3-1-6 1.5-6S15 8 12 10M14 12c3-1 6-1 6 1.5S16 15 14 12M12 14c1 3 1 6-1.5 6S9 16 12 14M10 12c-3 1-6 1-6-1.5S8 9 10 12"/>',
  analyzer: '<path d="M9 3h6M10 3v5l-4.5 9A2 2 0 007.3 20h9.4a2 2 0 001.8-3L14 8V3"/><line x1="8" y1="14" x2="16" y2="14"/>',
  sensor: '<path d="M5 11a7 7 0 0114 0M8 13a4 4 0 018 0"/><circle cx="12" cy="16" r="1.2"/><line x1="12" y1="16" x2="12" y2="20"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  water: '<path d="M12 3c4 5 6 8.5 6 11a6 6 0 01-12 0c0-2.5 2-6 6-11z"/>',

  total: '<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5"/>',
  online: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/>',
  warn: '<path d="M12 4l9 16H3L12 4z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.6"/>',
  offline: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',

  monitor: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  logout: '<path d="M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M9 12h11M16 8l4 4-4 4"/>',
  search: '<circle cx="11" cy="11" r="6"/><line x1="16" y1="16" x2="21" y2="21"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 6.3M20 5v6h-6"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  reset: '<path d="M4 11a8 8 0 102.3-6.3M4 5v6h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  export: '<path d="M12 3v12M8 11l4 4 4-4M5 21h14"/>',
  weather: '<path d="M7 18a4 4 0 010-8 5 5 0 019.6-1.5A3.5 3.5 0 0117 18z"/>',
};
function ic(name, cls) {
  return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

/* ===================== 菜单 ===================== */
const MENU = [
  { key: 'home',        icon: 'overview', name: '运行概览' },
  { key: 'device-list', icon: 'device',   name: '设备管理' },
  { key: 'product',     icon: 'product',  name: '产品管理' },
  { key: 'linkage',     icon: 'linkage',  name: '设备联动' },
  { key: 'ops',         icon: 'ops',      name: '运维告警' },
  { key: 'report',      icon: 'report',   name: '运行报表' },
];
const ROUTE_TITLE = {
  home: '运行概览', 'device-list': '设备管理', product: '产品管理',
  linkage: '设备联动', ops: '运维告警', report: '运行报表',
};

let curDevices = [];
let alarmFilter = '';

/* ===================== 登录 ===================== */
// 后台不单独登录：有有效会话则直接进入，否则跳回大屏统一登录入口
async function initLogin() {
  if (API.token) {
    try { await API.get('/api/auth/me'); return enterApp(); }
    catch (e) { API.clear(); }
  }
  location.replace('../index.html');     // 统一登录入口（大屏登录页）
}
function enterApp() {
  document.getElementById('app').classList.add('show');
  renderMenu();
  bindTop();
  go('home');
}
function logout() { API.clear(); location.replace('../index.html'); }

/* ===================== 框架 ===================== */
function renderMenu() {
  const wrap = document.getElementById('menu');
  wrap.innerHTML = MENU.map((m) =>
    `<div class="menu-item" data-route="${m.key}"><span class="mi-icon">${ic(m.icon)}</span><span>${m.name}</span></div>`
  ).join('');
  wrap.querySelectorAll('[data-route]').forEach((el) => el.addEventListener('click', () => go(el.dataset.route)));
}
function bindTop() {
  document.getElementById('btn-logout')?.addEventListener('click', logout);
}
function go(route) {
  document.querySelectorAll('#menu [data-route]').forEach((el) => el.classList.toggle('active', el.dataset.route === route));
  document.getElementById('crumb').innerHTML = `首页 / <b>${ROUTE_TITLE[route] || '页面'}</b>`;
  document.getElementById('content').innerHTML = (PAGES[route] || PAGES.home)();
  PAGE_HOOKS[route]?.();
}

/* ===================== 页面骨架 ===================== */
const PAGES = {
  home() {
    return `
      <div class="page-head"><h3>运行概览</h3><span class="ph-sub">化工脱硫装置物联设备总览</span></div>
      <div class="stat-grid" id="stat-grid"></div>
      <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:14px">
        <div class="panel" style="padding:16px"><div class="page-head"><h3 style="font-size:15px">通信协议分布</h3></div><div id="proto-box"></div></div>
        <div class="panel" style="padding:16px"><div class="page-head"><h3 style="font-size:15px">最近告警 / 事件</h3></div>
          <table class="tbl"><thead><tr><th>时间</th><th>设备</th><th>事件</th><th>级别</th></tr></thead><tbody id="recent-body"></tbody></table></div>
      </div>`;
  },
  'device-list'() {
    return `
      <div class="panel">
        <div class="filter-bar">
          <div class="field"><label>设备名称</label><input id="f-name" placeholder="请输入设备名称" /></div>
          <div class="field"><label>设备编号</label><input id="f-code" placeholder="请输入设备编号" /></div>
          <div class="field"><label>设备状态</label>
            <select id="f-status"><option value="">全部</option><option value="on">在线</option><option value="off">离线</option><option value="warn">预警</option></select></div>
          <button class="btn2 primary" id="btn-search">${ic('search')} 搜索</button>
          <button class="btn2" id="btn-reset">${ic('reset')} 重置</button>
        </div>
        <div class="action-bar">
          <button class="btn2 ghost" id="btn-add">${ic('plus')} 新增设备</button>
          <button class="btn2">分配设备</button>
          <button class="btn2">批量导出</button>
          <label class="checkbox"><input type="checkbox" checked /> 显示下级机构数据</label>
          <div class="spacer"></div>
          <button class="icon-btn" id="btn-refresh" title="刷新">${ic('refresh')}</button>
          <button class="icon-btn" title="卡片视图">${ic('grid')}</button>
        </div>
      </div>
      <div class="panel" style="padding:14px;margin-top:14px"><div class="dev-grid" id="dev-grid"></div></div>`;
  },
  product() {
    return `
      <div class="page-head"><h3>产品管理</h3><span class="ph-sub">脱硫设备产品物模型</span>
        <div class="spacer" style="flex:1"></div><button class="btn2 primary" id="btn-add-prod">${ic('plus')} 新增产品</button></div>
      <div class="panel" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>产品ID</th><th>产品名称</th><th>分类</th><th>协议</th><th>设备数</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody id="prod-body"></tbody></table></div>`;
  },
  linkage() {
    return `
      <div class="page-head"><h3>设备联动</h3><span class="ph-sub">工艺安全联锁规则</span>
        <div class="spacer" style="flex:1"></div><button class="btn2 primary" id="btn-add-rule">${ic('plus')} 新增规则</button></div>
      <div class="panel" style="padding:0;overflow:hidden">
        <table class="tbl"><thead><tr><th>规则ID</th><th>规则名称</th><th>触发条件</th><th>执行动作</th><th>状态</th><th>操作</th></tr></thead>
        <tbody id="rule-body"></tbody></table></div>`;
  },
  ops() {
    return `
      <div class="page-head"><h3>运维告警</h3><span class="ph-sub" id="ops-sub">告警与事件记录</span></div>
      <div class="panel">
        <div class="filter-bar">
          <div class="field"><label>级别</label>
            <select id="f-lv"><option value="">全部</option><option value="alarm">告警</option><option value="warn">预警</option><option value="event">事件</option></select></div>
          <button class="btn2 primary" id="btn-lv">${ic('search')} 筛选</button>
          <div class="spacer" style="flex:1"></div>
          <button class="btn2 ghost" id="btn-ackall">全部标记已处理</button>
        </div>
        <div style="padding:0 16px 16px"><table class="tbl"><thead>
          <tr><th>时间</th><th>设备</th><th>级别</th><th>内容</th><th>处理状态</th><th>操作</th></tr></thead>
          <tbody id="alarm-body"></tbody></table></div>
      </div>`;
  },
  report() {
    return `
      <div class="page-head"><h3>运行报表</h3><span class="ph-sub" id="rp-sub">近 7 日脱硫运行统计</span>
        <div class="spacer" style="flex:1"></div><button class="btn2 primary" id="btn-export">${ic('export')} 导出报表</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="panel" style="padding:14px"><div class="page-head"><h3 style="font-size:15px">脱硫效率趋势</h3></div><div id="rp-eff" style="height:230px"></div></div>
        <div class="panel" style="padding:14px"><div class="page-head"><h3 style="font-size:15px">进 / 出口 SO₂</h3></div><div id="rp-so2" style="height:230px"></div></div>
      </div>
      <div class="panel" style="padding:0;overflow:hidden;margin-top:14px">
        <table class="tbl"><thead><tr><th>日期</th><th>脱硫效率</th><th>入口SO₂(mg/m³)</th><th>出口SO₂(mg/m³)</th><th>石膏产量</th><th>能耗</th><th>达标</th></tr></thead>
        <tbody id="report-body"></tbody></table></div>`;
  },
};

/* ===================== 钩子（异步拉取 API）===================== */
const PAGE_HOOKS = {
  async home() {
    try {
      const o = await API.get('/api/overview');
      const stats = [
        { ic: 'total', c: '#ff8a1e', v: o.total, n: '接入设备总数' },
        { ic: 'online', c: '#19b36b', v: o.on, n: '在线运行' },
        { ic: 'warn', c: '#f0a200', v: o.warn, n: '预警设备' },
        { ic: 'offline', c: '#9aa3b0', v: o.off, n: '离线 / 备用' },
      ];
      document.getElementById('stat-grid').innerHTML = stats.map((s) =>
        `<div class="stat"><div class="s-ic" style="background:${s.c}">${ic(s.ic)}</div>
          <div><div class="s-val">${s.v}</div><div class="s-name">${s.n}</div></div></div>`).join('');
      const entries = Object.entries(o.proto);
      const maxP = Math.max(1, ...entries.map((e) => e[1]));
      document.getElementById('proto-box').innerHTML = entries.map(([k, v]) =>
        `<div style="display:flex;align-items:center;gap:10px;margin:9px 0">
          <span style="width:96px;font-size:13px;color:#2b3340">${k}</span>
          <div style="flex:1;height:10px;background:#f0f2f6;border-radius:6px;overflow:hidden">
            <div style="width:${v / maxP * 100}%;height:100%;background:linear-gradient(90deg,#ff7a00,#ffd34e)"></div></div>
          <span style="width:34px;text-align:right;font-size:12px;color:#8a93a3">${v}台</span></div>`).join('');
      document.getElementById('recent-body').innerHTML = o.recent.map((a) =>
        `<tr><td>${(a.time || '').slice(11)}</td><td>${a.dev}</td><td>${a.msg}</td><td>${lvPill(a.lv)}</td></tr>`).join('');
    } catch (e) { toast('加载概览失败：' + e.message); }
  },

  'device-list'() {
    loadDevices();
    document.getElementById('btn-search').onclick = loadDevices;
    document.getElementById('btn-reset').onclick = () => {
      ['f-name', 'f-code', 'f-status'].forEach((i) => { document.getElementById(i).value = ''; });
      loadDevices();
    };
    document.getElementById('btn-refresh').onclick = () => { loadDevices(); toast('已刷新设备列表'); };
    document.getElementById('btn-add').onclick = openAddDevice;
  },

  async product() {
    await loadProducts();
    document.getElementById('btn-add-prod').onclick = openAddProduct;
  },

  async linkage() {
    await loadRules();
    document.getElementById('btn-add-rule').onclick = openAddRule;
  },

  ops() {
    loadAlarms();
    document.getElementById('btn-lv').onclick = () => { alarmFilter = val('f-lv'); loadAlarms(); };
    document.getElementById('btn-ackall').onclick = async () => {
      await API.post('/api/alarms/ack-all'); loadAlarms(); toast('已全部标记为已处理');
    };
  },

  async report() {
    try {
      const rows = await API.get('/api/reports/daily');
      renderReport(rows);
      document.getElementById('btn-export').onclick = () => exportCSV(rows);
    } catch (e) { toast('加载报表失败：' + e.message); }
  },
};

/* ===================== 设备 ===================== */
async function loadDevices() {
  const qs = new URLSearchParams();
  const n = val('f-name'), c = val('f-code'), s = val('f-status');
  if (n) qs.set('name', n);
  if (c) qs.set('code', c);
  if (s) qs.set('status', s);
  try {
    curDevices = await API.get('/api/devices?' + qs.toString());
    renderDevices();
  } catch (e) { toast('加载设备失败：' + e.message); }
}
function renderDevices() {
  const grid = document.getElementById('dev-grid');
  if (!grid) return;
  if (!curDevices.length) { grid.innerHTML = `<div class="placeholder" style="grid-column:1/-1">暂无匹配设备</div>`; return; }
  grid.innerHTML = curDevices.map((d) => {
    const stTag = d.status === 'on' ? '<span class="tag on">在线</span>'
      : d.status === 'warn' ? '<span class="tag warn">预警</span>' : '<span class="tag off">离线</span>';
    return `<div class="dev-card" data-id="${d.id}">
      <div class="dc-head"><span class="dc-name">${d.name}</span>${stTag}</div>
      <div class="dc-tags">${(d.proto || []).map((p) => `<span class="proto">${p}</span>`).join('')}</div>
      <div class="dc-body"><div class="dc-info">编号：<b>${d.code}</b><br/>产品：<b>${d.product}</b><br/>激活时间：<b>${d.active}</b></div>
        <div class="dc-pic">${ic(d.icon || 'controller', 'pic')}</div></div>
      <div class="dc-foot">
        <div class="dc-btn del"  data-act="del"  data-id="${d.id}">删除</div>
        <div class="dc-btn view" data-act="view" data-id="${d.id}">查看</div>
        <div class="dc-btn run ${d.status === 'off' ? 'off' : ''}" data-act="run" data-id="${d.id}">运行状态</div>
      </div></div>`;
  }).join('');
  grid.querySelectorAll('[data-act]').forEach((el) => el.onclick = (e) => {
    e.stopPropagation();
    const id = el.dataset.id, act = el.dataset.act;
    if (act === 'del') delDevice(id); else if (act === 'view') viewDevice(id); else toggleRun(id);
  });
}
async function delDevice(id) {
  const d = curDevices.find((x) => x.id === id);
  if (!confirm(`确认删除设备「${d.name}」？`)) return;
  await API.del('/api/devices/' + id);
  loadDevices(); toast('设备已删除');
}
async function toggleRun(id) {
  try {
    const d = await API.patch('/api/devices/' + id, { toggle: true });
    loadDevices(); toast(`「${d.name}」已${d.status === 'on' ? '上线' : '离线'}`);
  } catch (e) { toast('操作失败：' + e.message); }
}
function viewDevice(id) {
  const d = curDevices.find((x) => x.id === id);
  const st = d.status === 'on' ? '在线' : d.status === 'warn' ? '预警' : '离线';
  openModal('设备详情', `
    <div class="kv"><span class="k">设备名称</span><span class="v">${d.name}</span></div>
    <div class="kv"><span class="k">设备编号</span><span class="v">${d.code}</span></div>
    <div class="kv"><span class="k">所属产品</span><span class="v">${d.product}</span></div>
    <div class="kv"><span class="k">通信协议</span><span class="v">${(d.proto || []).join(' / ')}</span></div>
    <div class="kv"><span class="k">运行状态</span><span class="v">${st}</span></div>
    <div class="kv"><span class="k">激活时间</span><span class="v">${d.active}</span></div>
    <div class="kv"><span class="k">数据上报</span><span class="v">每 2s 一次（${(d.proto || [''])[0]}）</span></div>`, null);
}
async function openAddDevice() {
  let products = [];
  try { products = await API.get('/api/products'); } catch (e) { /* ignore */ }
  openModal('新增设备', `
    <div class="field"><label>设备名称</label><input id="m-name" placeholder="如：2号脱硫吸收塔控制柜" /></div>
    <div class="field"><label>设备编号</label><input id="m-code" placeholder="如：WFGD-T02-PLC" /></div>
    <div class="field"><label>所属产品</label><select id="m-prod">${products.map((p) => `<option>${p.name}</option>`).join('')}</select></div>
    <div class="field"><label>通信协议</label><select id="m-proto"><option>MODBUS-TCP</option><option>MODBUS-RTU</option><option>OPC-UA</option><option>MQTT</option><option>HART</option></select></div>
    <div class="field"><label>设备类型</label><select id="m-icon"><option value="controller">控制柜</option><option value="pump">泵</option><option value="fan">风机</option><option value="analyzer">分析仪</option><option value="sensor">在线监测</option><option value="gear">机械设备</option><option value="water">水处理</option></select></div>`,
    async () => {
      const name = val('m-name'); if (!name) { toast('请填写设备名称'); return false; }
      try {
        await API.post('/api/devices', { name, code: val('m-code'), product: val('m-prod'), proto: val('m-proto'), icon: val('m-icon') });
        loadDevices(); toast('设备新增成功'); return true;
      } catch (e) { toast('新增失败：' + e.message); return false; }
    });
}

/* ===================== 产品 ===================== */
async function loadProducts() {
  try {
    const list = await API.get('/api/products');
    document.getElementById('prod-body').innerHTML = list.map((p) => `<tr>
      <td>${p.id}</td><td><b>${p.name}</b></td><td>${p.cat}</td><td><span class="proto">${p.proto}</span></td>
      <td>${p.count}</td><td>${p.time}</td>
      <td><a style="color:#f5503e;cursor:pointer" data-del="${p.id}">删除</a></td></tr>`).join('');
    document.querySelectorAll('#prod-body [data-del]').forEach((el) => el.onclick = async () => {
      await API.del('/api/products/' + el.dataset.del); loadProducts(); toast('产品已删除');
    });
  } catch (e) { toast('加载产品失败：' + e.message); }
}
function openAddProduct() {
  openModal('新增产品', `
    <div class="field"><label>产品名称</label><input id="p-name" placeholder="如：增压风机控制器" /></div>
    <div class="field"><label>产品分类</label><select id="p-cat"><option>控制系统</option><option>动力设备</option><option>监测仪表</option><option>通信网关</option><option>环保监测</option></select></div>
    <div class="field"><label>通信协议</label><select id="p-proto"><option>MODBUS-TCP</option><option>MODBUS-RTU</option><option>OPC-UA</option><option>MQTT</option><option>HART</option></select></div>`,
    async () => {
      const name = val('p-name'); if (!name) { toast('请填写产品名称'); return false; }
      try {
        await API.post('/api/products', { name, cat: val('p-cat'), proto: val('p-proto') });
        loadProducts(); toast('产品新增成功'); return true;
      } catch (e) { toast('新增失败：' + e.message); return false; }
    });
}

/* ===================== 联动 ===================== */
async function loadRules() {
  try {
    const list = await API.get('/api/rules');
    document.getElementById('rule-body').innerHTML = list.map((r) => `<tr>
      <td>${r.id}</td><td><b>${r.name}</b></td><td>${r.cond}</td><td>${r.act}</td>
      <td><span class="pill ${r.status === 'on' ? 'on' : 'off'}">${r.status === 'on' ? '启用' : '停用'}</span></td>
      <td><a style="color:#ff8a1e;cursor:pointer" data-toggle="${r.id}">${r.status === 'on' ? '停用' : '启用'}</a></td></tr>`).join('');
    document.querySelectorAll('#rule-body [data-toggle]').forEach((el) => el.onclick = async () => {
      const r = await API.patch('/api/rules/' + el.dataset.toggle); loadRules(); toast(`规则已${r.status === 'on' ? '启用' : '停用'}`);
    });
  } catch (e) { toast('加载规则失败：' + e.message); }
}
function openAddRule() {
  openModal('新增联动规则', `
    <div class="field"><label>规则名称</label><input id="r-name" placeholder="如：氧化风压低报警" /></div>
    <div class="field"><label>触发条件</label><input id="r-cond" placeholder="如：氧化风压 < 55kPa" /></div>
    <div class="field"><label>执行动作</label><input id="r-act" placeholder="如：启动备用氧化风机" /></div>`,
    async () => {
      const name = val('r-name'); if (!name) { toast('请填写规则名称'); return false; }
      try {
        await API.post('/api/rules', { name, cond: val('r-cond'), act: val('r-act') });
        loadRules(); toast('规则新增成功'); return true;
      } catch (e) { toast('新增失败：' + e.message); return false; }
    });
}

/* ===================== 告警 ===================== */
function lvPill(lv) {
  if (lv === 'alarm') return '<span class="pill" style="background:rgba(245,80,62,.14);color:#f5503e">告警</span>';
  if (lv === 'warn') return '<span class="pill" style="background:rgba(240,162,0,.16);color:#d98c00">预警</span>';
  return '<span class="pill" style="background:rgba(59,139,240,.14);color:#3b8bf0">事件</span>';
}
async function loadAlarms() {
  try {
    const list = await API.get('/api/alarms?limit=50' + (alarmFilter ? '&level=' + alarmFilter : ''));
    const unack = list.filter((a) => !a.done).length;
    const sub = document.getElementById('ops-sub');
    if (sub) sub.textContent = `告警与事件记录 · 待处理 ${unack} 条`;
    document.getElementById('alarm-body').innerHTML = list.map((a) => `<tr>
      <td>${a.time}</td><td>${a.dev}</td><td>${lvPill(a.lv)}</td><td>${a.msg}</td>
      <td>${a.done ? '<span class="pill on">已处理</span>' : '<span class="pill off">待处理</span>'}</td>
      <td>${a.done ? '<span style="color:#b3bbc7">—</span>' : `<a style="color:#ff8a1e;cursor:pointer" data-ack="${a.id}">确认</a>`}</td></tr>`).join('')
      || `<tr><td colspan="6" style="text-align:center;color:#8a93a3;padding:30px">无记录</td></tr>`;
    document.querySelectorAll('#alarm-body [data-ack]').forEach((el) => el.onclick = async () => {
      await API.patch('/api/alarms/' + el.dataset.ack + '/ack'); loadAlarms(); toast('已标记为已处理');
    });
  } catch (e) { toast('加载告警失败：' + e.message); }
}

/* ===================== 报表 ===================== */
function renderReport(rows) {
  document.getElementById('report-body').innerHTML = rows.map((r) => `<tr>
    <td>${r.date}</td><td>${r.eff}%</td><td>${r.so2in}</td><td>${r.so2out}</td>
    <td>${r.gypsum} t</td><td>${r.energy} 万kWh</td>
    <td>${r.so2out <= 35 ? '<span class="pill on">达标</span>' : '<span class="pill off">超标</span>'}</td></tr>`).join('');
  const avg = (rows.reduce((s, r) => s + r.eff, 0) / rows.length).toFixed(2);
  const sub = document.getElementById('rp-sub');
  if (sub) sub.textContent = `近 7 日脱硫运行统计 · 平均效率 ${avg}%`;
  if (!window.echarts) { toast('图表库未加载，请检查网络'); return; }
  const dates = rows.map((r) => r.date), orange = '#ff8a1e', soft = '#ffc24b';
  const eff = window.echarts.init(document.getElementById('rp-eff'));
  eff.setOption({
    grid: { left: 44, right: 16, top: 24, bottom: 28 }, tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8a93a3' } },
    yAxis: { type: 'value', min: 97, max: 100, axisLabel: { color: '#8a93a3' }, splitLine: { lineStyle: { color: '#eef1f5' } } },
    series: [{ type: 'line', smooth: true, data: rows.map((r) => r.eff), lineStyle: { color: orange, width: 3 }, symbolSize: 6, itemStyle: { color: orange },
      areaStyle: { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(255,138,30,.35)' }, { offset: 1, color: 'rgba(255,138,30,0)' }]) } }],
  });
  const so2 = window.echarts.init(document.getElementById('rp-so2'));
  so2.setOption({
    grid: { left: 44, right: 16, top: 30, bottom: 28 }, tooltip: { trigger: 'axis' },
    legend: { data: ['入口', '出口'], right: 8, top: 0, textStyle: { color: '#8a93a3' } },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8a93a3' } },
    yAxis: [{ type: 'value', axisLabel: { color: '#8a93a3' }, splitLine: { lineStyle: { color: '#eef1f5' } } },
            { type: 'value', axisLabel: { color: '#8a93a3' }, splitLine: { show: false } }],
    series: [
      { name: '入口', type: 'bar', data: rows.map((r) => r.so2in), itemStyle: { color: soft, borderRadius: [4, 4, 0, 0] }, barWidth: 14 },
      { name: '出口', type: 'line', yAxisIndex: 1, smooth: true, data: rows.map((r) => r.so2out), lineStyle: { color: '#3b8bf0', width: 2 }, itemStyle: { color: '#3b8bf0' } },
    ],
  });
  window.addEventListener('resize', () => { eff.resize(); so2.resize(); }, { once: true });
}
function exportCSV(rows) {
  const header = ['日期', '脱硫效率(%)', '入口SO2(mg/m3)', '出口SO2(mg/m3)', '石膏产量(t)', '能耗(万kWh)'];
  const lines = [header.join(',')].concat(rows.map((r) => [r.date, r.eff, r.so2in, r.so2out, r.gypsum, r.energy].join(',')));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '脱硫运行报表.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('报表已导出');
}

/* ===================== 弹窗 / Toast / 工具 ===================== */
function val(id) { return (document.getElementById(id)?.value || '').trim(); }
function openModal(title, bodyHtml, onOk) {
  const mask = document.getElementById('modal-mask');
  mask.querySelector('.modal-head span').textContent = title;
  mask.querySelector('.modal-body').innerHTML = bodyHtml;
  mask.querySelector('.modal-foot').style.display = onOk === null ? 'none' : 'flex';
  mask.classList.add('show');
  const close = () => mask.classList.remove('show');
  mask.querySelector('.m-close').onclick = close;
  mask.querySelector('#m-cancel').onclick = close;
  mask.querySelector('#m-ok').onclick = async () => { if (!onOk || (await onOk()) !== false) close(); };
  mask.onclick = (e) => { if (e.target === mask) close(); };
}
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

document.addEventListener('DOMContentLoaded', initLogin);
