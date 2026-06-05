# -*- coding: utf-8 -*-
"""
GLB 模型结构探查脚本
用途：打印模型的节点名、网格、扩展（是否 Draco/Meshopt/KTX2 压缩）、整体包围盒，
      供数字孪生大屏精确校准热点位置与相机视角。
用法：在项目根目录执行  python tools/inspect_glb.py
"""
import struct, json, sys, os

GLB = os.path.join(os.path.dirname(__file__), '..', '0605.glb')

def read_glb(path):
    with open(path, 'rb') as f:
        magic, ver, length = struct.unpack('<III', f.read(12))
        assert magic == 0x46546C67, '不是有效的 GLB 文件'
        chunks = {}
        while f.tell() < length:
            clen, ctype = struct.unpack('<II', f.read(8))
            data = f.read(clen)
            chunks[ctype] = data
        gltf = json.loads(chunks[0x4E4F534A])  # JSON chunk
        bin_chunk = chunks.get(0x004E4942)      # BIN chunk
        return gltf, bin_chunk

def main():
    if not os.path.exists(GLB):
        print('找不到模型：', GLB); return
    gltf, _ = read_glb(GLB)

    print('========== 基本信息 ==========')
    print('scenes  :', len(gltf.get('scenes', [])))
    print('nodes   :', len(gltf.get('nodes', [])))
    print('meshes  :', len(gltf.get('meshes', [])))
    print('materials:', len(gltf.get('materials', [])))
    print('textures:', len(gltf.get('textures', [])))
    print('animations:', len(gltf.get('animations', [])))
    print('extensionsUsed    :', gltf.get('extensionsUsed'))
    print('extensionsRequired:', gltf.get('extensionsRequired'))

    print('\n========== 节点名（前 200 个）==========')
    nodes = gltf.get('nodes', [])
    named = [(i, n.get('name')) for i, n in enumerate(nodes)]
    for i, nm in named[:200]:
        flag = ''
        if 'mesh' in nodes[i]: flag += ' [mesh]'
        if 'children' in nodes[i]: flag += ' [+%d子]' % len(nodes[i]['children'])
        print('  #%-3d %s%s' % (i, nm, flag))
    if len(named) > 200:
        print('  ... 其余 %d 个省略' % (len(named) - 200))

    # 整体包围盒：聚合所有 POSITION accessor 的 min/max
    acc = gltf.get('accessors', [])
    lo = [1e30, 1e30, 1e30]; hi = [-1e30, -1e30, -1e30]
    found = False
    for m in gltf.get('meshes', []):
        for p in m.get('primitives', []):
            pi = p.get('attributes', {}).get('POSITION')
            if pi is None: continue
            a = acc[pi]
            if 'min' in a and 'max' in a:
                found = True
                for k in range(3):
                    lo[k] = min(lo[k], a['min'][k]); hi[k] = max(hi[k], a['max'][k])
    print('\n========== 整体包围盒（局部坐标，未含节点变换，仅供参考）==========')
    if found:
        print('  min:', [round(x, 3) for x in lo])
        print('  max:', [round(x, 3) for x in hi])
        print('  尺寸:', [round(hi[k]-lo[k], 3) for k in range(3)])
    else:
        print('  （accessor 无 min/max，运行时大屏会自动按真实包围盒取景）')

    print('\n提示：把以上输出贴回给我，我据此精确校准 config.js 里 UNITS[].anchor 与相机视角。')

if __name__ == '__main__':
    main()
