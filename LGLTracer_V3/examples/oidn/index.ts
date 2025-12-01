import * as LGLTracerWebGPU from '../tracer/lglTracer.webgpu.es';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import { UNet, initUNetFromBuffer } from 'oidn-web';
import { BlitBufferTexturePass } from './BlitBufferTexturePass';
import { BlitScreenPass } from './BlitScreenPass';

const envMapPath = '/envMaps/pillars.hdr';
const modelPath = '/models/DamagedHelmet/scene.gltf';
const OIDN_URL = '/oidn/rt_ldr_alb_nrm.tza';

let tracer: LGLTracerWebGPU.LGLTracer;
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.coordinateSystem = THREE.WebGPUCoordinateSystem;
camera.position.z = 5;
let controls: OrbitControls;
let stats = new Stats() as any;
const rgbeLoader = new RGBELoader().setDataType(THREE.FloatType);
const gltfLoader = new GLTFLoader();
// GUI
const gui = new GUI();
const guiMesh = new GUI();
let guiAdditionalParams;
let mouseEventType: 'mousedown' | 'mousemove' | null = null;
const mouse = new THREE.Vector2();
let rayCaster = new THREE.Raycaster();
let materialFolder;
let isMouseDraging = false;
let denoiseUnet: UNet;
let enableDenoiseEnd = false;
let isDenoising = false;
let abortDenoising: (() => void) | undefined;
let blitBufferTexturePass: BlitBufferTexturePass;
let blitScreenPass: BlitScreenPass;

if (!navigator.gpu || !navigator.gpu.getPreferredCanvasFormat) {
	alert('OIDN now is only support WebGPU!');
} else {
	const adapter = await navigator.gpu.requestAdapter()!;
	const device = await adapter!.requestDevice({
		requiredLimits: { 
			maxStorageBufferBindingSize: adapter!.limits.maxStorageBufferBindingSize,
			maxBufferSize: adapter!.limits.maxBufferSize
		}
	});
	tracer = new LGLTracerWebGPU.LGLTracer(device, adapter!, {
		renderToScreen: false
	});
	tracer.enableDenoise = true;
	enableDenoiseEnd = true;
	isDenoising = true;
}

async function init() {
	tracer.toneMapping = 'ACES';
	tracer.envMapIntensity = 2;
	tracer.bounces = 4;
	tracer.targetSampleCount = 10;
	document.body.appendChild(tracer.canvas);
	tracer.setSize(window.innerWidth, window.innerHeight);

	controls = new OrbitControls(camera, tracer.canvas);
	const envMap = (await rgbeLoader.loadAsync(envMapPath)) as THREE.DataTexture;
	tracer.environment = envMap.image;

	const gltfInfo = await gltfLoader.loadAsync(modelPath);
	scene.add(gltfInfo.scene);

	await initOIDN();

	tracer.buildPipeline(scene, camera).then(() => {
		initGUI();

		// Add resize call here
		resize();

		initEvent();
		tick();
	});
}

async function initOIDN() {
	const fileLoader = new THREE.FileLoader().setResponseType('arraybuffer');
	const modelData = (await fileLoader.loadAsync(OIDN_URL)) as ArrayBuffer;
	const adapterInfo = tracer.adapter.requestAdapterInfo ? tracer.adapter.requestAdapterInfo() : tracer.adapter.GPUAdapterInfo;

	denoiseUnet = await initUNetFromBuffer(
		modelData,
		{
			device: tracer.device,
			adapterInfo: adapterInfo
		},
		{ aux: true, hdr: false }
	);

	blitBufferTexturePass = new BlitBufferTexturePass(tracer.device, tracer.canvas);
	await blitBufferTexturePass.createPipeline();

	blitScreenPass = new BlitScreenPass(tracer.device, tracer.canvas, tracer.context.getContext());
	await blitScreenPass.createPipeline();
}

// GUI
function initGUI() {
	stats.setMode(0); // 0: fps, 1: ms
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.right = '0px';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.top = 'auto';
	stats.domElement.style.left = 'auto';
	document.body.appendChild(stats.domElement);

	gui.title('Rendering Setting');
	const guiEle = gui.domElement as HTMLDivElement;
	guiEle.classList.add('renderingGUI');

	guiMesh.title('Mesh Setting');
	const guiMeshEle = guiMesh.domElement as HTMLDivElement;
	guiMeshEle.classList.add('meshGUI');
	guiMesh.hide();

	const toneMappingList = ['Linear', 'ACES', 'Neutral'] as any;
	const params = {
		// Rendering
		bounces: tracer.bounces,
		envMapIntensity: tracer.envMapIntensity,
		enableBackgroundColor: tracer.enableBackgroundColor,
		backgroundColor: new THREE.Color().fromArray(tracer.backgroundColor as number[]),
		envRotation: tracer.envRotation,
		toneMapping: tracer.toneMapping,
		downsamplingFactor: tracer.downsamplingFactor,
		enableTileRender: tracer.enableTileRender,
		tileNumber: tracer.tileNumber,
		// Camera
		cameraAperture: (camera as any).aperture || 0,
		cameraFocus: camera.focus || 0,
		// Denoise
		enableDenoise: tracer.enableDenoise
	};
	// RenderingFolder
	const renderingFolder = gui.addFolder(`Rendering`);
	renderingFolder
		.add(params, 'bounces', 2, 6)
		.step(1)
		.onFinishChange((value: number) => {
			tracer.bounces = value;
			tracer.needsUpdate = true;
		});

	renderingFolder
		.add(params, 'envMapIntensity', 0, 5)
		.step(0.1)
		.onFinishChange((value: number) => {
			tracer.envMapIntensity = value;
			tracer.needsUpdate = true;
		});
	renderingFolder
		.add(params, 'envRotation', 0, 360)
		.step(1)
		.onChange((value: number) => {
			tracer.envRotation = value;
			tracer.needsUpdate = true;
		});
	renderingFolder.add(params, 'enableBackgroundColor').onChange((value: boolean) => {
		tracer.enableBackgroundColor = value;
		tracer.needsUpdate = true;
	});
	renderingFolder.addColor(params, 'backgroundColor').onChange((value: THREE.Color) => {
		tracer.backgroundColor = value.toArray();
		tracer.needsUpdate = true;
	});

	renderingFolder.add(params, 'enableTileRender').onChange((value: boolean) => {
		tracer.enableTileRender = value;
		tracer.needsUpdate = true;
	});
	renderingFolder.add(params, 'tileNumber', 1, 100, 1).onChange((value: number) => {
		tracer.tileNumber = value;
		tracer.needsUpdate = true;
	});
	renderingFolder.add(params, 'downsamplingFactor', 1, 10, 1).onChange((value: number) => {
		tracer.downsamplingFactor = value;
	});
	renderingFolder.add(params, 'toneMapping', toneMappingList).onChange(value => {
		tracer.toneMapping = value;
	});

	// Camera
	const cameraFolder = gui.addFolder('Camera');
	cameraFolder
		.add(params, 'cameraAperture', 0, 1, 0.001)
		.name('aperture')
		.onChange(value => {
			// @ts-ignore
			camera.aperture = value;
			tracer.needsUpdate = true;
		});
	cameraFolder
		.add(params, 'cameraFocus', 0, 50, 0.1)
		.name('focus')
		.onChange(value => {
			// @ts-ignore
			camera.focus = value;
			tracer.needsUpdate = true;
		});
	const denoiseFolder = gui.addFolder('OIDN Denoise');
	denoiseFolder.add(params, 'enableDenoise').onChange((value: boolean) => {
		if (!denoiseUnet) return;
		enableDenoiseEnd = value;
		tracer.enableDenoise = value;
	});

	// SampleCount
	guiAdditionalParams = {
		curSampleCount: tracer.sampleCount,
		targetSampleCount: tracer.targetSampleCount
	};
	renderingFolder.add(guiAdditionalParams, 'curSampleCount').listen().disable(true);
	renderingFolder.add(guiAdditionalParams, 'targetSampleCount').onChange(val => {
		tracer.targetSampleCount = val;
	});
}

function apendMaterialParamsToGUIFolder(folder, params, material: LGLTracerWebGPU.PrincipledBSDFMaterial) {
	const isMetalWorkflow = material.workflow == 'Metalness';
	Object.keys(params).map(name => {
		if (isMetalWorkflow) {
			if (name == 'specularColor' || name == 'glossiness') return;
		} else {
			if (name == 'roughness' || name == 'metalness') return;
		}
		switch (name) {
			case 'subsurface':
				folder.add(params, name, 0, 1, 0.01).onChange(async value => {
					material[`${name}`] = value;
					await tracer.updateMaterialParams();
				});
				break;
			case 'color':
			case 'specularColor':
			case 'emissiveColor':
			case 'subsurfaceColor':
			case 'extinction':
				folder.addColor(params, name).onChange(value => {
					material[`${name}`] = value;
					tracer.updateMaterialParams();
				});
				break;
			case 'ior':
				folder.add(params, name, 1, 2, 0.01).onChange(value => {
					material[`${name}`] = value;
					tracer.updateMaterialParams();
				});
				break;
			case 'atDistance':
				folder.add(params, name, 0, 1, 0.01).onChange(value => {
					material[`${name}`] = value;
					tracer.updateMaterialParams();
				});
				break;
			default:
				folder.add(params, name, 0, 1, 0.01).onChange(value => {
					material[`${name}`] = value;
					tracer.updateMaterialParams();
				});
				break;
		}
	});
}

function resetMeshGUI() {
	if (materialFolder) materialFolder.destroy();
	materialFolder = null;
	guiMesh.hide();
}

function showMeshGUI(mesh) {
	resetMeshGUI();
	// Material
	let material = mesh.material;
	materialFolder = guiMesh.addFolder(`Material: ${material.name}`);
	materialFolder.open();
	guiMesh.show();

	let materialParams = {
		color: material.color,
		roughness: material.roughness,
		metalness: material.metalness,
		specularColor: material.specularColor,
		glossiness: material.glossiness,
		transmission: material.transmission,
		ior: material.ior,
		emissiveColor: material.emissiveColor,
		clearcoat: material.clearcoat,
		clearcoatRoughness: material.clearcoatRoughness,
		sheen: material.sheen,
		sheenTint: material.sheenTint,
		subsurface: material.subsurface,
		subsurfaceColor: material.subsurfaceColor,
		subsurfaceMFP: material.subsurfaceMFP,
		alpha: material.alpha,
		extinction: material.extinction,
		atDistance: material.atDistance
	};
	apendMaterialParamsToGUIFolder(materialFolder, materialParams, material);
}

function resize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	tracer.setSize(window.innerWidth, window.innerHeight);
	blitScreenPass.bindInputTex(tracer.getRenderResGPUTexture()!);
}

function initEvent() {
	window.addEventListener('resize', resize);

	tracer.canvas.addEventListener('mousedown', event => {
		if (event.button === 2) return;
		mouseEventType = 'mousedown';
	});
	tracer.canvas.addEventListener('mousemove', event => {
		mouseEventType = 'mousemove';
	});
	// Pick
	tracer.canvas.addEventListener('mouseup', event => {
		if (event.button === 2) return;
		if (isMouseDraging || mouseEventType == 'mousemove') {
			if (isMouseDraging) {
				isMouseDraging = false;
			}
			if (mouseEventType == 'mousemove') mouseEventType == null;
			return;
		}
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		rayCaster.setFromCamera(mouse, camera);
		const rayTargets = scene.children;
		const intersects = rayCaster.intersectObjects(rayTargets);
		if (intersects.length) {
			// LeftClick
			const threeMesh = intersects[0].object as THREE.Mesh;
			const mesh = tracer.getMeshByTHREEID(threeMesh.id);
			if (!mesh) {
				console.error('No converted mesh can found');
				return;
			}
			showMeshGUI(mesh);
		} else {
			resetMeshGUI();
		}
	});
}

async function denoise() {
	if (isDenoising || !denoiseUnet) return;
	isDenoising = true;
	const device = tracer.device;
	const colorTex = tracer.getRenderResGPUTexture()!;
	const { albedoTex, normalTex } = tracer.getGBufferResGPUTexture()!;

	const targetTexture = tracer.getRenderResGPUTexture()!;
	const commandEncoder = device.createCommandEncoder();

	abortDenoising = denoiseUnet.tileExecute({
		color: { data: colorTex, width: colorTex.width, height: colorTex.height },
		albedo: { data: albedoTex, width: albedoTex.width, height: albedoTex.height },
		normal: { data: normalTex, width: normalTex.width, height: normalTex.height },
		done(denoised) {
			const resGPUBuffer = denoised.data;
			blitBufferTexturePass.bindInputBufferAndOutputTex(resGPUBuffer, targetTexture);
			blitBufferTexturePass.dispatch(commandEncoder);
			device.queue.submit([commandEncoder.finish()]);
		},
		progress: (_, tileData, tile) => {}
	});
}

function tick() {
	requestAnimationFrame(tick);
	camera.updateMatrixWorld();
	controls.update();

	if (guiAdditionalParams) guiAdditionalParams.curSampleCount = tracer.sampleCount;
	if (stats) stats.update();

	// Avoid denoise too early
	if (tracer.sampleCount < 5 && isDenoising) {
		// Reset denoise status
		isDenoising = false;
		abortDenoising?.();
		abortDenoising = undefined;
	}

	tracer.render(camera);

	const commandEncoder = tracer.device.createCommandEncoder();
	blitScreenPass.render(commandEncoder);
	tracer.device.queue.submit([commandEncoder.finish()]);

	// Denoise at last frame
	if (enableDenoiseEnd && !isDenoising && tracer.sampleCount >= tracer.targetSampleCount) {
		denoise();
		return;
	}
}

init();
