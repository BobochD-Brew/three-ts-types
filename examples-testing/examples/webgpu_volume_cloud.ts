import * as THREE from 'three';
import { texture3D, uniform } from 'three/tsl';

import { raymarchingTexture3D } from 'three/addons/tsl/utils/Raymarching.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, scene, camera;
let mesh;

init();

function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 1.5);

    new OrbitControls(camera, renderer.domElement);

    // Sky

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 32;

    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 32);
    gradient.addColorStop(0.0, '#014a84');
    gradient.addColorStop(0.5, '#0561a0');
    gradient.addColorStop(1.0, '#437ab6');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, 32);

    const skyMap = new THREE.CanvasTexture(canvas);
    skyMap.colorSpace = THREE.SRGBColorSpace;

    const sky = new THREE.Mesh(
        new THREE.SphereGeometry(10),
        new THREE.MeshBasicNodeMaterial({ map: skyMap, side: THREE.BackSide }),
    );
    scene.add(sky);

    // Texture

    const size = 128;
    const data = new Uint8Array(size * size * size);

    let i = 0;
    const scale = 0.05;
    const perlin = new ImprovedNoise();
    const vector = new THREE.Vector3();

    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const d =
                    1.0 -
                    vector
                        .set(x, y, z)
                        .subScalar(size / 2)
                        .divideScalar(size)
                        .length();
                data[i] = (128 + 128 * perlin.noise((x * scale) / 1.5, y * scale, (z * scale) / 1.5)) * d * d;
                i++;
            }
        }
    }

    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = THREE.RedFormat;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;

    // Cloud Shader

    const baseColor = uniform(new THREE.Color(0x798aa0));
    const range = uniform(0.1);
    const threshold = uniform(0.25);
    const opacity = uniform(0.25);
    const steps = uniform(100);

    const cloud3d = raymarchingTexture3D({
        texture: texture3D(texture, null, 0),
        range: range,
        threshold: threshold,
        opacity: opacity,
        steps: steps,
    });

    const finalCloud = cloud3d.setRGB(cloud3d.rgb.add(baseColor));

    //

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const material = new THREE.NodeMaterial();
    material.colorNode = finalCloud;
    material.side = THREE.BackSide;
    material.transparent = true;

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    //

    const gui = new GUI();
    gui.add(threshold, 'value', 0, 1, 0.01).name('threshold');
    gui.add(opacity, 'value', 0, 1, 0.01).name('opacity');
    gui.add(range, 'value', 0, 1, 0.01).name('range');
    gui.add(steps, 'value', 0, 200, 1).name('steps');

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    mesh.rotation.y = -performance.now() / 7500;

    renderer.render(scene, camera);
}
