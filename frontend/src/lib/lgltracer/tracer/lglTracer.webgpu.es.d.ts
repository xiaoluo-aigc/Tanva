/// <reference types="@webgpu/types" />
/// <reference types="@types/three" />

declare class Color extends Array {}
declare class Vec2 extends Array {}
declare class Vec3 extends Array {}
declare class Mat3 extends Array {}
declare class Mat4 extends Array {}

declare class TextureWrap {
	image: ImageBitmap;
	isTexture: boolean;
	uvTransMat: Mat3;
	wrapS: number;
	wrapT: number;
	constructor(image: ImageBitmap);
}
export declare class PrincipledBSDFMaterial {
	type: string;
	workflow: 'Metalness' | 'Specular';
	color: Color;
	roughness: number;
	metalness: number;
	transmission: number;
	ior: number;
	clearcoat: number;
	clearcoatRoughness: number;
	sheen: number;
	sheenTint: number;
	specularTint: number;
	atDistance: number;
	extinction: Color;
	anisotropic: number;
	subsurface: number;
	subsurfaceColor: Color;
	subsurfaceMFP: number;
	emissiveColor: Color;
	normalScale: Vec2;
	alpha: number;
	map: TextureWrap | null;
	normalMap: TextureWrap | null;
	roughnessMap: TextureWrap | null;
	metalnessMap: TextureWrap | null;
	emissiveMap: TextureWrap | null;
	specularColor: Color;
	glossiness: number;
	specularMap: TextureWrap | null;
	glossinessMap: TextureWrap | null;
	constructor(parameters?: any);
	isIncludeTexture(): boolean;
	copy(source: PrincipledBSDFMaterial): this;
	clone(): PrincipledBSDFMaterial;
}

declare class Mesh {}
declare class Light {}
interface IImageData {
	width: number;
	height: number;
	data: any;
}
type SceneMode = 'Dynamic' | 'Static';
declare enum ToneMappingMode {
	Linear = 0,
	ACES = 1
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
interface TracerFeatureOption {
	supportSGWorkflow?: boolean;
	supportAlpha?: boolean;
	supportUVTrans?: boolean;
	supportTexWrap?: boolean;
	supportLightSource?: boolean;
	supportAbsorption?: boolean;
}

interface TracerRayParamsOption {
	maxAlphaDepth?: number;
	minIntersectDistance?: number;
}

export declare class LGLTracer {
	device: GPUDevice;
	adapter: GPUAdapter;
	canvas: HTMLCanvasElement;
	context: any;
	environment: IImageData | undefined;
	targetSampleCount: number;
	isBuilding: boolean;
	needsUpdate: boolean;
	movingDownsampling: boolean;
	onBuildingBeginCallback: () => void;
	onBuildingProgressCallback: (process: number) => void;
	onBuildingEndCallback: () => void;
	onSampleFinCallback: () => void;
	constructor(device: GPUDevice, adapter: GPUAdapter, option?: TracerOption);
	set bounces(val: number);
	get bounces(): number;
	set envMapIntensity(val: number);
	get envMapIntensity(): number;
	set enableBackgroundColor(val: boolean);
	get enableBackgroundColor(): boolean;
	set backgroundColor(val: string | number[]);
	get backgroundColor(): string | number[];
	set backgroundAlpha(val: number);
    get backgroundAlpha(): number;
	set envRotation(angle: number);
	get envRotation(): number;
	set toneMapping(val: keyof typeof ToneMappingMode);
	get toneMapping(): keyof typeof ToneMappingMode;
	set downsamplingFactor(val: number);
	get downsamplingFactor(): number;
	get sampleCount(): number;
	get size(): number[];
	set enableTileRender(val: boolean);
	get enableTileRender(): boolean;
	set tileNumber(val: number);
	get tileNumber(): number;
	set enableDenoise(val: boolean);
	get enableDenoise(): boolean;
	set denoiseColorFactor(val: number);
	get denoiseColorFactor(): number;
	set denoiseNormalFactor(val: number);
	get denoiseNormalFactor(): number;
	set denoisePositionFactor(val: number);
	get denoisePositionFactor(): number;
	buildPipeline(
		threeScene: THREE.Scene,
		threeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera
	): Promise<void>;
	getRenderResGPUTexture(): GPUTexture | undefined;
	getGBufferResGPUTexture(): {albedoTex, normalTex} | undefined;
	getMeshByTHREEID(id: number): Mesh | undefined;
	getLightByTHREEID(id: number): Light | undefined;
	addMeshFromTHREE(threeMesh: THREE.Mesh): Promise<Mesh | undefined>;
	cloneMeshFromTHREE(sourceTHREEMeshID: number, clonedTHREEMesh: THREE.Mesh, needCloneMaterial?: boolean): Mesh;
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
	addTracerInstanceMeshes(newMeshes: Mesh[]): Promise<void>;
	updateEnvLight(environment: IImageData): void;
	updateTLAS(): void;
	rebuildTLAS(): void;
    updateMaterialParams(): Promise<void>;
	syncCastShadowStatusFromTHREE(threeMeshes: THREE.Mesh[] | THREE.Mesh): Promise<void>;
	setSize(width: number, height: number, updateStyle?: boolean): void;
	render(threeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera): void;
	syncGroupVisibleFromTHREE(threeGroup: THREE.Group | THREE.Object3D): void;
}
