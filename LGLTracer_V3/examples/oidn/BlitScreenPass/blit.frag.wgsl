@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var screenSampler : sampler;

struct VertexOutput {
	@builtin(position) position : vec4<f32>, @location(0) uv : vec2<f32>
};

@fragment fn main(vo : VertexOutput)->@location(0) vec4<f32> {
	var uv = vo.uv;
	uv.y = 1. - uv.y;
	return textureSample(inputTex, screenSampler, uv);
}