## LGLTracer

LGLTracer is internally based on raw WebGPU and WebGL 2.0, it taking over all rendering processes and maintaining an independent scene data after `tracer.buildPipeline()`.

# Constructor

## LGLTracer(option: TracerOption)

```javascript
type SceneMode = 'Dynamic' | 'Static';
interface TracerFeatureOption {
	supportSGWorkflow?: boolean;
	supportAlpha?: boolean;
	supportUVTrans?: boolean;
	supportTexWrap?: boolean;
	supportLightSource?: boolean;
}
interface TracerOption {
	canvas?: HTMLCanvasElement;
	canvasAlpha?: boolean;
	sceneMode?: SceneMode;
	renderToScreen?: boolean;
	useWebWorker?: boolean;
	featureOption?: TracerFeatureOption;
	paramsOption?: TracerRayParamsOption;
}

interface TracerRayParamsOption {
	maxAlphaDepth?: number;
	minIntersectDistance?: number;
}

// WebGPU need pass one more `device` params
tracer = new LGLTracer(device, {
	sceneMode: "Dynamic",
	renderToScreen: true
});
// WebGL
tracer = new LGLTracer({
	sceneMode: "Static",
	featureOption: {
		supportSGWorkflow: false,
		supportAlpha: false,
		supportLightSource: false
	},
	rayParamsOption: {
		maxAlphaDepth: 5
	}
});
```

### TracerOption.canvas 

* Type: `HTMLCanvasElement`

The canvas element used by the renderer, will be created by default if it is not passed.

### TracerOption.canvasAlpha 

* Type: `boolean`
* Default: `true`

Whether to support background transparency.

### TracerOption.sceneMode

* Type: `SceneMode`
* Default: `Static`

Dynamic supports editing of scene structure, while static does not support it, but has more performance optimizations.

### TracerOption.useWorker

* Type: `boolean`
* Default: `true`

Whether the process of building BVH is carried out in WebWoker.

### TracerOption.renderToScreen

* Type: `boolean`
* Default: `true`

Whether the rendering result of the tracer is directly output to the screen. If set to false, the native texture can be obtained later through the `tracer.getRenderResGPUTexture()`.

### TracerOption.featureOption

* Type: `TracerFeatureOption`
* Default: all feature(expect `supportAbsorption`) default is `true`

If you can determine that the usage scenario of LGLTracer does not require the support of certain features, you can set the feature to false to reduce the compilation time of the shader and get better performance.

#### supportSGWorkflow

whether to support specular-glossiness workflow. 

Threejs has deleted support for sg workflow in version R147 [issue](https://github.com/mrdoob/three.js/pull/24950). If you need to be compatible with old sg workflow models (such as Sketchfab), you need to keep this feature is true and use R147's GLTFLoader and GLTFExporter.

#### supportAlpha

Whether to support material alpha

#### supportUVTrans/supportTexWrap

Whether to support UVTransform/TexureWrap of material texture

#### supportLightSource

Whether to support analytical light sources(Point/Direct/RectArea)

#### supportAbsorption

Whether to support non-standard absorption parameters(material.atDistance and material.extinction), default is false

#### supportCastShadow

Default in LGLTracer, all object will cast shadow, if you want some mesh no cast shadow, you can set this feature to true, then call method:

`tracer.syncCastShadowStatusFromTHREE(threeMesh);`

### TracerOption.rayParamsOption

* Type: `TracerRayParamsOption`

Some relevant parameters for ray calculation

#### maxAlphaDepth

* Type: `Number`

The maximum number of iterations when calculating alpha. The larger the number, the higher the performance consumption, but the more accurate the representation of transparent objects.

#### minIntersectDistance

* Type: `Number`

The minimum ray deviation value when calculating ray intersection in the scene

# Properties

### .bounces

* Type: `number`
* Default: `2`

The number of times the light bounces per path, at least 2 times and at most 8 times.


### .environment

* Type: `ImageData | undefined`
* Default: `undefined`

Set the envMap data used in the scene

```javascript
const rgbeLoader = new RGBELoader().setDataType(THREE.FloatType);
const envMap = await rgbeLoader.loadAsync(ENVMAP_URL);
tracer.environment = envMap.image;
```

### .envMapIntensity

* Type: `number`
* Default: `1`

Set the intensity of the environment lighting.


##### .enableBackgroundColor

* Type: `number`
* Default: `1`

Whether to enable color background (does not affect the lighting of scene objects)

### .backgroundColor

* Type: `hexString | number[]`
* Default: `[0,0,0]`

```javascript
tracer.backgroundColor = [1,1,1];
tracer.backgroundColor = '#000000';
```

### .backgroundAlpha

* Type: `number`
* Default: `1`

```javascript
tracer.backgroundAlpha = 0;
```

### .envRotation

* Type: `number`
* Default: `0`

Angle of env light rotation(degree)


### .toneMapping

* Type: `"Linear" | "ACES"`
* Default: `"Linear"`

```javascript
tracer.toneMapping = 'ACES';
```

### .movingDownsampling

* Type: `boolean`
* Default: `false`

Whether to downsample during camera movement (for performance)

### .downsamplingFactor

* Type: `number`
* Default: `4`

Downsampling factor when moving the camera or editing objects

### .sampleCount

* Type: `number` [readOnly]

Get the current accumulated number of samples

### .targetSampleCount

* Type: `number`
* Default: `0`

Set the target number of samples. When the number is reached, rendering will stop. When set to 0, it means never stop rendering.

### .enableTileRender

* Type: `boolean`
* Default: `true`

Whether to use tile rendering, if enabled, the screen space will be divided according to the `tileNumber` and then rendered block by block

### .tileNumber

* Type: `number`
* Default: `4`

Set the number of screen space divisions


### .enableDenoise

* Type: `boolean`
* Default: `false`

Whether to enable denoise pass. Denoise pass can remove noise, but it also blurs details

### .denoiseColorFactor

* Type: `number`
* Default: `0.05`

### .denoiseNormalFactor

* Type: `number`
* Default: `0.02`

### .denoisePositionFactor

* Type: `number`
* Default: `0.35`

### .needsUpdate

* Type: `boolean`
* Default: `false`

Whether to clear the current accumulated results and start drawing again. When changing some properties of tracer(**except toneMapping and denoise**), this property needs to be `true` in order not to be affected by the results of historical accumulation.

```javascript
tracer.bounces = 4;
tracer.envMapIntensity = 3;

tracer.needsUpdate = true;
```


# Methods

### .buildPipeline(threeScene: THREE.Scene, threeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera): Promise\<void\>;

Initialize scene data and rendering pipeline according to parameters. This method needs to be called before the `render` method.

### .setSize(width: number, height: number, updateStyle?: boolean): void;

Set the size of the canvas element and rendering buffers.

### .render(threeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera): void;


Drawcall after scene initialization(buildPipeline method).

```javascript
const tracer = new LGLTracer(device);
tracer.targetSampleCount = 200;
document.body.appendChild(tracer.canvas);
tracer.setSize(window.innerWidth, window.innerHeight);

function tick() {
    requestAnimationFrame(tick);
    tracer.render(camera);
}
tracer.buildPipeline(scene, camera).then(() => {
	tick();
});
```

### .updateEnvLight(environment: ImageData): void;
```javascript
const rgbeLoader = new RGBELoader().setDataType(THREE.FloatType);
const envMap = await rgbeLoader.loadAsync(NEW_ENVMAP_URL);
tracer.updateEnvLight(envMap.image);
```
### .onBuildingBeginCallback: () => void;
### .onBuildingProgressCallback: (process: number) => void;
### .onBuildingEndCallback: () => void;
### .onSampleFinCallback: () => void;
```javascript
tracer.onBuildingBeginCallback = () => {
	console.log("Building...");
}
tracer.onBuildingProgressCallback = progressVal => {
	const percentProgress = Math.round(progressVal * 100);
	console.log(`Building(${percentProgress}%)`);
}
tracer.onBuildingEndCallback = () => {
	console.log(`Finish`);
}
```

## THREE data sync method

By passing in the THREE parameter, find the corresponding tracer data and then update and synchronize it.

WebGPU version only:
* addMeshFromTHREE
* cloneMeshFromTHREE
* updateTextureParamsFromTHREE
* rebuildMeshMaterialFromTHREE
* addLightFromTHREE
* removeLightFromTHREE
* updateLightFromTHREE
* addSceneFromTHREE
* syncGroupVisibleFromTHREE

### .addMeshFromTHREE(threeMesh: THREE.Mesh): Promise<Mesh | undefined>;

```javascript
scene.add(newTHREEMesh);
tracer.addMeshFromTHREE(newTHREEMesh);
```

### .setMeshTLASMaskStatusFromTHREE(threeMesh: THREE.Mesh, maskStatus: boolean): Mesh | undefined;

Remove the Mesh in the top-level acceleration structure, which can be understood as mesh.visible. 
If maskStatus is true, it means mesh is invisible.

```javascript
const targetVisible = false;
threeMesh.visible = targetVisible;
// This method has low performance loss so can be used to replace deletion operations.
tracer.setMeshTLASMaskStatusFromTHREE(threeMesh, !targetVisible);
// same as: tracer.setMeshVisibleFromTHREE(threeMesh, targetVisible);
tracer.rebuildTLAS();
```

### .cloneMeshFromTHREE(sourceTHREEMeshID: number, clonedTHREEMesh: THREE.Mesh, needCloneMaterial: boolean = true): Mesh;

```javascript
// THREE's mesh clone no include material
const newTHREEMesh = threeMesh.clone();
scene.add(newTHREEMesh);
// New mesh synchronization threejs uses the same material
tracer.cloneMeshFromTHREE(threeMesh.id, newTHREEMesh, false);

// Clone containing new materials
const newTHREEMesh = threeMesh.clone();
newTHREEMesh.material = newTHREEMesh.material.clone();
tracer.cloneMeshFromTHREE(threeMesh.id, newTHREEMesh);
```

### .updateMeshTransformFromTHREE(threeMesh: THREE.Mesh): void;
```javascript
threeMesh.position += 0.1;
tracer.updateMeshTransformFromTHREE(threeMesh);
tracer.updateTLAS();
```

### .updateMeshMaterialParamsFromTHREE(threeMesh: THREE.Mesh): Promise<void>;
```javascript
const threeMaterial = threeMesh.material;
threeMaterial.roughness = 0.;
tracer.updateMeshMaterialParamsFromTHREE(threeMesh);
```

### .updateTextureParamsFromTHREE(threeMesh: THREE.Mesh): void;
```javascript
const threeMaterial = threeMesh.material;
threeMaterial.map.offset.x = 1.;
threeMaterial.map.wrapS = THREE.RepeatWrapping;
tracer.updateTextureParamsFromTHREE(threeMesh);
```

### .rebuildMeshMaterialFromTHREE(threeMesh: THREE.Mesh): Promise<void>;
```javascript
threeMesh.material = newTHREEMaterial;
tracer.rebuildMeshMaterialFromTHREE(threeMesh);
```

### .addLightFromTHREE(threeLight: THREE.Light): void;

```javascript
const rectAreaLight = new THREE.RectAreaLight(new THREE.Color(0xffffff), 1, 1, 1);
rectAreaLight.position.set(0, 1.2, 0);
rectAreaLight.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(rectAreaLight);
tracer.addLightFromTHREE(rectAreaLight);
```

### .removeLightFromTHREE(threeLight: THREE.Light): void;
```javascript
scene.remove(threeLight);
tracer.removeLightFromTHREE(threeLight);
```

### .updateLightFromTHREE(threeLight: THREE.Light): void;
```javascript
threeLight.color.set('#FF0000');
tracer.updateLightFromTHREE(threeLight);
```

### .addSceneFromTHREE(threeScene: THREE.Scene | THREE.Group): Promise<void>;
```javascript
scene.add(newTHREESceneOrGroup);
tracer.addSceneFromTHREE(newTHREESceneOrGroup);
```

### .replaceMainSceneFromTHREE(threeScene: THREE.Scene): Promise<void>;
```javascript
scene.remove(oldTHREEScene);
scene.add(newTHREEScene);
tracer.replaceMainSceneFromTHREE(newTHREEScene);
```

### .syncCastShadowStatusFromTHREE(threeMeshes: THREE.Mesh[] | THREE.Mesh): Promise<void>;
```javascript
// Sync tracer's mesh shadow status from three's mesh
// Default in LGLTracer, all object will cast shadow, if you want some mesh no cast shadow, you can use this method
tracer.syncCastShadowStatusFromTHREE(threeMesh);
```

### .syncGroupVisibleFromTHREE(threeGroup: THREE.Group | THREE.Object3D): Promise<void>;
```javascript
// Sync tracer's group visible from three's group
// Group visible will influence the visibility of the child objects
tracer.syncGroupVisibleFromTHREE(threeGroup);
```

## Tracer inner method

Tracer does not rely on threejs and can also build scenes independently

WebGPU version only:
* getLightByTHREEID
* addTracerInstanceMeshes

### .getRenderResGPUTexture(): GPUTexture | undefined;

If renderToScreen is set to true, you need to get the raw texture with the rendering result by calling this method

```javascript
// WebGPU
const rawWebGPUTexture = tracer.getRenderResGPUTexture();
// Then WebGPU Texture can be used directly

// Tips for raw webgl texture convert to THREE.Texture
function initRawTexture() {
	let rawWebGLTex = tracer.getRenderResGPUTexture();
	if (!rawWebGLTex) return;
	const texture = new THREE.Texture();
	texture.generateMipmaps = false;
	texture.image = {
		width: tracer.size[0],
		height: tracer.size[1],
		depth: 1
	};
	// Here:
	forceTHREEInitTexture(texture);
	const texProps = renderer.properties.get(texture);
	texProps.__webglTexture = rawWebGLTex;

	return texture;
}
const forceTHREEInitTexture = (function () {
	const material = new THREE.MeshBasicMaterial();
	const geometry = new THREE.PlaneGeometry();
	const renderTarget = new THREE.WebGLRenderTarget();
	const scene = new THREE.Scene();
	const camera = new THREE.Camera();
	scene.add(new THREE.Mesh(geometry, material));

	return function forceTHREEInitTexture(texture) {
		material.map = texture;
		renderer.setRenderTarget(renderTarget);
		renderer.render(scene, camera);
		renderer.setRenderTarget(null);
	};
})();
// Then, you can use it as normal THREE texture.
...
```

### .updateTLAS(): void;

Update the top-level acceleration structure, Call this method after calling `.updateMeshTransformFromTHREE`

### .rebuildTLAS(): void;

Rebuild the top-level acceleration structure, Call this method after calling `.setMeshTLASMaskStatusFromTHREE`

### .getMeshByTHREEID(id: number): Mesh | undefined;
### .getLightByTHREEID(id: number): Light | undefined;
### .updateMaterialParams(): Promise<void>;


You can also use the inner API to get lglTracer's internal data.

```javascript
const tracerMesh = tracer.getMeshByTHREEID(threeMesh.id)!;
const tracerLight = tracer.getLightByTHREEID(threeLight.id)!;
tracerMesh.material.roughness = 0.5;
tracer.updateMaterialParams();
```

### .addTracerInstanceMeshes(newMeshes: Mesh[]): Promise<void>;

If the added mesh already exists in the scene, add its instance directly.

```javascript
const newTracerMesh = tracerMesh.clone();
tracer.addTracerInstanceMeshes([newTracerMesh]);
```
