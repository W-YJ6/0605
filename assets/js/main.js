/* =========================================================================
 * 大屏主引导
 * 装配：拨云加载 → 三维场景 → 数据引擎 → 图表 → UI，
 * 并把 GLB 加载进度联动到拨云动画，最后启动渲染与数据双循环。
 * ========================================================================= */

import { MODEL, UNITS } from './config.js';
import { CloudLoader } from './clouds.js';
import { TwinScene } from './scene.js';
import { DataSource } from './data.js';
import { Charts } from './charts.js';
import { UI } from './ui.js';
import { API } from './api.js';

// 模块成功执行的标志（供看门狗判断主程序是否启动）
window.__TWIN_BOOTED__ = true;

// 把模型参数挂到 window 供 scene.js 读取（便于运行时调参）
window.__MODEL_FIT__ = MODEL.fitOffset;
window.__MODEL_YAW__ = MODEL.yawDeg;
window.__MODEL_PITCH__ = MODEL.pitchDeg;
window.__MODEL_ROT__ = MODEL.rotateSpeed;
window.__MODEL_GRID__ = MODEL.groundGrid;
window.__UNITS__ = UNITS;

/* —— 登录门控：登录通过后才进入大屏（与后台共享 sessionStorage 会话）—— */
const AUTH_KEY = 'twin_auth';

/* —— 演示模式判定 ——
 * 静态部署（如 GitHub Pages）没有 Flask 后端，自动进入演示模式：跳过登录、改用前端本地模拟数据。
 * 本地开发（localhost / 127.0.0.1）默认走真实后端；可用 ?demo=1 强制演示、?live=1 强制走后端。
 */
const _q = new URLSearchParams(location.search);
const _isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const DEMO = _q.has('demo') ? true : (_q.has('live') ? false : !_isLocal);

function showDemoBadge() {
  const b = document.createElement('div');
  b.textContent = '演示模式 · 模拟数据';
  b.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:9999;' +
    'padding:4px 14px;font-size:12px;letter-spacing:1px;color:#ffd9a6;white-space:nowrap;' +
    'background:rgba(255,148,22,.14);border:1px solid rgba(255,148,22,.5);border-radius:14px;' +
    'pointer-events:none;backdrop-filter:blur(4px);';
  document.body.appendChild(b);
  // 演示模式隐藏依赖后端的入口（管理后台 / 退出登录）
  document.querySelectorAll('.tb-nav a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.includes('admin') || a.id === 'logout-link') a.style.display = 'none';
  });
}

function gate() {
  const login = document.getElementById('screen-login');
  // 退出登录
  document.getElementById('logout-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    API.clear();
    location.reload();
  });

  // 演示模式：无后端，跳过登录直接进入大屏（数据/告警走前端本地兜底）
  if (DEMO) {
    API.demo = true;
    showDemoBadge();
    boot();
    return;
  }

  // 仅凭后端有效令牌判定已登录（保证两端切换都携带有效令牌）
  if (API.token) { boot(); return; }

  login.classList.add('show');
  document.getElementById('screen-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('sl-user').value.trim();
    const p = document.getElementById('sl-pass').value.trim();
    const errEl = document.getElementById('sl-err');
    errEl.textContent = '正在登录…';
    try {
      await API.login(u, p);                    // 后端真实鉴权，获取令牌
      sessionStorage.setItem(AUTH_KEY, '1');
      login.classList.remove('show');
      boot();
    } catch (err) {
      if (err.message === 'unauthorized' || /401|账号|密码/.test(err.message)) {
        errEl.textContent = '账号或密码错误，请重新输入';
      } else {
        errEl.textContent = '无法连接后端服务，请先启动 python server/run.py 并通过 http://localhost:5000 访问';
      }
    }
  });
}

async function boot() {
  const cloud = new CloudLoader();
  const stage = document.getElementById('stage');

  const scene = new TwinScene(stage);
  const source = new DataSource();
  const charts = new Charts();
  const ui = new UI(scene, source, charts);
  ui.init();
  ui.bindToolbar();

  // 加载模型（进度驱动拨云）
  try {
    await scene.load(MODEL.url, (p) => cloud.setProgress(p * 0.96));
  } catch (err) {
    console.error('模型加载失败：', err);
    document.getElementById('cloud-tip').textContent = '模型加载失败，请确认通过本地服务访问且 0605.glb 存在';
    // 仍继续渲染空场景
  }

  ui.buildHotspots();
  await cloud.finish();   // 完全拨开云彩

  // —— 渲染循环 ——
  const renderLoop = () => {
    scene.update();
    ui.updateHotspots();
    requestAnimationFrame(renderLoop);
  };
  renderLoop();

  // —— 数据循环 ——
  // 后端遥测轮询（2s）；离线时本地引擎兜底
  source.poll();
  setInterval(() => source.poll(), 2000);
  // 告警来自后端（5s 拉取一次），离线回退本地
  ui.refreshAlarms();
  setInterval(() => ui.refreshAlarms(), 5000);

  let secLabel = '';
  setInterval(() => {
    source.tickFallback();
    ui.refresh();
    const d = new Date();
    secLabel = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    charts.pushEff(secLabel, source.get('eff').value);
    charts.pushSO2(secLabel, source.get('so2_in').value, source.get('so2_out').value);
    // 达标率：排口 SO₂/烟尘均正常时视为达标
    const ok = source.get('so2_emit').status === 'normal' && source.get('dust_emit').status === 'normal';
    charts.setGauge(ok ? 99.7 : 98.9);
  }, 1000);

  // 首次刷新
  ui.refresh();
  console.log('%c数字孪生监控中心已启动', 'color:#ff9416;font-weight:bold');
}

gate();
