/* =========================================================================
 * 全局配置：系统信息 / 模型 / 工艺单元(热点) / 数据测点定义
 * 所有可调参数集中在此，方便对照真实模型微调。
 * ========================================================================= */

export const SYS = {
  fullName: '化工脱硫设备数字孪生可视化监控管理系统',
  screenTitle: '化工脱硫设备数字孪生监控中心',
  brand: '智硫孪生',
  version: 'V1.0',

};

/* —— 模型加载配置 ——
 * model：GLB 路径（与 index.html 同级）
 * autoFrame：true 时自动按包围盒取景，无需手填相机参数
 * up / front：模型朝向修正（部分导出件 Y/Z 轴会颠倒，可在此快速纠正）
 */
export const MODEL = {
  url: './0605.glb',
  autoFrame: true,
  fitOffset: 1.35,      // 取景留白系数，越大越远
  yawDeg: -28,          // 初始水平视角
  pitchDeg: 22,         // 初始俯仰视角
  rotateSpeed: 0.18,    // 自动巡航转速 (度/帧)
  groundGrid: true,     // 是否显示地面网格
};

/* —— 工艺单元 / 热点 ——
 * anchor：相对包围盒的归一化坐标 [x,y,z] ∈ [0,1]，(0,0,0)=包围盒最小角
 * 运行时会把 anchor 映射到模型真实世界坐标，因此无需知道绝对尺寸。
 * keys：该单元在右侧/悬浮面板展示的测点（对应 METRICS 的 id）
 * matchNames：用于在场景图中按名称模糊匹配真实网格做点击高亮（可留空）
 */
export const UNITS = [
  {
    id: 'absorber', name: '脱硫吸收塔', code: 'WFGD-T01', type: '核心反应单元',
    anchor: [0.50, 0.62, 0.50],
    keys: ['so2_in', 'so2_out', 'eff', 'ph', 'slurry_density', 'tower_level'],
    matchNames: ['tower', 'absorb', 'ta', '塔'],
  },
  {
    id: 'recycle_pump', name: '浆液循环泵组', code: 'WFGD-P', type: '动力循环单元',
    anchor: [0.24, 0.20, 0.40],
    keys: ['pump_run', 'pump_current', 'flow_slurry', 'pump_pressure'],
    matchNames: ['pump', '泵'],
  },
  {
    id: 'oxidation_fan', name: '氧化风机', code: 'WFGD-OF01', type: '氧化供气单元',
    anchor: [0.78, 0.22, 0.62],
    keys: ['ox_flow', 'ox_pressure', 'ox_current'],
    matchNames: ['fan', 'blower', '风机', 'oxid'],
  },
  {
    id: 'booster_fan', name: '增压风机', code: 'WFGD-BF01', type: '烟气增压单元',
    anchor: [0.16, 0.40, 0.70],
    keys: ['flue_flow', 'booster_rpm', 'booster_current'],
    matchNames: ['booster', 'idf', '增压'],
  },
  {
    id: 'ggh', name: 'GGH 烟气换热器', code: 'WFGD-GGH01', type: '热回收单元',
    anchor: [0.40, 0.48, 0.16],
    keys: ['flue_temp_in', 'flue_temp_out', 'ggh_dp'],
    matchNames: ['ggh', 'heat', 'exchang', '换热'],
  },
  {
    id: 'demister', name: '除雾器', code: 'WFGD-DM01', type: '净化除雾单元',
    anchor: [0.50, 0.86, 0.50],
    keys: ['mist_dp', 'mist_flush'],
    matchNames: ['demist', 'mist', '除雾'],
  },
  {
    id: 'gypsum', name: '石膏脱水系统', code: 'WFGD-GY01', type: '副产物处理单元',
    anchor: [0.82, 0.30, 0.24],
    keys: ['gypsum_water', 'gypsum_out'],
    matchNames: ['gypsum', '石膏', 'dewater'],
  },
  {
    id: 'stack', name: '净烟气烟囱 / CEMS', code: 'WFGD-ST01', type: '达标排放监测',
    anchor: [0.90, 0.92, 0.78],
    keys: ['so2_emit', 'dust_emit', 'o2_net', 'emit_temp'],
    matchNames: ['stack', 'chimney', '烟囱', 'cems'],
  },
];

/* —— 测点定义 ——
 * 每个测点：单位、正常区间[min,max]、波动基准 base、波动幅度 jitter、小数位 dp
 * 数据由 data.js 在区间内做平滑随机游走，超区间触发预警/告警。
 */
export const METRICS = {
  so2_in: { name: '入口SO₂浓度', unit: 'mg/m³', base: 2450, jitter: 180, min: 1500, max: 3500, dp: 0 },
  so2_out: { name: '出口SO₂浓度', unit: 'mg/m³', base: 24, jitter: 10, min: 0, max: 50, dp: 1, warnAt: 35, alarmAt: 50 },
  eff: { name: '脱硫效率', unit: '%', base: 98.6, jitter: 0.6, min: 95, max: 99.9, dp: 2, lowWarn: 96, lowAlarm: 95 },
  ph: { name: '浆液pH值', unit: '', base: 5.6, jitter: 0.25, min: 5.0, max: 6.2, dp: 2, lowWarn: 5.2, highWarn: 6.0 },
  slurry_density: { name: '浆液密度', unit: 'kg/m³', base: 1110, jitter: 25, min: 1050, max: 1180, dp: 0 },
  tower_level: { name: '吸收塔液位', unit: 'm', base: 8.6, jitter: 0.4, min: 7.0, max: 10.0, dp: 2 },

  pump_run: { name: '循环泵运行', unit: '台', base: 3, jitter: 0, min: 0, max: 4, dp: 0, discrete: true },
  pump_current: { name: '循环泵电流', unit: 'A', base: 186, jitter: 14, min: 120, max: 240, dp: 0 },
  pump_pressure: { name: '泵出口压力', unit: 'kPa', base: 285, jitter: 18, min: 220, max: 340, dp: 0 },
  flow_slurry: { name: '浆液流量', unit: 'm³/h', base: 4200, jitter: 220, min: 3200, max: 5000, dp: 0 },

  ox_flow: { name: '氧化风量', unit: 'm³/h', base: 9800, jitter: 400, min: 8000, max: 12000, dp: 0 },
  ox_pressure: { name: '氧化风压', unit: 'kPa', base: 78, jitter: 6, min: 55, max: 95, dp: 0 },
  ox_current: { name: '氧化风机电流', unit: 'A', base: 142, jitter: 12, min: 90, max: 190, dp: 0 },

  flue_flow: { name: '烟气流量', unit: 'm³/h', base: 1340000, jitter: 60000, min: 1000000, max: 1600000, dp: 0 },
  booster_rpm: { name: '增压风机转速', unit: 'r/min', base: 990, jitter: 35, min: 600, max: 1200, dp: 0 },
  booster_current: { name: '增压风机电流', unit: 'A', base: 318, jitter: 22, min: 200, max: 400, dp: 0 },

  flue_temp_in: { name: '原烟气温度', unit: '℃', base: 128, jitter: 6, min: 110, max: 160, dp: 1 },
  flue_temp_out: { name: '净烟气温度', unit: '℃', base: 52, jitter: 3, min: 45, max: 80, dp: 1 },
  ggh_dp: { name: 'GGH压差', unit: 'Pa', base: 760, jitter: 60, min: 400, max: 1200, dp: 0, warnAt: 1100 },

  mist_dp: { name: '除雾器压差', unit: 'Pa', base: 165, jitter: 22, min: 80, max: 300, dp: 0, warnAt: 260 },
  mist_flush: { name: '冲洗状态', unit: '', base: 1, jitter: 0, min: 0, max: 1, dp: 0, discrete: true, enum: ['停运', '冲洗中'] },

  gypsum_water: { name: '石膏含水率', unit: '%', base: 9.4, jitter: 1.2, min: 6, max: 14, dp: 1, warnAt: 12 },
  gypsum_out: { name: '石膏产量', unit: 't/h', base: 18.5, jitter: 2, min: 10, max: 28, dp: 1 },

  so2_emit: { name: '排口SO₂', unit: 'mg/m³', base: 22, jitter: 8, min: 0, max: 50, dp: 1, warnAt: 35, alarmAt: 50 },
  dust_emit: { name: '排口烟尘', unit: 'mg/m³', base: 4.2, jitter: 1.5, min: 0, max: 15, dp: 1, warnAt: 8, alarmAt: 10 },
  o2_net: { name: '净烟气含氧量', unit: '%', base: 6.1, jitter: 0.4, min: 4, max: 9, dp: 1 },
  emit_temp: { name: '排口烟温', unit: '℃', base: 51, jitter: 3, min: 45, max: 80, dp: 1 },
};

/* —— 顶部 KPI（大号关键指标）—— */
export const KPI = ['eff', 'so2_emit', 'so2_in', 'flue_flow', 'ph', 'tower_level'];

/* —— 模拟告警文案库 —— */
export const ALARM_LIB = [
  { lv: 'warn', unit: '除雾器', msg: '除雾器压差偏高，建议启动冲洗程序' },
  { lv: 'info', unit: '浆液循环泵', msg: '2号循环泵切换为备用运行' },
  { lv: 'warn', unit: 'GGH换热器', msg: 'GGH 压差上升，关注堵塞趋势' },
  { lv: 'alarm', unit: 'CEMS监测', msg: '排口SO₂瞬时值接近超标限值' },
  { lv: 'info', unit: '石膏脱水', msg: '真空皮带脱水机自动调速完成' },
  { lv: 'warn', unit: '吸收塔', msg: '浆液pH值低于设定下限，已联锁补浆' },
  { lv: 'info', unit: '氧化风机', msg: '氧化风量自动寻优，亚硫酸钙氧化充分' },
];
