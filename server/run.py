# -*- coding: utf-8 -*-
"""启动入口：建库 → 种子 → 起模拟器 → 起 Web 服务

用法：
    pip install -r server/requirements.txt
    python server/run.py
然后浏览器访问：
    http://localhost:5000        监控大屏（需登录）
    http://localhost:5000/admin/ 管理后台
默认账号：admin / admin123
"""
from app import create_app
from database import db
from seed import seed_all
from simulator import start_simulator

app = create_app()

with app.app_context():
    db.create_all()
    seed_all()

# 启动后台遥测模拟器线程
start_simulator(app)

if __name__ == '__main__':
    print('=' * 56)
    print(' 化工脱硫设备数字孪生可视化监控管理系统 V1.0')
    print(' 监控大屏: http://localhost:5000')
    print(' 管理后台: http://localhost:5000/admin/')
    print(' 默认账号: admin / admin123')
    print('=' * 56)
    # 关闭 reloader，避免模拟器线程被启动两次
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False, use_reloader=False)
