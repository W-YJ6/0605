/* =========================================================================
 * 数字孪生三维场景（Three.js）
 * 职责：
 *   1. 初始化渲染器 / 相机 / 光照 / 环境 / 轨道控制
 *   2. 加载 0605.glb（兼容 Draco / Meshopt / KTX2），上报加载进度
 *   3. 包围盒自动取景（无需手填相机坐标，适配任意尺寸模型）
 *   4. 射线拾取：点击部件高亮 + 反查所属工艺单元
 *   5. 工艺单元热点的世界坐标换算（供 2D 标签跟随）
 *   6. 自动巡航 / 视角复位 / 剖切 / 线框 等交互
 * 设计为「运行时自动探测模型结构」，因此无需预先知道节点名。
 * ========================================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const THREE_CDN = 'https://registry.npmmirror.com/three/0.160.0/files';

export class TwinScene {
  constructor(container) {
    this.container = container;
    this.units = new Map();        // unitId -> { conf, anchorWorld, meshes:[] }
    this.cruise = false;
    this.selected = null;
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    this._tmpV = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initControls();
    this._initLights();
    this._bindResize();
  }

  _initRenderer() {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(this.container.clientWidth, this.container.clientHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    this.container.appendChild(r.domElement);
    this.renderer = r;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    // 暖色雾，增强纵深
    this.scene.fog = new THREE.FogExp2(0x0b0f17, 0.0);  // 取景后按尺寸设置
    // 基于房间环境贴图，提供柔和 PBR 反射
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100000);
    this.camera.position.set(10, 8, 14);
  }

  _initControls() {
    const c = new OrbitControls(this.camera, this.renderer.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 0.5;
    c.maxPolarAngle = Math.PI * 0.92;   // 禁止翻到地面以下
    this.controls = c;
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const hemi = new THREE.HemisphereLight(0xfff2dd, 0x202830, 0.6);  // 暖天光 / 冷地光
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffd9a8, 1.55);           // 暖色主光
    key.position.set(1, 1.4, 0.8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    this.keyLight = key;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.45);          // 冷色补光
    fill.position.set(-1, 0.6, -0.8);
    this.scene.add(fill);
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  // —— 加载模型 ——
  async load(url, onProgress) {
    const loader = new GLTFLoader();
    // Draco 几何压缩
    try {
      const draco = new DRACOLoader();
      draco.setDecoderPath(`${THREE_CDN}/examples/jsm/libs/draco/`);
      loader.setDRACOLoader(draco);
    } catch (e) { /* 无 Draco 也可加载未压缩模型 */ }
    // KTX2 纹理（动态导入，文件缺失/不支持时静默跳过）
    try {
      const { KTX2Loader } = await import('three/addons/loaders/KTX2Loader.js');
      const ktx2 = new KTX2Loader().setTranscoderPath(`${THREE_CDN}/examples/jsm/libs/basis/`).detectSupport(this.renderer);
      loader.setKTX2Loader(ktx2);
    } catch (e) { /* 模型未使用 KTX2 时忽略 */ }
    // Meshopt 压缩
    try {
      const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
      loader.setMeshoptDecoder(MeshoptDecoder);
    } catch (e) { /* 模型未使用 Meshopt 时忽略 */ }

    const gltf = await new Promise((resolve, reject) => {
      loader.load(url, resolve, (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      }, reject);
    });

    this.model = gltf.scene;
    this.animations = gltf.animations || [];
    this.scene.add(this.model);

    this._postProcessModel();
    this._frame();
    this._buildUnitAnchors();
    this._playAnimations();
    if (onProgress) onProgress(1);
    return this.model;
  }

  _postProcessModel() {
    this.meshes = [];
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      this.meshes.push(o);

      // 模型无材质时 GLTFLoader 会让所有网格共用一个默认材质，
      // 这里克隆为独立材质，避免「高亮一个全亮」，并赋予工业金属质感。
      if (o.material) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      } else {
        o.material = new THREE.MeshStandardMaterial();
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        // 无贴图且为默认白色 → 替换为中性工业灰，金属微反光
        if (!m.map && m.color && m.color.r > 0.92 && m.color.g > 0.92 && m.color.b > 0.92) {
          m.color.setHex(0xc6ccd6);
          m.metalness = 0.25;
          m.roughness = 0.62;
        }
        if (m.emissive) { m.userData._emissive = m.emissive.clone(); m.userData._emissiveI = m.emissiveIntensity ?? 1; }
        m.clippingPlanes = [];      // 预置空裁剪面，供剖切功能使用
      });
    });
  }

  // 自动取景：按包围盒定相机距离与控制目标
  _frame() {
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this.bbox = box; this.bsize = size; this.bcenter = center;

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * Math.PI / 180;
    let dist = (maxDim / 2) / Math.tan(fov / 2);
    dist *= (window.__MODEL_FIT__ || 1.35);

    // 初始视角（偏航/俯仰）
    const yaw = THREE.MathUtils.degToRad(window.__MODEL_YAW__ ?? -28);
    const pitch = THREE.MathUtils.degToRad(window.__MODEL_PITCH__ ?? 22);
    const dir = new THREE.Vector3(
      Math.cos(pitch) * Math.sin(yaw),
      Math.sin(pitch),
      Math.cos(pitch) * Math.cos(yaw),
    );
    this.camera.position.copy(center).add(dir.multiplyScalar(dist));
    this.camera.near = maxDim / 200;
    this.camera.far = maxDim * 50;
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(center);
    this.controls.maxDistance = dist * 4;
    this.controls.update();
    this.home = { pos: this.camera.position.clone(), target: center.clone() };

    // 雾随尺寸
    this.scene.fog.density = 0.6 / (maxDim * 6);

    // 主光阴影范围
    const d = maxDim * 1.5;
    const s = this.keyLight.shadow.camera;
    s.left = -d; s.right = d; s.top = d; s.bottom = -d;
    s.near = 0.1; s.far = maxDim * 8;
    this.keyLight.position.copy(center).add(new THREE.Vector3(d, d * 1.3, d * 0.8));
    this.keyLight.target.position.copy(center);
    this.scene.add(this.keyLight.target);
    s.updateProjectionMatrix();

    if (window.__MODEL_GRID__ !== false) this._addGround(center, maxDim, box.min.y);
  }

  _addGround(center, maxDim, minY) {
    const grid = new THREE.GridHelper(maxDim * 4, 40, 0xff9416, 0x2a3340);
    grid.position.set(center.x, minY - maxDim * 0.002, center.z);
    grid.material.opacity = 0.28; grid.material.transparent = true;
    this.scene.add(grid);
    this.grid = grid;
    // 暖色光圈底盘
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(maxDim * 0.05, maxDim * 1.9, 64),
      new THREE.MeshBasicMaterial({ color: 0xff9416, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(center.x, minY + maxDim * 0.001, center.z);
    this.scene.add(ring);
  }

  // 计算各工艺单元的世界坐标锚点，并按名称模糊匹配真实网格
  _buildUnitAnchors() {
    this._unitConfs = window.__UNITS__ || [];
    for (const u of this._unitConfs) {
      const a = u.anchor;
      const world = new THREE.Vector3(
        this.bbox.min.x + a[0] * this.bsize.x,
        this.bbox.min.y + a[1] * this.bsize.y,
        this.bbox.min.z + a[2] * this.bsize.z,
      );
      // 名称匹配
      const matched = [];
      if (u.matchNames && u.matchNames.length) {
        for (const m of this.meshes) {
          const nm = (m.name || '').toLowerCase();
          if (u.matchNames.some((k) => nm.includes(k.toLowerCase()))) matched.push(m);
        }
      }
      this.units.set(u.id, { conf: u, anchorWorld: world, meshes: matched });
    }
  }

  _playAnimations() {
    if (!this.animations.length) return;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.animations.forEach((clip) => this.mixer.clipAction(clip).play());
    this._clock = new THREE.Clock();
  }

  // —— 交互 ——
  raycastSelect(ndcX, ndcY) {
    if (!this.meshes) return null;
    const ray = new THREE.Raycaster();
    ray.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const hits = ray.intersectObjects(this.meshes, false);
    if (!hits.length) { this.clearHighlight(); return null; }
    const mesh = hits[0].object;
    this.highlightMesh(mesh);
    // 反查所属单元
    let unitId = null;
    for (const [id, u] of this.units) {
      if (u.meshes.includes(mesh)) { unitId = id; break; }
    }
    return { mesh, unitId, point: hits[0].point };
  }

  _setEmissive(mesh, color, intensity) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => { if (m.emissive) { m.emissive.set(color); m.emissiveIntensity = intensity; } });
  }
  _restoreEmissive(mesh) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => { if (m.emissive && m.userData._emissive) { m.emissive.copy(m.userData._emissive); m.emissiveIntensity = m.userData._emissiveI; } });
  }

  highlightMesh(mesh) {
    this.clearHighlight();
    this._setEmissive(mesh, 0xff9416, 0.9);
    this.selected = [mesh];
  }
  highlightUnit(unitId) {
    this.clearHighlight();
    const u = this.units.get(unitId);
    if (!u || !u.meshes.length) return false;
    u.meshes.forEach((m) => this._setEmissive(m, 0xff9416, 0.85));
    this.selected = u.meshes;
    return true;
  }
  clearHighlight() {
    if (this.selected) this.selected.forEach((m) => this._restoreEmissive(m));
    this.selected = null;
  }

  // 飞行到某工艺单元
  flyToUnit(unitId) {
    const u = this.units.get(unitId);
    if (!u) return;
    const target = u.anchorWorld.clone();
    const dist = Math.max(this.bsize.x, this.bsize.y, this.bsize.z) * 0.5;
    const dir = new THREE.Vector3(0.6, 0.5, 0.8).normalize();
    this._animateCamera(target.clone().add(dir.multiplyScalar(dist)), target);
  }

  resetView() {
    if (this.home) this._animateCamera(this.home.pos.clone(), this.home.target.clone());
  }

  _animateCamera(toPos, toTarget) {
    const fromPos = this.camera.position.clone();
    const fromTgt = this.controls.target.clone();
    const dur = 800; let t0 = null;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const step = (ts) => {
      if (t0 == null) t0 = ts;
      const k = Math.min(1, (ts - t0) / dur);
      const e = ease(k);
      this.camera.position.lerpVectors(fromPos, toPos, e);
      this.controls.target.lerpVectors(fromTgt, toTarget, e);
      this.controls.update();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  setCruise(on) { this.cruise = on; }

  setWireframe(on) {
    this.meshes?.forEach((m) => {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mt) => { mt.wireframe = on; });
    });
  }

  // 剖切：沿 Y 轴自上而下，ratio ∈ [0,1]
  setSection(on, ratio = 0.5) {
    const planes = on ? [this.clipPlane] : [];
    if (on) {
      const y = this.bbox.min.y + this.bsize.y * ratio;
      this.clipPlane.set(new THREE.Vector3(0, -1, 0), y);
    }
    this.meshes?.forEach((m) => {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mt) => { mt.clippingPlanes = planes; mt.clipShadows = on; });
    });
  }

  // 3D 锚点 -> 屏幕像素坐标（返回 {x,y,visible}）
  project(worldVec) {
    this._tmpV.copy(worldVec).project(this.camera);
    const visible = this._tmpV.z < 1 &&
      worldVec.clone().sub(this.camera.position).dot(this.camera.getWorldDirection(new THREE.Vector3())) > 0;
    return {
      x: (this._tmpV.x * 0.5 + 0.5) * this.container.clientWidth,
      y: (-this._tmpV.y * 0.5 + 0.5) * this.container.clientHeight,
      visible,
    };
  }

  update() {
    if (this.cruise) {
      const speed = THREE.MathUtils.degToRad(window.__MODEL_ROT__ ?? 0.18);
      // 绕目标旋转相机
      const off = this.camera.position.clone().sub(this.controls.target);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), speed);
      this.camera.position.copy(this.controls.target).add(off);
    }
    if (this.mixer && this._clock) this.mixer.update(this._clock.getDelta());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
