import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KTX2Exporter } from 'three/addons/exporters/KTX2Exporter.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let scene, camera, renderer, exporter, mesh, controls, renderTarget, dataTexture;

const params = {
    target: 'pmrem',
    export: exportFile,
};

init();

function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    //

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(10, 0, 0);

    scene = new THREE.Scene();

    exporter = new KTX2Exporter();
    const rgbeloader = new RGBELoader();

    //

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    rgbeloader.load('textures/equirectangular/venice_sunset_1k.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        renderTarget = pmremGenerator.fromEquirectangular(texture);
        scene.background = renderTarget.texture;
    });

    createDataTexture();

    //

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.rotateSpeed = -0.25; // negative, to track mouse pointer

    //

    window.addEventListener('resize', onWindowResize);

    const gui = new GUI();

    gui.add(params, 'target').options(['pmrem', 'data-texture']).onChange(swapScene);
    gui.add(params, 'export').name('Export KTX2');
    gui.open();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    controls.update();
    renderer.render(scene, camera);
}

function createDataTexture() {
    const normal = new THREE.Vector3();
    const coord = new THREE.Vector2();
    const size = 800,
        radius = 320,
        factor = (Math.PI * 0.5) / radius;
    const data = new Float32Array(4 * size * size);

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const idx = i * size * 4 + j * 4;
            coord.set(j, i).subScalar(size / 2);

            if (coord.length() < radius)
                normal.set(Math.sin(coord.x * factor), Math.sin(coord.y * factor), Math.cos(coord.x * factor));
            else normal.set(0, 0, 1);

            data[idx + 0] = 0.5 + 0.5 * normal.x;
            data[idx + 1] = 0.5 + 0.5 * normal.y;
            data[idx + 2] = 0.5 + 0.5 * normal.z;
            data[idx + 3] = 1;
        }
    }

    dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({ map: dataTexture });
    const quad = new THREE.PlaneGeometry(50, 50);
    mesh = new THREE.Mesh(quad, material);
    mesh.visible = false;

    scene.add(mesh);
}

function swapScene() {
    if (params.target == 'pmrem') {
        camera.position.set(10, 0, 0);
        controls.enabled = true;
        scene.background = renderTarget.texture;
        mesh.visible = false;
        renderer.toneMapping = THREE.AgXToneMapping;
    } else {
        camera.position.set(0, 0, 70);
        controls.enabled = false;
        scene.background = new THREE.Color(0, 0, 0);
        mesh.visible = true;
        renderer.toneMapping = THREE.NoToneMapping;
    }
}

async function exportFile() {
    let result;

    if (params.target == 'pmrem') result = await exporter.parse(renderer, renderTarget);
    else result = await exporter.parse(dataTexture);

    saveArrayBuffer(result, params.target + '.ktx2');
}

function saveArrayBuffer(buffer, filename) {
    const blob = new Blob([buffer], { type: 'image/ktx2' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
