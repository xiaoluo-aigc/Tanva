import { logger } from '@/utils/logger';
import React, { useRef, useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import type { Model3DData, Model3DCameraState } from '@/services/model3DUploadService';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface Model3DViewerProps {
  modelData: Model3DData;
  width: number;
  height: number;
  isSelected?: boolean;
  drawMode?: string; // 当前绘图模式
  onCameraChange?: (camera: Model3DCameraState) => void;
  useRayTracing?: boolean;
  onTracingBackendChange?: (backend: 'webgl' | 'webgpu' | null) => void;
}

const TARGET_MODEL_SIZE = 3.5;
const MIN_CAMERA_DISTANCE = 1.5;
const CAMERA_FIT_PADDING = 1.25;
const CAMERA_FOV = 50;
const MIN_CONTAINER_REFERENCE = 420;
const MIN_CONTAINER_SCALE = 0.9;
const DEFAULT_ENV_MAP = '/lgltracer/envMaps/pillars.hdr';
const EPSILON = 1e-4;
type TracerBackend = 'webgl' | 'webgpu';

const computeScaleFactor = (maxDimension: number) => {
  const safeDimension = Math.max(maxDimension, Number.EPSILON);
  return TARGET_MODEL_SIZE / safeDimension;
};

const arraysAlmostEqual = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < EPSILON);

const cameraStatesEqual = (a: Model3DCameraState, b: Model3DCameraState) =>
  arraysAlmostEqual(a.position, b.position) &&
  arraysAlmostEqual(a.target, b.target) &&
  arraysAlmostEqual(a.up, b.up);

const createFittedCameraState = (box: THREE.Box3): Model3DCameraState => {
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, Number.EPSILON);
  const radius = maxDimension * 0.5;
  const fovInRadians = (CAMERA_FOV * Math.PI) / 180;
  const distance = Math.max((radius * CAMERA_FIT_PADDING) / Math.sin(fovInRadians / 2), MIN_CAMERA_DISTANCE);
  const direction = new THREE.Vector3(1.25, 1, 1.35).normalize();
  const position = direction.multiplyScalar(distance);

  return {
    position: [position.x, position.y, position.z],
    target: [0, 0, 0],
    up: [0, 1, 0],
  };
};

const cloneSceneForTracing = (source: THREE.Object3D) => {
  return source.clone(true);
};

const disposeObject3D = (object?: THREE.Object3D | null) => {
  if (!object) return;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if ((mesh as any).isMesh) {
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => material?.dispose?.());
      } else {
        mesh.material?.dispose?.();
      }
    }
  });
};

const addTracerLights = (scene: THREE.Scene) => {
  const ambient = new THREE.AmbientLight('#ffffff', 0.8);
  const hemi = new THREE.HemisphereLight('#f8fafc', '#cbd5e1', 1);
  const dirMain = new THREE.DirectionalLight('#ffffff', 1.6);
  dirMain.position.set(6, 8, 6);
  const dirFill = new THREE.DirectionalLight('#e2e8f0', 0.9);
  dirFill.position.set(-6, 6, -4);
  const pointTop = new THREE.PointLight('#ffffff', 0.45);
  pointTop.position.set(0, 7, 0);
  const pointSide = new THREE.PointLight('#f1f5f9', 0.35);
  pointSide.position.set(2, 3, -3);
  scene.add(ambient, hemi, dirMain, dirFill, pointTop, pointSide);
};

// 3D模型组件
function Model3D({
  modelPath,
  width,
  height,
  onLoaded,
  onSceneReady
}: {
  modelPath: string;
  width: number;
  height: number;
  onLoaded?: (boundingBox: THREE.Box3) => void;
  onSceneReady?: (scene: THREE.Object3D, boundingBox: THREE.Box3) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelPath);
  const [autoScale, setAutoScale] = useState<[number, number, number]>([1, 1, 1]);
  const [baseScaleFactor, setBaseScaleFactor] = useState<number>(1);
  const clonedSceneRef = useRef<THREE.Object3D | null>(null);

  // 清理Three.js资源的工具函数
  const disposeThreeObject = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child.type === 'Mesh') {
        const mesh = child as THREE.Mesh;

        // 清理几何体
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }

        // 清理材质
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(material => {
            if (material && typeof material.dispose === 'function') {
              const materialAny = material as any;
              if (materialAny.map && typeof materialAny.map.dispose === 'function') {
                materialAny.map.dispose();
              }
              if (materialAny.normalMap && typeof materialAny.normalMap.dispose === 'function') {
                materialAny.normalMap.dispose();
              }
              if (materialAny.roughnessMap && typeof materialAny.roughnessMap.dispose === 'function') {
                materialAny.roughnessMap.dispose();
              }
              if (materialAny.metalnessMap && typeof materialAny.metalnessMap.dispose === 'function') {
                materialAny.metalnessMap.dispose();
              }
              material.dispose();
            }
          });
        }
      }
    });
  };

  // 基础缩放计算（仅在模型加载时执行一次）
  useEffect(() => {
    if (meshRef.current && scene) {
      if (clonedSceneRef.current) {
        disposeThreeObject(clonedSceneRef.current);
        if (meshRef.current) {
          meshRef.current.clear();
        }
      }

      const clonedScene = scene.clone();
      clonedSceneRef.current = clonedScene;

      // 遍历场景中的所有材质，只对过暗的材质进行轻微调整，保持原始颜色
      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((material) => {
              // 处理所有类型的材质
              if (material instanceof THREE.MeshStandardMaterial || 
                  material instanceof THREE.MeshPhysicalMaterial ||
                  material instanceof THREE.MeshLambertMaterial ||
                  material instanceof THREE.MeshPhongMaterial ||
                  material instanceof THREE.MeshBasicMaterial) {
                // 检查材质是否过暗（接近黑色）
                if (material.color) {
                  const brightness = material.color.r + material.color.g + material.color.b;
                  // 只有当材质非常暗时才轻微提亮，保持原始颜色
                  if (brightness < 0.1) {
                    // 对于接近黑色的材质，轻微提亮但保持黑色调
                    material.color.multiplyScalar(1.2);
                  }
                  // 对于其他颜色，保持原样
                }
                // 只添加非常轻微的自发光，不影响颜色
                if ('emissive' in material) {
                  // 使用材质的原始颜色作为自发光基础，但强度很低
                  if (material.color) {
                    material.emissive = material.color.clone().multiplyScalar(0.1);
                  } else {
                    material.emissive = new THREE.Color(0x111111);
                  }
                  if ('emissiveIntensity' in material) {
                    (material as any).emissiveIntensity = 0.1;
                  }
                }
                // 确保材质更新
                material.needsUpdate = true;
              }
            });
          }
        }
      });

      const box = new THREE.Box3().setFromObject(clonedScene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      clonedScene.position.sub(center);

      const maxDimension = Math.max(size.x, size.y, size.z);
      const scaleFactor = computeScaleFactor(maxDimension);

      setBaseScaleFactor(scaleFactor);

      if (onLoaded) {
        onLoaded(box);
      }
      if (onSceneReady) {
        onSceneReady(clonedScene.clone(true), box.clone());
      }

      if (meshRef.current) {
        meshRef.current.add(clonedScene);
      }
    }

    return () => {
      if (clonedSceneRef.current) {
        disposeThreeObject(clonedSceneRef.current);
        if (meshRef.current) {
          meshRef.current.clear();
        }
        clonedSceneRef.current = null;
      }
    };
  }, [scene, onLoaded]);

  useEffect(() => {
    if (!baseScaleFactor) return;
    setAutoScale([baseScaleFactor, baseScaleFactor, baseScaleFactor]);
  }, [baseScaleFactor]);

  useEffect(() => {
    if (!baseScaleFactor) return;
    const minContainerSize = Math.max(Math.min(width, height), 1);
    const containerScale = Math.max(minContainerSize / MIN_CONTAINER_REFERENCE, MIN_CONTAINER_SCALE);
    const finalScale = baseScaleFactor * containerScale;
    setAutoScale([finalScale, finalScale, finalScale]);
  }, [width, height, baseScaleFactor]);

  return (
    <group ref={meshRef} scale={autoScale}>
      {/* 场景对象在useEffect中动态添加 */}
    </group>
  );
}

const Model3DViewer: React.FC<Model3DViewerProps> = ({
  modelData,
  width,
  height,
  isSelected = false,
  drawMode = 'select',
  onCameraChange,
  useRayTracing = false,
  onTracingBackendChange,
}) => {
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const maxDpr = Math.min(devicePixelRatio, 1.75);
  const [cameraState, setCameraState] = useState<Model3DCameraState>(() => modelData.camera ?? ({
    position: [4, 4, 4],
    target: [0, 0, 0],
    up: [0, 1, 0],
  }));
  const cameraStateRef = useRef<Model3DCameraState>(cameraState);
  const modelBoundsRef = useRef<THREE.Box3 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const hasCustomCameraRef = useRef<boolean>(!!modelData.camera);
  const cameraChangeFrameRef = useRef<number | null>(null);
  const lastCameraEmitRef = useRef(0);
  const modelSceneRef = useRef<THREE.Object3D | null>(null);
  const [modelSceneVersion, setModelSceneVersion] = useState(0);
  const tracerRef = useRef<any>(null);
  const tracerSceneRef = useRef<THREE.Scene | null>(null);
  const tracerCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const tracerFrameRef = useRef<number | null>(null);
  const tracerContainerRef = useRef<HTMLDivElement | null>(null);
  const envTextureRef = useRef<THREE.DataTexture | null>(null);
  const [rayTracingBackend, setRayTracingBackend] = useState<TracerBackend | null>(null);
  const rayTracingBackendRef = useRef<TracerBackend | null>(null);
  const [rayTracingError, setRayTracingError] = useState<string | null>(null);

  const onCameraChangeRef = useRef(onCameraChange);
  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  const onTracingBackendChangeRef = useRef(onTracingBackendChange);
  useEffect(() => {
    onTracingBackendChangeRef.current = onTracingBackendChange;
  }, [onTracingBackendChange]);

  const notifyBackendChange = useCallback((next: TracerBackend | null) => {
    if (rayTracingBackendRef.current === next) return;
    rayTracingBackendRef.current = next;
    setRayTracingBackend(next);
    onTracingBackendChangeRef.current?.(next);
  }, []);

  const cleanupTracer = useCallback(() => {
    if (tracerFrameRef.current) {
      cancelAnimationFrame(tracerFrameRef.current);
      tracerFrameRef.current = null;
    }
    if (tracerRef.current) {
      try {
        tracerRef.current.dispose?.();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('清理LGLTracer失败', error);
        }
      }
      tracerRef.current = null;
    }
    if (tracerContainerRef.current) {
      tracerContainerRef.current.innerHTML = '';
    }
    if (tracerSceneRef.current) {
      disposeObject3D(tracerSceneRef.current);
      tracerSceneRef.current = null;
    }
    tracerCameraRef.current = null;
    if (envTextureRef.current) {
      envTextureRef.current.dispose();
      envTextureRef.current = null;
    }
    notifyBackendChange(null);
  }, [notifyBackendChange]);

  const createTracerInstance = useCallback(async (): Promise<{ tracer: any; backend: TracerBackend }> => {
    if (typeof window === 'undefined') {
      throw new Error('当前环境不支持光追渲染');
    }

    const supportsWebGPU = typeof navigator !== 'undefined' && !!(navigator as any).gpu;
    const loadModule = async (path: string) => {
      if (typeof window === 'undefined') throw new Error('当前环境不支持光追渲染');
      return import(
        /* @vite-ignore */
        new URL(path, window.location.href).href
      );
    };

    if (supportsWebGPU) {
      try {
        const module: any = await loadModule('/lgltracer/lglTracer.webgpu.es.js');
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          const device = await adapter.requestDevice();
          const tracer = new module.LGLTracer(device, adapter);
          return { tracer, backend: 'webgpu' };
        }
      } catch (error) {
        console.warn('WebGPU光追初始化失败，回退到WebGL', error);
      }
    }

    const module: any = await loadModule('/lgltracer/lglTracer.webgl.es.js');
    return { tracer: new module.LGLTracer(), backend: 'webgl' };
  }, []);

  const applyCameraStateToTracer = useCallback((state: Model3DCameraState) => {
    if (!tracerCameraRef.current) return;
    tracerCameraRef.current.position.set(state.position[0], state.position[1], state.position[2]);
    tracerCameraRef.current.up.set(state.up[0], state.up[1], state.up[2]);
    const target = new THREE.Vector3(state.target[0], state.target[1], state.target[2]);
    tracerCameraRef.current.lookAt(target);
    tracerCameraRef.current.updateMatrixWorld(true);
  }, []);

  const startTracerLoop = useCallback(() => {
    if (!tracerRef.current || !tracerCameraRef.current) return;
    const renderLoop = () => {
      tracerFrameRef.current = requestAnimationFrame(renderLoop);
      tracerRef.current?.render(tracerCameraRef.current);
    };
    renderLoop();
  }, []);

  const lastCameraStateRef = useRef<Model3DCameraState | null>(null);

  const setupTracerScene = useCallback(async () => {
    if (!tracerRef.current || !modelSceneRef.current) return;

    const tracer = tracerRef.current;
    tracer.toneMapping = 'ACES';
    tracer.enableTileRender = false;
    tracer.envMapIntensity = 1.5;
    tracer.targetSampleCount = 180;

    const scene = new THREE.Scene();
    const modelClone = cloneSceneForTracing(modelSceneRef.current);
    scene.add(modelClone);
    addTracerLights(scene);
    tracerSceneRef.current = scene;

    const envMap = await new RGBELoader().loadAsync(DEFAULT_ENV_MAP);
    envTextureRef.current = envMap;
    tracer.environment = envMap.image;

    const aspect = Math.max(width / Math.max(height, 1), 0.0001);
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 2000);
    if ((THREE as any).WebGPUCoordinateSystem) {
      (camera as any).coordinateSystem = (THREE as any).WebGPUCoordinateSystem;
    }
    tracerCameraRef.current = camera;
    applyCameraStateToTracer(cameraStateRef.current ?? cameraState);

    tracer.setSize(width, height);

    if (tracerContainerRef.current) {
      tracerContainerRef.current.innerHTML = '';
      tracerContainerRef.current.appendChild(tracer.canvas);
      Object.assign(tracer.canvas.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        borderRadius: 'inherit'
      });
    }

    await tracer.buildPipeline(scene, camera);
  }, [width, height, applyCameraStateToTracer, cameraState]);

  useEffect(() => {
    cameraStateRef.current = cameraState;

    // 检查值是否真的改变了，避免不必要的更新
    if (lastCameraStateRef.current && cameraStatesEqual(cameraState, lastCameraStateRef.current)) {
      return;
    }

    lastCameraStateRef.current = cameraState;

    if (!onCameraChangeRef.current) return;
    if (cameraChangeFrameRef.current) cancelAnimationFrame(cameraChangeFrameRef.current);
    cameraChangeFrameRef.current = requestAnimationFrame(() => {
      if (onCameraChangeRef.current) {
        const now = performance.now();
        if (now - lastCameraEmitRef.current > 1000 / 15) { // 约15fps推送到外部，降低渲染震动
          lastCameraEmitRef.current = now;
          onCameraChangeRef.current(cameraStateRef.current);
        }
      }
      cameraChangeFrameRef.current = null;
    });

    return () => {
      if (cameraChangeFrameRef.current) {
        cancelAnimationFrame(cameraChangeFrameRef.current);
        cameraChangeFrameRef.current = null;
      }
    };
  }, [cameraState]);

  const isUpdatingFromExternalRef = useRef(false);

  useEffect(() => {
    // 如果正在从外部更新（通过onCameraChange），跳过这个更新，避免循环
    if (isUpdatingFromExternalRef.current) {
      return;
    }

    const nextCamera = modelData.camera;
    hasCustomCameraRef.current = !!nextCamera;
    if (!nextCamera) {
      if (modelBoundsRef.current) {
        const fittedState = createFittedCameraState(modelBoundsRef.current);
        isUpdatingFromExternalRef.current = true;
        setCameraState(fittedState);
        requestAnimationFrame(() => {
          isUpdatingFromExternalRef.current = false;
        });
      }
      return;
    }
    
    // 只有当值真正改变时才更新
    if (!cameraStatesEqual(nextCamera, cameraStateRef.current)) {
      hasCustomCameraRef.current = true;
      isUpdatingFromExternalRef.current = true;
      setCameraState(nextCamera);
      // 延迟重置标志
      requestAnimationFrame(() => {
        isUpdatingFromExternalRef.current = false;
      });
    }
  }, [
    modelData.camera?.position?.join(','),
    modelData.camera?.target?.join(','),
    modelData.camera?.up?.join(',')
  ]);

  useEffect(() => {
    if (!useRayTracing || !modelSceneRef.current) {
      cleanupTracer();
      setRayTracingError(null);
      return;
    }

    let cancelled = false;
    setRayTracingError(null);

    (async () => {
      try {
        const { tracer, backend } = await createTracerInstance();
        if (cancelled) {
          tracer.dispose?.();
          return;
        }
        tracerRef.current = tracer;
        notifyBackendChange(backend);
        await setupTracerScene();
        startTracerLoop();
      } catch (error) {
        const message = error instanceof Error ? error.message : '光追初始化失败';
        setRayTracingError(message);
        cleanupTracer();
      }
    })();

    return () => {
      cancelled = true;
      cleanupTracer();
    };
  }, [
    useRayTracing,
    modelSceneVersion,
    createTracerInstance,
    setupTracerScene,
    cleanupTracer,
    startTracerLoop,
    notifyBackendChange
  ]);

  const handleModelLoaded = useCallback((boundingBox: THREE.Box3) => {
    setIsLoading(false);
    modelBoundsRef.current = boundingBox.clone();

    if (!hasCustomCameraRef.current) {
      const fittedState = createFittedCameraState(boundingBox);
      setCameraState(fittedState);
    }
  }, []);

  const handleModelSceneReady = useCallback((scene: THREE.Object3D, boundingBox: THREE.Box3) => {
    modelSceneRef.current = scene;
    setModelSceneVersion((version) => version + 1);
    modelBoundsRef.current = boundingBox.clone();
  }, []);

  useEffect(() => {
    if (!useRayTracing || !tracerRef.current || !tracerCameraRef.current) return;
    const aspect = Math.max(width / Math.max(height, 1), 0.0001);
    tracerCameraRef.current.aspect = aspect;
    tracerCameraRef.current.updateProjectionMatrix();
    tracerRef.current.setSize(width, height);
  }, [width, height, useRayTracing]);

  useEffect(() => {
    if (!useRayTracing) return;
    applyCameraStateToTracer(cameraState);
  }, [cameraState, applyCameraStateToTracer, useRayTracing]);

  useEffect(() => () => {
    cleanupTracer();
    if (import.meta.env.DEV) {
      logger.debug('Model3DViewer组件卸载，清理3D资源');
    }
  }, [cleanupTracer]);

  const pointerEvents = drawMode === 'select' || isSelected ? 'auto' : 'none';
  const controlsEnabled = drawMode === 'select' && isSelected;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        border: 'none',
        borderRadius: '0',
        overflow: 'visible', // 允许3D模型超出容器显示，不裁剪
        backgroundColor: 'transparent',
        padding: 0,
        margin: 0,
        boxSizing: 'border-box'
      }}
    >
      {error ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            color: '#ef4444',
            fontSize: '14px',
            textAlign: 'center'
          }}
        >
          <div>
            <div>⚠️</div>
            <div>{error}</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Canvas
              camera={{
                position: cameraState.position,
                fov: CAMERA_FOV,
                near: 0.1,
                far: 1000
              }}
              dpr={[1, maxDpr]}
              gl={{
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: true,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.6,
                outputColorSpace: THREE.SRGBColorSpace
              }}
              onCreated={({ gl }) => {
                (gl as THREE.WebGLRenderer as any).physicallyCorrectLights = true;
              }}
              style={{
                background: 'transparent',
                pointerEvents,
                opacity: useRayTracing ? 0 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              
              <Suspense fallback={null}>
                <SceneEnvironment />
                {/* 更自然的光照组合：柔和环境光 + 半球光 + 主/辅方向光 */}
                <ambientLight color="#ffffff" intensity={0.8} />
                <hemisphereLight args={['#f8fafc', '#cbd5e1', 1]} />
                <directionalLight
                  position={[6, 8, 6]}
                  intensity={1.6}
                  color="#ffffff"
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />
                <directionalLight position={[-6, 6, -4]} intensity={0.9} color="#e2e8f0" />
                <pointLight position={[0, 7, 0]} intensity={0.45} color="#ffffff" />
                <pointLight position={[2, 3, -3]} intensity={0.35} color="#f1f5f9" />

                <Model3D
                  modelPath={modelData.url || modelData.path || ''}
                  width={width}
                  height={height}
                  onLoaded={handleModelLoaded}
                  onSceneReady={handleModelSceneReady}
                />

                <CameraController cameraState={cameraState} enabled={controlsEnabled} onStateChange={setCameraState} />
              </Suspense>
            </Canvas>

            <div
              ref={tracerContainerRef}
            style={{
                position: 'absolute',
                inset: 0,
                opacity: useRayTracing ? 1 : 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none'
              }}
            />
              </div>

          {isLoading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#374151',
                fontSize: '14px'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '8px' }}>🔄</div>
                <div>加载3D模型中...</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 边框已移动到Model3DContainer中，与控制点使用统一坐标系 */}
      {useRayTracing && rayTracingBackend && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(15,23,42,0.65)',
            color: '#e0f2fe',
            fontSize: '11px',
            letterSpacing: '0.05em'
          }}
        >
          RT · {rayTracingBackend.toUpperCase()}
        </div>
      )}
      {useRayTracing && rayTracingError && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
        >
          光追失败：{rayTracingError}
        </div>
      )}
    </div>
  );
};

const SceneEnvironment: React.FC = () => {
  const { scene, gl } = useThree();
  const hdrTexture = useLoader(RGBELoader, DEFAULT_ENV_MAP);

  const pmremGenerator = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);
  const envTexture = useMemo(() => {
    const renderTarget = pmremGenerator.fromEquirectangular(hdrTexture);
    const texture = renderTarget.texture;
    renderTarget.dispose();
    return texture;
  }, [pmremGenerator, hdrTexture]);

  useEffect(() => {
    const previousEnv = scene.environment;
    const previousBackground = scene.background;
    scene.environment = envTexture;
    scene.background = null;

    return () => {
      scene.environment = previousEnv ?? null;
      scene.background = previousBackground ?? null;
      envTexture?.dispose();
      pmremGenerator.dispose();
    };
  }, [scene, envTexture, hdrTexture, pmremGenerator]);

  return null;
};

export default Model3DViewer;

type CameraControllerProps = {
  cameraState: Model3DCameraState;
  onStateChange: (next: Model3DCameraState) => void;
  enabled: boolean;
};

const CameraController: React.FC<CameraControllerProps> = ({ cameraState, onStateChange, enabled }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  // 使用ref存储最新的cameraState，避免在handleControlChange中依赖它导致无限循环
  const cameraStateRef = useRef<Model3DCameraState>(cameraState);
  const isUpdatingFromPropsRef = useRef(false);
  const lastControlEmitRef = useRef(0);

  useEffect(() => {
    cameraStateRef.current = cameraState;
  }, [cameraState]);

  const applyCameraState = useCallback((state: Model3DCameraState) => {
    isUpdatingFromPropsRef.current = true;
    camera.position.set(state.position[0], state.position[1], state.position[2]);
    camera.up.set(state.up[0], state.up[1], state.up[2]);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(state.target[0], state.target[1], state.target[2]);
      controls.update();
    } else {
      camera.lookAt(state.target[0], state.target[1], state.target[2]);
    }
    // 延迟重置标志，避免立即触发onChange
    requestAnimationFrame(() => {
      isUpdatingFromPropsRef.current = false;
    });
  }, [camera]);

  useEffect(() => {
    applyCameraState(cameraState);
  }, [cameraState, applyCameraState]);

  const controlChangeTimerRef = useRef<number | null>(null);
  
  useEffect(() => {
    return () => {
      if (controlChangeTimerRef.current) {
        cancelAnimationFrame(controlChangeTimerRef.current);
      }
    };
  }, []);

  const handleControlChange = useCallback(() => {
    // 如果正在从props更新，跳过处理，避免循环
    if (isUpdatingFromPropsRef.current) return;
    
    const controls = controlsRef.current;
    if (!controls || !enabled) return;

    // 限制同步频率，降低频繁setState导致的卡顿
    const now = performance.now();
    const minInterval = 1000 / 24; // 约24fps的状态上报，更平滑且减少抖动

    if (controlChangeTimerRef.current) {
      cancelAnimationFrame(controlChangeTimerRef.current);
      controlChangeTimerRef.current = null;
    }

    if (now - lastControlEmitRef.current < minInterval) {
      controlChangeTimerRef.current = requestAnimationFrame(() => {
        controlChangeTimerRef.current = null;
        handleControlChange();
      });
      return;
    }

    lastControlEmitRef.current = now;

    const cam = controls.object as THREE.PerspectiveCamera;
    const next: Model3DCameraState = {
      position: [cam.position.x, cam.position.y, cam.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      up: [cam.up.x, cam.up.y, cam.up.z],
    };

    // 使用ref来避免依赖cameraState导致的无限循环
    const currentState = cameraStateRef.current;
    if (!cameraStatesEqual(next, currentState)) {
      // 使用低优先级更新，避免阻塞主线程
      if (typeof React.startTransition === 'function') {
        React.startTransition(() => onStateChange(next));
      } else {
        onStateChange(next);
      }
    }
  }, [enabled, onStateChange]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      enableDamping
      dampingFactor={0.18} // 增加阻尼，使操作更平滑
      minDistance={0.5}
      maxDistance={50}
      autoRotate={false}
      rotateSpeed={0.65} // 降低旋转速度，配合阻尼更顺滑
      zoomSpeed={0.85} // 调低缩放速度，避免突兀
      panSpeed={0.7} // 平移稍慢，减少抖动感
      screenSpacePanning={false} // 在3D空间中平移，而不是屏幕空间
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,    // 左键旋转
        MIDDLE: THREE.MOUSE.DOLLY,    // 中键缩放（鼠标滚轮）
        RIGHT: THREE.MOUSE.PAN        // 右键在3D空间中平移模型
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      }}
      makeDefault
      enabled={enabled}
      onChange={handleControlChange}
    />
  );
};
