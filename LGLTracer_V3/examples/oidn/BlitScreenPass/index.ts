import vertex from './blit.vert.wgsl?raw';
import fragment from './blit.frag.wgsl?raw';

export class BlitScreenPass {
	enabled: boolean = true;
	inputTex: GPUTexture;
	pipeline: GPURenderPipeline;
	sampler: GPUSampler;
	msaaTexture: GPUTexture;
	sampleCount: number;
	protected _bindGroupCache: {
		[hash: string]: GPUBindGroup;
	} = {};

	constructor(
		public device: GPUDevice,
		public canvas: HTMLCanvasElement,
		public context: GPUCanvasContext,
		public enableMSAA = false
	) {}

	async createPipeline() {
		const { device, canvas, enableMSAA } = this;
		this.sampleCount = enableMSAA ? 4 : 1;
		this.sampler = device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear',
			addressModeU: 'clamp-to-edge',
			addressModeV: 'clamp-to-edge'
		});
		// Pipeline
		this.pipeline = await device.createRenderPipelineAsync({
			layout: 'auto',
			vertex: {
				module: device.createShaderModule({
					code: vertex
				}),
				entryPoint: 'main'
			},
			fragment: {
				module: device.createShaderModule({
					code: fragment
				}),
				entryPoint: 'main',
				targets: [{ format: 'bgra8unorm' }]
			},
			primitive: {
				topology: 'triangle-list'
			},
			multisample: { count: this.sampleCount }
		});

		if (this.enableMSAA) {
			this.msaaTexture = device.createTexture({
				size: { width: canvas.width, height: canvas.height },
				sampleCount: this.sampleCount,
				format: 'bgra8unorm',
				usage: GPUTextureUsage.RENDER_ATTACHMENT
			});
		}
	}

	setSize() {
		const { device, enableMSAA, canvas } = this;
		if (enableMSAA) {
			this.msaaTexture.destroy();
			this.msaaTexture = device.createTexture({
				size: { width: canvas.width, height: canvas.height },
				sampleCount: this.sampleCount,
				format: 'bgra8unorm',
				usage: GPUTextureUsage.RENDER_ATTACHMENT
			});
		}
		// Clear cache
		this._bindGroupCache = {};
	}

	bindInputTex(tex: GPUTexture) {
		this.inputTex = tex;
		this._bindGroupCache = {};
	}

	getBindGroup() {
		const { device, canvas, pipeline, inputTex, sampler } = this;
		if (!this.inputTex) {
			console.error('Need bindInputTex first');
			return;
		}
		// Simply cache key
		const cacheKey = '';
		if (this._bindGroupCache[cacheKey]) {
			return this._bindGroupCache[cacheKey];
		}

		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{
					binding: 0,
					resource: inputTex.createView()
				},
				{
					binding: 1,
					resource: sampler
				}
			]
		});

		this._bindGroupCache[cacheKey] = bindGroup;
		return bindGroup;
	}

	render(commandEncoder: GPUCommandEncoder) {
		const { context, pipeline, enableMSAA, msaaTexture } = this;
		let outputTexView: GPUTextureView;
		const canvasView = context.getCurrentTexture().createView();
		if (enableMSAA) {
			outputTexView = msaaTexture.createView();
		} else {
			outputTexView = canvasView;
		}

		const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [
				{
					view: outputTexView,
					resolveTarget: this.enableMSAA ? canvasView : undefined,
					clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
					loadOp: 'clear',
					storeOp: 'store'
				}
			]
		});
		const bindGroup = this.getBindGroup()!;
		renderpass.setPipeline(pipeline);
		renderpass.setBindGroup(0, bindGroup);
		renderpass.draw(6, 1, 0, 0);
		renderpass.end();
	}
}
