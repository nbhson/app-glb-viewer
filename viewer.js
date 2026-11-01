import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (id) => document.getElementById(id);
const modelPath = 'my-room.glb';

let scene, camera, renderer, controls, model;
let autoRotate = false;
let initialCameraPos = null;
let resizeScheduled = false;
let grid = null;
let wireframe = false;
let currentObjectURL = null; // objectURL của file local đang mở
let ambientLight, keyLight, fillLight, rimLight;
let renderLoopRunning = false;

// ---------- Environment presets ----------
const ENV_PRESETS = {
    studio: {
        bg: 0x080b12, fogDensity: 0.0004, exposure: 1.1,
        ambient: { color: 0x888888, intensity: 0.6 },
        key: { color: 0xffffff, intensity: 1.2 },
        fill: { color: 0x4facfe, intensity: 30 },
        rim: { color: 0x888888, intensity: 0.5 },
    },
    sunset: {
        bg: 0x180d06, fogDensity: 0.0008, exposure: 1.25,
        ambient: { color: 0x885544, intensity: 0.8 },
        key: { color: 0xffa25e, intensity: 2.2 },
        fill: { color: 0xff6b6b, intensity: 18 },
        rim: { color: 0xffd9a0, intensity: 1.2 },
    },
    night: {
        bg: 0x01030a, fogDensity: 0.0012, exposure: 0.85,
        ambient: { color: 0x334466, intensity: 0.35 },
        key: { color: 0x9db8ff, intensity: 0.8 },
        fill: { color: 0x4facfe, intensity: 12 },
        rim: { color: 0x6b8fa8, intensity: 0.9 },
    },
};

function applyEnvPreset(name) {
    const p = ENV_PRESETS[name];
    if (!p) return;
    scene.background = new THREE.Color(p.bg);
    scene.fog = new THREE.FogExp2(p.bg, p.fogDensity);
    renderer.toneMappingExposure = p.exposure;
    ambientLight.color.set(p.ambient.color);
    ambientLight.intensity = p.ambient.intensity;
    keyLight.color.set(p.key.color);
    keyLight.intensity = p.key.intensity;
    fillLight.color.set(p.fill.color);
    fillLight.intensity = p.fill.intensity;
    rimLight.color.set(p.rim.color);
    rimLight.intensity = p.rim.intensity;
    if (grid) {
        grid.material.color.set(name === 'night' ? 0x2a4a66 : 0x4facfe);
        grid.material.opacity = name === 'night' ? 0.18 : 0.3;
    }
}

function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 4000; i++) {
        starVertices.push(
            THREE.MathUtils.randFloatSpread(2000),
            THREE.MathUtils.randFloatSpread(2000),
            THREE.MathUtils.randFloatSpread(2000)
        );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x8fa8c0, size: 1.5, sizeAttenuation: true })));

    const nebulaGeo = new THREE.SphereGeometry(500, 32, 32);
    const nebula1 = new THREE.Mesh(nebulaGeo, new THREE.MeshBasicMaterial({ color: 0x4facfe, transparent: true, opacity: 0.05 }));
    nebula1.position.set(300, -200, -500);
    scene.add(nebula1);
    const nebula2 = new THREE.Mesh(nebulaGeo, new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.03 }));
    nebula2.position.set(-400, 300, 600);
    nebula2.scale.setScalar(1.5);
    scene.add(nebula2);
}

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080b12, 0.0004);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(0, 0, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    $('viewer').appendChild(renderer.domElement);

    setupContextLossHandling();

    createStarfield();

    ambientLight = new THREE.AmbientLight(0x888888, 0.6);
    scene.add(ambientLight);
    keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);
    fillLight = new THREE.PointLight(0x4facfe, 30, 100);
    fillLight.position.set(10, 10, 10);
    scene.add(fillLight);
    rimLight = new THREE.PointLight(0x888888, 0.5, 20);
    rimLight.position.set(-10, -10, -10);
    scene.add(rimLight);

    grid = new THREE.GridHelper(40, 40, 0x4facfe, 0x1e3a52);
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    grid.visible = false;
    scene.add(grid);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.minDistance = 0.1;
    controls.maxDistance = 1000;

    window.addEventListener('resize', onWindowResize);

    $('resetBtn').addEventListener('click', resetView);
    $('autoRotateBtn').addEventListener('click', (e) => {
        autoRotate = !autoRotate;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 0.8;
        e.currentTarget.classList.toggle('active', autoRotate);
    });
    $('envSelect').addEventListener('change', (e) => applyEnvPreset(e.target.value));
    $('gridBtn').addEventListener('click', toggleGrid);
    $('wireframeBtn').addEventListener('click', toggleWireframe);
    $('screenshotBtn').addEventListener('click', captureScreenshot);
    $('fullscreenBtn').addEventListener('click', toggleFullscreen);
    $('openFileBtn').addEventListener('click', () => $('file-input').click());
    $('file-input').addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) loadLocalFile(file);
        e.target.value = ''; // cho phép chọn lại cùng 1 file
    });

    // Drag & drop file .glb vào canvas
    window.addEventListener('dragover', (e) => { e.preventDefault(); });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file && file.name.toLowerCase().endsWith('.glb')) loadLocalFile(file);
    });

    // Phím tắt — bỏ qua khi đang gõ trong input/select
    window.addEventListener('keydown', (e) => {
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
        switch (e.key.toLowerCase()) {
            case 'r': resetView(); break;
            case 'g': toggleGrid(); break;
            case 'w': toggleWireframe(); break;
            case 'p': captureScreenshot(); break;
            case 'f': toggleFullscreen(); break;
            case ' ':
                e.preventDefault();
                $('autoRotateBtn').click();
                break;
        }
    });

    applyEnvPreset('studio');
    loadModelFromURL(modelPath, 'my-room.glb');
}

// ---------- WebGL context loss ----------
function setupContextLossHandling() {
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault(); // cho phép khôi phục context
        renderLoopRunning = false; // dừng render cho tới khi context được khôi phục
        $('contextOverlay').classList.add('visible');
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
        $('contextOverlay').classList.remove('visible');
        onWindowResize(); // canvas có thể đã bị resize trong lúc mất context
        if (!renderLoopRunning) {
            renderLoopRunning = true;
            requestAnimationFrame(animate);
        }
    });
}

function loadLocalFile(file) {
    const url = URL.createObjectURL(file);
    loadModelFromURL(url, file.name, { revokeOnLoad: true });
}

function toggleGrid() {
    grid.visible = !grid.visible;
    $('gridBtn').classList.toggle('active', grid.visible);
}

function toggleWireframe() {
    wireframe = !wireframe;
    $('wireframeBtn').classList.toggle('active', wireframe);
    if (!model) return;
    model.traverse((node) => {
        if (!node.isMesh) return;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const mat of mats) {
            if (mat && 'wireframe' in mat) mat.wireframe = wireframe;
        }
    });
}

function captureScreenshot() {
    // Render ngay trước khi đọc canvas — không cần preserveDrawingBuffer
    renderer.render(scene, camera);
    try {
        const url = renderer.domElement.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'glb-viewer-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png';
        a.click();
    } catch (err) {
        console.error('Screenshot failed:', err);
    }
}

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen?.();
    } else {
        document.documentElement.requestFullscreen?.();
    }
}

function disposeModel(obj) {
    if (!obj) return;
    scene.remove(obj);
    obj.traverse((node) => {
        if (node.isMesh) {
            node.geometry?.dispose();
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            for (const mat of mats) {
                if (!mat) continue;
                for (const key of Object.keys(mat)) {
                    const v = mat[key];
                    if (v && v.isTexture) v.dispose();
                }
                mat.dispose();
            }
        }
    });
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return v.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

const LOADING_SPINNER_HTML = `
    <div class="spinner"></div>
    <p>Loading 3D model…</p>`;

function loadModelFromURL(url, name, { revokeOnLoad = false } = {}) {
    $('statusText').textContent = 'Loading model…';
    $('fileName').textContent = name;
    $('fileStatus').textContent = 'Loading…';
    $('fileSize').textContent = '—';
    const indicator = $('loadingIndicator');
    // Khôi phục spinner (lần trước có thể đã bị thay bằng error UI)
    indicator.innerHTML = LOADING_SPINNER_HTML;
    indicator.style.display = 'block';

    // Dọn model + file URL cũ trước khi load mới (tránh leak GPU/bộ nhớ)
    if (model) {
        scene.remove(model);
        disposeModel(model);
        model = null;
    }
    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
        currentObjectURL = null;
    }
    if (revokeOnLoad) currentObjectURL = url;

    const progressLine = $('progress-line');
    const progressBar = $('progress-bar');
    progressLine.style.display = 'block';
    progressBar.style.width = '0%';

    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
        model = gltf.scene;
        centerModel(model);
        model.traverse((node) => {
            // Emissive chỉ tồn tại trên Standard/Physical material
            if (!node.isMesh) return;
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            for (const mat of mats) {
                if (mat && mat.emissive) mat.emissive = new THREE.Color(0x111111);
            }
        });
        scene.add(model);

        // Grid nằm ngay dưới đáy model
        const box = new THREE.Box3().setFromObject(model);
        grid.position.y = box.min.y - 0.01;

        progressLine.style.display = 'none';
        $('loadingIndicator').style.display = 'none';
        $('statusText').textContent = 'Loaded';
        $('statusIndicator').classList.add('active');
        $('fileStatus').textContent = 'Loaded ✓';
        let meshCount = 0, triCount = 0;
        model.traverse((n) => {
            if (n.isMesh) {
                meshCount++;
                if (n.geometry.index) triCount += n.geometry.index.count / 3;
                else if (n.geometry.attributes.position) triCount += n.geometry.attributes.position.count / 3;
            }
        });
        $('meshCount').textContent = meshCount;
        $('triCount').textContent = Math.round(triCount).toLocaleString();
        if (gltf.asset?.generator) {
            console.info('GLTF generator:', gltf.asset.generator);
        }
    }, (xhr) => {
        if (progressBar && xhr.total > 0) {
            progressBar.style.width = Math.round((xhr.loaded / xhr.total) * 100) + '%';
            $('fileSize').textContent = formatBytes(xhr.total);
        }
    }, (error) => {
        console.error('Error loading model:', error);
        progressLine.style.display = 'none';
        const indicator = $('loadingIndicator');
        indicator.textContent = '';
        const icon = document.createElement('div');
        icon.style.cssText = 'font-size:40px;margin-bottom:12px';
        icon.textContent = '⚠️';
        const msg = document.createElement('p');
        msg.textContent = 'Cannot load model';
        const file = document.createElement('p');
        file.style.cssText = 'font-size:0.85rem;margin-top:8px;color:var(--text-muted)';
        file.textContent = 'File: ' + name;
        indicator.append(icon, msg, file);
        $('statusText').textContent = 'Connection error';
    });
}

function centerModel(m) {
    const box = new THREE.Box3().setFromObject(m);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    m.position.x -= center.x; m.position.y -= center.y; m.position.z -= center.z;
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const dist = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.8;
    camera.position.set(0, 0, dist);
    controls.target.set(0, 0, 0);
    controls.update();
    // Luôn cập nhật theo model mới nhất — reset view phải khớp model đang xem
    initialCameraPos = camera.position.clone();
}

function resetView() {
    if (!model || !initialCameraPos) return;
    camera.position.copy(initialCameraPos);
    controls.target.set(0, 0, 0);
    controls.update();
}
function onWindowResize() {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(() => {
        resizeScheduled = false;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
function animate() {
    if (!renderLoopRunning) return;
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}
init();
renderLoopRunning = true;
requestAnimationFrame(animate);
