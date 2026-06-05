# -*- coding: utf-8 -*-
"""业务接口（除登录外均需令牌）"""
import time
from datetime import datetime
from flask import Blueprint, request, jsonify

from database import db
from models import (Product, Device, LinkageRule, Alarm, MetricDef,
                    TelemetryLatest, DailyReport, TelemetryHistory)
from auth import require_token

api_bp = Blueprint('api', __name__, url_prefix='/api')


# —— 服务端数值格式化（与前端展示一致）——
def format_value(mdef, value):
    if mdef.discrete and mdef.enum:
        idx = max(0, min(len(mdef.enum) - 1, int(round(value))))
        return mdef.enum[idx]
    if mdef.dp == 0:
        v = int(round(value))
        return f'{v:,}' if abs(v) >= 10000 else str(v)
    return f'{value:.{mdef.dp}f}'


def _now():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


# ============ 运行概览 ============
@api_bp.get('/overview')
@require_token
def overview():
    devices = Device.query.all()
    on = sum(1 for d in devices if d.status == 'on')
    warn = sum(1 for d in devices if d.status == 'warn')
    off = sum(1 for d in devices if d.status == 'off')
    proto = {}
    for d in devices:
        for p in (d.protocols or []):
            proto[p] = proto.get(p, 0) + 1
    recent = [a.to_dict() for a in Alarm.query.order_by(Alarm.id.desc()).limit(5)]
    return jsonify({'total': len(devices), 'on': on, 'warn': warn, 'off': off,
                    'proto': proto, 'recent': recent})


# ============ 设备 ============
@api_bp.get('/devices')
@require_token
def list_devices():
    q = Device.query
    name = request.args.get('name', '').strip()
    code = request.args.get('code', '').strip()
    status = request.args.get('status', '').strip()
    if name:
        q = q.filter(Device.name.contains(name))
    if code:
        q = q.filter(Device.code.contains(code))
    if status:
        q = q.filter_by(status=status)
    return jsonify([d.to_dict() for d in q.all()])


@api_bp.post('/devices')
@require_token
def add_device():
    b = request.get_json(silent=True) or {}
    name = (b.get('name') or '').strip()
    if not name:
        return jsonify({'error': '请填写设备名称'}), 400
    did = 'D-' + str(int(time.time() * 1000))
    code = (b.get('code') or '').strip() or ('WFGD-N' + str(Device.query.count() + 1))
    dev = Device(id=did, name=name, code=code, product=b.get('product') or '',
                 protocols=[b.get('proto') or 'MODBUS-TCP'], status='on',
                 active_date=datetime.now().strftime('%Y-%m-%d'), icon=b.get('icon') or 'controller',
                 created_at=_now())
    db.session.add(dev)
    db.session.commit()
    return jsonify(dev.to_dict()), 201


@api_bp.patch('/devices/<did>')
@require_token
def update_device(did):
    dev = db.session.get(Device, did)
    if not dev:
        return jsonify({'error': '设备不存在'}), 404
    b = request.get_json(silent=True) or {}
    if 'toggle' in b:
        dev.status = 'on' if dev.status == 'off' else 'off'
    if 'status' in b:
        dev.status = b['status']
    if 'name' in b:
        dev.name = b['name']
    db.session.commit()
    return jsonify(dev.to_dict())


@api_bp.delete('/devices/<did>')
@require_token
def delete_device(did):
    dev = db.session.get(Device, did)
    if dev:
        db.session.delete(dev)
        db.session.commit()
    return jsonify({'ok': True})


# ============ 产品 ============
@api_bp.get('/products')
@require_token
def list_products():
    return jsonify([p.to_dict() for p in Product.query.all()])


@api_bp.post('/products')
@require_token
def add_product():
    b = request.get_json(silent=True) or {}
    name = (b.get('name') or '').strip()
    if not name:
        return jsonify({'error': '请填写产品名称'}), 400
    pid = 'P' + str(Product.query.count() + 1).zfill(2)
    p = Product(id=pid, name=name, category=b.get('cat') or '其它',
                protocol=b.get('proto') or 'MODBUS-TCP',
                created_at=datetime.now().strftime('%Y-%m-%d'))
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@api_bp.delete('/products/<pid>')
@require_token
def delete_product(pid):
    p = db.session.get(Product, pid)
    if p:
        db.session.delete(p)
        db.session.commit()
    return jsonify({'ok': True})


# ============ 联动规则 ============
@api_bp.get('/rules')
@require_token
def list_rules():
    return jsonify([r.to_dict() for r in LinkageRule.query.all()])


@api_bp.post('/rules')
@require_token
def add_rule():
    b = request.get_json(silent=True) or {}
    name = (b.get('name') or '').strip()
    if not name:
        return jsonify({'error': '请填写规则名称'}), 400
    rid = 'R' + str(LinkageRule.query.count() + 1).zfill(2)
    r = LinkageRule(id=rid, name=name, cond=b.get('cond') or '-',
                    action=b.get('act') or '-', status='on')
    db.session.add(r)
    db.session.commit()
    return jsonify(r.to_dict()), 201


@api_bp.patch('/rules/<rid>')
@require_token
def toggle_rule(rid):
    r = db.session.get(LinkageRule, rid)
    if not r:
        return jsonify({'error': '规则不存在'}), 404
    r.status = 'off' if r.status == 'on' else 'on'
    db.session.commit()
    return jsonify(r.to_dict())


# ============ 告警 ============
@api_bp.get('/alarms')
@require_token
def list_alarms():
    q = Alarm.query
    level = request.args.get('level', '').strip()
    if level:
        q = q.filter_by(level=level)
    limit = int(request.args.get('limit', 50))
    items = q.order_by(Alarm.id.desc()).limit(limit).all()
    return jsonify([a.to_dict() for a in items])


@api_bp.patch('/alarms/<int:aid>/ack')
@require_token
def ack_alarm(aid):
    a = db.session.get(Alarm, aid)
    if a:
        a.acked = True
        db.session.commit()
    return jsonify({'ok': True})


@api_bp.post('/alarms/ack-all')
@require_token
def ack_all():
    Alarm.query.filter_by(acked=False).update({'acked': True})
    db.session.commit()
    return jsonify({'ok': True})


# ============ 遥测 ============
@api_bp.get('/telemetry/latest')
@require_token
def telemetry_latest():
    defs = {m.id: m for m in MetricDef.query.all()}
    out = {}
    for t in TelemetryLatest.query.all():
        m = defs.get(t.metric_id)
        if not m:
            continue
        out[t.metric_id] = {'value': t.value, 'status': t.status,
                            'name': m.name, 'unit': m.unit, 'display': format_value(m, t.value)}
    return jsonify(out)


@api_bp.get('/telemetry/history')
@require_token
def telemetry_history():
    metric = request.args.get('metric', '')
    limit = int(request.args.get('limit', 30))
    rows = (TelemetryHistory.query.filter_by(metric_id=metric)
            .order_by(TelemetryHistory.id.desc()).limit(limit).all())
    rows = list(reversed(rows))
    return jsonify({'metric': metric, 'points': [{'ts': r.ts, 'value': r.value} for r in rows]})


# ============ 报表 ============
@api_bp.get('/reports/daily')
@require_token
def reports_daily():
    return jsonify([r.to_dict() for r in DailyReport.query.order_by(DailyReport.date).all()])
