# -*- coding: utf-8 -*-
"""后端配置：化工脱硫设备数字孪生系统"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    SECRET_KEY = 'desulf-digital-twin-secret-2026'
    # SQLite 落库，绝对路径放在 server/ 下，无论从哪个目录启动都一致
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'twin.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # 允许后台模拟器线程与请求线程共用同一 SQLite 连接
    SQLALCHEMY_ENGINE_OPTIONS = {'connect_args': {'check_same_thread': False}}

    SIM_INTERVAL = 2.0        # 模拟器写库周期（秒）
    HISTORY_KEEP = 120        # 每个测点保留的历史点数
    TOKEN_MAX_AGE = 86400     # 登录令牌有效期（秒）
