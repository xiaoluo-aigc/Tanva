## PrincipledBSDFMaterial

Disney Principled BSDF Material. 

# Constructor

## PrincipledBSDFMaterial(parameters: Object)

Any properties of the material can be passed in here.

# Properties

### .color

* Type: `Color`
* Default: `[1,1,1]`

### .roughness

* Type: `number`
* Default: `0.5`

### .metalness

* Type: `number`
* Default: `0.0`

### .transmission

* Type: `number`
* Default: `0.0`

### .ior

* Type: `number`
* Default: `1.5`

### .emissiveColor

* Type: `Color`
* Default: `[0,0,0]`

### .normalScale

* Type: `Vec2`
* Default: `[1,1]`

### .opacity

* Type: `number`
* Default: `1.0`

<div style="width:100%; text-align:center;">
    <img src="_images\Intro\basicMaterial.jpg" style="max-width:1200px;" width="100%">
</div>

## Advance

### .clearcoat

* Type: `number`
* Default: `0.0`

### .clearcoatRoughness

* Type: `number`
* Default: `0.0`

### .sheen

* Type: `number`
* Default: `0.0`

### .sheenTint

* Type: `number`
* Default: `0.5`

### .specularTint

* Type: `number`
* Default: `0.0`

## Subsurface

Currently WebGPU only

### .subsurface

* Type: `number`
* Default: `0.0`

### .subsurfaceColor

* Type: `Color`
* Default: `[1,1,1]`

### .subsurfaceMFP

Density factor for subsurface scattering

* Type: `number`
* Default: `0.05`

<div style="width:100%; text-align:center;">
    <img src="_images\Intro\sss.jpg" style="max-width:1200px;" width="100%">
</div>

## Non-Standard

`TracerFeatureOption.supportAbsorption` needs to be turned on, which is usually used in combination with `.transmission` to create fake glass absorption effects.

```javascript
const tracer = new LGLTracer(device, {
	featureOption: {
		supportAbsorption: true
	}
});
tracerMaterial.transmission = 1.0;
tracerMaterial.roughness = 0.0;
tracerMaterial.metalness = 0.0;
tracerMaterial.atDistance = 0.13;
tracerMaterial.extinction.set('#15de12');

```

### .atDistance

* Type: `number`
* Default: `1.0`

### .extinction

* Type: `Color`
* Default: `[1,1,1]`

<div style="width:100%; text-align:center;">
    <img src="_images\Intro\absorption.jpg" style="max-width:1200px;" width="100%">
</div>

### .map

* Type: `TextureWrap | null`
* Default: `null`

### .normalMap

* Type: `TextureWrap | null`
* Default: `null`

### .emissiveMap

* Type: `TextureWrap | null`
* Default: `null`

### .roughnessMap

* Type: `TextureWrap | null`
* Default: `null`

### .metalnessMap

* Type: `TextureWrap | null`
* Default: `null`

## Specular-Glossiness Workflow

<div style="width:100%; text-align:center;">
    <img src="_images\Intro\sg.jpg" style="max-width:1200px;" width="100%">
</div>

### .workflow

* Type: `'Metalness' | 'Specular'`
* Default: `'Metalness'`

Declare current material uses Metalness Workflow or Specular Workflow.

### .specularColor

* Type: `Color`
* Default: `[1,1,1]`

### .glossiness

* Type: `number`
* Default: `1`

### .specularMap

* Type: `TextureWrap | null`
* Default: `null`

### .glossinessMap

* Type: `TextureWrap | null`
* Default: `null`

# Methods

### .copy(source: PrincipledBSDFMaterial): this;
### .clone(source: PrincipledBSDFMaterial): PrincipledBSDFMaterial;
### .isIncludeTexture(): boolean;
