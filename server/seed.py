# -*- coding: utf-8 -*-
"""首次启动时写入初始数据（仅当库为空）"""
import time
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

from database import db
from models import (User, Product, Device, LinkageRule, Alarm, MetricDef,
                    TelemetryLatest, TelemetryHistory, DailyReport)

# —— 脱硫工况测点定义（湿法脱硫 WFGD）——
METRIC_DEFS = [
    # id, 名称, 单位, base, jitter, min, max, dp, 选项(warn_at/alarm_at/low_warn/low_alarm/high_warn), owner
    dict(id='eff', name='脱硫效率', unit='%', base=98.6, jitter=0.6, vmin=95, vmax=99.9, dp=2, low_warn=96, low_alarm=95, owner='脱硫吸收塔'),
    dict(id='so2_in', name='入口SO₂浓度', unit='mg/m³', base=2450, jitter=180, vmin=1500, vmax=3500, dp=0, owner='原烟气系统'),
    dict(id='so2_out', name='出口SO₂浓度', unit='mg/m³', base=24, jitter=10, vmin=0, vmax=50, dp=1, warn_at=35, alarm_at=50, owner='CEMS在线监测'),
    dict(id='ph', name='浆液pH值', unit='', base=5.6, jitter=0.25, vmin=5.0, vmax=6.2, dp=2, low_warn=5.2, high_warn=6.0, owner='吸收塔pH计'),
    dict(id='slurry_density', name='浆液密度', unit='kg/m³', base=1110, jitter=25, vmin=1050, vmax=1180, dp=0, owner='脱硫吸收塔'),
    dict(id='tower_level', name='吸收塔液位', unit='m', base=8.6, jitter=0.4, vmin=7.0, vmax=10.0, dp=2, high_warn=9.6, owner='脱硫吸收塔'),

    dict(id='pump_run', name='循环泵运行', unit='台', base=3, jitter=0, vmin=0, vmax=4, dp=0, discrete=True, owner='浆液循环泵'),
    dict(id='pump_current', name='循环泵电流', unit='A', base=186, jitter=14, vmin=120, vmax=240, dp=0, owner='浆液循环泵'),
    dict(id='pump_pressure', name='泵出口压力', unit='kPa', base=285, jitter=18, vmin=220, vmax=340, dp=0, owner='浆液循环泵'),
    dict(id='flow_slurry', name='浆液流量', unit='m³/h', base=4200, jitter=220, vmin=3200, vmax=5000, dp=0, owner='浆液循环泵'),

    dict(id='ox_flow', name='氧化风量', unit='m³/h', base=9800, jitter=400, vmin=8000, vmax=12000, dp=0, owner='氧化风机'),
    dict(id='ox_pressure', name='氧化风压', unit='kPa', base=78, jitter=6, vmin=55, vmax=95, dp=0, owner='氧化风机'),
    dict(id='ox_current', name='氧化风机电流', unit='A', base=142, jitter=12, vmin=90, vmax=190, dp=0, owner='氧化风机'),

    dict(id='flue_flow', name='烟气流量', unit='m³/h', base=1340000, jitter=60000, vmin=1000000, vmax=1600000, dp=0, owner='增压风机'),
    dict(id='booster_rpm', name='增压风机转速', unit='r/min', base=990, jitter=35, vmin=600, vmax=1200, dp=0, owner='增压风机'),
    dict(id='booster_current', name='增压风机电流', unit='A', base=318, jitter=22, vmin=200, vmax=400, dp=0, owner='增压风机'),

    dict(id='flue_temp_in', name='原烟气温度', unit='℃', base=128, jitter=6, vmin=110, vmax=160, dp=1, owner='GGH换热器'),
    dict(id='flue_temp_out', name='净烟气温度', unit='℃', base=52, jitter=3, vmin=45, vmax=80, dp=1, owner='GGH换热器'),
    dict(id='ggh_dp', name='GGH压差', unit='Pa', base=760, jitter=60, vmin=400, vmax=1200, dp=0, warn_at=1100, owner='GGH换热器'),

    dict(id='mist_dp', name='除雾器压差', unit='Pa', base=165, jitter=22, vmin=80, vmax=300, dp=0, warn_at=260, owner='除雾器'),
    dict(id='mist_flush', name='冲洗状态', unit='', base=1, jitter=0, vmin=0, vmax=1, dp=0, discrete=True, enum=['停运', '冲洗中'], owner='除雾器'),

    dict(id='gypsum_water', name='石膏含水率', unit='%', base=9.4, jitter=1.2, vmin=6, vmax=14, dp=1, warn_at=12, owner='石膏脱水系统'),
    dict(id='gypsum_out', name='石膏产量', unit='t/h', base=18.5, jitter=2, vmin=10, vmax=28, dp=1, owner='石膏脱水系统'),

    dict(id='so2_emit', name='排口SO₂', unit='mg/m³', base=22, jitter=8, vmin=0, vmax=50, dp=1, warn_at=35, alarm_at=50, owner='CEMS在线监测'),
    dict(id='dust_emit', name='排口烟尘', unit='mg/m³', base=4.2, jitter=1.5, vmin=0, vmax=15, dp=1, warn_at=8, alarm_at=10, owner='CEMS在线监测'),
    dict(id='o2_net', name='净烟气含氧量', unit='%', base=6.1, jitter=0.4, vmin=4, vmax=9, dp=1, owner='CEMS在线监测'),
    dict(id='emit_temp', name='排口烟温', unit='℃', base=51, jitter=3, vmin=45, vmax=80, dp=1, owner='烟囱'),
]

PRODUCTS = [
    ('P01', 'WFGD吸收塔PLC', '控制系统', 'MODBUS-TCP', '2025-03-01'),
    ('P02', '高压变频器', '动力设备', 'MODBUS-RTU', '2025-03-01'),
    ('P03', '风机状态监测', '监测仪表', 'MODBUS-TCP', '2025-03-20'),
    ('P04', 'DCS网关', '通信网关', 'OPC-UA', '2025-02-10'),
    ('P05', '在线分析仪', '监测仪表', 'HART', '2025-04-10'),
    ('P06', 'CEMS采集仪', '环保监测', 'MODBUS-TCP', '2025-01-05'),
]

DEVICES = [
    ('D-TA01', '1号脱硫吸收塔控制柜', 'WFGD-T01-PLC', 'WFGD吸收塔PLC', ['MODBUS-TCP', 'MQTT'], 'on', '2025-03-12', 'controller'),
    ('D-PP01', '浆液循环泵A变频器', 'WFGD-P01-VFD', '高压变频器', ['MODBUS-RTU', 'OPC-UA'], 'on', '2025-03-12', 'pump'),
    ('D-PP02', '浆液循环泵B变频器', 'WFGD-P02-VFD', '高压变频器', ['MODBUS-RTU', 'OPC-UA'], 'off', '2025-03-15', 'pump'),
    ('D-OF01', '氧化风机监测仪', 'WFGD-OF01', '风机状态监测', ['MODBUS-TCP'], 'on', '2025-04-02', 'fan'),
    ('D-BF01', '增压风机DCS接口', 'WFGD-BF01-GW', 'DCS网关', ['OPC-UA', 'MQTT'], 'on', '2025-02-20', 'fan'),
    ('D-PH01', '吸收塔pH/密度计', 'WFGD-PH01', '在线分析仪', ['HART', 'MODBUS-RTU'], 'warn', '2025-04-18', 'analyzer'),
    ('D-CEMS', '烟气在线监测CEMS', 'WFGD-CEMS01', 'CEMS采集仪', ['MODBUS-TCP', 'MQTT'], 'on', '2025-01-09', 'sensor'),
    ('D-GY01', '石膏脱水皮带机PLC', 'WFGD-GY01-PLC', '脱水系统PLC', ['MODBUS-TCP'], 'on', '2025-05-06', 'gear'),
    ('D-DM01', '除雾器冲洗控制器', 'WFGD-DM01', '冲洗控制器', ['MODBUS-RTU'], 'off', '2025-05-21', 'water'),
]

RULES = [
    ('R01', '除雾器压差高自动冲洗', '除雾器压差 ≥ 260Pa', '启动冲洗水电磁阀 30s', 'on'),
    ('R02', '浆液pH低联锁补浆', '吸收塔pH < 5.2', '开启石灰石浆液补给阀', 'on'),
    ('R03', '排口SO₂超标预警', '排口SO₂ ≥ 35mg/m³', '推送告警 + 提升循环量', 'on'),
    ('R04', '循环泵故障自动切备', '运行泵电流 = 0', '启动备用循环泵', 'off'),
    ('R05', '塔液位高高联锁', '吸收塔液位 ≥ 9.8m', '停浆液补给 + 报警', 'on'),
]


def _now_str(dt=None):
    return (dt or datetime.now()).strftime('%Y-%m-%d %H:%M:%S')


def seed_all():
    """仅当用户表为空时执行初始化"""
    if User.query.first():
        return

    # 管理员
    db.session.add(User(username='admin',
                        password_hash=generate_password_hash('admin123', method='pbkdf2:sha256'),
                        name='管理员', role='系统管理员'))

    for pid, name, cat, proto, t in PRODUCTS:
        db.session.add(Product(id=pid, name=name, category=cat, protocol=proto, created_at=t))

    for did, name, code, product, proto, status, active, icon in DEVICES:
        db.session.add(Device(id=did, name=name, code=code, product=product, protocols=proto,
                              status=status, active_date=active, icon=icon, created_at=active))

    for rid, name, cond, act, status in RULES:
        db.session.add(LinkageRule(id=rid, name=name, cond=cond, action=act, status=status))

    for m in METRIC_DEFS:
        db.session.add(MetricDef(
            id=m['id'], name=m['name'], unit=m['unit'], base=m['base'], jitter=m['jitter'],
            vmin=m['vmin'], vmax=m['vmax'], dp=m.get('dp', 0),
            warn_at=m.get('warn_at'), alarm_at=m.get('alarm_at'),
            low_warn=m.get('low_warn'), low_alarm=m.get('low_alarm'), high_warn=m.get('high_warn'),
            discrete=m.get('discrete', False), enum=m.get('enum'), owner=m.get('owner')))
        # 测点初值
        db.session.add(TelemetryLatest(metric_id=m['id'], value=m['base'], status='normal',
                                       updated_at=_now_str()))
        # 历史种子（60 点，便于初始曲线）
        t0 = time.time() - 60 * 2
        for i in range(60):
            db.session.add(TelemetryHistory(metric_id=m['id'], ts=t0 + i * 2, value=m['base']))

    # 初始告警/事件
    base = datetime.now()
    init_alarms = [
        ('CEMS在线监测', 'warn', '排口SO₂瞬时值偏高，建议提升浆液循环量', 6),
        ('吸收塔pH计', 'warn', '浆液pH接近下限，联锁补浆已执行', 12),
        ('浆液循环泵', 'event', 'B循环泵切换为备用停机', 28),
        ('氧化风机', 'event', '氧化风量自动寻优完成', 45),
        ('除雾器', 'warn', '除雾器压差偏高，建议启动冲洗', 70),
        ('石膏脱水系统', 'event', '真空皮带脱水机自动调速完成', 95),
    ]
    for dev, lv, msg, mins in init_alarms:
        db.session.add(Alarm(ts=_now_str(base - timedelta(minutes=mins)), device=dev,
                             level=lv, message=msg, acked=(mins > 40)))

    # 近 7 日报表（日期动态生成：截止今天往前 7 天）
    report_vals = [
        (98.4, 2480, 28, 412, 18.6), (98.6, 2510, 25, 426, 18.9),
        (98.9, 2390, 21, 408, 18.2), (98.3, 2620, 31, 433, 19.4),
        (99.1, 2450, 19, 418, 18.5), (98.7, 2540, 24, 421, 18.8),
        (99.0, 2470, 20, 415, 18.4),
    ]
    for i, (eff, si, so, gy, en) in enumerate(report_vals):
        d = (datetime.now() - timedelta(days=6 - i)).strftime('%m-%d')
        db.session.add(DailyReport(date=d, eff=eff, so2in=si, so2out=so, gypsum=gy, energy=en))

    db.session.commit()
