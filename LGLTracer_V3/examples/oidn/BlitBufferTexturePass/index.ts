import compute from './blit.comp.wgsl?raw';

export class BlitBufferTexturePass {
	enabled: boolean = true;
	inputBuffer: GPUBuffer;
    outputTex: GPUTexture;
    pipeline: GPUComputePipeline;
    protected _bindGroupCache: {
        [hash: string]: GPUBindGroup;
    } = {};

	constructor(public device: GPUDevice, public canvas: HTMLCanvasElement) {}

	async createPipeline() {
		const { device } = this;
		// Compute Pipeline
        this.pipeline = await device.createComputePipelineAsync({
            layout: 'auto',
            compute: {
                module: device.createShaderModule({
                    code: compute
                }),
                entryPoint: 'main'
            }
        });
	}

	setSize() {
		this._bindGroupCache = {};
	}

	bindInputBufferAndOutputTex(buffer: GPUBuffer, texture: GPUTexture) {
        this.inputBuffer = buffer;
        this.outputTex = texture;
        this._bindGroupCache = {};
    }

	getBindGroup() {
		const { device, pipeline, inputBuffer, outputTex } = this;
		if (!this.inputBuffer || !this.outputTex) {
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
                    resource: { buffer: inputBuffer }
                },
                {
                    binding: 1,
                    resource: outputTex.createView()
                }
            ]
        });

		this._bindGroupCache[cacheKey] = bindGroup;
        return bindGroup;
	}

	dispatch(commandEncoder: GPUCommandEncoder) {
        const { pipeline, canvas } = this;
        const bindGroup = this.getBindGroup()!;

        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindGroup);

        // Dispatch with workgroup size of 8x8
        const workgroupCountX = Math.ceil(canvas.width / 8);
        const workgroupCountY = Math.ceil(canvas.height / 8);
        computePass.dispatchWorkgroups(workgroupCountX, workgroupCountY);

        computePass.end();
    }
}
