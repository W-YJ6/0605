# -*- coding: utf-8 -*-
"""Flask 应用工厂：托管前端静态资源 + /api 接口"""
import os
from flask import Flask, send_from_directory, abort
from flask_cors import CORS

from config import Config
from database import db
from auth import auth_bp
from api import api_bp

# 项目根目录（server/ 的上一级），前端文件都在这里
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    db.init_app(app)
    CORS(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)

    # —— 前端托管 ——
    @app.route('/')
    def index():
        return send_from_directory(ROOT, 'index.html')

    @app.route('/admin')
    @app.route('/admin/')
    def admin_index():
        return send_from_directory(os.path.join(ROOT, 'admin'), 'index.html')

    @app.route('/<path:path>')
    def static_proxy(path):
        if path.startswith('api/'):
            abort(404)
        full = os.path.join(ROOT, path)
        if os.path.isfile(full):
            return send_from_directory(ROOT, path)
        abort(404)

    return app
