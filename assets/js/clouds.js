/* =========================================================================
 * 「拨开云彩」加载动画（增强版）
 * - 全屏云层 = 左/右两块 Canvas 云团，加载时向两侧拨开 + 透明度消散
 * - 拨开量随加载进度做缓动（前段缓慢、临近完成时迅猛拨开），更有戏剧性
 * - 云层有轻微漂移呼吸感；拨开缝处有暖色光晕逐渐增强
 * - 自动探测 assets/img/cloud.png：存在则用真实云图，否则用自绘云团
 * - 加载层背景透明，云拨开后直接透出后方三维场景
 * ========================================================================= */

export class CloudLoader {
  constructor() {
    this.root = document.getElementById('cloud-loader');
    this.barFill = document.getElementById('cloud-bar-fill');
    this.percentEl = document.getElementById('cloud-percent');
    this.tipEl = document.getElementById('cloud-tip');
    this.seam = document.getElementById('cloud-seam');
    this.left = document.getElementById('cloud-left');       // 外层 div：拨开位移
    this.right = document.getElementById('cloud-right');
    this.leftCanvas = this.left.querySelector('canvas');     // 子 canvas：绘制
    this.rightCanvas = this.right.querySelector('canvas');
    this.progress = 0;
    this.shown = 0;
    this._raf = null;
    this._t0 = performance.now();
    this._tips = [
      '正在连接孪生数据中台…',
      '加载脱硫装置三维模型…',
      '初始化吸收塔工艺测点…',
      '校准烟气在线监测 CEMS…',
      '渲染数字孪生场景…',
    ];
    this._tipIdx = 0;

    // 尝试加载真实云图，成功则用图、失败回退自绘
    this._cloudImg = null;
    const img = new Image();
    img.onload = () => { this._cloudImg = img; this._redraw(); };
    img.onerror = () => { this._cloudImg = null; this._redraw(); };
    img.src = './assets/img/cloud.png';

    this._redraw();
    window.addEventListener('resize', () => this._redraw());
    this._loop();
    this._rotateTips();
  }

  _redraw() {
    this._paint(this.leftCanvas, -1);
    this._paint(this.rightCanvas, 1);
  }

  // 绘制单侧云层：外侧不透明、内侧（拨开缝）羽化柔边
  _paint(canvas, side) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width = Math.max(2, canvas.clientWidth * dpr);
    const h = canvas.height = Math.max(2, canvas.clientHeight * dpr);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    if (this._cloudImg) {                       // —— 真实云图模式 ——
      this._paintImage(ctx, w, h, side);
    } else {                                    // —— 自绘云团模式 ——
      this._paintProcedural(ctx, w, h, side, dpr);
    }
    // 内缘羽化遮罩：仅最内侧窄带柔化为透明，保证起始全屏铺满、拨开时中缝才柔和露出
    const fade = ctx.createLinearGradient(0, 0, w, 0);
    if (side < 0) { fade.addColorStop(0.86, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)'); }
    else { fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.14, 'rgba(0,0,0,0)'); }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  _paintImage(ctx, w, h, side) {
    const img = this._cloudImg;
    // 覆盖式平铺缩放
    const scale = Math.max(w / img.width, h / img.height) * 1.1;
    const iw = img.width * scale, ih = img.height * scale;
    const ox = side < 0 ? 0 : w - iw;          // 外侧对齐
    ctx.drawImage(img, ox, (h - ih) / 2, iw, ih);
  }

  _paintProcedural(ctx, w, h, side, dpr) {
    // 底色：暖白云体，外侧浓、内侧淡
    const base = ctx.createLinearGradient(side < 0 ? 0 : w, 0, side < 0 ? w : 0, 0);
    base.addColorStop(0, 'rgba(232,230,226,0.98)');
    base.addColorStop(0.5, 'rgba(214,212,210,0.92)');
    base.addColorStop(0.82, 'rgba(180,182,188,0.55)');
    base.addColorStop(1, 'rgba(150,152,160,0)');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // 云团：大量柔和径向斑，外侧密集，偶发暖橙高光（贴合主题）
    const puffs = 150;
    for (let i = 0; i < puffs; i++) {
      const outerBias = Math.pow(Math.random(), 1.5);     // 0=内侧 1=外侧
      let x = side < 0 ? w * (1 - outerBias) : w * outerBias;
      x += (Math.random() - 0.5) * w * 0.22;
      const y = Math.random() * h;
      const r = (70 + Math.random() * 240) * dpr;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const warm = Math.random();
      if (warm > 0.82) {
        g.addColorStop(0, 'rgba(255,196,120,0.30)');      // 暖橙高光
        g.addColorStop(0.4, 'rgba(255,210,150,0.12)');
      } else {
        g.addColorStop(0, 'rgba(255,253,248,0.42)');      // 云体高光
        g.addColorStop(0.45, 'rgba(220,220,225,0.16)');
      }
      g.addColorStop(1, 'rgba(200,200,210,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  setProgress(p) { this.progress = Math.max(this.progress, Math.min(1, p)); }

  _rotateTips() {
    this._tipTimer = setInterval(() => {
      if (!this.tipEl || this.tipEl.style.color === 'rgb(255, 107, 107)') return; // 报错态不轮播
      this._tipIdx = (this._tipIdx + 1) % this._tips.length;
      this.tipEl.style.opacity = 0;
      setTimeout(() => { this.tipEl.textContent = this._tips[this._tipIdx]; this.tipEl.style.opacity = 1; }, 300);
    }, 1600);
  }

  _loop() {
    const tick = () => {
      this.shown += (this.progress - this.shown) * 0.07;
      const pct = Math.round(this.shown * 100);

      // 拨开量缓动：前段几乎不动，临近完成迅猛拨开
      const eased = Math.pow(this.shown, 2.2);
      const sep = eased * 60;                              // vw
      // 轻微漂移呼吸（未拨开时也有生命感）
      const t = (performance.now() - this._t0) / 1000;
      const drift = Math.sin(t * 0.6) * (1 - eased) * 1.2;

      this.left.style.transform  = `translateX(${-sep + drift}vw) scale(${1 + eased * 0.18})`;
      this.right.style.transform = `translateX(${ sep - drift}vw) scale(${1 + eased * 0.18})`;

      const fade = Math.max(0, (this.shown - 0.6) / 0.4);  // 后段整体淡出
      this.left.style.opacity = this.right.style.opacity = String(1 - fade * 0.85);

      // 拨开缝暖光：随拨开增强，完成前最亮
      if (this.seam) {
        const glow = Math.min(1, eased * 1.4) * (1 - fade);
        this.seam.style.opacity = String(glow * 0.9);
        this.seam.style.transform = `translateX(-50%) scaleY(${0.6 + eased * 0.8})`;
      }

      if (this.barFill) this.barFill.style.width = pct + '%';
      if (this.percentEl) this.percentEl.textContent = pct + '%';
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  finish() {
    this.setProgress(1);
    return new Promise((resolve) => {
      const wait = () => {
        if (this.shown > 0.985) {
          clearInterval(this._tipTimer);
          this.root.classList.add('done');
          setTimeout(() => {
            cancelAnimationFrame(this._raf);
            this.root.style.display = 'none';
            resolve();
          }, 1000);
        } else { requestAnimationFrame(wait); }
      };
      wait();
    });
  }
}
