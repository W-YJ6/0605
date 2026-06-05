/* =========================================================================
 * ECharts 图表面板（橙色主题）
 * - 脱硫效率趋势（折线）
 * - SO₂ 进/出口对比（双折线，对数感知）
 * - 工艺能耗占比（环形）
 * - 达标排放率（仪表）
 * - 设备运行状态（横向条）
 * 依赖全局 window.echarts（由 index.html 通过 CDN 引入）
 * ========================================================================= */

const ORANGE = '#ff9416', ORANGE_SOFT = '#ffc24b', YELLOW = '#ffd34e';
const GRID_LINE = 'rgba(255,168,60,.10)';
const AXIS_LABEL = { color: '#8b97a8', fontSize: 11 };

function baseGrid(extra = {}) {
  return Object.assign({ left: 38, right: 16, top: 24, bottom: 22 }, extra);
}
function axisCommon() {
  return {
    axisLine: { lineStyle: { color: 'rgba(255,168,60,.25)' } },
    splitLine: { lineStyle: { color: GRID_LINE } },
    axisLabel: AXIS_LABEL,
    axisTick: { show: false },
  };
}

export class Charts {
  constructor() {
    this.inst = {};
    this._init();
    window.addEventListener('resize', () => { for (const k in this.inst) this.inst[k]?.resize(); });
  }

  _make(id) {
    const el = document.getElementById(id);
    if (!el || !window.echarts) return null;
    const c = window.echarts.init(el, null, { renderer: 'canvas' });
    this.inst[id] = c;
    return c;
  }

  _init() {
    this._initEff();
    this._initSO2();
    this._initEnergy();
    this._initGauge();
    this._initStatus();
  }

  // 脱硫效率趋势
  _initEff() {
    const c = this._make('chart-eff'); if (!c) return;
    c.setOption({
      grid: baseGrid(),
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(17,22,31,.92)', borderColor: ORANGE, textStyle: { color: '#ffeccb' },
        valueFormatter: (v) => Number(v).toFixed(2) + ' %' },
      xAxis: { type: 'category', boundaryGap: false, data: [], ...axisCommon() },
      yAxis: { type: 'value', min: 94, max: 100, ...axisCommon() },
      series: [{
        type: 'line', smooth: true, symbol: 'none', data: [],
        lineStyle: { width: 2.5, color: ORANGE },
        areaStyle: { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(255,148,22,.45)' }, { offset: 1, color: 'rgba(255,148,22,0)' }]) },
      }],
    });
  }

  // 进/出口 SO₂
  _initSO2() {
    const c = this._make('chart-so2'); if (!c) return;
    c.setOption({
      grid: baseGrid({ right: 46 }),
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(17,22,31,.92)', borderColor: ORANGE, textStyle: { color: '#ffeccb' },
        valueFormatter: (v) => Number(v).toFixed(1) + ' mg/m³' },
      legend: { data: ['入口', '出口'], textStyle: { color: '#8b97a8', fontSize: 11 }, right: 8, top: 2 },
      xAxis: { type: 'category', boundaryGap: false, data: [], ...axisCommon() },
      yAxis: [
        { type: 'value', name: '入口', position: 'left', ...axisCommon() },
        { type: 'value', name: '出口', position: 'right', ...axisCommon() },
      ],
      series: [
        { name: '入口', type: 'line', smooth: true, symbol: 'none', data: [], lineStyle: { color: ORANGE_SOFT, width: 2 } },
        { name: '出口', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none', data: [], lineStyle: { color: '#4ab8ff', width: 2 } },
      ],
    });
  }

  // 工艺能耗占比
  _initEnergy() {
    const c = this._make('chart-energy'); if (!c) return;
    c.setOption({
      tooltip: { trigger: 'item', backgroundColor: 'rgba(17,22,31,.92)', borderColor: ORANGE, textStyle: { color: '#ffeccb' }, formatter: '{b}: {d}%' },
      legend: { bottom: 0, textStyle: { color: '#8b97a8', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie', radius: ['42%', '66%'], center: ['50%', '44%'], avoidLabelOverlap: true,
        itemStyle: { borderColor: '#0b0f17', borderWidth: 2 },
        label: { color: '#d6dde8', fontSize: 11, formatter: '{d}%' },
        data: [
          { name: '增压风机', value: 38, itemStyle: { color: ORANGE } },
          { name: '循环泵',   value: 31, itemStyle: { color: ORANGE_SOFT } },
          { name: '氧化风机', value: 16, itemStyle: { color: YELLOW } },
          { name: '脱水系统', value: 9,  itemStyle: { color: '#c98a3a' } },
          { name: '其它',     value: 6,  itemStyle: { color: '#6b7585' } },
        ],
      }],
    });
  }

  // 达标排放率仪表
  _initGauge() {
    const c = this._make('chart-gauge'); if (!c) return;
    c.setOption({
      series: [{
        type: 'gauge', startAngle: 210, endAngle: -30, min: 90, max: 100, radius: '88%', center: ['50%', '56%'],
        progress: { show: true, width: 12, itemStyle: { color: ORANGE } },
        axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(255,168,60,.15)']] } },
        axisTick: { distance: -16, splitNumber: 5, lineStyle: { color: 'rgba(255,168,60,.4)' } },
        splitLine: { distance: -18, length: 8, lineStyle: { color: 'rgba(255,168,60,.6)' } },
        axisLabel: { distance: -2, color: '#8b97a8', fontSize: 9 },
        pointer: { width: 4, itemStyle: { color: YELLOW } },
        anchor: { show: true, size: 8, itemStyle: { color: ORANGE } },
        detail: { valueAnimation: true, formatter: '{value}%', color: '#ffeccb', fontSize: 20, offsetCenter: [0, '38%'] },
        title: { offsetCenter: [0, '70%'], color: '#8b97a8', fontSize: 11 },
        data: [{ value: 99.7, name: '达标排放率' }],
      }],
    });
  }

  // 设备运行状态横向条
  _initStatus() {
    const c = this._make('chart-status'); if (!c) return;
    const names = ['增压风机', '循环泵A', '循环泵B', '氧化风机', 'GGH', '脱水机'];
    const load = [82, 91, 0, 76, 64, 58];
    c.setOption({
      grid: baseGrid({ left: 58, right: 28 }),
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(17,22,31,.92)', borderColor: ORANGE, textStyle: { color: '#ffeccb' } },
      xAxis: { type: 'value', max: 100, ...axisCommon() },
      yAxis: { type: 'category', data: names, ...axisCommon() },
      series: [{
        type: 'bar', data: load, barWidth: 10,
        itemStyle: { borderRadius: 5, color: (p) => p.value === 0 ? '#5d6779' : new window.echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#e6760a' }, { offset: 1, color: ORANGE_SOFT }]) },
        label: { show: true, position: 'right', color: '#8b97a8', fontSize: 10, formatter: (p) => p.value === 0 ? '备用' : p.value + '%' },
      }],
    });
  }

  // —— 实时刷新 ——
  pushEff(label, eff) {
    const c = this.inst['chart-eff']; if (!c) return;
    const opt = c.getOption();
    const x = opt.xAxis[0].data, d = opt.series[0].data;
    x.push(label); d.push(+eff);
    if (x.length > 30) { x.shift(); d.shift(); }
    c.setOption({ xAxis: [{ data: x }], series: [{ data: d }] });
  }

  pushSO2(label, sin, sout) {
    const c = this.inst['chart-so2']; if (!c) return;
    const opt = c.getOption();
    const x = opt.xAxis[0].data, a = opt.series[0].data, b = opt.series[1].data;
    x.push(label); a.push(Math.round(sin)); b.push(+(+sout).toFixed(1));
    if (x.length > 30) { x.shift(); a.shift(); b.shift(); }
    c.setOption({ xAxis: [{ data: x }], series: [{ data: a }, { data: b }] });
  }

  setGauge(v) {
    const c = this.inst['chart-gauge']; if (!c) return;
    c.setOption({ series: [{ data: [{ value: +(+v).toFixed(1), name: '达标排放率' }] }] });
  }
}
