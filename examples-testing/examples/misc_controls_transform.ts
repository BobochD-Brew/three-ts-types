import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

let cameraPersp, cameraOrtho, currentCamera;
let scene, renderer, control, orbit;

init();
render();

function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const aspect = window.innerWidth / window.innerHeight;

    const frustumSize = 5;

    cameraPersp = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    cameraOrtho = new THREE.OrthographicCamera(
        -frustumSize * aspect,
        frustumSize * aspect,
        frustumSize,
        -frustumSize,
        0.1,
        100,
    );
    currentCamera = cameraPersp;

    currentCamera.position.set(5, 2.5, 5);

    scene = new THREE.Scene();
    scene.add(new THREE.GridHelper(5, 10, 0x888888, 0x444444));

    const ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(1, 1, 1);
    scene.add(light);

    const texture = new THREE.TextureLoader().load('textures/crate.gif', render);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshLambertMaterial({ map: texture });

    orbit = new OrbitControls(currentCamera, renderer.domElement);
    orbit.update();
    orbit.addEventListener('change', render);

    control = new TransformControls(currentCamera, renderer.domElement);
    control.addEventListener('change', render);
    control.addEventListener('dragging-changed', function (event) {
        orbit.enabled = !event.value;
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    control.attach(mesh);

    const gizmo = control.getHelper();
    scene.add(gizmo);

    window.addEventListener('resize', onWindowResize);

    window.addEventListener('keydown', function (event) {
        switch (event.key) {
            case 'q':
                control.setSpace(control.space === 'local' ? 'world' : 'local');
                break;

            case 'Shift':
                control.setTranslationSnap(1);
                control.setRotationSnap(THREE.MathUtils.degToRad(15));
                control.setScaleSnap(0.25);
                break;

            case 'w':
                control.setMode('translate');
                break;

            case 'e':
                control.setMode('rotate');
                break;

            case 'r':
                control.setMode('scale');
                break;

            case 'c':
                const position = currentCamera.position.clone();

                currentCamera = currentCamera.isPerspectiveCamera ? cameraOrtho : cameraPersp;
                currentCamera.position.copy(position);

                orbit.object = currentCamera;
                control.camera = currentCamera;

                currentCamera.lookAt(orbit.target.x, orbit.target.y, orbit.target.z);
                onWindowResize();
                break;

            case 'v':
                const randomFoV = Math.random() + 0.1;
                const randomZoom = Math.random() + 0.1;

                cameraPersp.fov = randomFoV * 160;
                cameraOrtho.bottom = -randomFoV * 500;
                cameraOrtho.top = randomFoV * 500;

                cameraPersp.zoom = randomZoom * 5;
                cameraOrtho.zoom = randomZoom * 5;
                onWindowResize();
                break;

            case '+':
            case '=':
                control.setSize(control.size + 0.1);
                break;

            case '-':
            case '_':
                control.setSize(Math.max(control.size - 0.1, 0.1));
                break;

            case 'x':
                control.showX = !control.showX;
                break;

            case 'y':
                control.showY = !control.showY;
                break;

            case 'z':
                control.showZ = !control.showZ;
                break;

            case ' ':
                control.enabled = !control.enabled;
                break;

            case 'Escape':
                control.reset();
                break;
        }
    });

    window.addEventListener('keyup', function (event) {
        switch (event.key) {
            case 'Shift':
                control.setTranslationSnap(null);
                control.setRotationSnap(null);
                control.setScaleSnap(null);
                break;
        }
    });
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;

    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();

    cameraOrtho.left = cameraOrtho.bottom * aspect;
    cameraOrtho.right = cameraOrtho.top * aspect;
    cameraOrtho.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();
}

function render() {
    renderer.render(scene, currentCamera);
}
