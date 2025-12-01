import * as LGLTracerWebGL from '../tracer/lglTracer.webgl.es';
import * as LGLTracerWebGPU from '../tracer/lglTracer.webgpu.es';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const envMapPath = '/envMaps/pillars.hdr';
const modelPath = '/models/DamagedHelmet/scene.gltf';

let tracer: LGLTracerWebGL.LGLTracer | LGLTracerWebGPU.LGLTracer;
let backend: 'webgl' | 'webgpu';
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.coordinateSystem = THREE.WebGPUCoordinateSystem;
camera.position.z = 5;
let controls: OrbitControls;
const rgbeLoader = new RGBELoader().setDataType(THREE.FloatType);
const gltfLoader = new GLTFLoader();

if (!navigator.gpu || !navigator.gpu.getPreferredCanvasFormat) {
	backend = 'webgl';
	tracer = new LGLTracerWebGL.LGLTracer();
} else {
	backend = 'webgpu';
	const adapter = await navigator.gpu.requestAdapter();
	const device = await adapter!.requestDevice();
	tracer = new LGLTracerWebGPU.LGLTracer(device, adapter!);
}

async function init() {
	tracer.toneMapping = 'ACES';
	tracer.enableTileRender = false;
	tracer.envMapIntensity = 2;
	tracer.targetSampleCount = 200;
	document.body.appendChild(tracer.canvas);
	tracer.setSize(window.innerWidth, window.innerHeight);

	controls = new OrbitControls(camera, tracer.canvas);
	const envMap = (await rgbeLoader.loadAsync(envMapPath)) as THREE.DataTexture;
	tracer.environment = envMap.image;

	const gltfInfo = await gltfLoader.loadAsync(modelPath);
	scene.add(gltfInfo.scene);

	tracer.buildPipeline(scene, camera).then(() => {
		// Add resize call here
		resize();
		tick();
	});
}

function resize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	tracer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

function tick() {
	requestAnimationFrame(tick);
	camera.updateMatrixWorld();
	controls.update();

	tracer.render(camera);
}

init();
