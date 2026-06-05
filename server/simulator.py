# -*- coding: utf-8 -*-
"""数据模拟器：后台线程持续生成贴近工况的遥测并写库，越限自动生成告警。
真实部署时可替换为 PLC/DCS/MQTT 实时采集写库，前端无需改动。"""
import time
import random
import threading
from datetime import datetime

from database import db
from models import MetricDef, TelemetryLatest, TelemetryHistory, Alarm

_state = {}            # metric_id -> {'value', 'vel'}
_alarm_cd = {}         # metric_id -> 上次告警时间（冷却）


def _eval_status(m, v):
    if m.alarm_at is not None and v >= m.alarm_at:
        return 'alarm'
    if m.warn_at is not None and v >= m.warn_at:
        return 'warn'
    if m.low_alarm is not None and v <= m.low_alarm:
        return 'alarm'
    if m.low_warn is not None and v <= m.low_warn:
        return 'warn'
    if m.high_warn is not None and v >= m.high_warn:
        return 'warn'
    return 'normal'


def _disp(m, v):
    if m.dp == 0:
        iv = int(round(v))
        return f'{iv:,}' if abs(iv) >= 10000 else str(iv)
    return f'{v:.{m.dp}f}'


def _step(m, latest):
    """单测点推进一步（带惯性的回归随机游走，近似 OU 过程）"""
    st = _state.setdefault(m.id, {'value': latest.value if latest else m.base, 'vel': 0.0})
    if m.discrete:
        if random.random() < 0.02:
            st['value'] = max(m.vmin, min(m.vmax, round(m.base + random.choice([-1, 0, 1]))))
    else:
        noise = (random.random() - 0.5) * m.jitter * 0.5
        st['vel'] = st['vel'] * 0.7 + (m.base - st['value']) * 0.04 + noise
        st['value'] += st['vel']
        lo, hi = m.vmin - m.jitter * 0.4, m.vmax + m.jitter * 0.4
        if st['value'] < lo:
            st['value'] = lo
            st['vel'] = abs(st['vel'])
        if st['value'] > hi:
            st['value'] = hi
            st['vel'] = -abs(st['vel'])
    return st['value']


def _tick(app, keep, counter):
    with app.app_context():
        now = time.time()
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        defs = MetricDef.query.all()
        latest_map = {t.metric_id: t for t in TelemetryLatest.query.all()}

        for m in defs:
            latest = latest_map.get(m.id)
            v = _step(m, latest)
            status = _eval_status(m, v)
            if latest:
                latest.value, latest.status, latest.updated_at = v, status, now_str
            else:
                db.session.add(TelemetryLatest(metric_id=m.id, value=v, status=status, updated_at=now_str))
            db.session.add(TelemetryHistory(metric_id=m.id, ts=now, value=v))

            # 越限告警（同一测点 120s 冷却，避免刷屏）
            if status in ('warn', 'alarm') and not m.discrete:
                if now - _alarm_cd.get(m.id, 0) > 120 and random.random() < 0.4:
                    _alarm_cd[m.id] = now
                    label = '告警' if status == 'alarm' else '预警'
                    db.session.add(Alarm(ts=now_str, device=m.owner or m.name, level=status,
                                         message=f'{m.name}{label}：当前 {_disp(m, v)}{m.unit}', acked=False))
        db.session.commit()

        # 每 10 个周期清理一次过期历史
        if counter[0] % 10 == 0:
            for m in defs:
                rows = (TelemetryHistory.query.filter_by(metric_id=m.id)
                        .order_by(TelemetryHistory.id.desc()).offset(keep).all())
                for r in rows:
                    db.session.delete(r)
            db.session.commit()
        counter[0] += 1


def start_simulator(app):
    keep = app.config['HISTORY_KEEP']
    interval = app.config['SIM_INTERVAL']
    counter = [0]

    def loop():
        while True:
            try:
                _tick(app, keep, counter)
            except Exception as e:    # 保证线程不因偶发异常退出
                print('[simulator] 异常：', e)
            time.sleep(interval)

    th = threading.Thread(target=loop, daemon=True, name='telemetry-simulator')
    th.start()
    return th
