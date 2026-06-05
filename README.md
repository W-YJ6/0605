# 化工脱硫设备数字孪生可视化监控管理系统 V1.0

> 项目代号：**智硫孪生（DeSulf DigitalTwin）**
> 基于 **Flask + SQLite 后端服务 + Web 三维（Three.js）+ 数据可视化（ECharts）** 的化工湿法脱硫装置数字孪生系统，含「监控大屏」与「设备物联管理后台」两端，数据持久化、可查历史、真实登录鉴权。

🔗 **在线演示（监控大屏）**：<https://w-yj6.github.io/0605/>

> 在线演示为 **GitHub Pages 静态部署**，自动进入「演示模式」：免登录、数据由前端本地模拟，仅展示监控大屏与三维可视化。登录鉴权、管理后台、真实数据库等后端功能需按下文「部署与运行」在本地启动 `server/run.py` 体验。

---

## 一、系统简介

面向化工/电力行业 **石灰石—石膏湿法烟气脱硫（WFGD）** 装置，构建设备级数字孪生：

- 三维模型（`0605.glb`）在浏览器实时渲染，以**拨开云彩**动画完成加载，主题为橙/黄科技风；
- 对吸收塔、循环泵、氧化风机、增压风机、GGH、除雾器、石膏脱水、CEMS 等工艺单元进行**热点标注、实时测点、状态告警**；
- **后端服务**（Flask + SQLite）提供真实接口与数据持久化，后台**数据模拟器**持续生成贴近工况的遥测写入数据库（无物理传感器时的合规数据源，可平滑替换为 PLC/DCS/MQTT 实时采集）；
- 配套**设备物联管理后台**，实现设备接入、产品物模型、设备联动、运维告警、运行报表等管理能力。

### 命名说明（软著申请）
登记名称遵循「应用领域 + 技术特征 + 软件类型 + 版本号」结构：

> **化工脱硫设备数字孪生可视化监控管理系统 V1.0**

---

## 二、系统架构

单服务部署：Flask 同时托管前端静态资源与 `/api/*` 接口，SQLite 落库，后台线程跑数据模拟器持续写库。

```
浏览器 ──HTTP──> Flask (:5000)
  ├─ /              监控大屏（登录后进入；每2s轮询 /api/telemetry/latest）
  ├─ /admin/        管理后台（CRUD 走 /api/*）
  ├─ /assets /0605.glb  静态资源
  └─ /api/*         REST 接口（令牌鉴权）
                       ↕
                    SQLite (server/twin.db)  ←── 模拟器线程每2s写遥测/告警
```

- 实时数据：**HTTP 轮询**。后端不可达时，大屏**自动回退本地模拟**，保证离线也能演示。
- 鉴权：登录返回签名令牌（`itsdangerous`），密码 `werkzeug` 哈希存库；大屏与后台共享会话。

---

## 三、功能模块

### 1. 数字孪生监控大屏
登录门控 · 三维场景（包围盒自动取景/逐网格独立材质/暖色光照）· 拨开云彩加载（中缝光晕，支持放置 `assets/img/cloud.png` 切换真实云图）· 工艺单元热点 + 悬浮数据面板 · 顶部 KPI · 实时图表（效率趋势/进出口SO₂/能耗占比/达标率/设备负荷）· **后端实时告警流** · 三维交互（复位/巡航/剖切/线框/全屏/拾取）。

### 2. 设备物联管理后台
| 模块 | 说明 |
|---|---|
| 运行概览 | 设备统计、协议分布、最近告警（接口 `/api/overview`） |
| 设备管理 | 设备卡片、筛选、新增/删除/查看/上下线（落库持久化） |
| 产品管理 | 产品物模型，新增/删除 |
| 设备联动 | 工艺联锁规则，启用/停用、新增 |
| 运维告警 | 告警/事件记录，按级别筛选、单条确认 / 全部已处理 |
| 运行报表 | 近 7 日脱硫统计（ECharts 趋势/SO₂ + 明细表 + CSV 导出） |

> 界面图标统一为内联 SVG（非 emoji），更贴近企业级系统视觉。

---

## 四、技术栈

- **后端**：Flask 3 · Flask-SQLAlchemy 3 · SQLite · Flask-Cors（鉴权用 Flask 内置 itsdangerous + werkzeug）
- **前端**：原生 ES Module · Three.js 0.160 · Apache ECharts 5.5（依赖经国内镜像 CDN 加载）
- **实时**：HTTP 轮询（2s）

---

## 五、目录结构

```
0605/
├── index.html                 # 监控大屏
├── 0605.glb                   # 脱硫装置三维模型
├── assets/{css,js}/           # 大屏前端（api/scene/clouds/data/charts/ui/main + theme/screen.css）
├── admin/                     # 管理后台（index.html + css/js: api.js, admin.js）
├── server/                    # 后端服务
│   ├── run.py                 # 启动入口
│   ├── app.py                 # 应用工厂 + 前端托管
│   ├── config.py database.py models.py
│   ├── seed.py                # 初始数据（设备/产品/规则/测点/告警/报表）
│   ├── auth.py api.py         # 登录鉴权 + 业务接口
│   ├── simulator.py           # 遥测模拟器线程
│   └── requirements.txt
├── tools/inspect_glb.py       # 模型结构探查脚本
└── README.md
```

---

## 六、部署与运行

```bash
# 1. 安装后端依赖（建议 Python 3.10+）
pip install -r server/requirements.txt

# 2. 启动（自动建库 + 写入初始数据 + 起模拟器 + 起 Web）
python server/run.py
```

浏览器访问：

- 监控大屏：<http://localhost:5000>
- 管理后台：<http://localhost:5000/admin/>

**默认账号：`admin / admin123`**（密码哈希存库，可在 `server/seed.py` 修改初始密码）。
`server/twin.db` 首次启动自动生成；删除该文件可重置全部数据。

> 首次加载会从镜像 CDN 拉取 Three.js / ECharts，请保持联网。

---

## 七、REST 接口清单（除登录外均需 `Authorization: Bearer <token>`）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回令牌 |
| GET | `/api/auth/me` | 当前用户 |
| GET | `/api/overview` | 概览统计 |
| GET/POST | `/api/devices` | 设备列表（支持 name/code/status 过滤）/ 新增 |
| PATCH/DELETE | `/api/devices/<id>` | 上下线·编辑 / 删除 |
| GET/POST | `/api/products` ; DELETE `/api/products/<id>` | 产品 |
| GET/POST | `/api/rules` ; PATCH `/api/rules/<id>` | 联动规则 / 启停 |
| GET | `/api/alarms?level=` | 告警列表 |
| PATCH | `/api/alarms/<id>/ack` ; POST `/api/alarms/ack-all` | 确认 |
| GET | `/api/telemetry/latest` | 全测点最新值 |
| GET | `/api/telemetry/history?metric=&limit=` | 测点历史 |
| GET | `/api/reports/daily` | 近 7 日报表 |

---

## 八、数据来源与落地说明

- 当前遥测由 `server/simulator.py` 模拟生成并**持久化入库**，具备真实系统的历史查询、越限告警等行为。
- 接入真实装置时，只需将模拟器替换为 **PLC/DCS/OPC-UA/MQTT 采集程序**，按相同结构写入 `TelemetryLatest / TelemetryHistory / Alarm` 表，前端无需改动。
- 大屏在后端不可达时自动回退本地模拟（离线演示兜底）。

---

## 九、对照真实模型微调
- 相机/取景/巡航、工艺单元热点位置、点击高亮匹配、测点阈值等集中在 `assets/js/config.js`（`MODEL` / `UNITS[].anchor` / `UNITS[].matchNames` / `METRICS`）。
- 测点定义在后端 `server/seed.py` 的 `METRIC_DEFS`，与前端展示一致。

---

## 十、版权
© 智硫数字孪生研究中心　化工脱硫设备数字孪生可视化监控管理系统 V1.0
