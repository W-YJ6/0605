# -*- coding: utf-8 -*-
"""数据模型（SQLite）"""
from database import db


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(64))
    role = db.Column(db.String(32), default='系统管理员')


class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.String(16), primary_key=True)
    name = db.Column(db.String(64))
    category = db.Column(db.String(32))
    protocol = db.Column(db.String(32))
    created_at = db.Column(db.String(20))

    def to_dict(self):
        from models import Device
        cnt = Device.query.filter_by(product=self.name).count()
        return {'id': self.id, 'name': self.name, 'cat': self.category,
                'proto': self.protocol, 'count': cnt, 'time': self.created_at}


class Device(db.Model):
    __tablename__ = 'devices'
    id = db.Column(db.String(32), primary_key=True)
    name = db.Column(db.String(128))
    code = db.Column(db.String(64), unique=True)
    product = db.Column(db.String(64))
    protocols = db.Column(db.JSON)          # ['MODBUS-TCP', ...]
    status = db.Column(db.String(8))        # on / off / warn
    active_date = db.Column(db.String(20))
    icon = db.Column(db.String(24))         # 设备类型 key（前端映射 SVG 图标）
    created_at = db.Column(db.String(20))

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'code': self.code,
                'product': self.product, 'proto': self.protocols or [],
                'status': self.status, 'active': self.active_date, 'icon': self.icon}


class LinkageRule(db.Model):
    __tablename__ = 'rules'
    id = db.Column(db.String(16), primary_key=True)
    name = db.Column(db.String(128))
    cond = db.Column(db.String(128))
    action = db.Column(db.String(128))
    status = db.Column(db.String(8))        # on / off

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'cond': self.cond,
                'act': self.action, 'status': self.status}


class Alarm(db.Model):
    __tablename__ = 'alarms'
    id = db.Column(db.Integer, primary_key=True)
    ts = db.Column(db.String(20))
    device = db.Column(db.String(128))
    level = db.Column(db.String(8))         # alarm / warn / event
    message = db.Column(db.String(256))
    acked = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {'id': self.id, 'time': self.ts, 'dev': self.device,
                'lv': self.level, 'msg': self.message, 'done': self.acked}


class MetricDef(db.Model):
    __tablename__ = 'metric_defs'
    id = db.Column(db.String(32), primary_key=True)
    name = db.Column(db.String(64))
    unit = db.Column(db.String(16))
    base = db.Column(db.Float)
    jitter = db.Column(db.Float)
    vmin = db.Column(db.Float)
    vmax = db.Column(db.Float)
    dp = db.Column(db.Integer, default=0)
    warn_at = db.Column(db.Float)
    alarm_at = db.Column(db.Float)
    low_warn = db.Column(db.Float)
    low_alarm = db.Column(db.Float)
    high_warn = db.Column(db.Float)
    discrete = db.Column(db.Boolean, default=False)
    enum = db.Column(db.JSON)
    owner = db.Column(db.String(64))        # 归属设备（生成告警时使用）


class TelemetryLatest(db.Model):
    __tablename__ = 'telemetry_latest'
    metric_id = db.Column(db.String(32), primary_key=True)
    value = db.Column(db.Float)
    status = db.Column(db.String(8))
    updated_at = db.Column(db.String(20))


class TelemetryHistory(db.Model):
    __tablename__ = 'telemetry_history'
    id = db.Column(db.Integer, primary_key=True)
    metric_id = db.Column(db.String(32), index=True)
    ts = db.Column(db.Float)                # epoch 秒
    value = db.Column(db.Float)


class DailyReport(db.Model):
    __tablename__ = 'daily_reports'
    date = db.Column(db.String(10), primary_key=True)
    eff = db.Column(db.Float)
    so2in = db.Column(db.Float)
    so2out = db.Column(db.Float)
    gypsum = db.Column(db.Float)
    energy = db.Column(db.Float)

    def to_dict(self):
        return {'date': self.date, 'eff': self.eff, 'so2in': self.so2in,
                'so2out': self.so2out, 'gypsum': self.gypsum, 'energy': self.energy}
