# -*- coding: utf-8 -*-
"""登录鉴权：签名令牌 + 密码哈希"""
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import check_password_hash

from database import db
from models import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='twin-auth')


def make_token(user):
    return _serializer().dumps({'uid': user.id, 'u': user.username})


def require_token(f):
    """接口鉴权装饰器：校验 Authorization: Bearer <token>"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        hdr = request.headers.get('Authorization', '')
        token = hdr[7:] if hdr.startswith('Bearer ') else request.args.get('token', '')
        if not token:
            return jsonify({'error': '未登录或令牌缺失'}), 401
        try:
            data = _serializer().loads(token, max_age=current_app.config['TOKEN_MAX_AGE'])
        except SignatureExpired:
            return jsonify({'error': '登录已过期，请重新登录'}), 401
        except BadSignature:
            return jsonify({'error': '无效令牌'}), 401
        request.user_id = data['uid']
        return f(*args, **kwargs)
    return wrapper


@auth_bp.post('/login')
def login():
    body = request.get_json(silent=True) or {}
    username = (body.get('username') or '').strip()
    password = (body.get('password') or '').strip()
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': '账号或密码错误'}), 401
    return jsonify({
        'token': make_token(user),
        'user': {'username': user.username, 'name': user.name, 'role': user.role},
    })


@auth_bp.get('/me')
@require_token
def me():
    user = db.session.get(User, request.user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    return jsonify({'username': user.username, 'name': user.name, 'role': user.role})
