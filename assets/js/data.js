/* =========================================================================
 * 实时数据引擎（前端模拟）
 * - 对每个测点做带惯性的平滑随机游走，贴近真实工况曲线
 * - 自动判定状态：normal / warn / alarm
 * - 维护各测点最近 N 点历史，供趋势图使用
 * 真实项目可将 sample() 替换为 WebSocket/MQTT 实时数据源。
 * ========================================================================= */

import { METRICS } from './config.js';
import { API } from './api.js';

const HIST_LEN = 60;

function rand(seed) { // 无 Math.random 依赖时的兜底（此处仍用 Math.random，浏览器端可用）
  return Math.random();
}

export class DataEngine {
  constructor() {
    this.state = {};   // id -> { value, status }
    this.hist = {};    // id -> [values...]
    for (const id in METRICS) {
      const m = METRICS[id];
      this.state[id] = { value: m.base, status: 'normal', vel: 0 };
      this.hist[id] = Array.from({ length: HIST_LEN }, () => m.base);
    }
  }

  // 单测点推进一步
  _step(id) {
    const m = METRICS[id];
    const s = this.state[id];

    if (m.discrete) {
      // 离散量：小概率跳变
      if (rand() < 0.02) {
        s.value = Math.max(m.min, Math.min(m.max, Math.round(m.base + (rand() < 0.5 ? -1 : 1) * (rand() < 0.5 ? 0 : 1))));
      }
    } else {
      // 连续量：向基准回归的随机游走（OU 过程近似）
      const target = m.base;
      const k = 0.04;                     // 回归强度
      const noise = (rand() - 0.5) * m.jitter * 0.5;
      s.vel = s.vel * 0.7 + (target - s.value) * k + noise;
      s.value += s.vel;
      // 限幅（软边界，允许偶发越限触发告警）
      const lo = m.min - m.jitter * 0.4, hi = m.max + m.jitter * 0.4;
      if (s.value < lo) { s.value = lo; s.vel = Math.abs(s.vel); }
      if (s.value > hi) { s.value = hi; s.vel = -Math.abs(s.vel); }
    }

    s.status = this._evalStatus(m, s.value);

    const arr = this.hist[id];
    arr.push(s.value);
    if (arr.length > HIST_LEN) arr.shift();
    return s;
  }

  _evalStatus(m, v) {
    // 越上限
    if (m.alarmAt != null && v >= m.alarmAt) return 'alarm';
    if (m.warnAt  != null && v >= m.warnAt)  return 'warn';
    // 越下限（如脱硫效率、pH）
    if (m.lowAlarm != null && v <= m.lowAlarm) return 'alarm';
    if (m.lowWarn  != null && v <= m.lowWarn)  return 'warn';
    if (m.highWarn != null && v >= m.highWarn) return 'warn';
    return 'normal';
  }

  // 全量推进一帧
  tick() {
    for (const id in METRICS) this._step(id);
    return this.state;
  }

  get(id) { return this.state[id]; }
  history(id) { return this.hist[id]; }

  // 取格式化文本
  format(id) {
    const m = METRICS[id];
    const s = this.state[id];
    if (m.enum) return m.enum[Math.round(s.value)] ?? '-';
    let v = s.value;
    if (m.dp === 0) v = Math.round(v);
    else v = v.toFixed(m.dp);
    // 大数加千分位
    if (m.dp === 0 && Math.abs(s.value) >= 10000) {
      v = Math.round(s.value).toLocaleString('en-US');
    }
    return v;
  }
}

/* =========================================================================
 * 数据源：优先后端真实遥测（轮询 /api/telemetry/latest），
 * 后端不可达时自动回退本地模拟引擎，保证离线也能演示。
 * 对外接口与 DataEngine 一致：get(id) / format(id) / history(id)
 * ========================================================================= */
export class DataSource {
  constructor() {
    this.cache = {};
    this.online = false;
    this.fallback = new DataEngine();   // 离线兜底
  }

  async poll() {
    try {
      const d = await API.get('/api/telemetry/latest');
      if (d && Object.keys(d).length) { this.cache = d; this.online = true; }
    } catch (e) {
      this.online = false;              // 后端不可达 → 回退本地
    }
  }

  // 离线时推进本地引擎（在线时无需）
  tickFallback() { if (!this.online) this.fallback.tick(); }

  get(id) {
    const c = this.cache[id];
    if (this.online && c) return { value: c.value, status: c.status };
    return this.fallback.get(id);
  }

  format(id) {
    const c = this.cache[id];
    if (this.online && c && c.display != null) return c.display;
    return this.fallback.format(id);
  }

  history(id) { return this.fallback.history(id); }
}
