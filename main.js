import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 场景设置
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
const canvasContainer = document.getElementById('canvas-container');
canvasContainer.appendChild(renderer.domElement);

// CSS2D渲染器用于显示标签
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
canvasContainer.appendChild(labelRenderer.domElement);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const warpScreenPass = createWarpScreenPass();
warpScreenPass.renderToScreen = true;
composer.addPass(warpScreenPass);

let warpScreenIntensity = 0;
const gltfLoader = new GLTFLoader();
const planetModelConfig = {
    '地球': { path: '/models/earth.glb', scale: 0.02, hideBaseMesh: true },
    '火星': { path: '/models/mars.glb', scale: 0.02, hideBaseMesh: true },
    '木星': { path: '/models/jupiter.glb', scale: 0.018, hideBaseMesh: true },
    '土星': { path: '/models/saturn.glb', scale: 0.018, hideBaseMesh: true },
    '天王星': { path: '/models/uranus.glb', scale: 0.02, hideBaseMesh: true },
    '海王星': { path: '/models/neptune.glb', scale: 0.02, hideBaseMesh: true }
};

function createWarpScreenPass() {
    const shader = {
        uniforms: {
            tDiffuse: { value: null },
            uCenter: { value: new THREE.Vector2(0.5, 0.5) },
            uRadius: { value: 0.2 },
            uIntensity: { value: 0 },
            uTime: { value: 0 },
            uAspect: { value: window.innerWidth / window.innerHeight }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform vec2 uCenter;
            uniform float uRadius;
            uniform float uIntensity;
            uniform float uTime;
            uniform float uAspect;
            varying vec2 vUv;

            vec2 distort(vec2 uv) {
                vec2 centered = uv - uCenter;
                centered.x *= uAspect;
                float dist = length(centered);
                float falloff = smoothstep(uRadius, 0.0, dist);
                float swirl = sin(dist * 18.0 - uTime * 5.0) * 0.03;
                float lens = falloff * uIntensity;
                vec2 dir = normalize(centered + 1e-6);
                vec2 offset = dir * lens * (0.02 + 0.25 * dist);
                vec2 warped = uv - vec2(offset.x / uAspect, offset.y);
                float rotation = swirl * uIntensity;
                float cs = cos(rotation);
                float sn = sin(rotation);
                vec2 rotated = vec2(
                    cs * (warped.x - uCenter.x) - sn * (warped.y - uCenter.y),
                    sn * (warped.x - uCenter.x) + cs * (warped.y - uCenter.y)
                );
                warped = uCenter + rotated;
                return mix(uv, warped, falloff);
            }

            void main() {
                if (uIntensity < 0.01) {
                    gl_FragColor = texture2D(tDiffuse, vUv);
                    return;
                }
                vec2 uv = distort(vUv);
                uv = clamp(uv, vec2(0.001), vec2(0.999));
                vec4 color = texture2D(tDiffuse, uv);
                vec2 centered = vUv - uCenter;
                centered.x *= uAspect;
                float dist = length(centered);
                float vignette = smoothstep(uRadius, 0.0, dist);
                vec3 glow = vec3(0.06, 0.0, 0.12) * vignette * uIntensity;
                gl_FragColor = vec4(color.rgb + glow, color.a);
            }
        `
    };

    const pass = new ShaderPass(shader);
    return pass;
}

// 太阳系数据（速度已调整为原来的1/5）
const solarSystemData = [
    { name: '太阳', radius: 26, distance: 0, color: 0xFDB813, emissive: 0xFDB813, emissiveIntensity: 2.0, speed: 0 },
    { name: '水星', radius: 3.5, distance: 90, color: 0x8C7853, emissive: 0xC18B4E, emissiveIntensity: 1.1, speed: 0.008 },
    { name: '金星', radius: 5.2, distance: 144, color: 0xFFC649, emissive: 0xFFB347, emissiveIntensity: 1.2, speed: 0.003 },
    { name: '地球', radius: 6, distance: 216, color: 0x4A90E2, emissive: 0x66B2FF, emissiveIntensity: 1.25, speed: 0.002 },
    { name: '火星', radius: 4.5, distance: 288, color: 0xE27B58, emissive: 0xFF8C5C, emissiveIntensity: 1.15, speed: 0.0016 },
    { name: '木星', radius: 18, distance: 450, color: 0xC88B3A, emissive: 0xFFBE78, emissiveIntensity: 1.1, speed: 0.0004 },
    { name: '土星', radius: 15, distance: 630, color: 0xFAD5A5, emissive: 0xFFD9A8, emissiveIntensity: 1.05, speed: 0.00018 },
    { name: '天王星', radius: 11, distance: 810, color: 0x4FD0E7, emissive: 0x7FE9FF, emissiveIntensity: 1.2, speed: 0.00008 },
    { name: '海王星', radius: 10, distance: 990, color: 0x4166F5, emissive: 0x5F85FF, emissiveIntensity: 1.25, speed: 0.00002 }
];

// 时间控制
let timeScale = 1.0;
let isPaused = false;

// 创建星空背景
function createStarField() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.7 });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 8000;
        const y = (Math.random() - 0.5) * 8000;
        const z = (Math.random() - 0.5) * 8000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
}

// 创建行星
const planets = [];
let targetPlanet = null;
let targetMarker = null;
let navigationLine = null;
let warpWavePhase = 0;

function createSolarSystem() {
    solarSystemData.forEach((data, index) => {
        // 创建行星
        const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: data.color,
            emissive: data.emissive !== 0x000000 ? data.emissive : data.color,
            emissiveIntensity: data.emissiveIntensity ?? (data.name === '太阳' ? 1.6 : 0.4),
            metalness: 0.3,
            roughness: 0.7
        });

        const planet = new THREE.Mesh(geometry, material);
        planet.position.x = data.distance;
        planet.castShadow = true;
        planet.receiveShadow = true;
        planet.userData.planetData = data;

        attachPlanetModel(planet, data);

        // 创建星球名称标签
        const labelDiv = document.createElement('div');
        labelDiv.className = 'planet-label';
        labelDiv.textContent = data.name;
        labelDiv.style.color = 'white';
        labelDiv.style.fontSize = '14px';
        labelDiv.style.fontFamily = 'Arial, sans-serif';
        labelDiv.style.padding = '3px 8px';
        labelDiv.style.background = 'rgba(0, 0, 0, 0.6)';
        labelDiv.style.borderRadius = '3px';
        labelDiv.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        labelDiv.style.display = 'none';

        const label = new CSS2DObject(labelDiv);
        label.position.set(0, data.radius + 5, 0);
        planet.add(label);

        // 创建轨道
        if (data.distance > 0) {
            const orbitGeometry = new THREE.RingGeometry(data.distance - 0.2, data.distance + 0.2, 128);
            const orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0x444444,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.3
            });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
        }

        scene.add(planet);

        planets.push({
            mesh: planet,
            distance: data.distance,
            speed: data.speed,
            angle: Math.random() * Math.PI * 2,
            name: data.name,
            color: data.color,
            radius: data.radius,
            label: label
        });
    });
}

function attachPlanetModel(planet, data) {
    const config = planetModelConfig[data.name];
    if (!config) return;

    gltfLoader.load(
        config.path,
        (gltf) => {
            const model = gltf.scene;
            const scale = config.scale ?? 1;
            model.scale.set(scale, scale, scale);
            if (config.rotation) {
                model.rotation.set(
                    config.rotation.x ?? 0,
                    config.rotation.y ?? 0,
                    config.rotation.z ?? 0
                );
            }
            model.traverse(node => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            planet.add(model);
            if (config.hideBaseMesh) {
                planet.material.transparent = true;
                planet.material.opacity = 0.05;
            }
        },
        undefined,
        (error) => {
            console.warn(`无法加载 ${data.name} 的模型 ${config.path}`, error);
        }
    );
}

// 创建目标标记
function createTargetMarker(planet) {
    // 移除旧标记
    if (targetMarker) {
        scene.remove(targetMarker);
    }

    // 创建选中圆环
    const markerGeometry = new THREE.TorusGeometry(planet.radius * 1.5, 0.3, 16, 100);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.8
    });
    targetMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    scene.add(targetMarker);
}

// 创建导航线
function createNavigationLine() {
    if (navigationLine) {
        scene.remove(navigationLine);
    }

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
    });

    navigationLine = new THREE.Line(geometry, material);
    scene.add(navigationLine);
}

// 更新导航线
function updateNavigationLine() {
    if (!targetPlanet || !navigationLine) return;

    const points = [
        spaceship.group.position,
        targetPlanet.mesh.position
    ];

    navigationLine.geometry.setFromPoints(points);
}

// 添加光照
function createLights() {
    // 太阳光（点光源）- 增加强度和范围
    const sunLight = new THREE.PointLight(0xFFFAF0, 3, 2000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // 环境光 - 增加亮度让行星可见
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    // 添加半球光提供更自然的照明
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    scene.add(hemisphereLight);
}

// 创建重力网格
let gravityGrid = null;
let gridOriginalPositions = [];

function createGravityGrid() {
    const gridSize = 4000;
    const gridDivisions = 60;

    // 创建平面几何体
    const geometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);

    // 保存原始顶点位置
    const positions = geometry.attributes.position.array;
    gridOriginalPositions = Array.from(positions);

    // 创建材质 - 使用线框模式
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ccff,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });

    gravityGrid = new THREE.Mesh(geometry, material);
    gravityGrid.rotation.x = -Math.PI / 2; // 水平放置
    gravityGrid.position.y = -30; // 位于太阳系下方，调高位置

    scene.add(gravityGrid);
}

// 更新重力网格 - 根据行星位置产生凹陷
function updateGravityGrid() {
    if (!gravityGrid || !gravityGrid.visible) return;

    const positions = gravityGrid.geometry.attributes.position.array;

    // 重置为原始位置
    for (let i = 0; i < positions.length; i++) {
        positions[i] = gridOriginalPositions[i];
    }

    // 将行星坐标转换到网格本地空间，避免旋转后出现偏移
    gravityGrid.updateWorldMatrix(true, false);
    const planetInfluences = planets.map(planet => {
        const localPos = planet.mesh.position.clone();
        gravityGrid.worldToLocal(localPos);
        return {
            x: localPos.x,
            y: localPos.y,
            mass: Math.pow(planet.radius, 3)
        };
    });

    // 计算曲速对网格的影响
    let shipWarpData = null;
    if (typeof spaceship !== 'undefined' && spaceship) {
        const warpStrength = THREE.MathUtils.lerp(0, 18, spaceship.warpVisualIntensity);
        if (warpStrength > 0.01) {
            const shipLocal = spaceship.group.position.clone();
            gravityGrid.worldToLocal(shipLocal);
            shipWarpData = {
                x: shipLocal.x,
                y: shipLocal.y,
                strength: warpStrength
            };
        }
    }

    // 遍历每个顶点
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        let z = positions[i + 2];

        planetInfluences.forEach(({ x: px, y: py, mass }) => {
            const dx = x - px;
            const dy = y - py;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const depth = (mass * 0.5) / (distance * 0.12 + 1);
                z -= depth;
            }
        });

        // 曲速波及
        if (shipWarpData) {
            const dx = x - shipWarpData.x;
            const dy = y - shipWarpData.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const attenuation = Math.exp(-distance * 0.0025);
            const wave = Math.sin(distance * 0.08 - warpWavePhase) * shipWarpData.strength * attenuation;
            z -= wave;
        }

        positions[i + 2] = z;
    }

    // 标记需要更新
    gravityGrid.geometry.attributes.position.needsUpdate = true;
    gravityGrid.geometry.computeVertexNormals();
}

// 创建飞船
class Spaceship {
    constructor() {
        this.group = new THREE.Group();

        // 飞船主体（锥形）
        const bodyGeometry = new THREE.ConeGeometry(2, 6, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, metalness: 0.8, roughness: 0.2 });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.rotation.x = Math.PI / 2;
        this.group.add(this.body);

        // 飞船驾驶舱（球体）
        const cockpitGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const cockpitMaterial = new THREE.MeshStandardMaterial({
            color: 0x4A90E2,
            metalness: 0.5,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8
        });
        this.cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        this.cockpit.position.z = 2;
        this.group.add(this.cockpit);

        // 飞船引擎光
        const engineLight = new THREE.PointLight(0x00FFFF, 1, 20);
        engineLight.position.z = -3;
        this.group.add(engineLight);

        // 引擎光晕
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.6
        });
        this.engineGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.engineGlow.position.z = -3;
        this.group.add(this.engineGlow);

        // 缩小整体建模尺寸
        this.baseScale = 0.4;
        this.warpScale = this.baseScale * 0.75;
        this.setScale(this.baseScale);

        // 曲速视觉状态
        this.warpPulse = 0;
        this.warpActive = false;
        this.warpVisualIntensity = 0;

        // 初始位置
        this.group.position.set(0, 0, 200);

        // 运动参数
        this.velocity = new THREE.Vector3();
        this.speed = 0;
        this.normalMaxSpeed = 1.2;
        this.normalAcceleration = 0.03;
        this.warpMaxSpeed = 4.5;
        this.warpAcceleration = 0.09;
        this.maxSpeed = this.normalMaxSpeed;
        this.acceleration = this.normalAcceleration;
        this.rotationSpeed = 0.02;
        this.collisionRadius = 2; // 缩小后的飞船碰撞半径

        // 自动导航参数
        this.autoNavigating = false;
        this.navigationTarget = null;
        this.navigationSpeed = 0.9;
        this.normalNavigationSpeed = this.navigationSpeed;
        this.arrivalDistance = 30; // 到达目标的距离阈值

        scene.add(this.group);
    }

    setScale(factor) {
        this.group.scale.set(factor, factor, factor);
    }

    toggleWarpDrive() {
        if (this.warpActive) {
            this.disableWarpDrive();
        } else {
            this.enableWarpDrive();
        }
    }

    enableWarpDrive() {
        if (this.warpActive) return;
        this.warpActive = true;
        this.maxSpeed = this.warpMaxSpeed;
        this.acceleration = this.warpAcceleration;
        this.navigationSpeed = this.warpMaxSpeed * 0.7;
        this.setScale(this.warpScale);
    }

    disableWarpDrive() {
        if (!this.warpActive) return;
        this.warpActive = false;
        this.maxSpeed = this.normalMaxSpeed;
        this.acceleration = this.normalAcceleration;
        this.navigationSpeed = this.normalNavigationSpeed;
        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        this.setScale(this.baseScale);
    }

    updateWarpVisuals() {
        this.warpPulse += 0.03;
        const target = this.warpActive ? 1 : 0;
        this.warpVisualIntensity = THREE.MathUtils.lerp(this.warpVisualIntensity, target, 0.08);
    }

    // 开始自动导航
    startAutoNavigation(target) {
        this.autoNavigating = true;
        this.navigationTarget = target;
    }

    // 停止自动导航
    stopAutoNavigation() {
        this.autoNavigating = false;
        this.navigationTarget = null;
        this.speed = 0;
    }

    // 自动导航更新
    updateAutoNavigation() {
        if (!this.autoNavigating || !this.navigationTarget) return;

        const targetPos = this.navigationTarget.mesh.position;
        const currentPos = this.group.position;

        // 计算到目标的方向和距离
        const direction = new THREE.Vector3().subVectors(targetPos, currentPos);
        const distance = direction.length();

        // 检查是否到达
        if (distance < this.arrivalDistance + this.navigationTarget.radius) {
            this.stopAutoNavigation();
            return;
        }

        direction.normalize();

        // 使用临时对象计算目标朝向
        const tempObject = new THREE.Object3D();
        tempObject.position.copy(currentPos);
        tempObject.lookAt(targetPos);

        // 平滑旋转到目标方向
        this.group.quaternion.slerp(tempObject.quaternion, 0.05);

        // 根据距离调整速度
        const targetSpeed = Math.min(this.navigationSpeed, distance / 50);
        this.speed = targetSpeed;

        // 沿当前朝向移动
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.group.quaternion);
        this.group.position.add(forward.multiplyScalar(this.speed));
    }

    update(keys) {
        // 如果正在自动导航，忽略键盘输入
        if (this.autoNavigating) {
            this.updateAutoNavigation();

            // 引擎光效根据速度变化
            const intensity = Math.abs(this.speed) / this.maxSpeed;
            this.engineGlow.material.opacity = 0.3 + intensity * 0.5;
            this.engineGlow.scale.set(1 + intensity * 0.5, 1 + intensity * 0.5, 1 + intensity * 0.5);
            this.updateWarpVisuals();
            return;
        }
        // 前进/后退
        if (keys['w'] || keys['W']) {
            this.speed = Math.min(this.speed + this.acceleration, this.maxSpeed);
        } else if (keys['s'] || keys['S']) {
            this.speed = Math.max(this.speed - this.acceleration, -this.maxSpeed);
        } else {
            this.speed *= 0.98; // 惯性减速
        }

        // 左右转向
        if (keys['a'] || keys['A']) {
            this.group.rotation.y += this.rotationSpeed;
        }
        if (keys['d'] || keys['D']) {
            this.group.rotation.y -= this.rotationSpeed;
        }

        // 俯仰
        if (keys['ArrowUp']) {
            this.group.rotation.x += this.rotationSpeed;
        }
        if (keys['ArrowDown']) {
            this.group.rotation.x -= this.rotationSpeed;
        }

        // 上升/下降
        if (keys['r'] || keys['R']) {
            this.group.position.y += 0.5;
        }
        if (keys['f'] || keys['F']) {
            this.group.position.y -= 0.5;
        }

        // 左右平移
        if (keys['q'] || keys['Q']) {
            const right = new THREE.Vector3();
            this.group.getWorldDirection(right);
            right.cross(new THREE.Vector3(0, 1, 0)).normalize();
            this.group.position.add(right.multiplyScalar(-0.5));
        }
        if (keys['e'] || keys['E']) {
            const right = new THREE.Vector3();
            this.group.getWorldDirection(right);
            right.cross(new THREE.Vector3(0, 1, 0)).normalize();
            this.group.position.add(right.multiplyScalar(0.5));
        }

        // 根据朝向移动
        const direction = new THREE.Vector3();
        this.group.getWorldDirection(direction);
        this.group.position.add(direction.multiplyScalar(this.speed));

        // 碰撞检测
        this.checkCollisions();

        // 引擎光效根据速度变化
        const intensity = Math.abs(this.speed) / this.maxSpeed;
        this.engineGlow.material.opacity = 0.3 + intensity * 0.5;
        this.engineGlow.scale.set(1 + intensity * 0.5, 1 + intensity * 0.5, 1 + intensity * 0.5);

        this.updateWarpVisuals();
    }

    // 碰撞检测
    checkCollisions() {
        const shipPos = this.group.position;

        planets.forEach(planet => {
            const planetPos = planet.mesh.position;
            const distance = shipPos.distanceTo(planetPos);
            const collisionDistance = planet.radius + this.collisionRadius; // 行星半径 + 飞船大小

            if (distance < collisionDistance) {
                // 发生碰撞，将飞船推出
                const pushDirection = new THREE.Vector3().subVectors(shipPos, planetPos).normalize();
                const pushDistance = collisionDistance - distance;
                this.group.position.add(pushDirection.multiplyScalar(pushDistance));

                // 减速
                this.speed *= 0.5;
            }
        });
    }
}

// 键盘控制
const keys = {};
window.addEventListener('keydown', (e) => {
    // 空格键用于暂停/恢复，不用于飞船控制
    if (e.code === 'Space') {
        return;
    }

    if (e.key === 'k' || e.key === 'K') {
        spaceship.toggleWarpDrive();
        updateWarpButton();
        return;
    }

    // 如果用户按下移动键，停止自动导航
    const movementKeys = ['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'q', 'Q', 'e', 'E', 'r', 'R', 'f', 'F', 'ArrowUp', 'ArrowDown'];
    if (movementKeys.includes(e.key) && spaceship && spaceship.autoNavigating) {
        spaceship.stopAutoNavigation();
        if (targetPlanet) {
            updateAutoNavButton();
        }
    }

    keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        return;
    }
    keys[e.key] = false;
});

// 鼠标点击选择星球
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (!canvasContainer.contains(event.target)) {
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));

    if (intersects.length > 0) {
        const selectedPlanet = planets.find(p => p.mesh === intersects[0].object);
        if (selectedPlanet) {
            setTargetPlanet(selectedPlanet);
        }
    } else {
        clearTargetPlanet();
    }
});

// 设置目标星球
function setTargetPlanet(planet) {
    // 隐藏之前目标的标签
    if (targetPlanet && targetPlanet.label) {
        targetPlanet.label.element.style.display = 'none';
    }

    targetPlanet = planet;
    createTargetMarker(planet);
    createNavigationLine();

    // 显示选中星球的标签
    if (planet.label) {
        planet.label.element.style.display = 'block';
    }

    // 更新UI
    document.getElementById('target-info').classList.add('active');
    document.getElementById('target-name').textContent = `目标: ${planet.name}`;

    // 更新星球列表选中状态
    updatePlanetListSelection();

    // 更新自动导航按钮状态
    updateAutoNavButton();
}

// 取消目标选择
function clearTargetPlanet() {
    if (targetPlanet && targetPlanet.label) {
        targetPlanet.label.element.style.display = 'none';
    }

    if (targetMarker) {
        scene.remove(targetMarker);
        targetMarker = null;
    }

    if (navigationLine) {
        scene.remove(navigationLine);
        navigationLine = null;
    }

    if (spaceship.autoNavigating) {
        spaceship.stopAutoNavigation();
    }

    targetPlanet = null;

    const targetInfo = document.getElementById('target-info');
    targetInfo.classList.remove('active');
    document.getElementById('target-name').textContent = '目标: 未选择';
    document.getElementById('target-distance').textContent = '距离: --';

    updatePlanetListSelection();
    updateAutoNavButton();
}

// 更新自动导航按钮
function updateAutoNavButton() {
    const autoNavButton = document.getElementById('auto-nav-button');

    if (!targetPlanet) {
        autoNavButton.textContent = '选择星球以导航';
        autoNavButton.style.background = '#555555';
        autoNavButton.disabled = true;
        return;
    }

    autoNavButton.disabled = false;

    if (spaceship.autoNavigating) {
        autoNavButton.textContent = '停止导航';
        autoNavButton.style.background = '#f44336';
    } else {
        autoNavButton.textContent = '开始自动导航';
        autoNavButton.style.background = '#4fc3f7';
    }
}

// 初始化自动导航按钮
function initAutoNavButton() {
    const autoNavButton = document.getElementById('auto-nav-button');

    autoNavButton.addEventListener('click', () => {
        if (!targetPlanet) return;

        if (spaceship.autoNavigating) {
            spaceship.stopAutoNavigation();
        } else {
            spaceship.startAutoNavigation(targetPlanet);
        }

        updateAutoNavButton();
    });

    updateAutoNavButton();
}

// 更新曲速按钮
function updateWarpButton() {
    const warpButton = document.getElementById('warp-button');
    if (!warpButton) return;

    if (spaceship.warpActive) {
        warpButton.textContent = '关闭曲速 (K)';
        warpButton.style.background = '#ff9800';
    } else {
        warpButton.textContent = '开启曲速 (K)';
        warpButton.style.background = '#4fc3f7';
    }
}

// 初始化曲速按钮
function initWarpControl() {
    const warpButton = document.getElementById('warp-button');
    if (!warpButton) return;

    warpButton.addEventListener('click', () => {
        spaceship.toggleWarpDrive();
        updateWarpButton();
    });

    updateWarpButton();
}

// 初始化星球列表
function initPlanetList() {
    const planetItemsContainer = document.getElementById('planet-items');

    planets.forEach(planet => {
        const item = document.createElement('div');
        item.className = 'planet-item';
        item.textContent = planet.name;
        item.dataset.planetName = planet.name;

        item.addEventListener('click', () => {
            setTargetPlanet(planet);
        });

        planetItemsContainer.appendChild(item);
    });
}

// 更新星球列表选中状态
function updatePlanetListSelection() {
    const items = document.querySelectorAll('.planet-item');
    items.forEach(item => {
        if (targetPlanet && item.dataset.planetName === targetPlanet.name) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// 初始化时间控制
function initTimeControl() {
    const timeScaleSlider = document.getElementById('time-scale-slider');
    const timeScaleValue = document.getElementById('time-scale-value');
    const pauseButton = document.getElementById('pause-button');
    const gravityGridToggle = document.getElementById('gravity-grid-toggle');

    // 时间速度滑块
    timeScaleSlider.addEventListener('input', (e) => {
        timeScale = parseFloat(e.target.value);
        timeScaleValue.textContent = `${timeScale.toFixed(1)}x`;
    });

    // 暂停/恢复按钮
    pauseButton.addEventListener('click', () => {
        isPaused = !isPaused;
        if (isPaused) {
            pauseButton.textContent = '恢复 (空格)';
            pauseButton.classList.add('paused');
        } else {
            pauseButton.textContent = '暂停 (空格)';
            pauseButton.classList.remove('paused');
        }
    });

    // 空格键暂停/恢复
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            pauseButton.click();
        }
    });

    // 重力网格开关
    gravityGridToggle.addEventListener('change', (e) => {
        if (gravityGrid) {
            gravityGrid.visible = e.target.checked;
        }
    });
}

// 小地图绘制
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
minimapCanvas.width = 250;
minimapCanvas.height = 250;

function drawMinimap() {
    const centerX = minimapCanvas.width / 2;
    const centerY = minimapCanvas.height / 2;
    const scale = 0.2;

    // 清空画布
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    // 绘制轨道
    minimapCtx.strokeStyle = 'rgba(68, 68, 68, 0.5)';
    minimapCtx.lineWidth = 1;
    planets.forEach(planet => {
        if (planet.distance > 0) {
            minimapCtx.beginPath();
            minimapCtx.arc(centerX, centerY, planet.distance * scale, 0, Math.PI * 2);
            minimapCtx.stroke();
        }
    });

    // 绘制行星
    planets.forEach(planet => {
        const x = centerX + planet.mesh.position.x * scale;
        const y = centerY + planet.mesh.position.z * scale;
        const radius = Math.max(planet.radius * scale * 0.5, 2);

        minimapCtx.fillStyle = `#${planet.color.toString(16).padStart(6, '0')}`;
        minimapCtx.beginPath();
        minimapCtx.arc(x, y, radius, 0, Math.PI * 2);
        minimapCtx.fill();

        // 如果是目标星球，绘制标记
        if (targetPlanet && planet === targetPlanet) {
            minimapCtx.strokeStyle = '#00FF00';
            minimapCtx.lineWidth = 2;
            minimapCtx.beginPath();
            minimapCtx.arc(x, y, radius + 3, 0, Math.PI * 2);
            minimapCtx.stroke();
        }
    });

    // 绘制飞船
    const shipX = centerX + spaceship.group.position.x * scale;
    const shipY = centerY + spaceship.group.position.z * scale;

    minimapCtx.fillStyle = '#FFFFFF';
    minimapCtx.beginPath();
    minimapCtx.arc(shipX, shipY, 3, 0, Math.PI * 2);
    minimapCtx.fill();

    // 绘制飞船朝向
    const direction = new THREE.Vector3();
    spaceship.group.getWorldDirection(direction);
    minimapCtx.strokeStyle = '#00FFFF';
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.moveTo(shipX, shipY);
    minimapCtx.lineTo(shipX + direction.x * 15, shipY + direction.z * 15);
    minimapCtx.stroke();

    // 如果有目标，绘制导航线
    if (targetPlanet) {
        const targetX = centerX + targetPlanet.mesh.position.x * scale;
        const targetY = centerY + targetPlanet.mesh.position.z * scale;

        minimapCtx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        minimapCtx.lineWidth = 1;
        minimapCtx.setLineDash([5, 5]);
        minimapCtx.beginPath();
        minimapCtx.moveTo(shipX, shipY);
        minimapCtx.lineTo(targetX, targetY);
        minimapCtx.stroke();
        minimapCtx.setLineDash([]);
    }
}

// 窗口调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    warpScreenPass.material.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
});

// 初始化场景
createStarField();
createSolarSystem();
createLights();
createGravityGrid();
const spaceship = new Spaceship();
initPlanetList();
initTimeControl();
initAutoNavButton();
initWarpControl();

// 相机跟随飞船
function updateCamera() {
    const offset = new THREE.Vector3(0, 5, -15);
    offset.applyQuaternion(spaceship.group.quaternion);
    camera.position.copy(spaceship.group.position).add(offset);
    camera.lookAt(spaceship.group.position);
}

// 更新UI信息
function updateInfo() {
    const speed = spaceship.speed.toFixed(2);
    const pos = spaceship.group.position;
    document.getElementById('speed').textContent = `速度: ${speed}`;
    document.getElementById('position').textContent =
        `位置: (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`;

    // 更新目标距离
    if (targetPlanet) {
        const distance = spaceship.group.position.distanceTo(targetPlanet.mesh.position);
        const status = spaceship.autoNavigating ? ' (导航中...)' : '';
        document.getElementById('target-distance').textContent = `距离: ${distance.toFixed(1)}${status}`;
    }
}

function updateWarpScreenEffect() {
    if (!warpScreenPass || !spaceship) return;

    const uniforms = warpScreenPass.material.uniforms;
    const screenPos = spaceship.group.position.clone();
    screenPos.project(camera);
    const onScreen = screenPos.z >= -1 && screenPos.z <= 1;

    if (onScreen) {
        uniforms.uCenter.value.set(
            0.5 + screenPos.x * 0.5,
            0.5 - screenPos.y * 0.5
        );
    }

    const target = onScreen ? spaceship.warpVisualIntensity : 0;
    warpScreenIntensity = THREE.MathUtils.lerp(warpScreenIntensity, target, 0.1);
    uniforms.uIntensity.value = warpScreenIntensity;
    uniforms.uRadius.value = THREE.MathUtils.lerp(0.12, 0.32, warpScreenIntensity);
    uniforms.uTime.value = performance.now() * 0.001;
    uniforms.uAspect.value = window.innerWidth / window.innerHeight;
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);

    // 如果没有暂停，更新行星位置
    if (!isPaused) {
        planets.forEach(planet => {
            if (planet.distance > 0) {
                planet.angle += planet.speed * timeScale;
                planet.mesh.position.x = Math.cos(planet.angle) * planet.distance;
                planet.mesh.position.z = Math.sin(planet.angle) * planet.distance;
            }
            planet.mesh.rotation.y += 0.002 * timeScale;
        });
    }

    // 曲速波前推进
    if (spaceship) {
        const warpSpeed = spaceship.warpActive ? 0.003 : 0.05;
        const delta = isPaused ? 0 : timeScale;
        warpWavePhase += warpSpeed * delta;
    }

    // 更新重力网格
    updateGravityGrid();

    // 更新飞船
    spaceship.update(keys);

    // 更新目标标记位置和旋转
    if (targetMarker && targetPlanet) {
        targetMarker.position.copy(targetPlanet.mesh.position);
        if (!isPaused) {
            targetMarker.rotation.x += 0.002 * timeScale;
            targetMarker.rotation.y += 0.004 * timeScale;
        }
    }

    // 更新导航线
    updateNavigationLine();

    // 更新相机
    updateCamera();

    // 更新UI
    updateInfo();

    // 更新屏幕曲率效果
    updateWarpScreenEffect();

    // 更新导航按钮状态
    updateAutoNavButton();

    // 绘制小地图
    drawMinimap();

    composer.render();
    labelRenderer.render(scene, camera);
}

animate();
