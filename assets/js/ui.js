/* =========================================================================
 * 大屏 UI 交互层
 * - 顶部时钟 / 环境信息
 * - 顶部 KPI 卡
 * - 工艺单元热点（3D 跟随的 DOM 标签）+ 悬浮数据面板
 * - 左/右侧测点实时列表
 * - 告警滚动流
 * - 底部工具栏交互绑定
 * ========================================================================= */

import { SYS, UNITS, METRICS, KPI, ALARM_LIB } from './config.js';
import { API } from './api.js';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export class UI {
  constructor(scene, engine, charts) {
    this.scene = scene;
    this.engine = engine;
    this.charts = charts;
    this.activeUnit = null;
    this.hotspots = new Map();   // unitId -> el
  }

  init() {
    document.getElementById('sys-title').textContent = SYS.screenTitle;
    document.getElementById('sys-brand').textContent = `${SYS.brand} ${SYS.version}`;
    document.title = `${SYS.fullName} ${SYS.version}`;
    this._startClock();
    this._renderKPI();
    this._renderUnitList();
    this.alarms = [];
    this._alarmOnline = false;     // 告警由 main 循环调用 refreshAlarms() 驱动
  }

  /* —— 时钟 / 环境 —— */
  _startClock() {
    const tick = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      document.getElementById('clock-time').textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      document.getElementById('clock-date').textContent =
        `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} 周${WEEK[d.getDay()]}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* —— 顶部 KPI —— */
  _renderKPI() {
    const wrap = document.getElementById('kpi-bar');
    wrap.innerHTML = KPI.map((id) => {
      const m = METRICS[id];
      return `<div class="kpi" data-id="${id}">
        <div class="kpi-val num"><span class="v">--</span><i class="u">${m.unit}</i></div>
        <div class="kpi-name">${m.name}</div>
      </div>`;
    }).join('');
  }

  /* —— 工艺单元列表（左下，可点击定位）—— */
  _renderUnitList() {
    const wrap = document.getElementById('unit-list');
    wrap.innerHTML = UNITS.map((u) => `
      <div class="unit-item" data-id="${u.id}">
        <span class="dot ok" data-dot></span>
        <div class="ui-main">
          <div class="ui-name">${u.name}</div>
          <div class="ui-code">${u.code} · ${u.type}</div>
        </div>
        <span class="ui-go">定位 ›</span>
      </div>`).join('');
    wrap.querySelectorAll('.unit-item').forEach((el) => {
      el.addEventListener('click', () => this.focusUnit(el.dataset.id));
    });
  }

  /* —— 创建工艺单元热点（3D 跟随）—— */
  buildHotspots() {
    const layer = document.getElementById('hotspot-layer');
    layer.innerHTML = '';
    UNITS.forEach((u, i) => {
      const el = document.createElement('div');
      el.className = 'hotspot';
      el.dataset.id = u.id;
      el.innerHTML = `
        <span class="hs-ring"></span>
        <span class="hs-core num">${i + 1}</span>
        <span class="hs-label">${u.name}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); this.focusUnit(u.id); });
      layer.appendChild(el);
      this.hotspots.set(u.id, el);
    });
  }

  /* 每帧更新热点屏幕位置 */
  updateHotspots() {
    for (const [id, el] of this.hotspots) {
      const u = this.scene.units.get(id);
      if (!u) continue;
      const p = this.scene.project(u.anchorWorld);
      if (!p.visible) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.transform = `translate(-50%,-50%) translate(${p.x}px, ${p.y}px)`;
    }
    // 悬浮面板跟随
    if (this.activeUnit) {
      const u = this.scene.units.get(this.activeUnit);
      const panel = document.getElementById('float-panel');
      if (u && panel.classList.contains('show')) {
        const p = this.scene.project(u.anchorWorld);
        if (p.visible) {
          panel.style.left = Math.min(p.x + 26, window.innerWidth - 280) + 'px';
          panel.style.top = Math.max(p.y - 40, 90) + 'px';
        }
      }
    }
  }

  /* —— 聚焦某工艺单元：飞行 + 高亮 + 悬浮面板 + 侧栏测点 —— */
  focusUnit(unitId) {
    this.activeUnit = unitId;
    this.scene.flyToUnit(unitId);
    if (!this.scene.highlightUnit(unitId)) {
      // 无匹配网格时，高亮热点本身
    }
    document.querySelectorAll('.unit-item').forEach((el) =>
      el.classList.toggle('active', el.dataset.id === unitId));
    this._showFloatPanel(unitId);
  }

  _showFloatPanel(unitId) {
    const conf = UNITS.find((u) => u.id === unitId);
    const panel = document.getElementById('float-panel');
    panel.querySelector('.fp-title').textContent = conf.name;
    panel.querySelector('.fp-code').textContent = conf.code;
    const body = panel.querySelector('.fp-body');
    body.innerHTML = conf.keys.map((k) => {
      const m = METRICS[k];
      return `<div class="fp-cell" data-id="${k}">
        <div class="fp-k">${m.name}</div>
        <div class="fp-v num"><span class="v">--</span> <i>${m.unit}</i></div>
      </div>`;
    }).join('');
    panel.classList.add('show');
  }

  closeFloatPanel() {
    document.getElementById('float-panel').classList.remove('show');
    this.activeUnit = null;
    this.scene.clearHighlight();
    document.querySelectorAll('.unit-item').forEach((el) => el.classList.remove('active'));
  }

  /* —— 每帧/每秒数据刷新 —— */
  refresh() {
    const E = this.engine;
    // KPI
    document.querySelectorAll('#kpi-bar .kpi').forEach((el) => {
      const id = el.dataset.id;
      el.querySelector('.v').textContent = E.format(id);
      const st = E.get(id).status;
      el.classList.toggle('warn', st === 'warn');
      el.classList.toggle('alarm', st === 'alarm');
    });
    // 悬浮面板
    if (this.activeUnit) {
      const body = document.querySelector('#float-panel .fp-body');
      body?.querySelectorAll('.fp-cell').forEach((c) => {
        const id = c.dataset.id;
        c.querySelector('.v').textContent = E.format(id);
        const st = E.get(id).status;
        c.classList.toggle('warn', st === 'warn');
        c.classList.toggle('alarm', st === 'alarm');
      });
    }
    // 工艺单元状态点（取该单元任一测点最坏状态）
    document.querySelectorAll('.unit-item').forEach((el) => {
      const conf = UNITS.find((u) => u.id === el.dataset.id);
      const worst = this._unitStatus(conf);
      const dot = el.querySelector('[data-dot]');
      dot.className = 'dot ' + worst;
    });
    // 热点状态色
    for (const [id, el] of this.hotspots) {
      const conf = UNITS.find((u) => u.id === id);
      el.dataset.status = this._unitStatus(conf);
    }
  }

  _unitStatus(conf) {
    let worst = 'ok';
    for (const k of conf.keys) {
      const st = this.engine.get(k)?.status;
      if (st === 'alarm') return 'alarm';
      if (st === 'warn') worst = 'warn';
    }
    return worst;
  }

  /* —— 告警流（优先后端，离线回退本地生成）—— */
  async refreshAlarms() {
    try {
      const list = await API.get('/api/alarms?limit=30');
      this.alarms = list.map((a) => ({ lv: a.lv, unit: a.dev, msg: a.msg, time: (a.time || '').slice(11) }));
      this._alarmOnline = true;
      if (this._localTimer) { clearInterval(this._localTimer); this._localTimer = null; }
      this._renderAlarms();
    } catch (e) {
      if (!this._alarmOnline) this._startLocalAlarms();   // 后端不可达：本地兜底
    }
  }

  _startLocalAlarms() {
    if (this._localTimer) return;
    const push = () => {
      const t = ALARM_LIB[Math.floor(Math.random() * ALARM_LIB.length)];
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      this.alarms.unshift({ ...t, time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` });
      if (this.alarms.length > 30) this.alarms.pop();
      this._renderAlarms();
    };
    push(); push(); push();
    this._localTimer = setInterval(push, 4500);
  }

  _renderAlarms() {
    const wrap = document.getElementById('alarm-list');
    wrap.innerHTML = this.alarms.map((a) => `
      <div class="alarm-row ${a.lv}">
        <span class="dot ${a.lv === 'alarm' ? 'alarm' : a.lv === 'warn' ? 'warn' : 'ok'}"></span>
        <span class="al-time num">${a.time}</span>
        <span class="al-unit">${a.unit}</span>
        <span class="al-msg">${a.msg}</span>
      </div>`).join('');
  }

  /* —— 工具栏 —— */
  bindToolbar() {
    const S = this.scene;
    const map = {
      'tb-reset':  () => { S.resetView(); this.closeFloatPanel(); },
      'tb-cruise': (btn) => { const on = btn.classList.toggle('on'); S.setCruise(on); },
      'tb-section':(btn) => {
        const on = btn.classList.toggle('on');
        S.setSection(on, 0.5);
        document.getElementById('section-slider').style.display = on ? 'flex' : 'none';
      },
      'tb-wire':   (btn) => { const on = btn.classList.toggle('on'); S.setWireframe(on); },
      'tb-full':   () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      },
    };
    for (const id in map) {
      const btn = document.getElementById(id);
      btn?.addEventListener('click', () => map[id](btn));
    }
    // 剖切滑块
    const slider = document.querySelector('#section-slider input');
    slider?.addEventListener('input', (e) => S.setSection(true, e.target.value / 100));

    // 画布点击拾取
    S.renderer.domElement.addEventListener('click', (e) => {
      const rect = S.renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const hit = S.raycastSelect(x, y);
      if (hit && hit.unitId) { this.focusUnit(hit.unitId); }
    });
    // 关闭悬浮面板
    document.querySelector('#float-panel .fp-close')?.addEventListener('click', () => this.closeFloatPanel());
  }
}
