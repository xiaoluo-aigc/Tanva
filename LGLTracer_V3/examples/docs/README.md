# LGLTracer

> LGLTracer is a ray tracing rendering engine for the Web.
> It provides Editor and Viewer solutions for high-quality rendering on the Web, and supports both WebGPU and WebGL.

You can directly try the [Editor](https://lgltracer.com/editor/index.html) and [Viewer](https://lgltracer.com/viewer/index.html) built based on LGLTracer


## Migration / Tips

If you are upgrading from the V1/V2 version, you need to note that the V3 version is a **breaking change** and the old API is no longer compatible.

LGLTracerV3 has undergone a very large reconstruction.There are several changes that need to be noted:

- The V3 version is divided into **WebGPU** and **WebGL** versions. The APIs of the two versions remain the same, but the number of supported features is different. They can be switched according to the hardware support (just like [Editor](https://lgltracer.com/editor/index.html)/[Viewer](https://lgltracer.com/viewer/index.html))

```javascript
let backend;
let LGLTracer;
let tracer;

// 1.Just static import all
import * as LGLTracerWebGL from '../tracer/lglTracer.webgl.es';
import * as LGLTracerWebGPU from '../tracer/lglTracer.webgpu.es';
if (backend == 'webgl') {
	tracer = new LGLTracerWebGL.LGLTracer();
} else {
	const adapter = await navigator.gpu.requestAdapter();
	const device = await adapter.requestDevice();
	tracer = new LGLTracerWebGPU.LGLTracer(device);
}

// 2.Or dynamic import
if (!navigator.gpu || !navigator.gpu.getPreferredCanvasFormat) {
	backend = 'webgl';
	LGLTracer = await import('../tracer/lglTracer.webgl.es').then(({ LGLTracer }) => {
    	return LGLTracer;
    });
	
} else {
	backend = 'webgpu';
	LGLTracer = await import('../tracer/lglTracer.webgpu.es').then(({ LGLTracer }) => {
		return LGLTracer;
	});
}
// Then init tracer
if (backend == 'webgpu') {
	const adapter = await navigator.gpu.requestAdapter();
	const device = await adapter.requestDevice();
	tracer = new LGLTracer(device);
} else {
	tracer = new LGLTracer();
}
```


- The V3 version **no longer relies on threejs**. It will maintain its own scene data structure internally. Using API methods with `FromTHREE` fields will automatically synchronize the scene data structures of threejs and lglTracer.

```javascript
class LGLTracer {
	...
	buildPipeline(threeScene: THREE.Scene, threeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera): Promise<void>;
	addMeshFromTHREE(threeMesh: THREE.Mesh): Promise<Mesh | undefined>;
    removeMeshFromTHREE(threeMesh: THREE.Mesh): Promise<void>;
    cloneMeshFromTHREE(sourceTHREEMeshID: number, clonedTHREEMesh: THREE.Mesh): Mesh;
    updateMeshTransformFromTHREE(threeMesh: THREE.Mesh): void;
    updateMeshMaterialParamsFromTHREE(threeMesh: THREE.Mesh): Promise<void>;
    updateTextureParamsFromTHREE(threeMesh: THREE.Mesh): void;
    rebuildMeshMaterialFromTHREE(threeMesh: THREE.Mesh): Promise<void>;
    addLightFromTHREE(threeLight: THREE.Light): void;
    removeLightFromTHREE(threeLight: THREE.Light): void;
    updateLightFromTHREE(threeLight: THREE.Light): void;
    addSceneFromTHREE(threeScene: THREE.Scene | THREE.Group): Promise<void>;
    replaceMainSceneFromTHREE(threeScene: THREE.Scene): Promise<void>;
    setMeshTLASMaskStatusFromTHREE(threeMesh: THREE.Mesh, maskStatus: boolean): Mesh | undefined;
	...
	// You can also use the following API to only change the properties of lglTracer's internal data and
	// regardless of the threejs data.(not recommended)
	getMeshByTHREEID(id: number): Mesh | undefined;
    getLightByTHREEID(id: number): Light | undefined;
    static linkMeshWithTHREEMesh(mesh: Mesh, threeMesh: THREE.Mesh): void;
    static linkLightWithTHREELight(light: Light, threeLight: THREE.Light): void;
}

// eg: after buildPipeline
scene.add(newTHREEMesh);
tracer.addMeshFromTHREE(newTHREEMesh);
```

For more details, you can directly view the code in the example part