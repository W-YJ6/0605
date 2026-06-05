# -*- coding: utf-8 -*-
"""将系统全部有效源码去注释后合并到单个文本文件（软著源代码用）。
用法：python tools/build_source_listing.py
输出：项目根目录 软著源代码.txt
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 收录顺序：前端（大屏）→ 前端（后台）→ 后端
FILES = [
    'index.html',
    'assets/css/theme.css',
    'assets/css/screen.css',
    'assets/js/config.js',
    'assets/js/api.js',
    'assets/js/clouds.js',
    'assets/js/scene.js',
    'assets/js/data.js',
    'assets/js/charts.js',
    'assets/js/ui.js',
    'assets/js/main.js',
    'admin/index.html',
    'admin/css/admin.css',
    'admin/js/api.js',
    'admin/js/admin.js',
    'server/config.py',
    'server/database.py',
    'server/models.py',
    'server/seed.py',
    'server/auth.py',
    'server/api.py',
    'server/simulator.py',
    'server/app.py',
    'server/run.py',
]


def strip_js(src):
    """去除 JS/CSS 注释（// 与 /* */），字符串/模板/正则内的内容保持不变。"""
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        d = src[i + 1] if i + 1 < n else ''
        if c == '/' and d == '/':
            while i < n and src[i] != '\n':
                i += 1
            continue
        if c == '/' and d == '*':
            i += 2
            while i < n and not (src[i] == '*' and i + 1 < n and src[i + 1] == '/'):
                i += 1
            i += 2
            continue
        if c in ('"', "'", '`'):
            q = c
            out.append(c)
            i += 1
            while i < n:
                ch = src[i]
                out.append(ch)
                if ch == '\\' and i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
                i += 1
                if ch == q:
                    break
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def strip_py(src):
    """去除 Python 注释（#）与三引号文档字符串，普通字符串保持不变。"""
    out = []
    i, n = 0, len(src)
    while i < n:
        three = src[i:i + 3]
        if three in ('"""', "'''"):
            i += 3
            while i < n and src[i:i + 3] != three:
                i += 1
            i += 3
            continue
        c = src[i]
        if c in ('"', "'"):
            q = c
            out.append(c)
            i += 1
            while i < n:
                ch = src[i]
                out.append(ch)
                if ch == '\\' and i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
                i += 1
                if ch == q:
                    break
            continue
        if c == '#':
            while i < n and src[i] != '\n':
                i += 1
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def strip_html(src):
    """去除 HTML 注释，并对内联 <script> 内容做 JS 去注释。"""
    src = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    src = re.sub(r'(<script[^>]*>)(.*?)(</script>)',
                 lambda m: m.group(1) + strip_js(m.group(2)) + m.group(3),
                 src, flags=re.S | re.I)
    return src


def clean(text):
    """删除空白行，去除行尾空格。"""
    lines = []
    for ln in text.splitlines():
        ln = ln.rstrip()
        if ln.strip():
            lines.append(ln)
    return '\n'.join(lines)


def process(path):
    full = os.path.join(ROOT, path)
    with open(full, 'r', encoding='utf-8') as f:
        src = f.read()
    ext = os.path.splitext(path)[1].lower()
    if ext == '.py':
        src = strip_py(src)
    elif ext in ('.js', '.css'):
        src = strip_js(src)
    elif ext in ('.html', '.htm'):
        src = strip_html(src)
    return clean(src)


def main():
    out_path = os.path.join(ROOT, '软著源代码.txt')
    blocks = []
    total = 0
    for p in FILES:
        body = process(p)
        n = body.count('\n') + 1 if body else 0
        total += n
        blocks.append('=' * 70)
        blocks.append('文件：%s' % p)
        blocks.append('=' * 70)
        blocks.append(body)
        blocks.append('')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(blocks))
    print('已生成:', out_path)
    print('收录文件 %d 个，去注释后总代码约 %d 行' % (len(FILES), total))


if __name__ == '__main__':
    main()
